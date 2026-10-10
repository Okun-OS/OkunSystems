"use client";

import {
  BarChart3,
  Check,
  CircleHelp,
  Clock,
  Database,
  FileText,
  LayoutGrid,
  Link2,
  Minus,
  MinusCircle,
  Target,
  Timer,
  UserRound,
  Users,
  Workflow,
  Zap,
} from "lucide-react";
import type { SymbolKey } from "@/lib/radar/catalog";
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

export type FrageDarstellung = {
  key: string;
  frage: string;
  thema?: string;
  modus: "einfach" | "mehrfach";
  nummer: number;
  gesamt: number;
  symbol?: SymbolKey | null;
  betonung?: string[];
  optionen: Array<{
    key: string;
    label: string;
    hinweis: string | null;
    rolle?: "sache" | "unbekannt" | "keinBefund";
  }>;
};

const SYMBOLE: Record<SymbolKey, React.ComponentType<{ size?: number; className?: string }>> = {
  papier: FileText,
  uhr: Timer,
  programme: LayoutGrid,
  verbindung: Link2,
  daten: Database,
  menschen: UserRound,
  blitz: Zap,
  zeit: Clock,
  zahlen: BarChart3,
  team: Users,
  ziel: Target,
  ablauf: Workflow,
};

/**
 * Die Frage mit Betonungen.
 *
 * Rein gestalterisch: Der hervorgehobene Teil gibt dem Blick einen Halt,
 * während der Berater vorliest. Er sagt nichts über die Antwort aus.
 */
function BetonteFrage({ text, betonung }: { text: string; betonung: string[] }) {
  if (betonung.length === 0) return <>{text}</>;

  // Nach den zu betonenden Stellen zerlegen, Reihenfolge im Text erhalten.
  const muster = betonung
    .filter(Boolean)
    .map((b) => b.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");
  const teile = text.split(new RegExp(`(${muster})`, "gi"));

  return (
    <>
      {teile.map((teil, i) =>
        betonung.some((b) => b.toLowerCase() === teil.toLowerCase()) ? (
          <span key={i} className="text-[#00b8ff]">
            {teil}
          </span>
        ) : (
          <span key={i}>{teil}</span>
        )
      )}
    </>
  );
}

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

  const Sachsymbol = frage.symbol ? SYMBOLE[frage.symbol] : FileText;

  return (
    <div className="space-y-5">
      <div>
        <div className="flex flex-wrap items-center gap-2.5 mb-3">
          <span className="text-[#44546b] text-[10.5px] uppercase tracking-[0.18em] font-semibold">
            Analyse {String(frage.nummer).padStart(2, "0")} / {frage.gesamt}
          </span>
          {frage.thema && (
            <span className="px-2.5 py-1 rounded-full border border-[#17304d] bg-[#0b1524] text-[#8899b4] text-[10.5px]">
              {frage.thema}
            </span>
          )}
          {frage.modus === "mehrfach" && (
            <span className="px-2.5 py-1 rounded-full border border-[#17304d] bg-[#0b1524] text-[#8899b4] text-[10.5px]">
              Mehrfachauswahl
            </span>
          )}
        </div>
        <h3
          className={`text-[#f4f8fd] font-bold tracking-tight leading-[1.25] ${
            kompakt ? "text-[20px]" : "text-[24px] sm:text-[30px]"
          }`}
        >
          <BetonteFrage text={frage.frage} betonung={frage.betonung ?? []} />
        </h3>
      </div>

      <div className="grid gap-2.5">
        {frage.optionen.map((o) => {
          const aktiv = gewaehlt.includes(o.key);
          const Symbol =
            o.rolle === "unbekannt" ? CircleHelp : o.rolle === "keinBefund" ? MinusCircle : Sachsymbol;
          return (
            <button
              key={o.key}
              type="button"
              onClick={() => klick(o.key)}
              disabled={disabled}
              aria-pressed={aktiv}
              className={`group text-left rounded-2xl border transition-all duration-200 disabled:cursor-not-allowed ${
                kompakt ? "px-3.5 py-3" : "px-4 sm:px-5 py-4"
              } ${
                aktiv
                  ? "border-[#00b8ff]/70 bg-[rgba(0,184,255,0.08)] shadow-[0_0_0_1px_rgba(0,184,255,0.18),0_8px_28px_-14px_rgba(0,184,255,0.6)]"
                  : "border-[#14263e] bg-[#0a1322] hover:border-[#24415f] hover:bg-[#0d1828] hover:translate-x-[1px]"
              } ${disabled ? "opacity-60" : ""}`}
            >
              <span className="flex items-center gap-3.5">
                {/* Auswahlmarkierung */}
                <span
                  className={`flex-shrink-0 w-[19px] h-[19px] flex items-center justify-center border-2 transition-all duration-200 ${
                    frage.modus === "mehrfach" ? "rounded-[6px]" : "rounded-full"
                  } ${
                    aktiv
                      ? "border-[#00b8ff] bg-[#00b8ff]"
                      : "border-[#2a4059] group-hover:border-[#3d5c7e]"
                  }`}
                >
                  {aktiv &&
                    (frage.modus === "mehrfach" ? (
                      <Check size={11} className="text-[#041018]" strokeWidth={3.5} />
                    ) : (
                      <span className="w-[7px] h-[7px] rounded-full bg-[#041018]" />
                    ))}
                </span>

                {/* Bildzeichen — für alle Sachantworten dasselbe */}
                <span
                  className={`flex-shrink-0 w-9 h-9 rounded-xl border flex items-center justify-center transition-colors duration-200 ${
                    aktiv
                      ? "border-[#00b8ff]/40 bg-[rgba(0,184,255,0.12)] text-[#00b8ff]"
                      : "border-[#17304d] bg-[#0c1829] text-[#4a5f7d] group-hover:text-[#6b84a6]"
                  }`}
                >
                  <Symbol size={16} />
                </span>

                <span className="min-w-0 flex-1">
                  <span
                    className={`block leading-snug font-medium ${
                      kompakt ? "text-[13.5px]" : "text-[15.5px]"
                    } ${aktiv ? "text-[#f4f8fd]" : "text-[#c9d4e4]"}`}
                  >
                    {o.label}
                  </span>
                  {o.hinweis && (
                    <span className="block text-[#5b6b7f] text-[11.5px] mt-1 leading-snug">
                      {o.hinweis}
                    </span>
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
