"use client";

import { useState, useTransition } from "react";
import { Eye, EyeOff, Layers, Wand2 } from "lucide-react";
import { MEILENSTEIN_ZUSTAENDE } from "@/lib/projekt/auftrag";
import { auswahlUebernehmen, sichtbarkeitSetzen, zustandSetzen } from "./actions";

/**
 * Die Umsetzung in drei Spalten denken, aber als Liste bedienen.
 *
 * Ein Brett mit Spalten sieht nach mehr aus, als hier passiert: In der Regel
 * stehen fünf bis acht Meilensteine, und jeder wandert zweimal. Drei Knöpfe
 * je Zeile sind dafür schneller als Ziehen und Fallenlassen — und auf einem
 * Laptop im Gespräch überhaupt die einzige Variante, die funktioniert.
 */

type Meilenstein = {
  id: string;
  title: string;
  description: string | null;
  zustand: string;
};

type Projekt = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  progress: number;
  isVisibleToClient: boolean;
  strategieSitzungId: string | null;
  milestones: Meilenstein[];
};

export function ProjektClient({
  company,
  projekte,
  offeneAuftraege,
}: {
  company: { id: string; name: string };
  projekte: Projekt[];
  offeneAuftraege: Array<{
    sitzungId: string;
    abgeschlossenAm: Date | null;
    posten: string[];
  }>;
}) {
  const [pending, start] = useTransition();
  const [fehler, setzeFehler] = useState<string | null>(null);

  function fuehreAus(fn: () => Promise<unknown>) {
    setzeFehler(null);
    start(async () => {
      const ergebnis = (await fn()) as { error?: string } | undefined;
      if (ergebnis && "error" in ergebnis && ergebnis.error) setzeFehler(ergebnis.error);
    });
  }

  return (
    <div className="space-y-5">
      {fehler && (
        <p className="px-4 py-3 rounded-xl bg-[rgba(240,80,74,.1)] border border-[rgba(240,80,74,.3)] text-[#f0504a] text-xs">
          {fehler}
        </p>
      )}

      {/* Noch nicht übernommene Auswahl */}
      {offeneAuftraege.map((auftrag) => (
        <div
          key={auftrag.sitzungId}
          className="bg-[#0c1520] border border-[rgba(0,184,255,.3)] rounded-xl p-5"
        >
          <h2 className="text-[#f0f0f0] font-semibold text-sm flex items-center gap-2">
            <Wand2 size={15} className="text-[#00b8ff]" />
            Auswahl aus dem Strategiegespräch übernehmen
          </h2>
          <p className="text-[#888] text-xs mt-1.5 leading-relaxed">
            {auftrag.posten.length} gewählte Posten werden zu Meilensteinen — in der
            Reihenfolge des Gesprächs, jeder im Zustand <b className="text-[#c9d4e4]">Geplant</b>.
            Die Titel bleiben die aus dem Gespräch, damit der Kunde sie wiedererkennt.
          </p>
          <ul className="mt-3 space-y-1">
            {auftrag.posten.map((titel) => (
              <li key={titel} className="text-[#8899b4] text-xs flex items-start gap-2">
                <span className="text-[#2a3f5c] mt-[2px]">▸</span>
                {titel}
              </li>
            ))}
          </ul>
          <button
            onClick={() => fuehreAus(() => auswahlUebernehmen(company.id, auftrag.sitzungId))}
            disabled={pending}
            className="mt-4 px-4 py-2.5 rounded-lg bg-[#00b8ff] text-[#041018] text-xs font-bold disabled:opacity-50 transition-opacity"
          >
            {pending ? "…" : "Übernehmen"}
          </button>
        </div>
      ))}

      {projekte.length === 0 && offeneAuftraege.length === 0 && (
        <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-8 text-center">
          <Layers size={28} className="text-[#2a3f5c] mx-auto mb-3" />
          <p className="text-[#888] text-sm">Noch keine Umsetzung.</p>
          <p className="text-[#555] text-xs mt-1.5 leading-relaxed max-w-sm mx-auto">
            Sobald ein Strategiegespräch freigegeben ist und darin etwas gewählt wurde,
            lässt sich die Auswahl hier in Meilensteine übernehmen.
          </p>
        </div>
      )}

      {projekte.map((projekt) => (
        <div key={projekt.id} className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-[#f0f0f0] font-semibold text-sm">{projekt.title}</h2>
              <p className="text-[#555] text-xs mt-0.5">
                {projekt.milestones.filter((m) => m.zustand === "live").length} von{" "}
                {projekt.milestones.length} live · {projekt.progress} % ·{" "}
                {projekt.strategieSitzungId ? "aus dem Strategiegespräch" : "von Hand angelegt"}
              </p>
            </div>
            <button
              onClick={() =>
                fuehreAus(() =>
                  sichtbarkeitSetzen(company.id, projekt.id, !projekt.isVisibleToClient)
                )
              }
              disabled={pending}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#1a2840]
                text-[#8899b4] text-xs hover:text-[#dce9f6] hover:border-[rgba(0,184,255,.4)]
                disabled:opacity-50 transition-colors"
            >
              {projekt.isVisibleToClient ? <Eye size={13} /> : <EyeOff size={13} />}
              {projekt.isVisibleToClient ? "Kunde sieht es" : "Nur intern"}
            </button>
          </div>

          <div className="mt-3 h-1 bg-[#111e30] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#00b8ff] rounded-full transition-[width] duration-500"
              style={{ width: `${Math.min(100, projekt.progress)}%` }}
            />
          </div>

          {projekt.milestones.length === 0 ? (
            <p className="mt-4 text-[#555] text-xs">
              Keine Meilensteine. Ein Projekt ohne Meilensteine zeigt dem Kunden nichts.
            </p>
          ) : (
            <ul className="mt-4 space-y-2">
              {projekt.milestones.map((m) => (
                <li
                  key={m.id}
                  className={`px-4 py-3 rounded-lg border ${
                    m.zustand === "live"
                      ? "border-[rgba(46,230,197,.3)] bg-[rgba(46,230,197,.05)]"
                      : m.zustand === "umsetzung"
                        ? "border-[rgba(0,184,255,.3)] bg-[rgba(0,184,255,.05)]"
                        : "border-[#1a2840] bg-[#0a121c]"
                  }`}
                >
                  <p className="text-[#f0f0f0] text-sm font-medium">{m.title}</p>
                  {m.description && (
                    <p className="text-[#888] text-xs mt-0.5 leading-relaxed">{m.description}</p>
                  )}
                  <div className="mt-2 flex gap-1">
                    {MEILENSTEIN_ZUSTAENDE.map((z) => (
                      <button
                        key={z.key}
                        onClick={() => fuehreAus(() => zustandSetzen(company.id, m.id, z.key))}
                        disabled={pending}
                        className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition-colors
                          disabled:opacity-50 ${
                            m.zustand === z.key
                              ? "bg-[#00b8ff] text-[#041018]"
                              : "bg-[rgba(255,255,255,.05)] text-[#7d93ad] hover:text-[#dce9f6]"
                          }`}
                      >
                        {z.label}
                      </button>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}
