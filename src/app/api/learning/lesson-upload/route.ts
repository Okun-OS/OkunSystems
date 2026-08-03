import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { uploadToR2, buildLessonKey } from "@/lib/storage";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const lessonId = searchParams.get("lessonId");
    const fileName = searchParams.get("fileName");
    const mimeType = searchParams.get("mimeType") || "application/octet-stream";

    if (!lessonId || !fileName) {
      return NextResponse.json({ error: "lessonId und fileName erforderlich" }, { status: 400 });
    }

    const lesson = await db.learningLesson.findUnique({
      where: { id: lessonId },
      select: { id: true },
    });
    if (!lesson) {
      return NextResponse.json({ error: "Lektion nicht gefunden" }, { status: 404 });
    }

    const buffer = Buffer.from(await request.arrayBuffer());
    if (!buffer.length) {
      return NextResponse.json({ error: "Leere Datei" }, { status: 400 });
    }

    const key = buildLessonKey(lessonId, fileName);
    await uploadToR2(buffer, key, mimeType);

    await db.learningLesson.update({
      where: { id: lessonId },
      data: { r2Key: key },
    });

    return NextResponse.json({ success: true, r2Key: key });
  } catch (err) {
    console.error("[lesson-upload]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upload fehlgeschlagen" },
      { status: 500 }
    );
  }
}
