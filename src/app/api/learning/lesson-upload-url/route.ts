import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { getLessonUploadUrl } from "@/lib/learning/actions";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { lessonId, fileName, mimeType } = await request.json();

  if (!lessonId || !fileName) {
    return NextResponse.json({ error: "lessonId and fileName required" }, { status: 400 });
  }

  const result = await getLessonUploadUrl(
    lessonId,
    fileName,
    mimeType ?? "application/octet-stream"
  );

  return NextResponse.json(result);
}
