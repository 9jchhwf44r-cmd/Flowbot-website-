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
            Talkwave
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-white/70">
            Deze pagina is een placeholder — de echte inhoud volgt nog.
          </p>
        </div>
      </section>

      <section id="contact" className="bg-slate-50 px-6 py-20">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-2xl font-bold text-tide-bg">Contact</h2>
          <p className="mt-3 text-slate-600">
            Neem contact op via{" "}
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
