"use client";

import { Innenraum } from "./innenraum";
import { Pikto } from "./piktogramme";
import { useTakt } from "./takt";
import type { AblaufRaum, AblaufStation } from "@/lib/strategie/haus";
import { boden, flaeche, massstab, plaetze, rueckwand, type Kasten } from "@/lib/studio/perspektive";
import { umbrechen } from "@/lib/studio/text";

/**
 * Der Raum, in dem die Arbeit steht.
 *
 * Vorher war das eine Reihe Kacheln auf schwarzem Grund — eine Liste, die
 * so tat, als wäre sie ein Ablauf. Jetzt steht in einer Werkstatt für jede
 * Station ein Platz: Tisch, Bildschirm oder Papierstapel, und eine Strecke,
 * die durch alle hindurchläuft.
 *
 * Der Unterschied ist nicht Dekoration. Was von Hand läuft, **sieht** man
 * am Papier; was ein Programm macht, am Bildschirm. Beim Umbau verschwinden
 * die Stapel, und über den übernommenen Plätzen schließt sich ein Gehäuse.
 * Niemand muss eine Legende lesen, um das zu verstehen.
 */

const WERKSTATT: Kasten = { links: 290, rechts: 1310, oben: 195, unten: 625 };
/** Die Tiefe, in der die Reihe steht. Weit genug weg, dass man sie ganz sieht. */
const REIHE = 0.66;

export function WerkstattSzene({
  raum,
  aufwandMinuten,
  onZurueck,
}: {
  raum: AblaufRaum;
  aufwandMinuten: number;
  onZurueck: () => void;
}) {
  const { stufe, setzeStufe, gefuehrt } = useTakt();
  const umgebaut = stufe > 0;
  const stunden = (aufwandMinuten / 60).toLocaleString("de-DE", { maximumFractionDigits: 1 });

  const sichtbar = raum.stationen.filter((s) => !(umgebaut && s.entfaellt));
  const spalten = plaetze(raum.stationen.length, 0.07);
  /*
    Die Strecke läuft auf Schildhöhe durch den Raum.

    Auf Tischhöhe verschwände sie hinter den Möbeln; oberhalb der Schilder
    schwebte sie im Nichts. Genau hinter den Schildern verbindet sie die
    Plätze sichtbar miteinander — das ist der Ablauf.
  */
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
              { wert: `${umgebaut ? raum.handDanach : raum.handStationen}`, label: "von Hand" },
              {
                wert: umgebaut ? "deutlich weniger" : `${stunden} h`,
                // Die Zahl ist der im Blueprint erfasste Aufwand des
                // Betriebs — nicht der dieses einen Ablaufs. So steht sie
                // auch da; alles andere wäre eine Zahl, die niemand belegen
                // kann.
                label: "erfasst im Monat",
              },
              {
                wert: `${umgebaut ? raum.systemwechselDanach : raum.systemwechsel}`,
                label: "Systemwechsel",
              },
            ]}
            umgebaut={umgebaut}
            fazit={
              umgebaut
                ? `${raum.uebernommen} Schritte laufen künftig ohne Sie, ${raum.entfallen} ${
                    raum.entfallen === 1 ? "entfällt" : "entfallen"
                  } ganz. Entscheidungen bleiben bei Ihren Leuten.`
                : `${raum.handStationen} von ${raum.stationen.length} Stationen laufen von Hand.`
            }
          />
        }
      >
        {/* Die Strecke, auf der alles läuft */}
        <Strecke
          von={boden(REIHE, spalten[0] ?? 0.07, WERKSTATT).x}
          bis={boden(REIHE, spalten[spalten.length - 1] ?? 0.93, WERKSTATT).x}
          y={linie}
          umgebaut={umgebaut}
          zwischen={spalten.slice(0, -1).map((u, i) =>
            boden(REIHE, (u + spalten[i + 1]) / 2, WERKSTATT).x
          )}
        />

        {raum.stationen.map((s, i) => (
          <Platz
            key={`${s.stationKey}-${i}`}
            station={s}
            u={spalten[i]}
            nummer={i + 1}
            umgebaut={umgebaut}
          />
        ))}
      </Innenraum>

      <div
        className="absolute inset-x-0 top-[6%] text-center px-6 pointer-events-none"
        style={{ animation: "studio-auf .8s cubic-bezier(.2,.85,.25,1) both" }}
      >
        <p className="font-mono text-[9px] uppercase tracking-[0.26em] text-[#4d93ba] font-semibold">
          Ihre Abläufe
        </p>
        <h2 className="mt-2.5 text-[clamp(21px,2.5vw,34px)] font-bold tracking-[-0.02em]">
          {raum.titel}
        </h2>
        <p className="mt-2.5 mx-auto max-w-[66ch] text-[#90a6c0] text-[12.5px] leading-relaxed">
          {raum.stationen.length} Stationen, so wie der Blueprint sie aufgenommen hat —{" "}
          {raum.handStationen} davon laufen heute von Hand, zu erkennen am Papier.
          {gefuehrt
            ? umgebaut
              ? " So sieht derselbe Ablauf aus, wenn wir fertig sind."
              : " Gleich sehen Sie, welche davon künftig ohne Sie laufen."
            : " Drücken Sie den Knopf."}
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
            ← Der Gang
          </button>

          <div className="absolute left-1/2 bottom-[3.5%] -translate-x-1/2 text-center">
            <button
              onClick={() => setzeStufe(umgebaut ? 0 : 1)}
              className={`flex items-center gap-3 px-7 py-3.5 rounded-full text-[#041018] text-[13.5px]
                font-bold mx-auto transition-transform duration-300 hover:-translate-y-0.5 ${
                  umgebaut
                    ? "bg-[linear-gradient(135deg,#8af2dd,#2ee6c5)] shadow-[0_16px_42px_-14px_rgba(46,230,197,.9)]"
                    : "bg-[linear-gradient(135deg,#7adcff,#00b8ff)] shadow-[0_16px_42px_-14px_rgba(0,184,255,.95)]"
                }`}
            >
              <span className="text-base">✦</span>
              {umgebaut ? "Zurück zu heute" : "Umbauen"}
            </button>
          </div>
        </>
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
}: {
  station: AblaufStation;
  u: number;
  nummer: number;
  umgebaut: boolean;
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

  return (
    <g
      style={{
        opacity: weg ? 0 : 1,
        transform: weg ? "translateY(26px) scale(.9)" : "none",
        transformOrigin: `${fuss.x}px ${fuss.y}px`,
        transition: "opacity .9s ease, transform .9s cubic-bezier(.4,0,.2,1)",
      }}
    >
      {/* Schatten auf dem Boden */}
      <ellipse cx={fuss.x} cy={fuss.y + 3} rx={breite * 0.62} ry={11 * s} fill="#000" opacity=".5" />

      {/* Der Tisch */}
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

      {/* Was auf dem Tisch steht */}
      {vonHand && !uebernommen ? (
        <Papierstapel x={fuss.x} y={platte} s={s} />
      ) : (
        <Bildschirm x={fuss.x} y={platte} s={s} an={!weg} licht={uebernommen ? "#2ee6c5" : "#7fd0ff"} />
      )}

      {/* Das Gehäuse, das sich beim Umbau über den Platz schließt */}
      <g
        style={{
          opacity: uebernommen ? 1 : 0,
          transition: "opacity .8s ease .2s",
        }}
      >
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

      {/* Die Nummer am Tischbein */}
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

      {/*
        Das Schild am Platz.

        Es steht auf dem Tisch und nicht in der Luft — ein Zeichen, das
        frei über einem Möbel schwebt, gehört zu nichts.
      */}
      <g>
        <rect
          x={fuss.x - 1.5 * s}
          y={platte - 58 * s}
          width={3 * s}
          height={58 * s}
          fill="#24405e"
        />
        <rect
          x={fuss.x - 32 * s}
          y={platte - 118 * s}
          width={64 * s}
          height={62 * s}
          rx={5 * s}
          fill="#0d1f31"
          stroke={licht}
          strokeOpacity={uebernommen ? 0.8 : 0.45}
          strokeWidth={1.5}
        />
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

      {/* Name und Werkzeug darunter */}
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
        fill={uebernommen ? "#2ee6c5" : vonHand ? "#f5a524" : "#5d7a96"}
      >
        {uebernommen ? "läuft ohne Sie" : station.werkzeug ?? (vonHand ? "von Hand" : "")}
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

/**
 * Die Strecke durch den Raum.
 *
 * Heute ein Band, auf dem Dinge von Platz zu Platz gereicht werden. Nach
 * dem Umbau eine Leitung, durch die ein Funke läuft — derselbe Weg, nur
 * dass ihn niemand mehr selbst gehen muss.
 */
function Strecke({
  von,
  bis,
  y,
  umgebaut,
  zwischen,
}: {
  von: number;
  bis: number;
  y: number;
  umgebaut: boolean;
  /** Wo die Richtungspfeile zwischen zwei Plätzen sitzen. */
  zwischen: number[];
}) {
  return (
    <g>
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
          <circle r="6" fill="#bdfff0">
            <animate
              attributeName="cx"
              values={`${von};${bis}`}
              dur="2.6s"
              repeatCount="indefinite"
            />
            <animate attributeName="cy" values={`${y + 2};${y + 2}`} dur="2.6s" repeatCount="indefinite" />
          </circle>
        </>
      )}
    </g>
  );
}

/**
 * Die Tafel an der Rückwand.
 *
 * Die drei Zahlen des Raums stehen an der Wand und nicht im Nichts. Dass
 * sie sich beim Umbau ändern, sieht man an derselben Stelle — das ist der
 * Beweis, auf den die ganze Szene hinausläuft.
 */
function Wandtafel({
  titel,
  zahlen,
  umgebaut,
  fazit,
}: {
  titel: string;
  zahlen: Array<{ wert: string; label: string }>;
  umgebaut: boolean;
  /** Der Satz unter den Zahlen — er ändert sich mit ihnen. */
  fazit: string;
}) {
  const a = rueckwand(0.12, 0.06, WERKSTATT);
  const b = rueckwand(0.88, 0.56, WERKSTATT);
  const breite = b.x - a.x;

  return (
    <g>
      <rect x={a.x} y={a.y} width={breite} height={b.y - a.y} rx="6" fill="#0a1727" stroke="#20364f" />
      <rect x={a.x} y={a.y} width={breite} height="34" rx="6" fill="#102a40" />
      <text
        x={a.x + 18}
        y={a.y + 24}
        className="font-mono"
        fontSize="15"
        letterSpacing="2"
        fill="#6fa6cc"
      >
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
            <text
              x={x}
              y={a.y + 130}
              textAnchor="middle"
              className="font-mono"
              fontSize="14"
              fill="#587492"
            >
              {z.label}
            </text>
          </g>
        );
      })}
      <line
        x1={a.x + 24}
        y1={b.y - 52}
        x2={b.x - 24}
        y2={b.y - 52}
        stroke="#1e3550"
      />
      <text
        textAnchor="middle"
        className="font-sans"
        fontSize="16"
        fill={umgebaut ? "#8fe8d8" : "#7e97b2"}
      >
        {umbrechen(fazit, 64).map((zeile, i) => (
          <tspan key={zeile} x={(a.x + b.x) / 2} y={b.y - 26 + i * 20}>
            {zeile}
          </tspan>
        ))}
      </text>
    </g>
  );
}
