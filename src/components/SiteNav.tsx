import Link from "next/link";

export function SiteNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-tide-bg/70 backdrop-blur-md">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold text-white">
          <span className="hue-cycle h-2 w-2 rounded-full bg-tide-accent shadow-[0_0_10px_rgba(34,211,238,0.8)]" />
          Talkwave
        </Link>
        <div className="hidden items-center gap-8 text-sm text-white/60 sm:flex">
          <a href="#diensten" className="transition hover:text-white">
            Diensten
          </a>
          <a href="#werkwijze" className="transition hover:text-white">
            Werkwijze
          </a>
          <a href="#contact" className="transition hover:text-white">
            Contact
          </a>
        </div>
        <Link
          href="/tide/login"
          className="rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-white/80 transition hover:border-tide-accent hover:text-tide-accent"
        >
          Login
        </Link>
      </nav>
    </header>
  );
}
