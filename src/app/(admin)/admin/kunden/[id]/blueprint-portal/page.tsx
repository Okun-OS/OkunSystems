import { auth } from "@/auth";
import { db } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { sendBlueprintReportReady } from "@/lib/email";
import { logActivity } from "@/lib/activity/log";
import Link from "next/link";
import { FileText, Send, CheckCircle, Clock } from "lucide-react";

const MATURITY_CFG: Record<string, { cls: string }> = {
  INITIAL:    { cls: "bg-red-500/10 text-red-400 border-red-500/20" },
  DEVELOPING: { cls: "bg-orange-500/10 text-orange-400 border-orange-500/20" },
  DEFINED:    { cls: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" },
  MANAGED:    { cls: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  OPTIMIZED:  { cls: "bg-[#00b8ff]/10 text-[#00b8ff] border-[#00b8ff]/20" },
};

export default async function BlueprintPortalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if ((session.user as any).role !== "ADMIN") redirect("/dashboard");

  const { id } = await params;

  const company = await db.company.findUnique({
    where: { id },
    include: {
      analysisSessions: {
        where: { status: "COMPLETED" },
        include: { score: true },
        orderBy: { completedAt: "desc" },
      },
      users: {
        where: { role: { not: "ADMIN" } },
        select: { id: true, name: true, email: true },
      },
    },
  });

  if (!company) notFound();

  const adminId = (session.user as any).id as string;

  async function handlePublish(formData: FormData) {
    "use server";
    const scoreId = formData.get("scoreId") as string;
    const companyId = formData.get("companyId") as string;

    await db.okunScore.update({
      where: { id: scoreId },
      data: { isPublished: true, publishedAt: new Date() },
    });

    const comp = await db.company.findUnique({
      where: { id: companyId },
      select: {
        name: true,
        users: {
          where: { role: { not: "ADMIN" } },
          select: { name: true, email: true },
        },
      },
    });

    const portalUsers = comp?.users ?? [];

    const reportUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/portal/blueprint`;

    await Promise.allSettled(
      portalUsers.map((u) =>
        sendBlueprintReportReady({
          toEmail: u.email,
          toName: u.name ?? u.email,
          companyName: comp?.name ?? "",
          reportUrl,
        })
      )
    );

    await logActivity({
      companyId,
      userId: adminId,
      action: "blueprint.result_released",
      entityType: "OkunScore",
      entityId: scoreId,
      metadata: { notified: portalUsers.length },
    });

    revalidatePath(`/admin/kunden/${companyId}/blueprint-portal`);
  }

  const sessions = company.analysisSessions;
  const portalUserCount = company.users.length;

  return (
    <div className="space-y-6">
      {sessions.length === 0 ? (
        <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-8 text-center">
          <FileText size={32} className="text-[#333] mx-auto mb-3" />
          <p className="text-[#888] text-sm">Keine abgeschlossene Analyse vorhanden.</p>
          <p className="text-[#555] text-xs mt-1">
            Schliessen Sie zuerst eine Blueprint-Analyse ab.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {sessions.map((sess) => {
            const score = sess.score;
            if (!score) return null;

            const matCfg = MATURITY_CFG[score.maturityLevel] ?? MATURITY_CFG.INITIAL;
            const completedDate = sess.completedAt
              ? new Date(sess.completedAt).toLocaleDateString("de-DE", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })
              : "–";
            const publishedDate = score.publishedAt
              ? new Date(score.publishedAt).toLocaleDateString("de-DE", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })
              : null;

            return (
              <div
                key={sess.id}
                className="bg-[#0c1520] border border-[#1a2840] rounded-xl overflow-hidden"
              >
                <div className="px-6 py-5 flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-xl bg-[#101c2e] border border-[#1a2840] flex items-center justify-center flex-shrink-0">
                      <span className="text-[#00b8ff] text-xl font-black">
                        {score.totalScore}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[#f0f0f0] font-semibold text-sm">
                          OKUN Blueprint™ Analyse
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full border ${matCfg.cls}`}
                        >
                          {score.maturityLabel}
                        </span>
                      </div>
                      <p className="text-[#555] text-xs">
                        Abgeschlossen: {completedDate}
                      </p>
                      {score.isPublished && publishedDate && (
                        <p className="text-[#00b8ff] text-xs mt-0.5 flex items-center gap-1">
                          <CheckCircle size={11} />
                          Freigegeben am {publishedDate}
                        </p>
                      )}
                      {!score.isPublished && (
                        <p className="text-[#888] text-xs mt-0.5 flex items-center gap-1">
                          <Clock size={11} />
                          Noch nicht freigegeben
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Link
                      href={`/admin/kunden/${id}/analyse/bericht`}
                      className="flex items-center gap-1.5 px-3 py-2 text-xs text-[#888] hover:text-[#f0f0f0] border border-[#1a2840] hover:border-[#3a3a3a] rounded-lg transition-colors"
                    >
                      <FileText size={13} />
                      Bericht ansehen
                    </Link>

                    {!score.isPublished && (
                      <form action={handlePublish}>
                        <input type="hidden" name="scoreId" value={score.id} />
                        <input type="hidden" name="companyId" value={id} />
                        <button
                          type="submit"
                          className="flex items-center gap-1.5 px-3 py-2 bg-[#00b8ff] hover:bg-[#0099d6] text-white text-xs font-semibold rounded-lg transition-colors"
                        >
                          <Send size={13} />
                          Für Kunden freigeben
                          {portalUserCount > 0 && (
                            <span className="ml-1 opacity-70">
                              ({portalUserCount} Nutzer)
                            </span>
                          )}
                        </button>
                      </form>
                    )}
                  </div>
                </div>

                {/* Score breakdown */}
                <div className="px-6 pb-5 grid grid-cols-4 gap-3">
                  {[
                    { label: "Prozesse", val: score.scoreProcesses },
                    { label: "Vertrieb", val: score.scoreSales },
                    { label: "Führung", val: score.scoreLeadership },
                    { label: "Automation", val: score.scoreAutomation },
                    { label: "Struktur", val: score.scoreStructure },
                    { label: "Kommunikation", val: score.scoreCommunication },
                    { label: "Personal", val: score.scoreHr },
                  ].map((area) => {
                    if (area.val == null) return null;
                    const color =
                      area.val >= 65
                        ? "#00b8ff"
                        : area.val >= 50
                        ? "#f59e0b"
                        : "#ef4444";
                    return (
                      <div
                        key={area.label}
                        className="bg-[#060a10] border border-[#101c2e] rounded-lg p-3"
                      >
                        <p className="text-[#555] text-xs mb-1.5">{area.label}</p>
                        <p
                          className="text-lg font-bold tabular-nums"
                          style={{ color }}
                        >
                          {area.val}
                        </p>
                        <div className="h-1 bg-[#101c2e] rounded-full mt-1.5 overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${area.val}%`, backgroundColor: color }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {score.customerSummary && (
                  <div className="px-6 pb-5">
                    <div className="bg-[#060a10] border border-[#101c2e] rounded-lg p-4">
                      <p className="text-[#555] text-xs mb-1.5">Kunden-Zusammenfassung</p>
                      <p className="text-[#888] text-sm leading-relaxed">
                        {score.customerSummary}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {portalUserCount === 0 && sessions.length > 0 && (
        <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-4 flex items-start gap-3">
          <span className="text-yellow-400 text-xs mt-0.5">⚠</span>
          <div>
            <p className="text-yellow-400 text-sm font-medium">Keine Portal-Nutzer vorhanden</p>
            <p className="text-[#888] text-xs mt-0.5">
              Laden Sie zuerst Kunden-Nutzer über den{" "}
              <Link
                href={`/admin/kunden/${id}/portal`}
                className="text-yellow-400 hover:underline"
              >
                Portal-Tab
              </Link>{" "}
              ein, damit die Freigabe per E-Mail zugestellt werden kann.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
