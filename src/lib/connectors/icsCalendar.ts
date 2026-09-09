import ical, { CalendarResponse, FetchOptions, VEvent } from "node-ical";
import { CalendarEvent, ConnectorInfo } from "./types";

// De officiële node-ical types laten de Promise-overload van fromURL geen
// FetchOptions accepteren (alleen de callback-overload doet dat), terwijl
// hij die op runtime-niveau wél doorgeeft aan fetch(). Zonder callback
// geeft fromURL altijd een Promise terug (zie node-ical's core-api.js).
const fromUrlWithOptions = ical.async.fromURL as (
  url: string,
  options: FetchOptions
) => Promise<CalendarResponse>;

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

export function isMagisterConfigured(): boolean {
  return isConfigured();
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
  // Sommige agenda-servers (waaronder Magister) weigeren verzoeken zonder
  // een herkenbare browser/calendar-client User-Agent met een 403, ook als
  // de webcal-link zelf geldig is. Ook geven we een timeout mee, zodat een
  // trage server niet de hele serverless-functie laat vastlopen.
  const events = await fromUrlWithOptions(toHttps(url), {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/calendar, */*",
    },
    signal: AbortSignal.timeout(8000),
  });
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
