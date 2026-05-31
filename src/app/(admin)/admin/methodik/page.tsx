import { auth } from "@/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { BookOpen, AlertCircle, CheckCircle2, XCircle, Clock } from "lucide-react";
import { formatDate } from "@/lib/utils";

export default async function MethodikPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [proposals, processLibrary, problemLibrary] = await Promise.all([
    db.learningProposal.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
    db.processLibraryItem.findMany({ orderBy: { name: "asc" } }),
    db.problemLibraryItem.findMany({ orderBy: { name: "asc" } }),
  ]);

  const pending = proposals.filter((p) => p.status === "PENDING");
  const approved = proposals.filter((p) => p.status === "APPROVED");
  const rejected = proposals.filter((p) => p.status === "REJECTED");

  return (
    <div className="max-w-[1400px] mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#f0f0f0]">OKUN Methodik</h1>
        <p className="text-[#888] text-sm mt-1">Process Library, Problem Library & Learning Governance</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Prozesse in Library", val: processLibrary.length, color: "text-blue-400" },
          { label: "Probleme in Library", val: problemLibrary.length, color: "text-yellow-400" },
          { label: "Offene Vorschläge", val: pending.length, color: "text-orange-400" },
          { label: "Übernommene Vorschläge", val: approved.length, color: "text-[#22c55e]" },
        ].map((stat) => (
          <div key={stat.label} className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-5">
            <p className="text-[#888] text-xs mb-2">{stat.label}</p>
            <p className={`text-3xl font-bold ${stat.color}`}>{stat.val}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-5">
        {/* Learning Proposals */}
        <div className="col-span-12 lg:col-span-7">
          <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl overflow-hidden">
            <div className="p-5 border-b border-[#2a2a2a] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle size={15} className="text-orange-400" />
                <h2 className="text-[#f0f0f0] font-semibold text-sm">Methodikvorschläge</h2>
              </div>
              {pending.length > 0 && (
                <span className="text-xs text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-full">{pending.length} offen</span>
              )}
            </div>

            {proposals.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-[#555] text-sm">Noch keine Vorschläge vom OKUN Advisor™</p>
              </div>
            ) : (
              <div className="divide-y divide-[#1e1e1e]">
                {proposals.map((proposal) => (
                  <div key={proposal.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <ProposalTypeBadge type={proposal.type} />
                          <StatusIndicator status={proposal.status} />
                        </div>
                        <p className="text-[#f0f0f0] text-sm font-medium">{proposal.title}</p>
                        <p className="text-[#888] text-xs mt-0.5">{proposal.description}</p>
                        <p className="text-[#555] text-xs mt-1">{formatDate(proposal.createdAt)}</p>
                      </div>
                      {proposal.status === "PENDING" && (
                        <div className="flex gap-2 flex-shrink-0">
                          <ProposalActions proposalId={proposal.id} />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Libraries */}
        <div className="col-span-12 lg:col-span-5 space-y-5">
          <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl overflow-hidden">
            <div className="p-5 border-b border-[#2a2a2a] flex items-center gap-2">
              <BookOpen size={15} className="text-blue-400" />
              <h2 className="text-[#f0f0f0] font-semibold text-sm">Process Library ({processLibrary.length})</h2>
            </div>
            {processLibrary.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-[#555] text-sm">Noch keine Prozesse. Werden automatisch aus dem Advisor befüllt.</p>
              </div>
            ) : (
              <div className="divide-y divide-[#1e1e1e] max-h-[300px] overflow-y-auto">
                {processLibrary.map((item) => (
                  <div key={item.id} className="p-3 flex items-center justify-between">
                    <div>
                      <p className="text-[#f0f0f0] text-sm">{item.name}</p>
                      <p className="text-[#555] text-xs">{item.category}</p>
                    </div>
                    {item.isCustom && (
                      <span className="text-xs text-[#22c55e] bg-[#22c55e]/10 px-1.5 py-0.5 rounded">Custom</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl overflow-hidden">
            <div className="p-5 border-b border-[#2a2a2a] flex items-center gap-2">
              <AlertCircle size={15} className="text-yellow-400" />
              <h2 className="text-[#f0f0f0] font-semibold text-sm">Problem Library ({problemLibrary.length})</h2>
            </div>
            {problemLibrary.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-[#555] text-sm">Noch keine Problemmuster. Werden automatisch aus dem Advisor befüllt.</p>
              </div>
            ) : (
              <div className="divide-y divide-[#1e1e1e] max-h-[300px] overflow-y-auto">
                {problemLibrary.map((item) => (
                  <div key={item.id} className="p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-[#f0f0f0] text-sm">{item.name}</p>
                      <SeverityBadge severity={item.severity} />
                    </div>
                    <p className="text-[#555] text-xs mt-0.5">{item.category}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ProposalTypeBadge({ type }: { type: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    NEW_PROCESS: { label: "Neuer Prozess", cls: "text-blue-400 bg-blue-500/10" },
    NEW_PROBLEM: { label: "Neues Problem", cls: "text-yellow-400 bg-yellow-500/10" },
    NEW_OPPORTUNITY: { label: "Neue Opportunity", cls: "text-[#22c55e] bg-[#22c55e]/10" },
  };
  const c = map[type] ?? { label: type, cls: "text-[#888] bg-[#1a1a1a]" };
  return <span className={`text-xs px-2 py-0.5 rounded font-medium ${c.cls}`}>{c.label}</span>;
}

function StatusIndicator({ status }: { status: string }) {
  if (status === "PENDING") return <Clock size={12} className="text-orange-400" />;
  if (status === "APPROVED") return <CheckCircle2 size={12} className="text-[#22c55e]" />;
  if (status === "REJECTED") return <XCircle size={12} className="text-[#888]" />;
  return null;
}

function ProposalActions({ proposalId }: { proposalId: string }) {
  return (
    <div className="flex gap-1.5">
      <form action={`/api/admin/proposals/${proposalId}/approve`} method="POST">
        <button type="submit" className="text-xs bg-[#22c55e]/10 hover:bg-[#22c55e]/20 text-[#22c55e] px-2.5 py-1 rounded-lg transition-colors">
          Übernehmen
        </button>
      </form>
      <form action={`/api/admin/proposals/${proposalId}/reject`} method="POST">
        <button type="submit" className="text-xs bg-[#1a1a1a] hover:bg-[#222] text-[#888] px-2.5 py-1 rounded-lg transition-colors">
          Ablehnen
        </button>
      </form>
    </div>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const map: Record<string, string> = {
    CRITICAL: "text-red-400 bg-red-500/10",
    HIGH: "text-orange-400 bg-orange-500/10",
    MEDIUM: "text-yellow-400 bg-yellow-500/10",
    LOW: "text-[#888] bg-[#1a1a1a]",
  };
  return <span className={`text-xs px-1.5 py-0.5 rounded ${map[severity] ?? "text-[#888] bg-[#1a1a1a]"}`}>{severity}</span>;
}
