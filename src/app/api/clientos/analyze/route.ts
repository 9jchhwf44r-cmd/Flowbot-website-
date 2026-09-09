import { NextRequest, NextResponse } from "next/server";
import { groqChatCompletion, isGroqConfigured } from "@/lib/groq";

/**
 * Vervangt de "Analyseer website"-functie uit het origineel, die Anthropic's
 * ingebouwde web_search-tool gebruikte (meerdere zoekopdrachten, reviews
 * elders op het web). Groq heeft geen ingebouwde websearch-tool, dus deze
 * route haalt in plaats daarvan de opgegeven pagina zelf op en laat Groq
 * die tekst analyseren — geen bredere web-zoekopdracht of externe reviews,
 * alleen wat er op de meegegeven URL staat.
 */

function stripHtmlToText(html: string): string {
  const withoutScripts = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ");
  const withoutTags = withoutScripts.replace(/<[^>]+>/g, " ");
  return withoutTags.replace(/\s+/g, " ").trim();
}

const ANALYZE_SYSTEM_PROMPT = `Je bent een senior digital consultant voor TalkWave, een bureau dat AI-chatbots op maat bouwt voor lokale bedrijven. Je krijgt de tekstinhoud van de homepage van een prospect (opgehaald van hun eigen website — geen bredere webzoekopdracht of externe reviews).

Antwoord UITSLUITEND met geldige JSON, niets anders — geen markdown-codeblok, geen uitleg ervoor of erna. Exact dit formaat:
{
  "name": "bedrijfsnaam",
  "sector": "korte sector-omschrijving, bv. Restaurant, Watersport, Makelaardij",
  "description": "2-4 zinnen die het bedrijf beschrijven",
  "services": "Dienst - prijs\\nDienst - prijs (één per regel; gebruik 'prijs op aanvraag' als je geen prijs vond; laat leeg als je echt niets vond)",
  "hours": "openingstijden zoals vermeld, of leeg als onbekend",
  "address": "adres, of leeg als onbekend",
  "phone": "telefoonnummer, of leeg als onbekend",
  "email": "e-mailadres, of leeg als onbekend",
  "summary": "2-3 zinnen: wat heb je gevonden en gebruikt om dit profiel te bouwen",
  "sterke_punten": ["concreet sterk punt van de huidige website", "...", "..."],
  "zwakke_punten": ["concreet zwak punt of gemiste kans op de huidige website", "...", "..."],
  "technische_observaties": ["concrete, waarneembare observatie, bv. geen online boekingsmogelijkheid, geen chat/contactmogelijkheid, verouderd ontwerp, geen vermelding van openingstijden, etc.", "...", "..."],
  "opportunities": ["korte concrete kans 1 voor AI-automatisering bij dít bedrijf", "kans 2", "kans 3"]
}
Regels:
- Verzin nooit informatie. Als iets niet met vertrouwen in de tekst te vinden was, laat het veld leeg ("") of geef een lege array.
- sterke_punten, zwakke_punten en technische_observaties moeten elk minimaal 2 en maximaal 4 items hebben, en concreet en specifiek zijn voor DIT bedrijf — geen generieke uitspraken.
- Baseer alles alleen op de meegegeven paginatekst, nooit op aannames over "wat een website normaal heeft".`;

export async function POST(req: NextRequest) {
  if (!isGroqConfigured()) {
    return NextResponse.json(
      { error: "GROQ_API_KEY is niet ingesteld op de server." },
      { status: 503 }
    );
  }

  const body = await req.json().catch(() => null);
  const url = typeof body?.url === "string" ? body.url.trim() : "";
  if (!url) {
    return NextResponse.json({ error: "url is verplicht" }, { status: 400 });
  }

  let pageText: string;
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      throw new Error(`Kon de website niet ophalen (status ${res.status}).`);
    }
    const html = await res.text();
    pageText = stripHtmlToText(html).slice(0, 6000);
    if (pageText.length < 50) {
      throw new Error("De pagina leverde nauwelijks leesbare tekst op.");
    }
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Kon de website niet analyseren: ${detail}` },
      { status: 502 }
    );
  }

  try {
    const data = await groqChatCompletion(
      [
        { role: "system", content: ANALYZE_SYSTEM_PROMPT },
        { role: "user", content: `URL: ${url}\n\nPaginatekst:\n${pageText}` },
      ],
      { maxTokens: 1500 }
    );
    const text = data.choices?.[0]?.message?.content?.trim() || "";
    const clean = text.replace(/```json/gi, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(clean);
    return NextResponse.json(parsed);
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Analyse mislukt: ${detail}` },
      { status: 502 }
    );
  }
}
