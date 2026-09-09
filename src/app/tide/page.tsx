"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";
import { useVoice } from "@/hooks/useVoice";
import { DailyBriefing } from "@/components/DailyBriefing";
import { VoiceWaveform } from "@/components/VoiceWaveform";
import { TypewriterText } from "@/components/TypewriterText";
import { playListenStart, playListenEnd } from "@/lib/uiSound";
import type { Scene3DData } from "@/lib/scene3d";

// Three.js is alleen nodig zodra er echt een 3D-model getoond wordt — lazy
// laden houdt de eerste paint van het Tide-scherm lichter, vooral op mobiel.
const Scene3DViewer = dynamic(
  () => import("@/components/Scene3DViewer").then((m) => m.Scene3DViewer),
  {
    ssr: false,
    loading: () => (
      <div className="hud-text flex h-40 items-center justify-center text-[10px] text-white/40">
        3D-model laden...
      </div>
    ),
  }
);

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

const SCENE3D_TRIGGER =
  /\b3d[\s-]?(model(len)?|overzicht|weergave|plaatje|beeld|render|visualisatie|ontwerp|schets|impressie|scene|animatie)\b|\bin 3d\b|driedimensionaal/i;

const IDLE_PHRASES = [
  "STANDBY",
  "SYSTEMEN NOMINAAL",
  "WACHT OP INVOER",
  "ALLE KOPPELINGEN GECONTROLEERD",
];

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

function ConnectorCard({ c }: { c: ConnectorInfo }) {
  const ok = c.status === "connected";
  return (
    <div
      title={c.detail}
      className={`flex items-center gap-2 rounded-full border px-3 py-1.5 transition ${
        ok ? "border-tide-accent/40 bg-tide-accent/10" : "border-white/10 bg-white/5"
      }`}
    >
      <span
        className={`h-2 w-2 shrink-0 rounded-full ${
          ok ? "animate-pulse bg-tide-accent shadow-[0_0_6px_2px_rgba(34,211,238,0.7)]" : "bg-white/25"
        }`}
      />
      <span className="hud-text text-[9px] leading-none whitespace-nowrap text-white/70">
        {c.label}
      </span>
      <span
        className={`hud-text text-[8px] leading-none whitespace-nowrap ${
          ok ? "text-tide-accent/80" : "text-white/30"
        }`}
      >
        {ok ? "ONLINE" : "OFFLINE"}
      </span>
    </div>
  );
}

/** Kleine deeltjes die op verschillende radii/snelheden om de orb draaien. */
function OrbParticles() {
  const specs = [
    { inset: -2, duration: 9, size: 4, reverse: false, delay: 0 },
    { inset: 6, duration: 15, size: 3, reverse: true, delay: 1.2 },
    { inset: -12, duration: 21, size: 5, reverse: false, delay: 2.4 },
    { inset: 14, duration: 12, size: 3, reverse: true, delay: 0.6 },
  ];
  return (
    <>
      {specs.map((s, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            inset: s.inset,
            animation: `${s.reverse ? "tide-spin-reverse" : "tide-spin-slow"} ${s.duration}s linear infinite`,
            animationDelay: `${s.delay}s`,
          }}
        >
          <span
            className="absolute left-1/2 top-0 -translate-x-1/2 rounded-full bg-tide-accent-2"
            style={{
              width: s.size,
              height: s.size,
              boxShadow: "0 0 8px 2px rgba(99,102,241,0.75)",
            }}
          />
        </div>
      ))}
    </>
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
  const [showBriefing, setShowBriefing] = useState(true);
  const [uptime, setUptime] = useState(0);
  const [lastLatencyMs, setLastLatencyMs] = useState<number | null>(null);
  const [idlePhraseIndex, setIdlePhraseIndex] = useState(0);
  const logRef = useRef<HTMLDivElement>(null);
  const mountedAtRef = useRef<number | null>(null);
  const wasListeningRef = useRef(false);

  const {
    supported,
    listening,
    speaking,
    transcribing,
    transcript,
    startListening,
    stopListening,
    speak,
    primeSpeech,
  } = useVoice({
    onFinalResult: (text) => {
      if (text) handleSendMessage(text);
    },
    onError: (message) => {
      setMessages((prev) => [...prev, { role: "assistant", text: message }]);
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

  const isIdle = !speaking && !listening && !transcribing && !thinking;

  useEffect(() => {
    if (!isIdle) return;
    const id = setInterval(() => {
      setIdlePhraseIndex((i) => (i + 1) % IDLE_PHRASES.length);
    }, 4200);
    return () => clearInterval(id);
  }, [isIdle]);

  // Korte activatietonen op echte start/stop van het luisteren (ook als
  // native spraakherkenning zelf stopt, niet alleen bij een handmatige tik).
  useEffect(() => {
    if (listening && !wasListeningRef.current) playListenStart();
    if (!listening && wasListeningRef.current) playListenEnd();
    wasListeningRef.current = listening;
  }, [listening]);

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

    // Moet synchroon binnen de gebruikersactie blijven (tik/klik), anders
    // weigert Safari/iOS later geluid af te spelen voor het antwoord.
    primeSpeech();

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
    let res: Response;
    try {
      res = await fetch("/api/tide/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: trimmed, history }),
      });
    } catch {
      const reply =
        "Kon geen verbinding maken met Tide's server. Check je internetverbinding en probeer opnieuw.";
      setMessages((prev) => [...prev, { role: "assistant", text: reply }]);
      setThinking(false);
      return;
    }
    // eslint-disable-next-line react-hooks/purity -- only runs from event handlers, never during render
    setLastLatencyMs(Date.now() - startedAt);
    try {
      const data = await res.json();
      const reply: string = data.reply || data.error || "Daar kwam geen antwoord op.";
      setMessages((prev) => [...prev, { role: "assistant", text: reply }]);
      speak(reply);
    } catch {
      const reply = res.ok
        ? "Tide's antwoord kon niet worden gelezen. Probeer het nog eens."
        : `Tide's server gaf een fout (${res.status}). Het duurde mogelijk te lang — probeer het nog eens.`;
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

  const orbState = speaking
    ? "speaking"
    : listening || transcribing || thinking
    ? "listening"
    : "idle";
  const statusText = speaking
    ? "TIDE SPREEKT"
    : transcribing
    ? "AUDIO HERKENNEN..."
    : listening
    ? "LUISTEREN..."
    : thinking
    ? "VERWERKEN..."
    : IDLE_PHRASES[idlePhraseIndex];

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

      <div className="mx-auto mb-2 flex max-w-md flex-wrap justify-center gap-2 px-4">
        {connectors.map((c) => (
          <ConnectorCard key={c.id} c={c} />
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

      {showBriefing ? (
        <DailyBriefing onDismiss={() => setShowBriefing(false)} />
      ) : (
      <div className="flex flex-1 flex-col items-center px-6 pb-6">
        <div className="relative my-8 flex h-56 w-56 items-center justify-center sm:h-64 sm:w-64">
          <div className="tide-orb-ring-reverse absolute -inset-6 rounded-full border border-dotted border-tide-accent-2/25" />
          <OrbParticles />
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

        <div className="relative mb-4 flex w-full max-w-xl items-center gap-4 rounded-full border border-tide-accent/25 bg-black/40 px-4 py-3 shadow-[0_0_50px_rgba(34,211,238,0.18)] backdrop-blur-sm">
          <button
            type="button"
            onClick={listening ? stopListening : startListening}
            disabled={!supported || transcribing}
            title={supported ? "Praat tegen Tide" : "Microfoon niet beschikbaar in deze browser"}
            className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full transition ${
              listening
                ? "bg-tide-accent text-tide-bg shadow-[0_0_30px_rgba(34,211,238,0.7)]"
                : "bg-white/10 text-white hover:bg-white/20"
            } disabled:opacity-30`}
          >
            <MicIcon className="h-6 w-6" />
          </button>

          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex items-center justify-between gap-2">
              <span className="hud-text hud-glow whitespace-nowrap text-[10px] text-tide-accent/90 sm:text-[11px]">
                PRAAT MET TIDE
              </span>
              <span className="hud-text truncate text-[9px] text-white/45">{statusText}</span>
            </div>
            <VoiceWaveform mode={orbState} />
          </div>
        </div>

        {listening && transcript && (
          <p className="mb-4 max-w-xl text-center text-white/80 italic">“{transcript}”</p>
        )}
        {!supported && (
          <p className="mb-4 text-xs text-white/40">
            Microfoon niet beschikbaar in deze browser — typ je vraag via &quot;nood: tekst&quot;.
          </p>
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
              {m.role === "assistant" ? (
                <TypewriterText text={m.text} />
              ) : (
                m.text.split("\n").map((line, j) => <div key={j}>{line}</div>)
              )}
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
      )}
    </main>
  );
}
