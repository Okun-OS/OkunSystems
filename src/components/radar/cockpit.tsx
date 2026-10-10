"use client";

import { Check } from "lucide-react";
import { OkunLogo } from "@/components/layout/okun-logo";
import type { LiveProfil } from "@/lib/radar/live";
import { LiveDashboard } from "./live-dashboard";

/**
 * Die Hülle des OKUN Radar.
 *
 * Zwei Zonen statt dreier Spalten: links die Bühne mit der Frage, rechts ein
 * durchgehendes Panel aus Gesprächsraum und Live-Analyse. Der erste Entwurf
 * hatte drei Spalten unterschiedlicher Länge — und darunter jeweils eine große
 * schwarze Fläche, weil keine die andere ausfüllte. Zwei Zonen, die beide bis
 * zum Rand reichen, haben dieses Problem nicht: Die Bühne zentriert ihren
 * Inhalt, das Panel lässt die Analyse den Rest einnehmen.
 *
 * Die Navigation ist in die Markenleiste gewandert. Drei Einträge, von denen
 * während des Gesprächs meist zwei gesperrt sind, rechtfertigen keine eigene
 * Spalte — sie haben nur Platz gekostet und Leere erzeugt.
 *
 * Material: Über allem liegt eine feine Körnung und eine Vignette. Beides
 * zusammen nimmt der dunklen Fläche das Billige — ohne sie sieht jeder
 * Verlauf nach Bildschirmschoner aus, mit ihnen nach Oberfläche.
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

/**
 * Feine Körnung als Datenbild.
 *
 * Der eine Kunstgriff, der dunkle Oberflächen am stärksten aufwertet: Er
 * bricht die Farbverläufe auf, die sonst in sichtbaren Stufen bandieren, und
 * gibt der Fläche eine Textur statt einer Farbe.
 */
const KOERNUNG =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='220' height='220' filter='url(%23n)'/%3E%3C/svg%3E\")";

type Props = {
  firma: string;
  eckdaten: string | null;
  bereiche: CockpitBereich[];
  aktiverBereich: string;
  onBereich: (key: string) => void;
  phasen: CockpitPhase[];
  video?: React.ReactNode;
  videoSteuerung?: React.ReactNode;
  videoHinweis?: React.ReactNode;
  laufzeitSekunden?: number | null;
  teilnehmer?: number | null;
  profil: LiveProfil;
  /** Die Analyse ist abgeschlossen — das Live-Bild steht still. */
  ruhig?: boolean;
  verbunden?: boolean;
  beraterName?: string | null;
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
  ruhig,
  verbunden = true,
  beraterName,
  children,
}: Props) {
  return (
    <div className="relative h-full min-h-0 flex flex-col bg-[#04070d] overflow-y-auto lg:overflow-hidden">
      {/* Lichtquellen, Körnung, Vignette — die Materialschicht. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background:
            "radial-gradient(1200px 640px at 10% -10%, rgba(0,160,255,0.09), transparent 60%)," +
            "radial-gradient(980px 560px at 92% 4%, rgba(46,230,197,0.055), transparent 58%)," +
            "radial-gradient(1400px 800px at 50% 120%, rgba(0,110,190,0.05), transparent 62%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 opacity-[0.035] mix-blend-overlay"
        style={{ backgroundImage: KOERNUNG, backgroundRepeat: "repeat" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0"
        style={{ boxShadow: "inset 0 0 220px 60px rgba(0,0,0,0.6)" }}
      />

      <div className="relative z-10 flex flex-col h-full min-h-0">
        <Markenleiste
          firma={firma}
          eckdaten={eckdaten}
          bereiche={bereiche}
          aktiverBereich={aktiverBereich}
          onBereich={onBereich}
          laufzeitSekunden={laufzeitSekunden}
          teilnehmer={teilnehmer}
          verbunden={verbunden}
        />

        <Phasenschiene phasen={phasen} />

        <div className="flex-1 lg:min-h-0 flex flex-col lg:flex-row">
          {/* ── Bühne ─────────────────────────────────────────────────── */}
          <main className="order-2 lg:order-none flex-1 min-w-0 lg:min-h-0 lg:overflow-y-auto flex">
            {/*
              Zentriert über `my-auto`, nicht über `justify-center`.

              Mit `justify-center` schneidet ein Inhalt, der höher ist als die
              Bühne, oben und unten ab — und der obere Rand ist genau der, an
              dem die Frage steht. `margin: auto` zentriert, solange Platz da
              ist, und gibt ihn sonst sauber dem Bildlauf frei.
            */}
            <div className="w-full my-auto px-5 sm:px-10 lg:px-14 py-8 lg:py-10">{children}</div>
          </main>

          {/* ── Panel ─────────────────────────────────────────────────── */}
          <aside className="order-1 lg:order-none flex-shrink-0 lg:w-[400px] border-b lg:border-b-0 lg:border-l border-[#0f1d2f] bg-[#060b14]/85 backdrop-blur-sm flex flex-col lg:min-h-0">
            <Gespraechsraum
              video={video}
              steuerung={videoSteuerung}
              hinweis={videoHinweis}
              teilnehmer={teilnehmer}
              beraterName={beraterName}
            />
            <div className="hidden lg:block flex-1 min-h-0 overflow-y-auto px-4 pb-4">
              <LiveDashboard profil={profil} ruhig={ruhig} />
            </div>
          </aside>

          {/* Am Telefon steht die Analyse unter der Frage, nicht über ihr. */}
          <div className="order-3 lg:hidden px-4 pb-5">
            <LiveDashboard profil={profil} kompakt ruhig={ruhig} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Markenleiste ────────────────────────────────────────────────────────────

function Markenleiste({
  firma,
  eckdaten,
  bereiche,
  aktiverBereich,
  onBereich,
  laufzeitSekunden,
  teilnehmer,
  verbunden,
}: {
  firma: string;
  eckdaten: string | null;
  bereiche: CockpitBereich[];
  aktiverBereich: string;
  onBereich: (key: string) => void;
  laufzeitSekunden?: number | null;
  teilnehmer?: number | null;
  verbunden: boolean;
}) {
  return (
    <header className="flex-shrink-0 border-b border-[#0f1d2f] bg-[linear-gradient(180deg,rgba(9,16,27,0.9),rgba(6,11,20,0.75))]">
      <div className="px-4 sm:px-6 h-[68px] flex items-center gap-4">
        {/*
          Der Absender ist OKUN Systems — kein zweiter Markenname daneben.

          Der Interessent weiß, bei wem er sitzt. Ein „OKUN Radar“ als eigene
          Wortmarke in derselben Ecke macht aus einem Haus zwei und verwässert
          beide. Wofür dieser Bildschirm da ist, sagt die Phasenschiene
          darunter deutlicher, als eine Wortmarke es könnte.
        */}
        <div className="w-[122px] sm:w-[138px] flex-shrink-0">
          <OkunLogo size="sm" />
        </div>

        <span className="hidden md:block w-px h-8 bg-[linear-gradient(180deg,transparent,#17293f,transparent)] flex-shrink-0" />

        {/* Unternehmen */}
        <div className="min-w-0 flex-1">
          <p className="text-[#dce7f5] text-[13.5px] font-semibold truncate leading-tight">
            {firma}
          </p>
          <p className="text-[#4a6383] text-[11px] truncate leading-tight mt-[2px]">
            Potenzialanalyse{eckdaten ? ` · ${eckdaten}` : ""}
          </p>
        </div>

        {/* Ansichten */}
        <nav className="hidden md:flex items-center gap-0.5 p-1 rounded-xl border border-[#132439] bg-[#070e1a] flex-shrink-0">
          {bereiche.map((b) => {
            const aktiv = b.key === aktiverBereich;
            const Symbol = b.Symbol;
            return (
              <button
                key={b.key}
                onClick={() => b.verfuegbar && onBereich(b.key)}
                disabled={!b.verfuegbar}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11.5px] font-medium whitespace-nowrap transition-all duration-200 ${
                  aktiv
                    ? "bg-[linear-gradient(135deg,rgba(0,184,255,0.18),rgba(46,230,197,0.08))] text-[#5fd4ff] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                    : b.verfuegbar
                      ? "text-[#6d86a6] hover:text-[#cfe0f2]"
                      : "text-[#2c3e55] cursor-not-allowed"
                }`}
              >
                <Symbol size={13} />
                {b.label}
              </button>
            );
          })}
        </nav>

        {/* Zustand */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-[11px] ${
              verbunden
                ? "border-[#13402c] bg-[rgba(34,197,94,0.06)]"
                : "border-[#4a3410] bg-[rgba(245,158,11,0.08)]"
            }`}
          >
            <span className="relative flex w-1.5 h-1.5">
              {verbunden && (
                <span className="absolute inline-flex w-full h-full rounded-full bg-[#22c55e] opacity-60 motion-safe:animate-ping" />
              )}
              <span
                className="relative inline-flex w-1.5 h-1.5 rounded-full"
                style={{ background: verbunden ? "#22c55e" : "#f59e0b" }}
              />
            </span>
            <span className="hidden lg:inline text-[#8bb3a0] font-medium tracking-wide">
              {verbunden ? "Live" : "Getrennt"}
            </span>
            {typeof laufzeitSekunden === "number" && (
              <span className="text-[#dce7f5] tabular-nums font-semibold">
                {uhr(laufzeitSekunden)}
              </span>
            )}
          </span>
          {typeof teilnehmer === "number" && teilnehmer > 0 && (
            <span className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-[#132439] text-[#6d86a6] text-[11px] tabular-nums">
              <span className="w-1 h-1 rounded-full bg-[#2b5078]" />
              {teilnehmer} im Raum
            </span>
          )}
        </div>
      </div>
    </header>
  );
}

// ─── Phasenschiene ───────────────────────────────────────────────────────────

/**
 * Die drei Phasen über die volle Breite.
 *
 * Jede Phase ist ein Segment mit eigenem Füllstand, nicht nur ein Punkt. So
 * sieht man beides: wo man ist und wie weit die laufende Phase schon ist.
 */
function Phasenschiene({ phasen }: { phasen: CockpitPhase[] }) {
  return (
    <div className="flex-shrink-0 border-b border-[#0f1d2f] bg-[#050a12]/60">
      <ol className="flex items-stretch overflow-x-auto">
        {phasen.map((p, i) => (
          <li
            key={p.key}
            className={`relative flex-1 min-w-[150px] px-4 sm:px-6 py-3.5 flex items-center gap-3 ${
              i > 0 ? "border-l border-[#0f1d2f]" : ""
            } ${p.aktiv ? "bg-[linear-gradient(180deg,rgba(0,184,255,0.07),transparent)]" : ""}`}
          >
            <span
              className={`flex-shrink-0 w-[30px] h-[30px] rounded-xl border flex items-center justify-center text-[11.5px] font-bold transition-all duration-300 ${
                p.erledigt
                  ? "border-[#1d5236] bg-[rgba(34,197,94,0.1)] text-[#4ade80]"
                  : p.aktiv
                    ? "border-[#00b8ff]/70 bg-[linear-gradient(140deg,rgba(0,184,255,0.2),rgba(46,230,197,0.08))] text-[#5fd4ff] shadow-[0_0_20px_-4px_rgba(0,184,255,0.7)]"
                    : "border-[#152940] text-[#3a4f6b]"
              }`}
            >
              {p.erledigt ? <Check size={14} strokeWidth={3} /> : p.nummer}
            </span>
            <div className="min-w-0 hidden sm:block">
              <p
                className={`text-[12.5px] font-semibold leading-tight truncate ${
                  p.aktiv ? "text-[#dce7f5]" : p.erledigt ? "text-[#8aa3c0]" : "text-[#49607e]"
                }`}
              >
                {p.label}
              </p>
              <p className="text-[#3f5572] text-[10.5px] leading-tight truncate mt-[2px]">
                {p.unterzeile}
              </p>
            </div>

            {/* Der Lichtbalken unter der laufenden Phase. */}
            <span
              aria-hidden
              className={`absolute inset-x-0 bottom-0 h-[2px] transition-opacity duration-500 ${
                p.aktiv ? "opacity-100" : "opacity-0"
              }`}
              style={{
                background: "linear-gradient(90deg,transparent,#00b8ff,#2ee6c5,transparent)",
                boxShadow: "0 0 14px rgba(0,184,255,0.6)",
              }}
            />
          </li>
        ))}
      </ol>
    </div>
  );
}

// ─── Gesprächsraum ───────────────────────────────────────────────────────────

/**
 * Der Gesprächsraum.
 *
 * Er steht oben im Panel und nimmt dort echten Platz ein — das Gespräch ist
 * nicht die Randnotiz der Analyse, sondern ihr Anlass. Die Kacheln stehen
 * nebeneinander über die volle Panelbreite; ohne laufendes Gespräch stehen
 * dort zwei beschriftete, reservierte Plätze.
 */
function Gespraechsraum({
  video,
  steuerung,
  hinweis,
  teilnehmer,
  beraterName,
}: {
  video?: React.ReactNode;
  steuerung?: React.ReactNode;
  hinweis?: React.ReactNode;
  teilnehmer?: number | null;
  beraterName?: string | null;
}) {
  const platzhalter = (
    <div className="grid grid-cols-2 gap-2">
      {[beraterName || "Ihr Berater", "Sie"].map((wer) => (
        <div
          key={wer}
          className="relative aspect-[4/3] rounded-2xl border border-[#132439] bg-[linear-gradient(155deg,#0b1726,#060d18)] overflow-hidden flex flex-col items-center justify-center gap-2"
        >
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.07),transparent)]"
          />
          {/* Ein feines Raster im leeren Platz — er soll nach Gerät aussehen,
              nicht nach fehlendem Bild. */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.55]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(35,64,95,0.14) 1px,transparent 1px)," +
                "linear-gradient(90deg,rgba(35,64,95,0.14) 1px,transparent 1px)",
              backgroundSize: "16px 16px",
              maskImage: "radial-gradient(circle at 50% 50%, black 10%, transparent 72%)",
            }}
          />
          <span className="relative w-9 h-9 rounded-full border border-dashed border-[#23405f] flex items-center justify-center">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2b5078]" />
          </span>
          <span className="relative text-[#3f5572] text-[10px] px-2 text-center leading-tight">{wer}</span>
        </div>
      ))}
    </div>
  );

  return (
    <div className="flex-shrink-0 p-4 space-y-3 border-b border-[#0f1d2f]">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-[#3f5572] text-[10px] uppercase tracking-[0.2em] font-semibold">
          <span className="w-4 h-px bg-[#1d3b59]" />
          Gesprächsraum
        </span>
        {typeof teilnehmer === "number" && teilnehmer > 0 && (
          <span className="text-[#3f5572] text-[10px] tabular-nums">{teilnehmer} verbunden</span>
        )}
      </div>

      <div className="lg:[&_.aspect-video]:aspect-[4/3]">{video ?? platzhalter}</div>

      {(steuerung || hinweis) && (
        <div className="flex items-center justify-between gap-2 pt-0.5">
          {hinweis ? <div className="min-w-0 flex-1">{hinweis}</div> : <span />}
          {steuerung && <div className="scale-[0.84] origin-right flex-shrink-0">{steuerung}</div>}
        </div>
      )}
    </div>
  );
}

/** Sekunden als mm:ss. */
function uhr(sekunden: number): string {
  const m = Math.floor(sekunden / 60);
  const sek = Math.floor(sekunden % 60);
  return `${m}:${String(sek).padStart(2, "0")}`;
}
