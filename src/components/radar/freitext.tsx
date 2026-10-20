"use client";

import { useMemo, useRef, useState } from "react";
import { CircleHelp, Plus, Sparkles, X } from "lucide-react";
import {
  KATEGORIE_LABEL,
  SOFTWARE_ANZAHL,
  findeSoftware,
  schlageSoftwareVor,
  type SoftwareEintrag,
} from "@/lib/radar/software-katalog";

/**
 * Eingaben in eigenen Worten.
 *
 * Drei Bausteine, die dieselbe Überzeugung teilen: Kein Katalog trifft jeden
 * Betrieb. Wer in keiner Schublade liegt, hat vorher die nächstbeste
 * angekreuzt — und damit stand in den Daten eine Angabe, die so nie gemacht
 * wurde. Besser eine Zeile Text, die jemand lesen muss, als ein Kreuz, das
 * falsch ist.
 *
 * Beide Seiten benutzen dieselben Bausteine: Was der Interessent tippt und
 * was der Berater mitschreibt, landet an derselben Stelle.
 */

// ─── Programme ───────────────────────────────────────────────────────────────

export type SoftwareZweck = { name: string; zweck: string };

/**
 * Die genutzten Programme als Begriffe.
 *
 * Tippen schlägt vor, die Eingabetaste übernimmt. Wer „Outl" tippt, bekommt
 * Outlook — das ist kein Komfort, sondern eine Aussage: Wir kennen die
 * Programme, mit denen der Betrieb arbeitet. Was der Katalog nicht kennt,
 * wird trotzdem übernommen und löst eine Rückfrage aus; die Antwort darauf
 * ist oft die interessanteste Angabe des ganzen Profils.
 */
export function SoftwareFeld({
  werte,
  zwecke,
  disabled,
  onWerte,
  onZweck,
}: {
  werte: string[];
  /** Zu unbekannten Programmen: wofür sie genutzt werden. */
  zwecke: Record<string, string>;
  disabled?: boolean;
  onWerte: (werte: string[]) => void;
  onZweck: (name: string, zweck: string) => void;
}) {
  const [eingabe, setEingabe] = useState("");
  const [markiert, setMarkiert] = useState(0);
  const feld = useRef<HTMLInputElement>(null);

  const vorschlaege = useMemo(() => {
    const vorhanden = new Set(werte.map((w) => w.toLowerCase()));
    return schlageSoftwareVor(eingabe).filter((s) => !vorhanden.has(s.name.toLowerCase()));
  }, [eingabe, werte]);

  function uebernehmen(name: string) {
    const sauber = name.trim();
    if (!sauber) return;

    /*
      Erst nachschlagen, dann übernehmen.

      Wer „ms-outlook" tippt, meint Microsoft Outlook — und soll es auch so
      in der Liste sehen. Und wer ein Programm tippt, das schon dasteht,
      bekommt keinen zweiten Eintrag: Vorher landete in genau diesem Fall die
      halb getippte Rohform als eigener, unbekannter Begriff in der Liste,
      samt überflüssiger Rückfrage.
    */
    const treffer = findeSoftware(sauber);
    const endgueltig = treffer?.name ?? sauber;

    const form = sauber.toLowerCase();
    const schonDa = werte.some((w) => {
      const vorhanden = findeSoftware(w);
      if (treffer && vorhanden) return vorhanden.key === treffer.key;
      if (w.toLowerCase() === endgueltig.toLowerCase()) return true;
      /*
        Auch ein angefangener Name zählt als schon da.

        Wer „Outlook" in der Liste hat und noch einmal „outl" tippt, meint
        denselben Eintrag — nicht einen neuen, unbekannten Begriff. Ohne diese
        Prüfung stand genau das in der Liste, samt Rückfrage, wofür der
        Betrieb „outl" benutzt.
      */
      const kandidaten = [w, vorhanden?.name, ...(vorhanden?.aliase ?? [])].filter(
        (x): x is string => Boolean(x)
      );
      return kandidaten.some((x) => x.toLowerCase().startsWith(form));
    });

    if (!schonDa) onWerte([...werte, endgueltig]);
    setEingabe("");
    setMarkiert(0);
    feld.current?.focus();
  }

  function taste(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setMarkiert((m) => Math.min(m + 1, vorschlaege.length - 1));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setMarkiert((m) => Math.max(m - 1, 0));
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      // Der markierte Vorschlag gewinnt; sonst zählt, was dasteht.
      uebernehmen(vorschlaege[markiert]?.name ?? eingabe);
      return;
    }
    if (e.key === "Backspace" && eingabe === "" && werte.length > 0) {
      onWerte(werte.slice(0, -1));
    }
  }

  const unbekannte = werte.filter((w) => !findeSoftware(w));

  return (
    <div className="space-y-2.5">
      {werte.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {werte.map((name) => {
            const treffer = findeSoftware(name);
            return (
              <span
                key={name}
                className={`group inline-flex items-center gap-2 pl-3 pr-1.5 py-1.5 rounded-xl border text-[12.5px] ${
                  treffer
                    ? "border-[#17304d] bg-[rgba(0,184,255,0.07)] text-[#cfe0f2]"
                    : "border-[#f59e0b]/30 bg-[rgba(245,158,11,0.07)] text-[#fbbf24]"
                }`}
                title={treffer ? `${treffer.name} — ${treffer.zweck}` : "Noch nicht eingeordnet"}
              >
                <span className="font-medium">{treffer?.name ?? name}</span>
                {treffer && (
                  <span className="hidden sm:inline font-mono text-[9.5px] uppercase tracking-[0.12em] text-[#4a6383]">
                    {KATEGORIE_LABEL[treffer.kategorie]}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => onWerte(werte.filter((w) => w !== name))}
                  disabled={disabled}
                  aria-label={`${name} entfernen`}
                  className="p-1 rounded-lg text-[#44546b] hover:text-[#eef2f7] hover:bg-[#13243c] transition-colors"
                >
                  <X size={12} />
                </button>
              </span>
            );
          })}
        </div>
      )}

      <div className="relative">
        <input
          ref={feld}
          value={eingabe}
          disabled={disabled}
          onChange={(e) => {
            setEingabe(e.target.value);
            setMarkiert(0);
          }}
          onKeyDown={taste}
          onBlur={() => {
            // Was im Feld stehen bleibt, geht sonst beim Weiterklicken verloren.
            if (eingabe.trim()) uebernehmen(eingabe);
          }}
          placeholder="Programm eingeben, Eingabetaste übernimmt"
          className="w-full px-3.5 py-2.5 rounded-xl bg-[#0a1322] border border-[#14263e] text-[#eef2f7] text-[13.5px] outline-none focus:border-[#00b8ff]/60 focus:bg-[#0c1828] transition-colors"
        />

        {vorschlaege.length > 0 && (
          <ul className="absolute z-30 left-0 right-0 mt-1.5 max-h-[244px] overflow-y-auto rounded-xl border border-[#17304d] bg-[#0a1322] shadow-[0_24px_60px_-28px_rgba(0,0,0,0.95)] py-1">
            {vorschlaege.map((s, i) => (
              <li key={s.key}>
                <button
                  type="button"
                  // `onMouseDown` statt `onClick`: Ein Klick würde erst das
                  // Feld verlassen, und der Blur-Handler hätte die Rohform
                  // schon übernommen.
                  onMouseDown={(e) => {
                    e.preventDefault();
                    uebernehmen(s.name);
                  }}
                  onMouseEnter={() => setMarkiert(i)}
                  className={`w-full text-left px-3.5 py-2 flex items-baseline gap-2 transition-colors ${
                    i === markiert ? "bg-[rgba(0,184,255,0.1)]" : ""
                  }`}
                >
                  <span className="text-[#eef2f7] text-[13px] font-medium flex-shrink-0">
                    {s.name}
                  </span>
                  <span className="text-[#5b6b7f] text-[11.5px] truncate">{s.zweck}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="text-[#44546b] text-[11px] leading-snug flex items-center gap-1.5">
        <Sparkles size={10} className="flex-shrink-0" />
        {SOFTWARE_ANZAHL} Programme hinterlegt. Was fehlt, einfach eintippen — wir fragen dann
        kurz nach.
      </p>

      {/*
        Die Rückfrage zu unbekannten Programmen.

        Sie ist der eigentliche Gewinn an dieser Stelle: Eine Branchensoftware,
        die wir nicht kennen, sagt für sich genommen nichts. Wofür der Betrieb
        sie benutzt, sagt alles.
      */}
      {unbekannte.map((name) => (
        <div
          key={name}
          className="rounded-xl border border-[#f59e0b]/25 bg-[rgba(245,158,11,0.05)] px-3.5 py-3"
        >
          <p className="flex items-start gap-2 text-[#fbbf24] text-[12px] font-semibold leading-snug">
            <CircleHelp size={13} className="flex-shrink-0 mt-[1px]" />
            <span>
              {"\u201e"}{name}{"\u201c"} kennen wir noch nicht — wofür nutzen Sie das?
            </span>
          </p>
          <textarea
            defaultValue={zwecke[name] ?? ""}
            disabled={disabled}
            rows={2}
            onBlur={(e) => onZweck(name, e.target.value)}
            placeholder="Ein Satz reicht: Was macht der Betrieb damit?"
            className="mt-2 w-full px-3 py-2 rounded-lg bg-[#0a1322] border border-[#14263e] text-[#eef2f7] text-[12.5px] outline-none focus:border-[#f59e0b]/50 transition-colors resize-none"
          />
        </div>
      ))}
    </div>
  );
}

/*
  Welche Textfelder der Benutzer aufgeklappt hat.

  Bewusst außerhalb der Komponenten: Das Steuerpult rendert in einer
  React-Transition neu, und dabei kann der Teilbaum neu aufgebaut werden —
  ein aufgeklapptes Feld wäre dann wieder zu, mitten im Tippen. Der Zustand
  lebt im Browsertab und ist absichtlich kurzlebig; gespeichert wird er nie.
*/
const OFFENE_FELDER = new Set<string>();

function useOffen(merkmal: string, vorbelegt: boolean) {
  const [offen, setOffenIntern] = useState(() => vorbelegt || OFFENE_FELDER.has(merkmal));
  return {
    offen: offen || vorbelegt || OFFENE_FELDER.has(merkmal),
    oeffnen: () => {
      OFFENE_FELDER.add(merkmal);
      setOffenIntern(true);
    },
  };
}

// ─── Eigene Angabe zu einer Auswahl ──────────────────────────────────────────

/**
 * „Sonstiges" neben den Vorgaben.
 *
 * Erst ein Knopf, dann ein Feld. Ein dauerhaft offenes Textfeld neben fünf
 * Kacheln zieht den Blick von der Auswahl weg und lädt zum Tippen ein, wo ein
 * Klick genügt hätte.
 */
export function SonstigesFeld({
  merkmal,
  label,
  platzhalter,
  wert,
  disabled,
  onSpeichern,
}: {
  /** Stabiler Name des Feldes, damit das Aufklappen einen Neuaufbau übersteht. */
  merkmal: string;
  label: string;
  platzhalter: string;
  wert: string;
  disabled?: boolean;
  onSpeichern: (text: string) => void;
}) {
  const { offen, oeffnen } = useOffen(merkmal, Boolean(wert));

  if (!offen) {
    return (
      <button
        type="button"
        onClick={oeffnen}
        disabled={disabled}
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-dashed border-[#24415f] text-[#6d86a6] text-[12.5px] hover:text-[#cfe0f2] hover:border-[#2f5880] transition-colors"
      >
        <Plus size={13} /> {label}
      </button>
    );
  }

  return (
    <div className="w-full">
      <textarea
        autoFocus={!wert}
        defaultValue={wert}
        disabled={disabled}
        rows={2}
        onBlur={(e) => onSpeichern(e.target.value)}
        placeholder={platzhalter}
        className="w-full px-3.5 py-2.5 rounded-xl bg-[#0a1322] border border-[#14263e] text-[#eef2f7] text-[13px] outline-none focus:border-[#00b8ff]/60 focus:bg-[#0c1828] transition-colors resize-none"
      />
      <p className="text-[#44546b] text-[10.5px] mt-1">
        Fließt in die Auswertung ein — Ihr Berater sieht es sofort.
      </p>
    </div>
  );
}

// ─── Ergänzung zu einer Frage ────────────────────────────────────────────────

/**
 * Der Zusatz unter den Antwortkacheln.
 *
 * Bei jeder Frage, und bewusst klein: Die Antwortmöglichkeiten sollen zuerst
 * gelesen werden. Wer etwas zu sagen hat, das dort nicht steht, findet den
 * Weg trotzdem — und ohne ihn hätte er die nächstbeste Kachel angetippt.
 */
export function FrageErgaenzung({
  merkmal,
  wert,
  disabled,
  onSpeichern,
}: {
  /** Stabiler Name der Frage, damit das Aufklappen einen Neuaufbau übersteht. */
  merkmal: string;
  wert: string;
  disabled?: boolean;
  onSpeichern: (text: string) => void;
}) {
  const { offen, oeffnen } = useOffen(merkmal, Boolean(wert));

  if (!offen) {
    return (
      <button
        type="button"
        onClick={oeffnen}
        disabled={disabled}
        className="inline-flex items-center gap-1.5 text-[#4a6383] text-[12px] hover:text-[#8fdcff] transition-colors"
      >
        <Plus size={12} /> Passt nichts genau? In eigenen Worten ergänzen
      </button>
    );
  }

  return (
    <div>
      <textarea
        autoFocus={!wert}
        defaultValue={wert}
        disabled={disabled}
        rows={2}
        onBlur={(e) => onSpeichern(e.target.value)}
        placeholder="Wie ist es bei Ihnen? Zwei Sätze genügen."
        className="w-full px-3.5 py-2.5 rounded-xl bg-[#0a1322] border border-[#14263e] text-[#eef2f7] text-[13px] outline-none focus:border-[#00b8ff]/60 focus:bg-[#0c1828] transition-colors resize-none"
      />
      <p className="text-[#44546b] text-[10.5px] mt-1">
        Zählt wie eine Antwort — auch wenn Sie keine Kachel auswählen.
      </p>
    </div>
  );
}

/** Die Einordnung einer freien Angabe. Nur im Steuerpult. */
export function DeutungZeile({
  woher,
  text,
  einordnung,
  achse,
  wert,
  gezaehlt,
}: {
  woher: string;
  text: string;
  einordnung: string | null;
  achse: string | null;
  wert: number;
  gezaehlt: boolean;
}) {
  return (
    <div className="rounded-xl border border-[#16283d] bg-[#09101c] px-3.5 py-3">
      <p className="font-mono text-[#3d5c7e] text-[9.5px] uppercase tracking-[0.14em] truncate">
        {woher}
      </p>
      <p className="text-[#eef2f7] text-[12.5px] leading-snug mt-1">
        {"\u201e"}
        {text}
        {"\u201c"}
      </p>
      {einordnung ? (
        <p className="text-[#8899b4] text-[11.5px] leading-snug mt-1.5 pt-1.5 border-t border-[#101b2c]">
          {einordnung}
        </p>
      ) : (
        <p className="text-[#44546b] text-[11px] mt-1.5">Noch nicht eingeordnet.</p>
      )}
      <p className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.12em]">
        {gezaehlt ? (
          <span className="text-[#2ee6c5]">
            {achse} {wert > 0 ? `+${wert}` : wert}
          </span>
        ) : (
          <span className="text-[#f59e0b]">
            fließt nicht in die Zahlen ein — bitte nachfragen
          </span>
        )}
      </p>
    </div>
  );
}
