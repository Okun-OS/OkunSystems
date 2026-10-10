"use client";

import { Building2, Check, Users, Video, WifiOff } from "lucide-react";
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
  /**
   * Die beiden Videokacheln aus dem laufenden Gespräch.
   *
   * Fehlen sie, bleibt der Platz trotzdem stehen und sagt, was dort hingehört.
   * Ein Bereich, der erst erscheint, wenn er belegt ist, ist für jeden, der die
   * Oberfläche zum ersten Mal sieht, schlicht nicht vorhanden.
   */
  video?: React.ReactNode;
  /** Mikrofon, Kamera, Verlassen — gehört neben die Kacheln. */
  videoSteuerung?: React.ReactNode;
  /** Was an der Stelle der Kacheln steht, solange das Gespräch nicht läuft. */
  videoHinweis?: React.ReactNode;
  /** Laufzeit der Sitzung in Sekunden, für die Anzeige in der Kopfzeile. */
  laufzeitSekunden?: number | null;
  teilnehmer?: number | null;
  profil: LiveProfil;
  /** Rechts in der Kopfzeile — weitere Aktionen. */
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
  videoSteuerung,
  videoHinweis,
  laufzeitSekunden,
  teilnehmer,
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
    <div className="relative h-full min-h-0 flex flex-col bg-[#05090f] overflow-y-auto lg:overflow-hidden">
      {/*
        Zwei sehr schwache Lichtkegel hinter allem.

        Ohne sie ist die Fläche flaches Schwarz und jede Karte schwebt im
        Nichts. Mit ihnen gibt es oben links und rechts unten eine Lichtquelle,
        an der sich Ränder und Kanten orientieren — der Unterschied zwischen
        „dunkles Design“ und „teures dunkles Design“.
      */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background:
            "radial-gradient(1100px 600px at 12% -8%, rgba(0,184,255,0.055), transparent 62%)," +
            "radial-gradient(900px 520px at 88% 108%, rgba(46,230,197,0.04), transparent 60%)",
        }}
      />
      <div className="relative z-10 flex flex-col h-full min-h-0">
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
            {!verbunden ? (
              <span className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#f59e0b]/30 bg-[rgba(245,158,11,0.07)] text-[#fbbf24] text-[11px]">
                <WifiOff size={11} /> Verbindung unterbrochen
              </span>
            ) : (
              <span className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#1a3a2a] bg-[rgba(34,197,94,0.07)] text-[11px]">
                <span className="relative flex w-1.5 h-1.5">
                  <span className="absolute inline-flex w-full h-full rounded-full bg-[#22c55e] opacity-60 motion-safe:animate-ping" />
                  <span className="relative inline-flex w-1.5 h-1.5 rounded-full bg-[#22c55e]" />
                </span>
                <span className="text-[#86efac] font-medium hidden sm:inline">
                  Live-Analyse
                </span>
                {typeof laufzeitSekunden === "number" && (
                  <span className="text-[#c9d4e4] tabular-nums font-semibold">
                    {uhr(laufzeitSekunden)}
                  </span>
                )}
              </span>
            )}
            {typeof teilnehmer === "number" && teilnehmer > 0 && (
              <span className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-[#13243c] text-[#8899b4] text-[11px]">
                <Users size={11} /> {teilnehmer}
              </span>
            )}
            {kopfzeile}
          </div>
        </div>
      </header>

      {/*
        Breit: ein Raster aus drei Spalten, rechts oben das Gespräch, rechts
        darunter das Live-Bild. Schmal: untereinander, und zwar so, dass das
        Gespräch oben klebt — am Telefon soll man sein Gegenüber sehen, ohne
        zur Seite zu scrollen.

        Als verschachtelte Spalten ging das nicht: Ein Knoten kann nicht je
        nach Bildschirmbreite an zwei verschiedenen Stellen hängen.
      */}
      <div className="flex-1 lg:min-h-0 flex flex-col lg:grid lg:grid-cols-[212px_minmax(0,1fr)_332px] lg:grid-rows-[auto_minmax(0,1fr)]">
        {/* ── Linke Spalte: der Betrieb ──────────────────────────────── */}
        <aside className="order-2 lg:order-none lg:col-start-1 lg:row-span-2 flex-shrink-0 border-b lg:border-b-0 lg:border-r border-[#101d31] bg-[#070d17] flex lg:flex-col lg:overflow-y-auto">
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
        <main className="order-3 lg:order-none lg:col-start-2 lg:row-span-2 min-w-0 lg:min-h-0 flex flex-col">
          <PhasenStepper phasen={phasen} />
          <div className="lg:flex-1 lg:min-h-0 lg:overflow-y-auto px-4 sm:px-6 py-5">
            {children}
          </div>
        </main>

        {/* ── Rechte Spalte: Video und Live-Bild ─────────────────────── */}
        {/* Das Gespräch — am Telefon klebend, am Rechner rechts oben. */}
        <section className="order-1 lg:order-none lg:col-start-3 lg:row-start-1 sticky top-0 z-30 lg:static border-b lg:border-b-0 lg:border-l border-[#101d31] bg-[#070d17]/95 backdrop-blur lg:backdrop-blur-none">
          <Gespraechsbereich
            video={video}
            steuerung={videoSteuerung}
            hinweis={videoHinweis}
          />
        </section>

        <aside className="order-4 lg:order-none lg:col-start-3 lg:row-start-2 lg:min-h-0 border-t lg:border-t-0 lg:border-l border-[#101d31] bg-[#070d17] lg:overflow-y-auto">
          <div className="p-3">
            <LiveDashboard profil={profil} kompakt />
          </div>
        </aside>
      </div>
      </div>
    </div>
  );
}

/** Sekunden als mm:ss. */
function uhr(sekunden: number): string {
  const m = Math.floor(sekunden / 60);
  const sek = Math.floor(sekunden % 60);
  return `${m}:${String(sek).padStart(2, "0")}`;
}

/**
 * Der Gesprächsbereich.
 *
 * Er steht immer da — auch ohne laufendes Gespräch. Dann zeigt er zwei
 * reservierte Plätze und sagt, wie man hineinkommt. Das ist der Unterschied
 * zwischen „hier ist kein Video“ und „hier ist noch kein Video“, und nur der
 * zweite Satz lässt jemanden danach suchen.
 */
function Gespraechsbereich({
  video,
  steuerung,
  hinweis,
}: {
  video?: React.ReactNode;
  steuerung?: React.ReactNode;
  hinweis?: React.ReactNode;
}) {
  const platzhalter = (
    <div className="grid grid-cols-2 gap-2 w-full">
      {["Berater", "Sie"].map((wer) => (
        <div
          key={wer}
          className="relative aspect-video rounded-xl border border-dashed border-[#1a3050] bg-[linear-gradient(160deg,#0b1726,#070d17)] flex flex-col items-center justify-center gap-1"
        >
          <Video size={13} className="text-[#24415f]" />
          <span className="text-[#44546b] text-[9.5px]">{wer}</span>
        </div>
      ))}
    </div>
  );

  /*
    Zwei Zuschnitte für dieselben Kacheln.

    Am Rechner stehen sie groß in der rechten Spalte — dort ist Platz, und das
    Gegenüber soll gut zu sehen sein. Am Telefon wird daraus die schmale
    Gesprächsleiste, wie man sie von jeder Telefonie-App kennt: zwei kleine
    Bilder links, die Steuerung rechts. Ein leerer Gesprächsraum darf dort
    nicht ein Drittel des Bildschirms einnehmen.
  */
  return (
    <div className="p-3">
      {/* Telefon: schmale Leiste */}
      <div className="lg:hidden flex items-center gap-2.5">
        <div className="w-[188px] flex-shrink-0">{video ?? platzhalter}</div>
        <div className="min-w-0 flex-1 flex items-center justify-end gap-2">
          {hinweis && <div className="min-w-0 flex-1">{hinweis}</div>}
          {steuerung && <div className="scale-[0.78] origin-right flex-shrink-0">{steuerung}</div>}
        </div>
      </div>

      {/* Rechner: eigener Block in der rechten Spalte */}
      <div className="hidden lg:block space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-[#5b6b7f] text-[10px] uppercase tracking-[0.16em] font-semibold">
            <Video size={11} /> Gesprächsraum
          </span>
          {steuerung && <div className="scale-[0.82] origin-right">{steuerung}</div>}
        </div>
        {video ?? platzhalter}
        {hinweis && <div className="pt-0.5">{hinweis}</div>}
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
