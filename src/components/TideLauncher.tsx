"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function TideLauncher() {
  const pathname = usePathname();
  if (pathname?.startsWith("/tide")) return null;

  return (
    <Link
      href="/tide"
      className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-full bg-tide-bg-2 px-5 py-3 text-white shadow-lg shadow-cyan-500/20 ring-1 ring-tide-accent/40 transition hover:scale-105 hover:ring-tide-accent"
      aria-label="Open Tide, de AI-assistent van Talkwave"
    >
      <span className="relative flex h-3 w-3">
        <span className="tide-orb-idle absolute inline-flex h-full w-full rounded-full bg-tide-accent opacity-75" />
        <span className="relative inline-flex h-3 w-3 rounded-full bg-tide-accent" />
      </span>
      <span className="text-sm font-medium">Praat met Tide</span>
    </Link>
  );
}
