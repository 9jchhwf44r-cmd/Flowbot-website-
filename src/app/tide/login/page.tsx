"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/tide/auth", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Inloggen mislukt.");
        return;
      }
      router.push(searchParams.get("next") || "/tide");
      router.refresh();
    } catch {
      setError("Kon niet verbinden met de server.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="tide-theme flex min-h-screen flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm rounded-2xl bg-black/20 p-8">
        <div className="mb-6 flex items-center justify-center gap-2 text-xl font-semibold">
          <span className="h-2 w-2 rounded-full bg-tide-accent" />
          Tide
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Wachtwoord"
            className="h-11 rounded-full bg-white/10 px-4 text-sm text-white placeholder-white/40 outline-none focus:ring-2 focus:ring-tide-accent"
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="h-11 rounded-full bg-tide-accent px-5 text-sm font-semibold text-tide-bg transition hover:brightness-110 disabled:opacity-50"
          >
            {submitting ? "Bezig..." : "Ontgrendel Tide"}
          </button>
        </form>
      </div>
    </main>
  );
}

export default function TideLoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
