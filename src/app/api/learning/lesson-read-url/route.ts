import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getPresignedReadUrl } from "@/lib/storage";

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

    const userId = (session.user as any).id as string;
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { companyId: true, role: true },
    });

    const lesson = await db.learningLesson.findUnique({
      where: { id: lessonId },
      select: {
        id: true,
        r2Key: true,
        contentType: true,
        chapter: {
          select: {
            assignments: {
              where: { status: { in: ["suggested", "active"] } },
              select: { companyId: true },
            },
          },
        },
      },
    });

    if (!lesson || !lesson.r2Key) {
      return NextResponse.json({ error: "Lektion nicht gefunden oder kein R2-Inhalt" }, { status: 404 });
    }

    // Admins can access all lessons; clients need an active assignment
    if (user?.role !== "ADMIN") {
      const hasAccess = lesson.chapter.assignments.some(
        (a: { companyId: string }) => a.companyId === user?.companyId
      );
      if (!hasAccess) {
        return NextResponse.json({ error: "Kein Zugriff" }, { status: 403 });
      }
    }

    const signedUrl = await getPresignedReadUrl(lesson.r2Key, 3600);
    return NextResponse.json({ url: signedUrl });
  } catch (error) {
    console.error("lesson-read-url error:", error);
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}
