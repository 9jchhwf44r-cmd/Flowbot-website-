import { NextRequest, NextResponse } from "next/server";
import { respondTo, ChatMessage } from "@/lib/tideBrain";

export async function POST(req: NextRequest) {
  let body: { message?: string; history?: ChatMessage[] };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige JSON" }, { status: 400 });
  }

  const message = body.message?.trim();
  if (!message) {
    return NextResponse.json({ error: "message is verplicht" }, { status: 400 });
  }

  const history = Array.isArray(body.history) ? body.history : [];

  try {
    const reply = await respondTo(message, history);
    return NextResponse.json({ reply });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Tide kon niet antwoorden: ${detail}` },
      { status: 500 }
    );
  }
}
