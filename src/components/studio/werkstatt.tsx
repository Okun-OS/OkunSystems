"use client";

import { useEffect, useRef, useState } from "react";
import { Innenraum } from "./innenraum";
import { Pikto } from "./piktogramme";
import { useTakt } from "./takt";
import type { AblaufRaum, AblaufStation } from "@/lib/strategie/haus";
import { baueDrehbuch, type Drehbuch, type TourSchritt } from "@/lib/studio/drehbuch";
import type { StudioPosten } from "@/lib/strategie/studio";
import { boden, flaeche, massstab, plaetze, rueckwand, type Kasten } from "@/lib/studio/perspektive";
import { umbrechen } from "@/lib/studio/text";

/**
 * Der Raum, in dem die Arbeit steht — und sich erklärt.
 *
 * Ein Bild allein erklärt keinen Prozess. Deshalb läuft dieser Raum als
 * Drehbuch ab: erst eine Einführung, was dieser Ablauf ist und was wir
 * vorgefunden haben; dann Station für Station, jeweils mit Scheinwerfer auf
 * genau dem Platz, um den es geht; dann der Umbau; dann das Ergebnis.
 *
 * Der Schritt steht in der Sitzung und nicht in dieser Komponente. Im
 * Gespräch schaltet der Berater weiter, und beim Kunden steht derselbe
 * Scheinwerfer auf demselben Platz — ohne geteilten Bildschirm.
 */

const WERKSTATT: Kasten = { links: 290, rechts: 1310, oben: 195, unten: 625 };
/** Die Tiefe, in der die Reihe steht. Weit genug weg, dass man sie ganz sieht. */
const REIHE = 0.66;
/** Wie lange die Verwandlung dauert. */
const UMBAU_MS = 2600;
/** Wie lange die Welle braucht, um von links nach rechts zu laufen. */
const WELLE_S = 1.6;

export function WerkstattSzene({
  raum,
  aufwandMinuten,
  posten,
  onZurueck,
}: {
  raum: AblaufRaum;
  aufwandMinuten: number;
  /** Die freigegebenen Posten — sie tragen, was der Umbau verspricht. */
  posten: StudioPosten[];
  onZurueck: () => void;
}) {
  const { stufe, setzeStufe, gefuehrt } = useTakt();
  const drehbuch = baueDrehbuch(raum, posten);

  const letzterTourSchritt = drehbuch.tour.length;
  const UEBERSICHT = letzterTourSchritt + 1;
  const DANACH = letzterTourSchritt + 2;

  const inTour = stufe >= 1 && stufe <= letzterTourSchritt;
  const aktiv = inTour ? stufe - 1 : null;
  const umgebaut = stufe >= DANACH;
  const stunden = (aufwandMinuten / 60).toLocaleString("de-DE", { maximumFractionDigits: 1 });

  /*
    Die Verwandlung.

    Sie läuft, sobald beide Seiten den Schritt sehen — also auch beim
    Kunden, der ihn über den Draht bekommt. Der Blitz ist kein Effekt um
    des Effekts willen: Er verdeckt den Moment, in dem sich acht Plätze
    gleichzeitig ändern, und macht aus einem Umspringen eine Bewegung.
  */
  const [blitz, setzeBlitz] = useState(false);
  const [zuletzt, merke] = useState(stufe);
  /*
    Der Blitz wird noch im selben Durchgang gesetzt, nicht in einem Effekt.

    Sonst beginnt die Verwandlung bereits, während der Verzug noch null ist —
    die Plätze springen um, und die Welle läuft hinterher über ein Bild, das
    schon fertig ist.
  */
  if (stufe !== zuletzt) {
    merke(stufe);
    if (zuletzt < DANACH && stufe >= DANACH) setzeBlitz(true);
    if (stufe < DANACH && blitz) setzeBlitz(false);
  }
  useEffect(() => {
    if (!blitz) return;
    const id = setTimeout(() => setzeBlitz(false), UMBAU_MS);
    return () => clearTimeout(id);
  }, [blitz]);

  /** Fertig heißt: Die Welle ist durch und das Ergebnis darf dastehen. */
  const fertig = umgebaut && !blitz;

  /* Pfeiltasten: im Gespräch führt man mit einer Hand. */
  useEffect(() => {
    if (gefuehrt) return;
    function taste(e: KeyboardEvent) {
      if (e.key === "ArrowRight") setzeStufe(Math.min(stufe + 1, DANACH));
      if (e.key === "ArrowLeft") setzeStufe(Math.max(stufe - 1, 0));
    }
    window.addEventListener("keydown", taste);
    return () => window.removeEventListener("keydown", taste);
  }, [gefuehrt, setzeStufe, stufe, DANACH]);

  const spalten = plaetze(raum.stationen.length, 0.07);
  const linie =
    boden(REIHE, 0.5, WERKSTATT).y - (118 + 87) * massstab(REIHE, WERKSTATT);

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#04080f]">
      <Innenraum
        kasten={WERKSTATT}
        akzent={umgebaut ? "#2ee6c5" : "#00b8ff"}
        lichter={3}
        fenster="rechts"
        rueckseite={
          <Wandtafel
            titel={raum.titel}
            zahlen={[
              { wert: `${fertig ? raum.handDanach : raum.handStationen}`, label: "von Hand" },
              {
                wert: fertig ? "deutlich weniger" : `${stunden} h`,
                // Die Zahl ist der im Blueprint erfasste Aufwand des
                // Betriebs — nicht der dieses einen Ablaufs. So steht sie
                // auch da; alles andere wäre eine Zahl, die niemand belegen
                // kann.
                label: "erfasst im Monat",
              },
              {
                wert: `${fertig ? raum.systemwechselDanach : raum.systemwechsel}`,
                label: "Systemwechsel",
              },
            ]}
            umgebaut={fertig}
            fazit={fertig ? drehbuch.fazit.satz : `${raum.stationen.length} Stationen, Schritt für Schritt aufgenommen.`}
            gedimmt={stufe === 0 || inTour}
          />
        }
      >
        <Strecke
          von={boden(REIHE, spalten[0] ?? 0.07, WERKSTATT).x}
          bis={boden(REIHE, spalten[spalten.length - 1] ?? 0.93, WERKSTATT).x}
          y={linie}
          umgebaut={umgebaut}
          zwischen={spalten.slice(0, -1).map((u, i) =>
            boden(REIHE, (u + spalten[i + 1]) / 2, WERKSTATT).x
          )}
          gedimmt={stufe === 0 || inTour}
          laden={blitz}
        />

        {raum.stationen.map((s, i) => (
          <Platz
            key={`${s.stationKey}-${i}`}
            station={s}
            u={spalten[i]}
            nummer={i + 1}
            umgebaut={umgebaut}
            /* Im Scheinwerfer steht immer nur ein Platz. */
            scheinwerfer={aktiv === null ? null : aktiv === i}
            gedimmt={stufe === 0}
            /*
              Jeder Platz verwandelt sich erst, wenn die Welle bei ihm ist.
              Ohne diesen Verzug springen acht Plätze gleichzeitig um, und
              aus einer Verwandlung wird ein Bildwechsel.
            */
            verzug={blitz ? spalten[i] * WELLE_S : 0}
            /* Die Beschriftung wechselt erst, wenn die Welle durch ist. */
            beschriftet={fertig}
          />
        ))}

        {/* Der Lichtkegel auf den Platz, um den es gerade geht */}
        {aktiv !== null && <Kegel u={spalten[aktiv]} />}

        {/* Die Sprechblase am Platz */}
        {aktiv !== null && drehbuch.tour[aktiv] && (
          <Sprechblase schritt={drehbuch.tour[aktiv]} u={spalten[aktiv]} gesamt={letzterTourSchritt} />
        )}

        {blitz && <Verwandlung />}
      </Innenraum>

      {/* ── Einführung ─────────────────────────────────────────────────── */}
      {stufe === 0 && (
        <Einfuehrung
          briefing={drehbuch.briefing}
          gefuehrt={gefuehrt}
          onStart={() => setzeStufe(1)}
        />
      )}

      {/* ── Kopfzeile ──────────────────────────────────────────────────── */}
      {stufe > 0 && (
        <div
          className="absolute inset-x-0 top-[5.5%] text-center px-6 pointer-events-none"
          style={{ animation: "studio-auf .7s cubic-bezier(.2,.85,.25,1) both" }}
        >
          <p className="font-mono text-[9px] uppercase tracking-[0.26em] text-[#4d93ba] font-semibold">
            {inTour
              ? `Station ${stufe} von ${letzterTourSchritt}`
              : umgebaut
                ? "Mit OKUN"
                : "Ihre Abläufe"}
          </p>
          <h2 className="mt-2 text-[clamp(19px,2.2vw,30px)] font-bold tracking-[-0.02em]">
            {inTour ? drehbuch.tour[stufe - 1]?.titel : raum.titel}
          </h2>
        </div>
      )}

      {/* ── Nach dem Umbau: was das trägt ──────────────────────────────── */}
      {umgebaut && !blitz && <Deckung fazit={drehbuch.fazit} />}

      {/* ── Steuerung ──────────────────────────────────────────────────── */}
      {!gefuehrt && (
        <>
          <button
            onClick={onZurueck}
            className="absolute left-6 top-6 z-20 flex items-center gap-2 px-4 py-2.5 rounded-full
              bg-[rgba(10,22,38,.8)] border border-[rgba(0,184,255,.2)] text-[#90a6c0] text-xs
              backdrop-blur hover:text-[#eef3f9] hover:border-[rgba(0,184,255,.5)] transition-colors"
          >
            ← Der Gang
          </button>

          {stufe > 0 && (
            <Steuerung
              stufe={stufe}
              letzterTourSchritt={letzterTourSchritt}
              uebersicht={UEBERSICHT}
              danach={DANACH}
              setzeStufe={setzeStufe}
            />
          )}
        </>
      )}
    </div>
  );
}

// ─── Die Einführung ──────────────────────────────────────────────────────────

/**
 * Was dieser Ablauf ist, bevor man ihn sieht.
 *
 * Wer in einen fremden Raum kommt, braucht zuerst einen Satz darüber, was
 * er hier gleich sieht. Erst danach ist ein Bild lesbar — vorher ist es
 * Dekoration.
 */
function Einfuehrung({
  briefing,
  gefuehrt,
  onStart,
}: {
  briefing: Drehbuch["briefing"];
  gefuehrt: boolean;
  onStart: () => void;
}) {
  return (
    <div className="absolute inset-0 grid place-items-center px-6 pointer-events-none">
      <div
        className="w-[min(92vw,720px)] rounded-3xl border border-[rgba(0,184,255,.25)]
          bg-[linear-gradient(165deg,rgba(9,24,40,.96),rgba(4,12,22,.97))] px-9 py-8
          shadow-[0_50px_120px_-40px_#000] backdrop-blur-sm pointer-events-auto"
        style={{ animation: "studio-pop .9s cubic-bezier(.2,1.02,.3,1) both" }}
      >
        <p className="font-mono text-[9px] uppercase tracking-[0.26em] text-[#4d93ba] font-semibold">
          Dieser Ablauf
        </p>
        <h2 className="mt-2.5 text-[clamp(21px,2.5vw,32px)] font-bold tracking-[-0.02em] leading-tight">
          {briefing.titel}
        </h2>

        {briefing.einleitung.map((satz, i) => (
          <p
            key={satz}
            className={`mt-3 text-[13.5px] leading-relaxed ${
              i === 0 ? "text-[#cfe0f2]" : "text-[#8fa6bf]"
            }`}
          >
            {satz}
          </p>
        ))}

        <div className="mt-7 grid grid-cols-4 gap-3">
          {briefing.punkte.map((p) => (
            <div
              key={p.label}
              className="rounded-2xl border border-[#1b2e47] bg-[rgba(255,255,255,.025)] px-3 py-3"
            >
              <b
                className={`block font-mono text-[26px] font-bold leading-none ${
                  p.ton === "warnung"
                    ? "text-[#f5a524]"
                    : p.ton === "gut"
                      ? "text-[#2ee6c5]"
                      : "text-[#9fdcff]"
                }`}
              >
                {p.wert}
              </b>
              <span className="mt-1.5 block text-[10.5px] text-[#6d829b] leading-snug">
                {p.label}
              </span>
            </div>
          ))}
        </div>

        {gefuehrt ? (
          <p className="mt-7 flex items-center gap-2.5 text-[12px] text-[#6d829b]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00b8ff] studio-atmen" />
            Ihr Berater geht gleich mit Ihnen durch.
          </p>
        ) : (
          <button
            onClick={onStart}
            className="mt-7 flex items-center gap-3 px-6 py-3 rounded-full text-[#041018] text-[13px]
              font-bold bg-[linear-gradient(135deg,#7adcff,#00b8ff)]
              shadow-[0_16px_42px_-14px_rgba(0,184,255,.95)] hover:-translate-y-0.5
              transition-transform duration-300"
          >
            Station für Station ansehen <span className="text-base">→</span>
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Die Sprechblase an der Station ──────────────────────────────────────────

const TON_FARBE: Record<string, string> = {
  warnung: "#f5a524",
  neutral: "#7fb6d8",
  gut: "#2ee6c5",
};

function Sprechblase({
  schritt,
  u,
  gesamt,
}: {
  schritt: TourSchritt;
  u: number;
  gesamt: number;
}) {
  const fuss = boden(REIHE, u, WERKSTATT);
  const s = massstab(REIHE, WERKSTATT);
  const breite = 430;
  /*
    Die Blase ist so hoch wie ihr Inhalt.

    `foreignObject` schneidet ab, was nicht hineinpasst, und lässt stehen,
    was zu viel ist — beides sieht schlampig aus. Deshalb wird die Höhe aus
    den Zeilen gerechnet, die wirklich darin stehen.
  */
  const zeilenWas = schritt.was ? umbrechen(schritt.was, 52).length : 0;
  const hoehe =
    108 +
    zeilenWas * 18 +
    (schritt.wer || schritt.womit ? 32 : 0) +
    schritt.befunde.reduce((h, b) => h + umbrechen(b.text, 46).length * 17 + 6, 0);
  // Am Rand kippt die Blase nach innen, statt aus dem Bild zu laufen.
  const x = Math.min(Math.max(fuss.x - breite / 2, 46), 1600 - breite - 46);
  const y = fuss.y - 118 * s - 118 * s - hoehe - 26;

  return (
    <g style={{ animation: "studio-pop .5s cubic-bezier(.2,1.05,.3,1) both" }}>
      {/* Der Faden zur Station */}
      <line
        x1={fuss.x}
        y1={y + hoehe + 4}
        x2={fuss.x}
        y2={fuss.y - 118 * s - 128 * s}
        stroke="#2d6c94"
        strokeWidth="1.5"
        strokeDasharray="4 4"
      />
      <circle cx={fuss.x} cy={fuss.y - 118 * s - 128 * s} r="4" fill="#5fc8ff" />

      <foreignObject x={x} y={y} width={breite} height={hoehe}>
        <div
          className="h-full rounded-2xl border border-[rgba(0,184,255,.3)] px-5 py-3.5
            bg-[linear-gradient(160deg,rgba(10,26,44,.97),rgba(5,14,26,.98))]
            shadow-[0_34px_80px_-28px_#000]"
        >
          <div className="flex items-center gap-2">
            <span className="font-mono text-[9px] tracking-[0.18em] text-[#4d93ba]">
              SCHRITT {schritt.nummer} / {gesamt}
            </span>
          </div>
          <b className="mt-1.5 block text-[16px] font-semibold leading-snug text-[#eef3f9]">
            {schritt.titel}
          </b>
          {schritt.was && (
            <p className="mt-1.5 text-[12px] text-[#8fa6bf] leading-relaxed">{schritt.was}</p>
          )}

          <div className="mt-3 flex flex-wrap gap-1.5">
            {schritt.wer && <Chip text={schritt.wer} />}
            {schritt.womit && <Chip text={schritt.womit} />}
          </div>

          <ul className="mt-3 space-y-1.5">
            {schritt.befunde.map((b) => (
              <li key={b.text} className="flex items-start gap-2 text-[12px] leading-snug">
                <span
                  className="mt-[5px] w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ background: TON_FARBE[b.ton] }}
                />
                <span style={{ color: TON_FARBE[b.ton] }}>{b.text}</span>
              </li>
            ))}
          </ul>
        </div>
      </foreignObject>
    </g>
  );
}

function Chip({ text }: { text: string }) {
  return (
    <span className="px-2 py-[3px] rounded-md bg-[rgba(255,255,255,.05)] border border-[#1f3550]
      font-mono text-[10px] text-[#8fa6bf]">
      {text}
    </span>
  );
}

/** Der Lichtkegel von der Decke auf den Platz im Scheinwerfer. */
function Kegel({ u }: { u: number }) {
  const fuss = boden(REIHE, u, WERKSTATT);
  const breite = 150 * massstab(REIHE, WERKSTATT);
  return (
    <g style={{ animation: "studio-auf .45s ease both" }}>
      <defs>
        <linearGradient id="werk-kegel" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#bfe9ff" stopOpacity=".22" />
          <stop offset="1" stopColor="#bfe9ff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points={flaeche(
          { x: fuss.x - breite * 0.3, y: WERKSTATT.oben - 40 },
          { x: fuss.x + breite * 0.3, y: WERKSTATT.oben - 40 },
          { x: fuss.x + breite * 1.15, y: fuss.y + 6 },
          { x: fuss.x - breite * 1.15, y: fuss.y + 6 }
        )}
        fill="url(#werk-kegel)"
      />
      <ellipse cx={fuss.x} cy={fuss.y + 6} rx={breite * 1.1} ry={breite * 0.17} fill="#bfe9ff" opacity=".14" />
    </g>
  );
}

/** Die Welle, die beim Umbau durch den Raum läuft. */
function Verwandlung() {
  const lauf = `studio-welle ${WELLE_S}s cubic-bezier(.35,0,.45,1) both`;
  return (
    <g pointerEvents="none">
      {/*
        Die Welle: ein heller Grat mit Schweif, der einmal durch den Raum
        läuft. Jeder Platz verwandelt sich genau dann, wenn sie bei ihm ist.

        Gestaffelte Flächen statt eines Verlaufs — ein Farbverlauf, dessen
        Paint-Server im falschen Moment nicht aufgelöst wird, färbt die
        halbe Bühne schwarz. Vier Rechtecke können das nicht.
      */}
      <g style={{ animation: lauf }}>
        <rect x="-320" y="0" width="320" height="900" fill="#2ee6c5" opacity=".1"
          filter="url(#ir-weich)" />
        <rect x="-130" y="0" width="130" height="900" fill="#7df0da" opacity=".22"
          filter="url(#ir-weich)" />
        <rect x="-42" y="0" width="42" height="900" fill="#d8fff6" opacity=".45" />
        <rect x="-7" y="0" width="7" height="900" fill="#ffffff" opacity=".9" />
      </g>

      {/* Ein kurzer Schlag Licht in den Raum, sobald die Welle durch ist. */}
      <rect
        width="1600"
        height="900"
        fill="#9ff5e2"
        style={{
          opacity: 0,
          animation: `studio-welle-schlag .9s ease-out ${WELLE_S - 0.35}s both`,
        }}
      />
    </g>
  );
}

/**
 * Woran der Umbau hängt.
 *
 * Der Raum darf nicht mehr versprechen, als gebucht ist. Deshalb steht
 * unter dem Ergebnis, welche ausgewählten Maßnahmen es tragen — und wenn
 * keine ausgewählt ist, steht genau das da.
 */
function Deckung({ fazit }: { fazit: Drehbuch["fazit"] }) {
  return (
    <div
      className="absolute left-7 top-[15%] w-[min(28vw,330px)] rounded-2xl border px-5 py-4
        bg-[linear-gradient(160deg,rgba(9,32,32,.95),rgba(4,14,22,.96))]
        border-[rgba(46,230,197,.3)] shadow-[0_34px_80px_-28px_#000]"
      style={{ animation: "studio-auf .8s cubic-bezier(.2,.85,.25,1) .3s both" }}
    >
      <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#4f9d8c]">
        {fazit.ohneDeckung ? "Noch nicht hinterlegt" : "Dahinter steht Ihre Auswahl"}
      </p>
      {fazit.ohneDeckung ? (
        <p className="mt-2 text-[12px] text-[#90a6c0] leading-relaxed">
          Für diesen Ablauf ist noch keine Maßnahme ausgewählt. Was Sie hier sehen, ist das, was
          möglich wäre — beschlossen ist es erst, wenn es in Ihrer Auswahl steht.
        </p>
      ) : (
        <>
          <p className="mt-1.5 text-[11px] text-[#5f8a84] leading-relaxed">
            Diese Maßnahmen sind für die Umsetzung beschlossen. Mehr als das, was darin steht,
            passiert hier nicht.
          </p>
          <ul className="mt-3 space-y-2">
          {fazit.massnahmen.map((m, i) => (
            <li key={m.titel} className="flex gap-2.5">
              <span className="w-5 h-5 rounded-full bg-[rgba(46,230,197,.15)] text-[#2ee6c5]
                grid place-items-center font-mono text-[10px] flex-shrink-0 mt-[1px]">
                {i + 1}
              </span>
              <span>
                <b className="block text-[12.5px] font-semibold text-[#dcf5ee] leading-snug">
                  {m.titel}
                </b>
                {m.womit && <span className="text-[11px] text-[#5f8a84]">{m.womit}</span>}
              </span>
            </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

// ─── Steuerung ───────────────────────────────────────────────────────────────

function Steuerung({
  stufe,
  letzterTourSchritt,
  uebersicht,
  danach,
  setzeStufe,
}: {
  stufe: number;
  letzterTourSchritt: number;
  uebersicht: number;
  danach: number;
  setzeStufe: (n: number) => void;
}) {
  const inTour = stufe >= 1 && stufe <= letzterTourSchritt;
  const umgebaut = stufe >= danach;

  return (
    <div className="absolute left-1/2 bottom-[3.5%] -translate-x-1/2 flex items-center gap-3">
      <button
        onClick={() => setzeStufe(stufe - 1)}
        className="px-4 py-2.5 rounded-full border border-[rgba(0,184,255,.25)] bg-[rgba(10,22,38,.8)]
          text-[#90a6c0] text-xs backdrop-blur hover:text-[#eef3f9] transition-colors"
      >
        ←
      </button>

      {inTour && (
        <>
          <div className="flex items-center gap-1.5 px-2">
            {Array.from({ length: letzterTourSchritt }, (_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i + 1 === stufe ? "w-6 bg-[#00b8ff]" : "w-1.5 bg-[#24405e]"
                }`}
              />
            ))}
          </div>
          <button
            onClick={() => setzeStufe(stufe + 1)}
            className="flex items-center gap-2 px-6 py-2.5 rounded-full text-[#041018] text-[13px]
              font-bold bg-[linear-gradient(135deg,#7adcff,#00b8ff)]
              shadow-[0_14px_36px_-14px_rgba(0,184,255,.95)] hover:-translate-y-0.5
              transition-transform duration-300"
          >
            {stufe === letzterTourSchritt ? "Fertig" : "Weiter"} <span className="text-base">→</span>
          </button>
          <button
            onClick={() => setzeStufe(uebersicht)}
            className="px-4 py-2.5 rounded-full text-[#55697f] text-[11px] hover:text-[#90a6c0]
              transition-colors"
          >
            überspringen
          </button>
        </>
      )}

      {stufe === uebersicht && (
        <button
          onClick={() => setzeStufe(danach)}
          className="flex items-center gap-3 px-7 py-3.5 rounded-full text-[#041018] text-[13.5px]
            font-bold bg-[linear-gradient(135deg,#8af2dd,#2ee6c5)]
            shadow-[0_16px_42px_-14px_rgba(46,230,197,.9)] hover:-translate-y-0.5
            transition-transform duration-300"
        >
          <span className="text-base">✦</span> Umbauen
        </button>
      )}

      {umgebaut && (
        <button
          onClick={() => setzeStufe(uebersicht)}
          className="px-6 py-2.5 rounded-full border border-[rgba(46,230,197,.35)]
            bg-[rgba(8,26,30,.8)] text-[#8fd8cb] text-xs backdrop-blur
            hover:text-[#eef3f9] transition-colors"
        >
          Zurück zu heute
        </button>
      )}
    </div>
  );
}

// ─── Ein Arbeitsplatz ────────────────────────────────────────────────────────

function Platz({
  station,
  u,
  nummer,
  umgebaut,
  scheinwerfer,
  gedimmt,
  verzug,
  beschriftet,
}: {
  station: AblaufStation;
  u: number;
  nummer: number;
  umgebaut: boolean;
  /** null = keine Tour, true = im Scheinwerfer, false = daneben. */
  scheinwerfer: boolean | null;
  gedimmt: boolean;
  /** Sekunden, bis die Welle hier ankommt. */
  verzug: number;
  /** Erst danach darf unter dem Platz „läuft ohne Sie" stehen. */
  beschriftet: boolean;
}) {
  const s = massstab(REIHE, WERKSTATT);
  const fuss = boden(REIHE, u, WERKSTATT);
  const tiefTisch = 86 * s;
  const breite = 150 * s;
  const hoehe = 118 * s;
  const platte = fuss.y - hoehe;

  const weg = umgebaut && station.entfaellt;
  const uebernommen = umgebaut && station.wirdAutomatisch;
  const vonHand = station.modus === "manual";
  const licht = uebernommen ? "#2ee6c5" : vonHand ? "#f5a524" : "#7fd0ff";
  const dunkel = gedimmt || scheinwerfer === false;

  return (
    <g
      style={{
        opacity: weg ? 0 : dunkel ? 0.26 : 1,
        transform: weg ? "translateY(26px) scale(.9)" : "none",
        transformOrigin: `${fuss.x}px ${fuss.y}px`,
        transition:
          `opacity .55s ease ${verzug}s, transform .9s cubic-bezier(.4,0,.2,1) ${verzug}s`,
      }}
    >
      <ellipse cx={fuss.x} cy={fuss.y + 3} rx={breite * 0.62} ry={11 * s} fill="#000" opacity=".5" />

      <polygon
        points={flaeche(
          { x: fuss.x - breite / 2, y: platte },
          { x: fuss.x + breite / 2, y: platte },
          { x: fuss.x + breite / 2 - 8 * s, y: platte - tiefTisch * 0.22 },
          { x: fuss.x - breite / 2 + 8 * s, y: platte - tiefTisch * 0.22 }
        )}
        fill="#20374f"
      />
      <rect x={fuss.x - breite / 2} y={platte} width={breite} height={hoehe} fill="#14263a" />
      <rect x={fuss.x - breite / 2} y={platte} width={breite} height={4 * s} fill="#2c4a68" />

      {/*
        Das Papier geht nicht aus, es geht weg.

        Beim Umbau hebt der Stapel ab und löst sich auf, und darunter kommt
        der Bildschirm zum Vorschein. Beides mit demselben Verzug wie der
        Rest des Platzes — die Welle nimmt es mit.
      */}
      {vonHand && (
        <g
          style={{
            opacity: uebernommen ? 0 : 1,
            transform: uebernommen ? `translateY(${-64 * s}px) scale(1.1)` : "none",
            transformOrigin: `${fuss.x}px ${platte}px`,
            transition: `opacity .5s ease ${verzug}s, transform 1s cubic-bezier(.3,0,.2,1) ${verzug}s`,
          }}
        >
          <Papierstapel x={fuss.x} y={platte} s={s} />
        </g>
      )}
      {/*
        Der Bildschirm steht immer da, auch unsichtbar.

        Ein Element, das erst im Moment des Umbaus in den Baum kommt, ist
        sofort voll da — es gibt nichts, von dem aus es überblenden könnte.
        Deshalb hängt hier nur die Deckkraft am Takt.
      */}
      <g
        style={{
          opacity: vonHand && !uebernommen ? 0 : 1,
          transition: `opacity .5s ease ${verzug + 0.3}s`,
        }}
      >
        <Bildschirm x={fuss.x} y={platte} s={s} an={!weg} licht={uebernommen ? "#2ee6c5" : "#7fd0ff"} />
      </g>

      <g style={{ opacity: uebernommen ? 1 : 0, transition: `opacity .7s ease ${verzug + 0.2}s` }}>
        <rect
          x={fuss.x - breite * 0.56}
          y={platte - 132 * s}
          width={breite * 1.12}
          height={132 * s + hoehe}
          rx={7 * s}
          fill="#0c2b2c"
          opacity=".5"
        />
        <rect
          x={fuss.x - breite * 0.56}
          y={platte - 132 * s}
          width={breite * 1.12}
          height={132 * s + hoehe}
          rx={7 * s}
          fill="none"
          stroke="#2ee6c5"
          strokeWidth={2}
          opacity=".8"
        />
        <Pikto name="automationen" x={fuss.x} y={platte - 152 * s} groesse={40 * s} farbe="#2ee6c5" />
      </g>

      <text
        x={fuss.x}
        y={platte + hoehe * 0.62}
        textAnchor="middle"
        className="font-mono"
        fontSize={17}
        fill="#3f5c7d"
      >
        {nummer}
      </text>

      {/* Das Schild am Platz */}
      <g>
        <rect x={fuss.x - 1.5 * s} y={platte - 58 * s} width={3 * s} height={58 * s} fill="#24405e" />
        <rect
          x={fuss.x - 32 * s}
          y={platte - 118 * s}
          width={64 * s}
          height={62 * s}
          rx={5 * s}
          fill="#0d1f31"
          stroke={licht}
          strokeOpacity={scheinwerfer ? 1 : uebernommen ? 0.8 : 0.45}
          strokeWidth={scheinwerfer ? 2.5 : 1.5}
        />
        {scheinwerfer && (
          <rect
            x={fuss.x - 32 * s}
            y={platte - 118 * s}
            width={64 * s}
            height={62 * s}
            rx={5 * s}
            fill="none"
            stroke={licht}
            strokeWidth={2}
            className="studio-atmen"
          />
        )}
        <Pikto
          name={station.stationKey}
          x={fuss.x}
          y={platte - 87 * s}
          groesse={38 * s}
          strich={1.7}
          farbe={licht}
          deckkraft={uebernommen ? 0.9 : 0.85}
        />
      </g>

      <text textAnchor="middle" className="font-sans" fontSize={15} fontWeight="600" fill="#dce9f6">
        {umbrechen(station.label, 15).map((zeile, i) => (
          <tspan key={zeile} x={fuss.x} y={fuss.y + 34 + i * 18}>
            {zeile}
          </tspan>
        ))}
      </text>
      <text
        x={fuss.x}
        y={fuss.y + 34 + umbrechen(station.label, 15).length * 18 + 2}
        textAnchor="middle"
        className="font-mono"
        fontSize={12}
        fill={uebernommen && beschriftet ? "#2ee6c5" : vonHand ? "#f5a524" : "#5d7a96"}
      >
        {uebernommen && beschriftet
          ? "läuft ohne Sie"
          : station.werkzeug ?? (vonHand ? "von Hand" : "")}
      </text>
    </g>
  );
}

/** Papier. Das einzige Bild, das jeder sofort als „das kostet Zeit" liest. */
function Papierstapel({ x, y, s }: { x: number; y: number; s: number }) {
  return (
    <g>
      {[0, 1, 2, 3].map((i) => (
        <rect
          key={i}
          x={x - 34 * s + i * 1.6 * s}
          y={y - (14 + i * 7) * s}
          width={68 * s}
          height={9 * s}
          rx={1}
          fill="#d8e3ee"
          opacity={0.72 - i * 0.07}
          transform={`rotate(${(i % 2 === 0 ? -1 : 1) * 1.6} ${x} ${y})`}
        />
      ))}
    </g>
  );
}

/** Ein Bildschirm — der Platz, an dem heute schon ein Programm hilft. */
function Bildschirm({
  x,
  y,
  s,
  an,
  licht,
}: {
  x: number;
  y: number;
  s: number;
  an: boolean;
  licht: string;
}) {
  const b = 92 * s;
  const h = 62 * s;
  return (
    <g>
      <rect x={x - 5 * s} y={y - 16 * s} width={10 * s} height={16 * s} fill="#1c3450" />
      <rect x={x - b / 2} y={y - 16 * s - h} width={b} height={h} rx={3 * s} fill="#0d1f31" />
      <rect
        x={x - b / 2 + 4 * s}
        y={y - 16 * s - h + 4 * s}
        width={b - 8 * s}
        height={h - 8 * s}
        fill={licht}
        opacity={an ? 0.42 : 0.12}
        style={{ transition: "opacity .6s ease" }}
      />
    </g>
  );
}

function Strecke({
  von,
  bis,
  y,
  umgebaut,
  zwischen,
  gedimmt,
  laden,
}: {
  von: number;
  bis: number;
  y: number;
  umgebaut: boolean;
  zwischen: number[];
  gedimmt: boolean;
  /** Während der Verwandlung lädt sich die Leitung von links nach rechts auf. */
  laden: boolean;
}) {
  return (
    <g style={{ opacity: gedimmt ? 0.3 : 1, transition: "opacity .55s ease" }}>
      <rect
        x={von}
        y={y}
        width={bis - von}
        height={4}
        rx={2}
        fill={umgebaut ? "#2ee6c5" : "#24405e"}
        opacity={umgebaut ? 0.9 : 1}
        style={{ transition: "fill .8s ease" }}
      />
      {zwischen.map((x) => (
        <path
          key={x}
          d={`M${x - 6} ${y - 5} L${x + 5} ${y + 2} L${x - 6} ${y + 9}`}
          fill="none"
          stroke={umgebaut ? "#7df0da" : "#3d6286"}
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ transition: "stroke .8s ease" }}
        />
      ))}
      {umgebaut && (
        <>
          <rect x={von} y={y - 4} width={bis - von} height={12} rx={6} fill="#2ee6c5" opacity=".2"
            filter="url(#ir-weich)" />
          {laden ? (
            /* Der Strom läuft einmal ein — danach fließt er einfach. */
            <rect
              x={von}
              y={y - 2}
              width={bis - von}
              height={8}
              rx={4}
              fill="#bdfff0"
              style={{
                transformOrigin: `${von}px ${y}px`,
                animation: `studio-laden ${WELLE_S}s cubic-bezier(.35,0,.45,1) both`,
              }}
            />
          ) : (
            <circle r="6" fill="#bdfff0">
              <animate attributeName="cx" values={`${von};${bis}`} dur="2.6s" repeatCount="indefinite" />
              <animate attributeName="cy" values={`${y + 2};${y + 2}`} dur="2.6s" repeatCount="indefinite" />
            </circle>
          )}
        </>
      )}
    </g>
  );
}

function Wandtafel({
  titel,
  zahlen,
  umgebaut,
  fazit,
  gedimmt,
}: {
  titel: string;
  zahlen: Array<{ wert: string; label: string }>;
  umgebaut: boolean;
  fazit: string;
  gedimmt: boolean;
}) {
  const a = rueckwand(0.12, 0.06, WERKSTATT);
  const b = rueckwand(0.88, 0.56, WERKSTATT);
  const breite = b.x - a.x;

  return (
    <g style={{ opacity: gedimmt ? 0.14 : 1, transition: "opacity .55s ease" }}>
      <rect x={a.x} y={a.y} width={breite} height={b.y - a.y} rx="6" fill="#0a1727" stroke="#20364f" />
      <rect x={a.x} y={a.y} width={breite} height="34" rx="6" fill="#102a40" />
      <text x={a.x + 18} y={a.y + 24} className="font-mono" fontSize="15" letterSpacing="2" fill="#6fa6cc">
        {titel.toUpperCase()}
      </text>
      {zahlen.map((z, i) => {
        const x = a.x + breite * (0.18 + i * 0.32);
        return (
          <g key={z.label}>
            <text
              x={x}
              y={a.y + 104}
              textAnchor="middle"
              className="font-mono"
              fontSize={z.wert.length > 6 ? 26 : 40}
              fontWeight="700"
              fill={umgebaut ? "#7df0da" : "#9fdcff"}
              style={{ transition: "fill .6s ease" }}
            >
              {z.wert}
            </text>
            <text x={x} y={a.y + 130} textAnchor="middle" className="font-mono" fontSize="14" fill="#587492">
              {z.label}
            </text>
          </g>
        );
      })}
      <line x1={a.x + 24} y1={b.y - 52} x2={b.x - 24} y2={b.y - 52} stroke="#1e3550" />
      <text textAnchor="middle" className="font-sans" fontSize="16" fill={umgebaut ? "#8fe8d8" : "#7e97b2"}>
        {umbrechen(fazit, 64).map((zeile, i) => (
          <tspan key={zeile} x={(a.x + b.x) / 2} y={b.y - 26 + i * 20}>
            {zeile}
          </tspan>
        ))}
      </text>
    </g>
  );
}
