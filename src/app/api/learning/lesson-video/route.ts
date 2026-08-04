import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import type { Readable } from "stream";

export const runtime = "nodejs";

function getR2Client(): S3Client {
  return new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
}

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

    const lesson = await db.learningLesson.findUnique({
      where: { id: lessonId },
      select: {
        r2Key: true,
        chapter: {
          select: {
            assignments: {
              where: { status: "active" },
              select: { companyId: true },
            },
          },
        },
      },
    });

    if (!lesson?.r2Key) {
      return NextResponse.json({ error: "Kein Video vorhanden" }, { status: 404 });
    }

    if (user?.role !== "ADMIN") {
      const hasAccess = lesson.chapter.assignments.some(
        (a) => a.companyId === user?.companyId
      );
      if (!hasAccess) {
        return NextResponse.json({ error: "Kein Zugriff" }, { status: 403 });
      }
    }

    const bucket = process.env.R2_BUCKET_NAME!;
    const rangeHeader = req.headers.get("range") ?? undefined;

    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: lesson.r2Key,
      ...(rangeHeader ? { Range: rangeHeader } : {}),
    });

    const r2 = await getR2Client().send(command);

    // Convert R2 SDK body (Node.js Readable) to a Web ReadableStream
    const nodeStream = r2.Body as Readable;
    const webStream = new ReadableStream({
      start(controller) {
        nodeStream.on("data", (chunk: Buffer) => controller.enqueue(chunk));
        nodeStream.on("end", () => controller.close());
        nodeStream.on("error", (err) => controller.error(err));
      },
      cancel() {
        nodeStream.destroy();
      },
    });

    const headers: Record<string, string> = {
      "Content-Type": r2.ContentType ?? "video/mp4",
      "Accept-Ranges": "bytes",
      "Cache-Control": "private, max-age=3600",
    };
    if (r2.ContentLength) headers["Content-Length"] = String(r2.ContentLength);
    if (r2.ContentRange) headers["Content-Range"] = r2.ContentRange;

    return new Response(webStream, {
      status: rangeHeader ? 206 : 200,
      headers,
    });
  } catch (err) {
    console.error("[lesson-video] error:", err);
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}
