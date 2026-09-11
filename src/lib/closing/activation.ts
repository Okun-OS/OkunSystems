import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { sendContractClosedEmail } from "@/lib/email";
import { forwardPath, normalizeStatus } from "./state-machine";

/**
 * Kundenaktivierung — erfolgt ausschließlich nach bestätigter Zahlung und ist
 * idempotent: doppelte Webhooks oder Doppelklicks erzeugen weder zwei
 * Aktivierungen noch zwei Benutzerkonten.
 */

export type ActivationResult = {
  ok: boolean;
  alreadyActive: boolean;
  userCreated: boolean;
  error?: string;
};

export async function activateCustomer(input: {
  companyId: string;
  closingSessionId?: string | null;
  actorId?: string | null;
  source: "stripe_webhook" | "admin" | "system";
}): Promise<ActivationResult> {
  const company = await db.company.findUnique({
    where: { id: input.companyId },
    select: {
      id: true,
      name: true,
      status: true,
      activatedAt: true,
      contactEmail: true,
      contactFirstName: true,
      contactLastName: true,
      leadStatus: true,
    },
  });
  if (!company) return { ok: false, alreadyActive: false, userCreated: false, error: "Unternehmen nicht gefunden." };

  if (company.activatedAt) {
    return { ok: true, alreadyActive: true, userCreated: false };
  }

  const now = new Date();
  let userCreated = false;
  let passwordSetUrl: string | null = null;
  let recipientEmail: string | null = null;
  let recipientName: string | null = null;
  let closerName = "Ihr OKUN Team";

  const session = input.closingSessionId
    ? await db.closingSession.findUnique({
        where: { id: input.closingSessionId },
        select: {
          id: true,
          status: true,
          closer: { select: { name: true } },
          appointment: { select: { bookedByEmail: true, bookedByName: true } },
        },
      })
    : null;
  if (session?.closer?.name) closerName = session.closer.name;

  const email =
    company.contactEmail?.trim() || session?.appointment?.bookedByEmail?.trim() || null;
  const contactName =
    [company.contactFirstName, company.contactLastName].filter(Boolean).join(" ").trim() ||
    session?.appointment?.bookedByName ||
    company.name;

  try {
    await db.$transaction(async (tx) => {
      // Erneut innerhalb der Transaktion prüfen — schützt gegen Parallelläufe.
      const fresh = await tx.company.findUnique({
        where: { id: input.companyId },
        select: { activatedAt: true },
      });
      if (fresh?.activatedAt) return;

      await tx.company.update({
        where: { id: input.companyId },
        data: {
          status: "ACTIVE",
          leadStatus: "customer_activated",
          activatedAt: now,
          convertedAt: now,
        },
      });

      if (session) {
        const current = normalizeStatus(session.status);
        if (forwardPath(current, "customer_activated")) {
          await tx.closingSession.update({
            where: { id: session.id },
            data: { status: "customer_activated", activatedAt: now },
          });
        }
        await tx.closingEvent.create({
          data: {
            closingSessionId: session.id,
            companyId: input.companyId,
            actorId: input.actorId ?? null,
            eventType: "customer_activated",
            idempotencyKey: `customer_activated:${input.companyId}`,
            metadata: JSON.stringify({ source: input.source }),
          },
        });
      }

      if (email) {
        const existingUser = await tx.user.findUnique({ where: { email } });
        if (!existingUser) {
          const resetToken = randomBytes(32).toString("hex");
          await tx.user.create({
            data: {
              email,
              name: contactName,
              password: await bcrypt.hash(randomBytes(24).toString("hex"), 12),
              role: "CLIENT",
              companyId: input.companyId,
              resetToken,
              resetTokenExpiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
          });
          userCreated = true;
          const appUrl =
            process.env.NEXTAUTH_URL ?? process.env.APP_URL ?? "https://okun-systems.de";
          passwordSetUrl = `${appUrl}/passwort-reset/${resetToken}`;
          recipientEmail = email;
          recipientName = contactName;
        } else if (!existingUser.companyId) {
          await tx.user.update({
            where: { id: existingUser.id },
            data: { companyId: input.companyId },
          });
        }
      }
    });
  } catch (err) {
    // Unique-Verletzung auf dem Aktivierungs-Event = paralleler Lauf.
    if ((err as { code?: string }).code === "P2002") {
      return { ok: true, alreadyActive: true, userCreated: false };
    }
    console.error("[activation] Aktivierung fehlgeschlagen:", err);
    return {
      ok: false,
      alreadyActive: false,
      userCreated: false,
      error: err instanceof Error ? err.message : "Aktivierung fehlgeschlagen.",
    };
  }

  if (userCreated && recipientEmail && passwordSetUrl) {
    try {
      await sendContractClosedEmail({
        toEmail: recipientEmail,
        toName: recipientName ?? company.name,
        companyName: company.name,
        passwordSetUrl,
        closerName,
      });
    } catch (err) {
      console.error("[activation] Willkommens-E-Mail fehlgeschlagen:", err);
    }
  }

  return { ok: true, alreadyActive: false, userCreated };
}
