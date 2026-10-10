"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  FileText,
  Loader2,
  Radar as RadarIcon,
  Users,
} from "lucide-react";
import { beiStups, stupseGegenseite } from "@/lib/radar/kanal";
import type { RadarKundenAnsicht } from "@/lib/radar/views";
import { RadarCockpit, type CockpitBereich } from "./cockpit";
import { Ergebnisbericht, Fragekarte } from "./pieces";

/**
 * Das OKUN Radar, wie der Interessent es sieht.
 *
 * Ein Cockpit, kein Fragebogen: links sein Betrieb, in der Mitte die Frage,
 * rechts das Bild, das aus seinen Antworten entsteht — und darüber die beiden
 * Videokacheln, damit das Gespräch nicht abreißt.
 *
 * Alles, was hier steht, kommt aus `kundenAnsicht`. Gewichte, Belege je Achse
 * und die interne Notiz des Beraters sind nicht etwa ausgeblendet; sie kommen
 * hier gar nicht an.
 *
 * Verbindung: Der Stand wird zyklisch geholt, ein Stups über den Datenkanal
 * des Gesprächs beschleunigt das nur. Reißt die Leitung, läuft der Takt
 * weiter, die Kopfzeile sagt es — und nichts geht verloren, denn die Antworten
 * stehen auf dem Server.
 */

const TAKT_MS = 2500;
const TAKT_LANGSAM_MS = 10_000;

type Props = {
  token: string;
  initial: RadarKundenAnsicht | null;
  /** Die beiden Videokacheln aus dem laufenden Gespräch. */
  video?: React.ReactNode;
  /** Rechts in der Kopfzeile — Sitzungsanzeige, Teilnehmerzahl. */
  kopfzeile?: React.ReactNode;
};

export function RadarStage({ token, initial, video, kopfzeile }: Props) {
  const [ansicht, setAnsicht] = useState<RadarKundenAnsicht | null>(initial);
  const [verbunden, setVerbunden] = useState(true);
  const [sendet, setSendet] = useState<string | null>(null);
  const [bereich, setBereich] = useState("analyse");
  const [fehler, setFehler] = useState<string | null>(null);
  // Während getippt wird, darf ein Abfragetakt das Feld nicht überschreiben.
  const tippt = useRef(false);

  const holen = useCallback(async () => {
    try {
      const res = await fetch(`/api/closing/radar?token=${encodeURIComponent(token)}`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = (await res.json()) as { radar: RadarKundenAnsicht | null };
      setVerbunden(true);
      if (tippt.current) return;
      setAnsicht(data.radar);
    } catch {
      // Ein Aussetzer ist kein Datenverlust — der nächste Takt holt nach.
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

  const bereiche: CockpitBereich[] = useMemo(
    () => [
      { key: "analyse", label: "Analyse", Symbol: RadarIcon, verfuegbar: true },
      {
        key: "ergebnisse",
        label: "Ergebnisse",
        Symbol: BarChart3,
        verfuegbar: Boolean(ansicht?.ergebnis),
      },
      {
        key: "angaben",
        label: "Ihre Angaben",
        Symbol: FileText,
        verfuegbar: Boolean(ansicht && ansicht.beantworteteFragen.length > 0),
      },
    ],
    [ansicht]
  );

  if (!ansicht) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3 text-center px-6 bg-[#05090f]">
        <RadarIcon size={26} className="text-[#2a3a55]" />
        <p className="text-[#8899b4] text-sm">Die Analyse ist gerade nicht geöffnet.</p>
      </div>
    );
  }

  // Sobald das Ergebnis freigegeben ist, springt die Ansicht von selbst dorthin —
  // im Gespräch soll niemand erst einen Reiter suchen müssen.
  const zeigt = ansicht.ergebnis && bereich === "analyse" && ansicht.phase === "ergebnis"
    ? "ergebnisse"
    : bereich;

  return (
    <RadarCockpit
      firma={ansicht.companyName}
      eckdaten={ansicht.eckdaten}
      bereiche={bereiche}
      aktiverBereich={zeigt}
      onBereich={setBereich}
      phasen={ansicht.phasen}
      profil={ansicht.live}
      video={video}
      kopfzeile={kopfzeile}
      verbunden={verbunden}
      fuss={
        ansicht.closerName ? (
          <div className="flex items-center gap-2.5 px-1 py-1">
            <span className="w-7 h-7 rounded-full bg-[#0d1a2b] border border-[#17304d] flex items-center justify-center flex-shrink-0">
              <Users size={12} className="text-[#4a5f7d]" />
            </span>
            <div className="min-w-0">
              <p className="text-[#5b6b7f] text-[10px] uppercase tracking-wider leading-tight">
                Ihr Berater
              </p>
              <p className="text-[#c9d4e4] text-[11.5px] truncate leading-tight">
                {ansicht.closerName}
              </p>
            </div>
          </div>
        ) : null
      }
    >
      {fehler && (
        <div className="mb-4 rounded-xl border border-[#f59e0b]/25 bg-[rgba(245,158,11,0.06)] px-4 py-2.5">
          <p className="text-[#fbbf24] text-[12px]">{fehler}</p>
        </div>
      )}

      {zeigt === "ergebnisse" && ansicht.ergebnis ? (
        <Ergebnisbericht ergebnis={ansicht.ergebnis} companyName={ansicht.companyName} />
      ) : zeigt === "angaben" ? (
        <Angaben
          ansicht={ansicht}
          sendet={sendet}
          onAntwort={(frageKey, optionKeys) =>
            void schreiben({ aktion: "antwort", frageKey, optionKeys }, frageKey)
          }
        />
      ) : ansicht.phase === "ergebnis" ? (
        <Warten text="Ihr Berater stellt gerade die Auswertung zusammen." />
      ) : ansicht.phase === "profil" ? (
        <Profilteil
          ansicht={ansicht}
          sendet={sendet}
          onFokus={(an) => (tippt.current = an)}
          onSpeichern={(profil) => void schreiben({ aktion: "profil", profil }, "profil")}
        />
      ) : ansicht.spotlightAuswahl ? (
        <Warten text="Sie wählen gleich gemeinsam einen Ablauf aus, den wir uns genauer ansehen." />
      ) : ansicht.frage ? (
        <div className="max-w-[760px]">
          <Fragekarte
            frage={ansicht.frage}
            gewaehlt={ansicht.antworten[ansicht.frage.key] ?? []}
            disabled={sendet === ansicht.frage.key}
            onWaehlen={(optionKeys) =>
              void schreiben(
                { aktion: "antwort", frageKey: ansicht.frage!.key, optionKeys },
                ansicht.frage!.key
              )
            }
          />
          <Fussleiste
            ansicht={ansicht}
            sendet={sendet}
            onBlaettern={(richtung) => void schreiben({ aktion: richtung }, richtung)}
          />
        </div>
      ) : (
        <Warten text="Einen Moment — Ihr Berater öffnet die nächste Frage." />
      )}
    </RadarCockpit>
  );
}

/**
 * Blättern und Fortschritt.
 *
 * Der Interessent darf mitblättern, nicht nur zusehen: Es ist seine Analyse,
 * und ein Knopf, der nur beim Berater liegt, macht aus dem gemeinsamen
 * Gespräch eine Vorführung. Weiter geht erst, wenn die Frage beantwortet ist —
 * sonst entsteht am Ende eine Lücke, die niemandem aufgefallen ist.
 */
function Fussleiste({
  ansicht,
  sendet,
  onBlaettern,
}: {
  ansicht: RadarKundenAnsicht;
  sendet: string | null;
  onBlaettern: (richtung: "zurueck" | "weiter") => void;
}) {
  const beantwortet = Boolean(ansicht.frage && ansicht.antworten[ansicht.frage.key]?.length);
  const laeuft = sendet === "weiter" || sendet === "zurueck";

  return (
    <div className="mt-7 pt-5 border-t border-[#101d31] flex items-center gap-4">
      <button
        onClick={() => onBlaettern("zurueck")}
        disabled={laeuft}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#17304d] text-[#8899b4] text-[12.5px] font-medium hover:text-[#eef2f7] hover:border-[#24415f] transition-colors disabled:opacity-40"
      >
        <ArrowLeft size={14} /> Zurück
      </button>

      <div className="flex-1 min-w-0">
        <p className="text-[#5b6b7f] text-[11.5px] text-center mb-1.5">
          {ansicht.fortschritt.beantwortet} von {ansicht.fortschritt.gesamt} Fragen
        </p>
        <div className="h-1 rounded-full bg-[#101d31] overflow-hidden">
          <div
            className="h-full rounded-full bg-[#00b8ff] transition-[width] duration-500 ease-out"
            style={{ width: `${ansicht.fortschritt.prozent}%` }}
          />
        </div>
      </div>

      <button
        onClick={() => onBlaettern("weiter")}
        disabled={laeuft || !beantwortet}
        title={beantwortet ? undefined : "Bitte zuerst eine Antwort wählen"}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#00b8ff] text-[#041018] text-[12.5px] font-bold transition-all hover:shadow-[0_6px_22px_-8px_rgba(0,184,255,0.8)] disabled:bg-[#13243c] disabled:text-[#44546b] disabled:shadow-none"
      >
        {laeuft ? <Loader2 size={14} className="animate-spin" /> : null}
        Weiter <ArrowRight size={14} />
      </button>
    </div>
  );
}

function Warten({ text }: { text: string }) {
  return (
    <div className="h-full min-h-[220px] flex flex-col items-center justify-center gap-3 text-center">
      <Loader2 size={20} className="text-[#2a3a55] animate-spin" />
      <p className="text-[#8899b4] text-[13px] max-w-xs">{text}</p>
    </div>
  );
}

/**
 * Phase 1 beim Interessenten.
 *
 * Vorbelegtes aus dem CRM steht schon da und ist änderbar — niemand soll
 * tippen, was wir bereits wissen. Gespeichert wird beim Verlassen des Feldes,
 * nicht bei jedem Tastendruck.
 */
function Profilteil({
  ansicht,
  sendet,
  onFokus,
  onSpeichern,
}: {
  ansicht: RadarKundenAnsicht;
  sendet: string | null;
  onFokus: (an: boolean) => void;
  onSpeichern: (profil: Record<string, string | string[]>) => void;
}) {
  const [entwurf, setEntwurf] = useState<Record<string, string | string[]>>(() =>
    Object.fromEntries(
      ansicht.profilFelder.map((f) => [f.key, f.wert ?? (f.art === "mehrfach" ? [] : "")])
    )
  );

  // Der Berater trägt mit ein — seinen Stand übernehmen, solange hier nicht
  // getippt wird. Der zuletzt gesehene Stand liegt im Zustand und nicht in
  // einem Ref, weil ein während des Renderns gelesener Ref einen Durchlauf
  // verschlucken kann.
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
    <div className="max-w-[760px] space-y-5">
      <div>
        <p className="text-[#44546b] text-[10.5px] uppercase tracking-[0.18em] font-semibold mb-2.5">
          Phase 1 · Unternehmensprofil
        </p>
        <h3 className="text-[#f4f8fd] text-[24px] sm:text-[28px] font-bold tracking-tight leading-tight">
          Kurz zu <span className="text-[#00b8ff]">Ihrem Unternehmen</span>
        </h3>
        <p className="text-[#8899b4] text-[13px] mt-2 leading-relaxed">
          Was wir schon haben, steht bereits da. Bitte ergänzen oder korrigieren Sie, was nicht
          passt.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {ansicht.profilFelder.map((feld) => {
          const wert = entwurf[feld.key];
          const voll =
            feld.art === "mehrfach" || feld.key === "herausforderung" || feld.key === "ziel";
          return (
            <div key={feld.key} className={voll ? "sm:col-span-2" : ""}>
              <p className="text-[#5b6b7f] text-[10.5px] uppercase tracking-[0.14em] mb-2">
                {feld.label}
              </p>
              {feld.art === "text" ? (
                <input
                  value={typeof wert === "string" ? wert : ""}
                  onChange={(e) => setEntwurf({ ...entwurf, [feld.key]: e.target.value })}
                  onFocus={() => onFokus(true)}
                  onBlur={() => {
                    onFokus(false);
                    onSpeichern(entwurf);
                  }}
                  disabled={sendet === "profil"}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0a1322] border border-[#14263e] text-[#eef2f7] text-[13.5px] outline-none focus:border-[#00b8ff]/60 focus:bg-[#0c1828] transition-colors"
                />
              ) : (
                <div className="flex flex-wrap gap-2">
                  {(feld.optionen ?? []).map((o) => {
                    const an =
                      feld.art === "mehrfach"
                        ? Array.isArray(wert) && wert.includes(o.key)
                        : wert === o.key;
                    return (
                      <button
                        key={o.key}
                        type="button"
                        onClick={() =>
                          speichern(
                            feld.art === "mehrfach"
                              ? {
                                  ...entwurf,
                                  [feld.key]: an
                                    ? (wert as string[]).filter((k) => k !== o.key)
                                    : [...(Array.isArray(wert) ? wert : []), o.key],
                                }
                              : { ...entwurf, [feld.key]: o.key }
                          )
                        }
                        className={`px-3 py-2 rounded-xl border text-[12.5px] transition-all duration-150 ${
                          an
                            ? "border-[#00b8ff]/60 bg-[rgba(0,184,255,0.1)] text-[#00b8ff]"
                            : "border-[#14263e] bg-[#0a1322] text-[#8899b4] hover:border-[#24415f] hover:text-[#c9d4e4]"
                        }`}
                      >
                        {o.label}
                      </button>
                    );
                  })}
                </div>
              )}
              {feld.hinweis && (
                <p className="text-[#44546b] text-[11px] mt-1.5 leading-snug">{feld.hinweis}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * „Ihre Angaben“ — eine bereits gegebene Antwort nachträglich ändern.
 *
 * Der Interessent wählt sie an ihrem Wortlaut aus, nicht an einem Schlüssel,
 * und beantwortet sie direkt neu. Die gemeinsame Ansicht springt dabei nicht.
 */
function Angaben({
  ansicht,
  sendet,
  onAntwort,
}: {
  ansicht: RadarKundenAnsicht;
  sendet: string | null;
  onAntwort: (frageKey: string, optionKeys: string[]) => void;
}) {
  const [offen, setOffen] = useState<string | null>(null);
  const gewaehlteFrage = ansicht.beantworteteFragen.find((f) => f.key === offen) ?? null;

  if (gewaehlteFrage) {
    return (
      <div className="max-w-[760px] space-y-4">
        <button
          onClick={() => setOffen(null)}
          className="flex items-center gap-1.5 text-[#8899b4] text-[12px] hover:text-[#00b8ff] transition-colors"
        >
          <ArrowLeft size={13} /> Zur Übersicht
        </button>
        <Fragekarte
          frage={gewaehlteFrage}
          gewaehlt={ansicht.antworten[gewaehlteFrage.key] ?? []}
          disabled={sendet === gewaehlteFrage.key}
          onWaehlen={(keys) => onAntwort(gewaehlteFrage.key, keys)}
        />
      </div>
    );
  }

  return (
    <div className="max-w-[760px] space-y-4">
      <div>
        <h3 className="text-[#f4f8fd] text-[22px] font-bold tracking-tight">Ihre Angaben</h3>
        <p className="text-[#8899b4] text-[13px] mt-1.5">
          Alles, was Sie bisher gesagt haben. Tippen Sie auf eine Angabe, um sie zu ändern.
        </p>
      </div>
      <div className="space-y-2">
        {ansicht.beantworteteFragen.map((f) => {
          const gewaehlt = ansicht.antworten[f.key] ?? [];
          const texte = f.optionen.filter((o) => gewaehlt.includes(o.key)).map((o) => o.label);
          return (
            <button
              key={f.key}
              onClick={() => setOffen(f.key)}
              className="w-full text-left px-4 py-3 rounded-xl border border-[#14263e] bg-[#0a1322] hover:border-[#24415f] hover:bg-[#0d1828] transition-colors"
            >
              <span className="block text-[#8899b4] text-[11.5px] leading-snug">{f.frage}</span>
              <span className="block text-[#eef2f7] text-[13px] font-medium mt-1 leading-snug">
                {texte.join(" · ") || "—"}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
