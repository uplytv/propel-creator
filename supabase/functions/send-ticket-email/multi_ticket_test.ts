// Verifies that inserting multiple tickets for the same buyer produces a
// distinct `ticket-confirmation` email per ticket — i.e. the trigger fires
// once per row and `send-ticket-email` uses a per-ticket idempotency key
// (`ticket-confirm-{ticket.id}`) so emails are not deduped across tickets.

import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? Deno.env.get("VITE_SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const TICKET_COUNT = 3;
const QUEUE_NAME = "transactional_emails";

interface QueueMsg {
  msg_id: number;
  read_ct: number;
  message: {
    to: string;
    subject: string;
    html: string;
    idempotency_key: string;
    label?: string;
  };
}

// Drain transactional_emails until we've collected one message per
// expected idempotency key, or timeout. Matched messages are deleted so
// the real dispatcher doesn't try to deliver to fake addresses.
async function collectByIdempotencyKey(
  // deno-lint-ignore no-explicit-any
  admin: any,
  expectedKeys: Set<string>,
  timeoutMs = 60_000,
): Promise<Map<string, QueueMsg>> {
  const found = new Map<string, QueueMsg>();
  const start = Date.now();
  while (Date.now() - start < timeoutMs && found.size < expectedKeys.size) {
    const { data, error } = await admin.rpc("read_email_batch", {
      queue_name: QUEUE_NAME,
      batch_size: 25,
      vt: 1,
    });
    if (error) throw error;
    const rows = (data ?? []) as QueueMsg[];
    for (const row of rows) {
      const key = row.message?.idempotency_key;
      if (key && expectedKeys.has(key) && !found.has(key)) {
        found.set(key, row);
        await admin.rpc("delete_email", {
          queue_name: QUEUE_NAME,
          message_id: row.msg_id,
        });
      }
    }
    if (found.size < expectedKeys.size) {
      await new Promise((r) => setTimeout(r, 1500));
    }
  }
  return found;
}

// Poll email_send_log until we observe at least `expected` distinct
// idempotency keys for this recipient + template, or timeout.
async function waitForDistinctEmails(
  // deno-lint-ignore no-explicit-any
  admin: any,
  templateName: string,
  recipientEmail: string,
  expected: number,
  timeoutMs = 45_000,
): Promise<Array<{ status: string; idempotency_key: string | null; message_id: string | null }>> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const { data } = await admin
      .from("email_send_log")
      .select("status, idempotency_key, message_id, created_at")
      .eq("template_name", templateName)
      .eq("recipient_email", recipientEmail)
      .order("created_at", { ascending: false });
    const rows = (data ?? []) as Array<{
      status: string;
      idempotency_key: string | null;
      message_id: string | null;
    }>;
    const distinctKeys = new Set(rows.map((r) => r.idempotency_key).filter(Boolean));
    const distinctMsgs = new Set(rows.map((r) => r.message_id).filter(Boolean));
    if (distinctKeys.size >= expected || distinctMsgs.size >= expected) return rows;
    await new Promise((r) => setTimeout(r, 1500));
  }
  // Final fetch for diagnostics.
  const { data } = await admin
    .from("email_send_log")
    .select("status, idempotency_key, message_id, created_at")
    .eq("template_name", templateName)
    .eq("recipient_email", recipientEmail);
  return (data ?? []) as Array<{
    status: string;
    idempotency_key: string | null;
    message_id: string | null;
  }>;
}

Deno.test({
  name: `multiple ticket inserts enqueue ${TICKET_COUNT} distinct ticket-confirmation emails`,
  ignore: !Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
  fn: async () => {
    assert(SUPABASE_URL, "SUPABASE_URL must be set");

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    const runId = crypto.randomUUID().slice(0, 8);
    const buyerEmail = `multi-ticket-${runId}@uply-test.local`;
    const buyerName = `Multi Buyer ${runId}`;
    const eventTitle = `Multi Ticket Event ${runId}`;
    const password = crypto.randomUUID();

    let buyerId: string | null = null;
    let organizerId: string | null = null;
    let eventId: string | null = null;
    const tickets: Array<{ id: string; ticket_number: string }> = [];
    const ticketIds: string[] = [];

    try {
      // Buyer + organizer + event setup.
      const { data: buyerUser, error: buyerErr } = await admin.auth.admin.createUser({
        email: buyerEmail,
        password,
        email_confirm: true,
      });
      assertEquals(buyerErr, null, `createUser(buyer) failed: ${buyerErr?.message}`);
      buyerId = buyerUser.user!.id;

      // Set buyer display_name so send-ticket-email passes it as `name`.
      await admin
        .from("profiles")
        .upsert({ user_id: buyerId, display_name: buyerName }, { onConflict: "user_id" });

      const { data: orgUser, error: orgErr } = await admin.auth.admin.createUser({
        email: `multi-ticket-org-${runId}@uply-test.local`,
        password,
        email_confirm: true,
      });
      assertEquals(orgErr, null, `createUser(organizer) failed: ${orgErr?.message}`);
      organizerId = orgUser.user!.id;

      const { data: ev, error: evErr } = await admin
        .from("events")
        .insert({
          creator_id: organizerId,
          title: eventTitle,
          event_type: "in_person",
          starts_at: new Date(Date.now() + 7 * 24 * 3600_000).toISOString(),
          ends_at: new Date(Date.now() + 7 * 24 * 3600_000 + 3600_000).toISOString(),
          ticket_price: 25,
          status: "published",
          location_name: "Multi Venue",
          location_city: "Multi City",
        })
        .select("id")
        .single();
      assertEquals(evErr, null, `event insert failed: ${evErr?.message}`);
      eventId = ev!.id;

      // Insert N tickets — each row should fire trg_tickets_send_email.
      for (let i = 0; i < TICKET_COUNT; i++) {
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
            stripe_payment_intent_id: `pi_multi_${runId}_${i}`,
            ticket_number: `MULTI-${runId}-${i}`,
            status: "active",
          })
          .select("id")
          .single();
        assertEquals(tErr, null, `ticket ${i} insert failed: ${tErr?.message}`);
        ticketIds.push(t!.id);
      }

      // Wait for distinct emails to appear.
      const rows = await waitForDistinctEmails(
        admin,
        "ticket-confirmation",
        buyerEmail,
        TICKET_COUNT,
      );

      const distinctIdempotencyKeys = new Set(
        rows.map((r) => r.idempotency_key).filter(Boolean) as string[],
      );

      // Each ticket should have produced exactly one idempotency key of the
      // form `ticket-confirm-{ticket.id}`. Assert that every ticket id is
      // represented — this is the strongest guarantee that emails weren't
      // deduped across tickets.
      const expectedKeys = new Set(ticketIds.map((id) => `ticket-confirm-${id}`));
      const missing = [...expectedKeys].filter((k) => !distinctIdempotencyKeys.has(k));
      assertEquals(
        missing.length,
        0,
        `missing ticket-confirmation emails for keys: ${missing.join(", ")}. ` +
          `Got idempotency keys: ${[...distinctIdempotencyKeys].join(", ")}`,
      );

      assert(
        distinctIdempotencyKeys.size >= TICKET_COUNT,
        `expected at least ${TICKET_COUNT} distinct idempotency keys, ` +
          `got ${distinctIdempotencyKeys.size}`,
      );

      // Statuses must all be a normal queue/send state.
      for (const r of rows) {
        assert(
          ["pending", "sent"].includes(r.status),
          `unexpected email status "${r.status}" for key ${r.idempotency_key}`,
        );
      }
    } finally {
      // Best-effort cleanup.
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
