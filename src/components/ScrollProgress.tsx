"use client";

import { useEffect, useState } from "react";

export function ScrollProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    function handleScroll() {
      const scrollTop = window.scrollY;
      const height = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(height > 0 ? Math.min(100, (scrollTop / height) * 100) : 0);
    }
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="fixed left-0 top-0 z-[60] h-[3px] w-full bg-transparent">
      <div
        className="h-full bg-gradient-to-r from-tide-accent via-tide-accent-2 to-tide-accent-3 transition-[width] duration-150 ease-out"
        style={{ width: `${progress}%`, boxShadow: "0 0 8px rgba(34,211,238,0.7)" }}
      />
    </div>
  );
}
