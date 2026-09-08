import Link from "next/link";

const features = [
  {
    title: "Spraakgestuurd",
    description:
      "Praat gewoon tegen Tide zoals je tegen een assistent zou praten — geen knoppen zoeken, direct antwoord.",
  },
  {
    title: "Kent je agenda",
    description:
      "Koppel je Google Agenda zodat Tide je afspraken kent en ze op verzoek voorleest.",
  },
  {
    title: "Kent je rooster",
    description:
      "Koppel je Magister-rooster via de officiële agenda-export, zodat Tide ook je schoolplanning kent.",
  },
  {
    title: "Doorzoekt de website",
    description:
      "Vraag Tide iets over Talkwave en hij zoekt het antwoord meteen op in de inhoud van deze website.",
  },
];

export default function Home() {
  return (
    <main className="flex-1">
      <section className="relative overflow-hidden bg-tide-bg px-6 py-28 text-white">
        <div
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            background:
              "radial-gradient(60% 50% at 50% 0%, var(--tide-bg-2) 0%, transparent 70%)",
          }}
        />
        <div className="relative mx-auto flex max-w-4xl flex-col items-center text-center">
          <span className="mb-4 rounded-full border border-tide-accent/40 px-4 py-1 text-xs uppercase tracking-widest text-tide-accent">
            Talkwave
          </span>
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
            Maak kennis met <span className="text-tide-accent">Tide</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-white/70">
            Jouw eigen spraakgestuurde AI-assistent, gebouwd door Talkwave.
            Praat ertegen zoals tegen Jarvis: vraag naar je agenda, je rooster,
            of laat hem de website voor je doorzoeken.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/tide"
              className="rounded-full bg-tide-accent px-8 py-3 font-semibold text-tide-bg transition hover:brightness-110"
            >
              Praat met Tide
            </Link>
            <a
              href="#features"
              className="rounded-full border border-white/20 px-8 py-3 font-semibold text-white/80 transition hover:border-white/40 hover:text-white"
            >
              Ontdek wat hij kan
            </a>
          </div>
        </div>
      </section>

      <section id="features" className="bg-white px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-3xl font-bold text-tide-bg">
            Wat Tide voor je doet
          </h2>
          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-black/5 bg-slate-50 p-6 shadow-sm"
              >
                <h3 className="text-lg font-semibold text-tide-bg">{f.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="contact" className="bg-slate-50 px-6 py-20">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-2xl font-bold text-tide-bg">Contact</h2>
          <p className="mt-3 text-slate-600">
            Vragen over Talkwave of Tide? Neem contact op via{" "}
            <a
              href="mailto:hallo@talkwave.nl"
              className="font-medium text-tide-accent-2 underline"
            >
              hallo@talkwave.nl
            </a>
            .
          </p>
        </div>
      </section>
    </main>
  );
}
