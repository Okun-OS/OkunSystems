import { auth } from "@/auth";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as { role?: string }).role;
  if (role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { companyId, content } = await req.json();
  if (!companyId || !content?.trim()) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const note = await db.note.create({
    data: {
      content: content.trim(),
      companyId,
      authorId: (session.user as { id: string }).id,
      isInternal: true,
    },
    include: { author: true },
  });

  return NextResponse.json({ note });
}
