"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { label: "Übersicht", href: "", exact: true },
  { label: "Portal", href: "/portal" },
  { label: "Dokumente", href: "/dokumente" },
  { label: "Lernen", href: "/lernen" },
  { label: "Blueprint", href: "/blueprint-portal" },
  { label: "Analyse", href: "/analyse" },
  { label: "Strategie", href: "/strategy" },
  { label: "Aktivität", href: "/aktivitaet" },
];

export function WorkspaceTabsClient({ companyId }: { companyId: string }) {
  const pathname = usePathname();

  return (
    <div className="flex items-center gap-1 border-b border-[#2a2a2a] -mb-px overflow-x-auto">
      {TABS.map((tab) => {
        const fullHref = `/admin/kunden/${companyId}${tab.href}`;
        const isActive = tab.exact
          ? pathname === fullHref
          : pathname === fullHref || pathname.startsWith(fullHref + "/");

        return (
          <Link
            key={tab.href}
            href={fullHref}
            className={`px-4 py-2.5 text-sm border-b-2 transition-colors whitespace-nowrap flex-shrink-0 ${
              isActive
                ? "text-[#22c55e] border-[#22c55e]"
                : "text-[#888] hover:text-[#f0f0f0] border-transparent hover:border-[#22c55e]/50"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
