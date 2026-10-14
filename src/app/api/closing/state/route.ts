import { NextRequest, NextResponse } from "next/server";
import { verifyClosingToken } from "@/lib/closing/token";
import { buildClientClosingState } from "@/lib/closing/client-view";

export const dynamic = "force-dynamic";

/** Aktueller Stand für die Kundenseite (Polling während des Closings). */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "Token fehlt" }, { status: 400 });

  const validation = await verifyClosingToken(token);
  if (!validation.ok) {
    return NextResponse.json({ error: "Zugang ungültig", reason: validation.reason }, { status: 401 });
  }

  const state = await buildClientClosingState(validation.closingSessionId);
  if (!state) return NextResponse.json({ error: "Session nicht gefunden" }, { status: 404 });

  return NextResponse.json(state, {
    headers: { "Cache-Control": "no-store" },
  });
}
