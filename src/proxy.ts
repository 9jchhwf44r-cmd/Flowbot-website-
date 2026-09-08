import { NextRequest, NextResponse } from "next/server";
import { isValidSession, TIDE_SESSION_COOKIE } from "@/lib/tideAuth";

export const config = {
  matcher: ["/tide", "/tide/:path*", "/api/tide/:path*"],
};

const PUBLIC_PATHS = new Set(["/tide/login", "/api/tide/auth"]);

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  const cookie = req.cookies.get(TIDE_SESSION_COOKIE)?.value;
  const valid = await isValidSession(cookie);

  if (valid) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Niet ingelogd bij Tide." }, { status: 401 });
  }

  const loginUrl = new URL("/tide/login", req.url);
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}
