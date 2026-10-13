"use client";

import { useEffect, useRef, useState } from "react";
import { OkunLogo } from "@/components/layout/okun-logo";
import { Gebaeude } from "./gebaeude";
import { Boden, Himmel, Mondglanz, Regen, Sterne, Stadt } from "./kulisse";
import type { AblaufRaum, HausDaten, Regalfach } from "@/lib/strategie/haus";

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
  const [geht, setzeGeht] = useState(false);
  const welt = useRef<HTMLDivElement>(null);

  /*
    Parallaxe nach der Maus.

    Der eine Effekt, der aus einer Zeichnung einen Ort macht. Er läuft nur,
    solange niemand eintritt — während der Kamerafahrt würde er sie stören.
  */
  useEffect(() => {
    if (geht) return;
    const el = welt.current;
    if (!el) return;
    const bewegen = (e: MouseEvent) => {
      const dx = e.clientX / window.innerWidth - 0.5;
      const dy = e.clientY / window.innerHeight - 0.5;
      el.querySelectorAll<HTMLElement>("[data-tiefe]").forEach((lage) => {
        const t = Number(lage.dataset.tiefe) || 1;
        lage.style.transform = `translate3d(${-dx * t * 5}px, ${-dy * t * 2.5}px, 0)`;
      });
    };
    window.addEventListener("mousemove", bewegen);
    return () => window.removeEventListener("mousemove", bewegen);
  }, [geht]);

  function eintreten() {
    if (geht) return;
    setzeGeht(true);
    // Die Kamerafahrt läuft 2,2 Sekunden; danach übernimmt der Schnitt.
    setTimeout(onEintreten, 1700);
  }

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ perspective: "1400px" }}>
      <div
        ref={welt}
        className={`absolute inset-0 studio-welt ${geht ? "studio-eintritt" : ""}`}
      >
        <div data-tiefe="1"><Himmel /></div>
        <div data-tiefe="1.5"><Sterne /></div>
        <div data-tiefe="2"><Mondglanz /></div>
        <div data-tiefe="3"><Stadt /></div>
        <div data-tiefe="4"><Boden /></div>
        <div
          data-tiefe="6"
          className="absolute left-1/2 bottom-[11%] w-[min(78vw,1220px)]"
          style={{ transform: "translateX(-50%)" }}
        >
          <Gebaeude
            schild={haus.schild}
            untertitel={untertitel}
            stockwerke={haus.stockwerke}
            fahrzeug={haus.fahrzeug}
            onTuer={eintreten}
          />
        </div>
        <div data-tiefe="8"><Regen /></div>
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
        <button
          onClick={eintreten}
          className="flex items-center gap-3 px-8 py-4 rounded-full text-[#041018] text-sm font-bold
            bg-[linear-gradient(135deg,#7adcff,#00b8ff)] shadow-[0_18px_48px_-14px_rgba(0,184,255,.95)]
            hover:-translate-y-0.5 hover:scale-[1.03] transition-transform duration-300"
        >
          Studio betreten <span className="text-base">→</span>
        </button>
        <p className="text-[#52687f] text-[11px]">oder auf die Tür klicken</p>
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
    <div className="fixed inset-0 z-50 grid place-items-center bg-[#02040a]" aria-hidden>
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(circle at 50% 62%,#cfefff,#2aa8e6 26%,transparent 62%)",
          animation: "studio-blitz 1.5s cubic-bezier(.2,.9,.3,1) both",
        }}
      />
      <div className="relative text-center z-10">
        <div
          className="w-[92px] h-[92px] mx-auto rounded-full border-[3px] border-[#00b8ff] relative
            shadow-[0_0_60px_rgba(0,184,255,.85)]"
          style={{ animation: "studio-ring-ein 1.1s cubic-bezier(.2,1.4,.3,1) .35s both" }}
        >
          <span className="absolute inset-5 rounded-full bg-[#00b8ff] shadow-[0_0_40px_#00b8ff]" />
        </div>
        <p
          className="mt-6 text-[clamp(22px,2.6vw,36px)] font-bold tracking-[0.3em] text-[#eef3f9]"
          style={{ animation: "studio-schrift-ein 1s cubic-bezier(.2,.9,.3,1) .7s both" }}
        >
          OKUN
        </p>
        <div
          className="mt-3 h-px bg-[linear-gradient(90deg,transparent,#00b8ff,transparent)]"
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

// ─── Szene 3 · Die Eingangshalle ─────────────────────────────────────────────

const RAUM_SYMBOL: Record<string, string> = {
  ablaeufe: "⚙",
  grundlagen: "▦",
  automationen: "✦",
  workforce: "◍",
};

export function Halle({
  haus,
  zeitfresser,
  onRaum,
}: {
  haus: HausDaten;
  zeitfresser: Array<{ label: string; stunden: string }>;
  onRaum: (key: string) => void;
}) {
  return (
    <div
      className="fixed inset-0 overflow-hidden"
      style={{
        background: "radial-gradient(100% 80% at 50% 0%,#0d2238 0%,#061222 48%,#02060e 100%)",
      }}
    >
      {/* Der Boden der Halle — ein Raster in die Tiefe */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(rgba(0,184,255,.1) 1px,transparent 1px)," +
            "linear-gradient(90deg,rgba(0,184,255,.1) 1px,transparent 1px)",
          backgroundSize: "80px 80px",
          transform: "perspective(600px) rotateX(62deg)",
          transformOrigin: "50% 0",
          maskImage: "linear-gradient(180deg,#000,transparent 72%)",
          WebkitMaskImage: "linear-gradient(180deg,#000,transparent 72%)",
        }}
      />

      <div
        className="absolute inset-x-0 top-[7%] text-center px-6"
        style={{ animation: "studio-auf .9s cubic-bezier(.2,.85,.25,1) both" }}
      >
        <p className="font-mono text-[9px] uppercase tracking-[0.26em] text-[#3a4f68] font-semibold">
          Eingangshalle
        </p>
        <h2 className="mt-2.5 text-[clamp(23px,2.8vw,38px)] font-bold tracking-[-0.02em]">
          {haus.hallensatz}
        </h2>
        {zeitfresser.length > 0 && (
          <p className="mt-3 mx-auto max-w-[56ch] text-[#90a6c0] text-[13px] leading-relaxed">
            Das meiste Ihrer Zeit geht heute für{" "}
            <b className="text-[#cfe0f2] font-semibold">{zeitfresser[0].label}</b> drauf
            — {zeitfresser[0].stunden} im Monat. Vier Türen stehen offen.
          </p>
        )}
      </div>

      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[44%] flex gap-6 px-6">
        {haus.raeume.map((r, i) => (
          <button
            key={r.key}
            onClick={() => !r.verschlossen && onRaum(r.key)}
            disabled={r.verschlossen}
            className="w-[196px] text-center group disabled:cursor-not-allowed"
            style={{ animation: `studio-pop .9s cubic-bezier(.2,1.05,.3,1) ${0.25 + i * 0.13}s both` }}
          >
            <div
              className={`relative h-[238px] rounded-t-[14px] rounded-b overflow-hidden
                bg-[linear-gradient(180deg,rgba(10,26,44,.9),rgba(5,14,26,.95))]
                border transition-all duration-500
                shadow-[0_36px_70px_-34px_#000,inset_0_1px_0_rgba(255,255,255,.07)] ${
                  r.verschlossen
                    ? "border-[#16263d] opacity-55"
                    : "border-[rgba(0,184,255,.22)] group-hover:-translate-y-2.5 group-hover:border-[rgba(0,184,255,.6)] group-hover:shadow-[0_52px_92px_-34px_#000,0_0_44px_-6px_rgba(0,184,255,.55)]"
                }`}
            >
              {/* Der Türspalt, aus dem Licht fällt */}
              <span
                className={`absolute left-1/2 top-0 bottom-0 w-0.5 -translate-x-1/2 transition-all duration-500
                  bg-[linear-gradient(180deg,transparent,rgba(0,184,255,.5),transparent)] ${
                    r.verschlossen ? "opacity-20" : "opacity-50 group-hover:w-6 group-hover:opacity-100 group-hover:blur-[9px]"
                  }`}
              />
              <span className="absolute left-1/2 top-[40%] -translate-x-1/2 -translate-y-1/2 text-[40px]
                opacity-90 transition-transform duration-500 group-hover:scale-110">
                {RAUM_SYMBOL[r.key] ?? "◇"}
              </span>
              <span
                className={`absolute top-3 right-3 px-2 py-[3px] rounded-full font-mono text-[8.6px] tracking-[0.1em] ${
                  r.verschlossen
                    ? "bg-[#16263d] text-[#52687f]"
                    : "bg-[rgba(0,184,255,.1)] text-[#4fd0ff] border border-[rgba(0,184,255,.26)]"
                }`}
              >
                {r.kennzahl}
              </span>
              <span className="absolute inset-x-0 bottom-4 font-mono text-[10px] tracking-[0.16em] text-[#4d93ba]">
                {r.marke}
              </span>
            </div>
            <b className="block mt-3.5 text-sm font-semibold">{r.titel}</b>
            <small className="block mt-0.5 text-[11px] text-[#52687f]">{r.unterzeile}</small>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Szene 4 · Der Ablaufraum ────────────────────────────────────────────────

const STATION_SYMBOL: Record<string, string> = {
  st_receive: "✉",
  st_route: "👁",
  st_transfer: "⌨",
  st_create: "📋",
  st_document: "📄",
  st_reply: "↩",
  st_inform: "📣",
  st_followup: "⏱",
  st_archive: "🗄",
};

export function AblaufSzene({
  raum,
  aufwandMinuten,
  onZurueck,
}: {
  raum: AblaufRaum;
  aufwandMinuten: number;
  onZurueck: () => void;
}) {
  const [umgebaut, setzeUmgebaut] = useState(false);
  const stunden = (aufwandMinuten / 60).toLocaleString("de-DE", { maximumFractionDigits: 1 });

  return (
    <div
      className="fixed inset-0 overflow-hidden"
      style={{ background: "radial-gradient(90% 80% at 50% 10%,#0a1f36,#040c18 60%,#02060e 100%)" }}
    >
      <ZurueckKnopf onClick={onZurueck} />

      <div
        className="absolute inset-x-0 top-[8%] text-center px-6"
        style={{ animation: "studio-auf .8s cubic-bezier(.2,.85,.25,1) both" }}
      >
        <p className="font-mono text-[9px] uppercase tracking-[0.26em] text-[#3a4f68] font-semibold">
          Ihre Abläufe
        </p>
        <h2 className="mt-2.5 text-[clamp(21px,2.5vw,34px)] font-bold tracking-[-0.02em]">
          {raum.titel}
        </h2>
        <p className="mt-2.5 mx-auto max-w-[60ch] text-[#90a6c0] text-[12.5px]">
          {raum.stationen.length} Stationen, {raum.handStationen} davon laufen heute von Hand.
          Drücken Sie den Knopf — dann sehen Sie, welche davon künftig ohne Sie laufen.
        </p>
      </div>

      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[46%] w-[min(92vw,1320px)] px-4">
        <div className="relative flex items-start">
          <div className="absolute left-[5%] right-[5%] top-[46px] h-0.5 bg-[rgba(0,184,255,.16)] overflow-hidden">
            <span
              className="absolute inset-0 origin-left bg-[linear-gradient(90deg,#00b8ff,#2ee6c5)] transition-transform duration-[1500ms] ease-out"
              style={{ transform: umgebaut ? "scaleX(1)" : "scaleX(0)" }}
            />
          </div>
          {umgebaut &&
            [0, 0.9, 1.8].map((d) => (
              <span
                key={d}
                aria-hidden
                className="absolute top-[44px] w-1.5 h-1.5 rounded-full bg-[#00b8ff] shadow-[0_0_14px_#00b8ff]"
                style={{ animation: `studio-funke 2.6s linear ${d}s infinite` }}
              />
            ))}

          {raum.stationen.map((s, i) => {
            /*
              Zwei verschiedene Dinge, und das muss man sehen.

              Ein Schritt, der entfällt, löst sich auf und die Reihe schließt
              sich. Ein Schritt, den OKUN übernimmt, bleibt stehen und wird
              türkis — die Arbeit passiert weiter, nur ohne Menschen davor.
              Alles verschwinden zu lassen sähe beeindruckender aus und wäre
              gelogen.
            */
            const weg = umgebaut && s.entfaellt;
            const uebernommen = umgebaut && s.wirdAutomatisch;
            const hand = s.modus === "manual";
            return (
              <div
                key={s.stationKey + i}
                className="flex flex-col items-center gap-2.5 relative z-10 overflow-hidden"
                style={{
                  flex: weg ? "0 0 0px" : "1 1 0px",
                  opacity: weg ? 0 : 1,
                  transform: weg ? "translateY(-22px) scale(.6)" : "none",
                  filter: weg ? "blur(6px)" : "none",
                  transition: "all .8s cubic-bezier(.3,.9,.3,1)",
                }}
              >
                <div
                  className={`w-[88px] h-[88px] flex-shrink-0 rounded-[21px] grid place-items-center text-[30px]
                    backdrop-blur-md transition-all duration-700 relative
                    shadow-[0_26px_52px_-26px_#000,inset_0_1px_0_rgba(255,255,255,.08)] ${
                      uebernommen
                        ? "border border-[rgba(46,230,197,.6)] bg-[linear-gradient(165deg,rgba(14,46,46,.92),rgba(7,24,28,.92))]"
                        : hand
                          ? "border border-[rgba(240,80,74,.5)] bg-[linear-gradient(165deg,rgba(52,22,26,.9),rgba(22,10,14,.92))]"
                          : "border border-[rgba(140,185,230,.2)] bg-[linear-gradient(165deg,rgba(22,40,62,.92),rgba(8,18,32,.92))]"
                    }`}
                >
                  {STATION_SYMBOL[s.stationKey] ?? "◆"}
                  {uebernommen && (
                    <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#2ee6c5]
                      text-[#041018] text-[11px] grid place-items-center font-bold">✦</span>
                  )}
                </div>
                <b className="text-[12px] font-semibold text-center leading-snug px-1">{s.label}</b>
                <small
                  className={`text-[10px] text-center transition-colors duration-700 ${
                    uebernommen ? "text-[#2ee6c5]" : "text-[#52687f]"
                  }`}
                >
                  {uebernommen
                    ? "läuft ohne Sie"
                    : (s.werkzeug ?? (s.rolle ? s.rolle : "ohne Programm"))}
                </small>
              </div>
            );
          })}
        </div>
      </div>

      <div className="absolute left-1/2 bottom-[10%] -translate-x-1/2 text-center">
        {umgebaut && (
          <span
            aria-hidden
            className="absolute left-1/2 top-1/2 rounded-full border-2 border-[rgba(0,184,255,.65)] -translate-x-1/2 -translate-y-1/2 pointer-events-none"
            style={{ animation: "studio-welle 1.5s cubic-bezier(.2,.8,.3,1) both" }}
          />
        )}
        <div className="flex gap-8 justify-center mb-5">
          <Bilanz wert={umgebaut ? raum.handDanach : raum.handStationen} label="Stationen von Hand" />
          <Bilanz
            wert={umgebaut ? "deutlich weniger" : `${stunden} h`}
            label="im Monat dafür"
            hell={umgebaut}
          />
          <Bilanz
            wert={umgebaut ? raum.systemwechselDanach : raum.systemwechsel}
            label="Systemwechsel"
          />
        </div>
        <button
          onClick={() => setzeUmgebaut((v) => !v)}
          className={`flex items-center gap-3 px-7 py-3.5 rounded-full text-[#041018] text-[13.5px] font-bold
            mx-auto transition-transform duration-300 hover:-translate-y-0.5 hover:scale-[1.03] ${
              umgebaut
                ? "bg-[linear-gradient(135deg,#8af2dd,#2ee6c5)] shadow-[0_16px_42px_-14px_rgba(46,230,197,.9)]"
                : "bg-[linear-gradient(135deg,#7adcff,#00b8ff)] shadow-[0_16px_42px_-14px_rgba(0,184,255,.95)]"
            }`}
        >
          <span className="text-base">✦</span>
          {umgebaut ? "Zurück zu heute" : "Umbauen"}
        </button>
        <p className="mt-3 text-[11px] text-[#44546b] max-w-[54ch] mx-auto leading-relaxed">
          {umgebaut
            ? `${raum.uebernommen} Schritte laufen künftig ohne Sie, ${raum.entfallen} ${
                raum.entfallen === 1 ? "entfällt" : "entfallen"
              } ganz. Entscheidungen bleiben bei Ihren Leuten.`
            : "Was sich gleich bewegt, steht so im Blueprint — nichts davon ist geschätzt."}
        </p>
      </div>
    </div>
  );
}

// ─── Szene 5 · Der Grundlagenraum ────────────────────────────────────────────

export function RegalSzene({
  regal,
  onZurueck,
}: {
  regal: Regalfach[];
  onZurueck: () => void;
}) {
  const [gefuellt, setzeGefuellt] = useState(false);
  const luecken = regal.filter((r) => r.luecke).length;

  return (
    <div
      className="fixed inset-0 overflow-hidden"
      style={{ background: "radial-gradient(90% 80% at 50% 8%,#0a1f36,#040c18 58%,#02060e 100%)" }}
    >
      <ZurueckKnopf onClick={onZurueck} />

      <div
        className="absolute inset-x-0 top-[8%] text-center px-6"
        style={{ animation: "studio-auf .8s cubic-bezier(.2,.85,.25,1) both" }}
      >
        <p className="font-mono text-[9px] uppercase tracking-[0.26em] text-[#3a4f68] font-semibold">
          Digitale Grundlagen
        </p>
        <h2 className="mt-2.5 text-[clamp(21px,2.5vw,34px)] font-bold tracking-[-0.02em]">
          Zwölf Fächer an der Wand
        </h2>
        <p className="mt-2.5 mx-auto max-w-[60ch] text-[#90a6c0] text-[12.5px]">
          Für jeden Zweck eines. {luecken === 0
            ? "Bei Ihnen ist jedes belegt."
            : `${luecken} ${luecken === 1 ? "Fach ist" : "Fächer sind"} bei Ihnen leer.`}{" "}
          Rot heißt: zwei Programme für dieselbe Sache.
        </p>
      </div>

      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[46%] w-[min(94vw,1200px)] px-4">
        <div className="grid grid-cols-6 gap-3">
          {regal.map((f, i) => {
            const gefuelltJetzt = gefuellt && f.luecke;
            return (
              <div
                key={f.zweckKey}
                className={`rounded-xl border p-3.5 min-h-[112px] flex flex-col transition-all duration-700
                  ${
                    f.luecke && !gefuellt
                      ? "border-dashed border-[rgba(245,165,36,.5)] bg-[rgba(245,165,36,.05)]"
                      : f.doppelt && !gefuellt
                        ? "border-[rgba(240,80,74,.45)] bg-[rgba(240,80,74,.06)]"
                        : "border-[rgba(0,184,255,.25)] bg-[rgba(0,184,255,.05)]"
                  }`}
                style={{ animation: `studio-pop .7s cubic-bezier(.2,1.05,.3,1) ${0.2 + i * 0.05}s both` }}
              >
                <p className="font-mono text-[8.6px] uppercase tracking-[0.14em] text-[#4d93ba]">
                  {f.label}
                </p>
                <p className="mt-auto text-[11.5px] leading-snug">
                  {gefuelltJetzt ? (
                    <span className="text-[#2ee6c5]">wird eingerichtet</span>
                  ) : f.luecke ? (
                    <span className="text-[#f5a524]">leer</span>
                  ) : (
                    <span className="text-[#cfe0f2]">{f.programme.join(" · ")}</span>
                  )}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="absolute left-1/2 bottom-[11%] -translate-x-1/2 text-center">
        <button
          onClick={() => setzeGefuellt((v) => !v)}
          disabled={luecken === 0}
          className={`flex items-center gap-3 px-7 py-3.5 rounded-full text-[#041018] text-[13.5px] font-bold
            mx-auto transition-transform duration-300 hover:-translate-y-0.5 disabled:opacity-40 ${
              gefuellt
                ? "bg-[linear-gradient(135deg,#8af2dd,#2ee6c5)]"
                : "bg-[linear-gradient(135deg,#7adcff,#00b8ff)]"
            }`}
        >
          <span className="text-base">✦</span>
          {gefuellt ? "Zurück zu heute" : "Lücken schließen"}
        </button>
      </div>
    </div>
  );
}

// ─── Gemeinsame Kleinteile ───────────────────────────────────────────────────

function ZurueckKnopf({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="absolute left-6 top-6 z-20 flex items-center gap-2 px-4 py-2.5 rounded-full
        bg-[rgba(10,22,38,.8)] border border-[rgba(0,184,255,.2)] text-[#90a6c0] text-xs
        backdrop-blur hover:text-[#eef3f9] hover:border-[rgba(0,184,255,.5)] transition-colors"
    >
      ← Eingangshalle
    </button>
  );
}

function Bilanz({
  wert,
  label,
  hell,
}: {
  wert: string | number;
  label: string;
  hell?: boolean;
}) {
  return (
    <div>
      <b
        className={`block font-mono text-[26px] font-bold tracking-[-0.03em] transition-colors duration-500 ${
          hell ? "text-[#2ee6c5]" : "text-[#eef3f9]"
        }`}
      >
        {wert}
      </b>
      <span className="text-[10.5px] text-[#52687f]">{label}</span>
    </div>
  );
}

/** Die Marke unten rechts — damit klar bleibt, in wessen Haus man steht. */
export function StudioMarke() {
  return (
    <div className="fixed left-6 bottom-6 z-20 w-[96px] opacity-45 pointer-events-none">
      <OkunLogo size="sm" />
    </div>
  );
}
