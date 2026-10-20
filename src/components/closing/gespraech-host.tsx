"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { Maximize2, Minimize2, Square } from "lucide-react";
import { OkunCall, type CallSlide } from "./okun-call";

/**
 * Das Gesprächsfenster, das eine Seite überlebt.
 *
 * Vorher hing das laufende Gespräch im Arbeitsplatz des Closings. Wer von dort
 * zu den Kunden, in die Learning Library oder in die Einstellungen ging, flog
 * aus dem Raum — der Baum mit dem Gesprächsobjekt wurde abgebaut, und Daily
 * verlässt das Meeting. Im Gespräch ist das ein kleiner Skandal: Der
 * Interessent sitzt plötzlich allein da, weil sein Berater kurz etwas
 * nachschauen wollte.
 *
 * Deshalb lebt das Fenster jetzt im **Layout**. Layouts bleiben beim Wechsel
 * der Seite bestehen; das Gespräch endet erst, wenn jemand es beendet.
 *
 * Die Bedienung einer laufenden Präsentation meldet die jeweilige Seite an
 * (`setzeSteuerung`) und beim Verlassen wieder ab. Ohne sie läuft das Gespräch
 * weiter — nur eben ohne Blättern, bis man zurück ist. Das ist die richtige
 * Reihenfolge: lieber ein Gespräch ohne Folienschaltung als eine
 * Folienschaltung ohne Gespräch.
 */

export type GespraechsAnfrage = {
  raumUrl: string;
  name: string;
  /** Für die Anwesenheitsmeldung an die Kundenseite. */
  closingSessionId?: string;
  /** Was im Fensterkopf steht — meist der Firmenname. */
  titel?: string;
  /** Wohin „zum Arbeitsplatz" führt. */
  zurueckLink?: string;
};

export type GespraechsSteuerung = {
  slide: CallSlide | null;
  onPrev?: () => void;
  onNext?: () => void;
  canPrev?: boolean;
  canNext?: boolean;
  onStopPresentation?: () => void;
  onPageCount?: (n: number) => void;
  onRemoteChange?: () => void;
};

type Kontext = {
  aktiv: boolean;
  gespraech: GespraechsAnfrage | null;
  starten: (anfrage: GespraechsAnfrage) => void;
  beenden: () => void;
  setzeSteuerung: (steuerung: GespraechsSteuerung | null) => void;
};

const GespraechsKontext = createContext<Kontext | null>(null);

export function useGespraech(): Kontext {
  const kontext = useContext(GespraechsKontext);
  if (!kontext) {
    throw new Error("useGespraech braucht den GespraechsHost im Layout.");
  }
  return kontext;
}

/** Fenstergröße, auf die beim Start einer Präsentation aufgezogen wird. */
const PRAESENTATIONSGROESSE = { w: 820, h: 560 };

/**
 * Hält das Gesprächsfenster im Sichtbaren.
 *
 * Verschoben werden darf es überall hin — aber nie so weit, dass die
 * Titelleiste und damit der Griff zum Zurückholen verschwindet.
 */
function imBild(pos: { x: number; y: number }, groesse: { w: number; h: number }) {
  if (typeof window === "undefined") return pos;
  const RAND = 8;
  const SICHTBAR = 200;
  return {
    x: Math.min(
      Math.max(pos.x, SICHTBAR - groesse.w),
      Math.max(window.innerWidth - SICHTBAR, RAND)
    ),
    y: Math.min(Math.max(pos.y, RAND), Math.max(window.innerHeight - 48, RAND)),
  };
}

export function GespraechsHost({ children }: { children: React.ReactNode }) {
  const [gespraech, setGespraech] = useState<GespraechsAnfrage | null>(null);
  const [steuerung, setSteuerungIntern] = useState<GespraechsSteuerung | null>(null);
  const [gross, setGross] = useState(false);

  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [groesse, setGroesse] = useState({ w: 420, h: 300 });
  const platziert = useRef(false);
  const zieht = useRef(false);
  const skaliert = useRef(false);
  const zugStart = useRef({ mx: 0, my: 0, x: 0, y: 0, w: 0, h: 0 });
  const skalaStart = useRef({ mx: 0, my: 0, w: 0, h: 0 });

  const starten = useCallback((anfrage: GespraechsAnfrage) => {
    setGespraech(anfrage);
    if (!platziert.current && typeof window !== "undefined") {
      setPos({ x: Math.max(20, window.innerWidth - 460), y: 108 });
      platziert.current = true;
    }
  }, []);

  const beenden = useCallback(() => {
    setGespraech(null);
    setSteuerungIntern(null);
    setGross(false);
  }, []);

  const setzeSteuerung = useCallback((neu: GespraechsSteuerung | null) => {
    setSteuerungIntern(neu);
    // Beim ersten Mal, dass eine Folie läuft, Platz schaffen — danach
    // entscheidet der Berater über die Größe.
    if (neu?.slide && !folieGesehen.current) {
      folieGesehen.current = true;
      setGroesse((bisher) =>
        bisher.w < PRAESENTATIONSGROESSE.w ? PRAESENTATIONSGROESSE : bisher
      );
    }
    if (!neu?.slide) folieGesehen.current = false;
  }, []);

  /*
    Eine startende Präsentation braucht Platz.

    Entschieden wird das beim Anmelden der Steuerung und nicht in einem
    Effekt: Ein Effekt, der beim Rendern Zustand setzt, löst eine zweite
    Renderrunde aus — bei einem Fenster, das gerade aufgezogen wird, sieht
    man das als Ruckeln.
  */
  const folieGesehen = useRef(false);

  useEffect(() => {
    function beiBewegung(e: MouseEvent) {
      if (zieht.current) {
        const start = zugStart.current;
        setPos(
          imBild(
            { x: start.x + (e.clientX - start.mx), y: start.y + (e.clientY - start.my) },
            { w: start.w, h: start.h }
          )
        );
      }
      if (skaliert.current) {
        setGroesse({
          w: Math.max(280, skalaStart.current.w + (e.clientX - skalaStart.current.mx)),
          h: Math.max(180, skalaStart.current.h + (e.clientY - skalaStart.current.my)),
        });
      }
    }
    function beiLoslassen() {
      zieht.current = false;
      skaliert.current = false;
    }
    document.addEventListener("mousemove", beiBewegung);
    document.addEventListener("mouseup", beiLoslassen);
    return () => {
      document.removeEventListener("mousemove", beiBewegung);
      document.removeEventListener("mouseup", beiLoslassen);
    };
  }, []);

  /*
    Anwesenheit melden, solange das Gespräch läuft.

    Sie hing vorher am Arbeitsplatz und endete mit ihm — der Interessent sah
    „Ihr Berater ist nicht da", obwohl der Berater im Raum saß und nur eine
    andere Seite geöffnet hatte. Jetzt hängt sie am Gespräch selbst.
  */
  const sessionId = gespraech?.closingSessionId;
  useEffect(() => {
    if (!sessionId) return;
    const melden = (anwesend: boolean) => {
      void fetch("/api/closing/advisor-presence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ closingSessionId: sessionId, present: anwesend }),
        keepalive: true,
      }).catch(() => {});
    };
    melden(true);
    const takt = setInterval(() => melden(true), 30_000);
    const beiEntladen = () => melden(false);
    window.addEventListener("beforeunload", beiEntladen);
    return () => {
      clearInterval(takt);
      window.removeEventListener("beforeunload", beiEntladen);
      melden(false);
    };
  }, [sessionId]);

  const wert = useMemo<Kontext>(
    () => ({ aktiv: Boolean(gespraech), gespraech, starten, beenden, setzeSteuerung }),
    [gespraech, starten, beenden, setzeSteuerung]
  );

  return (
    <GespraechsKontext.Provider value={wert}>
      {children}

      {gespraech && (
        <div
          className="fixed z-50 bg-[#0c1520] border border-[#1a2840] rounded-xl shadow-2xl overflow-hidden flex flex-col"
          style={
            gross
              ? { inset: "24px", width: "auto", height: "auto" }
              : { left: pos.x, top: pos.y, width: groesse.w, height: groesse.h }
          }
        >
          <div
            className="flex items-center justify-between px-3 py-2 border-b border-[#1a2840] bg-[#0a121c] cursor-move select-none flex-shrink-0"
            onMouseDown={(e) => {
              if (gross) return;
              zieht.current = true;
              zugStart.current = {
                mx: e.clientX,
                my: e.clientY,
                x: pos.x,
                y: pos.y,
                w: groesse.w,
                h: groesse.h,
              };
              e.preventDefault();
            }}
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-1.5 h-1.5 rounded-full bg-[#ef4444] animate-pulse flex-shrink-0" />
              <span className="text-xs font-medium text-[#f0f0f0] truncate">
                {gespraech.titel ? `Live · ${gespraech.titel}` : "Live-Gespräch"}
              </span>
              {gespraech.zurueckLink && (
                <Link
                  href={gespraech.zurueckLink}
                  onMouseDown={(e) => e.stopPropagation()}
                  className="text-[10px] text-[#00b8ff] hover:underline flex-shrink-0"
                >
                  → Arbeitsplatz
                </Link>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => setGross((v) => !v)}
                className="text-[#666] hover:text-[#00b8ff] transition-colors"
                title={gross ? "Verkleinern" : "Vergrößern"}
                onMouseDown={(e) => e.stopPropagation()}
              >
                {gross ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
              </button>
              <button
                onClick={beenden}
                className="text-[#666] hover:text-[#ef4444] transition-colors"
                title="Gespräch verlassen"
                onMouseDown={(e) => e.stopPropagation()}
              >
                <Square size={11} />
              </button>
            </div>
          </div>

          <div className="flex-1 min-h-0">
            <OkunCall
              roomUrl={gespraech.raumUrl}
              userName={gespraech.name}
              role="advisor"
              slide={steuerung?.slide ?? null}
              onLeave={beenden}
              onPrev={steuerung?.onPrev}
              onNext={steuerung?.onNext}
              canPrev={steuerung?.canPrev}
              canNext={steuerung?.canNext}
              onStopPresentation={steuerung?.onStopPresentation}
              onPageCount={steuerung?.onPageCount}
              onRemoteChange={steuerung?.onRemoteChange}
            />
          </div>

          <div
            hidden={gross}
            className="absolute bottom-0 right-0 w-5 h-5 cursor-se-resize z-10"
            onMouseDown={(e) => {
              skaliert.current = true;
              skalaStart.current = {
                mx: e.clientX,
                my: e.clientY,
                w: groesse.w,
                h: groesse.h,
              };
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            <svg
              width="10"
              height="10"
              viewBox="0 0 10 10"
              className="absolute bottom-1 right-1 text-[#444]"
            >
              <path
                d="M 9 3 L 9 9 L 3 9"
                stroke="currentColor"
                strokeWidth="1.5"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M 9 6 L 6 9"
                stroke="currentColor"
                strokeWidth="1.5"
                fill="none"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>
      )}
    </GespraechsKontext.Provider>
  );
}
