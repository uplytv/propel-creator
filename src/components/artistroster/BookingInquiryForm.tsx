import { useState } from "react";
import { z } from "zod";
import { Calendar, CheckCircle2, Loader2, Mail, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { ArtistRosterEntry } from "@/data/artistRoster";

const bookingSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name").max(80, "Name is too long"),
  email: z.string().trim().email("Enter a valid email").max(160, "Email is too long"),
  dates: z.string().trim().min(2, "Please share your dates or window").max(160, "Too long"),
  message: z.string().trim().min(10, "Tell us a bit more (min 10 chars)").max(1500, "Message is too long"),
});

type Props = { artist: ArtistRosterEntry };

/**
 * Public booking inquiry form rendered on every roster artist's /:slug page
 * whenever `bookingEmail` is set. Submits to send-transactional-email with
 * the `booking-inquiry` template, routed to the artist's booking inbox.
 */
export default function BookingInquiryForm({ artist }: Props) {
  const [form, setForm] = useState({ name: "", email: "", dates: "", message: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "submitting" | "success">("idle");

  if (!artist.bookingEmail) return null;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = bookingSchema.safeParse(form);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const k = issue.path[0] as string;
        if (k && !fieldErrors[k]) fieldErrors[k] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    setStatus("submitting");
    try {
      const { error } = await supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "booking-inquiry",
          recipientEmail: artist.bookingEmail,
          idempotencyKey: `booking-${artist.slug}-${parsed.data.email}-${Date.now()}`,
          templateData: {
            artistName: artist.displayName,
            inquirerName: parsed.data.name,
            inquirerEmail: parsed.data.email,
            eventDates: parsed.data.dates,
            message: parsed.data.message,
          },
        },
      });
      if (error) throw error;
      setStatus("success");
    } catch (err) {
      console.error("booking inquiry failed", err);
      setStatus("idle");
      toast.error("Couldn't send your inquiry — please try again or email directly.");
    }
  }

  if (status === "success") {
    return (
      <div
        id="booking"
        className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center"
        style={{ boxShadow: `0 0 0 1px ${artist.accent}33 inset` }}
      >
        <div
          className="mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-3"
          style={{ background: `${artist.accent}22`, color: artist.accent }}
        >
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold mb-1">Inquiry sent.</h3>
        <p className="text-[13.5px] opacity-75 leading-relaxed">
          {artist.displayName}'s team typically replies within 24 hours. Check your inbox at{" "}
          <span className="font-semibold opacity-100">{form.email}</span>.
        </p>
        <button
          type="button"
          onClick={() => {
            setForm({ name: "", email: "", dates: "", message: "" });
            setStatus("idle");
          }}
          className="mt-4 text-[12px] uppercase tracking-[0.2em] opacity-60 hover:opacity-100"
        >
          Send another →
        </button>
      </div>
    );
  }

  const inputCls =
    "w-full px-3.5 py-3 rounded-xl bg-white/5 border border-white/10 text-[15px] text-white placeholder:text-white/35 focus:outline-none focus:border-white/30 transition-colors";

  return (
    <form
      id="booking"
      onSubmit={onSubmit}
      className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-3"
    >
      <div className="flex items-center gap-2 mb-1">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: artist.accent, color: "#000" }}
        >
          <Calendar className="w-4.5 h-4.5" />
        </div>
        <div className="min-w-0">
          <div className="font-semibold text-[15px]">Book {artist.displayName}</div>
          <div className="text-[12px] opacity-65">Reply within 24 hours · direct to the artist</div>
        </div>
      </div>

      <div>
        <input
          aria-label="Your name"
          className={inputCls}
          placeholder="Your name"
          autoComplete="name"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          maxLength={80}
        />
        {errors.name && <p className="mt-1 text-[12px] text-red-400">{errors.name}</p>}
      </div>

      <div>
        <input
          aria-label="Email"
          type="email"
          inputMode="email"
          className={inputCls}
          placeholder="you@email.com"
          autoComplete="email"
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          maxLength={160}
        />
        {errors.email && <p className="mt-1 text-[12px] text-red-400">{errors.email}</p>}
      </div>

      <div>
        <input
          aria-label="Event date(s)"
          className={inputCls}
          placeholder="Event date(s) — e.g. Aug 16, 2026"
          value={form.dates}
          onChange={(e) => setForm((f) => ({ ...f, dates: e.target.value }))}
          maxLength={160}
        />
        {errors.dates && <p className="mt-1 text-[12px] text-red-400">{errors.dates}</p>}
      </div>

      <div>
        <textarea
          aria-label="Message"
          rows={4}
          className={`${inputCls} resize-y min-h-[112px]`}
          placeholder="Venue, set length, budget range, vibe — whatever helps us reply fast."
          value={form.message}
          onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
          maxLength={1500}
        />
        {errors.message && <p className="mt-1 text-[12px] text-red-400">{errors.message}</p>}
      </div>

      <button
        type="submit"
        disabled={status === "submitting"}
        className="w-full inline-flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl font-bold text-[15px] disabled:opacity-60 transition-transform active:scale-[0.99]"
        style={{ background: artist.accent, color: "#000" }}
      >
        {status === "submitting" ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" /> Sending…
          </>
        ) : (
          <>
            <Send className="w-4 h-4" /> Send booking inquiry
          </>
        )}
      </button>

      <a
        href={`mailto:${artist.bookingEmail}?subject=Booking inquiry for ${artist.displayName}`}
        className="block text-center text-[12px] opacity-60 hover:opacity-100 pt-1"
      >
        <Mail className="inline w-3.5 h-3.5 mr-1 -mt-0.5" />
        Or email {artist.bookingEmail} directly
      </a>
    </form>
  );
}
