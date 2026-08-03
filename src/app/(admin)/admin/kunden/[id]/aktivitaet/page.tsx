import { auth } from "@/auth";
import { db } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { Activity } from "lucide-react";

const ACTION_LABELS: Record<string, string> = {
  "document.uploaded":           "Dokument hochgeladen",
  "document.visibility_changed": "Dokumentsichtbarkeit geändert",
  "document.deleted":            "Dokument gelöscht",
  "invitation.created":          "Einladung versandt",
  "invitation.accepted":         "Einladung angenommen",
  "invitation.revoked":          "Einladung widerrufen",
  "learning.assignment.suggested":  "Lerninhalt vorgeschlagen",
  "learning.assignment.activated":  "Lerninhalt aktiviert",
  "learning.assignment.rejected":   "Lerninhalt abgelehnt",
  "blueprint.result_released":   "Blueprint-Bericht freigegeben",
  "note.updated":                "Notiz aktualisiert",
  "portal.project.visibility_changed": "Projektsichtbarkeit geändert",
};

function formatAction(action: string): string {
  return ACTION_LABELS[action] ?? action;
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function actionColor(action: string): string {
  if (action.includes("deleted") || action.includes("revoked") || action.includes("rejected")) {
    return "bg-red-500/10 border-red-500/20 text-red-400";
  }
  if (action.includes("published") || action.includes("activated") || action.includes("accepted")) {
    return "bg-[#00b8ff]/10 border-[#00b8ff]/20 text-[#00b8ff]";
  }
  if (action.includes("suggested") || action.includes("created")) {
    return "bg-blue-500/10 border-blue-500/20 text-blue-400";
  }
  return "bg-[#888]/10 border-[#888]/20 text-[#888]";
}

function actionDot(action: string): string {
  if (action.includes("deleted") || action.includes("revoked") || action.includes("rejected")) {
    return "bg-red-500";
  }
  if (action.includes("published") || action.includes("activated") || action.includes("accepted")) {
    return "bg-[#00b8ff]";
  }
  if (action.includes("suggested") || action.includes("created")) {
    return "bg-blue-400";
  }
  return "bg-[#555]";
}

export default async function AktivitaetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if ((session.user as any).role !== "ADMIN") redirect("/dashboard");

  const { id } = await params;

  const company = await db.company.findUnique({ where: { id }, select: { id: true } });
  if (!company) notFound();

  const logs = await db.activityLog.findMany({
    where: { companyId: id },
    include: { user: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div className="space-y-1">
      {logs.length === 0 ? (
        <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-8 text-center">
          <Activity size={32} className="text-[#333] mx-auto mb-3" />
          <p className="text-[#888] text-sm">Noch keine Aktivitäten vorhanden.</p>
        </div>
      ) : (
        <div className="relative">
          <div className="absolute left-[19px] top-0 bottom-0 w-px bg-[#1a2840]" />

          <div className="space-y-0">
            {logs.map((log, idx) => {
              let meta: Record<string, unknown> = {};
              try {
                meta = JSON.parse(log.metadata);
              } catch {}

              const isLast = idx === logs.length - 1;

              return (
                <div key={log.id} className="flex items-start gap-4 pl-0 relative pb-4">
                  <div
                    className={`w-[9px] h-[9px] rounded-full mt-[5px] flex-shrink-0 relative z-10 ml-[15px] ring-2 ring-[#080c14] ${actionDot(log.action)}`}
                  />

                  <div className="flex-1 min-w-0 bg-[#0c1520] border border-[#1a2840] rounded-xl p-4 hover:border-[#3a3a3a] transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full border font-medium ${actionColor(log.action)}`}
                          >
                            {formatAction(log.action)}
                          </span>
                        </div>

                        {log.user && (
                          <p className="text-[#555] text-xs mt-1.5">
                            {log.user.name ?? log.user.email}
                          </p>
                        )}

                        {Object.keys(meta).length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {Object.entries(meta).map(([k, v]) => (
                              <span
                                key={k}
                                className="text-[#555] text-xs bg-[#060a10] border border-[#101c2e] rounded px-2 py-0.5"
                              >
                                {k}:{" "}
                                <span className="text-[#888]">
                                  {typeof v === "object" ? JSON.stringify(v) : String(v)}
                                </span>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <time className="text-[#555] text-xs flex-shrink-0 tabular-nums">
                        {formatDate(log.createdAt)}
                      </time>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
