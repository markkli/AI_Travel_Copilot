import type { TripPlan } from "../types";

// ICS spec requires CRLF line endings and lines ≤75 chars (folded with CRLF + space).
function fold(line: string): string {
  if (line.length <= 75) return line;
  const chunks: string[] = [];
  chunks.push(line.slice(0, 75));
  let i = 75;
  while (i < line.length) {
    chunks.push(" " + line.slice(i, i + 74));
    i += 74;
  }
  return chunks.join("\r\n");
}

function esc(str: string): string {
  return str
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}@aitravelcopilot`;
}

// Accepts "2024-10-15", "October 15 2024", "Oct 15" (uses trip year as fallback)
function parseDate(raw: string, fallbackYear?: number): Date | null {
  // ISO: 2024-10-15
  const iso = raw.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return new Date(+iso[1], +iso[2] - 1, +iso[3]);

  // Parseable by Date constructor
  const d = new Date(raw);
  if (!isNaN(d.getTime())) return d;

  // "Oct 15" with no year — attach fallback year
  if (fallbackYear) {
    const d2 = new Date(`${raw} ${fallbackYear}`);
    if (!isNaN(d2.getTime())) return d2;
  }

  return null;
}

// Accepts "9:00 AM", "09:00", "9:30am", "14:30"
function parseTime(raw: string): { h: number; m: number } | null {
  const match = raw.trim().match(/^(\d{1,2}):(\d{2})\s*(am|pm)?$/i);
  if (!match) return null;
  let h = +match[1];
  const m = +match[2];
  const mer = match[3]?.toLowerCase();
  if (mer === "pm" && h !== 12) h += 12;
  if (mer === "am" && h === 12) h = 0;
  return { h, m };
}

function icsDate(date: Date): string {
  const y = date.getFullYear();
  const mo = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}${mo}${d}`;
}

function icsDateTime(date: Date, timeStr: string): string {
  const t = parseTime(timeStr);
  const h = t ? String(t.h).padStart(2, "0") : "00";
  const m = t ? String(t.m).padStart(2, "0") : "00";
  return `${icsDate(date)}T${h}${m}00`;
}

function event(props: Record<string, string>): string {
  const lines = ["BEGIN:VEVENT"];
  for (const [k, v] of Object.entries(props)) {
    if (v) lines.push(fold(`${k}:${v}`));
  }
  lines.push("END:VEVENT");
  return lines.join("\r\n");
}

export function generateICS(trip: TripPlan): string {
  const dtstamp = new Date().toISOString().replace(/[-:.]/g, "").slice(0, 15) + "Z";

  // Try to infer a fallback year from trip.start_date
  const fallbackYear = trip.start_date
    ? new Date(trip.start_date).getFullYear() || new Date().getFullYear()
    : new Date().getFullYear();

  const events: string[] = [];

  for (const day of trip.days) {
    const date = parseDate(day.date, fallbackYear);
    if (!date) continue;

    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);

    // All-day banner for the day theme
    events.push(event({
      "DTSTART;VALUE=DATE": icsDate(date),
      "DTEND;VALUE=DATE": icsDate(nextDay),
      SUMMARY: `Day ${day.day_number}: ${esc(day.theme)}`,
      DESCRIPTION: esc(day.summary),
      LOCATION: esc(day.starting_location),
      UID: `day-${day.day_number}-${uid()}`,
      DTSTAMP: dtstamp,
    }));

    // Time-blocked event per segment
    for (const seg of day.segments) {
      if (!seg.start_time || !seg.end_time) continue;

      const title = seg.destination
        ? esc(seg.destination)
        : esc(seg.description.slice(0, 60));

      const descParts = [seg.description];
      if (seg.cost_estimate) descParts.push(`Cost: ${seg.cost_estimate}`);
      if (seg.estimated_travel_time) descParts.push(`Travel time: ${seg.estimated_travel_time}`);
      if (seg.tips[0]) descParts.push(`Tip: ${seg.tips[0]}`);

      events.push(event({
        DTSTART: icsDateTime(date, seg.start_time),
        DTEND: icsDateTime(date, seg.end_time),
        SUMMARY: title,
        DESCRIPTION: esc(descParts.join(" · ")),
        ...(seg.destination ? { LOCATION: esc(seg.destination) } : {}),
        UID: `seg-${seg.sequence}-day-${day.day_number}-${uid()}`,
        DTSTAMP: dtstamp,
      }));
    }
  }

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//AI Travel Copilot//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    fold(`X-WR-CALNAME:${esc(trip.trip_title)}`),
    fold(`X-WR-CALDESC:${esc(trip.summary)}`),
    ...events,
    "END:VCALENDAR",
  ].join("\r\n");
}

export function downloadICS(trip: TripPlan): void {
  const content = generateICS(trip);
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${trip.trip_title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
