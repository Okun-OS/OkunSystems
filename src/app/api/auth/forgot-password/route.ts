import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { sendPasswordResetEmail } from "@/lib/email";
import { randomBytes } from "crypto";

export async function POST(req: NextRequest) {
  const { email } = await req.json().catch(() => ({})) as { email?: string };

  if (!email?.trim()) {
    return NextResponse.json({ error: "E-Mail fehlt" }, { status: 400 });
  }

  const user = await db.user.findUnique({
    where: { email: email.toLowerCase().trim() },
    select: { id: true, email: true },
  });

  // Always return success to prevent user enumeration
  if (!user) {
    return NextResponse.json({ ok: true });
  }

  const token = randomBytes(32).toString("hex");
  const expiry = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours

  await db.user.update({
    where: { id: user.id },
    data: { resetToken: token, resetTokenExpiry: expiry },
  });

  const appUrl =
    process.env.NEXTAUTH_URL ??
    process.env.APP_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "";
  const resetUrl = `${appUrl}/passwort-reset/${token}`;

  if (!process.env.RESEND_API_KEY) {
    // Token is stored — admin can share the link manually
    console.warn("[forgot-password] RESEND_API_KEY not set; reset token stored but email not sent.");
    return NextResponse.json({ ok: true });
  }

  try {
    await sendPasswordResetEmail({ toEmail: user.email, resetUrl });
  } catch (err) {
    console.error("[forgot-password] Email send failed:", err);
    // Don't leak error to user — token is stored, they can retry
  }

  return NextResponse.json({ ok: true });
}
