"use client";

import { Building2, Check, Wifi, WifiOff } from "lucide-react";
import { OkunLogo } from "@/components/layout/okun-logo";
import type { LiveProfil } from "@/lib/radar/live";
import { LiveDashboard } from "./live-dashboard";

/**
 * Die Hülle des OKUN Radar: das Cockpit.
 *
 * Drei Spalten — links der Betrieb, in der Mitte die Analyse, rechts das Bild,
 * das dabei entsteht. Beide Seiten des Gesprächs arbeiten in derselben Hülle;
 * was sie unterscheidet, ist der Inhalt, den sie hineinreichen, nicht das
 * Layout. Säßen Berater und Interessent vor verschieden gebauten Oberflächen,
 * redeten sie im Gespräch über verschiedene Bilder.
 *
 * Auf schmalen Bildschirmen stapeln sich die drei Spalten in der Reihenfolge,
 * in der sie gebraucht werden: Frage zuerst, Diagramm darunter, Kontext zuletzt.
 */

export type CockpitBereich = {
  key: string;
  label: string;
  Symbol: React.ComponentType<{ size?: number | string; className?: string }>;
  verfuegbar: boolean;
};

export type CockpitPhase = {
  key: string;
  nummer: number;
  label: string;
  unterzeile: string;
  aktiv: boolean;
  erledigt: boolean;
};

type Props = {
  firma: string;
  eckdaten: string | null;
  bereiche: CockpitBereich[];
  aktiverBereich: string;
  onBereich: (key: string) => void;
  phasen: CockpitPhase[];
  /** Die beiden Videokacheln. Null, wenn das Gespräch anderswo läuft. */
  video?: React.ReactNode;
  profil: LiveProfil;
  /** Rechts in der Kopfzeile — Sitzungsdauer, Teilnehmerzahl, Aktionen. */
  kopfzeile?: React.ReactNode;
  verbunden?: boolean;
  /** Unten links, unter der Navigation. */
  fuss?: React.ReactNode;
  children: React.ReactNode;
};

export function RadarCockpit({
  firma,
  eckdaten,
  bereiche,
  aktiverBereich,
  onBereich,
  phasen,
  video,
  profil,
  kopfzeile,
  verbunden = true,
  fuss,
  children,
}: Props) {
  return (
    /*
      Auf breiten Bildschirmen drei Spalten in voller Höhe, jede mit eigener
      Bildlaufleiste. Darunter untereinander und die ganze Seite scrollt.

      Die Höhenbegrenzungen gelten deshalb erst ab `lg`. Ohne diese Trennung
      quetschte `flex-1 min-h-0` auf dem Telefon die Mittelspalte auf wenige
      Pixel zusammen — die Frage war schlicht nicht mehr da.
    */
    <div className="h-full min-h-0 flex flex-col bg-[#05090f] overflow-y-auto lg:overflow-hidden">
      {/* ── Kopfzeile ──────────────────────────────────────────────────── */}
      <header className="flex-shrink-0 border-b border-[#101d31] bg-[#070d17]">
        <div className="px-4 sm:px-5 py-3 flex items-center gap-4">
          <div className="hidden sm:flex w-[132px] flex-shrink-0 items-center">
            <OkunLogo size="sm" />
          </div>
          <div className="hidden sm:block w-px h-7 bg-[#13243c] flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-[#eef2f7] text-[15px] font-semibold leading-tight">OKUN Radar</p>
            <p className="text-[#5b6b7f] text-[11.5px] truncate leading-tight">
              Potenzialanalyse · {firma}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {!verbunden && (
              <span className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#f59e0b]/30 text-[#fbbf24] text-[11px]">
                <WifiOff size={11} /> Verbindung unterbrochen
              </span>
            )}
            {verbunden && (
              <span className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#13243c] text-[#5b6b7f] text-[11px]">
                <Wifi size={11} className="text-[#22c55e]" /> verbunden
              </span>
            )}
            {kopfzeile}
          </div>
        </div>
      </header>

      <div className="flex-1 lg:min-h-0 flex flex-col lg:flex-row">
        {/* ── Linke Spalte: der Betrieb ──────────────────────────────── */}
        <aside className="order-1 lg:order-none flex-shrink-0 lg:w-[212px] border-b lg:border-b-0 lg:border-r border-[#101d31] bg-[#070d17] flex lg:flex-col lg:overflow-y-auto">
          <div className="hidden lg:block px-3.5 py-4 border-b border-[#101d31]">
            <div className="flex items-start gap-2.5">
              <span className="flex-shrink-0 w-9 h-9 rounded-lg bg-[#0d1a2b] border border-[#17304d] flex items-center justify-center">
                <Building2 size={15} className="text-[#4a5f7d]" />
              </span>
              <div className="min-w-0">
                <p className="text-[#eef2f7] text-[12.5px] font-semibold leading-snug break-words">
                  {firma}
                </p>
                {eckdaten && (
                  <p className="text-[#5b6b7f] text-[11px] leading-snug mt-0.5">{eckdaten}</p>
                )}
              </div>
            </div>
          </div>

          <nav className="flex lg:flex-col gap-1 p-2.5 flex-1 overflow-x-auto">
            {bereiche.map((b) => {
              const aktiv = b.key === aktiverBereich;
              const Symbol = b.Symbol;
              return (
                <button
                  key={b.key}
                  onClick={() => b.verfuegbar && onBereich(b.key)}
                  disabled={!b.verfuegbar}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[12.5px] font-medium whitespace-nowrap transition-all duration-150 ${
                    aktiv
                      ? "bg-[rgba(0,184,255,0.1)] border border-[#00b8ff]/35 text-[#00b8ff]"
                      : b.verfuegbar
                        ? "border border-transparent text-[#8899b4] hover:text-[#eef2f7] hover:bg-[#0c1626]"
                        : "border border-transparent text-[#36455c] cursor-not-allowed"
                  }`}
                >
                  <Symbol size={14} className="flex-shrink-0" />
                  {b.label}
                </button>
              );
            })}
          </nav>

          {fuss && <div className="hidden lg:block p-2.5 border-t border-[#101d31]">{fuss}</div>}
        </aside>

        {/* ── Mitte: die Analyse ─────────────────────────────────────── */}
        <main className="order-2 lg:order-none lg:flex-1 min-w-0 lg:min-h-0 flex flex-col">
          <PhasenStepper phasen={phasen} />
          <div className="lg:flex-1 lg:min-h-0 lg:overflow-y-auto px-4 sm:px-6 py-5">
            {children}
          </div>
        </main>

        {/* ── Rechte Spalte: Video und Live-Bild ─────────────────────── */}
        <aside className="order-3 lg:order-none flex-shrink-0 lg:w-[332px] border-t lg:border-t-0 lg:border-l border-[#101d31] bg-[#070d17] lg:overflow-y-auto">
          {video && <div className="p-3 pb-0">{video}</div>}
          <div className="p-3">
            <LiveDashboard profil={profil} kompakt />
          </div>
        </aside>
      </div>
    </div>
  );
}

/**
 * Die Phasenleiste.
 *
 * Erledigte Phasen bekommen einen Haken, die laufende den Akzent. Der
 * Interessent soll jederzeit sehen, wie weit es noch ist — eine Analyse ohne
 * sichtbares Ende fühlt sich länger an, als sie ist.
 */
function PhasenStepper({ phasen }: { phasen: CockpitPhase[] }) {
  return (
    <div className="flex-shrink-0 border-b border-[#101d31] px-4 sm:px-6 py-3.5 overflow-x-auto">
      <ol className="flex items-center gap-2 sm:gap-3 min-w-max">
        {phasen.map((p, i) => (
          <li key={p.key} className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-2.5">
              <span
                className={`flex-shrink-0 w-7 h-7 rounded-full border flex items-center justify-center text-[11px] font-bold transition-all duration-300 ${
                  p.erledigt
                    ? "border-[#22c55e]/50 bg-[rgba(34,197,94,0.1)] text-[#22c55e]"
                    : p.aktiv
                      ? "border-[#00b8ff] bg-[rgba(0,184,255,0.12)] text-[#00b8ff] shadow-[0_0_14px_rgba(0,184,255,0.25)]"
                      : "border-[#17304d] text-[#44546b]"
                }`}
              >
                {p.erledigt ? <Check size={13} strokeWidth={3} /> : p.nummer}
              </span>
              <div className="hidden sm:block min-w-0">
                <p
                  className={`text-[12.5px] font-semibold leading-tight ${
                    p.aktiv ? "text-[#00b8ff]" : p.erledigt ? "text-[#c9d4e4]" : "text-[#5b6b7f]"
                  }`}
                >
                  {p.nummer}. {p.label}
                </p>
                <p className="text-[#44546b] text-[10.5px] leading-tight">{p.unterzeile}</p>
              </div>
            </div>
            {i < phasen.length - 1 && (
              <span
                className={`hidden sm:block h-px w-8 lg:w-12 ${
                  p.erledigt ? "bg-[#1d3f5c]" : "bg-[#13243c]"
                }`}
              />
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
