import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { releaseChapterToCompany } from "@/lib/learning/actions";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({})) as {
    companyId?: string;
    chapterId?: string;
  };

  if (!body.companyId || !body.chapterId) {
    return NextResponse.json({ error: "companyId and chapterId required" }, { status: 400 });
  }

  const result = await releaseChapterToCompany({
    companyId: body.companyId,
    chapterId: body.chapterId,
    assignedById: (session.user as any).id,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 409 });
  }

  return NextResponse.json({ ok: true });
}
