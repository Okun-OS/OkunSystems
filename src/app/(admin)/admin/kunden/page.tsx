import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import {
  Search,
  Plus,
  Building2,
  MoreHorizontal,
  ExternalLink,
  ChevronRight,
  Users,
  FolderKanban,
  FileText,
  MessageSquare,
  Pencil,
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
      assessments: { orderBy: { updatedAt: "desc" }, take: 1 },
      analysisSessions: {
        where: { blueprintVersion: "2.0" },
        include: { score: true },
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
        <a
          href="/admin/kunden/neu"
          className="flex items-center gap-2 px-4 py-2.5 bg-[#22c55e] hover:bg-[#16a34a] text-black text-sm font-semibold rounded-lg transition-colors"
        >
          <Plus size={15} />
          Kunde hinzufügen
        </a>
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
            className="w-full bg-[#141414] border border-[#2a2a2a] rounded-lg pl-9 pr-4 py-2.5 text-sm text-[#f0f0f0] placeholder-[#555] focus:outline-none focus:border-[#22c55e]/50"
          />
        </div>

        <select
          name="branche"
          defaultValue={brancheFilter}
          className="bg-[#141414] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-sm text-[#888] focus:outline-none focus:border-[#22c55e]/50 cursor-pointer"
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
          className="bg-[#141414] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-sm text-[#888] focus:outline-none focus:border-[#22c55e]/50 cursor-pointer"
        >
          <option value="">Alle Status</option>
          <option value="ACTIVE">Aktiv</option>
          <option value="ONBOARDING">Onboarding</option>
          <option value="INACTIVE">Inaktiv</option>
          <option value="PAUSED">Pausiert</option>
        </select>

        <button
          type="submit"
          className="px-4 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] hover:bg-[#222] text-sm text-[#f0f0f0] rounded-lg transition-colors"
        >
          Filtern
        </button>
      </form>

      {/* Table */}
      <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#2a2a2a]">
                {[
                  "Kunde",
                  "Branche",
                  "Ansprechpartner",
                  "Status",
                  "Analyse",
                  "Score",
                  "Projekte",
                  "Nächster Schritt",
                  "",
                ].map((header) => (
                  <th
                    key={header}
                    className="text-left text-xs font-medium text-[#888] px-4 py-3 whitespace-nowrap"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e1e1e]">
              {companies.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-4 py-12 text-center text-[#555] text-sm"
                  >
                    Keine Kunden gefunden.
                  </td>
                </tr>
              ) : (
                companies.map((company) => {
                  const contact = company.users[0];
                  const project = company.projects[0];
                  const assessment = company.assessments[0];
                  const blueprintSession = company.analysisSessions[0];
                  // Single source of truth: prefer OkunScore from Blueprint session, then Assessment
                  const score = blueprintSession?.score?.totalScore ?? assessment?.score ?? null;
                  const blueprintStatus = blueprintSession?.status ?? null;
                  const projectPhase = company.projectPhase;

                  return (
                    <tr
                      key={company.id}
                      className="hover:bg-[#1a1a1a] transition-colors group"
                    >
                      {/* Kunde */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-[#22c55e]/10 border border-[#22c55e]/20 flex items-center justify-center flex-shrink-0">
                            <span className="text-[#22c55e] text-xs font-bold">
                              {company.name.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-[#f0f0f0] whitespace-nowrap">
                              {company.name}
                            </p>
                            {company.plan ? (
                              <span className="text-xs px-1.5 py-0.5 rounded bg-[#22c55e]/10 border border-[#22c55e]/20 text-[#22c55e] capitalize">
                                {company.plan}
                              </span>
                            ) : (
                              <p className="text-xs text-[#888]">{company.website ?? "—"}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Branche */}
                      <td className="px-4 py-3.5 text-sm text-[#888] whitespace-nowrap">
                        {company.industry ?? "—"}
                      </td>

                      {/* Ansprechpartner */}
                      <td className="px-4 py-3.5">
                        {contact ? (
                          <div>
                            <p className="text-sm text-[#f0f0f0]">
                              {contact.name ?? "—"}
                            </p>
                            <p className="text-xs text-[#888]">
                              {contact.email}
                            </p>
                          </div>
                        ) : (
                          <span className="text-sm text-[#555]">—</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5">
                        <StatusPill status={company.status} />
                      </td>

                      {/* Blueprint / Projektphase */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {blueprintStatus === "COMPLETED" ? (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/20">Abgeschlossen</span>
                        ) : blueprintStatus === "ACTIVE" || blueprintStatus === "PAUSED" ? (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">In Bearbeitung</span>
                        ) : (
                          <span className="text-xs text-[#555]">—</span>
                        )}
                      </td>

                      {/* Score */}
                      <td className="px-4 py-3.5">
                        {score !== null ? (
                          <span
                            className={`text-sm font-semibold ${
                              score >= 75
                                ? "text-[#22c55e]"
                                : score >= 50
                                ? "text-yellow-400"
                                : "text-red-400"
                            }`}
                          >
                            {score}
                          </span>
                        ) : (
                          <span className="text-sm text-[#555]">—</span>
                        )}
                      </td>

                      {/* Projekte count */}
                      <td className="px-4 py-3.5 text-sm text-[#888] text-center">
                        {company._count.projects}
                      </td>

                      {/* Nächster Schritt */}
                      <td className="px-4 py-3.5 text-sm text-[#888] whitespace-nowrap">
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
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <a
                            href={`/admin/kunden/${company.id}`}
                            className="w-7 h-7 rounded-md flex items-center justify-center text-[#888] hover:text-[#f0f0f0] hover:bg-[#222] transition-colors"
                          >
                            <ExternalLink size={13} />
                          </a>
                          <a
                            href={`/admin/kunden/${company.id}/bearbeiten`}
                            className="w-7 h-7 rounded-md flex items-center justify-center text-[#888] hover:text-[#f0f0f0] hover:bg-[#222] transition-colors"
                          >
                            <Pencil size={13} />
                          </a>
                          <button className="w-7 h-7 rounded-md flex items-center justify-center text-[#888] hover:text-[#f0f0f0] hover:bg-[#222] transition-colors">
                            <MoreHorizontal size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
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
              <span className="text-[#22c55e]">
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
      cls: "bg-[#22c55e]/10 text-[#22c55e] border-[#22c55e]/20",
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
