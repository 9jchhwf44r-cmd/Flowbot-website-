"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";
import { useVoice } from "@/hooks/useVoice";

interface Message {
  role: "user" | "assistant";
  text: string;
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
];

export default function TidePage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      text: "Hoi, ik ben Tide. Praat tegen me of typ hieronder — vraag me bijvoorbeeld wat ik allemaal kan.",
    },
  ]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [connectors, setConnectors] = useState<ConnectorInfo[]>([]);
  const logRef = useRef<HTMLDivElement>(null);

  const { supported, listening, speaking, transcript, startListening, stopListening, speak } =
    useVoice({
      onFinalResult: (text) => {
        if (text) sendMessage(text);
      },
    });

  useEffect(() => {
    fetch("/api/tide/connectors")
      .then((r) => r.json())
      .then((data) => setConnectors(data.connectors ?? []))
      .catch(() => setConnectors([]));
  }, []);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, thinking]);

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;

    const history = messages;
    setMessages((prev) => [...prev, { role: "user", text: trimmed }]);
    setInput("");
    setThinking(true);

    try {
      const res = await fetch("/api/tide/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: trimmed, history }),
      });
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
    sendMessage(input);
  }

  async function handleLogout() {
    await fetch("/api/tide/auth", { method: "DELETE" });
    router.push("/tide/login");
    router.refresh();
  }

  const orbState = speaking ? "speaking" : listening ? "listening" : thinking ? "listening" : "idle";
  const statusText = speaking
    ? "Tide spreekt..."
    : listening
    ? "Ik luister..."
    : thinking
    ? "Even nadenken..."
    : "Tik op de microfoon of typ hieronder";

  return (
    <main className="tide-theme flex min-h-screen flex-col">
      <header className="flex items-center justify-between px-6 py-4">
        <Link href="/" className="text-sm text-white/60 hover:text-white">
          ← Terug naar Talkwave
        </Link>
        <div className="flex items-center gap-2 text-lg font-semibold tracking-wide">
          <span className="h-2 w-2 rounded-full bg-tide-accent" />
          Tide
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden gap-2 sm:flex">
            {connectors.map((c) => (
              <span
                key={c.id}
                title={c.detail}
                className={`rounded-full px-3 py-1 text-xs ${
                  c.status === "connected"
                    ? "bg-tide-accent/20 text-tide-accent"
                    : "bg-white/5 text-white/40"
                }`}
              >
                {c.label}
              </span>
            ))}
          </div>
          <button
            onClick={handleLogout}
            className="rounded-full border border-white/15 px-3 py-1 text-xs text-white/60 transition hover:border-white/40 hover:text-white"
          >
            Uitloggen
          </button>
        </div>
      </header>

      <div className="flex flex-1 flex-col items-center px-6 pb-6">
        <div className="relative my-6 flex h-40 w-40 items-center justify-center sm:h-52 sm:w-52">
          <div className="tide-orb-ring absolute inset-0 rounded-full border border-dashed border-tide-accent/30" />
          <div
            className={`h-32 w-32 rounded-full bg-gradient-to-br from-tide-accent to-tide-accent-2 shadow-[0_0_60px_rgba(34,211,238,0.45)] sm:h-40 sm:w-40 ${
              orbState === "listening"
                ? "tide-orb-listening"
                : orbState === "speaking"
                ? "tide-orb-speaking"
                : "tide-orb-idle"
            }`}
          />
        </div>

        <p className="mb-2 h-5 text-sm text-white/60">{statusText}</p>
        {listening && transcript && (
          <p className="mb-4 max-w-xl text-center text-white/80 italic">“{transcript}”</p>
        )}

        <div
          ref={logRef}
          className="mb-4 flex w-full max-w-2xl flex-1 flex-col gap-3 overflow-y-auto rounded-2xl bg-black/20 p-4"
          style={{ maxHeight: "40vh" }}
        >
          {messages.map((m, i) => (
            <div
              key={i}
              className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${
                m.role === "user"
                  ? "ml-auto bg-tide-accent-2/80 text-white"
                  : "bg-white/10 text-white/90"
              }`}
            >
              {m.text.split("\n").map((line, j) => (
                <div key={j}>{line}</div>
              ))}
            </div>
          ))}
          {thinking && <div className="max-w-[85%] rounded-2xl bg-white/10 px-4 py-2 text-sm text-white/50">…</div>}
        </div>

        <div className="mb-4 flex flex-wrap justify-center gap-2">
          {QUICK_ACTIONS.map((q) => (
            <button
              key={q}
              onClick={() => sendMessage(q)}
              className="rounded-full border border-white/15 px-3 py-1 text-xs text-white/70 transition hover:border-tide-accent hover:text-tide-accent"
            >
              {q}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex w-full max-w-2xl items-center gap-2">
          <button
            type="button"
            onClick={listening ? stopListening : startListening}
            disabled={!supported}
            title={supported ? "Praat tegen Tide" : "Spraakherkenning wordt niet ondersteund in deze browser"}
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-lg transition ${
              listening ? "bg-tide-accent text-tide-bg" : "bg-white/10 text-white hover:bg-white/20"
            } disabled:opacity-30`}
          >
            🎙
          </button>
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
        {!supported && (
          <p className="mt-2 text-xs text-white/40">
            Spraak wordt in deze browser niet ondersteund — gebruik Chrome of Edge, of typ je vraag.
          </p>
        )}
      </div>
    </main>
  );
}
