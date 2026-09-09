"use client";

import { useRef } from "react";

export function CursorSpotlight({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--spot-x", `${e.clientX - rect.left}px`);
    el.style.setProperty("--spot-y", `${e.clientY - rect.top}px`);
  }

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      className={`absolute inset-0 opacity-0 transition-opacity duration-300 hover:opacity-100 ${className}`}
      style={{
        background:
          "radial-gradient(320px circle at var(--spot-x, 50%) var(--spot-y, 50%), rgba(34,211,238,0.15), transparent 70%)",
      }}
    />
  );
}
