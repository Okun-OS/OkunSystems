import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSessionAccess, AuthorizationError } from "@/lib/auth-guards";
import { getPresignedReadUrl } from "@/lib/storage";

export const dynamic = "force-dynamic";

/** Folienvorschau für den Berater — nur für seine eigenen Abschlüsse. */
export async function GET(request: NextRequest) {
  const slideId = request.nextUrl.searchParams.get("slideId");
  if (!slideId) return NextResponse.json({ error: "slideId fehlt" }, { status: 400 });

  const slide = await db.closingPresentationSlide.findUnique({
    where: { id: slideId },
    select: {
      r2Key: true,
      presentation: { select: { closingSessionId: true } },
    },
  });
  if (!slide?.presentation.closingSessionId) {
    return NextResponse.json({ error: "Folie nicht gefunden" }, { status: 404 });
  }

  try {
    await requireSessionAccess(slide.presentation.closingSessionId);
  } catch (err) {
    const status = err instanceof AuthorizationError ? 403 : 500;
    return NextResponse.json({ error: "Keine Berechtigung" }, { status });
  }

  const url = await getPresignedReadUrl(slide.r2Key, 300);
  return NextResponse.redirect(url);
}
