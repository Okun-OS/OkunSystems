"use server";

import { db } from "@/lib/db";
import bcryptjs from "bcryptjs";
import { logActivity } from "@/lib/activity/log";
import { sendInvitationEmail } from "@/lib/email";

const INVITATION_EXPIRY_HOURS = 24;

export async function createInvitation(params: {
  companyId: string;
  email: string;
  role: "CLIENT" | "CLIENT_ADMIN";
  createdById: string;
}): Promise<{ ok: true; token: string } | { ok: false; error: string }> {
  const { companyId, email, role, createdById } = params;

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) return { ok: false, error: "Diese E-Mail-Adresse ist bereits registriert." };

  const alreadyPending = await db.invitation.findFirst({
    where: { email, companyId, usedAt: null, expiresAt: { gt: new Date() } },
  });
  if (alreadyPending) return { ok: false, error: "Es gibt bereits eine offene Einladung für diese E-Mail." };

  const expiresAt = new Date(Date.now() + INVITATION_EXPIRY_HOURS * 60 * 60 * 1000);

  const invitation = await db.invitation.create({
    data: { email, companyId, role, createdById, expiresAt },
    include: { company: true },
  });

  const baseUrl = process.env.NEXTAUTH_URL ?? process.env.APP_URL ?? "https://okun-systems.de";
  const inviteUrl = `${baseUrl}/einladung/${invitation.token}`;

  await sendInvitationEmail({
    toEmail: email,
    companyName: invitation.company.name,
    inviteUrl,
    expiryHours: INVITATION_EXPIRY_HOURS,
  });

  await logActivity({
    companyId,
    userId: createdById,
    action: "invitation.sent",
    entityType: "Invitation",
    entityId: invitation.id,
    metadata: { email, role },
  });

  return { ok: true, token: invitation.token };
}

export async function acceptInvitation(params: {
  token: string;
  name: string;
  password: string;
}): Promise<{ ok: true; email: string } | { ok: false; error: string }> {
  const { token, name, password } = params;

  const invitation = await db.invitation.findUnique({
    where: { token },
    include: { company: true },
  });

  if (!invitation) return { ok: false, error: "Ungültige Einladung." };
  if (invitation.usedAt) return { ok: false, error: "Diese Einladung wurde bereits verwendet." };
  if (invitation.expiresAt < new Date()) return { ok: false, error: "Diese Einladung ist abgelaufen." };

  const existing = await db.user.findUnique({ where: { email: invitation.email } });
  if (existing) return { ok: false, error: "Diese E-Mail-Adresse ist bereits registriert." };

  const hashed = await bcryptjs.hash(password, 12);

  await db.$transaction([
    db.user.create({
      data: {
        email: invitation.email,
        name,
        password: hashed,
        role: invitation.role,
        portalRole: invitation.role === "CLIENT_ADMIN" ? "CLIENT_ADMIN" : null,
        companyId: invitation.companyId,
        firstLogin: true,
      },
    }),
    db.invitation.update({
      where: { id: invitation.id },
      data: { usedAt: new Date() },
    }),
  ]);

  await logActivity({
    companyId: invitation.companyId,
    action: "invitation.accepted",
    entityType: "Invitation",
    entityId: invitation.id,
    metadata: { email: invitation.email },
  });

  return { ok: true, email: invitation.email };
}

export async function revokeInvitation(
  invitationId: string
): Promise<void> {
  await db.invitation.delete({ where: { id: invitationId } });
}

export async function getInvitationByToken(token: string) {
  return db.invitation.findUnique({
    where: { token },
    include: { company: { select: { name: true } } },
  });
}
