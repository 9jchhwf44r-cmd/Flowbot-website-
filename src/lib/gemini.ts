/** Zet een Gemini HTTP-foutstatus om in een begrijpelijke Nederlandse melding. */
export function friendlyGeminiError(status: number): string {
  if (status === 429) {
    return "De gratis Gemini-limiet voor vandaag is bereikt. Probeer het morgen opnieuw, of zet een betaald Gemini-abonnement aan voor meer capaciteit.";
  }
  if (status === 503) {
    return "Gemini is even overbelast. Probeer het over een paar seconden nog eens.";
  }
  return `Gemini gaf een onverwachte foutmelding terug (status ${status}).`;
}

/** Kleine, generieke (single-turn) Gemini-aanroep, los van Tide's meerturns-chat in tideBrain.ts. */
export async function generateWithGemini(
  systemPrompt: string,
  userPrompt: string
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
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      }),
    }
  );

  if (!res.ok) {
    throw new Error(friendlyGeminiError(res.status));
  }

  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };

  return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
}
