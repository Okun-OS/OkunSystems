import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import bcryptjs from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }

    const body = await req.json();
    const { companyName, industry, website, phone, address, contactName, contactEmail, contactPassword, plan } = body;

    if (!companyName || !contactEmail || !contactPassword || !contactName) {
      return NextResponse.json({ error: "Pflichtfelder fehlen" }, { status: 400 });
    }

    const existingUser = await db.user.findUnique({ where: { email: contactEmail } });
    if (existingUser) {
      return NextResponse.json({ error: "E-Mail-Adresse wird bereits verwendet" }, { status: 400 });
    }

    const hashedPassword = await bcryptjs.hash(contactPassword, 12);

    const company = await db.company.create({
      data: {
        name: companyName,
        industry: industry || null,
        website: website || null,
        phone: phone || null,
        address: address || null,
        plan: plan || null,
        status: "ONBOARDING",
        users: {
          create: {
            name: contactName,
            email: contactEmail,
            password: hashedPassword,
            role: "CLIENT",
            firstLogin: true,
          },
        },
      },
    });

    return NextResponse.json({ id: company.id });
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
