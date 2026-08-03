import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { uploadToR2, buildLessonKey } from "@/lib/storage";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const lessonId = formData.get("lessonId") as string | null;

    if (!file || !lessonId) {
      return NextResponse.json({ error: "file und lessonId erforderlich" }, { status: 400 });
    }

    const lesson = await db.learningLesson.findUnique({
      where: { id: lessonId },
      select: { id: true },
    });
    if (!lesson) {
      return NextResponse.json({ error: "Lektion nicht gefunden" }, { status: 404 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const key = buildLessonKey(lessonId, file.name);

    await uploadToR2(buffer, key, file.type || "application/octet-stream");

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
