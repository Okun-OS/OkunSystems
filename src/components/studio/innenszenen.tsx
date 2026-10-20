"use client";

import { useState } from "react";
import { Innenraum } from "./innenraum";
import { Pikto } from "./piktogramme";
import { useTakt } from "./takt";
import { profilTafeln, schildGroesse, type HausDaten, type Raum } from "@/lib/strategie/haus";
import {
  boden,
  flaeche,
  lerp,
  massstab,
  rueckwand,
  type Kasten,
} from "@/lib/studio/perspektive";
import { umbrechen } from "@/lib/studio/text";

/**
 * Foyer und Flur — die Grundebene des Hauses.
 *
 * Bis hierher sprang man von draußen direkt auf eine Kachelwand. Jetzt
 * kommt man an: erst ein Empfang, in dem der Betrieb sich selbst vorstellt,
 * dann ein Gang mit Türen. Beides spielt in derselben Hülle wie jeder
 * andere Raum, damit das Haus sich wie ein Haus anfühlt und nicht wie eine
 * Folge von Bildschirmen.
 */

const FOYER: Kasten = { links: 360, rechts: 1240, oben: 215, unten: 610 };
const FLUR: Kasten = { links: 235, rechts: 1365, oben: 185, unten: 625 };

// ─── Das Foyer ───────────────────────────────────────────────────────────────

export function Foyer({
  haus,
  zeitfresser,
  onWeiter,
}: {
  haus: HausDaten;
  zeitfresser: Array<{ label: string; stunden: string }>;
  onWeiter: () => void;
}) {
  const { gefuehrt } = useTakt();
  const [offen, setzeOffen] = useState(false);
  const tafeln = profilTafeln(haus.profil).slice(0, 4);

  // Der Durchgang in der Rückwand, durch den es weitergeht.
  const d1 = rueckwand(0.37, 0.4, FOYER);
  const d2 = rueckwand(0.63, 0.4, FOYER);
  const d3 = rueckwand(0.63, 1, FOYER);
  const d4 = rueckwand(0.37, 1, FOYER);

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#04080f]">
      <Innenraum
        kasten={FOYER}
        akzent="#00b8ff"
        warm
        lichter={3}
        fenster="links"
        rueckseite={
          <g>
            {/* Der Name an der Wand — dasselbe Schild wie draußen, nur innen. */}
            <Wandschild kasten={FOYER} text={haus.schild} />

            {tafeln.map((t, i) => {
              const seite = i % 2 === 0 ? 0 : 1;
              const reihe = Math.floor(i / 2);
              const u = seite === 0 ? 0.04 : 0.72;
              const v = 0.42 + reihe * 0.26;
              const a = rueckwand(u, v, FOYER);
              const b = rueckwand(u + 0.24, v + 0.21, FOYER);
              return (
                <g key={t.label}>
                  <rect
                    x={a.x}
                    y={a.y}
                    width={b.x - a.x}
                    height={b.y - a.y}
                    rx="4"
                    fill="#0d1d30"
                    stroke="#24405e"
                  />
                  <text
                    x={a.x + 14}
                    y={a.y + (b.y - a.y) * 0.52}
                    className="font-mono"
                    fontSize="30"
                    fill="#9fdcff"
                    fontWeight="700"
                  >
                    {t.wert}
                  </text>
                  <text
                    x={a.x + 14}
                    y={a.y + (b.y - a.y) * 0.84}
                    className="font-mono"
                    fontSize="13"
                    fill="#587492"
                    letterSpacing="1.6"
                  >
                    {t.label.toUpperCase()}
                  </text>
                </g>
              );
            })}

            {/* Der Durchgang */}
            <g
              className={gefuehrt ? "" : "cursor-pointer"}
              onClick={gefuehrt ? undefined : onWeiter}
              onMouseEnter={() => setzeOffen(true)}
              onMouseLeave={() => setzeOffen(false)}
            >
              <defs>
                <linearGradient id="foyer-gang" x1="0" y1="1" x2="0" y2="0">
                  <stop offset="0" stopColor="#9fd8ff" stopOpacity=".3" />
                  <stop offset=".55" stopColor="#9fd8ff" stopOpacity=".08" />
                  <stop offset="1" stopColor="#9fd8ff" stopOpacity="0" />
                </linearGradient>
              </defs>

              {/*
                Kein schwarzes Loch, sondern ein Durchgang.

                Dahinter steht schon der Gang: eine hellere Wand, ein Boden,
                der weiterläuft, und Licht von oben. Erst dadurch sieht man,
                dass es weitergeht — eine dunkle Fläche sieht aus wie eine
                Wand mit einem Pfeil darauf.
              */}
              <polygon points={flaeche(d1, d2, d3, d4)} fill="#071626" />
              <polygon
                points={flaeche(
                  { x: d1.x + 34, y: d1.y + 26 },
                  { x: d2.x - 34, y: d2.y + 26 },
                  { x: d3.x - 34, y: d3.y },
                  { x: d4.x + 34, y: d4.y }
                )}
                fill="#0e2439"
              />
              <polygon
                points={flaeche(
                  { x: d1.x + 34, y: d1.y + 26 },
                  { x: d2.x - 34, y: d2.y + 26 },
                  { x: d2.x - 34, y: d2.y + 44 },
                  { x: d1.x + 34, y: d1.y + 44 }
                )}
                fill="#bfe9ff"
                opacity={offen ? 0.5 : 0.3}
                style={{ transition: "opacity .6s ease" }}
              />
              <polygon
                points={flaeche(d1, d2, d3, d4)}
                fill="url(#foyer-gang)"
                opacity={offen ? 1 : 0.7}
                style={{ transition: "opacity .6s ease" }}
              />
              {/* Zarge */}
              <polygon
                points={flaeche(d1, d2, d3, d4)}
                fill="none"
                stroke="#294966"
                strokeWidth="11"
              />
              <polygon
                points={flaeche(d1, d2, d3, d4)}
                fill="none"
                stroke="#5fc8ff"
                strokeWidth={offen ? 2.5 : 1.2}
                opacity={offen ? 0.9 : 0.4}
                style={{ transition: "all .5s ease" }}
              />
              <Pikto
                name="pfeil"
                x={(d1.x + d2.x) / 2}
                y={d4.y - 52}
                groesse={34}
                farbe="#9fd8ff"
                deckkraft={offen ? 1 : 0.7}
              />
            </g>
          </g>
        }
      >
        {/* Das Licht, das aus dem Durchgang auf den Boden fällt. */}
        <polygon
          points={flaeche(
            { x: d4.x, y: d4.y },
            { x: d3.x, y: d3.y },
            boden(0.1, 0.78, FOYER),
            boden(0.1, 0.22, FOYER)
          )}
          fill="#9fd8ff"
          opacity={offen ? 0.12 : 0.07}
          style={{ transition: "opacity .6s ease" }}
        />
        <Tresen kasten={FOYER} t={0.3} u={0.8} />
        <Pflanze kasten={FOYER} t={0.3} u={0.12} />
      </Innenraum>

      <div
        className="absolute inset-x-0 top-[7%] text-center px-6 pointer-events-none"
        style={{ animation: "studio-auf .9s cubic-bezier(.2,.85,.25,1) both" }}
      >
        <p className="font-mono text-[9px] uppercase tracking-[0.26em] text-[#4d93ba] font-semibold">
          Empfang
        </p>
        <h2 className="mt-2.5 text-[clamp(22px,2.7vw,36px)] font-bold tracking-[-0.02em]">
          {haus.hallensatz}
        </h2>
        {zeitfresser.length > 0 && (
          <p className="mt-3 mx-auto max-w-[58ch] text-[#90a6c0] text-[13px] leading-relaxed">
            Das meiste Ihrer Zeit geht heute für{" "}
            <b className="text-[#cfe0f2] font-semibold">{zeitfresser[0].label}</b> drauf —{" "}
            {zeitfresser[0].stunden} im Monat. Hinten geht es weiter.
          </p>
        )}
      </div>

      {!gefuehrt && (
        <button
          onClick={onWeiter}
          className="absolute left-1/2 bottom-[7%] -translate-x-1/2 flex items-center gap-2.5 px-6 py-3
            rounded-full text-[#041018] text-[13px] font-bold
            bg-[linear-gradient(135deg,#7adcff,#00b8ff)] shadow-[0_16px_42px_-14px_rgba(0,184,255,.95)]
            hover:-translate-y-0.5 transition-transform duration-300"
          style={{ animation: "studio-schrift-ein 1.2s cubic-bezier(.16,1,.3,1) .9s both" }}
        >
          In den Gang <span className="text-base">→</span>
        </button>
      )}
    </div>
  );
}

// ─── Der Flur ────────────────────────────────────────────────────────────────

const RAUM_ZEICHEN: Record<string, string> = {
  ablaeufe: "ablaeufe",
  grundlagen: "grundlagen",
  automationen: "automationen",
  workforce: "workforce",
};

/**
 * Jede Tür hat ihr eigenes Licht.
 *
 * Vier gleich leuchtende Türen sind vier Kacheln. Erst die Farbe macht sie
 * unterscheidbar, bevor man den Namen gelesen hat — und sie ist dieselbe,
 * die den Raum dahinter beleuchtet.
 */
const RAUM_LICHT: Record<string, string> = {
  ablaeufe: "#7fd0ff",
  grundlagen: "#ffc879",
  automationen: "#7df0da",
  workforce: "#a9c6ff",
};

export function Flur({
  raeume,
  onRaum,
  onPlan,
  onZurueck,
}: {
  raeume: Raum[];
  onRaum: (key: string) => void;
  onPlan: () => void;
  onZurueck: () => void;
}) {
  const { gefuehrt } = useTakt();
  const [ueber, setzeUeber] = useState<string | null>(null);

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#04080f]">
      <Innenraum kasten={FLUR} akzent="#00b8ff" lichter={3} fenster="links">
        <g>
          <defs>
            <radialGradient id="tuer-licht">
              <stop offset="0" stopColor="#bfe9ff" stopOpacity=".34" />
              <stop offset=".5" stopColor="#bfe9ff" stopOpacity=".12" />
              <stop offset="1" stopColor="#bfe9ff" stopOpacity="0" />
            </radialGradient>
          </defs>
          {raeume.map((r, i) => (
            <Tuer
              key={r.key}
              raum={r}
              platz={i}
              anzahl={raeume.length}
              ueber={ueber === r.key}
              gefuehrt={gefuehrt}
              onUeber={(an) => setzeUeber(an ? r.key : null)}
              onKlick={() => !r.verschlossen && !gefuehrt && onRaum(r.key)}
            />
          ))}
        </g>
      </Innenraum>

      <div
        className="absolute inset-x-0 top-[6.5%] text-center px-6 pointer-events-none"
        style={{ animation: "studio-auf .9s cubic-bezier(.2,.85,.25,1) both" }}
      >
        <p className="font-mono text-[9px] uppercase tracking-[0.26em] text-[#4d93ba] font-semibold">
          Der Gang
        </p>
        <h2 className="mt-2.5 text-[clamp(21px,2.5vw,34px)] font-bold tracking-[-0.02em]">
          Vier Türen, und was dahinter steht
        </h2>
        <p className="mt-2.5 mx-auto max-w-[58ch] text-[#90a6c0] text-[12.5px]">
          Hinter jeder liegt ein Teil Ihres Betriebs — so, wie der Blueprint ihn
          vorgefunden hat.
        </p>
      </div>

      {!gefuehrt && (
        <>
          <button
            onClick={onZurueck}
            className="absolute left-6 top-6 z-20 flex items-center gap-2 px-4 py-2.5 rounded-full
              bg-[rgba(10,22,38,.8)] border border-[rgba(0,184,255,.2)] text-[#90a6c0] text-xs
              backdrop-blur hover:text-[#eef3f9] hover:border-[rgba(0,184,255,.5)] transition-colors"
          >
            ← Empfang
          </button>
          <button
            onClick={onPlan}
            className="absolute left-1/2 bottom-[5.5%] -translate-x-1/2 flex items-center gap-2.5 px-5 py-2.5
              rounded-full border border-[rgba(46,230,197,.3)] bg-[rgba(8,26,30,.75)] backdrop-blur
              text-[#8fd8cb] text-xs hover:text-[#eef3f9] hover:border-[rgba(46,230,197,.65)]
              transition-colors"
            style={{ animation: "studio-schrift-ein 1.1s cubic-bezier(.16,1,.3,1) 1s both" }}
          >
            Ihr Plan <span className="text-sm">→</span>
          </button>
        </>
      )}
    </div>
  );
}

/**
 * Eine Tür in der Rückwand des Gangs.
 *
 * Mit Rahmen, Glas, Schild darüber und Licht, das unten durchfällt. Beim
 * Darüberfahren geht sie einen Spalt auf — das ist die Einladung, die eine
 * Kachel nie hatte. Ein verschlossener Raum bleibt sichtbar, aber dunkel:
 * Er existiert wirklich, er gehört nur nicht zum gebuchten Paket.
 */
function Tuer({
  raum,
  platz,
  anzahl,
  ueber,
  gefuehrt,
  onUeber,
  onKlick,
}: {
  raum: Raum;
  platz: number;
  anzahl: number;
  ueber: boolean;
  gefuehrt: boolean;
  onUeber: (an: boolean) => void;
  onKlick: () => void;
}) {
  /*
    Türmaße, keine Kachelmaße.

    Eine Tür ist gut doppelt so hoch wie breit und steht auf dem Boden. Das
    allein entscheidet, ob die Wand wie ein Gang aussieht oder wie eine
    Reihe Automaten.
  */
  const feld = 0.88 / anzahl;
  const u0 = 0.06 + platz * feld + feld * 0.27;
  const u1 = u0 + feld * 0.46;

  const a = rueckwand(u0, 0.2, FLUR);
  const b = rueckwand(u1, 0.2, FLUR);
  const c = rueckwand(u1, 1, FLUR);
  const d = rueckwand(u0, 1, FLUR);
  const mitte = (a.x + b.x) / 2;
  const zu = raum.verschlossen;
  const hell = ueber && !zu && !gefuehrt;
  const licht = zu ? "#2a4057" : RAUM_LICHT[raum.key] ?? "#7fd0ff";

  return (
    <g
      className={zu || gefuehrt ? "" : "cursor-pointer"}
      onClick={onKlick}
      onMouseEnter={() => onUeber(true)}
      onMouseLeave={() => onUeber(false)}
      style={{ transition: "opacity .5s ease" }}
    >
      {/* Das Licht hinter der Tür, das durch Spalt und Glas fällt */}
      <rect
        x={a.x - 6}
        y={a.y - 6}
        width={b.x - a.x + 12}
        height={d.y - a.y + 6}
        fill={zu ? "#060f1b" : licht}
        opacity={zu ? 1 : hell ? 0.9 : 0.55}
        style={{ transition: "opacity .5s ease" }}
      />
      {/* Zarge */}
      <rect
        x={a.x - 11}
        y={a.y - 11}
        width={b.x - a.x + 22}
        height={c.y - b.y + 11}
        rx="2"
        fill="none"
        stroke="#223c59"
        strokeWidth="9"
      />
      {/* Türblatt — beim Darüberfahren schwingt es auf */}
      <g
        style={{
          transform: hell ? "scaleX(.8)" : "scaleX(1)",
          transformOrigin: `${b.x}px ${(a.y + d.y) / 2}px`,
          transition: "transform .6s cubic-bezier(.2,.8,.3,1)",
        }}
      >
        <rect x={a.x} y={a.y} width={b.x - a.x} height={d.y - a.y} fill={zu ? "#0b1727" : "#122540"} />
        <rect
          x={a.x + 3}
          y={a.y + 3}
          width={b.x - a.x - 6}
          height={d.y - a.y - 6}
          fill="none"
          stroke="#1d3450"
        />
        {/* Glasscheibe im oberen Drittel */}
        <rect
          x={a.x + 16}
          y={a.y + 22}
          width={b.x - a.x - 32}
          height={(d.y - a.y) * 0.3}
          rx="1"
          fill={zu ? "#0c1829" : licht}
          opacity={zu ? 0.8 : hell ? 0.6 : 0.3}
          style={{ transition: "opacity .5s ease" }}
        />
        {/* Griff */}
        <rect x={a.x + 13} y={a.y + (d.y - a.y) * 0.58} width="16" height="5" rx="2.5" fill="#5d82a6" />
        <Pikto
          name={RAUM_ZEICHEN[raum.key] ?? "pfeil"}
          x={mitte}
          y={a.y + (d.y - a.y) * 0.78}
          groesse={40}
          strich={1.5}
          farbe={zu ? "#2e4867" : hell ? "#ffffff" : licht}
        />
        {zu && <Pikto name="schloss" x={mitte} y={a.y + (d.y - a.y) * 0.44} groesse={30} farbe="#3b5574" />}
      </g>

      {/* Schild über der Tür */}
      <g>
        <rect
          x={a.x - 14}
          y={a.y - 62}
          width={b.x - a.x + 28}
          height="32"
          rx="3"
          fill={zu ? "#0d1a2a" : "#08202f"}
          stroke={zu ? "#1f3550" : licht}
          strokeOpacity={zu ? 1 : 0.55}
        />
        <text
          x={mitte}
          y={a.y - 40}
          textAnchor="middle"
          className="font-mono"
          fontSize="14"
          letterSpacing="2"
          fill={zu ? "#4c6a88" : licht}
        >
          {raum.marke}
        </text>
      </g>

      {/* Name und Kennzahl darunter, auf dem Boden lesbar */}
      <text
        textAnchor="middle"
        className="font-sans"
        fontSize="21"
        fontWeight="600"
        fill={zu ? "#5c7794" : "#e6f1fb"}
      >
        {umbrechen(raum.titel, 15).map((zeile, i) => (
          <tspan key={zeile} x={mitte} y={d.y + 44 + i * 25}>
            {zeile}
          </tspan>
        ))}
      </text>
      <text
        x={mitte}
        y={d.y + 44 + umbrechen(raum.titel, 15).length * 25 + 4}
        textAnchor="middle"
        className="font-mono"
        fontSize="15"
        fill={zu ? "#49617d" : "#6f9cc0"}
      >
        {zu ? "im größeren Paket" : raum.kennzahl}
      </text>

      {/* Lichtpfütze vor der Tür */}
      <ellipse
        cx={mitte}
        cy={d.y + 14}
        rx={(b.x - a.x) * 0.95}
        ry="26"
        fill={licht}
        opacity={zu ? 0.03 : hell ? 0.22 : 0.09}
        filter="url(#ir-weich)"
        style={{ transition: "opacity .5s ease" }}
      />
    </g>
  );
}

// ─── Möbel ───────────────────────────────────────────────────────────────────

/** Der Empfangstresen. Ohne ihn ist ein Foyer nur eine leere Halle. */
function Tresen({ kasten, t, u }: { kasten: Kasten; t: number; u: number }) {
  const s = massstab(t, kasten);
  const breite = 360 * s;
  const hoehe = 140 * s;
  const fuss = boden(t, u, kasten);
  const links = fuss.x - breite / 2;
  const platte = fuss.y - hoehe;

  return (
    <g>
      <ellipse cx={fuss.x} cy={fuss.y + 4} rx={breite * 0.6} ry={14 * s} fill="#000" opacity=".45" />
      <rect x={links} y={platte} width={breite} height={hoehe} rx={3} fill="#15283d" />
      <rect x={links} y={platte} width={breite} height={hoehe * 0.16} fill="#1e3550" />
      <rect x={links - 10 * s} y={platte - 12 * s} width={breite + 20 * s} height={14 * s} rx={3} fill="#223b58" />
      <rect
        x={links + 12 * s}
        y={platte + hoehe * 0.42}
        width={breite - 24 * s}
        height={2}
        fill="#2f82b8"
        opacity=".5"
      />
      <rect
        x={links}
        y={platte + hoehe - 4}
        width={breite}
        height="4"
        fill="#9fd8ff"
        opacity=".12"
      />
    </g>
  );
}

/** Eine Pflanze. Das billigste Mittel, einen Raum bewohnt aussehen zu lassen. */
function Pflanze({ kasten, t, u }: { kasten: Kasten; t: number; u: number }) {
  const s = massstab(t, kasten);
  const fuss = boden(t, u, kasten);
  const topf = 54 * s;

  return (
    <g>
      <ellipse cx={fuss.x} cy={fuss.y + 3} rx={topf * 0.9} ry={10 * s} fill="#000" opacity=".4" />
      {Array.from({ length: 7 }, (_, i) => {
        const neigung = lerp(-1, 1, i / 6);
        const hoehe = (150 + (i % 3) * 36) * s;
        return (
          <path
            key={i}
            d={`M${fuss.x} ${fuss.y - topf * 0.8} Q${fuss.x + neigung * 70 * s} ${fuss.y - hoehe * 0.8} ${
              fuss.x + neigung * 96 * s
            } ${fuss.y - hoehe}`}
            stroke="#2f6b57"
            strokeWidth={7 * s}
            strokeLinecap="round"
            fill="none"
            opacity=".9"
          />
        );
      })}
      <path
        d={`M${fuss.x - topf * 0.62} ${fuss.y - topf} L${fuss.x + topf * 0.62} ${fuss.y - topf} L${
          fuss.x + topf * 0.48
        } ${fuss.y} L${fuss.x - topf * 0.48} ${fuss.y} Z`}
        fill="#1b2f45"
      />
    </g>
  );
}

/** Der Firmenname an der Rückwand — innen dasselbe Schild wie außen. */
function Wandschild({ kasten, text }: { kasten: Kasten; text: string }) {
  const a = rueckwand(0.06, 0.07, kasten);
  const b = rueckwand(0.94, 0.3, kasten);
  return (
    <g>
      <rect x={a.x} y={a.y} width={b.x - a.x} height={b.y - a.y} rx="5" fill="#0c1c2d" />
      <rect
        x={a.x}
        y={b.y - 3}
        width={b.x - a.x}
        height="3"
        fill="#5fc8ff"
        opacity=".8"
      />
      <text
        x={(a.x + b.x) / 2}
        y={(a.y + b.y) / 2 + 13}
        textAnchor="middle"
        className="font-mono"
        fontSize={schildGroesse(text, b.x - a.x, 40)}
        fontWeight="700"
        letterSpacing="4"
        fill="#dceeff"
      >
        {text}
      </text>
    </g>
  );
}
