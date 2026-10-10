"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  ChevronLeft,
  Eye,
  EyeOff,
  FileDown,
  Flag,
  Loader2,
  Lock,
  Radar as RadarIcon,
  SkipForward,
  Sparkles,
} from "lucide-react";
import { isFailure } from "@/lib/action-result";
import { beiStups, stupseGegenseite } from "@/lib/radar/kanal";
import type { RadarCloserAnsicht } from "@/lib/radar/views";
import { kundenErgebnis } from "@/lib/radar/views";
import { Ergebnisbericht, Fragekarte, STUFEN_FARBE } from "@/components/radar/pieces";
import {
  radarAbschliessen,
  radarAntwortSetzen,
  radarAusblenden,
  radarAuswerten,
  radarEinblenden,
  radarEinschaetzungSpeichern,
  radarErgebnisFreigeben,
  radarFrageUeberspringen,
  radarNotizSpeichern,
  radarProfilSpeichern,
  radarSpotlightWaehlen,
  radarStand,
  radarStarten,
  radarWeiter,
  radarZeigeFrage,
  radarZurueck,
} from "./radar-actions";

/**
 * Das Steuerpult des Closers.
 *
 * Links die Fragen, rechts die aktuelle — und die Regel dahinter: Der Closer
 * führt das Gespräch, nicht die Software. Alles, was er während des
 * Gesprächs braucht, ist ein Klick weit entfernt; alles andere steht ihm
 * nicht im Weg.
 *
 * Er sieht hier mehr als der Interessent: die Absicht hinter jeder Frage,
 * einen Satz zum Vorlesen, wer welche Antwort gesetzt hat, welche Antworten
 * auffallen, die Begründung des Urteils mit ihren Rohwerten und die
 * erkannten Widersprüche. Nichts davon geht über die Leitung zur Kundenseite —
 * die bekommt eine eigens zusammengestellte Sicht, keine gefilterte.
 */

const TAKT_MS = 2500;

type Props = {
  closingSessionId: string;
  initial: RadarCloserAnsicht | null;
  radarAufBuehne: boolean;
  companyName: string;
  onZumAngebot: () => void;
  onGeaendert: () => void;
};

export function RadarPanel({
  closingSessionId,
  initial,
  radarAufBuehne,
  companyName,
  onZumAngebot,
  onGeaendert,
}: Props) {
  const [ansicht, setAnsicht] = useState<RadarCloserAnsicht | null>(initial);
  const [fehler, setFehler] = useState<string | null>(null);
  const [laeuft, startTransition] = useTransition();
  const [notiz, setNotiz] = useState(initial?.internalNotes ?? "");
  const [zeigeErgebnis, setZeigeErgebnis] = useState(false);
  const notizTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const schreibend = useRef(false);

  const uebernehmen = useCallback((ergebnis: unknown) => {
    if (isFailure(ergebnis as object)) {
      setFehler((ergebnis as { error: string }).error);
      return null;
    }
    const daten = ergebnis as { ansicht: RadarCloserAnsicht };
    setFehler(null);
    setAnsicht(daten.ansicht);
    // Die Gegenseite soll nicht auf ihren nächsten Takt warten.
    stupseGegenseite();
    return daten.ansicht;
  }, []);

  // Der Stand wird zyklisch geholt: So sieht der Closer die Antworten des
  // Interessenten, während der sie anklickt. Ein Stups über den Datenkanal
  // des Gesprächs beschleunigt das nur — er ist nicht die Grundlage.
  const holen = useCallback(async () => {
    if (!ansicht || schreibend.current) return;
    const ergebnis = await radarStand(closingSessionId, ansicht.sessionId);
    if (isFailure(ergebnis as object)) return;
    const daten = ergebnis as { ansicht: RadarCloserAnsicht };
    setAnsicht((bisher) => (bisher && bisher.rev === daten.ansicht.rev ? bisher : daten.ansicht));
  }, [closingSessionId, ansicht]);

  useEffect(() => {
    if (!ansicht || ansicht.abgeschlossen) return;
    const id = setInterval(() => void holen(), TAKT_MS);
    return () => clearInterval(id);
  }, [holen, ansicht]);

  useEffect(() => beiStups(() => void holen()), [holen]);

  /**
   * Eine Aktion ausführen.
   *
   * `auffrischen` lädt zusätzlich die Serverseite der Arbeitsfläche neu. Das
   * passiert bewusst nur dort, wo sie etwas davon hat — beim Starten, beim
   * Ein- und Ausblenden, beim Abschluss. Bei jedem Antwortklick die ganze
   * Seite neu aufzubauen, hieße mitten im Gespräch Rechenzeit zu verbrennen
   * für eine Anzeige, die sich nicht ändert.
   */
  function fuehreAus(fn: () => Promise<unknown>, optionen?: { auffrischen?: boolean }) {
    schreibend.current = true;
    startTransition(async () => {
      try {
        uebernehmen(await fn());
        if (optionen?.auffrischen) onGeaendert();
      } finally {
        schreibend.current = false;
      }
    });
  }

  // Die Notiz wird verzögert gespeichert — sonst schriebe jeder Tastendruck
  // in die Datenbank, mitten im Gespräch.
  function notizAendern(text: string) {
    setNotiz(text);
    if (!ansicht) return;
    if (notizTimer.current) clearTimeout(notizTimer.current);
    notizTimer.current = setTimeout(() => {
      void radarNotizSpeichern(closingSessionId, ansicht.sessionId, text);
    }, 800);
  }

  useEffect(() => {
    return () => {
      if (notizTimer.current) clearTimeout(notizTimer.current);
    };
  }, []);

  // ─── Noch keine Analyse ──────────────────────────────────────────────────
  if (!ansicht) {
    return (
      <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-10 text-center">
        <RadarIcon size={28} className="text-[#00b8ff] mx-auto mb-3" />
        <h2 className="text-[#f0f0f0] text-base font-bold mb-1.5">OKUN Radar</h2>
        <p className="text-[#8899b4] text-sm max-w-md mx-auto mb-5">
          Die kostenlose Kurzdiagnose im laufenden Gespräch. Drei Phasen, rund 10 bis 15 Minuten.
          Der Interessent sieht sie im Gesprächsfenster und klickt mit.
        </p>
        <button
          onClick={() => fuehreAus(() => radarStarten(closingSessionId), { auffrischen: true })}
          disabled={laeuft}
          className="px-5 py-2.5 rounded-lg bg-[#00b8ff] text-[#041018] text-sm font-bold disabled:opacity-50 transition-opacity"
        >
          {laeuft ? "Wird geöffnet…" : "Radar starten"}
        </button>
        {fehler && <p className="text-[#fca5a5] text-xs mt-3">{fehler}</p>}
      </div>
    );
  }

  const aktuelle = ansicht.fragen.find((f) => f.key === ansicht.cursorKey) ?? null;
  const auffaelligKeys = new Set(ansicht.auffaellig.map((a) => a.frageKey));

  return (
    <div className="space-y-4">
      {/* Kopfzeile */}
      <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl px-5 py-3.5 flex flex-wrap items-center gap-3">
        <RadarIcon size={16} className="text-[#00b8ff] flex-shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-[#f0f0f0] text-sm font-semibold">
            OKUN Radar
            {ansicht.abgeschlossen && (
              <span className="ml-2 text-[#22c55e] text-xs font-normal">· abgeschlossen</span>
            )}
          </p>
          <p className="text-[#5b6b7f] text-xs">
            {ansicht.fortschritt.beantwortet} von {ansicht.fortschritt.gesamt} Fragen ·{" "}
            {ansicht.fortschritt.prozent} %
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-lg border ${
              radarAufBuehne
                ? "border-[#22c55e]/30 text-[#22c55e]"
                : "border-[#1a2840] text-[#5b6b7f]"
            }`}
            title={
              radarAufBuehne
                ? "Der Interessent sieht die Analyse gerade"
                : "Die Analyse ist beim Interessenten nicht eingeblendet"
            }
          >
            {radarAufBuehne ? <Eye size={11} /> : <EyeOff size={11} />}
            {radarAufBuehne ? "beim Kunden sichtbar" : "ausgeblendet"}
          </span>
          <button
            onClick={() =>
              fuehreAus(async () =>
                radarAufBuehne
                  ? ((await radarAusblenden(closingSessionId)),
                    radarStand(closingSessionId, ansicht.sessionId))
                  : radarEinblenden(closingSessionId, ansicht.sessionId),
                { auffrischen: true }
              )
            }
            disabled={laeuft}
            className="px-2.5 py-1.5 rounded-lg border border-[#1a2840] text-[#8899b4] text-[11px] hover:text-[#f0f0f0] transition-colors disabled:opacity-50"
          >
            {radarAufBuehne ? "Ausblenden" : "Einblenden"}
          </button>
        </div>
      </div>

      {ansicht.katalogVeraltet && (
        <Hinweis>
          Diese Analyse entstand mit einer früheren Fassung des Fragenkatalogs (
          {ansicht.katalogVersion}). Das Ergebnis bleibt gültig, ist aber mit neueren Analysen
          nicht direkt vergleichbar.
        </Hinweis>
      )}
      {fehler && <Hinweis ton="fehler">{fehler}</Hinweis>}

      <div className="grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)] gap-4 items-start">
        {/* ── Fragenliste ──────────────────────────────────────────────── */}
        <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl overflow-hidden">
          <div className="px-3.5 py-2.5 border-b border-[#1a2840] flex items-center justify-between">
            <span className="text-[#5b6b7f] text-[11px] uppercase tracking-wider">Ablauf</span>
            <span className="text-[#44546b] text-[11px]">{ansicht.phase}</span>
          </div>
          <div className="max-h-[520px] overflow-y-auto py-1.5">
            {ansicht.fragen.map((f) => {
              const aktiv = f.key === ansicht.cursorKey;
              const beantwortet = f.gewaehlt.length > 0;
              return (
                <button
                  key={f.key}
                  onClick={() =>
                    fuehreAus(() => radarZeigeFrage(closingSessionId, ansicht.sessionId, f.key))
                  }
                  disabled={laeuft}
                  className={`w-full text-left px-3.5 py-2 flex items-start gap-2.5 transition-colors ${
                    aktiv ? "bg-[rgba(0,184,255,0.08)]" : "hover:bg-[#101b2c]"
                  }`}
                >
                  <span
                    className={`flex-shrink-0 mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center ${
                      f.uebersprungen
                        ? "border-[#f59e0b]/50 text-[#f59e0b]"
                        : beantwortet
                          ? "border-[#22c55e]/60 bg-[rgba(34,197,94,0.15)] text-[#22c55e]"
                          : "border-[#2a3a55]"
                    }`}
                  >
                    {f.uebersprungen ? (
                      <SkipForward size={8} />
                    ) : beantwortet ? (
                      <Check size={9} strokeWidth={3} />
                    ) : null}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className={`block text-[11.5px] leading-snug ${
                        aktiv ? "text-[#eef2f7] font-medium" : "text-[#8899b4]"
                      }`}
                    >
                      {f.frage}
                    </span>
                    <span className="flex items-center gap-1.5 mt-0.5">
                      {f.quelle === "client" && (
                        <span className="text-[#00b8ff] text-[9.5px]">vom Kunden</span>
                      )}
                      {f.quelle === "closer" && (
                        <span className="text-[#5b6b7f] text-[9.5px]">von dir</span>
                      )}
                      {auffaelligKeys.has(f.key) && (
                        <span className="text-[#f59e0b] text-[9.5px] flex items-center gap-0.5">
                          <Flag size={8} /> auffällig
                        </span>
                      )}
                    </span>
                  </span>
                </button>
              );
            })}
            {ansicht.fragen.length === 0 && (
              <p className="px-3.5 py-3 text-[#5b6b7f] text-[11px]">
                Die Fragen erscheinen, sobald das Profil steht.
              </p>
            )}
          </div>
        </div>

        {/* ── Arbeitsfläche ────────────────────────────────────────────── */}
        <div className="space-y-4">
          {ansicht.phase === "profil" && (
            <ProfilBlock
              ansicht={ansicht}
              laeuft={laeuft}
              onSpeichern={(profil) =>
                fuehreAus(() => radarProfilSpeichern(closingSessionId, ansicht.sessionId, profil))
              }
              onWeiter={() => fuehreAus(() => radarWeiter(closingSessionId, ansicht.sessionId))}
            />
          )}

          {ansicht.phase !== "profil" && ansicht.phase !== "ergebnis" && !ansicht.spotlightKey && !aktuelle && (
            <SpotlightWahl
              ansicht={ansicht}
              laeuft={laeuft}
              onWaehlen={(key) =>
                fuehreAus(() => radarSpotlightWaehlen(closingSessionId, ansicht.sessionId, key))
              }
            />
          )}

          {aktuelle && ansicht.phase !== "ergebnis" && (
            <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-5 space-y-4">
              {/* Nur für den Closer */}
              <div className="rounded-lg border border-[#1a2840] bg-[#070d15] px-3.5 py-2.5 space-y-1.5">
                <p className="text-[#5b6b7f] text-[10px] uppercase tracking-wider flex items-center gap-1.5">
                  <Lock size={9} /> Nur für dich
                </p>
                <p className="text-[#8899b4] text-[12px] leading-relaxed">{aktuelle.absicht}</p>
                {aktuelle.vorlesen && (
                  <p className="text-[#c9d4e4] text-[12.5px] leading-relaxed italic border-l-2 border-[#1a2840] pl-2.5 mt-2">
                    „{aktuelle.vorlesen}“
                  </p>
                )}
              </div>

              <Fragekarte
                frage={aktuelle}
                gewaehlt={aktuelle.gewaehlt}
                disabled={laeuft || ansicht.abgeschlossen}
                onWaehlen={(keys) =>
                  fuehreAus(() =>
                    radarAntwortSetzen(closingSessionId, ansicht.sessionId, aktuelle.key, keys)
                  )
                }
              />

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  onClick={() => fuehreAus(() => radarZurueck(closingSessionId, ansicht.sessionId))}
                  disabled={laeuft}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#1a2840] text-[#8899b4] text-xs hover:text-[#f0f0f0] transition-colors disabled:opacity-50"
                >
                  <ChevronLeft size={13} /> Zurück
                </button>
                <button
                  onClick={() =>
                    fuehreAus(() =>
                      radarFrageUeberspringen(closingSessionId, ansicht.sessionId, aktuelle.key)
                    )
                  }
                  disabled={laeuft || ansicht.abgeschlossen}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#1a2840] text-[#8899b4] text-xs hover:text-[#f0f0f0] transition-colors disabled:opacity-50"
                >
                  <SkipForward size={12} /> Überspringen
                </button>
                <div className="flex-1" />
                <button
                  onClick={() => fuehreAus(() => radarWeiter(closingSessionId, ansicht.sessionId))}
                  disabled={laeuft}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#00b8ff] text-[#041018] text-xs font-bold disabled:opacity-50 transition-opacity"
                >
                  {laeuft ? <Loader2 size={12} className="animate-spin" /> : null}
                  Weiter <ArrowRight size={13} />
                </button>
              </div>
            </div>
          )}

          {/*
            Die Auswertung, sobald sie existiert.

            Bewusst an das Ergebnis geknüpft und nicht an die Phase: Vorher
            hing der Block an `phase === "ergebnis"` — und sobald die letzte
            Frage beantwortet war, verschwand der Knopf zum Auswerten und
            stattdessen stand da „Es liegt noch keine Auswertung vor.“ Eine
            Sackgasse am Ende jedes Gesprächs.
          */}
          {ansicht.ergebnis && (
            <AuswertungsBlock
              ansicht={ansicht}
              companyName={companyName}
              laeuft={laeuft}
              zeigeKundensicht={zeigeErgebnis}
              onKundensicht={() => setZeigeErgebnis((v) => !v)}
              closingSessionId={closingSessionId}
              onFreigeben={() =>
                fuehreAus(() => radarErgebnisFreigeben(closingSessionId, ansicht.sessionId))
              }
              onAbschliessen={() =>
                fuehreAus(() => radarAbschliessen(closingSessionId, ansicht.sessionId), {
                  auffrischen: true,
                })
              }
              onEinschaetzung={(stufe, text) =>
                fuehreAus(() =>
                  radarEinschaetzungSpeichern(closingSessionId, ansicht.sessionId, stufe, text)
                )
              }
              onZumAngebot={onZumAngebot}
            />
          )}

          {/*
            Auswerten geht jederzeit — auch mitten im Gespräch. Die Engine
            rechnet dann mit dem, was vorliegt, und weist die geringere
            Aussagekraft aus, statt sich etwas zusammenzureimen.
          */}
          {!ansicht.ergebnis && (
            <div
              className={`flex flex-wrap items-center gap-3 ${
                ansicht.phase === "ergebnis"
                  ? "bg-[#0c1520] border border-[#00b8ff]/30 rounded-xl px-5 py-4"
                  : "justify-end"
              }`}
            >
              {ansicht.phase === "ergebnis" && (
                <p className="text-[#c9d4e4] text-sm flex-1 min-w-0">
                  Alle Fragen sind durch. Jetzt die Auswertung erzeugen und gemeinsam ansehen.
                </p>
              )}
              <button
                onClick={() => fuehreAus(() => radarAuswerten(closingSessionId, ansicht.sessionId))}
                disabled={laeuft}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 ${
                  ansicht.phase === "ergebnis"
                    ? "bg-[#00b8ff] text-[#041018]"
                    : "border border-[#00b8ff]/30 bg-[rgba(0,184,255,0.08)] text-[#00b8ff] hover:bg-[rgba(0,184,255,0.15)]"
                }`}
              >
                <Sparkles size={13} /> Auswertung erzeugen
              </button>
            </div>
          )}

          {/* Interne Notizen */}
          <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-4">
            <label className="flex items-center gap-1.5 text-[#5b6b7f] text-[10px] uppercase tracking-wider mb-2">
              <Lock size={9} /> Interne Gesprächsnotizen — der Kunde sieht sie nie
            </label>
            <textarea
              value={notiz}
              onChange={(e) => notizAendern(e.target.value)}
              rows={4}
              placeholder="Was dir auffällt, Zwischentöne, wer im Raum die Entscheidung trifft…"
              className="w-full px-3 py-2.5 rounded-lg bg-[#070d15] border border-[#16283d] text-[#c9d4e4] text-[13px] outline-none focus:border-[#00b8ff]/40 transition-colors resize-y"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Teilstücke ──────────────────────────────────────────────────────────────

function Hinweis({ children, ton }: { children: React.ReactNode; ton?: "fehler" }) {
  return (
    <div
      className={`rounded-lg border px-4 py-2.5 flex items-start gap-2 ${
        ton === "fehler"
          ? "border-[#ef4444]/30 bg-[rgba(239,68,68,0.06)]"
          : "border-[#f59e0b]/30 bg-[rgba(245,158,11,0.06)]"
      }`}
    >
      <AlertTriangle
        size={13}
        className={`flex-shrink-0 mt-0.5 ${ton === "fehler" ? "text-[#fca5a5]" : "text-[#f59e0b]"}`}
      />
      <p className={`text-xs leading-relaxed ${ton === "fehler" ? "text-[#fca5a5]" : "text-[#fbbf24]"}`}>
        {children}
      </p>
    </div>
  );
}

function ProfilBlock({
  ansicht,
  laeuft,
  onSpeichern,
  onWeiter,
}: {
  ansicht: RadarCloserAnsicht;
  laeuft: boolean;
  onSpeichern: (profil: Record<string, string | string[]>) => void;
  onWeiter: () => void;
}) {
  const [entwurf, setEntwurf] = useState<Record<string, string | string[]>>(ansicht.profil);

  // Der Interessent tippt mit — seinen Stand übernehmen, wenn er sich ändert.
  // Der zuletzt gesehene Serverstand liegt im Zustand, nicht in einem Ref:
  // Während des Renderns einen Ref zu lesen, kann einen Durchlauf verschlucken.
  const serverStand = JSON.stringify(ansicht.profil);
  const [gesehen, setGesehen] = useState(serverStand);
  if (gesehen !== serverStand) {
    setGesehen(serverStand);
    setEntwurf(ansicht.profil);
  }

  const fehlend = ansicht.profilFelder
    .filter((f) => f.pflicht)
    .filter((f) => {
      const w = entwurf[f.key];
      return !w || (Array.isArray(w) ? w.length === 0 : !w.trim());
    });

  return (
    <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-5 space-y-4">
      <div>
        <h3 className="text-[#f0f0f0] text-sm font-semibold">Phase 1 · Unternehmensprofil</h3>
        <p className="text-[#5b6b7f] text-xs mt-0.5">
          Zielzeit 2–3 Minuten. Was aus dem CRM bekannt ist, steht schon da. Der Interessent kann
          selbst ergänzen — ihr seht beide dasselbe Formular.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-3.5">
        {ansicht.profilFelder.map((feld) => {
          const wert = entwurf[feld.key];
          const voll = feld.art === "mehrfach" || feld.key === "herausforderung" || feld.key === "ziel";
          return (
            <div key={feld.key} className={voll ? "sm:col-span-2" : ""}>
              <p className="text-[#5b6b7f] text-[10px] uppercase tracking-wider mb-1.5">
                {feld.label}
                {feld.pflicht && <span className="text-[#f59e0b] ml-1">*</span>}
              </p>
              {feld.art === "text" ? (
                <input
                  value={typeof wert === "string" ? wert : ""}
                  onChange={(e) => setEntwurf({ ...entwurf, [feld.key]: e.target.value })}
                  onBlur={() => onSpeichern(entwurf)}
                  className="w-full px-3 py-2 rounded-lg bg-[#070d15] border border-[#16283d] text-[#eef2f7] text-[13px] outline-none focus:border-[#00b8ff]/40"
                />
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {(feld.optionen ?? []).map((o) => {
                    const an =
                      feld.art === "mehrfach"
                        ? Array.isArray(wert) && wert.includes(o.key)
                        : wert === o.key;
                    return (
                      <button
                        key={o.key}
                        type="button"
                        onClick={() => {
                          const naechster =
                            feld.art === "mehrfach"
                              ? {
                                  ...entwurf,
                                  [feld.key]: an
                                    ? (wert as string[]).filter((k) => k !== o.key)
                                    : [...(Array.isArray(wert) ? wert : []), o.key],
                                }
                              : { ...entwurf, [feld.key]: o.key };
                          setEntwurf(naechster);
                          onSpeichern(naechster);
                        }}
                        className={`px-2.5 py-1.5 rounded-lg border text-[11.5px] transition-colors ${
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
              )}
              {feld.hinweis && (
                <p className="text-[#44546b] text-[10.5px] mt-1 leading-snug">{feld.hinweis}</p>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-3 pt-1">
        <p className="text-[#5b6b7f] text-[11px]">
          {fehlend.length > 0
            ? `Noch offen: ${fehlend.map((f) => f.label).join(", ")}`
            : "Alles Nötige steht."}
        </p>
        <button
          onClick={onWeiter}
          disabled={laeuft}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#00b8ff] text-[#041018] text-xs font-bold disabled:opacity-50"
        >
          Zum Potenzialcheck <ArrowRight size={13} />
        </button>
      </div>
    </div>
  );
}

function SpotlightWahl({
  ansicht,
  laeuft,
  onWaehlen,
}: {
  ansicht: RadarCloserAnsicht;
  laeuft: boolean;
  onWaehlen: (key: string) => void;
}) {
  return (
    <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-5 space-y-3.5">
      <div>
        <h3 className="text-[#f0f0f0] text-sm font-semibold">Phase 3 · Prozess-Spotlight</h3>
        <p className="text-[#5b6b7f] text-xs mt-0.5">
          Zielzeit 2–4 Minuten. Einen Ablauf gemeinsam auswählen — fünf Fragen, keine
          Prozessaufnahme. Die gehört in den Blueprint.
        </p>
      </div>
      <div className="grid sm:grid-cols-2 gap-2">
        {ansicht.spotlightAuswahl.map((p) => (
          <button
            key={p.key}
            onClick={() => onWaehlen(p.key)}
            disabled={laeuft}
            className={`text-left px-3.5 py-2.5 rounded-lg border transition-colors disabled:opacity-50 ${
              p.empfohlen
                ? "border-[#00b8ff]/30 bg-[rgba(0,184,255,0.05)] hover:border-[#00b8ff]/60"
                : "border-[#16283d] hover:border-[#2a3a55]"
            }`}
          >
            <span className="block text-[#c9d4e4] text-[13px]">{p.label}</span>
            {p.empfohlen && (
              <span className="block text-[#00b8ff] text-[10px] mt-0.5">
                passt zum angegebenen Profil
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

function AuswertungsBlock({
  ansicht,
  companyName,
  laeuft,
  zeigeKundensicht,
  onKundensicht,
  closingSessionId,
  onFreigeben,
  onAbschliessen,
  onEinschaetzung,
  onZumAngebot,
}: {
  ansicht: RadarCloserAnsicht;
  companyName: string;
  laeuft: boolean;
  zeigeKundensicht: boolean;
  onKundensicht: () => void;
  closingSessionId: string;
  onFreigeben: () => void;
  onAbschliessen: () => void;
  onEinschaetzung: (stufe: "A" | "B" | "C", notiz: string) => void;
  onZumAngebot: () => void;
}) {
  const e = ansicht.ergebnis;
  const [stufe, setStufe] = useState<"A" | "B" | "C">((ansicht.closerStufe as "A") ?? "B");
  const [begruendung, setBegruendung] = useState(ansicht.closerNotiz ?? "");
  const [abweichend, setAbweichend] = useState(Boolean(ansicht.closerStufe));

  if (!e) {
    return (
      <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-6 text-center">
        <p className="text-[#8899b4] text-sm">Es liegt noch keine Auswertung vor.</p>
      </div>
    );
  }

  const farbe = STUFEN_FARBE[e.stufe] ?? STUFEN_FARBE.B;

  return (
    <div className="space-y-4">
      {/* Urteil mit Begründung — intern */}
      <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[#1a2840] flex flex-wrap items-center gap-3">
          <span className={`px-2.5 py-1 rounded-lg border text-xs font-bold ${farbe.rand} ${farbe.flaeche} ${farbe.schrift}`}>
            Stufe {e.stufe}
          </span>
          <span className="text-[#f0f0f0] text-sm font-semibold flex-1 min-w-0">{e.stufeTitel}</span>
          <span className="text-[#5b6b7f] text-[11px]">
            Aussagekraft {e.aussagekraft} %
            {!e.zahlenBelastbar && " · Kategorien statt Zahlen"}
          </span>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div className="grid sm:grid-cols-3 gap-3">
            {e.achsen.map((a) => (
              <div key={a.achse} className="rounded-lg border border-[#16283d] bg-[#070d15] px-3 py-2.5">
                <p className="text-[#5b6b7f] text-[10px] uppercase tracking-wider">{a.label}</p>
                <p className="text-[#eef2f7] text-lg font-bold tabular-nums mt-0.5">
                  {a.wert}
                  <span className="text-[#44546b] text-xs font-normal"> / 100</span>
                </p>
                <p className="text-[#44546b] text-[10px]">
                  {a.band} · {a.beitraege} Beiträge
                </p>
              </div>
            ))}
          </div>

          <Abschnitt titel="Warum diese Stufe">
            <ul className="space-y-1">
              {e.stufeGrund.map((g, i) => (
                <li key={i} className="text-[#c9d4e4] text-[12.5px] leading-relaxed">
                  {g}
                </li>
              ))}
            </ul>
          </Abschnitt>

          {e.widersprueche.length > 0 && (
            <Abschnitt titel="Widersprüche — im Gespräch auflösen" ton="warnung">
              <ul className="space-y-1.5">
                {e.widersprueche.map((w, i) => (
                  <li key={i} className="text-[#fbbf24] text-[12.5px] leading-relaxed">
                    {w}
                  </li>
                ))}
              </ul>
            </Abschnitt>
          )}

          {e.offeneFragen.length > 0 && (
            <Abschnitt titel={`Offen geblieben (${e.offeneFragen.length})`}>
              <ul className="space-y-1">
                {e.offeneFragen.map((f) => (
                  <li key={f.frageKey} className="text-[#8899b4] text-[12px] leading-relaxed">
                    {f.frage}
                  </li>
                ))}
              </ul>
            </Abschnitt>
          )}

          <Abschnitt titel="Belege">
            <div className="grid sm:grid-cols-3 gap-3">
              {(["reife", "potenzial", "fit"] as const).map((achse) => (
                <div key={achse}>
                  <p className="text-[#44546b] text-[10px] uppercase tracking-wider mb-1">{achse}</p>
                  <ul className="space-y-0.5">
                    {e.belege[achse].map((b, i) => (
                      <li key={i} className="text-[#8899b4] text-[11px] leading-snug">
                        {b}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </Abschnitt>
        </div>
      </div>

      {/* Abweichende Einschätzung */}
      <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[#f0f0f0] text-[13px] font-semibold">Deine eigene Einschätzung</p>
          {!abweichend && (
            <button
              onClick={() => setAbweichend(true)}
              className="text-[#8899b4] text-[11px] hover:text-[#00b8ff] transition-colors"
            >
              Abweichend einschätzen
            </button>
          )}
        </div>
        <p className="text-[#5b6b7f] text-[11px] leading-relaxed">
          Sie tritt neben das Systemurteil, statt es zu ersetzen. Beide bleiben im Protokoll
          lesbar — der Kunde sieht nur das Systemurteil.
        </p>
        {abweichend && (
          <>
            <div className="flex gap-1.5">
              {(["A", "B", "C"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStufe(s)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
                    stufe === s
                      ? `${STUFEN_FARBE[s].rand} ${STUFEN_FARBE[s].flaeche} ${STUFEN_FARBE[s].schrift}`
                      : "border-[#1a2840] text-[#5b6b7f]"
                  }`}
                >
                  Stufe {s}
                </button>
              ))}
            </div>
            <textarea
              value={begruendung}
              onChange={(ev) => setBegruendung(ev.target.value)}
              rows={3}
              placeholder="Warum schätzt du es anders ein? Ohne Begründung wird nichts gespeichert."
              className="w-full px-3 py-2.5 rounded-lg bg-[#070d15] border border-[#16283d] text-[#c9d4e4] text-[12.5px] outline-none focus:border-[#00b8ff]/40 resize-y"
            />
            <button
              onClick={() => onEinschaetzung(stufe, begruendung)}
              disabled={laeuft || !begruendung.trim()}
              className="px-3.5 py-2 rounded-lg border border-[#1a2840] text-[#c9d4e4] text-xs font-semibold hover:border-[#2a3a55] disabled:opacity-40 transition-colors"
            >
              Einschätzung festhalten
            </button>
            {ansicht.closerStufe && (
              <p className="text-[#5b6b7f] text-[11px]">
                Festgehalten: Stufe {ansicht.closerStufe} — das Systemurteil bleibt Stufe {e.stufe}.
              </p>
            )}
          </>
        )}
      </div>

      {/* Kundensicht und Übergabe */}
      <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onKundensicht}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#1a2840] text-[#8899b4] text-xs hover:text-[#f0f0f0] transition-colors"
          >
            <Eye size={12} /> {zeigeKundensicht ? "Kundensicht ausblenden" : "Kundensicht ansehen"}
          </button>
          <button
            onClick={onFreigeben}
            disabled={laeuft || ansicht.freigegeben}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#00b8ff] text-[#041018] text-xs font-bold disabled:bg-[#1a2840] disabled:text-[#5b6b7f] transition-colors"
          >
            {ansicht.freigegeben ? <Check size={12} /> : <Eye size={12} />}
            {ansicht.freigegeben ? "Für den Kunden sichtbar" : "Ergebnis freigeben"}
          </button>
          <a
            href={`/api/admin/radar/pdf?radarSessionId=${encodeURIComponent(ansicht.sessionId)}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#1a2840] text-[#8899b4] text-xs hover:text-[#f0f0f0] transition-colors"
          >
            <FileDown size={12} /> Bericht als PDF
          </a>
          <div className="flex-1" />
          <button
            onClick={onAbschliessen}
            disabled={laeuft || ansicht.abgeschlossen}
            className="px-3.5 py-2 rounded-lg border border-[#22c55e]/30 text-[#22c55e] text-xs font-semibold hover:bg-[rgba(34,197,94,0.08)] disabled:opacity-40 transition-colors"
          >
            {ansicht.abgeschlossen ? "Abgeschlossen" : "Analyse abschließen"}
          </button>
        </div>

        {/* Übergang in den bestehenden Vertriebsprozess */}
        <div className="pt-3 border-t border-[#101b2c] flex flex-wrap items-center gap-3">
          <p className="text-[#5b6b7f] text-[11px] flex-1 min-w-0">
            {e.stufe === "C"
              ? "Bei diesem Ergebnis gehört kein Angebot ins Gespräch. Das auszusprechen ist die bessere Visitenkarte."
              : "Weiter im gewohnten Ablauf: Angebot auswählen, vorstellen, Vertragsabschluss."}
          </p>
          <button
            onClick={() => {
              // Das Radar von der Kundenbühne nehmen, damit dort Platz für das
              // Angebot ist — der bestehende Ablauf übernimmt ab hier.
              void radarAusblenden(closingSessionId).then(() => onZumAngebot());
            }}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
              e.stufe === "C"
                ? "border border-[#1a2840] text-[#8899b4] hover:text-[#f0f0f0]"
                : "bg-[#22c55e] text-[#041018]"
            }`}
          >
            Zum Angebot <ArrowRight size={13} />
          </button>
        </div>
      </div>

      {zeigeKundensicht && (
        <div className="bg-[#070d15] border border-[#1a2840] rounded-xl p-5">
          <p className="text-[#5b6b7f] text-[10px] uppercase tracking-wider mb-3">
            So sieht es der Kunde
          </p>
          <Ergebnisbericht
            ergebnis={kundenErgebnis(e, e.berechnetAm)}
            companyName={companyName}
          />
        </div>
      )}
    </div>
  );
}

function Abschnitt({
  titel,
  children,
  ton,
}: {
  titel: string;
  children: React.ReactNode;
  ton?: "warnung";
}) {
  return (
    <div
      className={`rounded-lg border px-3.5 py-3 ${
        ton === "warnung"
          ? "border-[#f59e0b]/25 bg-[rgba(245,158,11,0.05)]"
          : "border-[#16283d] bg-[#070d15]"
      }`}
    >
      <p
        className={`text-[10px] uppercase tracking-wider mb-2 ${
          ton === "warnung" ? "text-[#f59e0b]" : "text-[#5b6b7f]"
        }`}
      >
        {titel}
      </p>
      {children}
    </div>
  );
}
