"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";
import { useVoice } from "@/hooks/useVoice";
import { Scene3DViewer } from "@/components/Scene3DViewer";
import type { Scene3DData } from "@/lib/scene3d";

interface Message {
  role: "user" | "assistant";
  text: string;
  scene?: Scene3DData;
}

interface ConnectorInfo {
  id: string;
  label: string;
  status: "connected" | "not_configured" | "error";
  detail: string;
}

const QUICK_ACTIONS = [
  "Wat kun je?",
  "Hoe laat is het?",
  "Wat staat er in mijn agenda?",
  "Plan morgen 10:00 een call",
  "Maak een 3D-model van een raket",
];

const SCENE3D_TRIGGER = /\b3d[\s-]?model(len)?\b|\bin 3d\b|driedimensionaal/i;

function NodeLines({ className }: { className?: string }) {
  const nodes = [
    [10, 10],
    [70, 25],
    [30, 60],
    [90, 70],
    [55, 95],
  ];
  const edges = [
    [0, 1],
    [1, 2],
    [0, 2],
    [1, 3],
    [2, 4],
    [3, 4],
  ];
  return (
    <svg viewBox="0 0 100 100" className={className} preserveAspectRatio="none">
      {edges.map(([a, b], i) => (
        <line
          key={i}
          x1={nodes[a][0]}
          y1={nodes[a][1]}
          x2={nodes[b][0]}
          y2={nodes[b][1]}
          stroke="rgba(34,211,238,0.35)"
          strokeWidth="0.3"
        />
      ))}
      {nodes.map(([x, y], i) => (
        <circle
          key={i}
          cx={x}
          cy={y}
          r="1.4"
          fill="rgba(34,211,238,0.6)"
          className="hud-blip"
          style={{ animationDelay: `${i * 0.4}s` }}
        />
      ))}
    </svg>
  );
}

function HudCorners() {
  return (
    <>
      <span className="hud-corner hud-corner-tl" />
      <span className="hud-corner hud-corner-tr" />
      <span className="hud-corner hud-corner-bl" />
      <span className="hud-corner hud-corner-br" />
    </>
  );
}

function TickRing({ size }: { size: number }) {
  const r = size / 2;
  const ticks = Array.from({ length: 36 });
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="tide-orb-ring absolute inset-0"
    >
      {ticks.map((_, i) => {
        const angle = (i / ticks.length) * 360;
        const major = i % 3 === 0;
        return (
          <line
            key={i}
            x1={r}
            y1={major ? 4 : 9}
            x2={r}
            y2={16}
            stroke="rgba(34,211,238,0.55)"
            strokeWidth={major ? 2 : 1}
            transform={`rotate(${angle} ${r} ${r})`}
          />
        );
      })}
    </svg>
  );
}

function MicIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.6">
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0" strokeLinecap="round" />
      <path d="M12 18v3" strokeLinecap="round" />
      <path d="M8.5 21h7" strokeLinecap="round" />
    </svg>
  );
}

function ConnectorGauge({ c }: { c: ConnectorInfo }) {
  const ok = c.status === "connected";
  return (
    <div className="flex flex-col items-center gap-1" title={c.detail}>
      <svg width="30" height="30" viewBox="0 0 30 30">
        <circle cx="15" cy="15" r="12" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="2" />
        <circle
          cx="15"
          cy="15"
          r="12"
          fill="none"
          stroke={ok ? "#22d3ee" : "rgba(255,255,255,0.25)"}
          strokeWidth="2"
          strokeDasharray={ok ? "76 0" : "3 5"}
          strokeLinecap="round"
          transform="rotate(-90 15 15)"
          style={ok ? { filter: "drop-shadow(0 0 4px #22d3ee)" } : undefined}
        />
      </svg>
      <span className="hud-text text-[8px] leading-none text-white/50">{c.label}</span>
    </div>
  );
}

function formatUptime(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

export default function TidePage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      text: "Systeem online. Praat tegen me, of tik op NOOD voor tekstinvoer.",
    },
  ]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [connectors, setConnectors] = useState<ConnectorInfo[]>([]);
  const [manualOpen, setManualOpen] = useState(false);
  const [uptime, setUptime] = useState(0);
  const [lastLatencyMs, setLastLatencyMs] = useState<number | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const mountedAtRef = useRef<number | null>(null);

  const { supported, listening, speaking, transcript, startListening, stopListening, speak } =
    useVoice({
      onFinalResult: (text) => {
        if (text) handleSendMessage(text);
      },
    });

  useEffect(() => {
    mountedAtRef.current = Date.now();
    const id = setInterval(() => {
      setUptime(Math.floor((Date.now() - (mountedAtRef.current ?? Date.now())) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    fetch("/api/tide/connectors")
      .then((r) => r.json())
      .then((data) => setConnectors(data.connectors ?? []))
      .catch(() => setConnectors([]));
  }, []);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, thinking]);

  async function generate3DModel(prompt: string) {
    try {
      const res = await fetch("/api/tide/scene3d", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      if (!res.ok || !data.scene) {
        const reply = data.error || "Kon geen 3D-model maken van dat verzoek.";
        setMessages((prev) => [...prev, { role: "assistant", text: reply }]);
        speak(reply);
        return;
      }
      const reply = `Hier is een 3D-model van "${prompt}".`;
      setMessages((prev) => [...prev, { role: "assistant", text: reply, scene: data.scene }]);
      speak(reply);
    } catch {
      const reply = "Er ging iets mis bij het genereren van het 3D-model.";
      setMessages((prev) => [...prev, { role: "assistant", text: reply }]);
    }
  }

  async function handleSendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;

    const history = messages;
    setMessages((prev) => [...prev, { role: "user", text: trimmed }]);
    setInput("");
    setThinking(true);

    if (SCENE3D_TRIGGER.test(trimmed)) {
      await generate3DModel(trimmed);
      setThinking(false);
      return;
    }

    // eslint-disable-next-line react-hooks/purity -- only runs from event handlers, never during render
    const startedAt = Date.now();
    try {
      const res = await fetch("/api/tide/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: trimmed, history }),
      });
      // eslint-disable-next-line react-hooks/purity -- only runs from event handlers, never during render
      setLastLatencyMs(Date.now() - startedAt);
      const data = await res.json();
      const reply: string = data.reply || data.error || "Daar kwam geen antwoord op.";
      setMessages((prev) => [...prev, { role: "assistant", text: reply }]);
      speak(reply);
    } catch {
      const reply = "Er ging iets mis bij het verbinden met Tide's brein.";
      setMessages((prev) => [...prev, { role: "assistant", text: reply }]);
    } finally {
      setThinking(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    handleSendMessage(input);
  }

  async function handleLogout() {
    await fetch("/api/tide/auth", { method: "DELETE" });
    router.push("/tide/login");
    router.refresh();
  }

  const orbState = speaking ? "speaking" : listening ? "listening" : thinking ? "listening" : "idle";
  const statusText = speaking
    ? "TIDE SPREEKT"
    : listening
    ? "LUISTEREN..."
    : thinking
    ? "VERWERKEN..."
    : "STANDBY";

  return (
    <main className="tide-theme flex min-h-screen flex-col font-mono">
      <NodeLines className="pointer-events-none absolute left-0 top-0 h-40 w-40 opacity-60 sm:h-56 sm:w-56" />
      <NodeLines className="pointer-events-none absolute bottom-0 right-0 h-40 w-40 rotate-180 opacity-60 sm:h-56 sm:w-56" />

      <header className="flex items-center justify-between px-6 py-4">
        <Link
          href="/"
          className="hud-text text-[10px] text-white/40 transition hover:text-tide-accent"
        >
          ← terug
        </Link>
        <div className="hud-text hud-glow flex items-center gap-2 text-lg text-tide-accent">
          <span className="h-2 w-2 animate-pulse rounded-full bg-tide-accent" />
          <span className="hud-flicker">TIDE</span>
        </div>
        <button
          onClick={handleLogout}
          className="hud-text text-[10px] text-white/40 transition hover:text-white"
        >
          uitloggen
        </button>
      </header>

      <div className="relative mx-auto mb-2 flex gap-5 rounded border border-tide-accent/20 bg-black/20 px-5 py-2">
        <HudCorners />
        {connectors.map((c) => (
          <ConnectorGauge key={c.id} c={c} />
        ))}
      </div>

      <div className="hud-text mx-auto mb-6 flex gap-6 text-[9px] text-white/35">
        <span>
          UPTIME <span className="text-tide-accent/70">{formatUptime(uptime)}</span>
        </span>
        <span>
          LAT{" "}
          <span className="text-tide-accent/70">
            {lastLatencyMs === null ? "—" : `${lastLatencyMs}ms`}
          </span>
        </span>
      </div>

      <div className="flex flex-1 flex-col items-center px-6 pb-6">
        <div className="relative my-8 flex h-56 w-56 items-center justify-center sm:h-64 sm:w-64">
          <div className="tide-orb-ring-reverse absolute -inset-6 rounded-full border border-dotted border-tide-accent-2/25" />
          <div className="tide-radar-sweep absolute inset-5" />
          <TickRing size={224} />
          <div className="tide-orb-ring absolute inset-5 rounded-full border border-dashed border-tide-accent/25" />
          <div
            className={`h-32 w-32 rounded-full bg-gradient-to-br from-tide-accent to-tide-accent-2 shadow-[0_0_70px_rgba(34,211,238,0.5)] sm:h-40 sm:w-40 ${
              orbState === "listening"
                ? "tide-orb-listening"
                : orbState === "speaking"
                ? "tide-orb-speaking"
                : "tide-orb-idle"
            }`}
          />
        </div>

        <p className="hud-text hud-glow mb-2 h-5 text-xs text-tide-accent/80">{statusText}</p>
        {listening && transcript && (
          <p className="mb-4 max-w-xl text-center text-white/80 italic">“{transcript}”</p>
        )}

        <div
          ref={logRef}
          className="relative mb-6 flex w-full max-w-2xl flex-1 flex-col gap-3 overflow-y-auto border border-tide-accent/15 bg-black/25 p-4"
          style={{ maxHeight: "34vh" }}
        >
          <HudCorners />
          {messages.map((m, i) => (
            <div
              key={i}
              className={`max-w-[85%] rounded px-4 py-2 text-sm ${
                m.role === "user"
                  ? "ml-auto bg-tide-accent-2/20 text-tide-accent-2 border border-tide-accent-2/30"
                  : "border border-tide-accent/20 bg-white/5 text-white/90"
              } ${m.scene ? "w-full max-w-full" : ""}`}
            >
              {m.text.split("\n").map((line, j) => (
                <div key={j}>{line}</div>
              ))}
              {m.scene && (
                <div className="mt-2">
                  <Scene3DViewer scene={m.scene} />
                </div>
              )}
            </div>
          ))}
          {thinking && (
            <div className="max-w-[85%] rounded border border-tide-accent/20 bg-white/5 px-4 py-2 text-sm text-white/50">
              …
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={listening ? stopListening : startListening}
          disabled={!supported}
          title={supported ? "Praat tegen Tide" : "Spraakherkenning wordt niet ondersteund in deze browser"}
          className={`flex h-20 w-20 shrink-0 items-center justify-center rounded-full transition ${
            listening
              ? "bg-tide-accent text-tide-bg shadow-[0_0_40px_rgba(34,211,238,0.6)]"
              : "bg-white/10 text-white hover:bg-white/20"
          } disabled:opacity-30`}
        >
          <MicIcon className="h-8 w-8" />
        </button>
        {!supported && (
          <p className="mt-2 text-xs text-white/40">
            Spraak wordt in deze browser niet ondersteund — gebruik Chrome of Edge.
          </p>
        )}

        <button
          onClick={() => setManualOpen((v) => !v)}
          className="hud-text mt-6 rounded border border-white/15 px-3 py-1 text-[10px] text-white/40 transition hover:border-red-400/50 hover:text-red-300"
        >
          {manualOpen ? "sluit nood-invoer" : "nood: tekst"}
        </button>

        {manualOpen && (
          <div className="mt-4 flex w-full max-w-2xl flex-col items-center gap-3">
            <div className="flex flex-wrap justify-center gap-2">
              {QUICK_ACTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => handleSendMessage(q)}
                  className="rounded-full border border-white/15 px-3 py-1 text-xs text-white/70 transition hover:border-tide-accent hover:text-tide-accent"
                >
                  {q}
                </button>
              ))}
            </div>
            <form onSubmit={handleSubmit} className="flex w-full items-center gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Typ een bericht aan Tide..."
                className="h-11 flex-1 rounded-full bg-white/10 px-4 text-sm text-white placeholder-white/40 outline-none focus:ring-2 focus:ring-tide-accent"
              />
              <button
                type="submit"
                className="h-11 rounded-full bg-tide-accent px-5 text-sm font-semibold text-tide-bg transition hover:brightness-110"
              >
                Stuur
              </button>
            </form>
          </div>
        )}
      </div>
    </main>
  );
}
