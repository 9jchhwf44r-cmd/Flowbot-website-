import { sitePages } from "@/data/siteContent";
import { ConnectorInfo } from "./types";

export interface SiteSearchResult {
  title: string;
  url: string;
  snippet: string;
}

// Deze connector heeft geen externe koppeling nodig: hij doorzoekt de
// persoonlijke kennisbank (src/data/siteContent.ts) en is dus altijd "live".
export function describeSiteSearch(): ConnectorInfo {
  return {
    id: "site-search",
    label: "Kennisbank",
    status: "connected",
    detail: "Actief — Tide kan zijn eigen kennisbank doorzoeken.",
  };
}

export function searchSite(query: string, maxResults = 3): SiteSearchResult[] {
  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 2);

  const scored = sitePages.map((page) => {
    const haystack = `${page.title} ${page.keywords.join(" ")} ${page.content}`.toLowerCase();
    const score = terms.reduce(
      (acc, term) => acc + (haystack.includes(term) ? 1 : 0),
      0
    );
    return { page, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults)
    .map(({ page }) => ({
      title: page.title,
      url: page.url,
      snippet: page.content,
    }));
}
