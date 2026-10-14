import { NextRequest, NextResponse } from "next/server";
import { sendContactRequest } from "@/lib/email";

export const dynamic = "force-dynamic";

/**
 * Das Kontaktformular der Website.
 *
 * Öffentlich erreichbar — deshalb geht hier nichts in die Datenbank und nichts
 * an den Absender zurück: Die Nachricht landet ausschließlich im eigenen
 * Postfach. So lässt sich das Formular nicht als Versandweg für fremde Post
 * missbrauchen.
 */
export async function POST(request: NextRequest) {
  let body: {
    name?: string;
    company?: string;
    email?: string;
    phone?: string;
    topic?: string;
    message?: string;
    website?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });
  }

  // Der Honigtopf ist für Menschen unsichtbar. Ist er gefüllt, war es keiner —
  // beantwortet wird freundlich, gesendet wird nichts.
  if (body.website && body.website.trim().length > 0) {
    return NextResponse.json({ ok: true });
  }

  const name = body.name?.trim().slice(0, 120) ?? "";
  const company = body.company?.trim().slice(0, 160) ?? "";
  const email = body.email?.trim().slice(0, 160) ?? "";
  const phone = body.phone?.trim().slice(0, 60) ?? "";
  const topic = body.topic?.trim().slice(0, 120) ?? "";
  const message = body.message?.trim().slice(0, 4000) ?? "";

  if (!name || !company || !email) {
    return NextResponse.json(
      { error: "Bitte Name, Unternehmen und E-Mail angeben." },
      { status: 400 }
    );
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return NextResponse.json({ error: "Bitte eine gültige E-Mail-Adresse angeben." }, { status: 400 });
  }

  const sent = await sendContactRequest({ name, company, email, phone, topic, message });
  if (!sent.ok) {
    return NextResponse.json({ error: sent.error }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
