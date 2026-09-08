// Eenvoudige (geen volledige NLP) planner voor zinnen als
// "plan morgen 14:00 een call met Jan" of "zet vrijdag 9u tandarts in mijn agenda".
// Begrijpt: vandaag/morgen/overmorgen, weekdagnamen, en tijden als 14:00, 14.00,
// 14u, 14 uur of "om 9". Geen tijdstip gevonden -> geeft null terug.

const MONTHS = [
  "januari", "februari", "maart", "april", "mei", "juni",
  "juli", "augustus", "september", "oktober", "november", "december",
];

// Index komt overeen met Date#getUTCDay() (0 = zondag).
const WEEKDAYS = [
  "zondag", "maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag",
];

export interface ParsedSchedule {
  /** Lokale wandklok-tijd in Europe/Amsterdam, zonder offset: "2024-06-10T14:00:00" */
  isoLocal: string;
  /** Leesbare Nederlandse omschrijving, bv. "maandag 10 juni om 14:00" */
  label: string;
  title: string;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function amsterdamDateParts(date: Date): { year: number; month: number; day: number } {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Amsterdam",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = fmt.formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return { year: get("year"), month: get("month"), day: get("day") };
}

function dayOfWeek(year: number, month: number, day: number): number {
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

function extractTime(lower: string): { hour: number; minute: number } | null {
  let m = lower.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
  if (m) return { hour: Number(m[1]), minute: Number(m[2]) };

  m = lower.match(/\b([01]?\d|2[0-3])\.([0-5]\d)\s*(?:uur|u)?\b/);
  if (m) return { hour: Number(m[1]), minute: Number(m[2]) };

  m = lower.match(/\b([01]?\d|2[0-3])\s?(?:uur|u)\b/);
  if (m) return { hour: Number(m[1]), minute: 0 };

  m = lower.match(/\bom\s+([01]?\d|2[0-3])\b/);
  if (m) return { hour: Number(m[1]), minute: 0 };

  return null;
}

function extractTitle(original: string): string {
  let t = original;
  const strip: RegExp[] = [
    /\bmaak\s+een\s+afspraak\b/gi,
    /\bvoeg\s+toe\s+aan\s+mijn\s+agenda\b/gi,
    /\bin\s+mijn\s+agenda\b/gi,
    /\bmijn\s+agenda\b/gi,
    /\bagenda\b/gi,
    /\bregel\s+een\s+afspraak\b/gi,
    /\bplan(t)?\b/gi,
    /\bboek\b/gi,
    /\bzet\b/gi,
    /\bovermorgen\b/gi,
    /\bmorgen\b/gi,
    /\bvandaag\b/gi,
    /\b(maandag|dinsdag|woensdag|donderdag|vrijdag|zaterdag|zondag)\b/gi,
    /\b([01]?\d|2[0-3]):([0-5]\d)\b/g,
    /\b([01]?\d|2[0-3])\.([0-5]\d)\s*(?:uur|u)?\b/gi,
    /\b([01]?\d|2[0-3])\s?(?:uur|u)\b/gi,
    /\bom\s+([01]?\d|2[0-3])\b/gi,
  ];
  for (const re of strip) t = t.replace(re, " ");
  t = t.replace(/\s+/g, " ").trim();
  t = t.replace(/^(voor|een|:|-)\s*/i, "").trim();
  return t || "Afspraak";
}

export function parseScheduleRequest(text: string, now: Date = new Date()): ParsedSchedule | null {
  const lower = text.toLowerCase();
  const today = amsterdamDateParts(now);
  const todayDow = dayOfWeek(today.year, today.month, today.day);

  let offsetDays = 0;
  if (/\bovermorgen\b/.test(lower)) {
    offsetDays = 2;
  } else if (/\bmorgen\b/.test(lower)) {
    offsetDays = 1;
  } else if (/\bvandaag\b/.test(lower)) {
    offsetDays = 0;
  } else {
    const weekdayIndex = WEEKDAYS.findIndex((w) => new RegExp(`\\b${w}\\b`).test(lower));
    if (weekdayIndex >= 0) {
      // Als vandaag toevallig die weekdag is, wordt "vandaag" bedoeld (offset 0).
      offsetDays = (weekdayIndex - todayDow + 7) % 7;
    }
  }

  const time = extractTime(lower);
  if (!time) return null;

  const target = amsterdamDateParts(new Date(now.getTime() + offsetDays * 86_400_000));
  const targetDow = dayOfWeek(target.year, target.month, target.day);

  const isoLocal = `${target.year}-${pad(target.month)}-${pad(target.day)}T${pad(time.hour)}:${pad(time.minute)}:00`;
  const label = `${WEEKDAYS[targetDow]} ${target.day} ${MONTHS[target.month - 1]} om ${pad(time.hour)}:${pad(time.minute)}`;

  return { isoLocal, label, title: extractTitle(text) };
}
