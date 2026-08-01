import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { updateLessonProgress } from "@/lib/learning/actions";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id as string;
  const { lessonId, progressPct } = await request.json();

  if (!lessonId || progressPct === undefined) {
    return NextResponse.json({ error: "lessonId and progressPct required" }, { status: 400 });
  }

  const result = await updateLessonProgress({ userId, lessonId, progressPct });
  return NextResponse.json(result);
}
