export interface SitePage {
  id: string;
  title: string;
  url: string;
  keywords: string[];
  content: string;
}

// Persoonlijke kennisbank voor Tide's "doorzoek de website"-functie.
// Dit is bewust geen marketingtekst voor bezoekers — vul aan met wat jij
// Tide wil laten weten (bv. over Talkwave zelf, projecten, notities).
export const sitePages: SitePage[] = [
  {
    id: "tide",
    title: "Over Tide",
    url: "/tide",
    keywords: ["tide", "jarvis", "assistent", "spraak", "voice"],
    content:
      "Tide is jouw persoonlijke spraakgestuurde AI-assistent. Je kunt tegen " +
      "Tide praten of typen; hij kent je agenda, kan afspraken voor je " +
      "inplannen, en kan (als gekoppeld) je Magister-rooster en het web " +
      "doorzoeken.",
  },
];
