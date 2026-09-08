import { SiteNav } from "@/components/SiteNav";
import { Reveal } from "@/components/Reveal";

// Placeholder-copy — vervang met de echte Talkwave-teksten zodra die klaar zijn.
const FEATURES = [
  {
    title: "AI-assistenten",
    description: "Persoonlijke, spraakgestuurde assistenten die met je systemen meedenken en taken uit handen nemen.",
  },
  {
    title: "Automatisering",
    description: "Terugkerend werk verdwijnt naar de achtergrond, zodat er tijd overblijft voor het echte werk.",
  },
  {
    title: "Integraties",
    description: "Koppelingen met agenda's, data en bestaande tools — alles blijft met elkaar in gesprek.",
  },
  {
    title: "Realtime inzicht",
    description: "Actuele informatie, altijd binnen handbereik, in plaats van verspreid over tien schermen.",
  },
];

const STEPS = [
  { title: "Intake", description: "We brengen in kaart wat er nu tijd kost en waar automatisering het snelst helpt." },
  { title: "Bouw", description: "Een werkend systeem, op maat gebouwd — geen dichtgetimmerde standaardoplossing." },
  { title: "Lancering", description: "Live, getest, en met ruimte om mee te groeien met wat je nodig hebt." },
];

const TAGS = [
  "24/7 beschikbaar",
  "Nederlandstalig",
  "Privacy-vriendelijk",
  "Schaalbaar",
  "Realtime",
  "Persoonlijk afgestemd",
];

const PARTICLES = [
  { left: "8%", size: 5, delay: "0s", duration: "6.5s" },
  { left: "18%", size: 3, delay: "1.2s", duration: "8s" },
  { left: "27%", size: 6, delay: "2.4s", duration: "7s" },
  { left: "39%", size: 4, delay: "0.6s", duration: "9s" },
  { left: "52%", size: 3, delay: "3s", duration: "6s" },
  { left: "64%", size: 5, delay: "1.8s", duration: "7.5s" },
  { left: "73%", size: 4, delay: "0.3s", duration: "8.5s" },
  { left: "85%", size: 6, delay: "2.1s", duration: "6.8s" },
  { left: "93%", size: 3, delay: "3.6s", duration: "9.5s" },
];

export default function Home() {
  return (
    <main className="site-dark flex-1">
      <SiteNav />

      {/* Hero */}
      <section className="relative overflow-hidden px-6 pb-28 pt-24 sm:pt-32">
        <div className="blob blob-a absolute left-[-10%] top-[-10%] h-[420px] w-[420px] bg-tide-accent/40" />
        <div className="blob blob-b absolute right-[-15%] top-[10%] h-[480px] w-[480px] bg-tide-accent-2/40" />
        <div className="blob blob-c absolute bottom-[-20%] left-[30%] h-[380px] w-[380px] bg-tide-accent-3/25" />

        {PARTICLES.map((p, i) => (
          <span
            key={i}
            className="particle absolute bottom-0 text-tide-accent"
            style={{
              left: p.left,
              width: p.size,
              height: p.size,
              animationDelay: `${p.delay}, 0s`,
              animationDuration: `${p.duration}, 5s`,
            }}
          />
        ))}

        <div className="relative mx-auto flex max-w-4xl flex-col items-center text-center">
          <span className="hue-cycle mb-6 rounded-full border border-tide-accent/50 bg-white/5 px-4 py-1 text-xs uppercase tracking-widest text-tide-accent">
            Talkwave
          </span>
          <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-6xl">
            Slimme <span className="gradient-text">AI-assistenten</span>
            <br />
            voor jouw bedrijf
          </h1>
          <p className="mt-6 max-w-xl text-lg text-white/60">
            Talkwave bouwt AI die met je meedenkt: spraakgestuurde assistenten,
            automatisering en integraties die dagelijks werk lichter maken.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <a
              href="#contact"
              className="btn-glow rounded-full bg-tide-accent px-8 py-3 font-semibold text-tide-bg transition hover:scale-105 hover:brightness-110"
            >
              Neem contact op
            </a>
            <a
              href="#diensten"
              className="rounded-full border border-white/15 px-8 py-3 font-semibold text-white/80 transition hover:scale-105 hover:border-white/40 hover:text-white"
            >
              Bekijk wat we doen
            </a>
          </div>
        </div>
      </section>

      {/* Ticker */}
      <div className="relative overflow-hidden border-y border-white/10 bg-white/[0.02] py-4">
        <div className="hud-marquee inline-flex gap-12 whitespace-nowrap text-sm uppercase tracking-widest text-white/40">
          {[...TAGS, ...TAGS].map((tag, i) => (
            <span key={i} className="flex items-center gap-3">
              <span className="hue-cycle h-1.5 w-1.5 rounded-full bg-tide-accent" />
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Features */}
      <section id="diensten" className="px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <Reveal>
            <h2 className="text-center text-3xl font-bold sm:text-4xl">Wat we bouwen</h2>
          </Reveal>
          <div className="mt-14 grid gap-6 sm:grid-cols-2">
            {FEATURES.map((f, i) => (
              <Reveal key={f.title} delay={i * 100}>
                <div className="glass-card h-full rounded-2xl p-6">
                  <div className="icon-spin mb-4 flex h-10 w-10 items-center justify-center rounded-full border border-tide-accent/30 text-tide-accent">
                    {i + 1}
                  </div>
                  <h3 className="text-lg font-semibold text-white">{f.title}</h3>
                  <p className="mt-2 text-sm text-white/60">{f.description}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Werkwijze */}
      <section id="werkwijze" className="relative px-6 py-24">
        <div className="mx-auto max-w-4xl">
          <Reveal>
            <h2 className="text-center text-3xl font-bold sm:text-4xl">Hoe het werkt</h2>
          </Reveal>
          <div className="mt-16 grid gap-10 sm:grid-cols-3">
            {STEPS.map((s, i) => (
              <Reveal key={s.title} delay={i * 120} className="relative text-center">
                <div className="relative mx-auto mb-4 flex h-14 w-14 items-center justify-center">
                  <div className="pulse-ring absolute inset-0 rounded-full" />
                  <div className="hue-cycle flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-tide-accent to-tide-accent-2 font-semibold text-tide-bg">
                    {i + 1}
                  </div>
                </div>
                <h3 className="font-semibold text-white">{s.title}</h3>
                <p className="mt-2 text-sm text-white/60">{s.description}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA / contact */}
      <section id="contact" className="px-6 py-24">
        <Reveal className="mx-auto max-w-3xl">
          <div className="glass-card relative overflow-hidden rounded-3xl px-8 py-16 text-center">
            <div className="blob blob-a absolute left-1/2 top-1/2 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 bg-tide-accent/20" />
            <div className="relative">
              <h2 className="text-2xl font-bold text-white sm:text-3xl">Klaar om te starten?</h2>
              <p className="mx-auto mt-3 max-w-md text-white/60">
                Neem contact op en we denken met je mee over waar AI het snelst
                verschil maakt.
              </p>
              <a
                href="mailto:hallo@talkwave.nl"
                className="btn-glow mt-8 inline-block rounded-full bg-tide-accent px-8 py-3 font-semibold text-tide-bg transition hover:scale-105 hover:brightness-110"
              >
                hallo@talkwave.nl
              </a>
            </div>
          </div>
        </Reveal>
      </section>

      <footer className="border-t border-white/10 px-6 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-sm text-white/40 sm:flex-row">
          <span>© {new Date().getFullYear()} Talkwave</span>
          <div className="flex gap-6">
            <a href="#diensten" className="hover:text-white">Diensten</a>
            <a href="#werkwijze" className="hover:text-white">Werkwijze</a>
            <a href="#contact" className="hover:text-white">Contact</a>
          </div>
        </div>
      </footer>
    </main>
  );
}
