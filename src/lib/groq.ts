export interface GroqChatMessage {
  role: "user" | "assistant";
  content: string;
}

/** Zet een Groq HTTP-foutstatus om in een begrijpelijke Nederlandse melding. */
export function friendlyGroqError(status: number, detail?: string): string {
  if (status === 429) {
    return "De gratis Groq-limiet is even bereikt. Probeer het over een minuutje opnieuw.";
  }
  if (status === 503) {
    return "Groq is even overbelast. Probeer het over een paar seconden nog eens.";
  }
  const base = `Groq gaf een onverwachte foutmelding terug (status ${status}).`;
  return detail ? `${base} ${detail}` : base;
}

export function isGroqConfigured(): boolean {
  return Boolean(process.env.GROQ_API_KEY);
}

/** Meerturns-chat via Groq's OpenAI-compatibele API — snel en met een veel ruimer gratis quotum dan Gemini. */
export async function chatWithGroq(
  systemPrompt: string,
  messages: GroqChatMessage[]
): Promise<string | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;

  // llama-3.3-70b-versatile is per 17 juni 2026 door Groq uit dienst genomen;
  // openai/gpt-oss-120b is de door Groq zelf aanbevolen vervanger.
  const model = process.env.GROQ_MODEL || "openai/gpt-oss-120b";

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "system", content: systemPrompt }, ...messages],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(friendlyGroqError(res.status, body.slice(0, 300)));
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  return data.choices?.[0]?.message?.content || null;
}

export interface GroqCompletionMessage {
  role: string;
  content: string | null;
  tool_calls?: Array<{
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }>;
  tool_call_id?: string;
  [key: string]: unknown;
}

export interface GroqCompletionResponse {
  choices?: Array<{
    message?: GroqCompletionMessage;
    finish_reason?: string;
  }>;
}

/**
 * Losse, generieke chat-completion-aanroep (met optionele tool-calling) voor
 * gevallen waar chatWithGroq() te beperkt is — bv. de TalkWave Client OS, die
 * zelf zijn berichten/tools samenstelt en de ruwe response wil inspecteren.
 */
export async function groqChatCompletion(
  messages: GroqCompletionMessage[],
  options: { tools?: unknown[]; maxTokens?: number } = {}
): Promise<GroqCompletionResponse> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY ontbreekt.");

  const model = process.env.GROQ_MODEL || "openai/gpt-oss-120b";

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      ...(options.tools && options.tools.length > 0
        ? { tools: options.tools, tool_choice: "auto" }
        : {}),
      ...(options.maxTokens ? { max_tokens: options.maxTokens } : {}),
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(friendlyGroqError(res.status, body.slice(0, 300)));
  }

  return res.json();
}

/** Spraak-naar-tekst via Groq's gehoste Whisper — doelgericht en snel. */
export async function transcribeWithGroq(
  audioBuffer: Buffer,
  mimeType: string
): Promise<string | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;

  const model = process.env.GROQ_WHISPER_MODEL || "whisper-large-v3-turbo";
  const ext = mimeType.includes("mp4") ? "mp4" : mimeType.includes("wav") ? "wav" : "webm";

  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(audioBuffer)], { type: mimeType }), `audio.${ext}`);
  form.append("model", model);

  const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}` },
    body: form,
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(friendlyGroqError(res.status, body.slice(0, 300)));
  }

  const data = (await res.json()) as { text?: string };
  return data.text?.trim() || null;
}
