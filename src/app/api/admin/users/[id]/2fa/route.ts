import { auth } from "@/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { enabled } = await req.json();

  const user = await db.user.findUnique({ where: { id }, select: { id: true } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  await db.user.update({
    where: { id },
    data: {
      twoFactorEnabled: Boolean(enabled),
      twoFactorCode: null,
      twoFactorExpiry: null,
      twoFactorSentAt: null,
    },
  });

  return NextResponse.json({ ok: true });
}
