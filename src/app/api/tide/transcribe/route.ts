import { NextRequest, NextResponse } from "next/server";

const TRANSCRIBE_PROMPT =
  "Transcribeer deze audio-opname naar tekst. Geef ALLEEN de letterlijke " +
  "tekst terug, in de taal die gesproken wordt, zonder aanhalingstekens, " +
  "uitleg of opmaak. Als er geen verstaanbare spraak in zit, geef dan een " +
  "lege string terug.";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const audioBase64 = typeof body?.audioBase64 === "string" ? body.audioBase64 : "";
  const mimeType = typeof body?.mimeType === "string" ? body.mimeType : "audio/webm";

  if (!audioBase64) {
    return NextResponse.json({ error: "audioBase64 is verplicht" }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY ontbreekt — nodig om spraak te transcriberen." },
      { status: 503 }
    );
  }

  const model = process.env.GEMINI_MODEL || "gemini-3.6-flash";

  try {
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
      return NextResponse.json({ error: `Gemini gaf status ${res.status} terug` }, { status: 502 });
    }

    const data = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";

    return NextResponse.json({ text });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: detail }, { status: 500 });
  }
}
