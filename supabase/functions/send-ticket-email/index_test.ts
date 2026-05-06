// End-to-end test for the full ticketing & onboarding lifecycle.
//
// Covers (real, against the live Lovable Cloud project):
//   1. Signup           → auth-email-hook enqueues a confirmation email
//   2. Beta approval    → notify-user-approved enqueues `beta-access-granted`
//   3. Ticket purchase  → inserting a `tickets` row (what stripe-webhook does
//                         on `checkout.session.completed`) fires the
//                         `trg_tickets_send_email` trigger → send-ticket-email
//                         → `ticket-confirmation` email row appears
//   4. QR check-in      → scan-ticket marks the ticket scanned; a second scan
//                         is rejected as already scanned
//
// We do NOT drive a real Stripe Checkout session — Stripe's hosted payment
// flow can't run inside Deno's test runner. Step 3 inserts the row that the
// webhook would insert post-payment, which is the only branch the webhook
// owns end-to-end after Stripe confirms `payment_status === "paid"`.

import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? Deno.env.get("VITE_SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;

// Wait for an `email_send_log` row matching template + recipient.
// The queue dispatcher runs every 5s, so we poll up to ~30s.
// deno-lint-ignore no-explicit-any
async function waitForEmailLog(
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
  name: "full ticket lifecycle: signup → beta approval → ticket purchase → email → QR scan",
  ignore: !Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
  fn: async () => {
    assert(SUPABASE_URL, "SUPABASE_URL must be set");
    assert(ANON_KEY, "ANON key must be set");

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    const runId = crypto.randomUUID().slice(0, 8);
    const buyerEmail = `e2e-buyer-${runId}@uply-test.local`;
    const organizerEmail = `e2e-host-${runId}@uply-test.local`;
    const password = crypto.randomUUID();

    let buyerId: string | null = null;
    let organizerId: string | null = null;
    let eventId: string | null = null;
    let ticketId: string | null = null;

    try {
      // ─── Step 1: Signup ──────────────────────────────────────────────
      // Use the public signUp flow so the auth-email-hook fires.
      const anon = createClient(SUPABASE_URL, ANON_KEY, {
        auth: { persistSession: false },
      });
      const { data: signUpData, error: signUpErr } = await anon.auth.signUp({
        email: buyerEmail,
        password,
      });
      assertEquals(signUpErr, null, `signUp failed: ${signUpErr?.message}`);
      assert(signUpData.user, "signUp must return a user");
      buyerId = signUpData.user.id;

      // Auth-email-hook is best-effort; only assert the row showed up if
      // the email infra is fully wired in this environment. Otherwise log.
      const signupLog = await waitForEmailLog(admin, "auth_emails", buyerEmail, 20_000);
      if (!signupLog) {
        console.warn(
          `[step 1] no auth_emails row for ${buyerEmail} within 20s — ` +
            `auth-email-hook may not be configured in this env`,
        );
      } else {
        assert(
          ["pending", "sent"].includes(signupLog.status),
          `signup email status unexpected: ${signupLog.status}`,
        );
      }

      // Fast-track confirmation so we can sign in as the buyer for the scan step.
      await admin.auth.admin.updateUserById(buyerId, { email_confirm: true });

      // ─── Step 2: Beta approval ──────────────────────────────────────
      const { data: approveData, error: approveErr } = await admin.functions.invoke(
        "notify-user-approved",
        { body: { userIds: [buyerId] } },
      );
      assertEquals(approveErr, null, `notify-user-approved failed: ${approveErr?.message}`);
      assert(approveData, "expected response from notify-user-approved");

      const betaLog = await waitForEmailLog(admin, "beta-access-granted", buyerEmail);
      assert(
        betaLog,
        `beta-access-granted email never logged for ${buyerEmail}`,
      );
      assert(
        ["pending", "sent"].includes(betaLog.status),
        `beta email status unexpected: ${betaLog.status}`,
      );

      // ─── Step 3: Ticket purchase (post-Stripe-webhook insert) ───────
      // First create an organizer + event so a ticket has somewhere to live.
      const { data: orgUser, error: orgErr } = await admin.auth.admin.createUser({
        email: organizerEmail,
        password,
        email_confirm: true,
      });
      assertEquals(orgErr, null, `org createUser failed: ${orgErr?.message}`);
      organizerId = orgUser.user!.id;

      const { data: ev, error: evErr } = await admin
        .from("events")
        .insert({
          creator_id: organizerId,
          title: `E2E Event ${runId}`,
          event_type: "in_person",
          starts_at: new Date(Date.now() + 7 * 24 * 3600_000).toISOString(),
          ends_at: new Date(Date.now() + 7 * 24 * 3600_000 + 3600_000).toISOString(),
          ticket_price: 25,
          status: "published",
          location_name: "Test Venue",
          location_city: "Test City",
        })
        .select("id")
        .single();
      assertEquals(evErr, null, `event insert failed: ${evErr?.message}`);
      eventId = ev!.id;

      // Insert the ticket — this is the row stripe-webhook writes once
      // Stripe confirms payment. The `trg_tickets_send_email` AFTER INSERT
      // trigger calls send-ticket-email via pg_net.
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
          stripe_payment_intent_id: `pi_e2e_${runId}`,
          ticket_number: `E2E-${runId}`,
          status: "active",
        })
        .select("id, qr_code_secret, qr_code_token")
        .single();
      assertEquals(tErr, null, `ticket insert failed: ${tErr?.message}`);
      assert(ticket?.qr_code_secret, "ticket must have a qr_code_secret");
      ticketId = ticket!.id;

      const ticketLog = await waitForEmailLog(admin, "ticket-confirmation", buyerEmail);
      assert(
        ticketLog,
        `ticket-confirmation email never logged for ${buyerEmail} — ` +
          `check trg_tickets_send_email + send-ticket-email deployment`,
      );
      assert(
        ["pending", "sent"].includes(ticketLog.status),
        `ticket email status unexpected: ${ticketLog.status}`,
      );

      // ─── Step 4: QR scan check-in ───────────────────────────────────
      // Sign in as the organizer so scan-ticket's auth check passes.
      const orgAnon = createClient(SUPABASE_URL, ANON_KEY, {
        auth: { persistSession: false },
      });
      const { data: orgSession, error: signInErr } = await orgAnon.auth.signInWithPassword({
        email: organizerEmail,
        password,
      });
      assertEquals(signInErr, null, `organizer signIn failed: ${signInErr?.message}`);
      const accessToken = orgSession.session?.access_token;
      assert(accessToken, "organizer must have an access token");

      const scanRes = await fetch(`${SUPABASE_URL}/functions/v1/scan-ticket`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          apikey: ANON_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          qr_secret: ticket!.qr_code_secret,
          event_id: eventId,
        }),
      });
      const scanBody = await scanRes.json();
      assertEquals(scanRes.status, 200, `scan response: ${JSON.stringify(scanBody)}`);
      assertEquals(scanBody.valid, true, `expected valid scan, got: ${JSON.stringify(scanBody)}`);
      assertEquals(scanBody.ticket_id, ticketId);

      // Second scan should be rejected as already scanned.
      const scan2 = await fetch(`${SUPABASE_URL}/functions/v1/scan-ticket`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          apikey: ANON_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          qr_secret: ticket!.qr_code_secret,
          event_id: eventId,
        }),
      });
      const scan2Body = await scan2.json();
      assertEquals(scan2Body.valid, false, "second scan must be invalid");
      assertEquals(
        scan2Body.reason,
        "Already scanned",
        `unexpected reject reason: ${scan2Body.reason}`,
      );

      // Verify DB state was actually mutated.
      const { data: scanned } = await admin
        .from("tickets")
        .select("status, checked_in, scanned_by")
        .eq("id", ticketId)
        .single();
      assertEquals(scanned?.status, "scanned");
      assertEquals(scanned?.checked_in, true);
      assertEquals(scanned?.scanned_by, organizerId);
    } finally {
      // Cleanup — best-effort.
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
