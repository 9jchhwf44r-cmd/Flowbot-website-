// Korte HUD-activatietonen via de Web Audio API — geen audiobestanden, dus
// geen extra gewicht en geen kosten. Werkt alleen client-side.

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

let ctx: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) ctx = new Ctor();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function playTone(startFreq: number, endFreq: number, durationMs: number) {
  const audio = getContext();
  if (!audio) return;

  const osc = audio.createOscillator();
  const gain = audio.createGain();
  const now = audio.currentTime;
  const durationS = durationMs / 1000;

  osc.type = "sine";
  osc.frequency.setValueAtTime(startFreq, now);
  osc.frequency.linearRampToValueAtTime(endFreq, now + durationS);

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.1, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + durationS);

  osc.connect(gain);
  gain.connect(audio.destination);
  osc.start(now);
  osc.stop(now + durationS + 0.02);
}

/** Korte oplopende chirp — Tide begint te luisteren. */
export function playListenStart() {
  playTone(520, 900, 110);
}

/** Korte aflopende chirp — Tide stopt met luisteren. */
export function playListenEnd() {
  playTone(780, 420, 130);
}
