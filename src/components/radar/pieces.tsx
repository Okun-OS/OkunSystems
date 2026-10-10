"use client";

import {
  BarChart3,
  Check,
  CircleHelp,
  ClipboardList,
  Clock,
  Copy,
  Database,
  FileSignature,
  FileText,
  Hourglass,
  LayoutGrid,
  Link2,
  type LucideProps,
  Minus,
  MinusCircle,
  MessageCircleQuestion,
  Receipt,
  Search,
  CalendarClock,
  Target,
  Timer,
  TriangleAlert,
  UserCog,
  UserRound,
  Users,
  Workflow,
  Zap,
  ChevronRight,
} from "lucide-react";
import type { SymbolKey } from "@/lib/radar/catalog";
import { useEffect, useState } from "react";
import type { KundenErgebnis } from "@/lib/radar/views";
import { useZaehler } from "./einschlag";

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
    symbol?: SymbolKey | null;
    rolle?: "sache" | "unbekannt" | "keinBefund";
  }>;
};

const SYMBOLE: Record<SymbolKey, React.ComponentType<LucideProps>> = {
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
  angebot: FileSignature,
  auftrag: ClipboardList,
  rechnung: Receipt,
  planung: CalendarClock,
  personal: UserCog,
  suche: Search,
  warten: Hourglass,
  doppelt: Copy,
  rueckfrage: MessageCircleQuestion,
  fehler: TriangleAlert,
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
          className={`text-[#f4f8fd] font-bold leading-[1.18] ${
            kompakt ? "text-[20px] tracking-tight" : "text-[27px] sm:text-[34px] lg:text-[38px] tracking-[-0.022em]"
          }`}
        >
          <BetonteFrage text={frage.frage} betonung={frage.betonung ?? []} />
        </h3>
      </div>

      <div className="grid gap-2.5">
        {frage.optionen.map((o, i) => {
          const aktiv = gewaehlt.includes(o.key);
          const Symbol =
            o.rolle === "unbekannt"
              ? CircleHelp
              : o.rolle === "keinBefund"
                ? MinusCircle
                : o.symbol
                  ? SYMBOLE[o.symbol]
                  : Sachsymbol;
          return (
            <button
              key={o.key}
              type="button"
              onClick={() => klick(o.key)}
              disabled={disabled}
              aria-pressed={aktiv}
              style={{ animationDelay: `${i * 45}ms` }}
              className={`group relative overflow-hidden text-left rounded-2xl border outline-none transition-[transform,border-color,background-color,box-shadow] duration-200 ease-out
                motion-safe:animate-[karte-ein_.45s_cubic-bezier(.22,1,.36,1)_both]
                focus-visible:ring-2 focus-visible:ring-[#00b8ff]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#070d17]
                disabled:cursor-not-allowed ${kompakt ? "px-3.5 py-3" : "px-5 py-[18px]"} ${
                  aktiv
                    ? "border-[#00b8ff]/60 bg-[linear-gradient(110deg,rgba(0,184,255,0.13),rgba(0,184,255,0.04)_55%,transparent)] shadow-[0_0_0_1px_rgba(0,184,255,0.22),0_14px_40px_-18px_rgba(0,184,255,0.75)]"
                    : "border-[#14263e] bg-[linear-gradient(160deg,#0b1626,#090f1b)] hover:border-[#2b5078] hover:bg-[#0d1828] motion-safe:hover:-translate-y-[2px] hover:shadow-[0_12px_32px_-20px_rgba(0,184,255,0.55)]"
                } ${disabled ? "opacity-60" : ""}`}
            >
              {/*
                Die Glaskante: eine Haarlinie Licht an der Oberkante. Ohne sie
                sehen dunkle Flächen flach aus — mit ihr bekommen sie eine
                Oberfläche, auf die Licht fällt.
              */}
              <span
                aria-hidden
                className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.09)_35%,rgba(255,255,255,0.09)_65%,transparent)]"
              />
              {/* Der Akzentstrich links wächst beim Überfahren und bleibt bei Auswahl. */}
              <span
                aria-hidden
                className={`pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-r-full bg-[linear-gradient(180deg,#00b8ff,#2ee6c5)] transition-all duration-300 ease-out ${
                  aktiv ? "h-[62%] opacity-100" : "h-0 opacity-0 group-hover:h-[38%] group-hover:opacity-70"
                }`}
              />

              <span className="relative flex items-center gap-3.5">
                <span
                  className={`flex-shrink-0 w-[19px] h-[19px] flex items-center justify-center border-2 transition-all duration-200 ${
                    frage.modus === "mehrfach" ? "rounded-[6px]" : "rounded-full"
                  } ${
                    aktiv
                      ? "border-[#00b8ff] bg-[#00b8ff] motion-safe:scale-105"
                      : "border-[#2a4059] group-hover:border-[#4b7cab]"
                  }`}
                >
                  {aktiv &&
                    (frage.modus === "mehrfach" ? (
                      <Check size={11} className="text-[#041018]" strokeWidth={3.5} />
                    ) : (
                      <span className="w-[7px] h-[7px] rounded-full bg-[#041018]" />
                    ))}
                </span>

                <span
                  className={`relative flex-shrink-0 w-10 h-10 rounded-xl border flex items-center justify-center transition-all duration-250 ${
                    aktiv
                      ? "border-[#00b8ff]/45 bg-[linear-gradient(145deg,rgba(0,184,255,0.22),rgba(46,230,197,0.1))] text-[#5fd4ff] shadow-[0_0_18px_-4px_rgba(0,184,255,0.7),inset_0_1px_0_rgba(255,255,255,0.1)]"
                      : "border-[#17304d] bg-[#0c1829] text-[#4a5f7d] group-hover:border-[#2b5078] group-hover:text-[#7fb6e0] group-hover:bg-[#101f33] group-hover:shadow-[0_0_14px_-5px_rgba(0,184,255,0.55)]"
                  }`}
                >
                  <Symbol size={17} strokeWidth={aktiv ? 2.1 : 1.8} />
                </span>

                <span className="min-w-0 flex-1">
                  <span
                    className={`block leading-snug font-medium transition-colors duration-200 ${
                      kompakt ? "text-[13.5px]" : "text-[16px]"
                    } ${aktiv ? "text-[#f4f8fd]" : "text-[#c9d4e4] group-hover:text-[#eef2f7]"}`}
                  >
                    {o.label}
                  </span>
                  {o.hinweis && (
                    <span className="block text-[#5b6b7f] text-[11.5px] mt-1 leading-snug">
                      {o.hinweis}
                    </span>
                  )}
                </span>

                {/*
                  Der Pfeil am rechten Rand. Er zeigt beim Überfahren, dass die
                  ganze Fläche anklickbar ist — auf einer breiten Karte ist das
                  sonst nicht selbstverständlich — und füllt den Raum, der
                  rechts neben kurzen Antworten entsteht.
                */}
                <ChevronRight
                  size={16}
                  aria-hidden
                  className={`flex-shrink-0 transition-all duration-200 ${
                    aktiv
                      ? "text-[#00b8ff] opacity-90 translate-x-0"
                      : "text-[#2b5078] opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0"
                  }`}
                />
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Eine Achse im Ergebnisbericht.
 *
 * Der Balken läuft von null hoch, die Zahl zählt mit. Das ist der Moment, auf
 * den die Viertelstunde hinausläuft — er darf sich anfühlen wie ein Ergebnis
 * und nicht wie ein geladenes Formular. Die Werte stehen längst fest, bevor
 * hier etwas läuft; die Bewegung erfindet nichts.
 */
function Achse({
  achse: a,
  aufgebaut,
  verzug,
}: {
  achse: KundenErgebnis["achsen"][number];
  aufgebaut: boolean;
  verzug: number;
}) {
  const gezaehlt = useZaehler(aufgebaut && a.wert !== null ? a.wert : 0, 900);

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 mb-1.5">
        <span className="text-[#c9d4e4] text-[13px] font-medium">{a.label}</span>
        {a.wert === null ? (
          <span
            className="text-[11px] font-semibold uppercase tracking-wider"
            style={{ color: BAND_FARBE[a.band] ?? "#8899b4" }}
          >
            {a.band}
          </span>
        ) : (
          <span className="text-[#eef2f7] text-[15px] font-bold tabular-nums">
            {Math.round(gezaehlt ?? 0)}
            <span className="text-[#44546b] text-[11px] font-normal"> / 100</span>
          </span>
        )}
      </div>
      {a.wert === null ? (
        // Ohne belastbare Zahl keine Balkenlänge, die eine vorgaukelt —
        // stattdessen eine Pegelanzeige, bis zum erreichten Band aufgefüllt.
        // Nur das dritte Segment einzufärben liest sich wie „wenig“, obwohl
        // „hoch“ gemeint ist.
        <div className="flex gap-1">
          {["gering", "mittel", "hoch"].map((stufe, i) => (
            <span
              key={stufe}
              className="h-[5px] flex-1 rounded-full transition-colors duration-500"
              style={{
                background:
                  aufgebaut && i <= ["gering", "mittel", "hoch"].indexOf(a.band)
                    ? (BAND_FARBE[a.band] ?? "#8899b4")
                    : "#101b2c",
                transitionDelay: `${verzug + i * 90}ms`,
              }}
            />
          ))}
        </div>
      ) : (
        <div className="relative h-[5px] rounded-full bg-[#0d1b2c] overflow-hidden">
          <div
            className="h-full rounded-full transition-[width] duration-[900ms] ease-out"
            style={{
              width: `${aufgebaut ? a.wert : 0}%`,
              background: `linear-gradient(90deg,${BAND_FARBE[a.band] ?? "#8899b4"},#2ee6c5)`,
              transitionDelay: `${verzug}ms`,
              boxShadow: `0 0 14px -2px ${BAND_FARBE[a.band] ?? "#8899b4"}`,
            }}
          />
        </div>
      )}
      <p className="text-[#44546b] text-[11px] mt-1.5 leading-snug">{a.frage}</p>
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

  /*
    Der Bericht baut sich auf, statt da zu sein.

    Das ist der Moment, auf den die ganze Viertelstunde hinausläuft — der
    Berater gibt frei, und der Interessent sieht sein Ergebnis zum ersten Mal.
    Lautlos erscheinen zu lassen, was man gerade gemeinsam erarbeitet hat,
    verschenkt genau diesen Moment. Die Balken laufen von null hoch, die
    Zahlen zählen mit, die Felder kommen gestaffelt nach.

    Rein darstellend: Die Werte stehen längst fest, bevor hier etwas läuft.
  */
  const [aufgebaut, setAufgebaut] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setAufgebaut(true), 120);
    return () => clearTimeout(id);
  }, []);

  return (
    <div className="space-y-4">
      {/* Kopf */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[#5b6b7f] text-[11px] uppercase tracking-[0.18em]">
            Potenzialanalyse
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
      <div className="space-y-3">
        {ergebnis.achsen.map((a, i) => (
          <Achse key={a.label} achse={a} aufgebaut={aufgebaut} verzug={i * 140} />
        ))}
      </div>
      {/* Potenzialfelder */}
      {ergebnis.felder.length > 0 && (
        <div>
          <p className="text-[#5b6b7f] text-[11px] uppercase tracking-[0.18em] mb-2">
            Erkannte Potenzialfelder
          </p>
          <div className={`grid gap-2 ${kompakt ? "" : "sm:grid-cols-3"}`}>
            {ergebnis.felder.map((f, i) => (
              <div
                key={f.label}
                style={{ animationDelay: `${520 + i * 110}ms` }}
                className="rounded-lg border border-[#16283d] bg-[linear-gradient(160deg,#0b1424,#080f1b)] px-3 py-2.5 motion-safe:animate-[karte-ein_.55s_cubic-bezier(.22,1,.36,1)_both]">
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
