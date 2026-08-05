import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";
import { ArrowLeft, Clock, User, Calendar, Video } from "lucide-react";

const SESSION_STATUS_LABELS: Record<string, string> = {
  closing_scheduled: "Termin geplant",
  in_progress: "Laufend",
  offer_presented: "Angebot gezeigt",
  agreement_reached: "Einigung erzielt",
  consent_given: "Consent erteilt",
  contract_closed: "Abgeschlossen",
  verloren: "Verloren",
};

export default async function ClosingWorkspacePage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");
  const userId = (session.user as { id: string }).id;
  const userRecord = await db.user.findUnique({ where: { id: userId } });
  if (!userRecord || (userRecord.role !== "ADMIN" && userRecord.role !== "CLOSER")) {
    redirect("/dashboard");
  }

  const closingSession = await db.closingSession.findUnique({
    where: { id: sessionId },
    include: {
      company: {
        select: {
          id: true,
          name: true,
          leadStatus: true,
          industry: true,
          contactPerson: true,
          contractValue: true,
          contractPackage: true,
        },
      },
      closer: { select: { id: true, name: true } },
      appointment: true,
    },
  });

  if (!closingSession) redirect("/admin/sales");
  if (userRecord.role === "CLOSER" && closingSession.closerId !== userId) {
    redirect("/admin/sales");
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

  const clientEmail = closingSession.appointment?.bookedByEmail;

  return (
    <div className="max-w-[1400px] mx-auto">
      <div className="mb-8">
        <Link
          href={`/admin/sales/leads/${closingSession.company.id}`}
          className="flex items-center gap-2 text-[#666] hover:text-[#f0f0f0] text-sm transition-colors mb-4"
        >
          <ArrowLeft size={14} />
          Zurück zum Lead
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#f0f0f0] mb-1">
              Closing Workspace — {closingSession.company.name}
            </h1>
            <p className="text-[#888] text-sm">
              Session {closingSession.id.slice(0, 8)}… ·{" "}
              <span className="text-[#00b8ff]">
                {SESSION_STATUS_LABELS[closingSession.status] ?? closingSession.status}
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-5">
          <div className="flex items-center gap-2 text-[#888] text-xs font-medium uppercase tracking-wide mb-2">
            <User size={13} />
            Closer
          </div>
          <div className="text-sm font-semibold text-[#f0f0f0]">{closingSession.closer.name}</div>
        </div>

        <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-5">
          <div className="flex items-center gap-2 text-[#888] text-xs font-medium uppercase tracking-wide mb-2">
            <Calendar size={13} />
            Termin
          </div>
          {formattedDate ? (
            <>
              <div className="text-sm font-semibold text-[#f0f0f0]">{formattedDate}</div>
              <div className="text-xs text-[#666] mt-0.5">{formattedTime} Uhr</div>
            </>
          ) : (
            <div className="text-sm text-[#555]">Kein Termin</div>
          )}
        </div>

        <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-5">
          <div className="flex items-center gap-2 text-[#888] text-xs font-medium uppercase tracking-wide mb-2">
            <Clock size={13} />
            Token läuft ab
          </div>
          <div className="text-sm font-semibold text-[#f0f0f0]">
            {closingSession.tokenExpiresAt.toLocaleDateString("de-DE")}
          </div>
          <div className="text-xs text-[#666] mt-0.5">
            {closingSession.tokenExpiresAt > new Date() ? (
              <span className="text-[#22c55e]">Gültig</span>
            ) : (
              <span className="text-[#ef4444]">Abgelaufen</span>
            )}
          </div>
        </div>

        <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-5">
          <div className="flex items-center gap-2 text-[#888] text-xs font-medium uppercase tracking-wide mb-2">
            <Video size={13} />
            Recording
          </div>
          <div className="text-sm font-semibold text-[#f0f0f0]">
            {closingSession.recordingStatus === "idle" ? "Nicht gestartet" : closingSession.recordingStatus}
          </div>
        </div>
      </div>

      {/* Client info */}
      <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-6 mb-6">
        <h2 className="text-sm font-semibold text-[#f0f0f0] mb-4">Kundeninformationen</h2>
        <div className="grid grid-cols-3 gap-6 text-sm">
          <div>
            <div className="text-xs text-[#666] mb-1">Unternehmen</div>
            <div className="text-[#f0f0f0]">{closingSession.company.name}</div>
          </div>
          {closingSession.company.industry && (
            <div>
              <div className="text-xs text-[#666] mb-1">Branche</div>
              <div className="text-[#f0f0f0]">{closingSession.company.industry}</div>
            </div>
          )}
          {closingSession.company.contactPerson && (
            <div>
              <div className="text-xs text-[#666] mb-1">Ansprechpartner</div>
              <div className="text-[#f0f0f0]">{closingSession.company.contactPerson}</div>
            </div>
          )}
          {clientEmail && (
            <div>
              <div className="text-xs text-[#666] mb-1">Kunden-E-Mail</div>
              <div className="text-[#f0f0f0]">{clientEmail}</div>
            </div>
          )}
          {closingSession.company.contractValue && (
            <div>
              <div className="text-xs text-[#666] mb-1">Vertragswert</div>
              <div className="text-[#f0f0f0] font-mono">
                € {(closingSession.company.contractValue / 100).toLocaleString("de-DE")}
              </div>
            </div>
          )}
          {closingSession.company.contractPackage && (
            <div>
              <div className="text-xs text-[#666] mb-1">Paket</div>
              <div className="text-[#f0f0f0]">{closingSession.company.contractPackage}</div>
            </div>
          )}
        </div>
      </div>

      {/* Phase 3 placeholder */}
      <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-12 text-center text-[#555] text-sm">
        <Video size={32} className="mx-auto mb-4 text-[#1a2840]" />
        Live-Call-Oberfläche, Angebot-Präsentation, Consent &amp; Recording kommen in Phase 3–6.
      </div>
    </div>
  );
}
