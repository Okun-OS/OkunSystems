"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { OkunLogo } from "@/components/layout/okun-logo";
import { Gebaeude } from "./gebaeude";
import { Boden, Himmel, Mondglanz, Regen, Sterne, Stadt } from "./kulisse";
import type { AblaufRaum, Fundament, HausDaten } from "@/lib/strategie/haus";
import { useTakt } from "./takt";

/**
 * Die Szenen des Rundgangs.
 *
 * Jede ist eine eigene Komponente mit demselben Takt: Man sieht erst, wie es
 * heute ist, und drückt dann einen Knopf, der zeigt, was sich ändert. Nichts
 * davon ist erfunden — was sich bewegt, steht im Blueprint, und was
 * verschwindet, steht in der festen Zuordnung aus dem Katalog.
 */

// ─── Szene 1 · Draußen ───────────────────────────────────────────────────────

export function Aussen({
  haus,
  untertitel,
  vorsatz,
  onEintreten,
}: {
  haus: HausDaten;
  untertitel: string | null;
  vorsatz: string;
  onEintreten: () => void;
}) {
  const { gefuehrt } = useTakt();
  const [geht, setzeGeht] = useState(false);
  const welt = useRef<HTMLDivElement>(null);

  /*
    Parallaxe nach der Maus.

    Der eine Effekt, der aus einer Zeichnung einen Ort macht. Er läuft nur,
    solange niemand eintritt — während der Kamerafahrt würde er sie stören.
  */
  /*
    Die Parallaxe schreibt Variablen, nicht `transform`.

    Vorher setzte sie `style.transform` direkt — und überschrieb damit das
    `translateX(-50%)`, mit dem das Haus in der Mitte stand. Beim ersten
    Mausruck sprang es um seine halbe Breite nach rechts. Das sah nicht nach
    Parallaxe aus, sondern nach einem Fehler, und es war auch einer.

    Über `--px`/`--py` kann jede Ebene ihre eigene Grundstellung behalten.
  */
  useEffect(() => {
    if (geht) return;
    const el = welt.current;
    if (!el) return;
    let laeuft = 0;
    const bewegen = (e: MouseEvent) => {
      if (laeuft) return;
      laeuft = requestAnimationFrame(() => {
        laeuft = 0;
        const dx = e.clientX / window.innerWidth - 0.5;
        const dy = e.clientY / window.innerHeight - 0.5;
        el.querySelectorAll<HTMLElement>("[data-tiefe]").forEach((lage) => {
          const t = Number(lage.dataset.tiefe) || 1;
          lage.style.setProperty("--px", `${(-dx * t * 3.2).toFixed(1)}px`);
          lage.style.setProperty("--py", `${(-dy * t * 1.6).toFixed(1)}px`);
        });
      });
    };
    window.addEventListener("mousemove", bewegen);
    return () => {
      window.removeEventListener("mousemove", bewegen);
      if (laeuft) cancelAnimationFrame(laeuft);
    };
  }, [geht]);

  function eintreten() {
    // Wer mitsieht, öffnet die Tür nicht — sonst führe gleich die Kamerafahrt
    // ins Leere und der Kunde stünde vor einer Wand.
    if (gefuehrt || geht) return;
    setzeGeht(true);
    // Die Kamerafahrt läuft 2,2 Sekunden; danach übernimmt der Schnitt.
    setTimeout(onEintreten, 1700);
  }

  return (
    <div className="absolute inset-0 overflow-hidden" style={{ perspective: "1400px" }}>
      <div
        ref={welt}
        className={`absolute inset-0 studio-welt ${geht ? "studio-eintritt" : ""}`}
      >
        <div data-tiefe="1" className="studio-lage"><Himmel /></div>
        <div data-tiefe="1.5" className="studio-lage"><Sterne /></div>
        <div data-tiefe="2" className="studio-lage"><Mondglanz /></div>
        <div data-tiefe="3" className="studio-lage"><Stadt /></div>
        <div data-tiefe="4" className="studio-lage"><Boden /></div>
        {/*
          Das Haus steht in der Mitte, und zwar ohne `transform`.

          Zentrieren über `translateX(-50%)` und Parallaxe über `transform`
          sind dieselbe Eigenschaft — eins überschreibt das andere. Mit einer
          Flex-Zeile kommen sie sich nicht mehr in die Quere.
        */}
        <div
          data-tiefe="6"
          className="studio-lage absolute inset-x-0 bottom-[11%] flex justify-center"
        >
          <div className="w-[min(78vw,1220px)]">
            <Gebaeude
              schild={haus.schild}
              untertitel={untertitel}
              stockwerke={haus.stockwerke}
              fahrzeug={haus.fahrzeug}
              onTuer={eintreten}
            />
          </div>
        </div>
        <div data-tiefe="8" className="studio-lage"><Regen /></div>
      </div>

      <div
        className={`absolute inset-x-0 top-[6.5%] text-center z-10 transition-all duration-500 ${
          geht ? "opacity-0 -translate-y-6" : ""
        }`}
        style={{ animation: "studio-schrift-ein 1.4s cubic-bezier(.16,1,.3,1) .4s both" }}
      >
        <p className="font-mono text-[9px] uppercase tracking-[0.26em] text-[#3a4f68] font-semibold">
          OKUN Transformation Studio
        </p>
        <p className="mt-3 text-[#90a6c0] text-[13.5px]">{vorsatz}</p>
      </div>

      <div
        className={`absolute left-1/2 bottom-[9%] -translate-x-1/2 z-10 flex flex-col items-center gap-3 transition-all duration-500 ${
          geht ? "opacity-0 translate-y-4" : ""
        }`}
        style={{ animation: "studio-schrift-ein 1.3s cubic-bezier(.16,1,.3,1) 1.2s both" }}
      >
        {gefuehrt ? (
          /*
            Der Wartezustand.

            Der Kunde steht vor seinem eigenen Haus, bis der Berater die Tür
            öffnet. Das ist kein Ladebalken, sondern der Anfang der
            Geschichte — und er hält, solange er halten muss.
          */
          <p className="flex items-center gap-2.5 px-5 py-3 rounded-full border border-[rgba(0,184,255,.22)]
            bg-[rgba(10,22,38,.7)] backdrop-blur text-[#90a6c0] text-[12.5px]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00b8ff] studio-atmen" />
            Gleich geht es los
          </p>
        ) : (
          <>
            <button
              onClick={eintreten}
              className="flex items-center gap-3 px-8 py-4 rounded-full text-[#041018] text-sm font-bold
                bg-[linear-gradient(135deg,#7adcff,#00b8ff)] shadow-[0_18px_48px_-14px_rgba(0,184,255,.95)]
                hover:-translate-y-0.5 hover:scale-[1.03] transition-transform duration-300"
            >
              Studio betreten <span className="text-base">→</span>
            </button>
            <p className="text-[#52687f] text-[11px]">oder auf die Tür klicken</p>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Szene 2 · Der Schnitt ───────────────────────────────────────────────────

/**
 * Die Marke zwischen zwei Welten.
 *
 * Dasselbe Mittel wie im Radar: Ein Wechsel ohne Schnitt fühlt sich an wie
 * eine Webseite, die ihren Inhalt tauscht. Mit Schnitt fühlt er sich an wie
 * ein Ortswechsel — und genau das ist er hier auch.
 */
export function Schnitt({
  firma,
  fussnote,
  onFertig,
}: {
  firma: string;
  fussnote: string;
  onFertig: () => void;
}) {
  useEffect(() => {
    const id = setTimeout(onFertig, 2600);
    return () => clearTimeout(id);
  }, [onFertig]);

  return (
    <div className="absolute inset-0 z-50 grid place-items-center bg-[#02040a]" aria-hidden>
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(circle at 50% 62%,#cfefff,#2aa8e6 26%,transparent 62%)",
          animation: "studio-blitz 1.5s cubic-bezier(.2,.9,.3,1) both",
        }}
      />
      <div className="relative text-center z-10 px-6">
        {/*
          Die echte Marke, nicht eine nachgebaute.

          Hier stand ein gezeichneter Ring mit dem Wort „OKUN" darunter —
          das ist nicht unser Logo. In einer Sequenz, die genau dafür da
          ist, die Marke zu setzen, gehört die Marke hin.
        */}
        <div
          className="w-[min(62vw,420px)] mx-auto overflow-hidden"
          /*
            Das Seitenverhältnis schneidet die Zeile unter dem Trennstrich
            ab — und zwar in Anteilen, nicht in Pixeln. Die feste Höhe im
            Logo der Seitenleiste ist auf 200 Pixel Breite gerechnet; hier
            ist das Zeichen doppelt so groß, und „SYSTEMS" wäre weggefallen.
          */
          style={{
            aspectRatio: "1039 / 271",
            animation: "studio-ring-ein 1.1s cubic-bezier(.2,1.4,.3,1) .35s both",
          }}
        >
          <Image
            src="/okun-logo.png"
            alt="OKUN Systems"
            width={1039}
            height={356}
            priority
            style={{ width: "100%", height: "auto", display: "block" }}
          />
        </div>
        <div
          className="mt-5 h-px bg-[linear-gradient(90deg,transparent,#00b8ff,transparent)]"
          style={{ animation: "studio-linie-ein .9s cubic-bezier(.2,.9,.3,1) .95s both" }}
        />
        <p
          className="mt-3.5 font-mono text-xs tracking-[0.42em] text-[#7fd4ff]"
          style={{ animation: "studio-schrift-ein 1s cubic-bezier(.2,.9,.3,1) 1.1s both" }}
        >
          TRANSFORMATION STUDIO
        </p>
        <p
          className="mt-7 text-sm text-[#90a6c0]"
          style={{ animation: "studio-schrift-ein 1s ease 1.4s both" }}
        >
          {firma} · {fussnote}
        </p>
      </div>
    </div>
  );
}

/*
  Die Eingangshalle und der alte Ablaufraum standen hier.

  Beide waren Kacheln auf dunklem Grund. Ersetzt haben sie der Flur und die
  Werkstatt — dieselben Daten, aber in einem Raum, den man betreten kann.
  Siehe `innenszenen.tsx` und `werkstatt.tsx`.
*/

// ─── Szene 5 · Das Fundament ─────────────────────────────────────────────────

/**
 * Die digitalen Grundlagen — der erste Raum im Haus.
 *
 * Hier hingen einmal zwölf gleich große Fächer an der Wand, leer oder voll.
 * Das war unsere Schublade, nicht seine: Ein Betrieb denkt nicht „ich habe
 * zwölf Zwecke, vier sind leer", sondern „ich schreibe Rechnungen in Word".
 * Alles wog gleich, ein leeres „Sonstiges" so schwer wie eine fehlende
 * Rechnungsstellung, und am Ende sprangen alle Lücken gleichzeitig auf
 * „wird eingerichtet" — ein Pauschalversprechen über zwölf Systeme.
 *
 * Jetzt sind es zwei Bilder, und man geht von einem zum anderen:
 *
 * **Heute** — die Werkzeuge, mit denen er wirklich arbeitet, mit seinen
 * eigenen Bezeichnungen. Kein Urteil, keine Farbe, die etwas vorwirft.
 *
 * **Danach** — was sich ändert, und zwar nur das, was ein Mensch bestätigt
 * hat. Vier Arten von Veränderung, jede ein Satz, den der Berater
 * aussprechen kann.
 */

const BEWEGUNG: Record<
  string,
  { label: string; farbe: string; rahmen: string; grund: string }
> = {
  bleibt: {
    label: "bleibt",
    farbe: "#8899b4",
    rahmen: "rgba(136,153,180,.3)",
    grund: "rgba(136,153,180,.06)",
  },
  faellt_weg: {
    label: "fällt weg",
    farbe: "#2ee6c5",
    rahmen: "rgba(46,230,197,.4)",
    grund: "rgba(46,230,197,.07)",
  },
  geht_zusammen: {
    label: "geht zusammen",
    farbe: "#00b8ff",
    rahmen: "rgba(0,184,255,.4)",
    grund: "rgba(0,184,255,.07)",
  },
  fehlt: {
    label: "kommt dazu",
    farbe: "#f5a524",
    rahmen: "rgba(245,165,36,.4)",
    grund: "rgba(245,165,36,.07)",
  },
};

export function FundamentSzene({
  fundament,
  onZurueck,
}: {
  fundament: Fundament;
  onZurueck: () => void;
}) {
  const { stufe, setzeStufe, gefuehrt } = useTakt();
  const danach = stufe > 0;
  const aenderungen = fundament.bewegungen.length;

  return (
    <div
      className="absolute inset-0 overflow-hidden"
      style={{ background: "radial-gradient(90% 80% at 50% 8%,#0a1f36,#040c18 58%,#02060e 100%)" }}
    >
      <ZurueckKnopf onClick={onZurueck} />

      <div
        className="absolute inset-x-0 top-[7%] text-center px-6"
        style={{ animation: "studio-auf .8s cubic-bezier(.2,.85,.25,1) both" }}
      >
        <p className="font-mono text-[9px] uppercase tracking-[0.26em] text-[#3a4f68] font-semibold">
          Digitale Grundlagen
        </p>
        <h2 className="mt-2.5 text-[clamp(21px,2.5vw,34px)] font-bold tracking-[-0.02em]">
          {danach ? "Was sich ändert" : "Womit Sie heute arbeiten"}
        </h2>
        <p className="mt-2.5 mx-auto max-w-[62ch] text-[#90a6c0] text-[12.5px] leading-relaxed">
          {danach
            ? "Bevor wir etwas automatisieren, steht das Fundament. Das hier ist der erste Schritt — nicht der letzte."
            : fundament.heute.length === 0
              ? "Im Blueprint ist kein Programm erfasst."
              : `${fundament.heute.length} Werkzeuge, so wie Sie sie genannt haben. Erst danach reden wir über Abläufe.`}
        </p>
      </div>

      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[47%] w-[min(94vw,1120px)] px-4">
        {!danach ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {fundament.heute.map((w, i) => (
              <div
                key={`${w.name}-${i}`}
                className="rounded-xl border border-[rgba(0,184,255,.22)] bg-[rgba(0,184,255,.04)] p-4 min-h-[96px] flex flex-col"
                style={{
                  animation: `studio-pop .7s cubic-bezier(.2,1.05,.3,1) ${0.15 + i * 0.05}s both`,
                }}
              >
                <p className="text-[13px] font-semibold text-[#dce9f6] leading-snug">{w.name}</p>
                <p className="mt-auto pt-2 text-[10.5px] text-[#5b7691] leading-snug">
                  {w.zwecke.join(" · ") || "ohne Zuordnung"}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2.5 max-h-[52vh] overflow-y-auto pr-1">
            {fundament.bewegungen.map((b, i) => {
              const art = BEWEGUNG[b.bewegung] ?? BEWEGUNG.bleibt;
              return (
                <div
                  key={`${b.titel}-${i}`}
                  className="rounded-xl border px-5 py-4"
                  style={{
                    borderColor: art.rahmen,
                    background: art.grund,
                    animation: `studio-pop .7s cubic-bezier(.2,1.05,.3,1) ${0.1 + i * 0.07}s both`,
                  }}
                >
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span
                      className="font-mono text-[9px] uppercase tracking-[0.16em] px-2 py-0.5 rounded-full border"
                      style={{ color: art.farbe, borderColor: art.rahmen }}
                    >
                      {art.label}
                    </span>
                    {b.sparenProMonat !== null && (
                      <span className="font-mono text-[11.5px]" style={{ color: art.farbe }}>
                        {b.sparenProMonat} € im Monat
                        {b.erstZumVertragsende && (
                          <span className="text-[#f5a524]"> · ab Vertragsende</span>
                        )}
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-[14px] font-semibold text-[#eef3f9] leading-snug">
                    {b.titel}
                  </p>
                  {b.begruendung && (
                    <p className="mt-1 text-[12px] text-[#90a6c0] leading-relaxed">
                      {b.begruendung}
                    </p>
                  )}
                </div>
              );
            })}

            {/*
              Nichts bestätigt heißt nicht „nichts zu tun".

              Der Kunde soll hier nicht vor einer leeren Fläche stehen und
              denken, an seinen Grundlagen sei alles in Ordnung — es ist nur
              noch nicht besprochen.
            */}
            {aenderungen === 0 && (
              <p className="text-center text-[#5b7691] text-[12.5px] py-10 leading-relaxed">
                An den Grundlagen ist noch nichts entschieden.
                <br />
                Das gehen wir im Gespräch gemeinsam durch.
              </p>
            )}

            {(fundament.sparenSofort > 0 || fundament.sparenSpaeter > 0) && (
              <p className="pt-2 text-center text-[12.5px] text-[#90a6c0]">
                Zusammen mindestens{" "}
                <span className="text-[#2ee6c5] font-semibold">
                  {fundament.sparenSofort} €
                </span>{" "}
                im Monat
                {fundament.sparenSpaeter > 0 && (
                  <>
                    , dazu{" "}
                    <span className="text-[#f5a524]">{fundament.sparenSpaeter} €</span> ab
                    Vertragsende
                  </>
                )}
                .
              </p>
            )}
          </div>
        )}
      </div>

      <div className="absolute left-1/2 bottom-[9%] -translate-x-1/2 text-center">
        <button
          onClick={() => setzeStufe(danach ? 0 : 1)}
          hidden={gefuehrt}
          className={`flex items-center gap-3 px-7 py-3.5 rounded-full text-[#041018] text-[13.5px] font-bold
            mx-auto transition-transform duration-300 hover:-translate-y-0.5 ${
              danach
                ? "bg-[linear-gradient(135deg,#8af2dd,#2ee6c5)]"
                : "bg-[linear-gradient(135deg,#7adcff,#00b8ff)]"
            }`}
        >
          <span className="text-base">✦</span>
          {danach ? "Zurück zu heute" : "Was sich ändert"}
        </button>
      </div>

      <StudioMarke />
    </div>
  );
}

function ZurueckKnopf({ onClick }: { onClick: () => void }) {
  const { gefuehrt } = useTakt();
  if (gefuehrt) return null;
  return (
    <button
      onClick={onClick}
      className="absolute left-6 top-6 z-20 flex items-center gap-2 px-4 py-2.5 rounded-full
        bg-[rgba(10,22,38,.8)] border border-[rgba(0,184,255,.2)] text-[#90a6c0] text-xs
        backdrop-blur hover:text-[#eef3f9] hover:border-[rgba(0,184,255,.5)] transition-colors"
    >
      ← Der Gang
    </button>
  );
}

/** Die Marke unten rechts — damit klar bleibt, in wessen Haus man steht. */
export function StudioMarke() {
  return (
    <div className="absolute left-6 bottom-6 z-20 w-[96px] opacity-45 pointer-events-none">
      <OkunLogo size="sm" />
    </div>
  );
}
