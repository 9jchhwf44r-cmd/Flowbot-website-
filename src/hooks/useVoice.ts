"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// De browser Web Speech API heeft geen officiële TypeScript-types in lib.dom.
// Minimale eigen typering voor wat we nodig hebben.
interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: { transcript: string };
}
interface SpeechRecognitionEventLike extends Event {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}
interface SpeechRecognitionLike extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

export interface UseVoiceOptions {
  lang?: string;
  onFinalResult?: (text: string) => void;
}

function getSpeechRecognitionCtor(): SpeechRecognitionConstructor | undefined {
  if (typeof window === "undefined") return undefined;
  return window.SpeechRecognition || window.webkitSpeechRecognition;
}

function canRecordAudio(): boolean {
  return (
    typeof navigator !== "undefined" &&
    Boolean(navigator.mediaDevices?.getUserMedia) &&
    typeof window !== "undefined" &&
    typeof window.MediaRecorder !== "undefined"
  );
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] || "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export function useVoice({ lang = "nl-NL", onFinalResult }: UseVoiceOptions = {}) {
  // Chrome/Edge hebben ingebouwde spraakherkenning; Safari (met name iOS) niet.
  // Daar valt deze hook terug op zelf opnemen + laten transcriberen door Gemini.
  const [nativeSupported] = useState(() => Boolean(getSpeechRecognitionCtor()));
  const [recordingSupported] = useState(() => canRecordAudio());
  const supported = nativeSupported || recordingSupported;

  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [transcript, setTranscript] = useState("");

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const onFinalResultRef = useRef(onFinalResult);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const speechPrimedRef = useRef(false);

  useEffect(() => {
    onFinalResultRef.current = onFinalResult;
  }, [onFinalResult]);

  useEffect(() => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) return;

    const recognition = new Ctor();
    recognition.lang = lang;
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      let interim = "";
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }
      if (final) {
        setTranscript(final);
        onFinalResultRef.current?.(final.trim());
      } else {
        setTranscript(interim);
      }
    };

    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);

    recognitionRef.current = recognition;
  }, [lang]);

  // Op iOS/Safari speelt speechSynthesis alleen betrouwbaar af als hij ooit
  // synchroon binnen een echte tik/klik is "ontgrendeld".
  const primeSpeech = useCallback(() => {
    if (speechPrimedRef.current) return;
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(""));
    speechPrimedRef.current = true;
  }, []);

  const startRecordingFallback = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = window.MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : window.MediaRecorder.isTypeSupported("audio/mp4")
        ? "audio/mp4"
        : "";
      const recorder = mimeType ? new window.MediaRecorder(stream, { mimeType }) : new window.MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        setListening(false);

        if (chunksRef.current.length === 0) return;
        setTranscribing(true);
        try {
          const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
          const audioBase64 = await blobToBase64(blob);
          const res = await fetch("/api/tide/transcribe", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ audioBase64, mimeType: recorder.mimeType || "audio/webm" }),
          });
          const data = await res.json();
          const text: string = data.text || "";
          if (text) {
            setTranscript(text);
            onFinalResultRef.current?.(text.trim());
          }
        } catch {
          // Netwerkfout: stil negeren, gebruiker kan het opnieuw proberen of typen.
        } finally {
          setTranscribing(false);
        }
      };

      mediaRecorderRef.current = recorder;
      setTranscript("");
      setListening(true);
      recorder.start();
    } catch {
      setListening(false);
    }
  }, []);

  const startListening = useCallback(() => {
    primeSpeech();

    if (nativeSupported && recognitionRef.current) {
      setTranscript("");
      setListening(true);
      try {
        recognitionRef.current.start();
      } catch {
        // start() gooit als hij al bezig is; negeren
      }
      return;
    }

    if (recordingSupported) {
      void startRecordingFallback();
    }
  }, [nativeSupported, recordingSupported, primeSpeech, startRecordingFallback]);

  const stopListening = useCallback(() => {
    if (nativeSupported && recognitionRef.current) {
      recognitionRef.current.stop();
      setListening(false);
      return;
    }
    mediaRecorderRef.current?.stop();
  }, [nativeSupported]);

  const speak = useCallback(
    (text: string) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
      window.speechSynthesis.cancel();
      // Direct na cancel() opnieuw speak() aanroepen wordt door Safari soms
      // stil genegeerd; een kleine vertraging voorkomt dat betrouwbaar.
      window.setTimeout(() => {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang;
        utterance.onstart = () => setSpeaking(true);
        utterance.onend = () => setSpeaking(false);
        utterance.onerror = () => setSpeaking(false);
        window.speechSynthesis.speak(utterance);
      }, 60);
    },
    [lang]
  );

  const cancelSpeech = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setSpeaking(false);
  }, []);

  return {
    supported,
    listening,
    speaking,
    transcribing,
    transcript,
    startListening,
    stopListening,
    speak,
    primeSpeech,
    cancelSpeech,
  };
}
