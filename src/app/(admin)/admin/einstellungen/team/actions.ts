"use server";

import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { guarded, requireAdmin } from "@/lib/auth-guards";
import { sendPasswordResetEmail } from "@/lib/email";
import { appUrl } from "@/lib/closing/token";

/**
 * Verwaltung interner Benutzer (ADMIN und CLOSER).
 *
 * Ein neu angelegtes Konto bekommt kein Passwort, sondern einen einmaligen
 * Link zur Passwortvergabe. Deaktivierte Konten können sich nicht mehr
 * anmelden — auch nicht mit einem bereits ausgestellten Token.
 */

const PATH = "/admin/einstellungen/team";
const TEAM_ROLES = ["ADMIN", "CLOSER"] as const;
const SETUP_TOKEN_TTL_DAYS = 7;

function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

async function issueSetupLink(userId: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  await db.user.update({
    where: { id: userId },
    data: {
      resetToken: token,
      resetTokenExpiry: new Date(Date.now() + SETUP_TOKEN_TTL_DAYS * 86400_000),
    },
  });
  return `${appUrl()}/passwort-reset/${token}`;
}

export async function createTeamMember(formData: FormData) {
  return guarded(async () => {
    await requireAdmin();

    const email = normalizeEmail((formData.get("email") as string) ?? "");
    const name = (formData.get("name") as string)?.trim();
    const role = (formData.get("role") as string)?.trim();

    if (!email || !email.includes("@")) return { error: "Bitte eine gültige E-Mail angeben." };
    if (!name) return { error: "Name ist Pflichtfeld." };
    if (!(TEAM_ROLES as readonly string[]).includes(role)) {
      return { error: "Ungültige Rolle." };
    }

    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return {
        error:
          existing.role === "CLIENT"
            ? "Diese E-Mail gehört bereits zu einem Kundenzugang."
            : "Diese E-Mail ist bereits vergeben.",
      };
    }

    const user = await db.user.create({
      data: {
        email,
        name,
        // Zufälliges, nicht kommuniziertes Passwort: der Zugang entsteht
        // ausschließlich über den Einrichtungslink.
        password: await bcrypt.hash(randomBytes(32).toString("hex"), 12),
        role,
        firstLogin: true,
      },
      select: { id: true },
    });

    const setupUrl = await issueSetupLink(user.id);
    let emailed = false;
    try {
      await sendPasswordResetEmail({ toEmail: email, resetUrl: setupUrl });
      emailed = true;
    } catch (err) {
      console.error("[team] Einrichtungs-E-Mail fehlgeschlagen:", err);
    }

    revalidatePath(PATH);
    return { ok: true, userId: user.id, setupUrl, emailed };
  });
}

export async function updateTeamMember(userId: string, formData: FormData) {
  return guarded(async () => {
    const actor = await requireAdmin();

    const name = (formData.get("name") as string)?.trim();
    const role = (formData.get("role") as string)?.trim();
    if (!name) return { error: "Name ist Pflichtfeld." };
    if (!(TEAM_ROLES as readonly string[]).includes(role)) {
      return { error: "Ungültige Rolle." };
    }

    const target = await db.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    if (!target) return { error: "Benutzer nicht gefunden." };
    if (target.role === "CLIENT") {
      return { error: "Kundenzugänge werden hier nicht verwaltet." };
    }

    // Der letzte aktive Admin darf sich nicht selbst die Rechte entziehen.
    if (target.role === "ADMIN" && role !== "ADMIN") {
      const remaining = await db.user.count({
        where: { role: "ADMIN", deactivatedAt: null, id: { not: userId } },
      });
      if (remaining === 0) {
        return { error: "Es muss mindestens ein aktiver Administrator bestehen bleiben." };
      }
      if (userId === actor.id) {
        return { error: "Sie können sich die Administratorrechte nicht selbst entziehen." };
      }
    }

    await db.user.update({ where: { id: userId }, data: { name, role } });
    revalidatePath(PATH);
    return { ok: true };
  });
}

export async function setTeamMemberActive(userId: string, active: boolean) {
  return guarded(async () => {
    const actor = await requireAdmin();

    const target = await db.user.findUnique({
      where: { id: userId },
      select: { role: true, deactivatedAt: true },
    });
    if (!target) return { error: "Benutzer nicht gefunden." };
    if (target.role === "CLIENT") {
      return { error: "Kundenzugänge werden hier nicht verwaltet." };
    }

    if (!active) {
      if (userId === actor.id) {
        return { error: "Sie können sich nicht selbst deaktivieren." };
      }
      if (target.role === "ADMIN") {
        const remaining = await db.user.count({
          where: { role: "ADMIN", deactivatedAt: null, id: { not: userId } },
        });
        if (remaining === 0) {
          return { error: "Es muss mindestens ein aktiver Administrator bestehen bleiben." };
        }
      }
    }

    await db.user.update({
      where: { id: userId },
      data: {
        deactivatedAt: active ? null : new Date(),
        // Beim Deaktivieren wird ein offener Einrichtungslink entwertet.
        ...(active ? {} : { resetToken: null, resetTokenExpiry: null }),
      },
    });

    revalidatePath(PATH);
    return { ok: true };
  });
}

/** Erzeugt einen neuen Einrichtungslink; der vorherige wird ungültig. */
export async function resendTeamSetupLink(userId: string) {
  return guarded(async () => {
    await requireAdmin();

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true, deactivatedAt: true },
    });
    if (!user) return { error: "Benutzer nicht gefunden." };
    if (user.role === "CLIENT") return { error: "Kundenzugänge werden hier nicht verwaltet." };
    if (user.deactivatedAt) return { error: "Das Konto ist deaktiviert." };

    const setupUrl = await issueSetupLink(user.id);
    let emailed = false;
    try {
      await sendPasswordResetEmail({ toEmail: user.email, resetUrl: setupUrl });
      emailed = true;
    } catch (err) {
      console.error("[team] Einrichtungs-E-Mail fehlgeschlagen:", err);
    }

    revalidatePath(PATH);
    return { ok: true, setupUrl, emailed };
  });
}
