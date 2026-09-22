"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  DailyAudio,
  DailyProvider,
  DailyVideo,
  useDaily,
  useLocalSessionId,
  useMeetingState,
  useParticipantIds,
  useParticipantProperty,
  useScreenShare,
} from "@daily-co/daily-react";
import type { DailyEventObjectAppMessage } from "@daily-co/daily-js";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Mic,
  MicOff,
  MonitorUp,
  MousePointer2,
  PhoneOff,
  Square,
  Video as VideoIcon,
  VideoOff,
} from "lucide-react";
import { PdfPage } from "./pdf-page";

/**
 * Das Videogespräch in OKUN-Oberfläche.
 *
 * Bewusst keine fertige Fremdoberfläche: Kacheln, Steuerleiste und
 * Präsentationsbühne gehören zu OKUN, damit der Kunde das Gespräch nicht als
 * Fremdprodukt wahrnimmt.
 *
 * Die Bühne kennt drei Zustände, in dieser Reihenfolge:
 *   1. jemand teilt seinen Bildschirm  → Bildschirm groß
 *   2. eine Präsentation läuft         → Folie groß, Teilnehmer als Streifen
 *   3. sonst                           → Gegenüber groß, man selbst klein
 *
 * Über der Folie kann der Berater zeigen. Die Zeigerposition läuft über Dailys
 * Datenkanal (`sendAppMessage`) und wird nirgends gespeichert — sie ist so
 * flüchtig wie ein Finger auf einer Leinwand.
 *
 * Zum Beitritt: Scheitert er, darf das nicht als Dauerspinner enden. Jeder
 * Fehler wird benannt und lässt sich erneut versuchen; ein neuer Versuch
 * bekommt ein frisches Gesprächsobjekt, weil Daily ein fehlgeschlagenes nicht
 * wiederverwendet.
 */

export type CallSlide = {
  slideId: string;
  mimeType: string;
  title: string;
  slideTitle: string | null;
  position: number;
  slideCount: number;
  /** Rollenabhängige URL, über die die Folie geladen wird. */
  src: string;
  /** Seite innerhalb einer PDF-Folie, 1-basiert. */
  page: number;
};

type CallMessage =
  | { k: "pointer"; x: number; y: number }
  | { k: "pointer-off" }
  | { k: "refresh" };

export type OkunCallProps = {
  roomUrl: string;
  userName: string;
  role: "advisor" | "client";
  slide: CallSlide | null;
  onLeave: () => void;
  /** Kundenseite: der Berater hat etwas geändert, Stand neu holen. */
  onRemoteChange?: () => void;
  /** Beraterseite: Folien- und Seitensteuerung. */
  onPrev?: () => void;
  onNext?: () => void;
  canPrev?: boolean;
  canNext?: boolean;
  onStopPresentation?: () => void;
  onPageCount?: (pageCount: number) => void;
};

export function OkunCall(props: OkunCallProps) {
  // Ein erneuter Versuch hängt ein frisches Gesprächsobjekt ein: nach einem
  // Verbindungsfehler ist das bisherige bei Daily nicht mehr zu gebrauchen.
  const [attempt, setAttempt] = useState(0);

  return (
    <DailyProvider key={attempt} url={props.roomUrl} userName={props.userName}>
      <CallSurface {...props} onRetry={() => setAttempt((n) => n + 1)} />
      {/* Ohne diese Komponente bleibt das Gespräch stumm. */}
      <DailyAudio />
    </DailyProvider>
  );
}

/** Liest die Fehlermeldung aus einem Daily-Ereignis, ohne dessen Form zu kennen. */
function errorText(event: unknown): string | null {
  if (!event || typeof event !== "object") return null;
  const e = event as {
    errorMsg?: unknown;
    error?: { msg?: unknown; type?: unknown; localizedMsg?: unknown };
  };
  for (const candidate of [e.error?.localizedMsg, e.error?.msg, e.errorMsg]) {
    if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
  }
  return null;
}

/** Übersetzt Dailys Meldungen in einen Satz, mit dem im Gespräch jemand etwas anfangen kann. */
function describeFailure(raw: string | null): string {
  const text = (raw ?? "").toLowerCase();
  if (text.includes("expired") || text.includes("ended") || text.includes("abgelaufen")) {
    return "Der Gesprächsraum ist abgelaufen. Bitte die Seite neu laden — der Raum wird dabei neu angelegt.";
  }
  if (text.includes("not exist") || text.includes("not found") || text.includes("no room")) {
    return "Der Gesprächsraum ist nicht mehr vorhanden. Bitte die Seite neu laden — der Raum wird dabei neu angelegt.";
  }
  if (text.includes("nbf") || text.includes("not before")) {
    return "Der Gesprächsraum ist noch nicht freigegeben. Bitte kurz warten und erneut versuchen.";
  }
  if (
    text.includes("network") ||
    text.includes("connection") ||
    text.includes("websocket") ||
    text.includes("load")
  ) {
    return "Keine Verbindung zum Gesprächsserver. Bitte Netzwerk, VPN oder Firewall prüfen und erneut versuchen.";
  }
  return raw ?? "Das Gespräch konnte nicht verbunden werden.";
}

function CallSurface({
  role,
  slide,
  onLeave,
  onRemoteChange,
  onPrev,
  onNext,
  canPrev,
  canNext,
  onStopPresentation,
  onPageCount,
  onRetry,
}: OkunCallProps & { onRetry: () => void }) {
  const daily = useDaily();
  const meetingState = useMeetingState();
  const localSessionId = useLocalSessionId();
  const remoteIds = useParticipantIds({ filter: "remote" });
  const { screens, isSharingScreen, startScreenShare, stopScreenShare } = useScreenShare();

  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [pointing, setPointing] = useState(false);
  const [remotePointer, setRemotePointer] = useState<{ x: number; y: number } | null>(null);
  const pointerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [takingLong, setTakingLong] = useState(false);
  const [deviceHint, setDeviceHint] = useState<string | null>(null);
  const joinStarted = useRef(false);

  const isAdvisor = role === "advisor";

  // Beitreten, sobald das Gesprächsobjekt steht.
  //
  // Geprüft wird, ob gerade *nicht* beigetreten wird — nicht, ob der Zustand
  // „new“ ist: ein wiederverwendetes Gesprächsobjekt steht auf „loaded“ oder
  // „left-meeting“, und dann unterblieb der Beitritt früher stillschweigend.
  useEffect(() => {
    if (!daily || joinStarted.current) return;
    const state = daily.meetingState();
    if (state === "joined-meeting" || state === "joining-meeting") return;
    joinStarted.current = true;
    daily.join().catch((err: unknown) => {
      setFailure(describeFailure(err instanceof Error ? err.message : errorText(err)));
    });
  }, [daily]);

  // Fehler benennen, statt den Ladekreis weiterdrehen zu lassen.
  useEffect(() => {
    if (!daily) return;
    const onFatal = (event?: unknown) => setFailure(describeFailure(errorText(event)));
    const onCameraError = (event?: unknown) =>
      setDeviceHint(
        errorText(event) ??
          "Kamera oder Mikrofon sind nicht verfügbar. Bitte die Freigabe im Browser prüfen."
      );
    daily.on("error", onFatal);
    daily.on("camera-error", onCameraError);
    return () => {
      daily.off("error", onFatal);
      daily.off("camera-error", onCameraError);
    };
  }, [daily]);

  // Auch ohne Ereignis darf ein Fehlzustand nicht unbemerkt bleiben: meldet
  // Daily „error“, ohne dass eine Meldung ankam, steht hier trotzdem etwas.
  const failureMessage =
    failure ?? (meetingState === "error" ? describeFailure(null) : null);
  const connecting = meetingState !== "joined-meeting" && !failureMessage;

  // Dauert der Beitritt ungewöhnlich lange, bekommt der Wartende einen Ausweg.
  useEffect(() => {
    if (!connecting) return;
    const timer = setTimeout(() => setTakingLong(true), 15_000);
    return () => clearTimeout(timer);
  }, [connecting]);

  const retry = useCallback(() => {
    setFailure(null);
    setTakingLong(false);
    joinStarted.current = false;
    // Daily duldet kein zweites Gesprächsobjekt neben dem alten — das
    // gescheiterte wird deshalb abgeräumt, bevor ein neues entsteht.
    const current = daily;
    void (async () => {
      try {
        await current?.destroy();
      } catch {
        // Ein bereits abgeräumtes Objekt ist genau das, was wir wollten.
      } finally {
        onRetry();
      }
    })();
  }, [daily, onRetry]);

  // Eingehende Nachrichten: Zeiger anzeigen bzw. Stand neu holen.
  useEffect(() => {
    if (!daily) return;
    const handler = (event?: DailyEventObjectAppMessage) => {
      const data = event?.data as CallMessage | undefined;
      if (!data) return;
      if (data.k === "pointer") {
        setRemotePointer({ x: data.x, y: data.y });
        if (pointerTimer.current) clearTimeout(pointerTimer.current);
        // Bleibt der Zeiger stehen, blendet er nach kurzer Zeit aus.
        pointerTimer.current = setTimeout(() => setRemotePointer(null), 2500);
      } else if (data.k === "pointer-off") {
        setRemotePointer(null);
      } else if (data.k === "refresh") {
        onRemoteChange?.();
      }
    };
    daily.on("app-message", handler);
    return () => {
      daily.off("app-message", handler);
      if (pointerTimer.current) clearTimeout(pointerTimer.current);
    };
  }, [daily, onRemoteChange]);

  const send = useCallback(
    (message: CallMessage) => {
      try {
        daily?.sendAppMessage(message, "*");
      } catch {
        // Eine verlorene Zeigerposition ist folgenlos.
      }
    },
    [daily]
  );

  // Der Berater meldet jede Änderung sofort, damit der Kunde nicht auf den
  // nächsten Abfragetakt warten muss.
  const announceChange = useCallback(() => send({ k: "refresh" }), [send]);

  function toggleMic() {
    const next = !micOn;
    setMicOn(next);
    daily?.setLocalAudio(next);
  }

  function toggleCam() {
    const next = !camOn;
    setCamOn(next);
    daily?.setLocalVideo(next);
  }

  function leave() {
    send({ k: "pointer-off" });
    void daily?.leave();
    onLeave();
  }

  const screenId = screens[0]?.screenId ?? null;
  const stageMode: "screen" | "slide" | "people" = screenId
    ? "screen"
    : slide
      ? "slide"
      : "people";

  return (
    <div className="flex flex-col h-full min-h-0 bg-[#05090f]">
      <div className="flex-1 min-h-0 p-3">
        {failureMessage ? (
          <CallProblem message={failureMessage} onRetry={retry} />
        ) : connecting ? (
          <Connecting takingLong={takingLong} onRetry={retry} />
        ) : stageMode === "people" ? (
          <PeopleStage localSessionId={localSessionId} remoteIds={remoteIds} />
        ) : (
          <div className="h-full flex flex-col lg:flex-row gap-3 min-h-0">
            <div className="flex-1 min-w-0 min-h-0">
              {stageMode === "screen" && screenId ? (
                <div className="h-full rounded-xl overflow-hidden bg-black border border-[#12203a]">
                  <DailyVideo
                    sessionId={screens[0].session_id}
                    type="screenVideo"
                    fit="contain"
                    automirror={false}
                    className="w-full h-full object-contain"
                  />
                </div>
              ) : (
                slide && (
                  <SlideBoard
                    slide={slide}
                    canPoint={isAdvisor}
                    pointing={pointing}
                    remotePointer={remotePointer}
                    onPointerMove={(x, y) => send({ k: "pointer", x, y })}
                    onPointerLeave={() => send({ k: "pointer-off" })}
                    onPageCount={onPageCount}
                  />
                )
              )}
            </div>

            <div className="flex lg:flex-col gap-2 lg:w-[190px] flex-shrink-0 overflow-x-auto lg:overflow-y-auto">
              {remoteIds.map((id) => (
                <Tile key={id} sessionId={id} compact />
              ))}
              {localSessionId && <Tile sessionId={localSessionId} compact isLocal />}
            </div>
          </div>
        )}
      </div>

      {slide && (
        <div className="px-3 pb-2 flex flex-wrap items-center gap-2">
          <span className="text-[#5b6b7f] text-xs truncate flex-1 min-w-0">
            {slide.slideTitle ?? slide.title}
          </span>
          <span className="text-[#5b6b7f] text-xs flex-shrink-0">
            {slide.position} / {slide.slideCount}
            {slide.page > 1 && ` · Seite ${slide.page}`}
          </span>
          {isAdvisor && (
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                onClick={() => {
                  setPointing((v) => !v);
                  if (pointing) send({ k: "pointer-off" });
                }}
                title="Auf der Folie zeigen"
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs transition-colors ${
                  pointing
                    ? "border-[#00b8ff]/50 bg-[rgba(0,184,255,0.14)] text-[#00b8ff]"
                    : "border-[#16283d] text-[#8899b4] hover:text-[#eef2f7]"
                }`}
              >
                <MousePointer2 size={12} /> Zeigen
              </button>
              <button
                onClick={() => {
                  onPrev?.();
                  announceChange();
                }}
                disabled={!canPrev}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#16283d] text-[#8899b4] text-xs hover:text-[#eef2f7] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={13} /> Zurück
              </button>
              <button
                onClick={() => {
                  onNext?.();
                  announceChange();
                }}
                disabled={!canNext}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#00b8ff] text-[#041018] text-xs font-bold disabled:bg-[#16283d] disabled:text-[#4a5a70] disabled:cursor-not-allowed transition-colors"
              >
                Weiter <ChevronRight size={13} />
              </button>
              {onStopPresentation && (
                <button
                  onClick={() => {
                    onStopPresentation();
                    announceChange();
                  }}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#ef4444]/30 text-[#fca5a5] text-xs transition-colors"
                >
                  <Square size={10} /> Beenden
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {deviceHint && (
        <div className="px-3 pb-2">
          <p className="text-[#fca5a5] text-xs text-center">{deviceHint}</p>
        </div>
      )}

      <div className="px-3 py-2.5 border-t border-[#12203a] flex items-center justify-center gap-2">
        <ControlButton active={micOn} onClick={toggleMic} label={micOn ? "Stumm" : "Ton an"}>
          {micOn ? <Mic size={15} /> : <MicOff size={15} />}
        </ControlButton>
        <ControlButton active={camOn} onClick={toggleCam} label={camOn ? "Kamera aus" : "Kamera an"}>
          {camOn ? <VideoIcon size={15} /> : <VideoOff size={15} />}
        </ControlButton>
        {isAdvisor && (
          <ControlButton
            active={isSharingScreen}
            onClick={() => (isSharingScreen ? stopScreenShare() : startScreenShare())}
            label={isSharingScreen ? "Teilen beenden" : "Bildschirm teilen"}
          >
            <MonitorUp size={15} />
          </ControlButton>
        )}
        <button
          onClick={leave}
          className="ml-2 flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[rgba(239,68,68,0.12)] border border-[#ef4444]/30 text-[#fca5a5] text-xs font-semibold hover:bg-[rgba(239,68,68,0.2)] transition-colors"
        >
          <PhoneOff size={14} /> Verlassen
        </button>
      </div>
    </div>
  );
}

/** Der Beitritt läuft — mit Ausweg, falls er zu lange dauert. */
function Connecting({ takingLong, onRetry }: { takingLong: boolean; onRetry: () => void }) {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-3 px-6 text-center">
      <Loader2 size={22} className="text-[#00b8ff] animate-spin" />
      <p className="text-[#8899b4] text-sm">Gespräch wird verbunden…</p>
      {takingLong && (
        <>
          <p className="text-[#5b6b7f] text-xs max-w-sm">
            Das dauert länger als gewöhnlich. Häufig liegt es an einer Firewall, einem VPN oder
            einer verweigerten Kamera-Freigabe.
          </p>
          <button
            onClick={onRetry}
            className="px-4 py-2 rounded-lg border border-[#16283d] text-[#c9d4e4] text-xs font-semibold hover:text-[#eef2f7] hover:border-[#2a3a55] transition-colors"
          >
            Erneut verbinden
          </button>
        </>
      )}
    </div>
  );
}

/** Der Beitritt ist gescheitert — der Grund steht da, wo sonst das Bild wäre. */
function CallProblem({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-3 px-6 text-center">
      <AlertTriangle size={22} className="text-[#fca5a5]" />
      <p className="text-[#eef2f7] text-sm font-semibold">Das Gespräch konnte nicht verbunden werden</p>
      <p className="text-[#8899b4] text-xs max-w-sm">{message}</p>
      <button
        onClick={onRetry}
        className="px-4 py-2 rounded-lg bg-[#00b8ff] text-[#041018] text-xs font-bold hover:bg-[#0099d6] transition-colors"
      >
        Erneut verbinden
      </button>
    </div>
  );
}

/** Gespräch ohne Präsentation: Gegenüber groß, man selbst als kleine Kachel. */
function PeopleStage({
  localSessionId,
  remoteIds,
}: {
  localSessionId: string | null;
  remoteIds: string[];
}) {
  if (remoteIds.length === 0) {
    return (
      <div className="relative h-full rounded-xl overflow-hidden bg-[#0a111c] border border-[#12203a] flex items-center justify-center">
        <p className="text-[#5b6b7f] text-sm">Warten auf Ihr Gegenüber…</p>
        {localSessionId && (
          <div className="absolute bottom-3 right-3 w-[160px] aspect-video">
            <Tile sessionId={localSessionId} isLocal />
          </div>
        )}
      </div>
    );
  }

  if (remoteIds.length === 1) {
    return (
      <div className="relative h-full">
        <Tile sessionId={remoteIds[0]} className="h-full" fit="contain" />
        {localSessionId && (
          <div className="absolute bottom-3 right-3 w-[150px] aspect-video shadow-lg">
            <Tile sessionId={localSessionId} isLocal />
          </div>
        )}
      </div>
    );
  }

  const all = localSessionId ? [...remoteIds, localSessionId] : remoteIds;
  return (
    <div className="h-full grid gap-2 grid-cols-1 sm:grid-cols-2 auto-rows-fr">
      {all.map((id) => (
        <Tile key={id} sessionId={id} isLocal={id === localSessionId} fit="contain" />
      ))}
    </div>
  );
}

/**
 * Eine Teilnehmerkachel.
 *
 * `fit` entscheidet über den Bildausschnitt: „contain“ zeigt das Kamerabild
 * vollständig, „cover“ füllt die Kachel und schneidet dafür ab. Auf der großen
 * Bühne gilt „contain“ — ein Hochkant-Handybild sonst so weit beschnitten, dass
 * vom Gegenüber nur noch ein Ausschnitt des Gesichts übrig bleibt. Für die
 * kleinen Vorschaukacheln bleibt „cover“, dort zählt die gefüllte Fläche.
 */
function Tile({
  sessionId,
  isLocal,
  compact,
  className,
  fit = "cover",
}: {
  sessionId: string;
  isLocal?: boolean;
  compact?: boolean;
  className?: string;
  fit?: "cover" | "contain";
}) {
  const name = useParticipantProperty(sessionId, "user_name");
  const audioOn = useParticipantProperty(sessionId, "audio");
  const videoOn = useParticipantProperty(sessionId, "video");

  return (
    <div
      className={`relative rounded-xl overflow-hidden bg-[#0a111c] border border-[#12203a] ${
        compact ? "w-[150px] lg:w-full aspect-video flex-shrink-0" : ""
      } ${className ?? ""}`}
    >
      {videoOn ? (
        <DailyVideo
          sessionId={sessionId}
          type="video"
          fit={fit}
          automirror
          className={`w-full h-full ${fit === "contain" ? "object-contain" : "object-cover"}`}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <span className="w-10 h-10 rounded-full bg-[#16283d] text-[#8899b4] text-sm font-bold flex items-center justify-center">
            {(name ?? "?").trim().charAt(0).toUpperCase() || "?"}
          </span>
        </div>
      )}

      <div className="absolute left-2 bottom-2 flex items-center gap-1.5 px-2 py-1 rounded-md bg-[rgba(5,9,15,0.7)] backdrop-blur-sm">
        {!audioOn && <MicOff size={10} className="text-[#fca5a5]" />}
        <span className="text-[#c9d4e4] text-[11px] font-medium truncate max-w-[130px]">
          {name || (isLocal ? "Sie" : "Gast")}
          {isLocal && " (Sie)"}
        </span>
      </div>
    </div>
  );
}

/**
 * Die Folie samt Zeiger.
 *
 * Der Zeiger wird in Anteilen der Folienfläche übertragen (0–1), damit er bei
 * jedem Gegenüber an derselben Stelle im Bild sitzt — unabhängig von dessen
 * Fenstergröße.
 */
function SlideBoard({
  slide,
  canPoint,
  pointing,
  remotePointer,
  onPointerMove,
  onPointerLeave,
  onPageCount,
}: {
  slide: CallSlide;
  canPoint: boolean;
  pointing: boolean;
  remotePointer: { x: number; y: number } | null;
  onPointerMove: (x: number, y: number) => void;
  onPointerLeave: () => void;
  onPageCount?: (pageCount: number) => void;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const lastSent = useRef(0);
  const isPdf = slide.mimeType === "application/pdf";

  function handleMove(event: React.MouseEvent<HTMLDivElement>) {
    if (!canPoint || !pointing) return;
    const now = Date.now();
    if (now - lastSent.current < 35) return;
    lastSent.current = now;
    const rect = boxRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return;
    onPointerMove(
      (event.clientX - rect.left) / rect.width,
      (event.clientY - rect.top) / rect.height
    );
  }

  return (
    <div
      ref={boxRef}
      onMouseMove={handleMove}
      onMouseLeave={() => canPoint && pointing && onPointerLeave()}
      className={`relative h-full rounded-xl overflow-hidden bg-[#05080d] border border-[#12203a] flex items-center justify-center ${
        canPoint && pointing ? "cursor-none" : ""
      }`}
    >
      {isPdf ? (
        <PdfPage
          key={slide.slideId}
          src={slide.src}
          page={slide.page}
          onDocumentLoad={onPageCount}
          className="w-full h-full"
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={slide.slideId}
          src={slide.src}
          alt={slide.slideTitle ?? `Folie ${slide.position}`}
          className="max-w-full max-h-full object-contain"
          draggable={false}
        />
      )}

      {remotePointer && (
        <span
          aria-hidden
          className="pointer-events-none absolute w-5 h-5 -ml-2.5 -mt-2.5 rounded-full"
          style={{
            left: `${remotePointer.x * 100}%`,
            top: `${remotePointer.y * 100}%`,
            background: "radial-gradient(circle, rgba(0,184,255,0.95) 0%, rgba(0,184,255,0.25) 55%, transparent 70%)",
            boxShadow: "0 0 16px rgba(0,184,255,0.8)",
          }}
        />
      )}
    </div>
  );
}

function ControlButton({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`w-10 h-10 rounded-lg flex items-center justify-center border transition-colors ${
        active
          ? "border-[#16283d] bg-[#0c1520] text-[#c9d4e4] hover:text-[#eef2f7]"
          : "border-[#ef4444]/30 bg-[rgba(239,68,68,0.12)] text-[#fca5a5]"
      }`}
    >
      {children}
    </button>
  );
}
