import { auth } from "@/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id as string;
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { twoFactorEnabled: true },
  });

  return NextResponse.json({ twoFactorEnabled: user?.twoFactorEnabled ?? false });
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id as string;
  const { enabled } = await req.json();

  await db.user.update({
    where: { id: userId },
    data: {
      twoFactorEnabled: Boolean(enabled),
      // Clear any pending codes when toggling
      twoFactorCode: null,
      twoFactorExpiry: null,
      twoFactorSentAt: null,
    },
  });

  return NextResponse.json({ ok: true, twoFactorEnabled: Boolean(enabled) });
}
