"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Mic, Video as VideoIcon, VideoOff } from "lucide-react";
import { nenneGrund } from "@/lib/video/geraete";

/**
 * Der Vorraum.
 *
 * Vor jedem ordentlichen Videogespräch steht dasselbe: das eigene Bild,
 * die Wahl von Kamera und Mikrofon, ein Ausschlag, der zeigt, dass der Ton
 * ankommt — und erst dann die Tür. Das ist nicht Zierde: Wer vorher sieht,
 * was gesendet wird, steht nicht im Gespräch und wundert sich, warum ihn
 * niemand sieht.
 *
 * Die Vorschau läuft über einen eigenen Kamerastrom, nicht über das
 * Gesprächsobjekt. Der wird beim Betreten ausdrücklich beendet, bevor das
 * Gespräch beginnt: Eine Kamera zweimal gleichzeitig zu öffnen ist auf
 * manchen Rechnern genau der Unterschied zwischen „läuft örtlich" und
 * „wird gesendet".
 */

export type VorraumWahl = {
  name: string;
  kamera: string | null;
  mikro: string | null;
  ohneKamera: boolean;
};

export function Vorraum({
  titel,
  vorschlag,
  nameAendern = true,
  onBetreten,
}: {
  titel: string;
  /** Vorbelegter Name. */
  vorschlag?: string;
  /** Darf der Name geändert werden? Beim angemeldeten Kunden nicht. */
  nameAendern?: boolean;
  onBetreten: (wahl: VorraumWahl) => void;
}) {
  const [name, setzeName] = useState(vorschlag ?? "");
  const [strom, setzeStrom] = useState<MediaStream | null>(null);
  const [kameras, setzeKameras] = useState<MediaDeviceInfo[]>([]);
  const [mikrofone, setzeMikrofone] = useState<MediaDeviceInfo[]>([]);
  const [kamera, setzeKamera] = useState<string | null>(null);
  const [mikro, setzeMikro] = useState<string | null>(null);
  const [pegel, setzePegel] = useState(0);
  const [laedt, setzeLaedt] = useState(false);
  const [huerde, setzeHuerde] = useState<string | null>(null);
  const [gefragt, setzeGefragt] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const stromRef = useRef<MediaStream | null>(null);

  /** Den laufenden Strom beenden — vollständig, nicht halb. */
  const beende = useCallback(() => {
    for (const spur of stromRef.current?.getTracks() ?? []) spur.stop();
    stromRef.current = null;
  }, []);

  useEffect(() => () => beende(), [beende]);

  /** Kamera und Mikrofon öffnen — beim ersten Mal und bei jedem Wechsel. */
  const oeffne = useCallback(
    async (wunsch: { kamera?: string | null; mikro?: string | null }) => {
      setzeHuerde(null);
      setzeLaedt(true);
      beende();
      try {
        const neu = await navigator.mediaDevices.getUserMedia({
          video: wunsch.kamera ? { deviceId: { exact: wunsch.kamera } } : true,
          audio: wunsch.mikro ? { deviceId: { exact: wunsch.mikro } } : true,
        });
        stromRef.current = neu;
        setzeStrom(neu);
        /*
          Die Geräteliste trägt erst nach der Freigabe Namen.

          Vorher heißt jede Kamera „camera2" und jedes Mikrofon „audioinput"
          — eine Auswahl, in der niemand etwas wiedererkennt.
        */
        const geraete = await navigator.mediaDevices.enumerateDevices();
        setzeKameras(geraete.filter((g) => g.kind === "videoinput"));
        setzeMikrofone(geraete.filter((g) => g.kind === "audioinput"));
        const v = neu.getVideoTracks()[0]?.getSettings().deviceId ?? null;
        const a = neu.getAudioTracks()[0]?.getSettings().deviceId ?? null;
        setzeKamera(v);
        setzeMikro(a);
        setzeGefragt(true);
      } catch (fehler) {
        setzeHuerde(nenneGrund(fehler));
        setzeGefragt(true);
      } finally {
        setzeLaedt(false);
      }
    },
    [beende]
  );

  // Das Bild an das Element hängen, sobald beides da ist.
  useEffect(() => {
    if (videoRef.current && strom) videoRef.current.srcObject = strom;
  }, [strom]);

  /*
    Der Ausschlag am Mikrofon.

    Die Zahl ist nebensächlich; gebraucht wird die Gewissheit, dass der Ton
    überhaupt ankommt. Ohne ihn redet man im Gespräch gegen ein stummes
    Mikrofon, und niemand sagt es einem.
  */
  useEffect(() => {
    if (!strom || strom.getAudioTracks().length === 0) return;
    let offen = true;
    const kontext = new AudioContext();
    const quelle = kontext.createMediaStreamSource(strom);
    const messer = kontext.createAnalyser();
    messer.fftSize = 512;
    quelle.connect(messer);
    const daten = new Uint8Array(messer.frequencyBinCount);
    const takt = () => {
      if (!offen) return;
      messer.getByteFrequencyData(daten);
      let summe = 0;
      for (const d of daten) summe += d;
      setzePegel(Math.min(1, summe / daten.length / 70));
      requestAnimationFrame(takt);
    };
    takt();
    return () => {
      offen = false;
      quelle.disconnect();
      void kontext.close();
    };
  }, [strom]);

  function betreten(ohneKamera: boolean) {
    // Erst die Kamera freigeben, dann das Gespräch — nie beides zugleich.
    beende();
    onBetreten({
      name: name.trim(),
      kamera: ohneKamera ? null : kamera,
      mikro,
      ohneKamera,
    });
  }

  const bereit = !nameAendern || name.trim().length >= 2;
  const feld =
    "w-full px-3 py-2 rounded-lg bg-[#04080f] border border-[#16263d] text-[#dce9f6] " +
    "text-[12.5px] focus:outline-none focus:border-[rgba(0,184,255,.45)]";

  return (
    <div className="w-full max-w-[720px] mx-auto">
      <div className="rounded-2xl border border-[#16263d] bg-[#0a121c] overflow-hidden">
        {/* Vorschau */}
        <div className="relative bg-black aspect-video">
          {strom && !huerde ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-contain"
              style={{ transform: "scaleX(-1)" }}
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-8 text-center">
              {laedt ? (
                <Loader2 size={22} className="text-[#00b8ff] animate-spin" />
              ) : (
                <VideoOff size={22} className="text-[#2a4059]" />
              )}
              <p className="text-[#5b6b7f] text-xs leading-relaxed max-w-sm">
                {huerde ??
                  (gefragt
                    ? "Kein Bild."
                    : "Für Bild und Ton brauchen wir einmal Ihre Freigabe.")}
              </p>
              {!gefragt && !laedt && (
                <button
                  onClick={() => void oeffne({})}
                  className="px-4 py-2 rounded-lg bg-[#00b8ff] text-[#041018] text-xs font-bold hover:bg-[#33c7ff] transition-colors"
                >
                  Kamera und Mikrofon freigeben
                </button>
              )}
            </div>
          )}

          {/* Pegel */}
          {strom && (
            <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2">
              <Mic size={12} className="text-[#8da3bd] flex-shrink-0" />
              <div className="h-1 flex-1 rounded-full bg-[rgba(255,255,255,.14)] overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#2ee6c5] transition-[width] duration-75"
                  style={{ width: `${Math.round(pegel * 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Wahl */}
        <div className="p-5 space-y-3">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#3f5572]">
              Gleich geht es los
            </p>
            <h2 className="text-[#f0f0f0] text-base font-semibold mt-0.5">{titel}</h2>
          </div>

          {nameAendern && (
            <div>
              <label className="block text-[11px] text-[#5b6b7f] mb-1">Ihr Name</label>
              <input
                value={name}
                onChange={(e) => setzeName(e.target.value)}
                placeholder="Vor- und Nachname"
                className={feld}
              />
            </div>
          )}

          {gefragt && !huerde && (
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-[#5b6b7f] mb-1">Kamera</label>
                <select
                  value={kamera ?? ""}
                  onChange={(e) => void oeffne({ kamera: e.target.value, mikro })}
                  className={feld}
                >
                  {kameras.length === 0 && <option value="">Keine gefunden</option>}
                  {kameras.map((k, i) => (
                    <option key={k.deviceId || i} value={k.deviceId}>
                      {k.label || `Kamera ${i + 1}`}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-[#5b6b7f] mb-1">Mikrofon</label>
                <select
                  value={mikro ?? ""}
                  onChange={(e) => void oeffne({ kamera, mikro: e.target.value })}
                  className={feld}
                >
                  {mikrofone.length === 0 && <option value="">Keines gefunden</option>}
                  {mikrofone.map((m, i) => (
                    <option key={m.deviceId || i} value={m.deviceId}>
                      {m.label || `Mikrofon ${i + 1}`}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              onClick={() => betreten(false)}
              disabled={!bereit || !strom || Boolean(huerde)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#00b8ff]
                text-[#041018] text-sm font-bold hover:bg-[#33c7ff]
                disabled:bg-[#16283d] disabled:text-[#4a5a70] transition-colors"
            >
              <VideoIcon size={15} /> Beitreten
            </button>
            {gefragt && (
              <button
                onClick={() => betreten(true)}
                disabled={!bereit}
                className="px-4 py-2.5 rounded-xl border border-[#1a2840] text-[#8899b4]
                  text-xs font-medium hover:text-[#dce9f6] disabled:opacity-40 transition-colors"
              >
                Ohne Kamera beitreten
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
