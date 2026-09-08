import { CalendarEvent, ConnectorInfo } from "./types";

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.GOOGLE_CALENDAR_REFRESH_TOKEN;
const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || "primary";

function isConfigured(): boolean {
  return Boolean(CLIENT_ID && CLIENT_SECRET && REFRESH_TOKEN);
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
