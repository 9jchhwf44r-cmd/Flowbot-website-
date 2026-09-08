# Talkwave + Tide

Website voor Talkwave (Next.js/TypeScript/Tailwind) met **Tide**: een
spraakgestuurde AI-assistent ("Jarvis-stijl") die overal op de site
bereikbaar is via de knop rechtsonder, of direct op `/tide`.

## Starten

```bash
npm install
npm run dev
```

Open http://localhost:3000. Tide zelf staat op http://localhost:3000/tide.

Spraak (microfoon + gesproken antwoord) werkt via de browser's ingebouwde
Web Speech API — dat werkt zonder verdere configuratie in Chrome/Edge.
Typen kan altijd, in elke browser.

## Wat werkt er meteen, en wat moet je koppelen?

Tide's "brein" zit in `src/lib/tideBrain.ts` en herkent eerst een aantal
vaste commando's, voordat hij (optioneel) een AI-model aanroept voor alles
daarbuiten:

| Functie | Werkt standaard? | Instellen via |
| --- | --- | --- |
| Tijd/datum, uitleg wat Tide kan | Ja | — |
| Website doorzoeken | Ja | `src/data/siteContent.ts` bijwerken met echte teksten |
| Vrije AI-gesprekken | Nee | `ANTHROPIC_API_KEY` |
| Google Agenda | Nee | `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_CALENDAR_REFRESH_TOKEN` |
| Magister-rooster | Nee | `MAGISTER_ICS_URL` |
| Live internet doorzoeken | Nee | `BRAVE_SEARCH_API_KEY` |

Kopieer `.env.example` naar `.env.local` en vul in wat je hebt — elke
koppeling die je invult, schakelt Tide automatisch aan. In de UI zie je
rechtsboven op `/tide` welke koppelingen "gekoppeld" of "niet gekoppeld"
zijn.

### Over Magister

Magister heeft geen officiële publieke API voor derden. In plaats van
inloggegevens te scrapen (onbetrouwbaar en mogelijk in strijd met de
voorwaarden), gebruikt Tide de **officiële agenda-export** die Magister zelf
aanbiedt: log in op Magister → Agenda → Extern gebruik/Abonneren, en
kopieer de webcal/ICS-link naar `MAGISTER_ICS_URL`. Dezelfde koppeling werkt
trouwens voor élke andere ICS-agenda (Outlook, Apple Agenda, etc.).

### Over Google Agenda

Er zit nog geen "Verbind met Google"-inlogknop in — dat kan een goede
volgende stap zijn als dit eenmaal draait. Voor nu werkt het via een
eenmalig handmatig verkregen refresh token (stappen staan in
`.env.example`), zodat Tide zelf steeds een nieuw access token ophaalt.

## Architectuur

- `src/app/page.tsx` — landingpagina Talkwave
- `src/app/tide/page.tsx` — het volledige Tide-scherm (orb, spraak, chat)
- `src/hooks/useVoice.ts` — wrapper rond de browser Web Speech API
- `src/lib/tideBrain.ts` — intentherkenning + AI-fallback
- `src/lib/connectors/*` — één module per koppeling (agenda, Magister,
  websearch, sitesearch), elk met een `describe*()` die aangeeft of hij
  gekoppeld is
- `src/app/api/tide/chat` — praat met Tide's brein
- `src/app/api/tide/connectors` — status van alle koppelingen voor de UI

## Volgende stappen (suggesties)

- Echte site-inhoud in `src/data/siteContent.ts` zetten zodat "doorzoek de
  website" ook echt over Talkwave gaat.
- Een "Verbind met Google"-OAuth-flow toevoegen i.p.v. handmatig refresh
  token invullen.
- Een natuurlijkere stem koppelen (bv. ElevenLabs) in plaats van de
  browser-stem.
