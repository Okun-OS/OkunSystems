import { auth } from "@/auth";
import { db } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { WorkspaceTabsClient } from "./WorkspaceTabsClient";

export default async function CustomerWorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;

  const company = await db.company.findUnique({
    where: { id },
    select: { id: true, name: true, industry: true, status: true },
  });

  if (!company) notFound();

  const statusCfg: Record<string, { label: string; cls: string }> = {
    ACTIVE: { label: "Aktiv", cls: "bg-[#00b8ff]/10 text-[#00b8ff] border-[#00b8ff]/20" },
    ONBOARDING: { label: "Onboarding", cls: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" },
    INACTIVE: { label: "Inaktiv", cls: "bg-[#888]/10 text-[#888] border-[#888]/20" },
    PAUSED: { label: "Pausiert", cls: "bg-orange-500/10 text-orange-400 border-orange-500/20" },
  };
  const sc = statusCfg[company.status] ?? { label: company.status, cls: "bg-[#888]/10 text-[#888] border-[#888]/20" };

  return (
    <div className="max-w-[1400px] mx-auto">
      <div className="mb-6">
        <Link
          href="/admin/kunden"
          className="inline-flex items-center gap-2 text-[#888] hover:text-[#f0f0f0] text-sm mb-4 transition-colors"
        >
          <ArrowLeft size={15} />
          Zurück zur Übersicht
        </Link>

        <div className="flex items-center gap-4 mb-5">
          <div className="w-12 h-12 rounded-xl bg-[#00b8ff]/10 border border-[#00b8ff]/20 flex items-center justify-center flex-shrink-0">
            <span className="text-[#00b8ff] text-lg font-bold">
              {company.name.charAt(0)}
            </span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#f0f0f0]">{company.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              {company.industry && (
                <span className="text-[#888] text-sm">{company.industry}</span>
              )}
              <span className={`text-xs px-2 py-0.5 rounded-full border ${sc.cls}`}>
                {sc.label}
              </span>
            </div>
          </div>
        </div>

        <WorkspaceTabsClient companyId={id} />
      </div>

      {children}
    </div>
  );
}
