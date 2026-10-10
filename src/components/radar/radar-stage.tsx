"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Pencil, Radar as RadarIcon, Wifi, WifiOff } from "lucide-react";
import { beiStups, stupseGegenseite } from "@/lib/radar/kanal";
import type { RadarKundenAnsicht } from "@/lib/radar/views";
import { Ergebnisbericht, Fragekarte, Phasenleiste } from "./pieces";

/**
 * Die Analyse, wie der Interessent sie sieht.
 *
 * Sie steht auf der Bühne des laufenden Videogesprächs — die Gesichter
 * daneben, das Gespräch läuft weiter. Der Berater führt: Er blättert, er
 * wertet aus, er gibt das Ergebnis frei. Der Interessent klickt seine
 * Antworten, korrigiert sie bei Bedarf und sieht, wie weit sie sind.
 *
 * Alles, was hier steht, kommt aus `kundenAnsicht` — einer eigens
 * zusammengestellten Sicht. Gewichte, Belege je Achse und die interne Notiz
 * des Beraters sind nicht etwa ausgeblendet; sie kommen hier gar nicht an.
 *
 * Verbindung: Der Stand wird zyklisch geholt, ein Stups über den Datenkanal
 * des Gesprächs beschleunigt das nur. Reißt die Leitung, läuft der Takt
 * weiter und die Oberfläche sagt es — ohne die bereits gegebenen Antworten
 * zu verlieren, denn die stehen auf dem Server.
 */

const TAKT_MS = 2500;
const TAKT_LANGSAM_MS = 10_000;

type Props = {
  token: string;
  initial: RadarKundenAnsicht | null;
  /** Kompakte Darstellung für kleine Bühnen. */
  kompakt?: boolean;
};

export function RadarStage({ token, initial, kompakt }: Props) {
  const [ansicht, setAnsicht] = useState<RadarKundenAnsicht | null>(initial);
  const [verbunden, setVerbunden] = useState(true);
  const [sendet, setSendet] = useState<string | null>(null);
  const [korrigiert, setKorrigiert] = useState<string | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  // Während der Nutzer gerade tippt, darf ein Abfragetakt sein Feld nicht
  // überschreiben. Diese Sperre hält genau so lange wie die Eingabe.
  const tippt = useRef(false);

  const holen = useCallback(async () => {
    try {
      const res = await fetch(`/api/closing/radar?token=${encodeURIComponent(token)}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        setVerbunden(res.status !== 0);
        return;
      }
      const data = (await res.json()) as { radar: RadarKundenAnsicht | null };
      setVerbunden(true);
      if (tippt.current) return;
      setAnsicht(data.radar);
    } catch {
      // Ein Aussetzer ist kein Datenverlust — die Antworten stehen auf dem
      // Server. Der nächste Takt holt den Stand nach.
      setVerbunden(false);
    }
  }, [token]);

  useEffect(() => {
    const takt = ansicht?.abgeschlossen ? TAKT_LANGSAM_MS : TAKT_MS;
    const id = setInterval(holen, takt);
    return () => clearInterval(id);
  }, [holen, ansicht?.abgeschlossen]);

  useEffect(() => beiStups(() => void holen()), [holen]);

  const schreiben = useCallback(
    async (body: Record<string, unknown>, marke: string) => {
      setSendet(marke);
      setFehler(null);
      try {
        const res = await fetch("/api/closing/radar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, ...body }),
        });
        const data = (await res.json()) as { radar?: RadarKundenAnsicht; error?: string };
        if (!res.ok) {
          setFehler(data.error ?? "Die Eingabe konnte nicht gespeichert werden.");
          await holen();
          return;
        }
        setVerbunden(true);
        if (data.radar) setAnsicht(data.radar);
        stupseGegenseite();
      } catch {
        setFehler("Die Verbindung wurde unterbrochen. Ihre Eingabe wurde noch nicht gespeichert.");
        setVerbunden(false);
      } finally {
        setSendet(null);
      }
    },
    [token, holen]
  );

  const beantwortet = useMemo(
    () => (ansicht ? Object.keys(ansicht.antworten).length : 0),
    [ansicht]
  );

  if (!ansicht) {
    return (
      <Rahmen kompakt={kompakt}>
        <div className="h-full flex flex-col items-center justify-center gap-3 text-center px-6">
          <RadarIcon size={24} className="text-[#2a3a55]" />
          <p className="text-[#8899b4] text-sm">Die Analyse ist gerade nicht geöffnet.</p>
        </div>
      </Rahmen>
    );
  }

  const zeigeErgebnis = ansicht.phase === "ergebnis" && ansicht.ergebnis;

  return (
    <Rahmen kompakt={kompakt}>
      {/* Kopfzeile */}
      <div className="flex-shrink-0 px-4 sm:px-5 pt-4 pb-3 border-b border-[#101b2c] space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <RadarIcon size={15} className="text-[#00b8ff] flex-shrink-0" />
            <span className="text-[#eef2f7] text-[13px] font-semibold truncate">OKUN Radar</span>
            <span className="text-[#44546b] text-[11px] truncate hidden sm:inline">
              Potenzialanalyse · {ansicht.companyName}
            </span>
          </div>
          <span
            className="flex items-center gap-1 text-[10px] flex-shrink-0"
            title={verbunden ? "Verbunden" : "Keine Verbindung — wird erneut versucht"}
          >
            {verbunden ? (
              <Wifi size={11} className="text-[#2a3a55]" />
            ) : (
              <WifiOff size={11} className="text-[#f59e0b]" />
            )}
          </span>
        </div>
        {!zeigeErgebnis && (
          <Phasenleiste phasen={ansicht.phasen} prozent={ansicht.fortschritt.prozent} />
        )}
      </div>

      {/* Inhalt */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-5 py-4">
        {zeigeErgebnis ? (
          <Ergebnisbericht
            ergebnis={ansicht.ergebnis!}
            companyName={ansicht.companyName}
            kompakt={kompakt}
          />
        ) : ansicht.phase === "ergebnis" ? (
          <Warten text="Ihr Berater stellt gerade die Auswertung zusammen." />
        ) : ansicht.phase === "profil" ? (
          <Profilteil
            ansicht={ansicht}
            kompakt={kompakt}
            sendet={sendet}
            onFokus={(an) => (tippt.current = an)}
            onSpeichern={(profil) => void schreiben({ aktion: "profil", profil }, "profil")}
          />
        ) : ansicht.spotlightAuswahl ? (
          <Warten text="Sie wählen gleich gemeinsam einen Ablauf aus, den wir uns genauer ansehen." />
        ) : korrigiert ? (
          <Korrektur
            ansicht={ansicht}
            kompakt={kompakt}
            sendet={sendet}
            onAntwort={(frageKey, optionKeys) =>
              void schreiben({ aktion: "antwort", frageKey, optionKeys }, frageKey)
            }
          />
        ) : ansicht.frage ? (
          <Fragekarte
            frage={ansicht.frage}
            gewaehlt={ansicht.antworten[ansicht.frage.key] ?? []}
            disabled={sendet === ansicht.frage.key}
            kompakt={kompakt}
            onWaehlen={(optionKeys) =>
              void schreiben(
                { aktion: "antwort", frageKey: ansicht.frage!.key, optionKeys },
                ansicht.frage!.key
              )
            }
          />
        ) : (
          <Warten text="Einen Moment — Ihr Berater öffnet die nächste Frage." />
        )}
      </div>

      {/* Fußzeile: eigene Angaben korrigieren */}
      {!zeigeErgebnis && beantwortet > 0 && ansicht.phase !== "profil" && (
        <div className="flex-shrink-0 px-4 sm:px-5 py-2.5 border-t border-[#101b2c] flex items-center justify-between gap-3">
          <span className="text-[#44546b] text-[11px]">
            {beantwortet} {beantwortet === 1 ? "Angabe" : "Angaben"} erfasst
          </span>
          <button
            onClick={() => setKorrigiert(korrigiert ? null : "offen")}
            className="flex items-center gap-1.5 text-[11px] text-[#8899b4] hover:text-[#00b8ff] transition-colors"
          >
            <Pencil size={10} />
            {korrigiert ? "Zurück zur Frage" : "Angabe ändern"}
          </button>
        </div>
      )}

      {fehler && (
        <div className="flex-shrink-0 px-4 sm:px-5 py-2 bg-[rgba(245,158,11,0.08)] border-t border-[#f59e0b]/20">
          <p className="text-[#fbbf24] text-[11px]">{fehler}</p>
        </div>
      )}
    </Rahmen>
  );
}

function Rahmen({ children, kompakt }: { children: React.ReactNode; kompakt?: boolean }) {
  return (
    <div className={`h-full flex flex-col min-h-0 bg-[#070d15] ${kompakt ? "text-[13px]" : ""}`}>
      {children}
    </div>
  );
}

function Warten({ text }: { text: string }) {
  return (
    <div className="h-full min-h-[160px] flex flex-col items-center justify-center gap-3 text-center">
      <Loader2 size={18} className="text-[#2a3a55] animate-spin" />
      <p className="text-[#8899b4] text-[13px] max-w-xs">{text}</p>
    </div>
  );
}

/**
 * Phase 1 beim Interessenten.
 *
 * Vorbelegtes aus dem CRM steht schon da und ist änderbar — niemand soll
 * tippen, was wir bereits wissen. Gespeichert wird beim Verlassen des Feldes,
 * nicht bei jedem Tastendruck: Sonst schriebe jede Eingabe eine Runde durch
 * Server und Gegenseite.
 */
function Profilteil({
  ansicht,
  kompakt,
  sendet,
  onFokus,
  onSpeichern,
}: {
  ansicht: RadarKundenAnsicht;
  kompakt?: boolean;
  sendet: string | null;
  onFokus: (an: boolean) => void;
  onSpeichern: (profil: Record<string, string | string[]>) => void;
}) {
  const [entwurf, setEntwurf] = useState<Record<string, string | string[]>>(() =>
    Object.fromEntries(ansicht.profilFelder.map((f) => [f.key, f.wert ?? (f.art === "mehrfach" ? [] : "")]))
  );

  // Der Berater hat etwas eingetragen — übernehmen, solange hier nicht getippt
  // wird. Der zuletzt gesehene Stand liegt im Zustand und nicht in einem Ref,
  // weil ein während des Renderns gelesener Ref einen Durchlauf verschlucken kann.
  const serverStand = ansicht.profilFelder.map((f) => `${f.key}=${JSON.stringify(f.wert)}`).join("|");
  const [gesehen, setGesehen] = useState(serverStand);
  if (gesehen !== serverStand) {
    setGesehen(serverStand);
    setEntwurf(
      Object.fromEntries(
        ansicht.profilFelder.map((f) => [f.key, f.wert ?? (f.art === "mehrfach" ? [] : "")])
      )
    );
  }

  function speichern(naechster: Record<string, string | string[]>) {
    setEntwurf(naechster);
    onSpeichern(naechster);
  }

  return (
    <div className="space-y-3.5">
      <div>
        <h3 className={`text-[#eef2f7] font-semibold ${kompakt ? "text-[15px]" : "text-lg"}`}>
          Kurz zu Ihrem Unternehmen
        </h3>
        <p className="text-[#5b6b7f] text-[12px] mt-0.5">
          Was wir schon haben, steht bereits da. Bitte ergänzen oder korrigieren Sie, was nicht passt.
        </p>
      </div>

      {ansicht.profilFelder.map((feld) => {
        const wert = entwurf[feld.key];
        if (feld.art === "mehrfach") {
          const gewaehlt = Array.isArray(wert) ? wert : [];
          return (
            <div key={feld.key}>
              <Beschriftung>{feld.label}</Beschriftung>
              <div className="flex flex-wrap gap-1.5">
                {(feld.optionen ?? []).map((o) => {
                  const an = gewaehlt.includes(o.key);
                  return (
                    <button
                      key={o.key}
                      type="button"
                      onClick={() =>
                        speichern({
                          ...entwurf,
                          [feld.key]: an ? gewaehlt.filter((k) => k !== o.key) : [...gewaehlt, o.key],
                        })
                      }
                      className={`px-2.5 py-1.5 rounded-lg border text-[12px] transition-colors ${
                        an
                          ? "border-[#00b8ff]/50 bg-[rgba(0,184,255,0.1)] text-[#00b8ff]"
                          : "border-[#16283d] text-[#8899b4] hover:border-[#2a3a55]"
                      }`}
                    >
                      {o.label}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        }

        if (feld.art === "auswahl") {
          return (
            <div key={feld.key}>
              <Beschriftung>{feld.label}</Beschriftung>
              <div className="flex flex-wrap gap-1.5">
                {(feld.optionen ?? []).map((o) => {
                  const an = wert === o.key;
                  return (
                    <button
                      key={o.key}
                      type="button"
                      onClick={() => speichern({ ...entwurf, [feld.key]: o.key })}
                      className={`px-2.5 py-1.5 rounded-lg border text-[12px] transition-colors ${
                        an
                          ? "border-[#00b8ff]/50 bg-[rgba(0,184,255,0.1)] text-[#00b8ff]"
                          : "border-[#16283d] text-[#8899b4] hover:border-[#2a3a55]"
                      }`}
                    >
                      {o.label}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        }

        return (
          <div key={feld.key}>
            <Beschriftung>{feld.label}</Beschriftung>
            <input
              value={typeof wert === "string" ? wert : ""}
              onChange={(e) => setEntwurf({ ...entwurf, [feld.key]: e.target.value })}
              onFocus={() => onFokus(true)}
              onBlur={() => {
                onFokus(false);
                onSpeichern(entwurf);
              }}
              disabled={sendet === "profil"}
              className="w-full px-3 py-2 rounded-lg bg-[#0a111c] border border-[#16283d] text-[#eef2f7] text-[13px] outline-none focus:border-[#00b8ff]/50 transition-colors"
            />
          </div>
        );
      })}
    </div>
  );
}

function Beschriftung({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[#5b6b7f] text-[11px] uppercase tracking-[0.14em] mb-1.5">{children}</p>
  );
}

/**
 * Eine bereits gegebene Antwort nachträglich ändern.
 *
 * Der Interessent wählt sie an ihrem Wortlaut aus, nicht an einem Schlüssel,
 * und beantwortet sie direkt neu. Die gemeinsame Ansicht springt dabei nicht:
 * Der Berater bleibt da, wo er ist, und sieht nur, dass sich eine Angabe
 * geändert hat.
 */
function Korrektur({
  ansicht,
  kompakt,
  sendet,
  onAntwort,
}: {
  ansicht: RadarKundenAnsicht;
  kompakt?: boolean;
  sendet: string | null;
  onAntwort: (frageKey: string, optionKeys: string[]) => void;
}) {
  const [offen, setOffen] = useState<string | null>(null);
  const gewaehlteFrage = ansicht.beantworteteFragen.find((f) => f.key === offen) ?? null;

  if (gewaehlteFrage) {
    return (
      <div className="space-y-3">
        <button
          onClick={() => setOffen(null)}
          className="text-[#8899b4] text-[11px] hover:text-[#00b8ff] transition-colors"
        >
          ← Zur Übersicht
        </button>
        <Fragekarte
          frage={gewaehlteFrage}
          gewaehlt={ansicht.antworten[gewaehlteFrage.key] ?? []}
          disabled={sendet === gewaehlteFrage.key}
          kompakt={kompakt}
          onWaehlen={(keys) => onAntwort(gewaehlteFrage.key, keys)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      <p className="text-[#8899b4] text-[12px]">
        Ihre bisherigen Angaben. Tippen Sie auf eine, um sie zu ändern.
      </p>
      <div className="space-y-1.5">
        {ansicht.beantworteteFragen.map((f) => {
          const gewaehlt = ansicht.antworten[f.key] ?? [];
          const texte = f.optionen.filter((o) => gewaehlt.includes(o.key)).map((o) => o.label);
          return (
            <button
              key={f.key}
              onClick={() => setOffen(f.key)}
              className="w-full text-left px-3 py-2.5 rounded-lg border border-[#16283d] bg-[#0a111c] hover:border-[#2a3a55] transition-colors"
            >
              <span className="block text-[#8899b4] text-[11px] leading-snug">{f.frage}</span>
              <span className="block text-[#c9d4e4] text-[12px] font-medium mt-1 leading-snug">
                {texte.join(" · ") || "—"}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
