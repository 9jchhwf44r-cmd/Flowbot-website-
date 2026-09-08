import { NextRequest, NextResponse } from "next/server";
import { isTidePasswordConfigured, TIDE_SESSION_COOKIE, verifyPassword } from "@/lib/tideAuth";

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 60_000;
const attempts = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const entry = attempts.get(ip);
  const now = Date.now();
  if (!entry || now > entry.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_ATTEMPTS;
}

export async function POST(req: NextRequest) {
  if (!isTidePasswordConfigured()) {
    return NextResponse.json(
      { error: "Er is nog geen TIDE_PASSWORD ingesteld op de server (zie .env.example)." },
      { status: 503 }
    );
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Te veel pogingen. Probeer het over een minuut opnieuw." },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => null);
  const password = typeof body?.password === "string" ? body.password : "";

  const token = await verifyPassword(password);
  if (!token) {
    return NextResponse.json({ error: "Onjuist wachtwoord." }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(TIDE_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(TIDE_SESSION_COOKIE);
  return res;
}
