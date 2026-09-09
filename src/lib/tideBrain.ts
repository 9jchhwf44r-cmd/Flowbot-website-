import {
  CalendarEvent,
  createGoogleEvent,
  getUpcomingGoogleEvents,
  getUpcomingMagisterEvents,
  getAllConnectorInfo,
  searchSite,
  searchWeb,
} from "@/lib/connectors";
import { parseScheduleRequest } from "@/lib/dutchSchedule";
import { friendlyGeminiError } from "@/lib/gemini";
import { chatWithGroq, isGroqConfigured } from "@/lib/groq";

export interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}

const dateFormatter = new Intl.DateTimeFormat("nl-NL", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

const timeFormatter = new Intl.DateTimeFormat("nl-NL", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Amsterdam",
});

function formatEvents(events: CalendarEvent[]): string {
  if (events.length === 0) return "Ik zie geen aankomende afspraken.";
  return events
    .map((e) => {
      const day = dateFormatter.format(e.start);
      const time = timeFormatter.format(e.start);
      const where = e.location ? ` bij ${e.location}` : "";
      return `- ${e.title} op ${day} om ${time}${where}`;
    })
    .join("\n");
}

function matches(text: string, keywords: string[]): boolean {
  return keywords.some((k) => text.includes(k));
}

async function tryConnector(
  fn: () => Promise<string>,
  fallback: string
): Promise<string> {
  try {
    return await fn();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return `${fallback}\n\n(${message})`;
  }
}

const SYSTEM_PROMPT =
  "Je bent Tide, de persoonlijke Nederlandstalige AI-assistent van de " +
  "gebruiker (vergelijkbaar met Jarvis uit Iron Man). Antwoord kort, " +
  "vriendelijk en in het Nederlands, tenzij er in een andere taal tegen " +
  "je gesproken wordt.";

/**
 * Gebruikt Google's gratis Gemini API-tier (aistudio.google.com) als AI-brein
 * voor alles buiten de vaste commando's hierboven.
 */
async function callGemini(
  message: string,
  history: ChatMessage[]
): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const model = process.env.GEMINI_MODEL || "gemini-3.6-flash";

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [
          ...history.slice(-10).map((m) => ({
            role: m.role === "assistant" ? "model" : "user",
            parts: [{ text: m.text }],
          })),
          { role: "user", parts: [{ text: message }] },
        ],
      }),
    }
  );

  if (!res.ok) {
    throw new Error(friendlyGeminiError(res.status));
  }

  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  return text || null;
}

/**
 * Groq heeft een veel ruimer gratis quotum dan Gemini, dus die proberen we
 * eerst. Gemini blijft de terugval — als Groq niet is ingesteld of faalt
 * (bv. quotum bereikt), valt Tide automatisch op Gemini terug in plaats van
 * meteen op te geven.
 */
async function callAiBrain(
  message: string,
  history: ChatMessage[]
): Promise<string | null> {
  if (isGroqConfigured()) {
    try {
      const combined: ChatMessage[] = [...history.slice(-10), { role: "user", text: message }];
      const reply = await chatWithGroq(
        SYSTEM_PROMPT,
        combined.map((m) => ({ role: m.role, content: m.text }))
      );
      if (reply) return reply;
    } catch (err) {
      if (!process.env.GEMINI_API_KEY) throw err;
      // val stil door naar Gemini hieronder
    }
  }

  return callGemini(message, history);
}

export async function respondTo(
  message: string,
  history: ChatMessage[] = []
): Promise<string> {
  const text = message.toLowerCase().trim();

  if (matches(text, ["hoe laat", "wat is de tijd", "hoe laat is het"])) {
    return `Het is nu ${timeFormatter.format(new Date())} uur.`;
  }

  if (matches(text, ["welke dag", "datum", "wat is vandaag"])) {
    return `Vandaag is het ${dateFormatter.format(new Date())}.`;
  }

  if (
    matches(text, ["wat kun je", "wat kan je", "help", "hulp", "functies"])
  ) {
    const connectors = getAllConnectorInfo();
    const lines = connectors.map(
      (c) => `- ${c.label}: ${c.status === "connected" ? "gekoppeld ✅" : "niet gekoppeld ⏳"}`
    );
    return (
      "Ik ben Tide, jouw persoonlijke assistent. Ik kan onder andere:\n" +
      "- de tijd en datum vertellen\n" +
      "- je agenda voorlezen én er afspraken in plannen (\"plan morgen 14:00 een call\")\n" +
      "- je Magister-rooster voorlezen\n" +
      "- mijn kennisbank doorzoeken\n" +
      "- een 3D-model van iets maken en laten zien (\"maak een 3D-model van een raket\")\n" +
      "- (als gekoppeld) het internet doorzoeken\n\n" +
      "Status van mijn koppelingen:\n" +
      lines.join("\n")
    );
  }

  if (
    matches(text, [
      "plan ",
      "plan een afspraak",
      "maak een afspraak",
      "zet ",
      "voeg toe aan",
      "regel een afspraak",
      "boek ",
    ])
  ) {
    const parsed = parseScheduleRequest(message);
    if (!parsed) {
      return (
        "Ik heb geen tijdstip in je verzoek gevonden. Zeg bijvoorbeeld: " +
        "\"plan morgen 14:00 een call met Jan\" of \"zet vrijdag 9u tandarts in mijn agenda\"."
      );
    }
    return tryConnector(async () => {
      await createGoogleEvent(parsed.title, parsed.isoLocal);
      return `Gepland: "${parsed.title}" op ${parsed.label}.`;
    }, "Ik kan nog geen afspraken aanmaken: Google Agenda is niet gekoppeld, of de koppeling heeft geen schrijfrechten (scope calendar i.p.v. calendar.readonly).");
  }

  if (matches(text, ["agenda", "afspraak", "afspraken", "planning"])) {
    return tryConnector(
      async () => `Dit staat er in je agenda:\n${formatEvents(await getUpcomingGoogleEvents())}`,
      "Je Google Agenda is nog niet gekoppeld. Vraag je beheerder om GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET en GOOGLE_CALENDAR_REFRESH_TOKEN in te stellen."
    );
  }

  if (matches(text, ["magister", "rooster", "cijfers", "huiswerk"])) {
    return tryConnector(
      async () => `Dit staat er in je Magister-rooster:\n${formatEvents(await getUpcomingMagisterEvents())}`,
      "Magister is nog niet gekoppeld. Maak in Magister onder 'Agenda -> Extern gebruik' een iCal-link aan en zet die in MAGISTER_ICS_URL."
    );
  }

  if (matches(text, ["zoek op het web", "zoek online", "google het", "zoek op internet"])) {
    const query = text.replace(/zoek (op het web|online|op internet)( naar)?/g, "").trim() || text;
    return tryConnector(async () => {
      const results = await searchWeb(query);
      if (results.length === 0) return "Ik vond niets op het web voor die vraag.";
      return results.map((r) => `- ${r.title}: ${r.snippet} (${r.url})`).join("\n");
    }, "Web zoeken is nog niet gekoppeld. Voeg een BRAVE_SEARCH_API_KEY toe om dit aan te zetten.");
  }

  if (matches(text, ["doorzoek", "kennisbank"])) {
    const results = searchSite(text);
    if (results.length === 0) {
      return "Ik kon niets relevants vinden in mijn kennisbank voor die vraag.";
    }
    return results.map((r) => `- ${r.title}: ${r.snippet}`).join("\n");
  }

  try {
    const aiReply = await callAiBrain(message, history);
    if (aiReply) return aiReply;
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    return `Mijn AI-brein gaf een foutmelding: ${detail}`;
  }

  return (
    "Ik heb je nog geen volledig AI-brein: er is geen GROQ_API_KEY of " +
    "GEMINI_API_KEY ingesteld. Vraag me ondertussen gerust naar de tijd, je " +
    "agenda, om iets in te plannen, je Magister-rooster, of iets uit mijn " +
    "kennisbank — dat werkt al wel."
  );
}
