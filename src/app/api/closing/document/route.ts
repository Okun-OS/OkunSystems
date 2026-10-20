import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyClosingToken } from "@/lib/closing/token";
import { getPresignedReadUrl } from "@/lib/storage";
import { getSnapshotData } from "@/lib/closing/snapshot";
import { resolveLiveConsents } from "@/lib/closing/consent-resolver";

export const dynamic = "force-dynamic";

/**
 * Liefert eine konkrete Vertragsdokumentversion an den Kunden aus.
 *
 * Zugelassen sind ausschließlich Versionen, die zu diesem Abschluss gehören —
 * entweder aus dem eingefrorenen Snapshot oder, davor, aus der aktuell
 * gültigen Konfiguration. Private R2-Objekte werden nur über kurzlebige
 * Signed URLs zugänglich gemacht.
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const versionId = request.nextUrl.searchParams.get("versionId");
  if (!token || !versionId) {
    return NextResponse.json({ error: "Token oder Dokument fehlt" }, { status: 400 });
  }

  const validation = await verifyClosingToken(token);
  if (!validation.ok) {
    return NextResponse.json({ error: "Zugang ungültig" }, { status: 401 });
  }

  const allowed = await allowedVersionIds(validation.closingSessionId);
  if (!allowed.has(versionId)) {
    return NextResponse.json(
      { error: "Dieses Dokument gehört nicht zu Ihrem Vertragsabschluss." },
      { status: 403 }
    );
  }

  const version = await db.legalDocument.findUnique({
    where: { id: versionId },
    select: { r2Key: true, content: true, title: true, version: true },
  });
  if (!version) return NextResponse.json({ error: "Dokument nicht gefunden" }, { status: 404 });

  if (version.r2Key) {
    const url = await getPresignedReadUrl(version.r2Key, 300);
    return NextResponse.redirect(url);
  }
  if (version.content) {
    return new NextResponse(renderInlineDocument(version.title, version.version, version.content), {
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
    });
  }
  return NextResponse.json({ error: "Kein Inhalt hinterlegt" }, { status: 404 });
}

async function allowedVersionIds(closingSessionId: string): Promise<Set<string>> {
  const data = await getSnapshotData(closingSessionId);
  if (data) {
    return new Set(
      (data.documents ?? [])
        .map((doc) => doc.versionId)
        .filter((id): id is string => Boolean(id))
    );
  }

  const session = await db.closingSession.findUnique({
    where: { id: closingSessionId },
    select: { activeOfferId: true },
  });
  const offer = session?.activeOfferId
    ? await db.offer.findUnique({
        where: { id: session.activeOfferId },
        select: { packageType: true, template: { select: { packageType: true } } },
      })
    : null;
  const live = await resolveLiveConsents(
    offer?.packageType ?? offer?.template?.packageType ?? null
  );
  return new Set(
    live.consents
      .map((c) => c.document?.versionId)
      .filter((id): id is string => Boolean(id))
  );
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderInlineDocument(title: string, version: string, content: string): string {
  return `<!DOCTYPE html><html lang="de"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)} — Version ${escapeHtml(version)}</title>
<style>
  body { margin:0; background:#080c14; color:#eef2f7; font-family: system-ui, -apple-system, sans-serif; }
  .wrap { max-width: 760px; margin: 0 auto; padding: 48px 24px 96px; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  .version { color:#8899b4; font-size:13px; margin-bottom:32px; }
  pre { white-space: pre-wrap; word-wrap: break-word; font-family: inherit; font-size:14px; line-height:1.7; color:#c9d4e4; margin:0; }
</style></head><body><div class="wrap">
<h1>${escapeHtml(title)}</h1>
<div class="version">Version ${escapeHtml(version)}</div>
<pre>${escapeHtml(content)}</pre>
</div></body></html>`;
}
