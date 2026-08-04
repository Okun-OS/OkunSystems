import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getPresignedReadUrl } from "@/lib/storage";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const lessonId = searchParams.get("lessonId");
    if (!lessonId) {
      return NextResponse.json({ error: "lessonId fehlt" }, { status: 400 });
    }

    const userId = (session.user as { id: string }).id;
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { companyId: true, role: true },
    });

    if (!user) {
      return NextResponse.json({ error: "Benutzer nicht gefunden" }, { status: 401 });
    }

    const lesson = await db.learningLesson.findUnique({
      where: { id: lessonId },
      select: {
        r2Key: true,
        chapter: {
          select: {
            assignments: {
              // allow suggested + active (active only was silently blocking most clients)
              where: { status: { in: ["suggested", "active"] } },
              select: { companyId: true },
            },
          },
        },
      },
    });

    if (!lesson?.r2Key) {
      return NextResponse.json({ error: "Kein Video vorhanden" }, { status: 404 });
    }

    if (user.role !== "ADMIN") {
      const hasAccess = lesson.chapter.assignments.some(
        (a: { companyId: string }) => a.companyId === user.companyId
      );
      if (!hasAccess) {
        return NextResponse.json({ error: "Kein Zugriff" }, { status: 403 });
      }
    }

    // Generate a presigned URL and redirect — the <video> element follows redirects
    // without enforcing CORS, so the browser loads the file directly from R2.
    const signedUrl = await getPresignedReadUrl(lesson.r2Key, 3600);
    return NextResponse.redirect(signedUrl, 302);
  } catch (err) {
    console.error("[lesson-video]", err);
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}
