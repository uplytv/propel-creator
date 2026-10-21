import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { withCors } from "../_shared/security.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://uply.tv",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(withCors(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { ticket_id } = await req.json();
    if (!ticket_id) {
      return new Response(JSON.stringify({ error: "ticket_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const { data: ticket } = await supabase
      .from("tickets")
      .select("id, buyer_id, owner_id, event_id, qr_code_token, qr_code_secret, ticket_number")
      .eq("id", ticket_id)
      .maybeSingle();
    if (!ticket) return new Response(JSON.stringify({ error: "ticket not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const recipientUserId = ticket.buyer_id ?? ticket.owner_id;
    if (!recipientUserId) return new Response(JSON.stringify({ ok: true, skipped: "no recipient" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: authUser } = await supabase.auth.admin.getUserById(recipientUserId);
    const recipientEmail = authUser?.user?.email;
    if (!recipientEmail) return new Response(JSON.stringify({ ok: true, skipped: "no email" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: profile } = await supabase
      .from("profiles").select("display_name, first_name").eq("user_id", recipientUserId).maybeSingle();
    const name = profile?.display_name || profile?.first_name || undefined;

    const { data: ev } = await supabase
      .from("events")
      .select("id, slug, title, starts_at, location_name, location_city, creator_id, organizer_id, host_id")
      .eq("id", ticket.event_id).maybeSingle();

    // Resolve the event creator to check for a live white-label brand.
    const creatorId = (ev as any)?.creator_id || (ev as any)?.organizer_id || (ev as any)?.host_id || null;
    let brand: { brandName?: string | null; logoUrl?: string | null; supportEmail?: string | null } | null = null;
    if (creatorId) {
      const { data: wl } = await supabase
        .from("whitelabel_config")
        .select("brand_name, logo_url, support_email, enabled, whitelabel_active")
        .eq("creator_id", creatorId)
        .maybeSingle();
      if (wl && (wl as any).enabled && (wl as any).whitelabel_active) {
        brand = {
          brandName: (wl as any).brand_name,
          logoUrl: (wl as any).logo_url,
          supportEmail: (wl as any).support_email,
        };
      }
    }

    const qrToken = ticket.qr_code_secret || ticket.qr_code_token || ticket.id;
    const ticketUrl = `https://uply.tv/tickets/${ticket.qr_code_token || ticket.id}`;
    const eventDate = ev?.starts_at ? new Date(ev.starts_at).toLocaleString("en-US", {
      weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
    }) : undefined;
    const eventLocation = [ev?.location_name, ev?.location_city].filter(Boolean).join(" · ") || undefined;

    const idempotencyKey = `ticket-confirm-${ticket.id}`;

    const { error: invokeErr } = await supabase.functions.invoke("send-transactional-email", {
      body: {
        templateName: "ticket-confirmation",
        recipientEmail,
        idempotencyKey,
        brand,
        templateData: {
          name,
          eventTitle: ev?.title ?? "Your event",
          eventDate,
          eventLocation,
          ticketCode: ticket.ticket_number ?? undefined,
          qrToken,
          ticketUrl,
        },
      },
    });
    if (invokeErr) throw invokeErr;

    return new Response(JSON.stringify({ ok: true, branded: !!brand }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("send-ticket-email error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}));
