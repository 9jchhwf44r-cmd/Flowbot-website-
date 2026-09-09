"use client";

import { useEffect, useRef } from "react";

type WaveMode = "idle" | "listening" | "speaking";

const BAR_COUNT = 28;

/**
 * Procedurele audio-waveform (geen echte signaalanalyse — puur visueel via
 * requestAnimationFrame) die reageert op de status van Tide. Bewust
 * losstaand van useVoice: geen extra microfoontoegang of afhankelijkheden,
 * dus geen risico voor de bestaande (fragiele, Safari-getest) spraakflow.
 */
export function VoiceWaveform({ mode }: { mode: WaveMode }) {
  const barsRef = useRef<(HTMLDivElement | null)[]>([]);
  const phaseRef = useRef(0);

  useEffect(() => {
    let raf: number;

    const tick = () => {
      phaseRef.current += mode === "idle" ? 0.02 : mode === "listening" ? 0.11 : 0.08;
      const bars = barsRef.current;
      for (let i = 0; i < bars.length; i++) {
        const bar = bars[i];
        if (!bar) continue;
        const wave = Math.sin(phaseRef.current + i * 0.45) * 0.5 + 0.5;
        const ripple = Math.sin(phaseRef.current * 2.3 + i * 0.9) * 0.5 + 0.5;
        const energy = mode === "idle" ? 0.12 : mode === "listening" ? 1 : 0.75;
        const heightPx = 5 + (wave * 0.6 + ripple * 0.4) * 32 * energy;
        bar.style.height = `${heightPx}px`;
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [mode]);

  const color =
    mode === "speaking"
      ? "bg-tide-accent-2"
      : mode === "listening"
      ? "bg-tide-accent"
      : "bg-tide-accent/35";

  return (
    <div className="flex h-9 items-center justify-center gap-[3px]" aria-hidden="true">
      {Array.from({ length: BAR_COUNT }).map((_, i) => (
        <div
          key={i}
          ref={(el) => {
            barsRef.current[i] = el;
          }}
          className={`w-[3px] rounded-full transition-colors duration-300 ${color}`}
          style={{ height: "5px" }}
        />
      ))}
    </div>
  );
}
