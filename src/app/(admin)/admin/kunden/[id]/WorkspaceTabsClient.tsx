"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Die Navigation im Kundenbereich.
 *
 * Zwölf gleichrangige Reiter in einer Zeile sind keine Navigation, sondern
 * eine Liste, die man absucht — und auf einem Laptop lief sie rechts aus dem
 * Bild. Stattdessen stehen hier die fünf Abschnitte, in denen ein Betrieb
 * tatsächlich bearbeitet wird; die Unterseiten erscheinen erst, wenn man im
 * Abschnitt steht.
 *
 * Die Reihenfolge ist der Weg des Kunden: erst der Blueprint, dann das
 * Gespräch darüber, dann die Betreuung. Verwaltung steht am Ende, weil man
 * sie selten braucht.
 */

type Unterpunkt = { label: string; href: string };
type Abschnitt = {
  label: string;
  href: string;
  exact?: boolean;
  unterpunkte?: Unterpunkt[];
};

const ABSCHNITTE: Abschnitt[] = [
  { label: "Übersicht", href: "", exact: true },
  {
    label: "Blueprint",
    href: "/blueprint-portal",
    unterpunkte: [
      { label: "Fortschritt", href: "/blueprint-portal" },
      { label: "Antworten", href: "/antworten" },
      { label: "Ergebnisse", href: "/ergebnisse" },
      { label: "Auswertung intern", href: "/analyse" },
    ],
  },
  {
    label: "Strategiegespräch",
    href: "/strategie",
    unterpunkte: [
      { label: "Vorbereitung", href: "/strategie" },
      { label: "Leitfaden", href: "/leitfaden" },
    ],
  },
  {
    label: "Betreuung",
    href: "/lernen",
    unterpunkte: [
      { label: "Lernen", href: "/lernen" },
      { label: "Termine", href: "/termine" },
      { label: "Dokumente", href: "/dokumente" },
    ],
  },
  {
    label: "Verwaltung",
    href: "/bearbeiten",
    unterpunkte: [
      { label: "Stammdaten", href: "/bearbeiten" },
      { label: "Benutzer", href: "/benutzer" },
      { label: "Portalzugang", href: "/portal" },
      { label: "Aktivität", href: "/aktivitaet" },
    ],
  },
];

export function WorkspaceTabsClient({ companyId }: { companyId: string }) {
  const pathname = usePathname();
  const wurzel = `/admin/kunden/${companyId}`;
  const rest = pathname.startsWith(wurzel) ? pathname.slice(wurzel.length) : "";

  function trifft(href: string, exact?: boolean): boolean {
    if (exact) return rest === "" || rest === "/";
    return rest === href || rest.startsWith(href + "/");
  }

  const offen =
    ABSCHNITTE.find((a) => a.unterpunkte?.some((u) => trifft(u.href))) ??
    ABSCHNITTE.find((a) => trifft(a.href, a.exact));

  return (
    <div className="-mb-px">
      <div className="flex items-center gap-1 border-b border-[#1a2840]">
        {ABSCHNITTE.map((a) => {
          const aktiv = offen?.label === a.label;
          return (
            <Link
              key={a.label}
              href={`${wurzel}${a.href}`}
              className={`px-4 py-2.5 text-sm border-b-2 transition-colors whitespace-nowrap ${
                aktiv
                  ? "text-[#00b8ff] border-[#00b8ff] font-medium"
                  : "text-[#888] hover:text-[#f0f0f0] border-transparent hover:border-[#00b8ff]/50"
              }`}
            >
              {a.label}
            </Link>
          );
        })}
      </div>

      {offen?.unterpunkte && (
        <div className="flex items-center gap-1 pt-2.5 pb-0.5">
          {offen.unterpunkte.map((u) => {
            const aktiv = trifft(u.href);
            return (
              <Link
                key={u.href}
                href={`${wurzel}${u.href}`}
                className={`px-3 py-1.5 text-xs rounded-lg transition-colors whitespace-nowrap ${
                  aktiv
                    ? "bg-[#00b8ff]/12 text-[#00b8ff] font-medium"
                    : "text-[#5b6b7f] hover:text-[#c9d4e4] hover:bg-white/[0.04]"
                }`}
              >
                {u.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
