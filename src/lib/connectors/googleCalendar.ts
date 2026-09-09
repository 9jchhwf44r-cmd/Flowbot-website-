import { CalendarEvent, ConnectorInfo } from "./types";

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.GOOGLE_CALENDAR_REFRESH_TOKEN;
const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || "primary";

function isConfigured(): boolean {
  return Boolean(CLIENT_ID && CLIENT_SECRET && REFRESH_TOKEN);
}

export function isGoogleCalendarConfigured(): boolean {
  return isConfigured();
}

export function describeGoogleCalendar(): ConnectorInfo {
  return {
    id: "google-calendar",
    label: "Google Agenda",
    status: isConfigured() ? "connected" : "not_configured",
    detail: isConfigured()
      ? "Gekoppeld aan Google Agenda."
      : "Nog niet gekoppeld. Voeg GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET en GOOGLE_CALENDAR_REFRESH_TOKEN toe in .env (zie README).",
  };
}

async function getAccessToken(): Promise<string> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: CLIENT_ID!,
      client_secret: CLIENT_SECRET!,
      refresh_token: REFRESH_TOKEN!,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    throw new Error(`Kon geen Google-token ophalen (${res.status})`);
  }

  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

export async function getUpcomingGoogleEvents(
  maxResults = 5
): Promise<CalendarEvent[]> {
  if (!isConfigured()) {
    throw new Error("Google Agenda is niet gekoppeld.");
  }

  const accessToken = await getAccessToken();
  const params = new URLSearchParams({
    timeMin: new Date().toISOString(),
    maxResults: String(maxResults),
    singleEvents: "true",
    orderBy: "startTime",
  });

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
      CALENDAR_ID
    )}/events?${params.toString()}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!res.ok) {
    throw new Error(`Google Agenda gaf een fout terug (${res.status})`);
  }

  const data = (await res.json()) as {
    items?: Array<{
      summary?: string;
      location?: string;
      start?: { dateTime?: string; date?: string };
      end?: { dateTime?: string; date?: string };
    }>;
  };

  return (data.items || []).map((item) => ({
    title: item.summary || "(zonder titel)",
    location: item.location,
    start: new Date(item.start?.dateTime || item.start?.date || Date.now()),
    end: item.end?.dateTime || item.end?.date
      ? new Date(item.end.dateTime || item.end.date || "")
      : undefined,
  }));
}

function addMinutesToLocalIso(isoLocal: string, minutes: number): string {
  const [datePart, timePart] = isoLocal.split("T");
  const [y, mo, d] = datePart.split("-").map(Number);
  const [h, mi] = timePart.split(":").map(Number);
  // Puur wandklok-rekenwerk (geen echte UTC-instant) om dag/maand-overloop op te vangen.
  const helper = new Date(Date.UTC(y, mo - 1, d, h, mi));
  helper.setUTCMinutes(helper.getUTCMinutes() + minutes);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${helper.getUTCFullYear()}-${pad(helper.getUTCMonth() + 1)}-${pad(helper.getUTCDate())}T${pad(helper.getUTCHours())}:${pad(helper.getUTCMinutes())}:00`;
}

/**
 * Maakt een afspraak aan. isoLocalStart is een wandklok-tijd zonder offset
 * (bv. "2024-06-10T14:00:00"), die samen met timeZone "Europe/Amsterdam"
 * naar Google gestuurd wordt — Google rekent zelf de juiste UTC-instant uit.
 * Vereist dat de gekoppelde Google-account schrijftoegang heeft gegeven
 * (scope "https://www.googleapis.com/auth/calendar" i.p.v. alleen readonly).
 */
export async function createGoogleEvent(
  title: string,
  isoLocalStart: string,
  durationMinutes = 60
): Promise<{ htmlLink?: string }> {
  if (!isConfigured()) {
    throw new Error("Google Agenda is niet gekoppeld.");
  }

  const accessToken = await getAccessToken();
  const isoLocalEnd = addMinutesToLocalIso(isoLocalStart, durationMinutes);

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        summary: title,
        start: { dateTime: isoLocalStart, timeZone: "Europe/Amsterdam" },
        end: { dateTime: isoLocalEnd, timeZone: "Europe/Amsterdam" },
      }),
    }
  );

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Kon geen afspraak aanmaken (${res.status}) ${detail}`.trim());
  }

  return (await res.json()) as { htmlLink?: string };
}
