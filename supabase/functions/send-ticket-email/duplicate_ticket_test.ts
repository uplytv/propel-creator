// Verifies idempotency of the ticket-confirmation email pipeline.
//
// We insert two ticket rows with the *same* `ticket_number` (allowed —
// uniqueness is on the row id, not ticket_number). Each row has its own
// id, so each should produce its own `ticket-confirm-{ticket.id}` email.
//
// Then we *manually* invoke `send-ticket-email` again for one of the
// ticket ids. Because `send-transactional-email` dedupes by
// `idempotencyKey`, the repeat invoke must NOT enqueue a second email
// row for that same ticket id.
//
// Final expectation: exactly one email per distinct ticket id, even
// though we triggered the pipeline 3 times total.

import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? Deno.env.get("VITE_SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function fetchEmails(
  // deno-lint-ignore no-explicit-any
  admin: any,
  recipientEmail: string,
): Promise<Array<{ idempotency_key: string | null; status: string; message_id: string | null }>> {
  const { data } = await admin
    .from("email_send_log")
    .select("idempotency_key, status, message_id, created_at")
    .eq("template_name", "ticket-confirmation")
    .eq("recipient_email", recipientEmail)
    .order("created_at", { ascending: false });
  return (data ?? []) as Array<{
    idempotency_key: string | null;
    status: string;
    message_id: string | null;
  }>;
}

async function waitForKeys(
  // deno-lint-ignore no-explicit-any
  admin: any,
  recipientEmail: string,
  expectedKeys: string[],
  timeoutMs = 45_000,
) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const rows = await fetchEmails(admin, recipientEmail);
    const got = new Set(rows.map((r) => r.idempotency_key).filter(Boolean) as string[]);
    if (expectedKeys.every((k) => got.has(k))) return rows;
    await new Promise((r) => setTimeout(r, 1500));
  }
  return await fetchEmails(admin, recipientEmail);
}

Deno.test({
  name: "duplicate ticket_number rows + repeat invoke → one email per ticket-confirm-{id}",
  ignore: !Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
  fn: async () => {
    assert(SUPABASE_URL, "SUPABASE_URL must be set");

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    const runId = crypto.randomUUID().slice(0, 8);
    const buyerEmail = `dup-ticket-${runId}@uply-test.local`;
    const password = crypto.randomUUID();
    const sharedTicketNumber = `DUP-${runId}`;

    let buyerId: string | null = null;
    let organizerId: string | null = null;
    let eventId: string | null = null;
    const ticketIds: string[] = [];

    try {
      const { data: buyerUser, error: buyerErr } = await admin.auth.admin.createUser({
        email: buyerEmail,
        password,
        email_confirm: true,
      });
      assertEquals(buyerErr, null, `createUser(buyer) failed: ${buyerErr?.message}`);
      buyerId = buyerUser.user!.id;

      const { data: orgUser, error: orgErr } = await admin.auth.admin.createUser({
        email: `dup-ticket-org-${runId}@uply-test.local`,
        password,
        email_confirm: true,
      });
      assertEquals(orgErr, null, `createUser(organizer) failed: ${orgErr?.message}`);
      organizerId = orgUser.user!.id;

      const { data: ev, error: evErr } = await admin
        .from("events")
        .insert({
          creator_id: organizerId,
          title: `Dup Ticket Event ${runId}`,
          event_type: "in_person",
          starts_at: new Date(Date.now() + 7 * 24 * 3600_000).toISOString(),
          ends_at: new Date(Date.now() + 7 * 24 * 3600_000 + 3600_000).toISOString(),
          ticket_price: 25,
          status: "published",
          location_name: "Dup Venue",
          location_city: "Dup City",
        })
        .select("id")
        .single();
      assertEquals(evErr, null, `event insert failed: ${evErr?.message}`);
      eventId = ev!.id;

      // Insert two tickets with the SAME ticket_number — different row ids.
      for (let i = 0; i < 2; i++) {
        const { data: t, error: tErr } = await admin
          .from("tickets")
          .insert({
            event_id: eventId,
            buyer_id: buyerId,
            owner_id: buyerId,
            creator_id: organizerId,
            amount_paid: 25,
            platform_fee: 1.25,
            creator_earnings: 23.75,
            // Different stripe_payment_intent_id per row (that field IS unique).
            stripe_payment_intent_id: `pi_dup_${runId}_${i}`,
            ticket_number: sharedTicketNumber,
            status: "active",
          })
          .select("id")
          .single();
        assertEquals(
          tErr,
          null,
          `duplicate ticket_number insert ${i} failed: ${tErr?.message}. ` +
            `If ticket_number has a UNIQUE constraint, this test's premise no longer holds.`,
        );
        ticketIds.push(t!.id);
      }

      const expectedKeys = ticketIds.map((id) => `ticket-confirm-${id}`);

      // Wait for both initial emails to be enqueued via the trigger.
      let rows = await waitForKeys(admin, buyerEmail, expectedKeys);
      let perKeyCounts = new Map<string, number>();
      for (const r of rows) {
        if (!r.idempotency_key) continue;
        perKeyCounts.set(r.idempotency_key, (perKeyCounts.get(r.idempotency_key) ?? 0) + 1);
      }
      for (const k of expectedKeys) {
        assert(
          (perKeyCounts.get(k) ?? 0) >= 1,
          `expected at least one email for ${k}, got ${perKeyCounts.get(k) ?? 0}`,
        );
      }

      // Now manually invoke send-ticket-email again for the first ticket.
      // This re-triggers the same idempotency key — should NOT enqueue another row.
      const { error: invokeErr } = await admin.functions.invoke("send-ticket-email", {
        body: { ticket_id: ticketIds[0] },
      });
      assertEquals(invokeErr, null, `repeat invoke failed: ${invokeErr?.message}`);

      // Give the queue a moment to (not) write a new row.
      await new Promise((r) => setTimeout(r, 8000));

      rows = await fetchEmails(admin, buyerEmail);
      perKeyCounts = new Map();
      for (const r of rows) {
        if (!r.idempotency_key) continue;
        perKeyCounts.set(r.idempotency_key, (perKeyCounts.get(r.idempotency_key) ?? 0) + 1);
      }

      // Note: email_send_log can have multiple rows per message_id as the
      // status transitions (pending → sent). So we dedupe by message_id
      // within each idempotency_key to count distinct emails.
      const distinctMsgsPerKey = new Map<string, Set<string>>();
      for (const r of rows) {
        if (!r.idempotency_key) continue;
        if (!distinctMsgsPerKey.has(r.idempotency_key)) {
          distinctMsgsPerKey.set(r.idempotency_key, new Set());
        }
        if (r.message_id) distinctMsgsPerKey.get(r.idempotency_key)!.add(r.message_id);
      }

      for (const k of expectedKeys) {
        const distinct = distinctMsgsPerKey.get(k)?.size ?? 0;
        // Either the queue uses a single message_id per idempotency key,
        // or (if message_id is null in this env) the row count itself
        // should still be 1 — the repeat invoke must not double-enqueue
        // the first ticket's email.
        if (distinct === 0) {
          // Fall back to row count check when message_id isn't populated.
          assertEquals(
            perKeyCounts.get(k),
            1,
            `expected exactly 1 row for idempotency key ${k}, ` +
              `got ${perKeyCounts.get(k)}. message_id was not populated.`,
          );
        } else {
          assertEquals(
            distinct,
            1,
            `expected exactly 1 distinct message_id for idempotency key ${k}, ` +
              `got ${distinct}. Repeat invoke should be deduped.`,
          );
        }
      }
    } finally {
      for (const id of ticketIds) {
        await admin.from("tickets").delete().eq("id", id);
      }
      if (eventId) await admin.from("events").delete().eq("id", eventId);
      if (buyerId) {
        await admin.from("email_send_log").delete().eq("recipient_email", buyerEmail);
        await admin.auth.admin.deleteUser(buyerId);
      }
      if (organizerId) await admin.auth.admin.deleteUser(organizerId);
    }
  },
});
