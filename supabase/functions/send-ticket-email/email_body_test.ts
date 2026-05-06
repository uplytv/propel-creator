// Verifies the *contents* of enqueued ticket-confirmation emails:
// for each ticket we insert, the corresponding pgmq message must
// address the buyer's email, render the event title in the subject
// and HTML, and include the ticket_number in the HTML body.
//
// We pull messages out of the queue with `read_email_batch` (using a
// long visibility timeout) and then `delete_email` them so the real
// dispatcher never tries to deliver these test emails to fake addresses.

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
    text?: string;
    idempotency_key: string;
    label?: string;
  };
}

// Drain transactional_emails until we've collected one message per
// expected idempotency key, or timeout. Messages are pulled with a long
// vt (300s) and immediately deleted after inspection so the real
// dispatcher never tries to send to fake @uply-test.local addresses.
async function collectByIdempotencyKey(
  // deno-lint-ignore no-explicit-any
  admin: any,
  expectedKeys: Set<string>,
  timeoutMs = 60_000,
): Promise<Map<string, QueueMsg>> {
  const found = new Map<string, QueueMsg>();
  const start = Date.now();
  // Keep messages we read but didn't want, so we can put them back (NOT delete).
  // Simpler: leave them invisible for the vt window — they'll re-appear later
  // for the real dispatcher. We pick a vt of 1s so unrelated messages return
  // to the queue quickly.
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
        // Delete ours so the dispatcher doesn't try to send a fake email.
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
  name: "enqueued ticket-confirmation messages contain correct recipient, event title, and ticket number",
  ignore: !Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
  fn: async () => {
    assert(SUPABASE_URL, "SUPABASE_URL must be set");

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    const runId = crypto.randomUUID().slice(0, 8);
    const buyerEmail = `body-check-${runId}@uply-test.local`;
    const password = crypto.randomUUID();
    const eventTitle = `Body Check Show ${runId}`;

    let buyerId: string | null = null;
    let organizerId: string | null = null;
    let eventId: string | null = null;
    const tickets: Array<{ id: string; ticket_number: string }> = [];

    try {
      // Buyer + organizer + event.
      const { data: buyerUser, error: buyerErr } = await admin.auth.admin.createUser({
        email: buyerEmail,
        password,
        email_confirm: true,
      });
      assertEquals(buyerErr, null, `createUser(buyer) failed: ${buyerErr?.message}`);
      buyerId = buyerUser.user!.id;

      const { data: orgUser, error: orgErr } = await admin.auth.admin.createUser({
        email: `body-check-org-${runId}@uply-test.local`,
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
          location_name: "Body Venue",
          location_city: "Body City",
        })
        .select("id")
        .single();
      assertEquals(evErr, null, `event insert failed: ${evErr?.message}`);
      eventId = ev!.id;

      // Insert N tickets — each has a distinct ticket_number we'll grep for.
      for (let i = 0; i < TICKET_COUNT; i++) {
        const ticketNumber = `BODY-${runId}-${i}`;
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
            stripe_payment_intent_id: `pi_body_${runId}_${i}`,
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
          `Missing keys: ${[...expectedKeys].filter((k) => !found.has(k)).join(", ")}`,
      );

      for (const ticket of tickets) {
        const key = `ticket-confirm-${ticket.id}`;
        const msg = found.get(key)!;
        const payload = msg.message;

        // Recipient must be the buyer's email.
        assertEquals(
          payload.to,
          buyerEmail,
          `[${key}] recipient mismatch: expected ${buyerEmail}, got ${payload.to}`,
        );

        // Subject is `🎟️ Your ticket: ${eventTitle}`.
        assertStringIncludes(
          payload.subject,
          eventTitle,
          `[${key}] subject missing event title. Subject: ${payload.subject}`,
        );

        // HTML body must include the event title and the ticket number.
        assertStringIncludes(
          payload.html,
          eventTitle,
          `[${key}] HTML missing event title`,
        );
        assertStringIncludes(
          payload.html,
          ticket.ticket_number,
          `[${key}] HTML missing ticket number ${ticket.ticket_number}`,
        );

        // Sanity: label tags this as our template.
        assertEquals(
          payload.label,
          "ticket-confirmation",
          `[${key}] expected label="ticket-confirmation", got ${payload.label}`,
        );
      }
    } finally {
      // Cleanup. (Queue messages we matched were already deleted; any
      // messages we didn't match will reappear after their 1s vt and the
      // real dispatcher will discard them as fake recipients.)
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
