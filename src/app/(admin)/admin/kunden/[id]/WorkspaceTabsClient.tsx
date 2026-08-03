"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { label: "Übersicht", href: "", exact: true },
  { label: "Blueprint", href: "/blueprint-portal" },
  { label: "Ergebnisse", href: "/ergebnisse" },
  { label: "Antworten", href: "/antworten" },
  { label: "Analyse intern", href: "/analyse" },
  { label: "Dokumente", href: "/dokumente" },
  { label: "Termine", href: "/termine" },
  { label: "Lernen", href: "/lernen" },
  { label: "Benutzer", href: "/benutzer" },
  { label: "Stammdaten", href: "/bearbeiten" },
];

export function WorkspaceTabsClient({ companyId }: { companyId: string }) {
  const pathname = usePathname();

  return (
    <div className="flex items-center gap-1 border-b border-[#1a2840] -mb-px overflow-x-auto">
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
                ? "text-[#00b8ff] border-[#00b8ff]"
                : "text-[#888] hover:text-[#f0f0f0] border-transparent hover:border-[#00b8ff]/50"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
