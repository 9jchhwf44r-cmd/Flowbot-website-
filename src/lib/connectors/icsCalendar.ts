import ical, { VEvent } from "node-ical";
import { CalendarEvent, ConnectorInfo } from "./types";

/**
 * Generieke iCal/webcal-koppeling. Magister heeft geen officiële publieke API,
 * maar biedt via "Agenda -> Extern gebruik -> Abonneren" wel een officiële
 * webcal/ICS-link aan. Dat is de veilige, door Magister zelf ondersteunde weg
 * (in plaats van inloggegevens scrapen, wat tegen de voorwaarden kan ingaan).
 * Dezelfde koppeling werkt voor elke andere ICS-agenda (Outlook, Apple, etc).
 */
const ICS_URL = process.env.MAGISTER_ICS_URL;

function isConfigured(): boolean {
  return Boolean(ICS_URL);
}

export function describeMagister(): ConnectorInfo {
  return {
    id: "magister",
    label: "Magister (rooster)",
    status: isConfigured() ? "connected" : "not_configured",
    detail: isConfigured()
      ? "Gekoppeld via de officiële Magister iCal-agenda-export."
      : "Nog niet gekoppeld. Magister heeft geen publieke API; gebruik in Magister 'Agenda -> Extern gebruik' om een webcal/ICS-link te maken en zet die in MAGISTER_ICS_URL (zie README).",
  };
}

function toHttps(url: string): string {
  return url.replace(/^webcal:\/\//i, "https://");
}

function asText(value: string | { val: string } | undefined): string | undefined {
  if (!value) return undefined;
  return typeof value === "string" ? value : value.val;
}

export async function getUpcomingIcsEvents(
  url: string,
  maxResults = 5
): Promise<CalendarEvent[]> {
  const events = await ical.async.fromURL(toHttps(url));
  const now = Date.now();

  return Object.values(events)
    .filter((e): e is VEvent => Boolean(e) && e!.type === "VEVENT" && Boolean((e as VEvent).start))
    .filter((e) => e.start.getTime() >= now)
    .sort((a, b) => a.start.getTime() - b.start.getTime())
    .slice(0, maxResults)
    .map((e) => ({
      title: asText(e.summary) || "(zonder titel)",
      location: asText(e.location),
      start: e.start,
      end: e.end,
    }));
}

export async function getUpcomingMagisterEvents(
  maxResults = 5
): Promise<CalendarEvent[]> {
  if (!isConfigured()) {
    throw new Error("Magister is niet gekoppeld.");
  }
  return getUpcomingIcsEvents(ICS_URL!, maxResults);
}
