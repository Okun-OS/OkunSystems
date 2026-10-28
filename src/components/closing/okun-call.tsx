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
  useWaitingParticipants,
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
import { CallChat, type ChatNachricht } from "./call-chat";
import { meldeStups, registriereSender } from "@/lib/radar/kanal";

/**
 * Das Videogespräch in OKUN-Oberfläche.
 *
 * Bewusst keine fertige Fremdoberfläche: Kacheln, Steuerleiste und
 * Präsentationsbühne gehören zu OKUN, damit der Kunde das Gespräch nicht als
 * Fremdprodukt wahrnimmt.
 *
 * Gibt der Aufrufer ein `stageLayout` mit, übernimmt er die ganze Fläche und
 * bekommt Kacheln und Steuerung gereicht. Sonst gilt:
 *
 * Die Bühne kennt vier Zustände, in dieser Reihenfolge:
 *   1. jemand teilt seinen Bildschirm  → Bildschirm groß
 *   2. eine eigene Bühne ist gesetzt   → sie groß, Teilnehmer als Streifen
 *      (das OKUN Radar nutzt das — die Analyse steht im Mittelpunkt, die
 *      Gesichter daneben, und das Gespräch läuft durchgehend weiter)
 *   3. eine Präsentation läuft         → Folie groß, Teilnehmer als Streifen
 *   4. sonst                           → Gegenüber groß, man selbst klein
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
  | { k: "refresh" }
  // Im Radar hat etwas sich geändert. Trägt keinen Inhalt — die Gegenseite
  // holt den Stand beim Server. Siehe lib/radar/kanal.ts.
  | { k: "radar" }
  // Eine Chatnachricht. Flüchtig wie der Zeiger: Sie läuft über den
  // Datenkanal und wird nirgends gespeichert.
  | { k: "chat"; text: string; von: string };

export type OkunCallProps = {
  roomUrl: string;
  /**
   * Zutrittsticket mit erweiterten Rechten.
   *
   * Die Räume sind offen; ein Ticket braucht nur, wer mehr darf als
   * teilnehmen — etwa die Transkription starten. Ohne Ticket tritt man
   * genau wie bisher bei.
   */
  meetingToken?: string;
  userName: string;
  role: "advisor" | "client";
  slide: CallSlide | null;
  /**
   * Eigener Inhalt für die Bühne. Hat Vorrang vor einer laufenden
   * Präsentation, weicht aber einem geteilten Bildschirm.
   */
  stage?: React.ReactNode;
  /**
   * Eigenes Layout für die ganze Gesprächsfläche.
   *
   * Statt Bühne plus Kachelstreifen plus Steuerleiste übernimmt der Aufrufer
   * die Anordnung und bekommt die beiden Teile gereicht, die er nicht selbst
   * bauen kann: die Teilnehmerkacheln und die Steuerung. Das OKUN Radar nutzt
   * das — dort sitzen die Kacheln in der rechten Spalte und die Steuerung in
   * der Kopfzeile, weil die Analyse die Fläche trägt und nicht das Video.
   *
   * Hat Vorrang vor `stage`, weicht aber einem geteilten Bildschirm: Wer
   * gerade etwas zeigt, soll es auch groß zeigen können.
   */
  stageLayout?: (teile: {
    kacheln: React.ReactNode;
    steuerung: React.ReactNode;
    /** Wie das Gespräch gerade steht — für eine ehrliche Anzeige in der Hülle. */
    zustand: "verbindet" | "verbunden" | "allein";
    /** Wie viele im Raum sind, einen selbst eingerechnet. */
    teilnehmer: number;
  }) => React.ReactNode;
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
  /**
   * Von vornherein ohne Kamera beitreten.
   *
   * Gesetzt, wenn die Seite davor schon gefragt hat und nur der Ton
   * freigegeben wurde — dann gar nicht erst nach dem Bild fragen.
   */
  startOhneKamera?: boolean;
};

/**
 * Ein Gespräch, ein Gesprächsobjekt.
 *
 * Früher hängte ein erneuter Versuch ein frisches Objekt ein: Das alte wurde
 * abgeräumt und der Anbieter mit neuem Schlüssel neu gestellt. Das ging
 * schief, und zwar sichtbar — auf dem Telefon eines Interessenten stand
 * „undefined is not an object (evaluating 'this.properties.url')". Genau das
 * meldet daily-js, wenn auf ein abgeräumtes Gesprächsobjekt zugegriffen wird:
 * Daily duldet immer nur eines, und beim Wechsel kann das sterbende noch
 * einmal herausgegeben werden.
 *
 * Deshalb bleibt das Objekt jetzt stehen. Ein neuer Versuch ist `leave()` und
 * danach `join()` auf demselben Objekt — der Weg, den Daily dafür vorsieht.
 * Hilft auch das nicht, bleibt das Neuladen der Seite, und das steht als
 * Knopf daneben.
 */
export function OkunCall(props: OkunCallProps) {
  /*
    Kein Ticket heißt: kein `token`. Nicht `token: undefined`.

    Das war der Fehler, an dem jeder Gast hängen blieb. daily-js prüft die
    übergebenen Eigenschaften und lehnt `token: undefined` ab —
    „property 'token': token should be a string". Das Gesprächsobjekt kam
    dann gar nicht erst zustande, `join()` wurde nie aufgerufen, und die
    Oberfläche stand für immer auf „Gespräch wird verbunden…" im Zustand
    „new". Der Fehler stand nur in der Entwicklerkonsole.

    Betroffen war genau, wer kein Ticket hat: Gast, Kunde, Interessent im
    Closing. Die Beraterseite bekommt eines fürs Mithören — deshalb lief sie
    weiter, und deshalb sah es so lange nach einem Problem beim anderen aus.

    Der Schlüssel darf also nicht mit leerem Wert dabei sein; er muss fehlen.
  */
  const zugang =
    typeof props.meetingToken === "string" && props.meetingToken.trim()
      ? { token: props.meetingToken }
      : {};
  const name =
    typeof props.userName === "string" && props.userName.trim()
      ? { userName: props.userName }
      : {};

  return (
    <DailyProvider url={props.roomUrl} {...name} {...zugang}>
      <CallSurface {...props} />
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
  /*
    Ein kaputtes Gesprächsobjekt ist kein Satz, den jemand lesen sollte.

    „undefined is not an object (evaluating 'this.properties.url')" stand so
    auf dem Telefon eines Interessenten. Dahinter steckt immer dasselbe: Es
    wurde auf ein abgeräumtes Gesprächsobjekt zugegriffen. Dagegen hilft nur
    ein sauberer Anfang, und den gibt es beim Neuladen der Seite.
  */
  if (
    text.includes("properties.url") ||
    text.includes("use after destroy") ||
    text.includes("duplicate dailyiframe") ||
    text.includes("undefined is not an object")
  ) {
    return "Die Verbindung ist abgerissen und ließ sich nicht wieder aufbauen. Ein Neuladen der Seite setzt alles zurück.";
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
  userName,
  slide,
  stage,
  stageLayout,
  onLeave,
  onRemoteChange,
  onPrev,
  onNext,
  canPrev,
  canNext,
  onStopPresentation,
  onPageCount,
  startOhneKamera,
}: OkunCallProps) {
  const daily = useDaily();
  const meetingState = useMeetingState();
  const localSessionId = useLocalSessionId();
  const remoteIds = useParticipantIds({ filter: "remote" });
  const { screens, isSharingScreen, startScreenShare, stopScreenShare } = useScreenShare();
  /*
    Wer anklopft, soll nicht vor der Tür stehen bleiben.

    Räume werden offen angelegt, aber ein älterer Raum kann noch verschlossen
    sein — dann landet das Gegenüber im Warteraum und wartet, ohne dass es
    hier jemand merkt. Diese Zeile macht das sichtbar, mit einem Knopf daneben.
  */
  const { waitingParticipants, grantAccess } = useWaitingParticipants();

  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [pointing, setPointing] = useState(false);
  const [remotePointer, setRemotePointer] = useState<{ x: number; y: number } | null>(null);
  const pointerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [chat, setChat] = useState<ChatNachricht[]>([]);
  const [chatOffen, setChatOffen] = useState(false);
  const [ungelesen, setUngelesen] = useState(0);
  const [takingLong, setTakingLong] = useState(false);
  /*
    Ohne Kamera beitreten — der Ausweg aus dem häufigsten Grund, warum jemand
    nicht hineinkommt: Die Kamera ist belegt, gesperrt, oder der Browser hat
    nie danach gefragt. Mit Ton ist es immer noch ein Gespräch.
  */
  const [ohneKamera, setzeOhneKamera] = useState(Boolean(startOhneKamera));
  /*
    Wer ist groß?

    Normalerweise das Gegenüber — im Gespräch ist dessen Gesicht das
    Wichtigste auf dem Schirm. Ein Klick auf das eigene Bild dreht es um,
    etwa um zu prüfen, wie man selbst ankommt oder was die Kamera gerade
    zeigt. Und solange niemand sonst da ist, steht man ohnehin selbst groß:
    Ein leeres Rechteck anzusehen, während man wartet, hilft niemandem.
  */
  const [getauscht, setzeGetauscht] = useState(false);
  /*
    Steht der Beitretende im Warteraum?

    Ein verschlossener Raum löst den Beitritt nicht auf, sondern stellt den
    Gast in einen Warteraum — ohne Fehler, ohne Ende. In einer fertigen
    Oberfläche stünde dort „Warten auf Einlass"; in unserer stand bisher
    nichts. Jetzt wird der Einlass angefragt und gesagt, worauf gewartet wird.
  */
  const [imWarteraum, setzeImWarteraum] = useState(false);
  const einlassGebeten = useRef(false);
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
    /*
      Auf ein abgeräumtes Gesprächsobjekt wird nicht beigetreten.

      daily-react gibt in seltenen Fällen ein bereits abgeräumtes heraus —
      im Code der Bibliothek steht dazu ein offenes „TODO". Der Beitritt
      stirbt dann mit „undefined is not an object"; so stand es auf dem
      Telefon eines Interessenten. Hier wird daraus eine Meldung mit einem
      Knopf, der tatsächlich hilft.
    */
    if (daily.isDestroyed?.()) return;
    const state = daily.meetingState();
    if (state === "joined-meeting" || state === "joining-meeting") return;
    joinStarted.current = true;
    /*
      Erst die Kamera, dann der Beitritt.

      `startCamera()` holt die eigene Kamera, bevor das Gespräch steht —
      damit sieht man sich selbst schon, während verbunden wird, und weiß,
      ob man im Bild sitzt. Scheitert es, geht der Beitritt trotzdem
      weiter: Ohne Bild ist ein Gespräch immer noch ein Gespräch.
    */
    void (async () => {
      if (!ohneKamera) {
        try {
          await daily.startCamera();
        } catch {
          // Kein Vorschaubild. Mehr folgt daraus nicht.
        }
      }
      try {
        await daily.join(ohneKamera ? { startVideoOff: true } : {});
      } catch (err: unknown) {
        setFailure(describeFailure(err instanceof Error ? err.message : errorText(err)));
      }
    })();
  }, [daily, ohneKamera]);

  // Der Warteraum: Einlass bitten und es sichtbar machen.
  useEffect(() => {
    if (!daily) return;
    const onZutritt = (event?: unknown) => {
      const stufe = (
        event as { access?: { level?: string } | string } | undefined
      )?.access;
      const level = typeof stufe === "object" ? stufe?.level : undefined;
      if (level === "lobby") {
        setzeImWarteraum(true);
        if (!einlassGebeten.current) {
          einlassGebeten.current = true;
          try {
            daily.requestAccess({ name: userName, access: { level: "full" } });
          } catch {
            // Dann bleibt es beim Hinweis — einlassen muss ohnehin die Gegenseite.
          }
        }
      } else if (level === "full") {
        setzeImWarteraum(false);
      }
    };
    daily.on("access-state-updated", onZutritt);
    return () => {
      daily.off("access-state-updated", onZutritt);
    };
  }, [daily, userName]);

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
    failure ??
    (daily?.isDestroyed?.()
      ? describeFailure("use after destroy")
      : meetingState === "error"
        ? describeFailure(null)
        : null);
  const connecting = meetingState !== "joined-meeting" && !failureMessage;

  // Dauert der Beitritt ungewöhnlich lange, bekommt der Wartende einen Ausweg.
  useEffect(() => {
    if (!connecting) return;
    const timer = setTimeout(() => setTakingLong(true), 15_000);
    return () => clearTimeout(timer);
  }, [connecting]);

  /*
    Irgendwann ist Warten keine Antwort mehr.

    Ein Beitritt, der nach einer Minute nicht steht, kommt auch nicht mehr.
    Daily meldet in diesen Fällen oft gar nichts — kein Fehler, kein
    Abbruch —, und der Wartende sitzt vor einem Kreisel, der sich für immer
    dreht. Genau das ist einem Interessenten passiert.
  */
  useEffect(() => {
    if (!connecting) return;
    const timer = setTimeout(() => {
      setFailure(
        "Der Beitritt kam nicht zustande. Häufigste Ursachen: Die Kamera ist belegt " +
          "oder gesperrt, der Browser hat nie nach der Freigabe gefragt, oder eine " +
          "Firewall blockiert die Verbindung. Es geht auch ohne Kamera — nur mit Ton. " +
          `(Zustand: ${daily?.meetingState() ?? "unbekannt"}${imWarteraum ? ", Warteraum" : ""})`
      );
    }, 60_000);
    return () => clearTimeout(timer);
  }, [connecting, daily, imWarteraum]);

  /**
   * Noch einmal beitreten — auf demselben Gesprächsobjekt.
   *
   * `leave()` und danach `join()`: der Weg, den Daily für einen zweiten
   * Anlauf vorsieht. Das Objekt abzuräumen und ein neues zu stellen war der
   * Grund für „undefined is not an object"; es bleibt deshalb stehen.
   */
  const verbindeNeu = useCallback(
    (ohneBild: boolean) => {
      const current = daily;
      setFailure(null);
      setTakingLong(false);
      if (ohneBild) setzeOhneKamera(true);
      if (!current) return;

      if (current.isDestroyed?.()) {
        setFailure(describeFailure("use after destroy"));
        return;
      }

      void (async () => {
        try {
          const zustand = current.meetingState();
          if (zustand !== "new" && zustand !== "left-meeting") {
            await current.leave();
          }
          joinStarted.current = true;
          await current.join(ohneBild || ohneKamera ? { startVideoOff: true } : {});
        } catch (err: unknown) {
          setFailure(describeFailure(err instanceof Error ? err.message : errorText(err)));
        }
      })();
    },
    [daily, ohneKamera]
  );

  const retry = useCallback(() => verbindeNeu(false), [verbindeNeu]);
  const onOhneKamera = useCallback(() => verbindeNeu(true), [verbindeNeu]);

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
      } else if (data.k === "radar") {
        meldeStups();
      } else if (data.k === "chat" && typeof data.text === "string") {
        const text = data.text.slice(0, 2000);
        if (!text.trim()) return;
        setChat((bisher) => [
          ...bisher.slice(-49),
          {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            von: typeof data.von === "string" && data.von.trim() ? data.von : "Gegenüber",
            text,
            zeit: Date.now(),
            eigen: false,
          },
        ]);
        // Wer den Chat zu hat, soll sehen, dass etwas gekommen ist — aber
        // nicht aus dem Gespräch gerissen werden. Deshalb eine Zahl am Knopf
        // und kein Fenster, das sich von selbst aufklappt.
        setUngelesen((n) => n + 1);
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

  /*
    Der Chat.

    Er liegt hier und nicht in einer der Ansichten, damit er in jedem Gespräch
    da ist — Closing, Radar, Strategiegespräch —, ohne dass jede Oberfläche
    ihn einbauen muss. Gespeichert wird nichts: Was im Gespräch geschrieben
    wurde, ist mit dem Gespräch vorbei.
  */
  const chatSenden = useCallback(
    (text: string) => {
      const sauber = text.trim().slice(0, 2000);
      if (!sauber) return;
      send({ k: "chat", text: sauber, von: userName });
      setChat((bisher) => [
        ...bisher.slice(-49),
        {
          id: `${Date.now()}-eigen`,
          von: userName,
          text: sauber,
          zeit: Date.now(),
          eigen: true,
        },
      ]);
    },
    [send, userName]
  );

  const chatWidget = (
    <CallChat
      nachrichten={chat}
      offen={chatOffen}
      ungelesen={ungelesen}
      teilnehmer={remoteIds.length}
      onOeffnen={() => {
        setChatOffen(true);
        setUngelesen(0);
      }}
      onSchliessen={() => setChatOffen(false)}
      onSenden={chatSenden}
    />
  );

  // Der Berater meldet jede Änderung sofort, damit der Kunde nicht auf den
  // nächsten Abfragetakt warten muss.
  const announceChange = useCallback(() => send({ k: "refresh" }), [send]);

  // Das Radar liegt in einer anderen Komponente und kommt an diesen Kanal
  // nicht heran. Hier bekommt es einen Draht dorthin — in beide Richtungen.
  useEffect(() => registriereSender(() => send({ k: "radar" })), [send]);

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
  const stageMode: "screen" | "eigen" | "slide" | "people" = screenId
    ? "screen"
    : stage
      ? "eigen"
      : slide
        ? "slide"
        : "people";

  // Die Steuerung — einmal gebaut, zweimal verwendet: in der eigenen Leiste
  // unten und, falls der Aufrufer das Layout übernimmt, bei ihm.
  const steuerung = (
    <div className="flex items-center gap-2">
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
        className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[rgba(239,68,68,0.12)] border border-[#ef4444]/30 text-[#fca5a5] text-xs font-semibold hover:bg-[rgba(239,68,68,0.2)] transition-colors"
      >
        <PhoneOff size={14} /> Verlassen
      </button>
    </div>
  );

  /**
   * Der Aufrufer übernimmt die Fläche.
   *
   * Nur, solange niemand seinen Bildschirm teilt — und erst, wenn das Gespräch
   * steht. Davor gelten Fehlermeldung und Verbindungsanzeige wie sonst auch,
   * sonst stünde der Interessent vor einem Cockpit ohne Bild und ohne Grund.
   */
  if (stageLayout && !screenId) {
    /*
      Auch die Störmeldung bleibt im Haus.

      Vorher ersetzte sie die ganze Fläche — samt Kopfzeile, Logo und
      Steuerleiste. Wer nicht hineinkam, stand damit vor einer nackten
      Fehlermeldung auf schwarzem Grund und wusste nicht einmal mehr, wo er
      ist. Jetzt sitzt sie da, wo sonst das Bild ist.
    */
    if (failureMessage) {
      return (
        <>
          {stageLayout({
            kacheln: (
              <CallProblem
                message={failureMessage}
                onRetry={retry}
                onOhneKamera={ohneKamera ? undefined : onOhneKamera}
              />
            ),
            steuerung,
            zustand: "verbindet",
            teilnehmer: remoteIds.length + (localSessionId ? 1 : 0),
          })}
          {chatWidget}
        </>
      );
    }
    /*
      Beide Plätze stehen immer da — auch der leere.

      Vorher erschien die Gegenseite erst, wenn sie beigetreten war, und
      vorher war an der Stelle schlicht nichts. Wer die Oberfläche zum ersten
      Mal sieht, konnte nicht erkennen, dass dort überhaupt ein Video
      hingehört. Ein reservierter, beschrifteter Platz beantwortet das, bevor
      die Frage aufkommt.
    */
    const gegenueber = remoteIds[0] ?? null;
    // Allein im Raum heißt: man sieht sich selbst, nicht ein leeres Rechteck.
    const selbstGross = getauscht || !gegenueber;
    /*
      Das Gegenüber groß, man selbst als Einblendung in der Ecke.

      Zwei gleich große Briefmarken nebeneinander geben beiden zu wenig Raum —
      und das Gesicht des Gegenübers ist im Verkaufsgespräch das Wichtigste auf
      dem Bildschirm. Das eigene Bild braucht nur so viel Platz, dass man sieht,
      ob man noch im Bild ist.
    */
    /*
      Solange verbunden wird, steht hier die Verbindungsanzeige.

      Vorher standen an dieser Stelle zwei Kacheln mit dem Wort „verbindet…"
      — und sonst nichts: kein Hinweis, warum es dauert, kein Knopf, es noch
      einmal zu versuchen, keine Meldung über eine gesperrte Kamera. Wer
      nicht hineinkam, sah genau dasselbe wie jemand, bei dem es gleich
      losgeht. Das ist einem Interessenten passiert, und zwar zweimal.
    */
    if (connecting) {
      return (
        <>
          {stageLayout({
            kacheln: (
              /*
                Das eigene Bild steht schon da, während verbunden wird.

                Wer wartet, will wissen, ob die Kamera überhaupt läuft und ob
                er im Bild sitzt. Ein leerer Kreisel beantwortet das nicht.
                Sobald Daily die eigene Kamera kennt, liegt sie darunter und
                die Anzeige legt sich darüber.
              */
              <div className="relative h-full min-h-[220px]">
                {localSessionId && (
                  <div className="absolute inset-0 opacity-45">
                    <Kachel
                      sessionId={localSessionId}
                      rolle={isAdvisor ? "Sie" : "Ihr Unternehmen"}
                      akzent="#22c55e"
                      istSelbst
                      platzhalter="Kamera aus"
                      gross
                    />
                  </div>
                )}
                <div className="relative h-full">
                  <Connecting
                    takingLong={takingLong}
                    onRetry={retry}
                    onOhneKamera={ohneKamera ? undefined : onOhneKamera}
                    hinweis={deviceHint}
                    imWarteraum={imWarteraum}
                    zustand={meetingState ?? null}
                  />
                </div>
              </div>
            ),
            steuerung,
            zustand: "verbindet",
            teilnehmer: remoteIds.length + (localSessionId ? 1 : 0),
          })}
          {chatWidget}
        </>
      );
    }

    const kacheln = (
      <div className="relative h-full min-h-0">
        {isAdvisor && waitingParticipants.length > 0 && (
          <div className="absolute top-3 left-3 right-3 z-10">
            <Warteraum teilnehmer={waitingParticipants} einlassen={grantAccess} />
          </div>
        )}
        {/*
          Selbst groß, wenn getauscht wurde — oder wenn sonst niemand da ist.
        */}
        {selbstGross ? (
          <Kachel
            sessionId={localSessionId}
            rolle={isAdvisor ? "Sie" : "Ihr Unternehmen"}
            akzent="#22c55e"
            istSelbst
            platzhalter="Kamera aus"
            gross
          />
        ) : (
          <Kachel
            sessionId={gegenueber}
            rolle={isAdvisor ? "Interessent" : "OKUN Systems · Berater"}
            akzent="#00b8ff"
            platzhalter="wartet auf Beitritt"
            gross
          />
        )}
        <EigeneEcke onKlick={() => setzeGetauscht((t) => !t)}>
          {selbstGross ? (
            <Kachel
              sessionId={gegenueber}
              rolle={isAdvisor ? "Interessent" : "OKUN Systems · Berater"}
              akzent="#00b8ff"
              platzhalter="wartet"
              winzig
            />
          ) : (
            <Kachel
              sessionId={localSessionId}
              rolle={isAdvisor ? "Sie" : "Ihr Unternehmen"}
              akzent="#22c55e"
              istSelbst
              platzhalter="Kamera aus"
              winzig
            />
          )}
        </EigeneEcke>
      </div>
    );
    const zustand = gegenueber ? "verbunden" : "allein";
    const teilnehmer = remoteIds.length + (localSessionId ? 1 : 0);
    return (
      <>
        {stageLayout({ kacheln, steuerung, zustand, teilnehmer })}
        {chatWidget}
      </>
    );
  }

  return (
    <>
    <div className="flex flex-col h-full min-h-0 bg-[#05090f]">
      <div className="flex-1 min-h-0 p-3">
        {isAdvisor && waitingParticipants.length > 0 && (
          <Warteraum teilnehmer={waitingParticipants} einlassen={grantAccess} />
        )}
        {failureMessage ? (
          <CallProblem
            message={failureMessage}
            onRetry={retry}
            onOhneKamera={ohneKamera ? undefined : onOhneKamera}
          />
        ) : connecting ? (
          <Connecting
            takingLong={takingLong}
            onRetry={retry}
            onOhneKamera={ohneKamera ? undefined : onOhneKamera}
            hinweis={deviceHint}
            imWarteraum={imWarteraum}
            zustand={meetingState ?? null}
          />
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
              ) : stageMode === "eigen" ? (
                <div className="h-full rounded-xl overflow-hidden border border-[#12203a] bg-[#070d15]">
                  {stage}
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

      {slide && stageMode !== "eigen" && (
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

      <div className="px-3 py-2.5 border-t border-[#12203a] flex items-center justify-center">
        {steuerung}
      </div>
    </div>
      {chatWidget}
    </>
  );
}

/**
 * Das eigene Bild — dahin, wo es gerade nicht stört.
 *
 * Es sitzt unten rechts, und dort liegt im Zweifel genau das, was man sehen
 * will: ein geteiltes Dokument, eine Hand, ein Blatt Papier. Also lässt es
 * sich ziehen. Die Lage bleibt innerhalb des Bildes, und beim Doppelklick
 * geht es zurück in seine Ecke.
 */
function EigeneEcke({
  children,
  onKlick,
}: {
  children: React.ReactNode;
  /** Ein Klick — nicht ein Ziehen — tauscht groß und klein. */
  onKlick?: () => void;
}) {
  const [lage, setzeLage] = useState({ rechts: 10, unten: 10 });
  const zieht = useRef<{ x: number; y: number } | null>(null);
  /*
    Geklickt oder gezogen?

    Dieselbe Kachel kann beides. Wer sie bewegt, will nicht tauschen; wer
    sie antippt, will nicht verschieben. Entschieden wird nach der
    zurückgelegten Strecke: ein paar Pixel sind ein Klick mit zittriger
    Hand, alles darüber ist ein Ziehen.
  */
  const strecke = useRef(0);
  const eigen = useRef<HTMLDivElement>(null);

  function begrenze(rechts: number, unten: number) {
    const el = eigen.current;
    const eltern = el?.parentElement;
    if (!el || !eltern) return { rechts, unten };
    const maxRechts = Math.max(eltern.clientWidth - el.offsetWidth, 0);
    const maxUnten = Math.max(eltern.clientHeight - el.offsetHeight, 0);
    return {
      rechts: Math.min(Math.max(rechts, 0), maxRechts),
      unten: Math.min(Math.max(unten, 0), maxUnten),
    };
  }

  return (
    <div
      ref={eigen}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        zieht.current = { x: e.clientX, y: e.clientY };
        strecke.current = 0;
      }}
      onPointerMove={(e) => {
        if (!zieht.current) return;
        const dx = e.clientX - zieht.current.x;
        const dy = e.clientY - zieht.current.y;
        strecke.current += Math.abs(dx) + Math.abs(dy);
        zieht.current = { x: e.clientX, y: e.clientY };
        // Nach rechts ziehen heißt: der Abstand zum rechten Rand wird kleiner.
        setzeLage((l) => begrenze(l.rechts - dx, l.unten - dy));
      }}
      onPointerUp={(e) => {
        zieht.current = null;
        e.currentTarget.releasePointerCapture?.(e.pointerId);
        if (strecke.current < 6) onKlick?.();
      }}
      onPointerCancel={() => {
        zieht.current = null;
      }}
      onDoubleClick={() => setzeLage({ rechts: 10, unten: 10 })}
      title={
        onKlick
          ? "Klicken zum Tauschen · Ziehen zum Verschieben · Doppelklick setzt die Lage zurück"
          : "Ziehen zum Verschieben · Doppelklick setzt zurück"
      }
      style={{ right: lage.rechts, bottom: lage.unten, touchAction: "none" }}
      className="absolute w-[38%] max-w-[150px] rounded-xl overflow-hidden
        shadow-[0_10px_30px_-10px_rgba(0,0,0,0.9)] ring-1 ring-[#0a1726]
        cursor-grab active:cursor-grabbing select-none"
    >
      {children}
    </div>
  );
}

/**
 * Jemand steht im Warteraum.
 *
 * Nur zu sehen, wenn ein Raum noch Einlass verlangt — neue Räume tun das
 * nicht. Dann aber sofort und mit einem Knopf: Wer draußen wartet, sieht
 * nichts als einen Kreisel.
 */
function Warteraum({
  teilnehmer,
  einlassen,
}: {
  teilnehmer: { id: string; name?: string }[];
  einlassen: (id: string) => void;
}) {
  return (
    <div className="mb-3 px-3.5 py-2.5 rounded-xl bg-[rgba(245,165,36,.1)] border border-[rgba(245,165,36,.3)]">
      {teilnehmer.map((t) => (
        <div key={t.id} className="flex items-center justify-between gap-3">
          <p className="text-[#f5a524] text-xs">
            <span className="font-semibold">{t.name || "Jemand"}</span> wartet auf Einlass.
          </p>
          <button
            onClick={() => einlassen(t.id)}
            className="px-3 py-1.5 rounded-lg bg-[#f5a524] text-[#241a05] text-[11px] font-bold hover:bg-[#ffb935] transition-colors flex-shrink-0"
          >
            Einlassen
          </button>
        </div>
      ))}
    </div>
  );
}

/** Der Beitritt läuft — mit Ausweg, falls er zu lange dauert. */
function Connecting({
  takingLong,
  onRetry,
  onOhneKamera,
  hinweis,
  imWarteraum,
  zustand,
}: {
  takingLong: boolean;
  onRetry: () => void;
  /** Fehlt, wenn ohnehin schon ohne Kamera versucht wird. */
  onOhneKamera?: () => void;
  /** Was der Browser zu Kamera oder Mikrofon gemeldet hat. */
  hinweis?: string | null;
  /** Der Raum verlangt Einlass — darauf wird gerade gewartet. */
  imWarteraum?: boolean;
  /** Dailys Zustand, damit ein Bildschirmfoto die Ursache verrät. */
  zustand?: string | null;
}) {
  return (
    <div className="h-full min-h-[220px] flex flex-col items-center justify-center gap-3 px-6 text-center">
      <Loader2 size={22} className="text-[#00b8ff] animate-spin" />
      <p className="text-[#8899b4] text-sm">
        {imWarteraum ? "Sie stehen im Warteraum…" : "Gespräch wird verbunden…"}
      </p>
      {imWarteraum && (
        <p className="text-[#5b6b7f] text-xs max-w-sm leading-relaxed">
          Dieser Raum verlangt Einlass. Ihr Gegenüber muss Sie hereinlassen — das
          sieht es auf seiner Seite.
        </p>
      )}
      {hinweis && <p className="text-[#fca5a5] text-xs max-w-sm">{hinweis}</p>}
      {takingLong && (
        <>
          <p className="text-[#5b6b7f] text-xs max-w-sm leading-relaxed">
            Das dauert länger als gewöhnlich. Meistens fragt der Browser gerade nach
            der Freigabe für Kamera und Mikrofon — oben in der Adressleiste nachsehen.
            Sonst liegt es an einer Firewall oder einem VPN.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              onClick={onRetry}
              className="px-4 py-2 rounded-lg border border-[#16283d] text-[#c9d4e4] text-xs font-semibold hover:text-[#eef2f7] hover:border-[#2a3a55] transition-colors"
            >
              Erneut verbinden
            </button>
            {onOhneKamera && (
              <button
                onClick={onOhneKamera}
                className="px-4 py-2 rounded-lg bg-[#00b8ff] text-[#041018] text-xs font-bold hover:bg-[#33c7ff] transition-colors"
              >
                Ohne Kamera beitreten
              </button>
            )}
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-lg border border-[#16283d] text-[#c9d4e4] text-xs font-semibold hover:text-[#eef2f7] hover:border-[#2a3a55] transition-colors"
            >
              Seite neu laden
            </button>
          </div>
          {/*
            Der Zustand im Klartext.

            Zwei Zeilen Technik, die ein Bildschirmfoto wert sind: „joining"
            heißt etwas anderes als „loading", und wer nicht hineinkommt,
            schickt ohnehin ein Foto. Dann steht die Ursache darauf.
          */}
          {zustand && (
            <p className="font-mono text-[9px] text-[#2c3c52] uppercase tracking-[0.14em]">
              Zustand: {zustand}
              {imWarteraum ? " · Warteraum" : ""}
            </p>
          )}
        </>
      )}
    </div>
  );
}

/** Der Beitritt ist gescheitert — der Grund steht da, wo sonst das Bild wäre. */
function CallProblem({
  message,
  onRetry,
  onOhneKamera,
}: {
  message: string;
  onRetry: () => void;
  /** Fehlt, wenn ohnehin schon ohne Kamera versucht wird. */
  onOhneKamera?: () => void;
}) {
  return (
    <div className="h-full min-h-[220px] flex flex-col items-center justify-center gap-3 px-6 text-center">
      <AlertTriangle size={22} className="text-[#fca5a5]" />
      <p className="text-[#eef2f7] text-sm font-semibold">Das Gespräch konnte nicht verbunden werden</p>
      <p className="text-[#8899b4] text-xs max-w-sm leading-relaxed">{message}</p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          onClick={onRetry}
          className="px-4 py-2 rounded-lg border border-[#16283d] text-[#c9d4e4] text-xs font-semibold hover:text-[#eef2f7] hover:border-[#2a3a55] transition-colors"
        >
          Erneut verbinden
        </button>
        {onOhneKamera && (
          <button
            onClick={onOhneKamera}
            className="px-4 py-2 rounded-lg border border-[#16283d] text-[#c9d4e4] text-xs font-semibold hover:text-[#eef2f7] hover:border-[#2a3a55] transition-colors"
          >
            Ohne Kamera beitreten
          </button>
        )}
        {/*
          Der Weg, der immer funktioniert.

          Beim Neuladen entsteht alles neu — das Gesprächsobjekt, der Raum,
          die Freigabe. Wer zweimal vor einer verschlossenen Tür stand, soll
          nicht raten müssen, was als Nächstes hilft.
        */}
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 rounded-lg bg-[#00b8ff] text-[#041018] text-xs font-bold hover:bg-[#33c7ff] transition-colors"
        >
          Seite neu laden
        </button>
      </div>
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
 * Eine Kachel mit festem Platz.
 *
 * Anders als `Tile` verschwindet sie nicht, wenn niemand da ist: Ohne
 * Teilnehmer zeigt sie den reservierten Platz samt Rolle, damit erkennbar
 * bleibt, wo das Gespräch stattfindet. Der farbige Strich vor dem Namen
 * unterscheidet die beiden Seiten auf einen Blick — in einer Kachel von
 * 150 Pixeln Breite ist das schneller gelesen als jede Beschriftung.
 */
function Kachel({
  sessionId,
  rolle,
  akzent,
  istSelbst,
  platzhalter,
  gross,
  winzig,
}: {
  sessionId: string | null;
  rolle: string;
  akzent: string;
  istSelbst?: boolean;
  platzhalter: string;
  /** Die große Kachel des Gegenübers. */
  gross?: boolean;
  /** Die eingeblendete eigene Kachel. */
  winzig?: boolean;
}) {
  /*
    Die große Kachel nimmt die Fläche, die da ist.

    Vorher stand hier ein festes Seitenverhältnis (16:10). Auf einem
    Notebook mit vielen Tabs ist die Fläche aber flacher als das —
    die Kachel wurde höher als das Fenster, zu sehen war ein waagerechter
    Streifen aus der Mitte, und die eingeblendete eigene Kachel lag
    unterhalb des sichtbaren Bereichs. Es sah aus wie ein Zoom und wie ein
    fehlendes Selbstbild; es war beides dasselbe Problem.
  */
  const form = gross
    ? "h-full w-full rounded-2xl"
    : winzig
      ? "aspect-video rounded-xl"
      : "aspect-video rounded-xl";

  if (!sessionId) {
    return (
      <div
        className={`relative ${form} overflow-hidden border border-[#13243c] bg-[linear-gradient(160deg,#0b1726,#070d17)]`}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-50"
          style={{
            backgroundImage:
              "linear-gradient(rgba(35,64,95,0.13) 1px,transparent 1px)," +
              "linear-gradient(90deg,rgba(35,64,95,0.13) 1px,transparent 1px)",
            backgroundSize: "18px 18px",
            maskImage: "radial-gradient(circle at 50% 46%, black 8%, transparent 70%)",
          }}
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5">
          <span
            className={`rounded-full border border-dashed border-[#24415f] flex items-center justify-center ${
              winzig ? "w-6 h-6" : "w-10 h-10"
            }`}
          >
            <VideoIcon size={winzig ? 10 : 15} className="text-[#2a4059]" />
          </span>
          {!winzig && <span className="text-[#44546b] text-[10px]">{platzhalter}</span>}
        </div>
        <KachelName rolle={rolle} name={null} akzent={akzent} stumm={false} winzig={winzig} />
      </div>
    );
  }
  return (
    <BelegteKachel
      sessionId={sessionId}
      rolle={rolle}
      akzent={akzent}
      istSelbst={istSelbst}
      form={form}
      winzig={winzig}
    />
  );
}

function BelegteKachel({
  sessionId,
  rolle,
  akzent,
  istSelbst,
  form,
  winzig,
}: {
  sessionId: string;
  rolle: string;
  akzent: string;
  istSelbst?: boolean;
  form: string;
  winzig?: boolean;
}) {
  const name = useParticipantProperty(sessionId, "user_name");
  const audioOn = useParticipantProperty(sessionId, "audio");
  const videoOn = useParticipantProperty(sessionId, "video");

  return (
    <div className={`relative ${form} overflow-hidden border border-[#13243c] bg-black`}>
      {videoOn ? (
        /*
          Das ganze Bild, nicht ein Ausschnitt daraus.

          `cover` füllt die Kachel und schneidet dafür ab, was nicht
          hineinpasst. Bei einer Kamera im Hochformat — jedes Telefon — oder
          im Verhältnis 4:3 bleibt davon ein Ausschnitt übrig, der aussieht,
          als säße das Gegenüber mit der Nase am Objektiv. Genau so kam es
          an. `contain` zeigt, was die Kamera sieht; die Ränder bleiben
          dunkel, und das ist das kleinere Übel.

          Die kleine eigene Kachel darf weiter füllen: Dort geht es nur
          darum, ob man noch im Bild ist.
        */
        <DailyVideo
          sessionId={sessionId}
          type="video"
          fit={winzig ? "cover" : "contain"}
          automirror
          className={`w-full h-full ${winzig ? "object-cover" : "object-contain"}`}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-[linear-gradient(160deg,#0d1a2b,#070d17)]">
          <span
            className="w-9 h-9 rounded-full text-[13px] font-bold flex items-center justify-center"
            style={{ background: `${akzent}1f`, color: akzent }}
          >
            {(name ?? "?").trim().charAt(0).toUpperCase() || "?"}
          </span>
        </div>
      )}
      <KachelName
        rolle={rolle}
        name={name || (istSelbst ? "Sie" : null)}
        akzent={akzent}
        stumm={!audioOn}
        winzig={winzig}
      />
    </div>
  );
}

function KachelName({
  rolle,
  name,
  akzent,
  stumm,
  winzig,
}: {
  rolle: string;
  name: string | null;
  akzent: string;
  stumm: boolean;
  winzig?: boolean;
}) {
  if (winzig) {
    return (
      <div className="absolute inset-x-0 bottom-0 bg-[linear-gradient(to_top,rgba(5,9,15,0.9),transparent)] px-1.5 pt-4 pb-1 flex items-center gap-1">
        <span className="w-[2px] h-[10px] rounded-full flex-shrink-0" style={{ background: akzent }} />
        <span className="text-[#c9d4e4] text-[8.5px] leading-tight truncate">{name ?? rolle}</span>
        {stumm && <MicOff size={8} className="text-[#fca5a5] flex-shrink-0 ml-auto" />}
      </div>
    );
  }
  return (
    <div className="absolute inset-x-0 bottom-0 bg-[linear-gradient(to_top,rgba(5,9,15,0.94),transparent)] px-3 pt-8 pb-2.5">
      <div className="flex items-center gap-2 min-w-0">
        <span
          className="w-[3px] h-[22px] rounded-full flex-shrink-0"
          style={{ background: akzent, boxShadow: `0 0 10px ${akzent}` }}
        />
        <span className="min-w-0">
          {name && (
            <span className="block text-[#f4f8fd] text-[12.5px] font-semibold leading-tight truncate">
              {name}
            </span>
          )}
          <span className="block font-mono text-[#5f88ae] text-[9px] uppercase tracking-[0.14em] leading-tight truncate mt-[2px]">
            {rolle}
          </span>
        </span>
        {stumm && <MicOff size={11} className="text-[#fca5a5] flex-shrink-0 ml-auto" />}
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
