import { ConnectorInfo } from "./types";

const API_KEY = process.env.BRAVE_SEARCH_API_KEY;

export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
}

function isConfigured(): boolean {
  return Boolean(API_KEY);
}

export function describeWebSearch(): ConnectorInfo {
  return {
    id: "web-search",
    label: "Web zoeken",
    status: isConfigured() ? "connected" : "not_configured",
    detail: isConfigured()
      ? "Gekoppeld aan Brave Search."
      : "Nog niet gekoppeld. Voeg BRAVE_SEARCH_API_KEY toe in .env om live op internet te zoeken (zie README).",
  };
}

export async function searchWeb(
  query: string,
  count = 3
): Promise<WebSearchResult[]> {
  if (!isConfigured()) {
    throw new Error("Web zoeken is niet gekoppeld.");
  }

  const params = new URLSearchParams({ q: query, count: String(count) });
  const res = await fetch(
    `https://api.search.brave.com/res/v1/web/search?${params.toString()}`,
    {
      headers: {
        Accept: "application/json",
        "X-Subscription-Token": API_KEY!,
      },
    }
  );

  if (!res.ok) {
    throw new Error(`Brave Search gaf een fout terug (${res.status})`);
  }

  const data = (await res.json()) as {
    web?: { results?: Array<{ title: string; url: string; description: string }> };
  };

  return (data.web?.results || []).map((r) => ({
    title: r.title,
    url: r.url,
    snippet: r.description,
  }));
}
