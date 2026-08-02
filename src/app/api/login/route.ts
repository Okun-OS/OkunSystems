import { db } from "@/lib/db";
import bcryptjs from "bcryptjs";
import { encode } from "@auth/core/jwt";
import { Resend } from "resend";

const SECRET =
  process.env.AUTH_SECRET ||
  process.env.NEXTAUTH_SECRET ||
  "okun-systems-platform-secret-please-set-NEXTAUTH_SECRET-in-railway";

const RATE_LIMIT_SECONDS = 60;
const CODE_TTL_SECONDS = 600;

function generate2FACode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function send2FACode(user: { id: string; email: string; name: string | null }) {
  const code = generate2FACode();
  const expiry = new Date(Date.now() + CODE_TTL_SECONDS * 1000);

  await db.user.update({
    where: { id: user.id },
    data: { twoFactorCode: code, twoFactorExpiry: expiry, twoFactorSentAt: new Date() },
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
        html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#0a0a0a;color:#f0f0f0;border-radius:12px"><h2 style="color:#22c55e;margin-bottom:8px">Anmeldung bestätigen</h2><p style="color:#888;margin-bottom:24px">Ihr 6-stelliger Code:</p><div style="background:#141414;border:1px solid #2a2a2a;border-radius:8px;padding:24px;text-align:center;margin-bottom:24px"><span style="font-size:32px;font-weight:700;letter-spacing:8px;color:#22c55e;font-family:monospace">${code}</span></div><p style="color:#555;font-size:13px">Gültig 10 Minuten. Falls Sie sich nicht anmelden, ignorieren Sie diese Mail.</p></div>`,
      });
    } catch {
      // email failure is non-fatal; code still in DB
    }
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password, twoFactorCode } = body;

    if (!email || !password) {
      return Response.json(
        { error: "E-Mail und Passwort erforderlich" },
        { status: 400 }
      );
    }

    const user = await db.user.findUnique({ where: { email } });

    if (!user) {
      return Response.json({ error: "Ungültige Zugangsdaten" }, { status: 401 });
    }

    const isValid = await bcryptjs.compare(password, user.password);
    if (!isValid) {
      return Response.json({ error: "Ungültige Zugangsdaten" }, { status: 401 });
    }

    // 2FA check
    if (user.twoFactorEnabled) {
      if (!twoFactorCode) {
        // Credentials valid → send 2FA code (with rate limiting)
        const lastSent = user.twoFactorSentAt;
        if (lastSent) {
          const elapsed = (Date.now() - lastSent.getTime()) / 1000;
          if (elapsed < RATE_LIMIT_SECONDS) {
            // Code was already sent recently — tell client to enter the code
            return Response.json({ requires2FA: true, codeSent: false });
          }
        }
        await send2FACode(user);
        return Response.json({ requires2FA: true, codeSent: true });
      }

      // Verify the supplied code
      const freshUser = await db.user.findUnique({
        where: { id: user.id },
        select: { twoFactorCode: true, twoFactorExpiry: true },
      });
      if (!freshUser?.twoFactorCode || !freshUser.twoFactorExpiry) {
        return Response.json({ error: "Kein Code angefordert. Bitte erneut anmelden." }, { status: 400 });
      }
      if (new Date() > freshUser.twoFactorExpiry) {
        return Response.json({ error: "Code abgelaufen. Bitte erneut anmelden." }, { status: 400 });
      }
      if (freshUser.twoFactorCode !== twoFactorCode.trim()) {
        return Response.json({ error: "Ungültiger Code" }, { status: 400 });
      }
      // Clear the code
      await db.user.update({
        where: { id: user.id },
        data: { twoFactorCode: null, twoFactorExpiry: null },
      });
    }

    // Detect HTTPS (Railway is always HTTPS in production)
    const isSecure =
      new URL(req.url).protocol === "https:" ||
      req.headers.get("x-forwarded-proto") === "https";

    const cookieName = isSecure
      ? "__Secure-authjs.session-token"
      : "authjs.session-token";

    // Create a JWT that the NextAuth middleware can read
    const token = await encode({
      token: {
        sub: user.id,
        id: user.id,
        email: user.email,
        name: user.name ?? "",
        role: user.role,
        companyId: user.companyId,
        firstLogin: user.firstLogin,
      },
      secret: SECRET,
      salt: cookieName,
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    const cookieValue = [
      `${cookieName}=${token}`,
      "Path=/",
      "HttpOnly",
      "SameSite=Lax",
      isSecure ? "Secure" : "",
      "Max-Age=2592000",
    ]
      .filter(Boolean)
      .join("; ");

    const redirectTo =
      user.role === "ADMIN" ? "/admin/dashboard" : "/dashboard";

    const response = Response.json({ ok: true, redirectTo });
    response.headers.set("Set-Cookie", cookieValue);
    return response;
  } catch (err) {
    console.error("[/api/login]", err);
    return Response.json(
      { error: "Serverfehler – bitte erneut versuchen" },
      { status: 500 }
    );
  }
}
