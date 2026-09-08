"use client";

import { useEffect, useState } from "react";

interface CalendarEventDTO {
  title: string;
  start: string;
  location?: string;
}

interface NewsItem {
  title: string;
  link: string;
}

interface CryptoSnapshot {
  priceEur: number;
  changePct24h: number;
  sparkline: number[];
}

interface BriefingData {
  summary: string;
  agenda: CalendarEventDTO[];
  news: NewsItem[];
  crypto: CryptoSnapshot | null;
  agendaConnected: boolean;
}

function Sparkline({ data, positive }: { data: number[]; positive: boolean }) {
  if (data.length < 2) return null;
  const w = 320;
  const h = 64;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / range) * (h - 6) - 3;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const color = positive ? "#34d399" : "#f87171";

  return (
    <div className="hud-reveal overflow-hidden">
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="max-w-full">
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 4px ${color})` }}
        />
      </svg>
    </div>
  );
}

const timeFormatter = new Intl.DateTimeFormat("nl-NL", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Amsterdam",
});

export function DailyBriefing({ onDismiss }: { onDismiss: () => void }) {
  const [data, setData] = useState<BriefingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/tide/briefing")
      .then((r) => r.json())
      .then((json) => {
        if (!cancelled) setData(json);
      })
      .catch(() => {
        if (!cancelled) setError("Kon de dagupdate niet ophalen.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const positive = (data?.crypto?.changePct24h ?? 0) >= 0;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center px-2 pb-8">
      <div className="relative w-full border border-tide-accent/20 bg-black/25 p-5">
        <span className="hud-corner hud-corner-tl" />
        <span className="hud-corner hud-corner-tr" />
        <span className="hud-corner hud-corner-bl" />
        <span className="hud-corner hud-corner-br" />

        <div className="mb-4 flex items-center justify-between">
          <h2 className="hud-text hud-glow text-sm text-tide-accent">Dagelijkse briefing</h2>
          <button
            onClick={onDismiss}
            className="hud-text text-[10px] text-white/40 transition hover:text-white"
          >
            ga verder →
          </button>
        </div>

        {loading && <p className="text-sm text-white/50">Briefing wordt opgehaald…</p>}
        {error && <p className="text-sm text-red-400">{error}</p>}

        {data && (
          <div className="flex flex-col gap-5">
            <p className="text-sm leading-relaxed text-white/90">{data.summary}</p>

            <div>
              <h3 className="hud-text mb-2 text-[10px] text-white/40">Agenda vandaag</h3>
              {data.agendaConnected ? (
                data.agenda.length ? (
                  <ul className="flex flex-col gap-1 text-sm text-white/80">
                    {data.agenda.map((e, i) => (
                      <li key={i}>
                        <span className="text-tide-accent/80">
                          {timeFormatter.format(new Date(e.start))}
                        </span>{" "}
                        — {e.title}
                        {e.location ? ` (${e.location})` : ""}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-white/40">Geen afspraken vandaag.</p>
                )
              ) : (
                <p className="text-sm text-white/40">
                  Agenda niet gekoppeld — voeg Google Agenda-credentials toe voor dit onderdeel.
                </p>
              )}
            </div>

            {data.news.length > 0 && (
              <div>
                <h3 className="hud-text mb-2 text-[10px] text-white/40">Wereldnieuws</h3>
                <div className="overflow-hidden whitespace-nowrap border-y border-tide-accent/10 py-2">
                  <div className="hud-marquee inline-flex gap-10 text-sm text-white/70">
                    {[...data.news, ...data.news].map((n, i) => (
                      <a
                        key={i}
                        href={n.link}
                        target="_blank"
                        rel="noreferrer"
                        className="transition hover:text-tide-accent"
                      >
                        {n.title}
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {data.crypto && (
              <div>
                <h3 className="hud-text mb-2 text-[10px] text-white/40">Markt — Bitcoin</h3>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-semibold text-white">
                    €{Math.round(data.crypto.priceEur).toLocaleString("nl-NL")}
                  </span>
                  <span className={positive ? "text-emerald-400" : "text-red-400"}>
                    {positive ? "▲" : "▼"} {Math.abs(data.crypto.changePct24h).toFixed(1)}% (24u)
                  </span>
                </div>
                <Sparkline data={data.crypto.sparkline} positive={positive} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
