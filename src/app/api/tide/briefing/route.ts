import { NextResponse } from "next/server";
import {
  CalendarEvent,
  CryptoSnapshot,
  NewsItem,
  getBitcoinSnapshot,
  getLatestNews,
  getUpcomingGoogleEvents,
} from "@/lib/connectors";
import { generateWithGemini } from "@/lib/gemini";

const SUMMARY_SYSTEM_PROMPT =
  "Je bent Tide, de persoonlijke AI-assistent van de gebruiker. Schrijf een " +
  "korte (2-4 zinnen), vriendelijke gesproken dagupdate in het Nederlands op " +
  "basis van de aangeleverde gegevens (agenda, nieuws, bitcoinkoers). Noem " +
  "niet expliciet 'JSON' of 'data' — praat gewoon tegen de gebruiker alsof je " +
  "het net hebt opgezocht. Als een onderdeel ontbreekt, sla dat gewoon over.";

async function buildSummary(
  agenda: CalendarEvent[],
  news: NewsItem[],
  crypto: CryptoSnapshot | null
): Promise<string> {
  const parts: string[] = [];
  parts.push(`Vandaag: ${agenda.length} afspraak/afspraken${agenda.length ? " - " + agenda.map((e) => e.title).join(", ") : ""}.`);
  if (news.length) {
    parts.push(`Nieuws: ${news.slice(0, 3).map((n) => n.title).join(" | ")}.`);
  }
  if (crypto) {
    parts.push(`Bitcoin: €${Math.round(crypto.priceEur).toLocaleString("nl-NL")} (${crypto.changePct24h >= 0 ? "+" : ""}${crypto.changePct24h.toFixed(1)}% laatste 24u).`);
  }
  const context = parts.join("\n");

  try {
    const generated = await generateWithGemini(SUMMARY_SYSTEM_PROMPT, context);
    if (generated) return generated.trim();
  } catch {
    // val terug op het sjabloon hieronder
  }

  const day = new Intl.DateTimeFormat("nl-NL", { weekday: "long", day: "numeric", month: "long" }).format(new Date());
  let fallback = `Goedendag. Het is ${day}. `;
  fallback += agenda.length
    ? `Je hebt vandaag ${agenda.length} afspraak${agenda.length === 1 ? "" : "en"}.`
    : "Er staat niets in je agenda.";
  return fallback;
}

export async function GET() {
  const [agendaResult, newsResult, cryptoResult] = await Promise.allSettled([
    getUpcomingGoogleEvents(5),
    getLatestNews(6),
    getBitcoinSnapshot(),
  ]);

  const agenda = agendaResult.status === "fulfilled" ? agendaResult.value : [];
  const news = newsResult.status === "fulfilled" ? newsResult.value : [];
  const crypto = cryptoResult.status === "fulfilled" ? cryptoResult.value : null;

  const summary = await buildSummary(agenda, news, crypto);

  return NextResponse.json({
    summary,
    agenda,
    news,
    crypto,
    agendaConnected: agendaResult.status === "fulfilled",
  });
}
