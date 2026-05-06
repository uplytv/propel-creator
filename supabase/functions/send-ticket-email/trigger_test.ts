// Focused test for the `trg_tickets_send_email` → ticket-confirmation path.
//
// Verifies that inserting a row into `public.tickets` fires the Postgres
// trigger, which calls the `send-ticket-email` Edge Function via pg_net.
// The function then invokes `send-transactional-email` with the
// `ticket-confirmation` template, and a row appears in `email_send_log`.
//
// This test skips signup, beta approval, and QR scan check-in — it only
// exercises the trigger → email path in isolation.

import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? Deno.env.get("VITE_SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function waitForEmailLog(
  // deno-lint-ignore no-explicit-any
  admin: any,
  templateName: string,
  recipientEmail: string,
  timeoutMs = 30_000,
): Promise<{ status: string; template_name: string } | null> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const { data } = await admin
      .from("email_send_log")
      .select("status, template_name, created_at")
      .eq("template_name", templateName)
      .eq("recipient_email", recipientEmail)
      .order("created_at", { ascending: false })
      .limit(1);
    if (data && data.length > 0) return data[0] as { status: string; template_name: string };
    await new Promise((r) => setTimeout(r, 1500));
  }
  return null;
}

Deno.test({
  name: "trg_tickets_send_email fires and enqueues a ticket-confirmation email",
  ignore: !Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
  fn: async () => {
    assert(SUPABASE_URL, "SUPABASE_URL must be set");

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    const runId = crypto.randomUUID().slice(0, 8);
    const buyerEmail = `ticket-trigger-${runId}@uply-test.local`;
    const password = crypto.randomUUID();

    let buyerId: string | null = null;
    let organizerId: string | null = null;
    let eventId: string | null = null;
    let ticketId: string | null = null;

    try {
      // 1. Create a buyer user with a confirmed email so the trigger
      //    can resolve the recipient address.
      const { data: buyerUser, error: buyerErr } = await admin.auth.admin.createUser({
        email: buyerEmail,
        password,
        email_confirm: true,
      });
      assertEquals(buyerErr, null, `createUser(buyer) failed: ${buyerErr?.message}`);
      buyerId = buyerUser.user!.id;

      // 2. Create an organizer + published event so the ticket has
      //    somewhere to live and event metadata can be fetched.
      const { data: orgUser, error: orgErr } = await admin.auth.admin.createUser({
        email: `ticket-trigger-org-${runId}@uply-test.local`,
        password,
        email_confirm: true,
      });
      assertEquals(orgErr, null, `createUser(organizer) failed: ${orgErr?.message}`);
      organizerId = orgUser.user!.id;

      const { data: ev, error: evErr } = await admin
        .from("events")
        .insert({
          creator_id: organizerId,
          title: `Trigger Test Event ${runId}`,
          event_type: "in_person",
          starts_at: new Date(Date.now() + 7 * 24 * 3600_000).toISOString(),
          ends_at: new Date(Date.now() + 7 * 24 * 3600_000 + 3600_000).toISOString(),
          ticket_price: 25,
          status: "published",
          location_name: "Trigger Venue",
          location_city: "Trigger City",
        })
        .select("id")
        .single();
      assertEquals(evErr, null, `event insert failed: ${evErr?.message}`);
      eventId = ev!.id;

      // 3. Insert a ticket row.
      //    The AFTER INSERT trigger `trg_tickets_send_email` should call
      //    the `send-ticket-email` Edge Function via pg_net.
      const { data: ticket, error: tErr } = await admin
        .from("tickets")
        .insert({
          event_id: eventId,
          buyer_id: buyerId,
          owner_id: buyerId,
          creator_id: organizerId,
          amount_paid: 25,
          platform_fee: 1.25,
          creator_earnings: 23.75,
          stripe_payment_intent_id: `pi_trigger_${runId}`,
          ticket_number: `TRG-${runId}`,
          status: "active",
        })
        .select("id, qr_code_secret")
        .single();
      assertEquals(tErr, null, `ticket insert failed: ${tErr?.message}`);
      assert(ticket?.qr_code_secret, "ticket must have a qr_code_secret");
      ticketId = ticket!.id;

      // 4. Poll email_send_log for the enqueued ticket-confirmation email.
      const ticketLog = await waitForEmailLog(admin, "ticket-confirmation", buyerEmail);
      assert(
        ticketLog,
        `ticket-confirmation email never logged for ${buyerEmail}. ` +
          `Check that trg_tickets_send_email is installed and send-ticket-email is deployed.`,
      );
      assert(
        ["pending", "sent"].includes(ticketLog.status),
        `ticket email status unexpected: ${ticketLog.status}`,
      );
      assertEquals(ticketLog.template_name, "ticket-confirmation");
    } finally {
      // Best-effort cleanup.
      if (ticketId) await admin.from("tickets").delete().eq("id", ticketId);
      if (eventId) await admin.from("events").delete().eq("id", eventId);
      if (buyerId) {
        await admin.from("email_send_log").delete().eq("recipient_email", buyerEmail);
        await admin.auth.admin.deleteUser(buyerId);
      }
      if (organizerId) await admin.auth.admin.deleteUser(organizerId);
    }
  },
});
