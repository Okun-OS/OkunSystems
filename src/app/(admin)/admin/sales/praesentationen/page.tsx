import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Monitor } from "lucide-react";
import { db } from "@/lib/db";
import { getActor } from "@/lib/auth-guards";
import { PRESENTATION_STATUS_LABELS } from "@/lib/closing/presentation-types";
import { ReviewActions } from "./ReviewActions";

/**
 * Freigabe von Präsentationen.
 *
 * Berater bereiten ihre Folien im jeweiligen Closing vor; hier laufen alle
 * eingereichten Präsentationen zusammen, damit die Freigabe nicht in jedem
 * Abschluss einzeln gesucht werden muss.
 */
export default async function PraesentationenPage() {
  const actor = await getActor();
  if (!actor) redirect("/login");
  if (actor.role !== "ADMIN") redirect("/admin/sales");

  const presentations = await db.closingPresentation.findMany({
    where: { status: { in: ["submitted", "approved"] } },
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    include: {
      createdBy: { select: { name: true } },
      approvedBy: { select: { name: true } },
      company: { select: { name: true } },
      slides: { orderBy: { position: "asc" }, select: { id: true, title: true, fileName: true } },
    },
  });

  const pending = presentations.filter((p) => p.status === "submitted");
  const approved = presentations.filter((p) => p.status === "approved");

  return (
    <div className="max-w-[1000px]">
      <Link
        href="/admin/sales"
        className="flex items-center gap-2 text-[#8899b4] hover:text-[#eef2f7] text-sm transition-colors mb-4"
      >
        <ArrowLeft size={14} /> Zurück zum Vertrieb
      </Link>

      <h1 className="text-2xl font-bold text-[#eef2f7] mb-1">Präsentationen freigeben</h1>
      <p className="text-[#8899b4] text-sm max-w-2xl mb-6">
        Erst eine freigegebene Präsentation lässt sich im Gespräch starten — und erst dann liefert
        der Server ihre Folien an den Kunden aus.
      </p>

      <h2 className="text-[#8899b4] text-xs font-bold uppercase tracking-wider mb-3">
        Wartet auf Freigabe ({pending.length})
      </h2>
      {pending.length === 0 ? (
        <div className="rounded-xl border border-[#1a2840] bg-[#0c1520] px-5 py-8 text-center mb-8">
          <Monitor size={20} className="text-[#3f4d63] mx-auto mb-2" />
          <p className="text-[#8899b4] text-sm">Derzeit liegt nichts zur Freigabe vor.</p>
        </div>
      ) : (
        <div className="space-y-3 mb-8">
          {pending.map((presentation) => (
            <div
              key={presentation.id}
              className="rounded-xl border border-[#f59e0b]/25 bg-[#0c1520] px-5 py-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-[#eef2f7] text-sm font-semibold">{presentation.title}</h3>
                  <p className="text-[#5b6b7f] text-xs mt-1">
                    {presentation.company?.name ?? "ohne Kundenzuordnung"} ·{" "}
                    {presentation.createdBy.name ?? "unbekannt"} · {presentation.slides.length}{" "}
                    Folie(n)
                  </p>
                  {presentation.description && (
                    <p className="text-[#8899b4] text-xs mt-1">{presentation.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {presentation.closingSessionId && (
                    <Link
                      href={`/admin/sales/closing/${presentation.closingSessionId}`}
                      className="px-3 py-1.5 rounded-lg border border-[#1a2840] text-[#8899b4] text-xs hover:text-[#eef2f7] transition-colors"
                    >
                      Zum Abschluss
                    </Link>
                  )}
                  <ReviewActions presentationId={presentation.id} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <h2 className="text-[#8899b4] text-xs font-bold uppercase tracking-wider mb-3">
        Freigegeben ({approved.length})
      </h2>
      <div className="space-y-2">
        {approved.length === 0 && (
          <p className="text-[#5b6b7f] text-sm">Noch nichts freigegeben.</p>
        )}
        {approved.map((presentation) => (
          <div
            key={presentation.id}
            className="rounded-lg border border-[#1a2840] bg-[#0a1119] px-4 py-3 flex flex-wrap items-center justify-between gap-3"
          >
            <div className="min-w-0">
              <p className="text-[#eef2f7] text-sm">{presentation.title}</p>
              <p className="text-[#5b6b7f] text-xs">
                {presentation.company?.name ?? "ohne Kundenzuordnung"} ·{" "}
                {PRESENTATION_STATUS_LABELS[presentation.status]}
                {presentation.approvedBy?.name && ` von ${presentation.approvedBy.name}`}
                {presentation.approvedAt &&
                  ` am ${presentation.approvedAt.toLocaleDateString("de-DE")}`}
              </p>
            </div>
            {presentation.closingSessionId && (
              <Link
                href={`/admin/sales/closing/${presentation.closingSessionId}`}
                className="px-3 py-1.5 rounded-lg border border-[#1a2840] text-[#8899b4] text-xs hover:text-[#eef2f7] transition-colors flex-shrink-0"
              >
                Zum Abschluss
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
