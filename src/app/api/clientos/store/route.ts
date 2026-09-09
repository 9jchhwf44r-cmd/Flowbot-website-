import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@netlify/blobs";

const STORE_NAME = "clientos";

// Op Netlify werkt @netlify/blobs meteen, zonder extra instellingen. Lokaal
// (plain `next dev`, buiten Netlify's omgeving) gooit getStore() een
// MissingBlobsEnvironmentError — dan valt dit terug op een in-memory Map,
// alleen voor lokaal testen (niet persistent, reset bij herstart).
const devMemoryStore = new Map<string, string>();

async function readKey(key: string): Promise<string | null> {
  try {
    const store = getStore(STORE_NAME);
    const value = await store.get(key, { type: "text" });
    return value ?? null;
  } catch {
    return devMemoryStore.get(key) ?? null;
  }
}

async function writeKey(key: string, value: string): Promise<void> {
  try {
    const store = getStore(STORE_NAME);
    await store.set(key, value);
  } catch {
    devMemoryStore.set(key, value);
  }
}

async function removeKey(key: string): Promise<void> {
  try {
    const store = getStore(STORE_NAME);
    await store.delete(key);
  } catch {
    devMemoryStore.delete(key);
  }
}

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");
  if (!key) {
    return NextResponse.json({ error: "key is verplicht" }, { status: 400 });
  }
  const value = await readKey(key);
  return NextResponse.json({ value });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const key = typeof body?.key === "string" ? body.key : "";
  const value = typeof body?.value === "string" ? body.value : "";
  if (!key) {
    return NextResponse.json({ error: "key is verplicht" }, { status: 400 });
  }
  await writeKey(key, value);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");
  if (!key) {
    return NextResponse.json({ error: "key is verplicht" }, { status: 400 });
  }
  await removeKey(key);
  return NextResponse.json({ ok: true });
}
