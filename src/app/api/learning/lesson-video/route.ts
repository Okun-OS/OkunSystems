import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";

export const runtime = "nodejs";
export const maxDuration = 300;

function getR2Client(): S3Client {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error("R2 credentials missing");
  }
  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
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
        (a: { companyId: string }) => a.companyId === user?.companyId
      );
      if (!hasAccess) {
        return NextResponse.json({ error: "Kein Zugriff" }, { status: 403 });
      }
    }

    const bucket = process.env.R2_BUCKET_NAME;
    if (!bucket) {
      return NextResponse.json({ error: "Bucket nicht konfiguriert" }, { status: 500 });
    }

    const rangeHeader = req.headers.get("range");

    const r2 = await getR2Client().send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: lesson.r2Key,
        ...(rangeHeader ? { Range: rangeHeader } : {}),
      })
    );

    if (!r2.Body) {
      return NextResponse.json({ error: "Leeres Video" }, { status: 404 });
    }

    const headers: Record<string, string> = {
      "Content-Type": r2.ContentType ?? "video/mp4",
      "Accept-Ranges": "bytes",
      "Cache-Control": "private, max-age=3600",
    };
    if (r2.ContentLength) headers["Content-Length"] = String(r2.ContentLength);
    if (r2.ContentRange) headers["Content-Range"] = r2.ContentRange;

    // Stream directly from R2 to the browser without buffering in memory
    const stream = r2.Body.transformToWebStream();

    return new Response(stream, {
      status: rangeHeader ? 206 : 200,
      headers,
    });
  } catch (err) {
    console.error("[lesson-video]", err);
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}
