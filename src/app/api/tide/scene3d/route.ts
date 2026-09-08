import { NextRequest, NextResponse } from "next/server";
import { parseScene3D, SCENE3D_SYSTEM_PROMPT } from "@/lib/scene3d";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";
  if (!prompt) {
    return NextResponse.json({ error: "prompt is verplicht" }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY ontbreekt — nodig om 3D-modellen te genereren." },
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
          system_instruction: { parts: [{ text: SCENE3D_SYSTEM_PROMPT }] },
          contents: [{ role: "user", parts: [{ text: `Maak een 3D-model van: ${prompt}` }] }],
          generationConfig: { responseMimeType: "application/json" },
        }),
      }
    );

    if (!res.ok) {
      return NextResponse.json({ error: `Gemini gaf status ${res.status} terug` }, { status: 502 });
    }

    const data = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      return NextResponse.json({ error: "Geen 3D-scene ontvangen van Gemini" }, { status: 502 });
    }

    const scene = parseScene3D(text);
    if (!scene) {
      return NextResponse.json({ error: "Kon de 3D-scene niet lezen" }, { status: 502 });
    }

    return NextResponse.json({ scene });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: detail }, { status: 500 });
  }
}
