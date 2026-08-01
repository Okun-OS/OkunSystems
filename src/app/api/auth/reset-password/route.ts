import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  const { token, password } = await req.json().catch(() => ({})) as {
    token?: string;
    password?: string;
  };

  if (!token || !password || password.length < 8) {
    return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });
  }

  const user = await db.user.findUnique({
    where: { resetToken: token },
    select: { id: true, resetTokenExpiry: true },
  });

  if (!user || !user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
    return NextResponse.json(
      { error: "Link ungültig oder abgelaufen" },
      { status: 400 }
    );
  }

  const hashed = await bcrypt.hash(password, 12);

  await db.user.update({
    where: { id: user.id },
    data: {
      password: hashed,
      resetToken: null,
      resetTokenExpiry: null,
    },
  });

  return NextResponse.json({ ok: true });
}
