import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { sendInvitationEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const adminUserId = (session.user as any).id as string;
    const body = await req.json();
    const { companyName, industry, website, phone, address, contactName, contactEmail, plan } = body;

    if (!companyName || !contactEmail || !contactName) {
      return NextResponse.json({ error: "Pflichtfelder fehlen" }, { status: 400 });
    }

    const existingUser = await db.user.findUnique({ where: { email: contactEmail } });
    if (existingUser) {
      return NextResponse.json({ error: "E-Mail-Adresse wird bereits verwendet" }, { status: 400 });
    }

    // Create company only — no user created directly
    const company = await db.company.create({
      data: {
        name: companyName,
        industry: industry || null,
        website: website || null,
        phone: phone || null,
        address: address || null,
        contactPerson: contactName,
        plan: plan || null,
        status: "ONBOARDING",
        projectPhase: "onboarding",
      },
    });

    // Create invitation token (24h expiry)
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const invitation = await db.invitation.create({
      data: {
        email: contactEmail,
        companyId: company.id,
        role: "CLIENT",
        createdById: adminUserId,
        expiresAt,
      },
    });

    const baseUrl = process.env.NEXTAUTH_URL ?? process.env.APP_URL ?? "";
    const inviteUrl = baseUrl ? `${baseUrl}/einladung/${invitation.token}` : null;

    let invitationSent = false;
    let invitationError: string | null = null;

    if (inviteUrl && process.env.RESEND_API_KEY) {
      try {
        await sendInvitationEmail({
          toEmail: contactEmail,
          companyName: companyName,
          inviteUrl,
          expiryHours: 24,
        });
        invitationSent = true;
      } catch (emailErr) {
        console.error("[/api/companies] Invitation email failed:", emailErr);
        invitationError = "E-Mail konnte nicht gesendet werden. Bitte Einladung manuell übermitteln.";
      }
    } else if (!process.env.RESEND_API_KEY) {
      invitationError = "Resend ist nicht konfiguriert (RESEND_API_KEY fehlt). Einladung muss manuell übermittelt werden.";
    } else {
      invitationError = "APP_URL / NEXTAUTH_URL fehlt. Einladungslink konnte nicht generiert werden.";
    }

    return NextResponse.json({
      id: company.id,
      invitationSent,
      invitationToken: invitation.token,
      inviteUrl: inviteUrl ?? null,
      invitationError,
    });
  } catch (error) {
    console.error("Company creation error:", error);
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const companies = await db.company.findMany({
      include: { users: { where: { role: "CLIENT" }, select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(companies);
  } catch {
    return NextResponse.json({ error: "Interner Serverfehler" }, { status: 500 });
  }
}
