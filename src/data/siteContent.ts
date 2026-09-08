export interface SitePage {
  id: string;
  title: string;
  url: string;
  keywords: string[];
  content: string;
}

// Deze inhoud voedt Tide's "doorzoek de website"-functie. Werk dit bij
// zodra de echte Talkwave-paginatekst vaststaat.
export const sitePages: SitePage[] = [
  {
    id: "home",
    title: "Talkwave — home",
    url: "/",
    keywords: ["talkwave", "over ons", "wat doen jullie", "diensten"],
    content:
      "Talkwave bouwt slimme, pratende software voor bedrijven: chatbots, " +
      "automatisering en AI-assistenten zoals Tide. We helpen bedrijven hun " +
      "klantcontact en dagelijkse taken te automatiseren met AI die er " +
      "menselijk uitziet en klinkt.",
  },
  {
    id: "tide",
    title: "Tide — de AI-assistent van Talkwave",
    url: "/tide",
    keywords: ["tide", "jarvis", "assistent", "spraak", "voice"],
    content:
      "Tide is de spraakgestuurde AI-assistent van Talkwave. Je kunt tegen " +
      "Tide praten of typen, en Tide koppelt met je agenda, met Magister en " +
      "kan het web en de website doorzoeken om je vragen te beantwoorden.",
  },
  {
    id: "contact",
    title: "Contact met Talkwave",
    url: "/#contact",
    keywords: ["contact", "email", "bereiken", "afspraak maken"],
    content:
      "Neem contact op met Talkwave via het contactformulier op de website " +
      "of via e-mail. We reageren doorgaans binnen één werkdag.",
  },
];
