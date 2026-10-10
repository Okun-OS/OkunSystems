"use client";

import { Activity, CircleAlert, Sparkles, Star } from "lucide-react";
import type { LiveProfil } from "@/lib/radar/live";
import { DimensionsListe, RadarChart } from "./radar-chart";

/**
 * Das Live Intelligence Dashboard.
 *
 * Rechts im Cockpit, während gefragt wird. Es zeigt ausschließlich, was der
 * Betrieb selbst gesagt hat — keine Branchenvergleiche, keine Einsparquoten,
 * keine Hochrechnungen. Jede Karte nennt die Frage, aus der sie folgt.
 *
 * Das ist keine Zurückhaltung aus Vorsicht, sondern aus Erfahrung: Eine
 * erfundene Zahl auf dem Bildschirm ist eine Zahl, nach der der Kunde fragt.
 * Und dann steht der Kollege da und muss erklären, woher sie kommt.
 */

const ART = {
  hinweis: {
    label: "Hinweis",
    farbe: "#f59e0b",
    rand: "border-[#f59e0b]/25",
    flaeche:
      "bg-[linear-gradient(110deg,rgba(245,158,11,0.1),rgba(245,158,11,0.03)_55%,transparent)]",
    Symbol: CircleAlert,
  },
  staerke: {
    label: "Stärke",
    farbe: "#22c55e",
    rand: "border-[#22c55e]/25",
    flaeche:
      "bg-[linear-gradient(110deg,rgba(34,197,94,0.1),rgba(34,197,94,0.03)_55%,transparent)]",
    Symbol: Star,
  },
} as const;

export function LiveDashboard({
  profil,
  kompakt,
  maxKarten = 4,
  ruhig,
}: {
  profil: LiveProfil;
  kompakt?: boolean;
  maxKarten?: number;
  /** Abgeschlossene Analyse: Das Bild ist ein Bericht, kein Messgerät mehr. */
  ruhig?: boolean;
}) {
  const nochNichts = profil.erfassteDimensionen === 0;
  const karten = profil.beobachtungen.slice(0, maxKarten);

  return (
    <div className="space-y-3">
      {/* Diagramm */}
      <div className="relative rounded-2xl border border-[#12203a] bg-[linear-gradient(165deg,#0b1424,#070d17)] overflow-hidden">
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(0,184,255,0.3),transparent)]"
        />
        <div className="px-4 pt-3.5 pb-2 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className={`text-[#eef2f7] font-semibold ${kompakt ? "text-[13px]" : "text-sm"}`}>
              Live-Analyse
            </h3>
            <p className="text-[#5b6b7f] text-[11px] leading-snug">
              Ihr Betrieb, aus Ihren eigenen Angaben
            </p>
          </div>
          <span className="flex items-center gap-1.5 flex-shrink-0 px-2.5 py-1 rounded-full border border-[#17304d] bg-[rgba(0,184,255,0.06)] text-[#00b8ff] text-[10px] font-medium">
            <span className="radar-puls w-1.5 h-1.5 rounded-full bg-[#00b8ff] shadow-[0_0_8px_2px_rgba(0,184,255,0.5)]" />
            {profil.erfassteDimensionen} / {profil.dimensionen.length} erfasst
          </span>
        </div>

        <div className="px-3 pb-1 flex flex-col items-center">
          <RadarChart
            dimensionen={profil.dimensionen}
            groesse={kompakt ? 258 : 334}
            kompakt={kompakt}
            sweep={!ruhig}
          />
        </div>

        <div className="px-4 pb-4">
          <DimensionsListe dimensionen={profil.dimensionen} kompakt={kompakt} />
        </div>

        {nochNichts && (
          <div className="px-4 pb-4">
            <p className="text-[#5b6b7f] text-[11px] leading-relaxed">
              Das Bild entsteht mit Ihren Antworten. Solange eine Dimension offen ist, steht
              dort nichts — wir zeichnen keine Null, die Sie nicht gesagt haben.
            </p>
          </div>
        )}
      </div>

      {/* Beobachtungen */}
      {karten.length > 0 && (
        <div className={`grid gap-2 ${kompakt ? "" : "sm:grid-cols-1"}`}>
          {karten.map((b, i) => {
            const art = ART[b.art];
            const Symbol = art.Symbol;
            return (
              <div
                key={b.key}
                style={{ animationDelay: `${i * 70}ms` }}
                className={`relative overflow-hidden rounded-xl border pl-4 pr-3.5 py-3 ${art.rand} ${art.flaeche} transition-colors motion-safe:animate-[karte-ein_.5s_cubic-bezier(.22,1,.36,1)_both]`}
              >
                <span
                  aria-hidden
                  className="pointer-events-none absolute left-0 inset-y-2 w-[3px] rounded-r-full"
                  style={{ background: art.farbe, opacity: 0.75 }}
                />
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.08),transparent)]"
                />
                <div className="flex items-center gap-1.5 mb-1">
                  <Symbol size={12} style={{ color: art.farbe }} className="flex-shrink-0" />
                  {/*
                    Symbol UND Beschriftung, nicht nur Farbe: Bernstein und Grün
                    liegen für Rotblindheit dicht beieinander (geprüft, ΔE 5,7).
                    Wer nur die Tönung sieht, soll den Unterschied trotzdem lesen.
                  */}
                  <span
                    className="text-[9.5px] font-bold uppercase tracking-[0.12em]"
                    style={{ color: art.farbe }}
                  >
                    {art.label}
                  </span>
                  <span className="text-[#44546b] text-[9.5px]">· {b.dimensionLabel}</span>
                </div>
                <p className="text-[#eef2f7] text-[12.5px] font-semibold leading-snug">{b.titel}</p>
                <p className="text-[#8899b4] text-[11.5px] leading-snug mt-0.5">{b.text}</p>
              </div>
            );
          })}
        </div>
      )}

      {karten.length === 0 && !nochNichts && (
        <div className="rounded-xl border border-[#12203a] bg-[#09101c] px-3.5 py-3 flex items-start gap-2">
          <Activity size={13} className="text-[#2a3a55] flex-shrink-0 mt-0.5" />
          <p className="text-[#5b6b7f] text-[11.5px] leading-snug">
            Bisher nichts, was besonders auffällt. Das ist für sich genommen schon eine
            Information.
          </p>
        </div>
      )}

      {profil.beobachtungen.length > maxKarten && (
        <p className="text-[#44546b] text-[10.5px] px-1 flex items-center gap-1.5">
          <Sparkles size={10} />
          {profil.beobachtungen.length - maxKarten} weitere Beobachtungen stehen in der
          Auswertung.
        </p>
      )}
    </div>
  );
}
