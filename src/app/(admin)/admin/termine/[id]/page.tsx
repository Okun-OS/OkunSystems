import { auth } from "@/auth";
import { db } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, CalendarDays, User, Mail, MapPin, FileText,
  Video, BookOpen, TrendingUp, CheckCircle, Clock,
} from "lucide-react";
import { assembleBlueprintReport } from "@/lib/blueprint/report-assembler";
import { CreateRoomButton } from "./TermineDetailClient";

function statusLabel(s: string) {
  switch (s) {
    case "SCHEDULED": return { label: "Geplant", cls: "text-blue-400 bg-blue-500/10 border-blue-500/20" };
    case "COMPLETED": return { label: "Durchgeführt", cls: "text-[#22c55e] bg-[#22c55e]/10 border-[#22c55e]/20" };
    case "CANCELLED": return { label: "Abgesagt", cls: "text-red-400 bg-red-500/10 border-red-500/20" };
    default: return { label: s, cls: "text-[#888] bg-[#1a1a1a] border-[#2a2a2a]" };
  }
}

const TIER_COLORS: Record<string, string> = {
  foundation: "#22c55e",
  operations: "#3b82f6",
  custom: "#a855f7",
};
const TIER_LABELS: Record<string, string> = {
  foundation: "Foundation",
  operations: "Operations",
  custom: "Custom Development",
};

export default async function TerminDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN") redirect("/login");

  const { id } = await params;

  const appointment = await db.appointment.findUnique({
    where: { id },
    include: {
      company: {
        select: {
          id: true,
          name: true,
          industry: true,
          plan: true,
          analysisSessions: {
            where: { blueprintVersion: "2.0", status: "COMPLETED" },
            orderBy: { completedAt: "desc" },
            take: 1,
            select: { id: true, status: true, completedAt: true },
          },
        },
      },
    },
  });

  if (!appointment) notFound();

  const sc = statusLabel(appointment.status);
  const company = appointment.company;
  const blueprintSession = company.analysisSessions[0] ?? null;

  // Load Blueprint 2.0 report data if session exists
  let reportData: Awaited<ReturnType<typeof assembleBlueprintReport>> | null = null;
  if (blueprintSession) {
    try {
      reportData = await assembleBlueprintReport(blueprintSession.id);
    } catch {
      // If report assembly fails, proceed without it
    }
  }

  // Load active learning assignments
  const learningAssignments = await db.customerLearningAssignment.findMany({
    where: { companyId: company.id, status: "active" },
    include: {
      chapter: {
        select: {
          title: true,
          lessons: {
            select: {
              id: true,
              progress: {
                where: { user: { companyId: company.id } },
                select: { status: true },
                take: 1,
              },
            },
          },
        },
      },
    },
    orderBy: { activatedAt: "desc" },
  });

  return (
    <div className="max-w-[1100px] mx-auto">
      {/* Back */}
      <Link
        href="/admin/termine"
        className="inline-flex items-center gap-2 text-[#888] hover:text-[#f0f0f0] text-sm mb-6 transition-colors"
      >
        <ArrowLeft size={15} />
        Zurück zu Termine
      </Link>

      {/* Header */}
      <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-6 mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs px-2 py-0.5 rounded-full border ${sc.cls}`}>{sc.label}</span>
              {appointment.type === "STRATEGY" && (
                <span className="text-xs px-2 py-0.5 rounded-full border text-purple-400 bg-purple-500/10 border-purple-500/20">
                  Strategiegespräch
                </span>
              )}
            </div>
            <h1 className="text-xl font-bold text-[#f0f0f0] mt-1">{appointment.title}</h1>
            <Link
              href={`/admin/kunden/${company.id}`}
              className="text-[#22c55e] text-sm hover:underline mt-0.5 inline-block"
            >
              {company.name}
            </Link>
          </div>
          <div className="text-right">
            <p className="text-[#f0f0f0] font-semibold">
              {new Date(appointment.startTime).toLocaleDateString("de-DE", {
                weekday: "long", day: "2-digit", month: "long", year: "numeric",
              })}
            </p>
            <p className="text-[#888] text-sm mt-0.5">
              {new Date(appointment.startTime).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
              {" – "}
              {new Date(appointment.endTime).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} Uhr
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          {appointment.bookedByName && (
            <div className="flex items-center gap-2 text-[#888]">
              <User size={13} className="text-[#555]" />
              <span>{appointment.bookedByName}</span>
            </div>
          )}
          {appointment.bookedByEmail && (
            <div className="flex items-center gap-2 text-[#888]">
              <Mail size={13} className="text-[#555]" />
              <span>{appointment.bookedByEmail}</span>
            </div>
          )}
          {appointment.location && (
            <div className="flex items-center gap-2 text-[#888]">
              <MapPin size={13} className="text-[#555]" />
              <span>{appointment.location}</span>
            </div>
          )}
          {appointment.description && (
            <div className="flex items-center gap-2 text-[#888] col-span-2">
              <FileText size={13} className="text-[#555]" />
              <span>{appointment.description}</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Left column */}
        <div className="col-span-12 lg:col-span-7 space-y-6">
          {/* Video room */}
          <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-5">
            <h2 className="text-[#f0f0f0] font-semibold text-sm mb-4 flex items-center gap-2">
              <Video size={15} className="text-blue-400" />
              Videokonferenz (Daily.co)
            </h2>
            <CreateRoomButton
              appointmentId={id}
              initialUrl={appointment.meetingUrl}
            />
            {!appointment.meetingUrl && (
              <p className="text-[#555] text-xs mt-3">
                Ein Daily.co-Raum wird für diesen Termin erstellt und der Link wird gespeichert.
                Der Raum läuft automatisch 1 Stunde nach dem geplanten Ende ab.
              </p>
            )}
          </div>

          {/* Blueprint context */}
          {reportData && (
            <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-5">
              <h2 className="text-[#f0f0f0] font-semibold text-sm mb-4 flex items-center gap-2">
                <TrendingUp size={15} className="text-[#22c55e]" />
                Blueprint 2.0 — Ergebnis
              </h2>

              {/* Overall score */}
              <div className="flex items-center justify-between mb-4 p-3 bg-[#0d0d0d] rounded-lg">
                <span className="text-[#888] text-sm">Gesamtergebnis</span>
                <span className="text-[#22c55e] text-2xl font-bold">
                  {reportData.moduleScores.length > 0
                    ? Math.round(
                        reportData.moduleScores.reduce((s, m) => s + m.score, 0) /
                          reportData.moduleScores.length
                      )
                    : 0}%
                </span>
              </div>

              {/* Module scores */}
              <div className="space-y-2 mb-4">
                {reportData.moduleScores.map((m) => (
                  <div key={m.moduleNumber}>
                    <div className="flex justify-between mb-1">
                      <span className="text-xs text-[#888]">
                        M{m.moduleNumber} · {m.label}
                      </span>
                      <span className="text-xs text-[#f0f0f0] font-semibold">{Math.round(m.score)}%</span>
                    </div>
                    <div className="h-1.5 bg-[#1e1e1e] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.round(m.score)}%`,
                          backgroundColor: m.moduleNumber === 5 ? "#3b82f6" : "#22c55e",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Signals */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                {(["WORKFORCE", "BEWAEHRTE_LOESUNG", "CUSTOM_DEVELOPMENT"] as const).map((cat) => {
                  const labels: Record<string, string> = {
                    WORKFORCE: "Workforce",
                    BEWAEHRTE_LOESUNG: "Bewährte Lsg.",
                    CUSTOM_DEVELOPMENT: "Custom Dev.",
                  };
                  return (
                    <div key={cat} className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg p-3 text-center">
                      <p className="text-[#f0f0f0] text-xl font-bold">{reportData!.signals[cat]}</p>
                      <p className="text-[#555] text-xs mt-0.5 leading-tight">{labels[cat]}</p>
                    </div>
                  );
                })}
              </div>

              {/* Package */}
              {reportData.packageType && (
                <div className="p-3 bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg">
                  <p className="text-[#888] text-xs mb-1">Empfohlenes Paket</p>
                  <p
                    className="text-sm font-semibold"
                    style={{ color: TIER_COLORS[reportData.packageType] ?? "#f0f0f0" }}
                  >
                    {TIER_LABELS[reportData.packageType] ?? reportData.packageType}
                  </p>
                </div>
              )}

              <Link
                href={`/blueprint/${blueprintSession!.id}/ergebnis`}
                className="flex items-center gap-1.5 text-xs text-[#22c55e] hover:underline mt-3"
                target="_blank"
              >
                Vollständige Ergebnisse ansehen →
              </Link>
            </div>
          )}

          {!reportData && (
            <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-5">
              <h2 className="text-[#f0f0f0] font-semibold text-sm mb-3 flex items-center gap-2">
                <TrendingUp size={15} className="text-[#555]" />
                Blueprint 2.0 — Kontext
              </h2>
              <p className="text-[#555] text-sm">
                {blueprintSession
                  ? "Ergebnisse werden noch aufbereitet."
                  : "Kein abgeschlossener Blueprint 2.0 vorhanden."}
              </p>
              <Link
                href={`/admin/kunden/${company.id}/blueprint-portal`}
                className="text-[#22c55e] text-xs hover:underline mt-2 inline-block"
              >
                Blueprint-Portal öffnen →
              </Link>
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="col-span-12 lg:col-span-5 space-y-6">
          {/* Lernfreigabe */}
          <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[#f0f0f0] font-semibold text-sm flex items-center gap-2">
                <BookOpen size={15} className="text-[#22c55e]" />
                Lernfreigabe
              </h2>
              <Link
                href={`/admin/kunden/${company.id}/lernen`}
                className="text-[#22c55e] text-xs hover:underline"
              >
                Verwalten →
              </Link>
            </div>

            {learningAssignments.length === 0 ? (
              <p className="text-[#555] text-sm">Noch keine Lerninhalte freigegeben.</p>
            ) : (
              <div className="space-y-2">
                {learningAssignments.map((a) => {
                  const total = a.chapter.lessons.length;
                  const done = a.chapter.lessons.filter((l) => l.progress[0]?.status === "completed").length;
                  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
                  return (
                    <div key={a.id} className="flex items-center gap-3 p-2.5 bg-[#0d0d0d] rounded-lg">
                      {pct === 100 ? (
                        <CheckCircle size={13} className="text-[#22c55e] flex-shrink-0" />
                      ) : (
                        <Clock size={13} className="text-[#555] flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-[#f0f0f0] text-xs font-medium truncate">{a.chapter.title}</p>
                        <p className="text-[#555] text-xs">{done}/{total} Lektionen · {pct}%</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Notes */}
          {appointment.notes && (
            <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-5">
              <h2 className="text-[#f0f0f0] font-semibold text-sm mb-3">Notizen</h2>
              <p className="text-[#888] text-sm leading-relaxed whitespace-pre-wrap">{appointment.notes}</p>
            </div>
          )}

          {/* Quick links */}
          <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-5">
            <h2 className="text-[#888] text-xs font-semibold uppercase tracking-wide mb-3">
              Kundenlinks
            </h2>
            <div className="space-y-1.5">
              <Link
                href={`/admin/kunden/${company.id}`}
                className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-[#1a1a1a] text-sm text-[#888] hover:text-[#f0f0f0] transition-colors"
              >
                Kundenübersicht
                <span className="text-[#555] text-xs">→</span>
              </Link>
              <Link
                href={`/admin/kunden/${company.id}/lernen`}
                className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-[#1a1a1a] text-sm text-[#888] hover:text-[#f0f0f0] transition-colors"
              >
                Lernverwaltung
                <span className="text-[#555] text-xs">→</span>
              </Link>
              <Link
                href={`/admin/kunden/${company.id}/dokumente`}
                className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-[#1a1a1a] text-sm text-[#888] hover:text-[#f0f0f0] transition-colors"
              >
                Dokumente
                <span className="text-[#555] text-xs">→</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
