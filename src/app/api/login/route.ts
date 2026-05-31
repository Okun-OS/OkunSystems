import { db } from "@/lib/db";
import bcryptjs from "bcryptjs";
import { encode } from "@auth/core/jwt";

const SECRET =
  process.env.AUTH_SECRET ||
  process.env.NEXTAUTH_SECRET ||
  "okun-systems-platform-secret-please-set-NEXTAUTH_SECRET-in-railway";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

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
