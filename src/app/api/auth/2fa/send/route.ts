import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { Resend } from "resend";

const RATE_LIMIT_SECONDS = 60;
const CODE_TTL_SECONDS = 600; // 10 minutes

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(req: Request) {
  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });

  const user = await db.user.findUnique({
    where: { email },
    select: { id: true, email: true, name: true, twoFactorEnabled: true, twoFactorSentAt: true },
  });

  if (!user || !user.twoFactorEnabled) {
    return NextResponse.json({ error: "2FA not enabled for this account" }, { status: 400 });
  }

  // Rate limiting: block if last send was < 60s ago
  if (user.twoFactorSentAt) {
    const elapsed = (Date.now() - user.twoFactorSentAt.getTime()) / 1000;
    if (elapsed < RATE_LIMIT_SECONDS) {
      return NextResponse.json(
        { error: `Bitte warte ${Math.ceil(RATE_LIMIT_SECONDS - elapsed)} Sekunden vor dem erneuten Senden.` },
        { status: 429 }
      );
    }
  }

  const code = generateCode();
  const expiry = new Date(Date.now() + CODE_TTL_SECONDS * 1000);

  await db.user.update({
    where: { id: user.id },
    data: {
      twoFactorCode: code,
      twoFactorExpiry: expiry,
      twoFactorSentAt: new Date(),
    },
  });

  const apiKey = process.env.RESEND_API_KEY;
  if (apiKey) {
    try {
      const resend = new Resend(apiKey);
      const from = process.env.EMAIL_FROM ?? "OKUN Systems <noreply@okun-systems.de>";
      await resend.emails.send({
        from,
        to: user.email,
        subject: "Ihr OKUN Anmeldecode",
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#0a0a0a;color:#f0f0f0;border-radius:12px">
            <h2 style="color:#22c55e;margin-bottom:8px">Anmeldung bestätigen</h2>
            <p style="color:#888;margin-bottom:24px">Geben Sie diesen Code auf der Anmeldeseite ein:</p>
            <div style="background:#141414;border:1px solid #2a2a2a;border-radius:8px;padding:24px;text-align:center;margin-bottom:24px">
              <span style="font-size:32px;font-weight:700;letter-spacing:8px;color:#22c55e;font-family:monospace">${code}</span>
            </div>
            <p style="color:#555;font-size:13px">Der Code ist 10 Minuten gültig. Wenn Sie sich nicht angemeldet haben, ignorieren Sie diese E-Mail.</p>
          </div>
        `,
      });
    } catch {
      // Log but don't fail — code is still stored in DB
    }
  }

  return NextResponse.json({ ok: true });
}
