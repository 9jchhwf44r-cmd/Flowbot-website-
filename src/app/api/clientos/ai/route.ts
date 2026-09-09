import { NextRequest, NextResponse } from "next/server";
import { groqChatCompletion, isGroqConfigured, type GroqCompletionMessage } from "@/lib/groq";

/**
 * Vertaalschil: de TalkWave Client OS-pagina (public/clientos.html) is
 * oorspronkelijk gebouwd tegen Anthropic's Messages API (zoals in Claude-
 * artifacts). In plaats van elke aanroep in die pagina te herschrijven,
 * accepteert deze route exact dezelfde Anthropic-vormige request-body
 * (system/messages/tools/max_tokens), vertaalt die naar Groq's OpenAI-
 * compatibele formaat, en geeft een Anthropic-vormig antwoord terug
 * ({content, stop_reason}) — zodat de bestaande frontend-code (die
 * data.content.filter(...), tool_use-blocks, etc. leest) ongewijzigd blijft.
 */

interface AnthropicContentBlock {
  type: string;
  text?: string;
  id?: string;
  name?: string;
  input?: unknown;
  tool_use_id?: string;
  content?: string;
}

interface AnthropicMessage {
  role: "user" | "assistant";
  content: string | AnthropicContentBlock[];
}

interface AnthropicTool {
  name: string;
  description?: string;
  input_schema?: unknown;
}

function toGroqMessages(
  system: string | undefined,
  messages: AnthropicMessage[]
): GroqCompletionMessage[] {
  const out: GroqCompletionMessage[] = [];
  if (system) out.push({ role: "system", content: system });

  for (const m of messages) {
    if (typeof m.content === "string") {
      out.push({ role: m.role, content: m.content });
      continue;
    }
    if (!Array.isArray(m.content)) continue;

    const toolResults = m.content.filter((b) => b.type === "tool_result");
    if (toolResults.length > 0) {
      for (const tr of toolResults) {
        out.push({ role: "tool", content: String(tr.content ?? ""), tool_call_id: tr.tool_use_id });
      }
      continue;
    }

    const text = m.content
      .filter((b) => b.type === "text")
      .map((b) => b.text || "")
      .join("\n");
    const toolUses = m.content.filter((b) => b.type === "tool_use");
    const msg: GroqCompletionMessage = { role: "assistant", content: text || null };
    if (toolUses.length > 0) {
      msg.tool_calls = toolUses.map((tu) => ({
        id: tu.id || "",
        type: "function" as const,
        function: { name: tu.name || "", arguments: JSON.stringify(tu.input ?? {}) },
      }));
    }
    out.push(msg);
  }
  return out;
}

/** Alleen tools met een echt input_schema kunnen naar function-calling vertaald worden
 * (Anthropic's ingebouwde server-tools zoals web_search hebben dat niet). */
function toGroqTools(tools?: AnthropicTool[]): unknown[] | undefined {
  const usable = (tools || []).filter((t) => t.input_schema);
  if (usable.length === 0) return undefined;
  return usable.map((t) => ({
    type: "function",
    function: { name: t.name, description: t.description, parameters: t.input_schema },
  }));
}

export async function POST(req: NextRequest) {
  if (!isGroqConfigured()) {
    return NextResponse.json(
      { error: "GROQ_API_KEY is niet ingesteld op de server." },
      { status: 503 }
    );
  }

  const body = await req.json().catch(() => null);
  if (!body || !Array.isArray(body.messages)) {
    return NextResponse.json({ error: "messages is verplicht" }, { status: 400 });
  }

  try {
    const groqMessages = toGroqMessages(body.system, body.messages);
    const groqTools = toGroqTools(body.tools);
    const data = await groqChatCompletion(groqMessages, {
      tools: groqTools,
      maxTokens: typeof body.max_tokens === "number" ? body.max_tokens : undefined,
    });

    const message = data.choices?.[0]?.message;
    const content: AnthropicContentBlock[] = [];
    if (message?.content) content.push({ type: "text", text: message.content });
    if (message?.tool_calls) {
      for (const tc of message.tool_calls) {
        let input: unknown = {};
        try {
          input = JSON.parse(tc.function.arguments || "{}");
        } catch {
          input = {};
        }
        content.push({ type: "tool_use", id: tc.id, name: tc.function.name, input });
      }
    }
    const stop_reason = data.choices?.[0]?.finish_reason === "tool_calls" ? "tool_use" : "end_turn";

    return NextResponse.json({ content, stop_reason });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: detail }, { status: 502 });
  }
}
