import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { email, code } = await req.json();
  if (!email || !code) {
    return NextResponse.json({ error: "email and code required" }, { status: 400 });
  }

  const user = await db.user.findUnique({
    where: { email },
    select: {
      id: true,
      twoFactorCode: true,
      twoFactorExpiry: true,
    },
  });

  if (!user) return NextResponse.json({ error: "Benutzer nicht gefunden" }, { status: 404 });

  if (!user.twoFactorCode || !user.twoFactorExpiry) {
    return NextResponse.json({ error: "Kein Code angefordert" }, { status: 400 });
  }

  if (new Date() > user.twoFactorExpiry) {
    return NextResponse.json({ error: "Code abgelaufen. Bitte neu anfordern." }, { status: 400 });
  }

  if (user.twoFactorCode !== code.trim()) {
    return NextResponse.json({ error: "Ungültiger Code" }, { status: 400 });
  }

  // Clear the code after successful verification
  await db.user.update({
    where: { id: user.id },
    data: { twoFactorCode: null, twoFactorExpiry: null },
  });

  return NextResponse.json({ ok: true });
}
