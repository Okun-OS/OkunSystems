"use client";

import { Check, Circle, Minus } from "lucide-react";
import type { KundenErgebnis } from "@/lib/radar/views";

/**
 * Die gemeinsamen Bausteine des Radar.
 *
 * Beide Seiten — Steuerpult und Interessentenansicht — zeichnen damit
 * dieselben Fragen, dieselben Balken, denselben Bericht. Nicht aus
 * Bequemlichkeit: Wenn der Closer etwas anderes sieht als der Interessent,
 * redet er im Gespräch über ein anderes Bild als sein Gegenüber.
 *
 * Alles hier ist reine Darstellung. Keine Bewertung, keine Schwellen, keine
 * Texte, die ein Ergebnis beschreiben — das kommt aus Katalog und Engine.
 */

export const STUFEN_FARBE: Record<string, { rand: string; flaeche: string; schrift: string }> = {
  A: { rand: "border-[#22c55e]/40", flaeche: "bg-[rgba(34,197,94,0.1)]", schrift: "text-[#22c55e]" },
  B: { rand: "border-[#f59e0b]/40", flaeche: "bg-[rgba(245,158,11,0.1)]", schrift: "text-[#f59e0b]" },
  C: { rand: "border-[#8899b4]/40", flaeche: "bg-[rgba(136,153,180,0.08)]", schrift: "text-[#c9d4e4]" },
};

const BAND_FARBE: Record<string, string> = {
  gering: "#8899b4",
  mittel: "#f59e0b",
  hoch: "#00b8ff",
};

// ─── Fortschritt ─────────────────────────────────────────────────────────────

export function Phasenleiste({
  phasen,
  prozent,
}: {
  phasen: Array<{ key: string; label: string; aktiv: boolean; erledigt: boolean }>;
  prozent: number;
}) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-1.5 flex-wrap">
        {phasen.map((p, i) => (
          <div key={p.key} className="flex items-center gap-1.5">
            <span
              className={`flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full border transition-colors ${
                p.aktiv
                  ? "border-[#00b8ff]/50 bg-[rgba(0,184,255,0.12)] text-[#00b8ff]"
                  : p.erledigt
                    ? "border-[#1a2840] text-[#22c55e]"
                    : "border-[#1a2840] text-[#5b6b7f]"
              }`}
            >
              {p.erledigt ? <Check size={10} /> : <Circle size={7} className={p.aktiv ? "fill-current" : ""} />}
              {p.label}
            </span>
            {i < phasen.length - 1 && <span className="text-[#1a2840] text-xs">·</span>}
          </div>
        ))}
      </div>
      <div className="h-1 rounded-full bg-[#101b2c] overflow-hidden">
        <div
          className="h-full bg-[#00b8ff] transition-[width] duration-500 ease-out"
          style={{ width: `${prozent}%` }}
        />
      </div>
    </div>
  );
}

// ─── Frage ───────────────────────────────────────────────────────────────────

export type FrageDarstellung = {
  key: string;
  frage: string;
  modus: "einfach" | "mehrfach";
  nummer: number;
  gesamt: number;
  optionen: Array<{ key: string; label: string; hinweis: string | null }>;
};

export function Fragekarte({
  frage,
  gewaehlt,
  onWaehlen,
  disabled,
  kompakt,
}: {
  frage: FrageDarstellung;
  gewaehlt: string[];
  onWaehlen: (optionKeys: string[]) => void;
  disabled?: boolean;
  kompakt?: boolean;
}) {
  function klick(key: string) {
    if (disabled) return;
    if (frage.modus === "einfach") {
      onWaehlen([key]);
      return;
    }
    onWaehlen(gewaehlt.includes(key) ? gewaehlt.filter((k) => k !== key) : [...gewaehlt, key]);
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[#5b6b7f] text-[11px] uppercase tracking-[0.18em] mb-1.5">
          Frage {frage.nummer} von {frage.gesamt}
          {frage.modus === "mehrfach" && " · Mehrfachauswahl"}
        </p>
        <h3
          className={`text-[#eef2f7] font-semibold leading-snug ${
            kompakt ? "text-base" : "text-[19px] sm:text-[22px]"
          }`}
        >
          {frage.frage}
        </h3>
      </div>

      <div className="grid gap-2">
        {frage.optionen.map((o) => {
          const aktiv = gewaehlt.includes(o.key);
          return (
            <button
              key={o.key}
              type="button"
              onClick={() => klick(o.key)}
              disabled={disabled}
              aria-pressed={aktiv}
              className={`group text-left rounded-xl border transition-all duration-150 disabled:cursor-not-allowed ${
                kompakt ? "px-3.5 py-2.5" : "px-4 py-3.5"
              } ${
                aktiv
                  ? "border-[#00b8ff]/60 bg-[rgba(0,184,255,0.1)]"
                  : "border-[#16283d] bg-[#0a111c] hover:border-[#2a3a55] hover:bg-[#0c1520]"
              } ${disabled ? "opacity-60" : ""}`}
            >
              <span className="flex items-start gap-3">
                <span
                  className={`flex-shrink-0 mt-0.5 w-[18px] h-[18px] flex items-center justify-center border transition-colors ${
                    frage.modus === "mehrfach" ? "rounded-[5px]" : "rounded-full"
                  } ${aktiv ? "border-[#00b8ff] bg-[#00b8ff]" : "border-[#2a3a55] group-hover:border-[#44546b]"}`}
                >
                  {aktiv && <Check size={11} className="text-[#041018]" strokeWidth={3} />}
                </span>
                <span className="min-w-0">
                  <span
                    className={`block leading-snug ${kompakt ? "text-[13px]" : "text-[15px]"} ${
                      aktiv ? "text-[#eef2f7] font-medium" : "text-[#c9d4e4]"
                    }`}
                  >
                    {o.label}
                  </span>
                  {o.hinweis && (
                    <span className="block text-[#5b6b7f] text-[11px] mt-1 leading-snug">{o.hinweis}</span>
                  )}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Ergebnisbericht ─────────────────────────────────────────────────────────

/**
 * Der Bericht auf dem Bildschirm.
 *
 * Die Darstellung hängt an der Aussagekraft: Reichen die Antworten, stehen
 * Balken mit Zahlen; reichen sie nicht, stehen Kategorien. Eine Prozentzahl
 * aus vier beantworteten Fragen wäre eine Genauigkeit, die es nicht gibt —
 * und sie würde im Gespräch Fragen auslösen, auf die es keine Antwort gibt.
 */
export function Ergebnisbericht({
  ergebnis,
  companyName,
  kompakt,
}: {
  ergebnis: KundenErgebnis;
  companyName: string;
  kompakt?: boolean;
}) {
  const farbe = STUFEN_FARBE[ergebnis.stufe] ?? STUFEN_FARBE.B;

  return (
    <div className="space-y-4">
      {/* Kopf */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[#5b6b7f] text-[11px] uppercase tracking-[0.18em]">
            OKUN Radar · Potenzialanalyse
          </p>
          <h2 className={`text-[#eef2f7] font-bold mt-0.5 ${kompakt ? "text-lg" : "text-2xl"}`}>
            {companyName}
          </h2>
        </div>
        <span className="text-[#5b6b7f] text-xs flex-shrink-0 pt-1">
          {new Date(ergebnis.erstelltAm).toLocaleDateString("de-DE", {
            day: "2-digit",
            month: "long",
            year: "numeric",
          })}
        </span>
      </div>

      {/* Urteil */}
      <div className={`rounded-xl border px-4 py-3.5 ${farbe.rand} ${farbe.flaeche}`}>
        <p className={`font-bold ${farbe.schrift} ${kompakt ? "text-sm" : "text-base"}`}>
          {ergebnis.stufeTitel}
        </p>
        <p className={`text-[#c9d4e4] mt-1.5 leading-relaxed ${kompakt ? "text-[13px]" : "text-sm"}`}>
          {ergebnis.einschaetzung}
        </p>
      </div>

      {/* Achsen */}
      <div className="space-y-2.5">
        {ergebnis.achsen.map((a) => (
          <div key={a.label}>
            <div className="flex items-baseline justify-between gap-3 mb-1">
              <span className="text-[#c9d4e4] text-[13px] font-medium">{a.label}</span>
              {a.wert === null ? (
                <span
                  className="text-[11px] font-semibold uppercase tracking-wider"
                  style={{ color: BAND_FARBE[a.band] ?? "#8899b4" }}
                >
                  {a.band}
                </span>
              ) : (
                <span className="text-[#eef2f7] text-[13px] font-bold tabular-nums">
                  {a.wert}
                  <span className="text-[#44546b] font-normal"> / 100</span>
                </span>
              )}
            </div>
            {a.wert === null ? (
              // Ohne belastbare Zahl keine Balkenlänge, die eine vorgaukelt —
              // stattdessen eine Pegelanzeige, bis zum erreichten Band
              // aufgefüllt. Nur das dritte Segment einzufärben liest sich wie
              // „wenig“, obwohl „hoch“ gemeint ist.
              <div className="flex gap-1">
                {["gering", "mittel", "hoch"].map((stufe, i) => (
                  <span
                    key={stufe}
                    className="h-1.5 flex-1 rounded-full"
                    style={{
                      background:
                        i <= ["gering", "mittel", "hoch"].indexOf(a.band)
                          ? (BAND_FARBE[a.band] ?? "#8899b4")
                          : "#101b2c",
                    }}
                  />
                ))}
              </div>
            ) : (
              <div className="h-1.5 rounded-full bg-[#101b2c] overflow-hidden">
                <div
                  className="h-full rounded-full transition-[width] duration-700 ease-out"
                  style={{ width: `${a.wert}%`, background: BAND_FARBE[a.band] ?? "#8899b4" }}
                />
              </div>
            )}
            <p className="text-[#44546b] text-[11px] mt-1 leading-snug">{a.frage}</p>
          </div>
        ))}
      </div>

      {/* Potenzialfelder */}
      {ergebnis.felder.length > 0 && (
        <div>
          <p className="text-[#5b6b7f] text-[11px] uppercase tracking-[0.18em] mb-2">
            Erkannte Potenzialfelder
          </p>
          <div className={`grid gap-2 ${kompakt ? "" : "sm:grid-cols-3"}`}>
            {ergebnis.felder.map((f) => (
              <div key={f.label} className="rounded-lg border border-[#16283d] bg-[#0a111c] px-3 py-2.5">
                <p className="text-[#eef2f7] text-[13px] font-semibold">{f.label}</p>
                <p className="text-[#5b6b7f] text-[11px] mt-0.5 leading-snug">{f.beschreibung}</p>
                <ul className="mt-2 space-y-1">
                  {f.belege.slice(0, 3).map((b, i) => (
                    <li key={i} className="flex gap-1.5 text-[#8899b4] text-[11px] leading-snug">
                      <Minus size={10} className="flex-shrink-0 mt-1 text-[#2a3a55]" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Nächster Schritt */}
      <div className="rounded-xl border border-[#16283d] bg-[#070d15] px-4 py-3">
        <p className="text-[#5b6b7f] text-[11px] uppercase tracking-[0.18em] mb-1">
          Nächster sinnvoller Schritt
        </p>
        <p className="text-[#c9d4e4] text-[13px] leading-relaxed">{ergebnis.naechsterSchritt}</p>
        {ergebnis.blueprintEmpfohlen && ergebnis.blueprintBegruendung && (
          <p className="text-[#8899b4] text-[12px] leading-relaxed mt-2 pt-2 border-t border-[#101b2c]">
            <span className="text-[#00b8ff] font-semibold">OKUN Blueprint: </span>
            {ergebnis.blueprintBegruendung}
          </p>
        )}
      </div>

      {/* Ehrlichkeit über die eigene Reichweite */}
      <p className="text-[#44546b] text-[11px] leading-relaxed">
        Diese Einschätzung entstand in rund 15 Minuten Gespräch und stützt sich auf{" "}
        {ergebnis.aussagekraft} % der Kernfragen
        {ergebnis.spotlight ? ` sowie auf den Ablauf „${ergebnis.spotlight.label}“` : ""}. Sie
        ersetzt keine vollständige Analyse und enthält bewusst keine Einsparzusagen.
      </p>
    </div>
  );
}
