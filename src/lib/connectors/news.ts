import { ConnectorInfo } from "./types";

// Publieke RSS-feed van de NOS — geen API-key of account nodig, altijd "live".
const FEED_URL = "https://feeds.nos.nl/nosnieuwsalgemeen";

export interface NewsItem {
  title: string;
  link: string;
}

export function describeNews(): ConnectorInfo {
  return {
    id: "news",
    label: "Nieuws",
    status: "connected",
    detail: "Actief — live nieuwskoppen via de NOS-RSS-feed, geen API-key nodig.",
  };
}

function decodeXmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

export async function getLatestNews(maxItems = 6): Promise<NewsItem[]> {
  const res = await fetch(FEED_URL);
  if (!res.ok) {
    throw new Error(`Nieuwsfeed gaf status ${res.status} terug`);
  }
  const xml = await res.text();

  const items: NewsItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match: RegExpExecArray | null;

  while ((match = itemRegex.exec(xml)) && items.length < maxItems) {
    const block = match[1];
    const titleRaw = block.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/)?.[1];
    const link = block.match(/<link>([\s\S]*?)<\/link>/)?.[1]?.trim();
    if (titleRaw && link) {
      items.push({ title: decodeXmlEntities(titleRaw.trim()), link });
    }
  }

  return items;
}
