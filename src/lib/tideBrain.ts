import {
  CalendarEvent,
  getUpcomingGoogleEvents,
  getUpcomingMagisterEvents,
  getAllConnectorInfo,
  searchSite,
  searchWeb,
} from "@/lib/connectors";

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

async function callAnthropic(
  message: string,
  history: ChatMessage[]
): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 512,
      system:
        "Je bent Tide, de behulpzame Nederlandstalige AI-assistent van Talkwave " +
        "(vergelijkbaar met Jarvis). Antwoord kort, vriendelijk en in het " +
        "Nederlands, tenzij er in een andere taal tegen je gesproken wordt.",
      messages: [
        ...history.slice(-10).map((m) => ({
          role: m.role,
          content: m.text,
        })),
        { role: "user", content: message },
      ],
    }),
  });

  if (!res.ok) {
    throw new Error(`Anthropic API gaf status ${res.status} terug`);
  }

  const data = (await res.json()) as {
    content?: Array<{ type: string; text?: string }>;
  };

  const text = data.content?.find((c) => c.type === "text")?.text;
  return text || null;
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
      "Ik ben Tide, de assistent van Talkwave. Ik kan onder andere:\n" +
      "- de tijd en datum vertellen\n" +
      "- je agenda voorlezen\n" +
      "- je Magister-rooster voorlezen\n" +
      "- de website van Talkwave doorzoeken\n" +
      "- (als gekoppeld) het internet doorzoeken\n\n" +
      "Status van mijn koppelingen:\n" +
      lines.join("\n")
    );
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

  if (matches(text, ["website", "talkwave", "doorzoek"])) {
    const results = searchSite(text);
    if (results.length === 0) {
      return "Ik kon niets relevants vinden op de website voor die vraag.";
    }
    return results.map((r) => `- ${r.title}: ${r.snippet}`).join("\n");
  }

  try {
    const aiReply = await callAnthropic(message, history);
    if (aiReply) return aiReply;
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    return `Mijn AI-brein gaf een foutmelding: ${detail}`;
  }

  return (
    "Ik heb je nog geen volledig AI-brein: er is geen ANTHROPIC_API_KEY " +
    "ingesteld. Vraag me ondertussen gerust naar de tijd, je agenda, je " +
    "Magister-rooster of iets over de website — dat werkt al wel."
  );
}
