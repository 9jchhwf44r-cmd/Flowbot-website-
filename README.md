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
| Vrije AI-gesprekken | Nee | `GROQ_API_KEY` (aanbevolen, ruim gratis quotum) of `GEMINI_API_KEY` |
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

### Groq (aanbevolen) + Gemini-terugval

Gemini's gratis tier staat maar een klein aantal aanvragen per dag toe (op
het moment van schrijven: 20/dag voor `gemini-3.6-flash`), **gedeeld** over
alle Gemini-functies samen. Daarom probeert Tide voor vrije gesprekken en
spraak-naar-tekst eerst **Groq** (`console.groq.com`, ook gratis, geen
creditcard, veel ruimer quotum en erg snel) en valt pas op Gemini terug als
Groq niet is ingesteld of zelf een keer vastloopt. Zet dus bij voorkeur
zowel `GROQ_API_KEY` als `GEMINI_API_KEY` — dan heeft Tide altijd een
werkende AI-motor.

3D-modellen en de dagelijkse briefing gebruiken nog altijd Gemini (die
laatste wordt 20 minuten gecachet om onnodig verbruik tegen te gaan). Bij
een bereikte limiet geeft Tide een duidelijke Nederlandse melding in plaats
van een cryptische foutcode.

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

## TalkWave Client OS (`/clientos.html`)

Een intern beheerpaneel voor Talkwave's eigen klanten (niet te verwarren met
Tide zelf): klanten aanmaken, per klant een AI-chat/website-generator/
social-media-simulator/leadopvolging beheren. Zit achter **dezelfde
wachtwoordbeveiliging als Tide** (`src/proxy.ts`) en is bewust nergens
publiek gelinkt.

- `public/clientos.html` — de volledige app (vanilla HTML/JS, geen React)
- `src/app/api/clientos/store` — kleine key-value-opslag via **Netlify
  Blobs** (gratis, werkt automatisch op Netlify; lokaal met `next dev`
  zonder Netlify-context valt dit terug op een niet-persistente
  in-memory store, alleen voor lokaal testen)
- `src/app/api/clientos/ai` — vertaalt de Anthropic-vormige aanroepen uit
  `clientos.html` naar Groq (dezelfde `GROQ_API_KEY`/`GROQ_MODEL` als Tide)
  en geeft een Anthropic-vormig antwoord terug, inclusief tool-calling
  (voor de reserverings-tool)
- `src/app/api/clientos/analyze` — vervangt de "Analyseer website"-functie:
  Groq heeft geen ingebouwde websearch-tool zoals Claude, dus deze route
  haalt de opgegeven pagina zelf op en laat Groq die tekst analyseren
  (geen bredere webzoekopdracht of externe reviews)

## Architectuur

- `src/app/page.tsx` — marketingpagina voor talkwave.nl
- `src/app/tide/page.tsx` — het volledige Tide-scherm (orb, spraak, chat)
- `src/app/tide/login/page.tsx` — wachtwoordscherm
- `src/proxy.ts` — beschermt `/tide/*` en `/api/tide/*` (Next.js' proxy-conventie,
  vroeger "middleware" genoemd)
- `src/lib/tideAuth.ts` — sessie-cookie op basis van `TIDE_PASSWORD`
- `src/hooks/useVoice.ts` — wrapper rond de browser Web Speech API, met een
  opname+transcriptie-fallback (via Gemini) voor browsers zonder ingebouwde
  spraakherkenning, zoals Safari/iOS
- `src/lib/tideBrain.ts` — intentherkenning + AI-fallback (Groq eerst, Gemini als terugval)
- `src/lib/groq.ts` — chat + Whisper-transcriptie via Groq
- `src/lib/dutchSchedule.ts` — parser voor "plan ... afspraken"-zinnen
- `src/lib/scene3d.ts` + `src/components/Scene3DViewer.tsx` — 3D-modellen
  genereren (gesaniteerde JSON-scene) en renderen (Three.js)
- `src/lib/connectors/*` — één module per koppeling (agenda, Magister,
  websearch, kennisbank, nieuws, koers), elk met een `describe*()` die
  aangeeft of hij gekoppeld is
- `src/app/api/tide/chat` — praat met Tide's brein
- `src/app/api/tide/connectors` — status van alle koppelingen voor de UI
- `src/app/api/tide/auth` — login/logout
- `src/app/api/tide/transcribe` — audio-opname → tekst (Gemini)
- `src/app/api/tide/scene3d` — 3D-scene genereren (Gemini)
- `src/app/api/tide/briefing` — dagelijkse briefing (gecachet, zie hierboven)

## Volgende stappen (suggesties)

- Een "Verbind met Google"-OAuth-flow toevoegen i.p.v. handmatig refresh
  token invullen.
- Een natuurlijkere stem koppelen (bv. ElevenLabs) in plaats van de
  browser-stem.
- Eigen aantekeningen/notities toevoegen aan `src/data/siteContent.ts` zodat
  Tide's kennisbank groeit.
