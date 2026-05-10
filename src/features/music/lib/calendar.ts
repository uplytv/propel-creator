/**
 * Build an iCalendar (.ics) file content for a single event and trigger a download.
 */
function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toICSDate(iso: string): string {
  const d = new Date(iso);
  return (
    d.getUTCFullYear().toString() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    "T" +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    "Z"
  );
}

function escapeICS(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

export interface IcsEvent {
  uid: string;
  title: string;
  description?: string;
  startsAt: string;
  endsAt?: string;
  url?: string;
  location?: string;
}

export function buildICS(ev: IcsEvent): string {
  const dtstart = toICSDate(ev.startsAt);
  const dtend = toICSDate(ev.endsAt ?? new Date(new Date(ev.startsAt).getTime() + 60 * 60 * 1000).toISOString());
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//UPLY//Music//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${ev.uid}@uply.tv`,
    `DTSTAMP:${toICSDate(new Date().toISOString())}`,
    `DTSTART:${dtstart}`,
    `DTEND:${dtend}`,
    `SUMMARY:${escapeICS(ev.title)}`,
    ev.description ? `DESCRIPTION:${escapeICS(ev.description)}` : "",
    ev.url ? `URL:${ev.url}` : "",
    ev.location ? `LOCATION:${escapeICS(ev.location)}` : "",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);
  return lines.join("\r\n");
}

export function downloadICS(ev: IcsEvent, filename = "event.ics") {
  const blob = new Blob([buildICS(ev)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function googleCalendarUrl(ev: IcsEvent): string {
  const fmt = (d: string) => toICSDate(d);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: ev.title,
    dates: `${fmt(ev.startsAt)}/${fmt(ev.endsAt ?? new Date(new Date(ev.startsAt).getTime() + 3600_000).toISOString())}`,
  });
  if (ev.description) params.set("details", ev.description);
  if (ev.location) params.set("location", ev.location);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
