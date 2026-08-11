import { auth } from "@/auth";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { assembleBlueprintReport } from "@/lib/blueprint/report-assembler";
import { generateReportTexts } from "@/lib/blueprint/report-text-engine";
import { renderReportHtml } from "@/lib/blueprint/report-html";
import { renderHtmlToPdf } from "@/lib/blueprint/pdf-generator";
import { uploadPdfToR2, buildReportKey } from "@/lib/blueprint/storage";
import { sendBlueprintReportReady } from "@/lib/email";
import fs from "fs";
import path from "path";

// Force Node.js runtime — Puppeteer cannot run in the Edge runtime
export const runtime = "nodejs";
// Allow up to 5 minutes — sequential AI calls take 2-4 minutes
export const maxDuration = 300;

/**
 * POST /api/blueprint/report
 *
 * Admin-only. Generates the Blueprint 2.0 PDF report for a given session,
 * uploads it to R2, and returns the public URL.
 *
 * Body: { sessionId: string }
 *
 * Required env vars: ANTHROPIC_API_KEY, R2_ACCOUNT_ID, R2_ACCESS_KEY_ID,
 *   R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminUserId = (session.user as any).id as string;
  const role = (session.user as { role?: string }).role;
  if (role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({})) as { sessionId?: string };
  const { sessionId } = body;

  if (!sessionId) {
    return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
  }

  // Verify session exists and is a completed Blueprint 2.0 session
  const analysisSession = await db.analysisSession.findUnique({
    where: { id: sessionId },
    select: { status: true, blueprintVersion: true, reportUrl: true, companyId: true },
  });

  if (!analysisSession) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  if (analysisSession.blueprintVersion !== "2.0") {
    return NextResponse.json(
      { error: "Not a Blueprint 2.0 session" },
      { status: 400 }
    );
  }

  if (analysisSession.status !== "COMPLETED") {
    return NextResponse.json(
      { error: "Session is not completed" },
      { status: 400 }
    );
  }

  try {
    // Step 1: Assemble report data
    const reportData = await assembleBlueprintReport(sessionId);

    // Step 2: Generate AI narrative texts
    const texts = await generateReportTexts(reportData);

    // Step 3: Render HTML (embed logo as base64 data URI)
    let logoDataUri = "";
    try {
      const logoPath = path.join(process.cwd(), "public", "okun-logo.png");
      const logoBuffer = fs.readFileSync(logoPath);
      logoDataUri = `data:image/png;base64,${logoBuffer.toString("base64")}`;
    } catch {
      // logo missing — fall back to text logo
    }
    const html = renderReportHtml(reportData, texts, logoDataUri);

    // Step 4: Generate PDF
    const pdfBuffer = await renderHtmlToPdf(html);

    // Step 5: Upload to R2
    const key = buildReportKey(sessionId);
    const reportUrl = await uploadPdfToR2(pdfBuffer, key);

    // Step 6: Save URL on session
    await db.analysisSession.update({
      where: { id: sessionId },
      data: { reportUrl },
    });

    // Step 6b: Save PDF as internal Document record (non-fatal)
    try {
      const existingDoc = await db.document.findFirst({
        where: { r2Key: key, companyId: analysisSession.companyId },
      });
      if (existingDoc) {
        await db.document.update({ where: { id: existingDoc.id }, data: { fileUrl: reportUrl } });
      } else {
        await db.document.create({
          data: {
            title: "Blueprint-Bericht",
            category: "BLUEPRINT",
            fileUrl: reportUrl,
            r2Key: key,
            mimeType: "application/pdf",
            visibility: "internal",
            companyId: analysisSession.companyId,
            uploadedById: adminUserId,
          },
        });
      }
    } catch (docErr) {
      console.error("[blueprint/report] Document record save failed:", docErr);
    }

    // Step 7: Notify client by email (non-fatal)
    try {
      const primaryUser = await db.user.findFirst({
        where: { companyId: analysisSession.companyId, role: "CLIENT" },
        select: { email: true, name: true },
      });
      if (primaryUser) {
        await sendBlueprintReportReady({
          toEmail: primaryUser.email,
          toName: primaryUser.name ?? "Kund:in",
          companyName: reportData.company.name,
          reportUrl,
        });
      }
    } catch (emailErr) {
      console.error("[blueprint/report] Email send failed:", emailErr);
    }

    return NextResponse.json({ reportUrl });
  } catch (err) {
    console.error("[blueprint/report] Error:", err);
    const message = err instanceof Error ? err.message : "Report generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * GET /api/blueprint/report?sessionId=…
 *
 * Admin-only. Returns the existing report URL for a session if one exists.
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (session.user as { role?: string }).role;
  if (role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const sessionId = req.nextUrl.searchParams.get("sessionId");
  if (!sessionId) {
    return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
  }

  const analysisSession = await db.analysisSession.findUnique({
    where: { id: sessionId },
    select: { reportUrl: true },
  });

  if (!analysisSession) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ reportUrl: analysisSession.reportUrl ?? null });
}
