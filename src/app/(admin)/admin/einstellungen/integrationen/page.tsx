import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, AlertCircle, XCircle, RefreshCw } from "lucide-react";

export const dynamic = "force-dynamic";

type ServiceStatus = "ok" | "degraded" | "not_configured";

interface ServiceCheck {
  name: string;
  status: ServiceStatus;
  detail: string;
}

function statusIcon(status: ServiceStatus) {
  switch (status) {
    case "ok":
      return <CheckCircle2 size={16} className="text-[#22c55e] flex-shrink-0" />;
    case "degraded":
      return <AlertCircle size={16} className="text-yellow-400 flex-shrink-0" />;
    case "not_configured":
      return <XCircle size={16} className="text-[#555] flex-shrink-0" />;
  }
}

function statusBadge(status: ServiceStatus) {
  switch (status) {
    case "ok":
      return (
        <span className="text-xs px-2 py-0.5 rounded-full bg-[#22c55e]/10 border border-[#22c55e]/20 text-[#22c55e]">
          Verbunden
        </span>
      );
    case "degraded":
      return (
        <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-400">
          Eingeschränkt
        </span>
      );
    case "not_configured":
      return (
        <span className="text-xs px-2 py-0.5 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] text-[#555]">
          Nicht konfiguriert
        </span>
      );
  }
}

async function loadHealthData(): Promise<{ ok: boolean; checks: ServiceCheck[] }> {
  const baseUrl = process.env.NEXTAUTH_URL || process.env.APP_URL || "http://localhost:3000";

  // Run all checks inline to avoid an extra HTTP round-trip to ourselves
  const checks: ServiceCheck[] = [];

  // Database
  try {
    const { db } = await import("@/lib/db");
    await (db as any).$queryRaw`SELECT 1`;
    checks.push({ name: "Datenbank", status: "ok", detail: "Verbindung erfolgreich" });
  } catch (err) {
    checks.push({ name: "Datenbank", status: "degraded", detail: err instanceof Error ? err.message : "Verbindungsfehler" });
  }

  // R2
  const r2Missing = ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET_NAME", "R2_PUBLIC_URL"].filter(
    (k) => !process.env[k]
  );
  checks.push(
    r2Missing.length > 0
      ? { name: "Cloudflare R2", status: "not_configured", detail: `Fehlend: ${r2Missing.join(", ")}` }
      : { name: "Cloudflare R2", status: "ok", detail: `Bucket: ${process.env.R2_BUCKET_NAME}` }
  );

  // Resend
  checks.push(
    !process.env.RESEND_API_KEY
      ? { name: "Resend (E-Mail)", status: "not_configured", detail: "RESEND_API_KEY nicht gesetzt" }
      : { name: "Resend (E-Mail)", status: "ok", detail: `Von: ${process.env.EMAIL_FROM ?? "Standard"}` }
  );

  // Stripe
  const stripeMissing = ["STRIPE_SECRET_KEY", "STRIPE_CARE_PRICE_ID", "STRIPE_WEBHOOK_SECRET"].filter(
    (k) => !process.env[k]
  );
  checks.push(
    stripeMissing.length > 0
      ? { name: "Stripe", status: "not_configured", detail: `Fehlend: ${stripeMissing.join(", ")}` }
      : { name: "Stripe", status: "ok", detail: "Checkout + Webhook konfiguriert" }
  );

  // Daily
  const dailyMissing = ["DAILY_API_KEY", "DAILY_DOMAIN"].filter((k) => !process.env[k]);
  checks.push(
    dailyMissing.length > 0
      ? { name: "Daily.co (Video)", status: "not_configured", detail: `Fehlend: ${dailyMissing.join(", ")}` }
      : { name: "Daily.co (Video)", status: "ok", detail: `Domain: ${process.env.DAILY_DOMAIN}` }
  );

  // Auth
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  checks.push(
    !secret || secret.includes("please-set")
      ? { name: "Auth (JWT)", status: "degraded", detail: "Kein sicherer AUTH_SECRET — Standardwert aktiv" }
      : { name: "Auth (JWT)", status: "ok", detail: "AUTH_SECRET konfiguriert" }
  );

  // App URL
  const appUrl = process.env.NEXTAUTH_URL || process.env.APP_URL;
  checks.push(
    !appUrl
      ? { name: "App-URL / PDF", status: "not_configured", detail: "NEXTAUTH_URL oder APP_URL fehlt" }
      : { name: "App-URL / PDF", status: "ok", detail: appUrl }
  );

  const ok = checks.every((c) => c.status === "ok");
  return { ok, checks };
}

export default async function IntegrationenPage() {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN") redirect("/login");

  const { ok, checks } = await loadHealthData();

  const okCount = checks.filter((c) => c.status === "ok").length;
  const degradedCount = checks.filter((c) => c.status === "degraded").length;
  const errorCount = checks.filter((c) => c.status === "not_configured").length;

  return (
    <div className="max-w-[800px] mx-auto">
      <div className="mb-6">
        <Link
          href="/admin/einstellungen"
          className="inline-flex items-center gap-2 text-[#888] hover:text-[#f0f0f0] text-sm mb-5 transition-colors"
        >
          <ArrowLeft size={14} />
          Zurück zu Einstellungen
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#f0f0f0]">Integrationsstatus</h1>
            <p className="text-[#888] text-sm mt-1">Verbundene Dienste und Konfiguration</p>
          </div>
          <form method="GET" action="/admin/einstellungen/integrationen">
            <button
              type="submit"
              className="flex items-center gap-2 text-sm text-[#888] hover:text-[#f0f0f0] px-3 py-2 border border-[#2a2a2a] rounded-lg hover:bg-[#1a1a1a] transition-colors"
            >
              <RefreshCw size={13} />
              Neu laden
            </button>
          </form>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-4">
          <p className="text-[#22c55e] text-2xl font-bold">{okCount}</p>
          <p className="text-[#888] text-xs mt-0.5">Verbunden</p>
        </div>
        <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-4">
          <p className="text-yellow-400 text-2xl font-bold">{degradedCount}</p>
          <p className="text-[#888] text-xs mt-0.5">Eingeschränkt</p>
        </div>
        <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-4">
          <p className="text-[#555] text-2xl font-bold">{errorCount}</p>
          <p className="text-[#888] text-xs mt-0.5">Nicht konfiguriert</p>
        </div>
      </div>

      {/* Service list */}
      <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#2a2a2a]">
          <p className="text-[#f0f0f0] font-semibold text-sm">Dienste</p>
        </div>
        <div className="divide-y divide-[#1e1e1e]">
          {checks.map((check) => (
            <div key={check.name} className="px-5 py-4 flex items-center gap-4">
              {statusIcon(check.status)}
              <div className="flex-1 min-w-0">
                <p className="text-[#f0f0f0] text-sm font-medium">{check.name}</p>
                <p className="text-[#555] text-xs mt-0.5 truncate">{check.detail}</p>
              </div>
              {statusBadge(check.status)}
            </div>
          ))}
        </div>
      </div>

      {/* Environment variable reference */}
      <div className="mt-6 bg-[#141414] border border-[#2a2a2a] rounded-xl p-5">
        <h2 className="text-[#f0f0f0] font-semibold text-sm mb-4">Alle erforderlichen Umgebungsvariablen</h2>
        <div className="space-y-1 font-mono text-xs">
          {[
            ["Datenbank", "DATABASE_URL"],
            ["Auth", "AUTH_SECRET oder NEXTAUTH_SECRET"],
            ["Auth", "NEXTAUTH_URL oder APP_URL"],
            ["R2", "R2_ACCOUNT_ID"],
            ["R2", "R2_ACCESS_KEY_ID"],
            ["R2", "R2_SECRET_ACCESS_KEY"],
            ["R2", "R2_BUCKET_NAME"],
            ["R2", "R2_PUBLIC_URL"],
            ["E-Mail", "RESEND_API_KEY"],
            ["E-Mail", "EMAIL_FROM (optional, Default: noreply@okun-systems.de)"],
            ["E-Mail", "ADMIN_EMAIL (optional, Default: info@okun-systems.de)"],
            ["Stripe", "STRIPE_SECRET_KEY"],
            ["Stripe", "STRIPE_CARE_PRICE_ID"],
            ["Stripe", "STRIPE_WEBHOOK_SECRET"],
            ["Daily", "DAILY_API_KEY"],
            ["Daily", "DAILY_DOMAIN"],
          ].map(([category, key]) => (
            <div key={key} className="flex items-baseline gap-3 py-0.5">
              <span className="text-[#555] w-20 flex-shrink-0">{category}</span>
              <span className="text-[#888]">{key}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
