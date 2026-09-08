import { NextResponse } from "next/server";
import { getAllConnectorInfo } from "@/lib/connectors";

export async function GET() {
  return NextResponse.json({ connectors: getAllConnectorInfo() });
}
