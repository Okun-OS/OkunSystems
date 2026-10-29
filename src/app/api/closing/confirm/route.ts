import { NextRequest, NextResponse } from "next/server";
import { verifyClosingToken } from "@/lib/closing/token";
import { confirmConsents } from "@/lib/closing/consent";
import { buildClientClosingState } from "@/lib/closing/client-view";

export const dynamic = "force-dynamic";

/**
 * Nimmt die Bestätigung des Kunden entgegen.
 *
 * Der Browser übermittelt ausschließlich, welche Checkboxen gesetzt wurden.
 * Alles Weitere — welche Erklärungen erforderlich sind, welcher Wortlaut gilt,
 * welche Dokumentversion zugeordnet ist und wann bestätigt wurde — bestimmt
 * ausschließlich der Server aus dem eingefrorenen Contract Snapshot.
 */
export async function POST(request: NextRequest) {
  let body: {
    token?: string;
    accepted?: string[];
    onlyConsentType?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });
  }

  if (!body.token) return NextResponse.json({ error: "Token fehlt" }, { status: 400 });

  const validation = await verifyClosingToken(body.token);
  if (!validation.ok) {
    return NextResponse.json(
      { error: "Zugang ungültig oder abgelaufen", reason: validation.reason },
      { status: 401 }
    );
  }

  const acceptedIds = Array.isArray(body.accepted)
    ? body.accepted.filter((id): id is string => typeof id === "string")
    : [];

  const forwarded = request.headers.get("x-forwarded-for");
  const ipAddress = forwarded ? forwarded.split(",")[0]!.trim() : null;

  const result = await confirmConsents({
    closingSessionId: validation.closingSessionId,
    submissions: acceptedIds.map((definitionId) => ({ definitionId, accepted: true })),
    sessionTokenHash: validation.tokenHash,
    ipAddress,
    userAgent: request.headers.get("user-agent"),
    onlyConsentType: body.onlyConsentType,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error, missing: result.missing }, { status: 422 });
  }

  const state = await buildClientClosingState(validation.closingSessionId);
  return NextResponse.json(
    {
      ok: true,
      recorded: result.createdEventIds.length,
      alreadyRecorded: result.alreadyRecorded,
      allRequiredConfirmed: result.allRequiredConfirmed,
      state,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
