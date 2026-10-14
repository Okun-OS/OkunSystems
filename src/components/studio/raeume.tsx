"use client";

import { useState } from "react";
import { Gebaeude } from "./gebaeude";
import { Boden, Himmel, Mondglanz, Sterne, Stadt } from "./kulisse";
import type { HausDaten, PlanSchritt, WorkforceModul } from "@/lib/strategie/haus";
import type { StudioPosten } from "@/lib/strategie/studio";

/**
 * Die letzten drei Räume des Rundgangs.
 *
 * Workforce, der Plan — und der Weg zurück nach draußen, wo das Haus jetzt
 * in allen Fenstern brennt. Derselbe Takt wie überall: erst wie es ist, dann
 * ein Knopf, dann der Unterschied.
 */

// ─── Workforce ───────────────────────────────────────────────────────────────

export function WorkforceSzene({
  module,
  gebucht,
  onZurueck,
}: {
  module: WorkforceModul[];
  gebucht: boolean;
  onZurueck: () => void;
}) {
  const [an, setzeAn] = useState(false);
  const ohne = module.filter((m) => m.heute.length === 0).length;
  const links = module.slice(0, 3);
  const rechts = module.slice(3);

  return (
    <RaumRahmen
      marke="OKUN Workforce"
      titel="Das Betriebssystem für Ihr Personal"
      unter={
        ohne === 0
          ? "Sechs Module. Für jeden Bereich haben Sie heute ein Programm — nur kein gemeinsames."
          : `Sechs Module. ${ohne} von ${module.length} Bereichen ${ohne === 1 ? "läuft" : "laufen"} heute ohne eigenes Programm.`
      }
      onZurueck={onZurueck}
    >
      <div className="flex items-center justify-center gap-0 w-[min(96vw,1240px)]">
        <div className="flex flex-col gap-4 flex-1">
          {links.map((m, i) => (
            <Modul key={m.key} modul={m} an={an} gebucht={gebucht} verzug={i} seite="links" />
          ))}
        </div>

        <Kern an={an} />

        <div className="flex flex-col gap-4 flex-1">
          {rechts.map((m, i) => (
            <Modul key={m.key} modul={m} an={an} gebucht={gebucht} verzug={i + 3} seite="rechts" />
          ))}
        </div>
      </div>

      <Umschalter
        an={an}
        aus="Workforce einschalten"
        ein="Zurück zu heute"
        onKlick={() => setzeAn((v) => !v)}
        gesperrt={!gebucht}
        fussnote={
          gebucht
            ? "Alle sechs Module sind im Paket Operations enthalten — ein System, nicht sechs."
            : "Im gebuchten Paket nicht enthalten. Der Raum steht trotzdem offen, damit Sie sehen, was es gibt."
        }
      />
    </RaumRahmen>
  );
}

/**
 * Die Mitte des Raums.
 *
 * Der Kern ist der eigentliche Satz dieses Raums: Nicht sechs Programme,
 * sondern eins. Deshalb steht er in der Mitte und die Module hängen daran —
 * und nicht umgekehrt.
 */
function Kern({ an }: { an: boolean }) {
  return (
    <div
      className="relative shrink-0 w-[250px] h-[250px] grid place-items-center"
      style={{ animation: "studio-pop 1s cubic-bezier(.2,1.05,.3,1) .15s both" }}
    >
      <div
        className={`absolute inset-6 rounded-full transition-all duration-1000 ${
          an ? "opacity-100" : "opacity-30"
        }`}
        style={{
          background:
            "radial-gradient(circle,rgba(46,230,197,.3),rgba(0,184,255,.1) 45%,transparent 70%)",
        }}
      />
      {[0, 1].map((r) => (
        <span
          key={r}
          aria-hidden
          className={`absolute rounded-full border transition-all duration-1000 ${
            an ? "border-[rgba(46,230,197,.4)]" : "border-[#17293f]"
          }`}
          style={{
            inset: `${26 + r * 22}px`,
            animation: an ? `studio-atmen ${6 + r}s ease-in-out infinite` : undefined,
          }}
        />
      ))}
      <div
        className={`relative w-[128px] h-[128px] rounded-full grid place-items-center text-center
          border-2 transition-all duration-700 ${
            an
              ? "border-[#2ee6c5] bg-[radial-gradient(circle,rgba(14,52,52,.95),rgba(5,18,26,.95))] shadow-[0_0_60px_-8px_rgba(46,230,197,.75)]"
              : "border-[#1f3a5c] bg-[radial-gradient(circle,rgba(10,26,44,.9),rgba(4,12,22,.95))]"
          }`}
      >
        <div>
          <span className={`block text-[22px] transition-colors duration-700 ${an ? "text-[#2ee6c5]" : "text-[#2c4660]"}`}>
            ⬡
          </span>
          <b className="block mt-1 font-mono text-[9px] tracking-[0.16em] text-[#6f8aa6]">
            WORKFORCE
          </b>
        </div>
      </div>
    </div>
  );
}

function Modul({
  modul,
  an,
  gebucht,
  verzug,
  seite,
}: {
  modul: WorkforceModul;
  an: boolean;
  gebucht: boolean;
  verzug: number;
  seite: "links" | "rechts";
}) {
  const leer = modul.heute.length === 0;

  return (
    <div
      className={`flex items-center ${seite === "rechts" ? "flex-row-reverse" : ""} ${gebucht ? "" : "opacity-60"}`}
      style={{ animation: `studio-pop .8s cubic-bezier(.2,1.05,.3,1) ${0.25 + verzug * 0.07}s both` }}
    >
      <div
        className={`flex-1 rounded-2xl border p-4 min-h-[124px] flex flex-col transition-all duration-700 ${
          an
            ? "border-[rgba(46,230,197,.5)] bg-[linear-gradient(165deg,rgba(11,42,42,.9),rgba(6,20,26,.92))]"
            : leer
              ? "border-dashed border-[rgba(245,165,36,.45)] bg-[rgba(245,165,36,.045)]"
              : "border-[#1f3a5c] bg-[rgba(255,255,255,.022)]"
        }`}
      >
        <b className="text-[13.5px] font-semibold">{modul.titel}</b>
        <p className="mt-1.5 text-[11px] text-[#90a6c0] leading-relaxed">{modul.beschreibung}</p>
        <p className="mt-auto pt-2.5 text-[10.5px]">
          {an ? (
            <span className="text-[#2ee6c5]">läuft in Workforce</span>
          ) : leer ? (
            <span className="text-[#f5a524]">heute ohne Programm</span>
          ) : (
            <span className="text-[#52687f]">heute: {modul.heute.join(" · ")}</span>
          )}
        </p>
      </div>

      {/* Die Leitung zum Kern — heute nur angedeutet, nachher durchgeschaltet. */}
      <span
        aria-hidden
        className={`relative h-0.5 w-[52px] shrink-0 transition-all duration-700 ${
          an ? "bg-[linear-gradient(90deg,rgba(46,230,197,.15),#2ee6c5)]" : "bg-[#17293f]"
        } ${seite === "rechts" ? "rotate-180" : ""}`}
      >
        <span
          className={`absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full transition-all duration-700 ${
            an ? "bg-[#2ee6c5] shadow-[0_0_10px_rgba(46,230,197,.9)]" : "bg-[#24395a]"
          }`}
        />
      </span>
    </div>
  );
}

// ─── Der Plan ────────────────────────────────────────────────────────────────

export function PlanSzene({
  plan,
  gewaehlt,
  onZurueck,
  onHinaus,
}: {
  plan: PlanSchritt[];
  gewaehlt: StudioPosten[];
  onZurueck: () => void;
  onHinaus: () => void;
}) {
  return (
    <RaumRahmen
      marke="Ihr Plan"
      titel="Von hier bis zum Go-Live"
      unter="Die Schritte kommen aus Ihrem Vertrag. Einer davon ist dieses Gespräch."
      onZurueck={onZurueck}
    >
      <div className="w-[min(94vw,1180px)]">
        <div className="relative flex items-start">
          <div className="absolute left-[7%] right-[7%] top-[21px] h-0.5 bg-[#1f3a5c] overflow-hidden">
            <span
              className="absolute inset-y-0 left-0 bg-[linear-gradient(90deg,#2ee6c5,#00b8ff)] origin-left"
              style={{
                width: `${(100 / Math.max(plan.length - 1, 1)) * plan.filter((p) => p.erledigt).length}%`,
                animation: "studio-linie-ein 1.4s cubic-bezier(.3,.9,.3,1) .5s both",
              }}
            />
          </div>
          {plan.map((p, i) => (
            <div
              key={p.nummer}
              className="flex-1 flex flex-col items-center gap-2.5 relative z-10 px-2"
              style={{ animation: `studio-pop .7s cubic-bezier(.2,1.1,.3,1) ${0.25 + i * 0.09}s both` }}
            >
              <span
                className={`w-11 h-11 rounded-full grid place-items-center font-mono text-[14px] font-bold border-2 ${
                  p.erledigt
                    ? "border-[#2ee6c5] text-[#2ee6c5] bg-[rgba(46,230,197,.1)]"
                    : p.jetzt
                      ? "border-[#00b8ff] text-[#00b8ff] bg-[rgba(0,184,255,.14)] shadow-[0_0_24px_rgba(0,184,255,.5)]"
                      : "border-[#1f3a5c] text-[#52687f] bg-[#0b1523]"
                }`}
              >
                {p.erledigt ? "✓" : p.nummer}
              </span>
              <b className={`text-[12.5px] font-semibold text-center ${p.jetzt ? "text-[#eef3f9]" : ""}`}>
                {p.titel}
              </b>
              <small className="text-[10px] text-[#52687f] text-center leading-snug">{p.was}</small>
              {p.jetzt && (
                <span className="px-2.5 py-1 rounded-full bg-[rgba(0,184,255,.12)] border border-[rgba(0,184,255,.3)] text-[#4fd0ff] font-mono text-[9px] tracking-[0.12em]">
                  SIE SIND HIER
                </span>
              )}
            </div>
          ))}
        </div>

        {gewaehlt.length > 0 && (
          <div
            className="mt-12 rounded-2xl border border-[rgba(0,184,255,.25)] bg-[rgba(0,184,255,.05)] p-6"
            style={{ animation: "studio-auf .9s cubic-bezier(.2,.85,.25,1) 1s both" }}
          >
            <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-[#4d93ba] mb-4">
              Was wir für Sie umsetzen
            </p>
            <div className="grid grid-cols-3 gap-4">
              {gewaehlt.map((p, i) => (
                <div key={p.id} className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-[#00b8ff] text-[#041018] grid place-items-center
                    font-mono text-[11px] font-bold flex-shrink-0">
                    {i + 1}
                  </span>
                  <div>
                    <b className="text-[12.5px] font-semibold leading-snug block">{p.titel}</b>
                    {p.womit && (
                      <span className="text-[10.5px] text-[#52687f] block mt-1">{p.womit}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="mt-10 text-center">
        <button
          onClick={onHinaus}
          className="flex items-center gap-3 px-7 py-3.5 rounded-full text-[#041018] text-[13.5px] font-bold
            mx-auto bg-[linear-gradient(135deg,#8af2dd,#2ee6c5)]
            shadow-[0_16px_42px_-14px_rgba(46,230,197,.9)] hover:-translate-y-0.5 transition-transform duration-300"
        >
          <span className="text-base">→</span> Nach draußen
        </button>
      </div>
    </RaumRahmen>
  );
}

// ─── Draußen, danach ─────────────────────────────────────────────────────────

/**
 * Dasselbe Haus, nur brennt jetzt überall Licht.
 *
 * Der Schluss des Rundgangs und das einzige Bild, das zweimal vorkommt. Wer
 * am Anfang davorstand und am Ende wieder, hat die Veränderung gesehen, ohne
 * dass jemand sie behaupten musste.
 */
export function Abschied({
  haus,
  untertitel,
  gewaehlt,
  onZurueck,
}: {
  haus: HausDaten;
  untertitel: string | null;
  gewaehlt: number;
  onZurueck: () => void;
}) {
  return (
    <div className="fixed inset-0 overflow-hidden">
      <div className="absolute inset-0">
        <Himmel />
        <Sterne />
        <Mondglanz />
        <Stadt />
        <Boden />

        {/* Der warme Schein, den ein volles Haus auf die Straße wirft. */}
        <div
          aria-hidden
          className="absolute left-1/2 bottom-0 w-[min(90vw,1500px)] h-[52%] -translate-x-1/2"
          style={{
            background:
              "radial-gradient(60% 70% at 50% 85%,rgba(46,230,197,.14),rgba(0,184,255,.07) 45%,transparent 72%)",
            animation: "studio-schrift-ein 2.4s ease-out .3s both",
          }}
        />

        <div
          className="absolute left-1/2 bottom-[3%] w-[min(72vw,1100px)] studio-erleuchtet"
          style={{ transform: "translateX(-50%)" }}
        >
          <Gebaeude
            schild={haus.schild}
            untertitel={untertitel}
            stockwerke={haus.stockwerke}
            fahrzeug={haus.fahrzeug}
            onTuer={onZurueck}
            erleuchtet
          />
        </div>
      </div>

      <button
        onClick={onZurueck}
        className="absolute left-6 top-6 z-20 flex items-center gap-2 px-4 py-2.5 rounded-full
          bg-[rgba(10,22,38,.8)] border border-[rgba(0,184,255,.2)] text-[#90a6c0] text-xs
          backdrop-blur hover:text-[#eef3f9] hover:border-[rgba(0,184,255,.5)] transition-colors"
        style={{ animation: "studio-schrift-ein 1.2s cubic-bezier(.16,1,.3,1) 1.4s both" }}
      >
        ← Noch einmal hinein
      </button>

      <div
        className="absolute inset-x-0 top-[5.5%] text-center px-6 z-10"
        style={{ animation: "studio-schrift-ein 1.4s cubic-bezier(.16,1,.3,1) .6s both" }}
      >
        <p className="font-mono text-[9px] uppercase tracking-[0.26em] text-[#3a4f68] font-semibold">
          Das war Ihr Haus
        </p>
        <h2 className="mt-2.5 text-[clamp(22px,2.7vw,36px)] font-bold tracking-[-0.025em]">
          {gewaehlt > 0
            ? `${gewaehlt} ${gewaehlt === 1 ? "Maßnahme steht" : "Maßnahmen stehen"} fest.`
            : "Jetzt entscheiden Sie."}
        </h2>
        <p className="mt-2 mx-auto max-w-[52ch] text-[#8098b3] text-[12.5px] leading-relaxed">
          Alles, was Sie gesehen haben, steht ab sofort in Ihrem Portal — und ist
          zugleich der Arbeitsauftrag für die Umsetzung.
        </p>
      </div>
    </div>
  );
}

// ─── Gemeinsamer Rahmen ──────────────────────────────────────────────────────

function RaumRahmen({
  marke,
  titel,
  unter,
  onZurueck,
  children,
}: {
  marke: string;
  titel: string;
  unter: string;
  onZurueck: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 overflow-auto"
      style={{ background: "radial-gradient(90% 80% at 50% 8%,#0a1f36,#040c18 58%,#02060e 100%)" }}
    >
      <button
        onClick={onZurueck}
        className="fixed left-6 top-6 z-20 flex items-center gap-2 px-4 py-2.5 rounded-full
          bg-[rgba(10,22,38,.8)] border border-[rgba(0,184,255,.2)] text-[#90a6c0] text-xs
          backdrop-blur hover:text-[#eef3f9] hover:border-[rgba(0,184,255,.5)] transition-colors"
      >
        ← Eingangshalle
      </button>

      <div className="min-h-full flex flex-col items-center justify-center py-24 px-6">
        <div
          className="text-center mb-10"
          style={{ animation: "studio-auf .8s cubic-bezier(.2,.85,.25,1) both" }}
        >
          <p className="font-mono text-[9px] uppercase tracking-[0.26em] text-[#3a4f68] font-semibold">
            {marke}
          </p>
          <h2 className="mt-2.5 text-[clamp(21px,2.5vw,34px)] font-bold tracking-[-0.02em]">{titel}</h2>
          <p className="mt-2.5 mx-auto max-w-[60ch] text-[#90a6c0] text-[12.5px]">{unter}</p>
        </div>
        {children}
      </div>
    </div>
  );
}

function Umschalter({
  an,
  aus,
  ein,
  onKlick,
  gesperrt,
  fussnote,
}: {
  an: boolean;
  aus: string;
  ein: string;
  onKlick: () => void;
  gesperrt?: boolean;
  fussnote?: string;
}) {
  return (
    <div className="mt-10 text-center">
      <button
        onClick={onKlick}
        disabled={gesperrt}
        className={`flex items-center gap-3 px-7 py-3.5 rounded-full text-[#041018] text-[13.5px] font-bold
          mx-auto transition-transform duration-300 hover:-translate-y-0.5 disabled:opacity-40
          disabled:cursor-not-allowed ${
            an
              ? "bg-[linear-gradient(135deg,#8af2dd,#2ee6c5)] shadow-[0_16px_42px_-14px_rgba(46,230,197,.9)]"
              : "bg-[linear-gradient(135deg,#7adcff,#00b8ff)] shadow-[0_16px_42px_-14px_rgba(0,184,255,.95)]"
          }`}
      >
        <span className="text-base">✦</span>
        {an ? ein : aus}
      </button>
      {fussnote && (
        <p className="mt-3 text-[11px] text-[#44546b] max-w-[48ch] mx-auto">{fussnote}</p>
      )}
    </div>
  );
}
