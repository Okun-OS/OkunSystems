import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import {
  Search,
  Plus,
  Building2,
  ChevronRight,
  Users,
  FolderKanban,
  FileText,
  MessageSquare,
} from "lucide-react";
import { formatDate, getStatusColor } from "@/lib/utils";
import { LinearProgress } from "@/components/ui/progress";

export default async function KundenPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; branche?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const params = await searchParams;
  const q = params.q ?? "";
  const statusFilter = params.status ?? "";
  const brancheFilter = params.branche ?? "";

  const companies = await db.company.findMany({
    where: {
      AND: [
        q
          ? {
              OR: [
                { name: { contains: q } },
                { industry: { contains: q } },
              ],
            }
          : {},
        statusFilter ? { status: statusFilter } : {},
        brancheFilter ? { industry: brancheFilter } : {},
      ],
    },
    include: {
      users: { where: { role: "CLIENT" }, take: 1 },
      projects: { orderBy: { updatedAt: "desc" }, take: 1 },
      /*
        Bewertung und OkunScore werden hier nicht mehr gelesen: Die Spalte
        „Score" stand bei jedem Betrieb auf „—", weil der Blueprint 2.0
        keinen schreibt. Mitzuladen, was niemand anzeigt, kostet bei jeder
        Kundenliste eine Abfrage mehr.
      */
      analysisSessions: {
        where: { blueprintVersion: "2.0" },
        orderBy: { updatedAt: "desc" },
        take: 1,
      },
      _count: {
        select: {
          projects: true,
          documents: true,
          appointments: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  const industries = await db.company
    .findMany({ select: { industry: true }, distinct: ["industry"] })
    .then((r) => r.map((c) => c.industry).filter(Boolean) as string[]);

  return (
    <div className="max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#f0f0f0]">Kunden</h1>
          <p className="text-[#888] text-sm mt-1">
            {companies.length} Unternehmen verwalten
          </p>
        </div>
        <Link
          href="/admin/kunden/neu"
          className="flex items-center gap-2 px-4 py-2.5 bg-[#00b8ff] hover:bg-[#0099d6] text-white text-sm font-semibold rounded-lg transition-colors"
        >
          <Plus size={15} />
          Kunde hinzufügen
        </Link>
      </div>

      {/* Search + Filters */}
      <form className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555]"
          />
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Kunden suchen…"
            className="w-full bg-[#0c1520] border border-[#1a2840] rounded-lg pl-9 pr-4 py-2.5 text-sm text-[#f0f0f0] placeholder-[#555] focus:outline-none focus:border-[#00b8ff]/50"
          />
        </div>

        <select
          name="branche"
          defaultValue={brancheFilter}
          className="bg-[#0c1520] border border-[#1a2840] rounded-lg px-3 py-2.5 text-sm text-[#888] focus:outline-none focus:border-[#00b8ff]/50 cursor-pointer"
        >
          <option value="">Alle Branchen</option>
          {industries.map((ind) => (
            <option key={ind} value={ind}>
              {ind}
            </option>
          ))}
        </select>

        <select
          name="status"
          defaultValue={statusFilter}
          className="bg-[#0c1520] border border-[#1a2840] rounded-lg px-3 py-2.5 text-sm text-[#888] focus:outline-none focus:border-[#00b8ff]/50 cursor-pointer"
        >
          <option value="">Alle Status</option>
          <option value="ACTIVE">Aktiv</option>
          <option value="ONBOARDING">Onboarding</option>
          <option value="INACTIVE">Inaktiv</option>
          <option value="PAUSED">Pausiert</option>
        </select>

        <button
          type="submit"
          className="px-4 py-2.5 bg-[#101c2e] border border-[#1a2840] hover:bg-[#222] text-sm text-[#f0f0f0] rounded-lg transition-colors"
        >
          Filtern
        </button>
      </form>

      {/*
        Die Liste der Betriebe — Zeilen, die Verweise *sind*.

        Vorher war es eine Tabelle, über deren Zeile ein unsichtbares
        `::after` lag, damit ein Klick irgendwo die Karte öffnet. Dieser
        Kniff hängt daran, dass `position: relative` auf einem `<tr>` einen
        Bezugspunkt schafft — in Chrome tut es das, in Safari nicht. Dort
        rutschte die Fläche nach oben auf die Seite und lag über allem:
        Jeder Klick, auch auf „Kunde hinzufügen", öffnete denselben Betrieb.

        Deshalb keine Tabelle mehr und kein Kniff: Jede Zeile ist ein
        einziger `<Link>` mit Rasterspalten. Das ist überall klickbar, mit
        der Tastatur erreichbar, und es gibt nichts mehr, was über etwas
        anderem liegen könnte.
      */}
      <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[940px]">
            <div
              className="grid gap-4 px-4 py-3 border-b border-[#1a2840]
                text-xs font-medium text-[#888]
                grid-cols-[minmax(200px,1.5fr)_minmax(110px,0.9fr)_minmax(170px,1.2fr)_96px_124px_minmax(150px,1fr)]"
            >
              {/*
                Sechs Spalten statt neun.

                „Score" stand bei jedem Betrieb auf „—": Die Zahl schreibt
                nur die alte Advisor-Analyse, der Blueprint 2.0 rechnet mit
                einer eigenen Engine und legt keinen OkunScore an.
                „Projekte" zählte dasselbe für alle, und die Aktionsspalte
                enthielt zwei Verweise auf Seiten, die jetzt ein Klick auf
                die Zeile öffnet, sowie einen Knopf ohne Funktion. Alles
                zusammen zwang die Liste ins seitliche Scrollen — und der
                Weg zum Kunden lag ganz rechts.
              */}
              {[
                "Kunde",
                "Branche",
                "Ansprechpartner",
                "Status",
                "Analyse",
                "Nächster Schritt",
              ].map((header) => (
                <span key={header} className="whitespace-nowrap">
                  {header}
                </span>
              ))}
            </div>

            {companies.length === 0 ? (
              <p className="px-4 py-12 text-center text-[#555] text-sm">
                Keine Kunden gefunden.
              </p>
            ) : (
              <div className="divide-y divide-[#111e30]">
                {companies.map((company) => {
                  const contact = company.users[0];
                  const project = company.projects[0];
                  const blueprintSession = company.analysisSessions[0];
                  const blueprintStatus = blueprintSession?.status ?? null;
                  const projectPhase = company.projectPhase;

                  return (
                    <Link
                      key={company.id}
                      href={`/admin/kunden/${company.id}`}
                      className="grid gap-4 px-4 py-3.5 items-center
                        hover:bg-[#101c2e] transition-colors group
                        grid-cols-[minmax(200px,1.5fr)_minmax(110px,0.9fr)_minmax(170px,1.2fr)_96px_124px_minmax(150px,1fr)]"
                    >
                      {/* Kunde */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-[#00b8ff]/10 border border-[#00b8ff]/20 flex items-center justify-center flex-shrink-0">
                          <span className="text-[#00b8ff] text-xs font-bold">
                            {company.name.charAt(0)}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-[#f0f0f0] truncate group-hover:text-[#00b8ff] transition-colors">
                            {company.name}
                          </p>
                          {company.plan ? (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-[#00b8ff]/10 border border-[#00b8ff]/20 text-[#00b8ff] capitalize">
                              {company.plan}
                            </span>
                          ) : (
                            <p className="text-xs text-[#888] truncate">
                              {company.website ?? "—"}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Branche */}
                      <span className="text-sm text-[#888] truncate">
                        {company.industry ?? "—"}
                      </span>

                      {/* Ansprechpartner */}
                      <div className="min-w-0">
                        {contact ? (
                          <>
                            <p className="text-sm text-[#f0f0f0] truncate">
                              {contact.name ?? "—"}
                            </p>
                            <p className="text-xs text-[#888] truncate">{contact.email}</p>
                          </>
                        ) : (
                          <span className="text-sm text-[#555]">—</span>
                        )}
                      </div>

                      {/* Status */}
                      <div>
                        <StatusPill status={company.status} />
                      </div>

                      {/* Blueprint */}
                      <div className="whitespace-nowrap">
                        {blueprintStatus === "COMPLETED" ? (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-[#00b8ff]/10 text-[#00b8ff] border border-[#00b8ff]/20">
                            Abgeschlossen
                          </span>
                        ) : blueprintStatus === "ACTIVE" || blueprintStatus === "PAUSED" ? (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                            In Bearbeitung
                          </span>
                        ) : (
                          <span className="text-xs text-[#555]">—</span>
                        )}
                      </div>

                      {/* Nächster Schritt */}
                      <span className="text-sm text-[#888] truncate">
                        {projectPhase === "onboarding"
                          ? "Onboarding abschließen"
                          : projectPhase === "blueprint"
                            ? "Blueprint ausfüllen"
                            : projectPhase === "internal_review"
                              ? "Auswertung erstellen"
                              : projectPhase === "strategy_session"
                                ? "Strategiegespräch führen"
                                : projectPhase === "learning"
                                  ? "Lerninhalte begleiten"
                                  : projectPhase === "implementation"
                                    ? "Implementierung begleiten"
                                    : projectPhase === "stabilization"
                                      ? "Stabilisierung"
                                      : projectPhase === "completed"
                                        ? "Abgeschlossen"
                                        : project?.status === "PLANNING"
                                          ? "Projekt starten"
                                          : project?.status === "IN_PROGRESS"
                                            ? "Analyse fortführen"
                                            : "Strategiegespräch"}
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Summary footer */}
      {companies.length > 0 && (
        <div className="mt-4 flex items-center justify-between text-xs text-[#888]">
          <span>
            {companies.length} Kunden angezeigt
          </span>
          <div className="flex items-center gap-4">
            <span>
              Aktiv:{" "}
              <span className="text-[#00b8ff]">
                {companies.filter((c) => c.status === "ACTIVE").length}
              </span>
            </span>
            <span>
              Onboarding:{" "}
              <span className="text-yellow-400">
                {companies.filter((c) => c.status === "ONBOARDING").length}
              </span>
            </span>
            <span>
              Inaktiv:{" "}
              <span className="text-[#555]">
                {companies.filter((c) => c.status === "INACTIVE").length}
              </span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const configs: Record<string, { label: string; cls: string }> = {
    ACTIVE: {
      label: "Aktiv",
      cls: "bg-[#00b8ff]/10 text-[#00b8ff] border-[#00b8ff]/20",
    },
    ONBOARDING: {
      label: "Onboarding",
      cls: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    },
    INACTIVE: {
      label: "Inaktiv",
      cls: "bg-[#888]/10 text-[#888] border-[#888]/20",
    },
    PAUSED: {
      label: "Pausiert",
      cls: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    },
  };
  const cfg = configs[status] ?? {
    label: status,
    cls: "bg-[#888]/10 text-[#888] border-[#888]/20",
  };
  return (
    <span
      className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full border ${cfg.cls}`}
    >
      {cfg.label}
    </span>
  );
}
