import { NextRequest, NextResponse } from "next/server";
import { friendlyGeminiError } from "@/lib/gemini";
import { isGroqConfigured, transcribeWithGroq } from "@/lib/groq";

const TRANSCRIBE_PROMPT =
  "Transcribeer deze audio-opname naar tekst. Geef ALLEEN de letterlijke " +
  "tekst terug, in de taal die gesproken wordt, zonder aanhalingstekens, " +
  "uitleg of opmaak. Als er geen verstaanbare spraak in zit, geef dan een " +
  "lege string terug.";

async function transcribeWithGemini(audioBase64: string, mimeType: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY ontbreekt — nodig om spraak te transcriberen.");
  }

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
        contents: [
          {
            role: "user",
            parts: [
              { text: TRANSCRIBE_PROMPT },
              { inline_data: { mime_type: mimeType, data: audioBase64 } },
            ],
          },
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
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const audioBase64 = typeof body?.audioBase64 === "string" ? body.audioBase64 : "";
  const mimeType = typeof body?.mimeType === "string" ? body.mimeType : "audio/webm";

  if (!audioBase64) {
    return NextResponse.json({ error: "audioBase64 is verplicht" }, { status: 400 });
  }

  // Groq's gehoste Whisper is doelgericht voor transcriptie en heeft een
  // ruimer gratis quotum — probeer die eerst, val terug op Gemini.
  if (isGroqConfigured()) {
    try {
      const text = await transcribeWithGroq(Buffer.from(audioBase64, "base64"), mimeType);
      return NextResponse.json({ text: text || "" });
    } catch (err) {
      if (!process.env.GEMINI_API_KEY) {
        const detail = err instanceof Error ? err.message : String(err);
        return NextResponse.json({ error: detail }, { status: 502 });
      }
      // val stil door naar Gemini hieronder
    }
  }

  try {
    const text = await transcribeWithGemini(audioBase64, mimeType);
    return NextResponse.json({ text });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: detail }, { status: 500 });
  }
}
