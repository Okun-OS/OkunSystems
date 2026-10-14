"use client";

import { useEffect, useRef, useState } from "react";
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

/**
 * Wie groß das Diagramm im Panel sein darf.
 *
 * Nicht fest, sondern aus der übrigen Höhe gerechnet. Eine feste Größe sieht
 * auf einem großen Bildschirm verloren aus und schiebt auf einem Laptop die
 * Beobachtungen unter den Rand — und was unter dem Rand steht, sieht im
 * Gespräch niemand, weil im Gespräch niemand scrollt.
 */
const DIAGRAMM_MIN = 160;
const DIAGRAMM_MAX = 330;
/** Kopfzeile, Dimensionsliste und Innenabstände der Diagrammkachel. */
const KACHEL_BEIWERK = 176;
/** Platz für die Beobachtungen darunter — zwei Karten, wenn die Höhe reicht. */
const KARTEN_PLATZ = 116;
/** Eine kompakte Karte samt Abstand. Aus der gemessenen Höhe, nicht geschätzt. */
const KARTE_HOCH = 62;

function useDiagrammgroesse(an: boolean) {
  const rahmen = useRef<HTMLDivElement>(null);
  const [mass, setMass] = useState<{ groesse: number; sichtbar: number } | null>(null);

  useEffect(() => {
    const el = rahmen.current;
    if (!an || !el) return;
    const messen = () => {
      const hoehe = el.clientHeight;
      const frei = hoehe - KACHEL_BEIWERK - 10 - KARTEN_PLATZ;
      /*
        Die Untergrenze gilt, solange die Kachel sie trägt.

        Auf einem flachen Fenster — Laptop mit 800 Zeilen, Browser mit zwei
        Leisten — ist weniger Diagramm besser als ein abgeschnittenes: Lieber
        ein kleines Netz samt vollständiger Dimensionsliste als ein großes,
        dessen untere Hälfte hinter dem Rand liegt.
      */
      const platzFuerDiagramm = hoehe - KACHEL_BEIWERK;
      const groesse = Math.round(
        Math.max(
          96,
          Math.min(DIAGRAMM_MAX, Math.max(DIAGRAMM_MIN, frei), platzFuerDiagramm)
        )
      );
      // Nur so viele Karten zeigen, wie ganz hineinpassen. Eine angeschnittene
      // Karte sieht aus wie ein Fehler, nicht wie eine Fortsetzung.
      const flaeche = hoehe - KACHEL_BEIWERK - 10 - groesse;
      setMass({ groesse, sichtbar: Math.max(0, Math.floor((flaeche + 8) / KARTE_HOCH)) });
    };
    messen();
    const beobachter = new ResizeObserver(messen);
    beobachter.observe(el);
    return () => beobachter.disconnect();
  }, [an]);

  return { rahmen, mass };
}

export function LiveDashboard({
  profil,
  kompakt,
  maxKarten = 4,
  ruhig,
  fuellt,
}: {
  profil: LiveProfil;
  kompakt?: boolean;
  maxKarten?: number;
  /** Abgeschlossene Analyse: Das Bild ist ein Bericht, kein Messgerät mehr. */
  ruhig?: boolean;
  /**
   * Panelbetrieb: Das Dashboard füllt die ihm gegebene Höhe aus, statt sie
   * selbst zu bestimmen. Das Diagramm nimmt, was übrig ist; die Beobachtungen
   * laufen darunter weiter.
   */
  fuellt?: boolean;
}) {
  const nochNichts = profil.erfassteDimensionen === 0;
  const { rahmen, mass } = useDiagrammgroesse(Boolean(fuellt));
  const karten = profil.beobachtungen.slice(0, fuellt ? mass?.sichtbar ?? 0 : maxKarten);

  return (
    <div
      ref={rahmen}
      className={fuellt ? "h-full min-h-0 flex flex-col gap-2.5" : "space-y-3"}
    >
      {/* Diagramm */}
      <div className="relative flex-shrink-0 rounded-2xl border border-[#12203a] bg-[linear-gradient(165deg,#0b1424,#070d17)] overflow-hidden">
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
          <span className="flex items-center gap-1.5 flex-shrink-0 px-2.5 py-1 rounded-full border border-[#17304d] bg-[rgba(0,184,255,0.06)] font-mono text-[#00b8ff] text-[9.5px] font-medium tabular-nums">
            <span className="radar-puls w-1.5 h-1.5 rounded-full bg-[#00b8ff] shadow-[0_0_8px_2px_rgba(0,184,255,0.5)]" />
            {profil.erfassteDimensionen} / {profil.dimensionen.length} erfasst
          </span>
        </div>

        <div className="px-3 pb-1 flex flex-col items-center">
          <RadarChart
            dimensionen={profil.dimensionen}
            groesse={fuellt ? mass?.groesse ?? DIAGRAMM_MIN : kompakt ? 258 : 334}
            kompakt={kompakt}
            sweep={!ruhig}
          />
        </div>

        <div className="px-4 pb-4">
          <DimensionsListe
            dimensionen={profil.dimensionen}
            kompakt={kompakt}
            spalten={fuellt}
          />
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
        <div
          className={
            fuellt
              ? "flex-1 min-h-0 flex flex-col gap-2 overflow-hidden"
              : `grid gap-2 ${kompakt ? "" : "sm:grid-cols-1"}`
          }
        >
          {karten.map((b, i) => {
            const art = ART[b.art];
            const Symbol = art.Symbol;
            return (
              <div
                key={b.key}
                style={{ animationDelay: `${i * 70}ms` }}
                title={fuellt ? `${b.titel} — ${b.text}` : undefined}
                className={`relative overflow-hidden rounded-xl border pl-4 pr-3.5 ${
                  fuellt ? "py-2 flex-shrink-0" : "py-3"
                } ${art.rand} ${art.flaeche} transition-colors motion-safe:animate-[karte-ein_.5s_cubic-bezier(.22,1,.36,1)_both]`}
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
                    className="font-mono text-[9px] font-bold uppercase tracking-[0.14em]"
                    style={{ color: art.farbe }}
                  >
                    {art.label}
                  </span>
                  <span className="text-[#44546b] text-[9.5px]">· {b.dimensionLabel}</span>
                </div>
                <p
                  className={`text-[#eef2f7] text-[12.5px] font-semibold leading-snug ${
                    fuellt ? "truncate" : ""
                  }`}
                >
                  {b.titel}
                </p>
                {/*
                  Im Panel nur die Überschrift.

                  Der Satz darunter gehört dem Berater: Er liest ihn vor, die
                  Auswertung schreibt ihn aus. Auf dem Bildschirm wäre er die
                  dritte Textebene neben Frage und Antworten — und die erste,
                  die niemand liest.
                */}
                {!fuellt && (
                  <p className="text-[#8899b4] text-[11.5px] leading-snug mt-0.5">{b.text}</p>
                )}
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

      {!fuellt && profil.beobachtungen.length > maxKarten && (
        <p className="text-[#44546b] text-[10.5px] px-1 flex items-center gap-1.5">
          <Sparkles size={10} />
          {profil.beobachtungen.length - maxKarten} weitere Beobachtungen stehen in der
          Auswertung.
        </p>
      )}
    </div>
  );
}
