import { db } from "@/lib/db";
import { NextResponse } from "next/server";

const MAX_ATTEMPTS = 5;

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
      twoFactorAttempts: true,
    },
  });

  if (!user) return NextResponse.json({ error: "Benutzer nicht gefunden" }, { status: 404 });

  if (!user.twoFactorCode || !user.twoFactorExpiry) {
    return NextResponse.json({ error: "Kein Code angefordert" }, { status: 400 });
  }

  if (new Date() > user.twoFactorExpiry) {
    return NextResponse.json({ error: "Code abgelaufen. Bitte neu anfordern." }, { status: 400 });
  }

  if (user.twoFactorAttempts >= MAX_ATTEMPTS) {
    // Invalidate code after too many attempts
    await db.user.update({
      where: { id: user.id },
      data: { twoFactorCode: null, twoFactorExpiry: null, twoFactorAttempts: 0 },
    });
    return NextResponse.json(
      { error: "Zu viele Fehlversuche. Bitte fordern Sie einen neuen Code an." },
      { status: 429 }
    );
  }

  if (user.twoFactorCode !== code.trim()) {
    await db.user.update({
      where: { id: user.id },
      data: { twoFactorAttempts: { increment: 1 } },
    });
    const remaining = MAX_ATTEMPTS - user.twoFactorAttempts - 1;
    return NextResponse.json(
      { error: `Ungültiger Code. Noch ${remaining} Versuch${remaining !== 1 ? "e" : ""} übrig.` },
      { status: 400 }
    );
  }

  // Clear the code after successful verification
  await db.user.update({
    where: { id: user.id },
    data: { twoFactorCode: null, twoFactorExpiry: null, twoFactorAttempts: 0 },
  });

  return NextResponse.json({ ok: true });
}
