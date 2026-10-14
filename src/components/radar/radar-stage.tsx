"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  FileText,
  Loader2,
  Radar as RadarIcon,
} from "lucide-react";
import { beiStups, stupseGegenseite } from "@/lib/radar/kanal";
import type { RadarKundenAnsicht } from "@/lib/radar/views";
import { FrageErgaenzung, SoftwareFeld, SonstigesFeld } from "./freitext";
import { RadarCockpit, type CockpitBereich } from "./cockpit";
import { PhasenSchnitt } from "./phasen-schnitt";
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
/** Nach so langer Zeit gilt eine Anfrage als verloren, nicht als langsam. */
const ZEITLIMIT_MS = 12_000;
/** So lange nach dem letzten Tastendruck bleibt ein Feld vor Überschreiben sicher. */
const TIPP_SCHONFRIST_MS = 8_000;

type Props = {
  token: string;
  initial: RadarKundenAnsicht | null;
  /** Die beiden Videokacheln aus dem laufenden Gespräch. */
  video?: React.ReactNode;
  /** Mikrofon, Kamera, Verlassen. */
  videoSteuerung?: React.ReactNode;
  /** Was an der Stelle der Kacheln steht, solange das Gespräch nicht läuft. */
  videoHinweis?: React.ReactNode;
  teilnehmer?: number | null;
};

export function RadarStage({
  token,
  initial,
  video,
  videoSteuerung,
  videoHinweis,
  teilnehmer,
}: Props) {
  const [ansicht, setAnsicht] = useState<RadarKundenAnsicht | null>(initial);
  // Ob überhaupt schon eine Antwort vom Server da war. Ohne diese
  // Unterscheidung behauptet die Oberfläche beim ersten Aufbau „Die Analyse
  // ist nicht geöffnet“ — obwohl sie es schlicht noch nicht weiß.
  const [geladen, setGeladen] = useState(initial !== null);
  const [verbunden, setVerbunden] = useState(true);
  const [sendet, setSendet] = useState<string | null>(null);
  const [bereich, setBereich] = useState("analyse");
  const [fehler, setFehler] = useState<string | null>(null);
  /*
    Die eben angetippte Antwort, bevor der Server sie bestätigt hat.

    Vorher erschien die Auswahl erst mit der Serverantwort. Auf einer
    langsamen Leitung sah ein Klick damit aus wie nichts — und wer glaubt, der
    Klick sei nicht angekommen, klickt weiter oder gibt auf. Der Entwurf wird
    verworfen, sobald ein Serverstand da ist; er überschreibt also nie etwas.
  */
  const [entwurf, setEntwurf] = useState<{ frageKey: string; optionKeys: string[] } | null>(null);
  // Die Laufzeit tickt im Sekundentakt — sie kommt nicht vom Server, sondern
  // wird aus dem Startzeitpunkt gerechnet. Ein Zähler, der im Abfragetakt
  // springt, sieht kaputt aus.
  const [jetzt, setJetzt] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setJetzt(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  /*
    Während getippt wird, darf ein Abfragetakt das Feld nicht überschreiben.

    Als bloße Flagge war das gefährlich: Wechselt der Berater die Phase,
    während ein Feld den Fokus hat, verschwindet das Formular ohne `blur` —
    die Flagge blieb stehen und die Kundenseite nahm **nie wieder** einen
    Serverstand an. Deshalb ein Zeitstempel: Nach ein paar Sekunden ohne
    Tastendruck zählt er nicht mehr.
  */
  const tipptBis = useRef(0);
  const tippt = () => Date.now() < tipptBis.current;

  const holen = useCallback(async () => {
    try {
      const res = await fetch(`/api/closing/radar?token=${encodeURIComponent(token)}`, {
        cache: "no-store",
        signal: AbortSignal.timeout(ZEITLIMIT_MS),
      });
      /*
        Ein abgelaufener oder neu ausgestellter Zugang hat vorher nichts
        gesagt: Der Abruf endete still, die Seite blieb auf dem letzten Stand
        stehen, und jeder Klick lief ins Leere. Wer das erlebt, hält die
        Oberfläche für kaputt — zu Recht.
      */
      if (res.status === 401) {
        setVerbunden(false);
        setFehler(
          "Ihr Zugangslink ist nicht mehr gültig. Bitte fragen Sie Ihren Berater nach einem neuen Link."
        );
        return;
      }
      if (!res.ok) return;
      const data = (await res.json()) as { radar: RadarKundenAnsicht | null };
      setVerbunden(true);
      setGeladen(true);
      if (tippt()) return;
      setAnsicht(data.radar);
      /*
        Der Entwurf fällt erst, wenn der Server ihn eingeholt hat.

        Fiele er bei jedem Takt, könnte ein Abruf, der zwischen Klick und
        Serverantwort zurückkommt, die eben angetippte Antwort wieder
        abwählen — ein Flackern, das wie ein verlorener Klick aussieht.
      */
      setEntwurf((e) => {
        if (!e) return null;
        const beantwortet = (data.radar?.antworten[e.frageKey] ?? []).length > 0;
        const andereFrage = data.radar?.frage?.key !== e.frageKey;
        return beantwortet || andereFrage ? null : e;
      });
    } catch {
      // Ein Aussetzer ist kein Datenverlust — der nächste Takt holt nach.
      setVerbunden(false);
    }
  }, [token]);

  useEffect(() => {
    const takt = ansicht?.abgeschlossen ? TAKT_LANGSAM_MS : TAKT_MS;
    /*
      Der erste Abruf läuft sofort los, nicht erst nach einem Takt — sonst
      stünde beim Wechsel ins Radar bis zu zweieinhalb Sekunden ein
      Ladezeichen. Über einen Timer und nicht direkt, damit das Setzen des
      Zustands nicht im Renderpfad des Effekts landet.
    */
    const sofort = setTimeout(holen, 0);
    const id = setInterval(holen, takt);
    return () => {
      clearTimeout(sofort);
      clearInterval(id);
    };
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
          /*
            Ohne Zeitlimit kann eine hängende Anfrage die Oberfläche dauerhaft
            sperren: `sendet` bliebe gesetzt, die Antwortkacheln blieben
            inaktiv, und nichts erklärte, warum. Lieber nach zwölf Sekunden
            ein sichtbarer Fehler als ein stummes Gerät.
          */
          signal: AbortSignal.timeout(ZEITLIMIT_MS),
        });
        const data = (await res.json()) as { radar?: RadarKundenAnsicht; error?: string };
        if (!res.ok) {
          setFehler(data.error ?? "Die Eingabe konnte nicht gespeichert werden.");
          setEntwurf(null);
          await holen();
          return;
        }
        setVerbunden(true);
        if (data.radar) setAnsicht(data.radar);
        setEntwurf(null);
        stupseGegenseite();
      } catch {
        setFehler(
          "Die Verbindung hat zu lange gebraucht. Ihre Eingabe wurde noch nicht gespeichert — bitte noch einmal tippen."
        );
        setEntwurf(null);
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
      <div className="h-full flex flex-col items-center justify-center gap-3 text-center px-6 bg-[#04070d]">
        {geladen ? (
          <>
            <RadarIcon size={26} className="text-[#2a3a55]" />
            <p className="text-[#8899b4] text-sm">Die Analyse ist gerade nicht geöffnet.</p>
          </>
        ) : (
          <>
            <Loader2 size={22} className="text-[#2a3a55] animate-spin" />
            <p className="text-[#44546b] text-[13px]">Analyse wird geladen…</p>
          </>
        )}
      </div>
    );
  }

  // Sobald das Ergebnis freigegeben ist, springt die Ansicht von selbst dorthin —
  // im Gespräch soll niemand erst einen Reiter suchen müssen.
  const zeigt = ansicht.ergebnis && bereich === "analyse" && ansicht.phase === "ergebnis"
    ? "ergebnisse"
    : bereich;

  /*
    Die Kapitelansage beim Phasenwechsel.

    Nur für die drei Arbeitsphasen: Den Sprung in die Auswertung kündigt der
    große Moduswechsel an (`ModusUebergang`), und zwei Vorhänge hintereinander
    wären einer zu viel.
  */
  const phasenAnsage =
    ansicht.phase === "ergebnis" ? null : ansicht.phasen.find((p) => p.aktiv) ?? null;

  return (
    <RadarCockpit
      firma={ansicht.companyName}
      eckdaten={ansicht.eckdaten}
      bereiche={bereiche}
      aktiverBereich={zeigt}
      onBereich={setBereich}
      phasen={ansicht.phasen}
      profil={ansicht.live}
      ruhig={ansicht.abgeschlossen || zeigt === "ergebnisse"}
      video={video}
      videoSteuerung={videoSteuerung}
      videoHinweis={videoHinweis}
      laufzeitSekunden={Math.max(
        0,
        Math.floor((jetzt - new Date(ansicht.gestartetAm).getTime()) / 1000)
      )}
      teilnehmer={teilnehmer ?? null}
      verbunden={verbunden}
      beraterName={ansicht.closerName}
    >
      <PhasenSchnitt phase={phasenAnsage} />

      {fehler && (
        <div className="flex-shrink-0 mb-4 rounded-xl border border-[#f59e0b]/25 bg-[rgba(245,158,11,0.06)] px-4 py-2.5">
          <p className="text-[#fbbf24] text-[12px]">{fehler}</p>
        </div>
      )}

      {zeigt === "ergebnisse" && ansicht.ergebnis ? (
        <div className="lg:flex-1 lg:min-h-0 lg:overflow-y-auto">
          <Ergebnisbericht ergebnis={ansicht.ergebnis} companyName={ansicht.companyName} />
        </div>
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
          onFokus={(an) => {
            tipptBis.current = an ? Date.now() + TIPP_SCHONFRIST_MS : 0;
          }}
          onSpeichern={(profil) => void schreiben({ aktion: "profil", profil }, "profil")}
          onFreitext={(bezug, text) =>
            void schreiben({ aktion: "freitext", bezug, text }, `freitext:${bezug}`)
          }
        />
      ) : ansicht.spotlightAuswahl ? (
        <Warten text="Sie wählen gleich gemeinsam einen Ablauf aus, den wir uns genauer ansehen." />
      ) : ansicht.frage ? (
        <div className="w-full lg:flex-1 lg:min-h-0 lg:flex lg:flex-col">
          {/* Nur die Frage läuft, wenn sie zu hoch wird — die Leiste bleibt stehen. */}
          <div className="lg:flex-1 lg:min-h-0 lg:overflow-y-auto lg:flex lg:flex-col">
          {/*
            Mittig über `my-auto`, nicht über `justify-center`: Zentriert man
            mit `justify-center` und der Inhalt ist höher als der Platz, wird
            oben abgeschnitten — und zwar unerreichbar, der Bildlauf kommt dort
            nicht mehr hin. Genau oben steht die Frage.
          */}
          <div className="w-full lg:my-auto">
          <Fragekarte
            frage={ansicht.frage}
            gewaehlt={
              entwurf?.frageKey === ansicht.frage.key
                ? entwurf.optionKeys
                : ansicht.antworten[ansicht.frage.key] ?? []
            }
            onWaehlen={(optionKeys) => {
              // Erst zeigen, dann senden.
              setEntwurf({ frageKey: ansicht.frage!.key, optionKeys });
              void schreiben(
                { aktion: "antwort", frageKey: ansicht.frage!.key, optionKeys },
                ansicht.frage!.key
              );
            }}
          />
          </div>
            <div className="mt-5">
              <FrageErgaenzung
                merkmal={`frage:${ansicht.frage.key}`}
                wert={ansicht.freitexte[`frage:${ansicht.frage.key}`] ?? ""}
                onSpeichern={(text) =>
                  void schreiben(
                    { aktion: "freitext", bezug: `frage:${ansicht.frage!.key}`, text },
                    `freitext:${ansicht.frage!.key}`
                  )
                }
              />
            </div>
          </div>
          <Fussleiste
            ansicht={ansicht}
            sendet={sendet}
            entwurfOffen={
              (entwurf?.frageKey === ansicht.frage.key && entwurf.optionKeys.length > 0) ||
              Boolean(ansicht.freitexte[`frage:${ansicht.frage.key}`])
            }
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
  entwurfOffen,
  onBlaettern,
}: {
  ansicht: RadarKundenAnsicht;
  sendet: string | null;
  /** Eine eben angetippte Antwort, die der Server noch bestätigt. */
  entwurfOffen?: boolean;
  onBlaettern: (richtung: "zurueck" | "weiter") => void;
}) {
  const beantwortet =
    entwurfOffen || Boolean(ansicht.frage && ansicht.antworten[ansicht.frage.key]?.length);
  const laeuft = sendet === "weiter" || sendet === "zurueck";

  return (
    <div className="flex-shrink-0 mt-7 pt-5 border-t border-[#101d31] flex items-center gap-4">
      <button
        onClick={() => onBlaettern("zurueck")}
        disabled={laeuft}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#17304d] text-[#8899b4] text-[12.5px] font-medium hover:text-[#eef2f7] hover:border-[#24415f] transition-colors disabled:opacity-40"
      >
        <ArrowLeft size={14} /> Zurück
      </button>

      <div className="flex-1 min-w-0">
        <p className="font-mono text-[#4a6383] text-[10px] uppercase tracking-[0.16em] text-center mb-2 tabular-nums">
          {ansicht.fortschritt.beantwortet} von {ansicht.fortschritt.gesamt} Fragen
        </p>
        <div className="relative h-1 rounded-full bg-[#101d31]">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-[linear-gradient(90deg,#0082c8,#00b8ff_60%,#2ee6c5)] transition-[width] duration-500 ease-out"
            style={{ width: `${ansicht.fortschritt.prozent}%` }}
          />
          {/* Der Lichtpunkt an der Spitze — er atmet, statt zu blinken. */}
          {ansicht.fortschritt.prozent > 0 && ansicht.fortschritt.prozent < 100 && (
            <span
              aria-hidden
              className="radar-puls absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-[#2ee6c5] shadow-[0_0_10px_2px_rgba(46,230,197,0.65)] transition-[left] duration-500 ease-out"
              style={{ left: `${ansicht.fortschritt.prozent}%` }}
            />
          )}
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
  onFreitext,
}: {
  ansicht: RadarKundenAnsicht;
  sendet: string | null;
  onFokus: (an: boolean) => void;
  onSpeichern: (profil: Record<string, string | string[]>) => void;
  onFreitext: (bezug: string, text: string) => void;
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
    <div className="w-full space-y-6 lg:flex-1 lg:min-h-0 lg:overflow-y-auto">
      <div>
        <p className="font-mono text-[#3d5c7e] text-[10px] uppercase tracking-[0.2em] font-semibold mb-3">
          Phase 01 · Unternehmensprofil
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
              <p className="font-mono text-[#3d5c7e] text-[9.5px] uppercase tracking-[0.16em] mb-2">
                {feld.label}
              </p>
              {feld.art === "software" ? (
                <SoftwareFeld
                  werte={Array.isArray(wert) ? wert : wert ? [String(wert)] : []}
                  zwecke={Object.fromEntries(
                    Object.entries(ansicht.freitexte)
                      .filter(([k]) => k.startsWith("software:"))
                      .map(([k, v]) => [k.slice("software:".length), v])
                  )}
                  disabled={sendet === "profil"}
                  onWerte={(werte) => speichern({ ...entwurf, [feld.key]: werte })}
                  onZweck={(name, zweck) => onFreitext(`software:${name}`, zweck)}
                />
              ) : feld.art === "text" ? (
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
                  {feld.sonstiges && (
                    <div className="w-full">
                      <SonstigesFeld
                        merkmal={`profil:${feld.key}`}
                        label={feld.sonstiges.label}
                        platzhalter={feld.sonstiges.platzhalter}
                        wert={ansicht.freitexte[`profil:${feld.key}`] ?? ""}
                        disabled={sendet === "profil"}
                        onSpeichern={(text) => onFreitext(`profil:${feld.key}`, text)}
                      />
                    </div>
                  )}
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
      <div className="w-full space-y-4 lg:flex-1 lg:min-h-0 lg:overflow-y-auto">
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
    <div className="w-full space-y-4 lg:flex-1 lg:min-h-0 lg:overflow-y-auto">
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
