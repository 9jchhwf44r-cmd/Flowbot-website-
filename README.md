# Talkwave + Tide

Dit project bevat twee losse dingen in dezelfde codebase:

1. **De Talkwave-website** (`src/app/page.tsx`) — de openbare marketingsite.
   Nu nog een placeholder; de echte inhoud volgt apart.
2. **Tide** (`/tide`) — jouw persoonlijke, spraakgestuurde AI-assistent
   ("Jarvis-stijl"). Dit is **geen product dat aan bezoekers wordt
   aangeboden** — er zit bewust geen link naar vanaf de openbare pagina's,
   en de route zelf zit achter een wachtwoord.

## Starten

```bash
npm install
cp .env.example .env.local   # vul in wat je hebt, zie hieronder
npm run dev
```

Open http://localhost:3000 voor de (placeholder-)website, en
http://localhost:3000/tide voor Tide — je krijgt eerst een
wachtwoordscherm.

## Tide bereiken en beveiligen

- **`TIDE_PASSWORD`** is verplicht. Zonder deze env-variabele is `/tide`
  voor niemand bereikbaar (fail closed) — er wordt dus nooit per ongeluk
  een onbeveiligde versie live gezet.
- Na inloggen zet de browser een cookie (30 dagen geldig); "Uitloggen" op
  het Tide-scherm verwijdert die weer.
- Er is bewust geen knop of link naar `/tide` op de openbare site. Bewaar
  de URL zelf (bookmark 'm).

## Wat werkt er meteen, en wat moet je koppelen?

Tide's "brein" zit in `src/lib/tideBrain.ts` en herkent eerst een aantal
vaste commando's, voordat hij (optioneel) een AI-model aanroept voor alles
daarbuiten:

| Functie | Werkt standaard? | Instellen via |
| --- | --- | --- |
| Tijd/datum, uitleg wat Tide kan | Ja | — |
| Eigen kennisbank doorzoeken | Ja | `src/data/siteContent.ts` |
| Vrije AI-gesprekken | Nee | `GEMINI_API_KEY` (gratis, zie .env.example) |
| Agenda voorlezen | Nee | `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_CALENDAR_REFRESH_TOKEN` |
| Zelf afspraken inplannen ("plan morgen 14:00 een call") | Nee | dezelfde Google-koppeling, met schrijfrechten (zie hieronder) |
| Magister-rooster | Nee | `MAGISTER_ICS_URL` |
| Live internet doorzoeken | Nee | `BRAVE_SEARCH_API_KEY` |
| 3D-modellen genereren en tonen ("maak een 3D-model van...") | Nee | dezelfde `GEMINI_API_KEY` |
| Dagelijkse briefing bij het opstarten (agenda, nieuws, Bitcoin-koers) | Gedeeltelijk | nieuws + koers werken direct (geen key nodig); agenda-onderdeel vereist Google-koppeling |

Kopieer `.env.example` naar `.env.local` en vul in wat je hebt — elke
koppeling die je invult, schakelt Tide automatisch aan. In de UI zie je
rechtsboven op `/tide` welke koppelingen "gekoppeld" of "niet gekoppeld"
zijn.

### Zelf afspraken laten inplannen

Zeg of typ bijvoorbeeld: *"plan morgen 14:00 een call met Jan"* of *"zet
vrijdag 9u tandarts in mijn agenda"*. Tide herkent vandaag/morgen/
overmorgen, weekdagnamen en tijden als `14:00`, `14u` of `14 uur`, en zet
de afspraak (standaard 1 uur) in je Google Agenda.

Dit vereist dat je Google OAuth-client de volledige `calendar`-scope heeft
(niet `calendar.readonly`) — zie `.env.example` voor de exacte stappen.

### 3D-modellen genereren

Zeg of typ bijvoorbeeld: *"maak een 3D-model van een raket"*. Tide vraagt
Gemini om een scene te bedenken (opgebouwd uit simpele 3D-vormen: kubussen,
bollen, cilinders, kegels, ringen — geen losse betaalde 3D-generatiedienst
nodig), en rendert die direct als een draaibaar model met Three.js, in
dezelfde HUD-stijl. Sleep met de muis om te draaien.

Gemini's antwoord wordt altijd gesaniteerd voordat het gerenderd wordt
(`src/lib/scene3d.ts`): alleen getallen, kleuren en een vaste lijst
toegestane vormen worden gelezen, er wordt nooit code uitgevoerd.

### Dagelijkse briefing

Bij het openen van `/tide` verschijnt eerst een "dagelijkse briefing":
een door Gemini geschreven samenvatting, je agenda van vandaag (als
gekoppeld), een scrollende ticker met wereldnieuws (live via de publieke
NOS-RSS-feed, `src/lib/connectors/news.ts`), en de actuele Bitcoin-koers met
een animerende koersgrafiek (live via de publieke CoinGecko-API,
`src/lib/connectors/crypto.ts`). Beide laatste werken direct, zonder
API-key — klik op "ga verder" om naar het normale Tide-scherm te gaan.

### Over Magister

Magister heeft geen officiële publieke API voor derden. In plaats van
inloggegevens te scrapen (onbetrouwbaar en mogelijk in strijd met de
voorwaarden), gebruikt Tide de **officiële agenda-export** die Magister zelf
aanbiedt: log in op Magister → Agenda → Extern gebruik/Abonneren, en
kopieer de webcal/ICS-link naar `MAGISTER_ICS_URL`. Dezelfde koppeling werkt
trouwens voor élke andere ICS-agenda (Outlook, Apple Agenda, etc).

## Architectuur

- `src/app/page.tsx` — placeholder-homepage voor talkwave.nl
- `src/app/tide/page.tsx` — het volledige Tide-scherm (orb, spraak, chat)
- `src/app/tide/login/page.tsx` — wachtwoordscherm
- `src/middleware.ts` — beschermt `/tide/*` en `/api/tide/*`
- `src/lib/tideAuth.ts` — sessie-cookie op basis van `TIDE_PASSWORD`
- `src/hooks/useVoice.ts` — wrapper rond de browser Web Speech API
- `src/lib/tideBrain.ts` — intentherkenning + AI-fallback
- `src/lib/dutchSchedule.ts` — parser voor "plan ... afspraken"-zinnen
- `src/lib/connectors/*` — één module per koppeling (agenda, Magister,
  websearch, kennisbank), elk met een `describe*()` die aangeeft of hij
  gekoppeld is
- `src/app/api/tide/chat` — praat met Tide's brein
- `src/app/api/tide/connectors` — status van alle koppelingen voor de UI
- `src/app/api/tide/auth` — login/logout

## Volgende stappen (suggesties)

- Een "Verbind met Google"-OAuth-flow toevoegen i.p.v. handmatig refresh
  token invullen.
- Een natuurlijkere stem koppelen (bv. ElevenLabs) in plaats van de
  browser-stem.
- Eigen aantekeningen/notities toevoegen aan `src/data/siteContent.ts` zodat
  Tide's kennisbank groeit.
