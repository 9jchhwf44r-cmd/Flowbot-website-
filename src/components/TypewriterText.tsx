"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Laat tekst geleidelijk "intypen" (tijdsgebaseerd, niet per interval-tick,
 * zodat lange en korte antwoorden allebei binnen een vaste, prettige duur
 * verschijnen). Typt maar één keer per gemonteerde instantie — als het
 * bericht al eerder volledig getypt is (bv. na een re-render), verschijnt
 * de tekst direct.
 */
export function TypewriterText({ text }: { text: string }) {
  const [shown, setShown] = useState("");
  const doneRef = useRef(false);

  useEffect(() => {
    if (doneRef.current) {
      setShown(text);
      return;
    }

    const totalMs = Math.min(1400, Math.max(280, text.length * 12));
    const start = performance.now();
    let raf: number;

    const tick = (now: number) => {
      const ratio = Math.min(1, (now - start) / totalMs);
      setShown(text.slice(0, Math.floor(text.length * ratio)));
      if (ratio < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        doneRef.current = true;
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [text]);

  return (
    <>
      {shown.split("\n").map((line, j) => (
        <div key={j}>{line}</div>
      ))}
    </>
  );
}
