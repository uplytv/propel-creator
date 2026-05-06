// Asserts that for each inserted ticket the corresponding queued
// `ticket-confirmation` message HTML contains the EXACT template variables
// the trigger should have populated:
//   - event title  (from events.title)
//   - buyer name   (from profiles.display_name)
//   - ticket #     (from tickets.ticket_number)
//
// We pull each message out of the pgmq `transactional_emails` queue by its
// per-ticket idempotency key and inspect `message.html`. Matched messages
// are deleted so the real dispatcher won't try to deliver to fake
// @uply-test.local addresses.

import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? Deno.env.get("VITE_SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const TICKET_COUNT = 2;
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

Deno.test({
  name: "ticket-confirmation HTML contains exact event title, buyer name, and ticket number per ticket id",
  ignore: !Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
  fn: async () => {
    assert(SUPABASE_URL, "SUPABASE_URL must be set");

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    const runId = crypto.randomUUID().slice(0, 8);
    const buyerEmail = `tpl-vars-${runId}@uply-test.local`;
    const buyerName = `Template Var Buyer ${runId}`;
    const eventTitle = `Template Var Show ${runId}`;
    const password = crypto.randomUUID();

    let buyerId: string | null = null;
    let organizerId: string | null = null;
    let eventId: string | null = null;
    const tickets: Array<{ id: string; ticket_number: string }> = [];

    try {
      const { data: buyerUser, error: buyerErr } = await admin.auth.admin.createUser({
        email: buyerEmail,
        password,
        email_confirm: true,
      });
      assertEquals(buyerErr, null, `createUser(buyer) failed: ${buyerErr?.message}`);
      buyerId = buyerUser.user!.id;

      // Buyer name source for the template's {name} variable.
      await admin
        .from("profiles")
        .upsert({ user_id: buyerId, display_name: buyerName }, { onConflict: "user_id" });

      const { data: orgUser, error: orgErr } = await admin.auth.admin.createUser({
        email: `tpl-vars-org-${runId}@uply-test.local`,
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
          location_name: "Template Var Venue",
          location_city: "Template Var City",
        })
        .select("id")
        .single();
      assertEquals(evErr, null, `event insert failed: ${evErr?.message}`);
      eventId = ev!.id;

      for (let i = 0; i < TICKET_COUNT; i++) {
        const ticketNumber = `TPLVAR-${runId}-${i}`;
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
            stripe_payment_intent_id: `pi_tplvar_${runId}_${i}`,
            ticket_number: ticketNumber,
            status: "active",
          })
          .select("id")
          .single();
        assertEquals(tErr, null, `ticket ${i} insert failed: ${tErr?.message}`);
        tickets.push({ id: t!.id, ticket_number: ticketNumber });
      }

      const expectedKeys = new Set(tickets.map((t) => `ticket-confirm-${t.id}`));
      const found = await collectByIdempotencyKey(admin, expectedKeys);

      assertEquals(
        found.size,
        tickets.length,
        `expected ${tickets.length} enqueued messages, found ${found.size}. ` +
          `Missing: ${[...expectedKeys].filter((k) => !found.has(k)).join(", ")}`,
      );

      for (const ticket of tickets) {
        const key = `ticket-confirm-${ticket.id}`;
        const payload = found.get(key)!.message;

        // Recipient and label sanity.
        assertEquals(payload.to, buyerEmail, `[${key}] recipient mismatch`);
        assertEquals(payload.label, "ticket-confirmation", `[${key}] wrong label`);

        // Subject must literally contain the event title.
        assertStringIncludes(
          payload.subject,
          eventTitle,
          `[${key}] subject missing exact event title. Subject: ${payload.subject}`,
        );

        // HTML must literally contain the exact template variable values.
        // These are the strings the trigger pulled from events/profiles/tickets
        // for THIS ticket id — any leak between tickets would fail here.
        assertStringIncludes(
          payload.html,
          eventTitle,
          `[${key}] HTML missing exact event title "${eventTitle}"`,
        );
        assertStringIncludes(
          payload.html,
          buyerName,
          `[${key}] HTML missing exact buyer name "${buyerName}"`,
        );
        assertStringIncludes(
          payload.html,
          ticket.ticket_number,
          `[${key}] HTML missing exact ticket number "${ticket.ticket_number}"`,
        );

        // No other ticket's number should appear in this email's HTML.
        for (const other of tickets) {
          if (other.id === ticket.id) continue;
          assert(
            !payload.html.includes(other.ticket_number),
            `[${key}] HTML unexpectedly contains another ticket's number "${other.ticket_number}"`,
          );
        }
      }
    } finally {
      for (const t of tickets) {
        await admin.from("tickets").delete().eq("id", t.id);
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
