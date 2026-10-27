"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useDaily, useDailyEvent } from "@daily-co/daily-react";
import { ArrowLeft, Ear, EarOff, FileText, Loader2, PenLine, Radio, Target } from "lucide-react";
import { OkunCall } from "@/components/closing/okun-call";

/**
 * Die Besprechung — ein ganz normales Videogespräch, nur in unserem Haus.
 *
 * Kein Haus, kein Leitfaden, kein Angebot: Links das Gespräch, rechts der
 * Beistand. Er kennt das Ziel, hört mit und sagt in jedem Takt, wo das
 * Gespräch gerade steht. Hinweise kommen dazu, wenn es etwas zu sagen gibt.
 * Darunter füllt sich das Protokoll, während geredet wird — man sieht, dass
 * mitgeschrieben wird, statt es hinterher zu hoffen.
 */

const TAKT_MS = 20_000;

/** Jeder dritte Takt bringt das Protokoll auf den Stand — also jede Minute. */
const PROTOKOLL_JE_TAKTE = 3;

type Hinweis = { art: string; text: string };
type Eintrag = { art: string; text: string; zeit: string };

const ART: Record<string, { label: string; farbe: string; rahmen: string }> = {
  lage: { label: "gerade", farbe: "#5b6b7f", rahmen: "rgba(91,107,127,.25)" },
  frage: { label: "fragen", farbe: "#00b8ff", rahmen: "rgba(0,184,255,.3)" },
  achtung: { label: "achtung", farbe: "#f5a524", rahmen: "rgba(245,165,36,.35)" },
  notiz: { label: "notieren", farbe: "#2ee6c5", rahmen: "rgba(46,230,197,.3)" },
};

function jetzt(): string {
  return new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
}

export function BesprechungsRaum({
  terminId,
  titel,
  firma,
  raumUrl,
  ticket,
  beraterName,
  ziel,
  vorbereitung,
  mitschrift,
  protokoll,
  zurueckLink,
}: {
  terminId: string;
  titel: string;
  firma: string;
  raumUrl: string;
  /** Ohne Ticket kein Mithören — der Rest läuft trotzdem. */
  ticket: string | null;
  beraterName: string;
  ziel: string | null;
  vorbereitung: string | null;
  mitschrift: string;
  /** Was bisher im Protokoll steht — der Stand beim Betreten. */
  protokoll: string | null;
  zurueckLink: string;
}) {
  return (
    <div className="fixed inset-0 z-[120] bg-[#04080f]">
      <OkunCall
        roomUrl={raumUrl}
        meetingToken={ticket ?? undefined}
        userName={beraterName}
        role="advisor"
        slide={null}
        onLeave={() => {
          window.location.href = zurueckLink;
        }}
        stageLayout={({ kacheln, steuerung, teilnehmer }) => (
          <div className="h-full flex">
            <div className="flex-1 min-w-0 flex flex-col bg-[#02040a]">
              <div className="px-5 py-3 border-b border-[#0f1d2f] flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#3f5572]">
                    Besprechung · {firma}
                  </p>
                  <h1 className="text-[#f0f0f0] text-sm font-semibold truncate">{titel}</h1>
                </div>
                <Link
                  href={zurueckLink}
                  className="flex items-center gap-1.5 text-[#5b6b7f] hover:text-[#c9d4e4] text-xs transition-colors flex-shrink-0"
                >
                  <ArrowLeft size={13} /> Zum Termin
                </Link>
              </div>

              <div className="flex-1 min-h-0 p-4 overflow-y-auto">{kacheln}</div>
              <div className="px-4 py-3 border-t border-[#0f1d2f]">{steuerung}</div>
            </div>

            <Beistand
              terminId={terminId}
              ziel={ziel}
              vorbereitung={vorbereitung}
              mitschrift={mitschrift}
              mithoerenMoeglich={Boolean(ticket)}
              teilnehmer={teilnehmer}
              protokollStand={protokoll}
            />
          </div>
        )}
      />
    </div>
  );
}

function Beistand({
  terminId,
  ziel,
  vorbereitung,
  mitschrift,
  mithoerenMoeglich,
  teilnehmer,
  protokollStand,
}: {
  terminId: string;
  ziel: string | null;
  vorbereitung: string | null;
  mitschrift: string;
  mithoerenMoeglich: boolean;
  teilnehmer: number;
  protokollStand: string | null;
}) {
  const daily = useDaily();
  const [hoert, setzeHoert] = useState(false);
  const [mitlauf, setzeMitlauf] = useState<Eintrag[]>([]);
  const [protokoll, setzeProtokoll] = useState<string | null>(protokollStand);
  const [protokollLaeuft, setzeProtokollLaeuft] = useState(false);
  const [notizen, setzeNotizen] = useState(mitschrift);
  const [arbeitet, setzeArbeitet] = useState(false);
  const [fehler, setzeFehler] = useState<string | null>(null);

  /*
    Das Mitgehörte sammelt sich im Ref, nicht im Zustand.

    Jedes gesprochene Wort löst sonst ein Neuzeichnen aus — mitten in einem
    Videogespräch die teuerste Art, nichts zu gewinnen. Gebraucht wird es
    nur alle zwanzig Sekunden, wenn der Takt es abholt.
  */
  const gesammelt = useRef<string[]>([]);
  const gesagteHinweise = useRef<string[]>([]);
  const bisherigeLage = useRef<string[]>([]);
  const taktNummer = useRef(0);
  /*
    Die Notizen auch im Ref — der Takt läuft in einem Intervall und sähe
    sonst immer den Stand von vor zwanzig Sekunden. Geschrieben wird im
    Effekt, nicht beim Zeichnen: Ein Ref ist kein Zustand.
  */
  const notizenRef = useRef(mitschrift);
  useEffect(() => {
    notizenRef.current = notizen;
  }, [notizen]);

  useDailyEvent(
    "transcription-message",
    useCallback((ereignis: { text?: string }) => {
      const text = ereignis?.text?.trim();
      if (text) gesammelt.current.push(text);
    }, [])
  );

  useDailyEvent(
    "transcription-started",
    useCallback(() => setzeHoert(true), [])
  );
  useDailyEvent(
    "transcription-stopped",
    useCallback(() => setzeHoert(false), [])
  );
  useDailyEvent(
    "transcription-error",
    useCallback((ereignis: { errorMsg?: string }) => {
      setzeHoert(false);
      /*
        Die häufigste Ursache zuerst, und zwar als Anleitung.

        Daily gibt die Transkription nur frei, wenn im Konto eine
        Zahlungsmethode hinterlegt ist — kein Abonnement, keine Laufzeit,
        nur eine Karte. Vorher kommt hier immer ein Fehler, und die
        Meldung von Daily sagt das nicht. Wer den Grund nicht kennt, sucht
        ihn in den falschen Einstellungen.
      */
      const vonDaily = ereignis?.errorMsg?.trim();
      setzeFehler(
        "Daily lässt das Mithören nicht zu. In aller Regel fehlt im Daily-Konto " +
          "eine Zahlungsmethode — die Transkription gibt es nur mit hinterlegter " +
          "Karte (dashboard.daily.co/billing). Kein Abonnement, Abrechnung nach " +
          "Verbrauch." +
          (vonDaily ? ` Daily meldet: ${vonDaily}` : "")
      );
    }, [])
  );

  /**
   * Alle zwanzig Sekunden: sichern, kommentieren — und jede Minute das
   * Protokoll nachziehen.
   */
  const takt = useCallback(
    async (mitBeistand: boolean) => {
      const gesagt = gesammelt.current.join(" ").trim();
      gesammelt.current = [];

      taktNummer.current += 1;
      const protokollBitte =
        mitBeistand && taktNummer.current % PROTOKOLL_JE_TAKTE === 0;
      if (!gesagt && !mitBeistand) return;
      if (protokollBitte) setzeProtokollLaeuft(true);

      try {
        const antwort = await fetch(`/api/besprechung/${terminId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            gesagt,
            mitschrift: notizenRef.current,
            hinweisBitte: mitBeistand && gesagt.length > 0,
            protokollBitte,
            bereitsGesagt: gesagteHinweise.current,
            bisherigeLage: bisherigeLage.current,
          }),
        });
        if (!antwort.ok) return;
        const daten: { lage?: string | null; hinweise?: Hinweis[]; protokoll?: string } =
          await antwort.json();

        const neue: Eintrag[] = [];
        if (daten.lage) {
          bisherigeLage.current = [...bisherigeLage.current, daten.lage].slice(-6);
          neue.push({ art: "lage", text: daten.lage, zeit: jetzt() });
        }
        for (const h of daten.hinweise ?? []) {
          gesagteHinweise.current.push(h.text);
          neue.push({ art: h.art, text: h.text, zeit: jetzt() });
        }
        if (neue.length > 0) {
          // Neues oben: Wer mitten im Gespräch hinsieht, hat einen Blick frei.
          setzeMitlauf((bisher) => [...neue.reverse(), ...bisher].slice(0, 40));
        }
        if (daten.protokoll) setzeProtokoll(daten.protokoll);
      } catch {
        // Ein verlorener Takt ist kein Grund, das Gespräch zu stören.
      } finally {
        if (protokollBitte) setzeProtokollLaeuft(false);
      }
    },
    [terminId]
  );

  useEffect(() => {
    const id = setInterval(() => void takt(true), TAKT_MS);
    return () => {
      clearInterval(id);
      // Was noch im Puffer liegt, geht beim Verlassen trotzdem weg.
      void takt(false);
    };
  }, [takt]);

  async function mithoeren() {
    if (!daily) return;
    setzeFehler(null);
    setzeArbeitet(true);
    try {
      if (hoert) {
        daily.stopTranscription();
      } else {
        daily.startTranscription();
      }
    } catch {
      setzeFehler("Das Mithören ließ sich nicht starten.");
    } finally {
      setzeArbeitet(false);
    }
  }

  return (
    <aside className="w-[400px] flex-shrink-0 border-l border-[#0f1d2f] bg-[#060d18] flex flex-col min-h-0">
      {/* Ziel */}
      <div className="px-4 py-3 border-b border-[#0f1d2f]">
        <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#3f5572] flex items-center gap-1.5">
          <Target size={10} /> Ziel
        </p>
        <p className="mt-1.5 text-[12px] text-[#dce9f6] leading-relaxed">
          {ziel ?? "Kein Ziel festgelegt — ohne das kann hier niemand mitdenken."}
        </p>
      </div>

      {/* Mithören */}
      <div className="px-4 py-3 border-b border-[#0f1d2f]">
        {mithoerenMoeglich ? (
          <button
            onClick={() => void mithoeren()}
            disabled={arbeitet}
            className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-[11.5px] font-bold
              disabled:opacity-60 transition-colors ${
                hoert
                  ? "bg-[rgba(46,230,197,.12)] border border-[rgba(46,230,197,.35)] text-[#2ee6c5]"
                  : "bg-[#00b8ff] text-[#041018]"
              }`}
          >
            {arbeitet ? (
              <Loader2 size={12} className="animate-spin" />
            ) : hoert ? (
              <Ear size={12} />
            ) : (
              <EarOff size={12} />
            )}
            {hoert ? "Hört mit — beenden" : "Mithören starten"}
          </button>
        ) : (
          <p className="text-[#5b6b7f] text-[11px] leading-relaxed">
            Mithören steht nicht zur Verfügung — es kam kein Zutrittsticket zustande
            (<span className="font-mono">DAILY_API_KEY</span> prüfen). Die
            Stichpunkte unten tragen das Protokoll trotzdem.
          </p>
        )}
        {hoert && (
          <p className="mt-2 text-[#5b6b7f] text-[10px] leading-relaxed">
            Alle Teilnehmer sehen, dass transkribiert wird. {teilnehmer} im Raum.
          </p>
        )}
        {fehler && <p className="mt-2 text-[#f0504a] text-[10.5px] leading-relaxed">{fehler}</p>}
      </div>

      {/* Mitlauf: was gerade passiert, und was zu tun ist */}
      <div className="px-4 py-3 border-b border-[#0f1d2f] flex flex-col min-h-0 h-[34%]">
        <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#3f5572] flex items-center gap-1.5 flex-shrink-0">
          <Radio size={10} className={hoert ? "text-[#2ee6c5]" : undefined} /> Mitlauf
        </p>
        <div className="mt-2 flex-1 min-h-0 overflow-y-auto">
          {mitlauf.length === 0 ? (
            <p className="text-[#44546b] text-[11px] leading-relaxed">
              {hoert
                ? "Hört mit. Alle zwanzig Sekunden steht hier, wo das Gespräch steht."
                : vorbereitung
                  ? vorbereitung
                  : "Noch nichts. Mithören starten, dann läuft es hier mit."}
            </p>
          ) : (
            <ul className="space-y-2">
              {mitlauf.map((e, i) => {
                const art = ART[e.art] ?? ART.notiz;
                const istLage = e.art === "lage";
                return (
                  <li
                    key={`${e.zeit}-${e.text}-${i}`}
                    className="rounded-lg border px-3 py-2"
                    style={{
                      borderColor: art.rahmen,
                      background: istLage ? "transparent" : "rgba(255,255,255,.02)",
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className="font-mono text-[8.5px] uppercase tracking-[0.16em]"
                        style={{ color: art.farbe }}
                      >
                        {art.label}
                      </span>
                      <span className="font-mono text-[8.5px] text-[#2c3c52]">{e.zeit}</span>
                    </div>
                    <p
                      className={`mt-1 text-[12px] leading-snug ${
                        istLage ? "text-[#8da3bd]" : "text-[#dce9f6]"
                      }`}
                    >
                      {e.text}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Protokoll — füllt sich, während geredet wird */}
      <div className="px-4 py-3 border-b border-[#0f1d2f] flex flex-col min-h-0 flex-1">
        <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#3f5572] flex items-center justify-between gap-1.5 flex-shrink-0">
          <span className="flex items-center gap-1.5">
            <FileText size={10} /> Protokoll
          </span>
          {protokollLaeuft && <Loader2 size={10} className="animate-spin text-[#00b8ff]" />}
        </p>
        <div className="mt-2 flex-1 min-h-0 overflow-y-auto">
          {protokoll ? (
            <p className="text-[12px] text-[#c9d4e4] leading-relaxed whitespace-pre-wrap">
              {protokoll}
            </p>
          ) : (
            <p className="text-[#44546b] text-[11px] leading-relaxed">
              Entsteht während des Gesprächs — jede Minute neu aus dem, was gesagt
              und notiert wurde. Nach dem Gespräch wird es gegengelesen und erst
              dann freigegeben.
            </p>
          )}
        </div>
      </div>

      {/* Mitschrift */}
      <div className="px-4 py-3 flex flex-col flex-shrink-0">
        <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#3f5572] flex items-center gap-1.5">
          <PenLine size={10} /> Mitschrift
        </p>
        <textarea
          value={notizen}
          onChange={(e) => setzeNotizen(e.target.value)}
          rows={3}
          placeholder={"Ein Punkt je Zeile. Zählt im Protokoll mehr als alles Mitgehörte."}
          className="mt-2 w-full px-3 py-2 rounded-lg bg-[#04080f] border border-[#16263d]
            text-[#dce9f6] text-[12px] leading-relaxed placeholder-[#33465e] resize-none
            focus:outline-none focus:border-[rgba(0,184,255,.4)]"
        />
      </div>
    </aside>
  );
}
