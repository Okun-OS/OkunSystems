import { db } from "@/lib/db";
import { createHash } from "crypto";
import { notFound } from "next/navigation";

export default async function ClosingClientPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const tokenHash = createHash("sha256").update(token).digest("hex");
  const closingSession = await db.closingSession.findUnique({
    where: { clientTokenHash: tokenHash },
    include: {
      company: { select: { name: true } },
      closer: { select: { name: true } },
      appointment: { select: { startTime: true, endTime: true, title: true, bookedByName: true } },
    },
  });

  if (!closingSession) notFound();

  if (new Date() > closingSession.tokenExpiresAt) {
    return (
      <div className="min-h-screen bg-[#080d14] flex items-center justify-center">
        <div className="max-w-md mx-auto text-center px-6">
          <div className="text-[#ef4444] text-5xl mb-6">⏱</div>
          <h1 className="text-xl font-bold text-[#f0f0f0] mb-3">Link abgelaufen</h1>
          <p className="text-[#888] text-sm leading-relaxed">
            Dieser Einladungslink ist nicht mehr gültig. Bitte kontaktieren Sie Ihren Berater,
            um einen neuen Link zu erhalten.
          </p>
        </div>
      </div>
    );
  }

  const scheduledAt = closingSession.appointment?.startTime;
  const formattedDate = scheduledAt
    ? scheduledAt.toLocaleDateString("de-DE", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : null;
  const formattedTime = scheduledAt
    ? scheduledAt.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })
    : null;

  const clientName = closingSession.appointment?.bookedByName ?? closingSession.company.name;

  return (
    <div className="min-h-screen bg-[#080d14] flex items-center justify-center p-4">
      <div className="max-w-lg mx-auto w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[rgba(0,184,255,0.1)] border border-[rgba(0,184,255,0.2)] mb-4">
            <span className="text-2xl">🤝</span>
          </div>
          <h1 className="text-2xl font-bold text-[#f0f0f0] mb-2">
            Willkommen, {clientName}
          </h1>
          <p className="text-[#888] text-sm">
            Sie sind zum Strategiegespräch mit <strong className="text-[#f0f0f0]">OKUN Systems</strong> eingeladen.
          </p>
        </div>

        {/* Session card */}
        <div className="bg-[#0c1520] border border-[#1a2840] rounded-2xl p-6 mb-6">
          <div className="text-xs font-medium text-[#666] uppercase tracking-wide mb-4">Gesprächsdetails</div>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#0e1a28] text-[#00b8ff] flex-shrink-0">
                🏢
              </div>
              <div>
                <div className="text-xs text-[#555] mb-0.5">Unternehmen</div>
                <div className="text-sm font-medium text-[#f0f0f0]">{closingSession.company.name}</div>
              </div>
            </div>

            {closingSession.closer.name && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#0e1a28] text-[#00b8ff] flex-shrink-0">
                  👤
                </div>
                <div>
                  <div className="text-xs text-[#555] mb-0.5">Ihr Berater</div>
                  <div className="text-sm font-medium text-[#f0f0f0]">{closingSession.closer.name}</div>
                </div>
              </div>
            )}

            {formattedDate && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#0e1a28] text-[#00b8ff] flex-shrink-0">
                  📅
                </div>
                <div>
                  <div className="text-xs text-[#555] mb-0.5">Termin</div>
                  <div className="text-sm font-medium text-[#f0f0f0]">{formattedDate}</div>
                  <div className="text-xs text-[#888]">{formattedTime} Uhr</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Status */}
        <div className="bg-[#0c1520] border border-[#1a2840] rounded-2xl p-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[rgba(0,184,255,0.1)] border border-[rgba(0,184,255,0.15)] text-[#00b8ff] text-xs font-medium mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00b8ff] animate-pulse" />
            Ihr Gespräch wird vorbereitet
          </div>
          <p className="text-[#666] text-sm leading-relaxed">
            Die vollständige Gesprächs-Oberfläche wird in Kürze für Sie freigeschaltet.
            Sie erhalten eine weitere Benachrichtigung, sobald das Gespräch beginnt.
          </p>
          <div className="mt-4 text-xs text-[#444] font-mono">
            Session: {closingSession.id.slice(0, 8)}…
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs text-[#444]">
            OKUN Systems · Bei Fragen: <a href="mailto:info@okun-systems.de" className="text-[#666] hover:text-[#888]">info@okun-systems.de</a>
          </p>
        </div>
      </div>
    </div>
  );
}
