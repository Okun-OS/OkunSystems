import { auth } from "@/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

type ServiceStatus = "ok" | "degraded" | "not_configured";

interface ServiceCheck {
  name: string;
  status: ServiceStatus;
  detail: string;
}

async function checkDatabase(): Promise<ServiceCheck> {
  try {
    await db.$queryRaw`SELECT 1`;
    return { name: "Datenbank", status: "ok", detail: "Verbindung erfolgreich" };
  } catch (err) {
    return { name: "Datenbank", status: "degraded", detail: err instanceof Error ? err.message : "Verbindungsfehler" };
  }
}

function checkR2(): ServiceCheck {
  const missing: string[] = [];
  if (!process.env.R2_ACCOUNT_ID) missing.push("R2_ACCOUNT_ID");
  if (!process.env.R2_ACCESS_KEY_ID) missing.push("R2_ACCESS_KEY_ID");
  if (!process.env.R2_SECRET_ACCESS_KEY) missing.push("R2_SECRET_ACCESS_KEY");
  if (!process.env.R2_BUCKET_NAME) missing.push("R2_BUCKET_NAME");
  if (!process.env.R2_PUBLIC_URL) missing.push("R2_PUBLIC_URL");

  if (missing.length > 0) {
    return { name: "Cloudflare R2", status: "not_configured", detail: `Fehlende Variablen: ${missing.join(", ")}` };
  }
  return { name: "Cloudflare R2", status: "ok", detail: `Bucket: ${process.env.R2_BUCKET_NAME}` };
}

function checkResend(): ServiceCheck {
  if (!process.env.RESEND_API_KEY) {
    return { name: "Resend (E-Mail)", status: "not_configured", detail: "RESEND_API_KEY nicht gesetzt" };
  }
  return { name: "Resend (E-Mail)", status: "ok", detail: `Absender: ${process.env.EMAIL_FROM ?? "Standard"}` };
}

function checkStripe(): ServiceCheck {
  const missing: string[] = [];
  if (!process.env.STRIPE_SECRET_KEY) missing.push("STRIPE_SECRET_KEY");
  if (!process.env.STRIPE_CARE_PRICE_ID) missing.push("STRIPE_CARE_PRICE_ID");
  if (!process.env.STRIPE_WEBHOOK_SECRET) missing.push("STRIPE_WEBHOOK_SECRET");

  if (missing.length > 0) {
    return { name: "Stripe", status: "not_configured", detail: `Fehlende Variablen: ${missing.join(", ")}` };
  }
  return { name: "Stripe", status: "ok", detail: "Checkout + Webhook konfiguriert" };
}

function checkDaily(): ServiceCheck {
  const missing: string[] = [];
  if (!process.env.DAILY_API_KEY) missing.push("DAILY_API_KEY");
  if (!process.env.DAILY_DOMAIN) missing.push("DAILY_DOMAIN");

  if (missing.length > 0) {
    return { name: "Daily.co (Video)", status: "not_configured", detail: `Fehlende Variablen: ${missing.join(", ")}` };
  }
  return { name: "Daily.co (Video)", status: "ok", detail: `Domain: ${process.env.DAILY_DOMAIN}` };
}

function checkAuth(): ServiceCheck {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret || secret.includes("please-set")) {
    return { name: "Auth (JWT)", status: "degraded", detail: "Kein sicherer AUTH_SECRET gesetzt — Standardwert aktiv" };
  }
  return { name: "Auth (JWT)", status: "ok", detail: "AUTH_SECRET konfiguriert" };
}

function checkPDF(): ServiceCheck {
  const url = process.env.NEXTAUTH_URL || process.env.APP_URL;
  if (!url) {
    return { name: "PDF-Generierung", status: "not_configured", detail: "NEXTAUTH_URL / APP_URL nicht gesetzt" };
  }
  return { name: "PDF-Generierung", status: "ok", detail: `Basis-URL: ${url}` };
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [dbCheck, ...staticChecks] = await Promise.all([
    checkDatabase(),
    Promise.resolve(checkR2()),
    Promise.resolve(checkResend()),
    Promise.resolve(checkStripe()),
    Promise.resolve(checkDaily()),
    Promise.resolve(checkAuth()),
    Promise.resolve(checkPDF()),
  ]);

  const checks: ServiceCheck[] = [dbCheck, ...staticChecks];
  const allOk = checks.every((c) => c.status === "ok");

  return NextResponse.json({ ok: allOk, checks });
}
