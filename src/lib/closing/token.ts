import { createHash, randomBytes, timingSafeEqual } from "crypto";
import { db } from "@/lib/db";

/**
 * Zugangstoken der Kundenseite.
 *
 * • kryptografisch zufällig (32 Byte)
 * • in der Datenbank liegt ausschließlich der SHA-256-Hash
 * • Gültigkeit standardmäßig 72 Stunden
 * • widerrufbar
 * • eine Neuausstellung invalidiert das vorherige Token sofort, weil der
 *   gespeicherte Hash ersetzt wird
 */

export const CLOSING_TOKEN_TTL_HOURS = Number(process.env.CLOSING_TOKEN_TTL_HOURS ?? 72);

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generateToken(): string {
  return randomBytes(32).toString("hex");
}

export function safeCompareHash(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export type IssuedToken = {
  token: string;
  tokenHash: string;
  expiresAt: Date;
  url: string;
};

export function appUrl(): string {
  return process.env.NEXTAUTH_URL ?? process.env.APP_URL ?? "https://okun-systems.de";
}

/** Stellt ein neues Token aus und invalidiert damit das bisherige. */
export async function issueClosingToken(closingSessionId: string): Promise<IssuedToken> {
  const token = generateToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + CLOSING_TOKEN_TTL_HOURS * 3600 * 1000);

  await db.closingSession.update({
    where: { id: closingSessionId },
    data: {
      clientTokenHash: tokenHash,
      tokenExpiresAt: expiresAt,
      tokenIssuedAt: new Date(),
      tokenRevokedAt: null,
    },
  });

  return { token, tokenHash, expiresAt, url: `${appUrl()}/closing/${token}` };
}

/** Widerruft den Zugang, ohne die Session zu löschen. */
export async function revokeClosingToken(closingSessionId: string): Promise<void> {
  await db.closingSession.update({
    where: { id: closingSessionId },
    data: {
      // Der Hash wird durch einen nicht erreichbaren Wert ersetzt: kein
      // ausgegebenes Token kann ihn mehr erzeugen.
      clientTokenHash: `revoked:${randomBytes(32).toString("hex")}`,
      tokenRevokedAt: new Date(),
    },
  });
}

export type TokenValidation =
  | { ok: true; closingSessionId: string; tokenHash: string }
  | { ok: false; reason: "not_found" | "expired" | "revoked" };

export async function verifyClosingToken(token: string): Promise<TokenValidation> {
  if (!token || token.length < 16) return { ok: false, reason: "not_found" };
  const tokenHash = hashToken(token);

  const session = await db.closingSession.findUnique({
    where: { clientTokenHash: tokenHash },
    select: { id: true, tokenExpiresAt: true, tokenRevokedAt: true },
  });
  if (!session) return { ok: false, reason: "not_found" };
  if (session.tokenRevokedAt) return { ok: false, reason: "revoked" };
  if (new Date() > session.tokenExpiresAt) return { ok: false, reason: "expired" };

  return { ok: true, closingSessionId: session.id, tokenHash };
}
