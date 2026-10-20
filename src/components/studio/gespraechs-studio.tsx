"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Video, ArrowLeft } from "lucide-react";
import { OkunCall } from "@/components/closing/okun-call";
import { Rundgang } from "./rundgang";
import type { StudioDaten } from "@/lib/strategie/studio";
import type { AnsichtKey } from "@/lib/strategie/katalog";
import { ANSICHTEN } from "@/lib/strategie/katalog";

/**
 * Das Strategiegespräch als Arbeitsplatz.
 *
 * Das Haus war bisher eine Seite für sich: Vollbild über allem, und das
 * Gespräch lag darunter. Im Termin ist das falsch herum — der Berater
 * braucht neben dem Haus das Gegenüber und die Auswahl, sonst führt er
 * durch ein Haus und verliert den Faden.
 *
 * Deshalb liegt hier eine Fläche mit zwei Zonen: links das Gespräch und
 * die Maske, rechts das Haus. Dasselbe Muster wie im OKUN Radar, und aus
 * demselben Grund: Die Analyse trägt die Fläche, das Video begleitet sie.
 */

export type GespraechsPosten = {
  id: string;
  titel: string;
  art: string;
  zustand: string;
  womit: string | null;
};

export function GespraechsStudio({
  sitzungId,
  companyId,
  daten,
  untertitel,
  fussnote,
  beraterName,
  posten,
  startOrt,
  grenze,
  zurueckLink,
  onZustand,
}: {
  sitzungId: string;
  companyId: string;
  daten: StudioDaten;
  untertitel: string | null;
  fussnote: string;
  beraterName: string;
  posten: GespraechsPosten[];
  startOrt: AnsichtKey;
  /** Wie viele Automatisierungen das Paket hergibt. */
  grenze: number;
  zurueckLink: string;
  onZustand: (postenId: string, zustand: string) => Promise<{ error?: string } | unknown>;
}) {
  const [raumUrl, setzeRaumUrl] = useState<string | null>(null);
  const [verbindet, setzeVerbindet] = useState(false);
  const [fehler, setzeFehler] = useState<string | null>(null);

  /*
    Jeder Schritt im Haus geht an die Sitzung — die Kundenseite liest ihn
    von dort. Das ist derselbe Draht wie in der Vorschau, nur dass hier
    nebenbei das Gespräch läuft.
  */
  const melde = useCallback(
    async (was: Record<string, unknown>) => {
      try {
        await fetch(`/api/strategie/${sitzungId}/stand`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(was),
        });
      } catch {
        // Ein verlorener Schritt hält das Gespräch nicht an.
      }
    },
    [sitzungId]
  );

  // Solange dieser Arbeitsplatz offen ist, führt der Berater.
  useEffect(() => {
    void melde({ da: true });
    const id = setInterval(() => void melde({ da: true }), 45_000);
    return () => clearInterval(id);
  }, [melde]);

  async function raumOeffnen() {
    setzeVerbindet(true);
    setzeFehler(null);
    try {
      const antwort = await fetch(`/api/strategie/${sitzungId}/raum`, { method: "POST" });
      const daten: { raumUrl?: string; error?: string } = await antwort.json();
      if (!antwort.ok || !daten.raumUrl) {
        setzeFehler(daten.error ?? "Der Videoraum ließ sich nicht öffnen.");
        return;
      }
      setzeRaumUrl(daten.raumUrl);
    } catch {
      setzeFehler("Der Videoraum ließ sich nicht öffnen.");
    } finally {
      setzeVerbindet(false);
    }
  }

  const haus = (
    <Rundgang
      daten={daten}
      untertitel={untertitel}
      fussnote={fussnote}
      ziel={startOrt}
      onOrt={(ort) => void melde({ ansicht: ort })}
      onStufe={(stufe) => void melde({ stufe })}
      eingebettet
    />
  );

  function flaeche(video?: React.ReactNode, steuerung?: React.ReactNode) {
    return (
      <div className="h-full flex">
        <aside className="w-[310px] flex-shrink-0 border-r border-[#0f1d2f] bg-[#060d18] flex flex-col min-h-0">
          <div className="px-4 py-3 border-b border-[#0f1d2f] flex items-center justify-between gap-2">
            <Link
              href={zurueckLink}
              className="flex items-center gap-1.5 text-[#5b6b7f] hover:text-[#c9d4e4] text-xs transition-colors"
            >
              <ArrowLeft size={13} /> Vorbereitung
            </Link>
            <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#3f5572]">
              Schritt 3
            </span>
          </div>

          <div className="p-3 border-b border-[#0f1d2f] space-y-2">
            {video ?? (
              <div className="rounded-xl border border-[#16263d] bg-[#0a1422] px-3 py-5 text-center">
                <p className="text-[#5b6b7f] text-[11px] leading-relaxed mb-3">
                  Das Haus steht. Sobald Sie den Raum öffnen, sieht Ihr Kunde dasselbe
                  und Sie sehen einander.
                </p>
                <button
                  onClick={() => void raumOeffnen()}
                  disabled={verbindet}
                  className="w-full flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg
                    bg-[#00b8ff] text-[#041018] text-[11.5px] font-bold disabled:opacity-60
                    transition-opacity"
                >
                  <Video size={13} />
                  {verbindet ? "Wird geöffnet…" : "Gesprächsraum öffnen"}
                </button>
                {fehler && <p className="mt-2 text-[#f0504a] text-[10.5px]">{fehler}</p>}
              </div>
            )}
            {steuerung}
          </div>

          <Maske posten={posten} grenze={grenze} onZustand={onZustand} />
        </aside>

        {/*
          Das Haus bekommt den Rest der Fläche. `relative` ist hier nicht
          Kosmetik: Der Rundgang legt seine Szenen absolut hinein, und ohne
          diesen Bezugspunkt landete er wieder über dem ganzen Fenster.
        */}
        <div className="flex-1 relative min-w-0 bg-[#02040a]">{haus}</div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[120] bg-[#04080f]">
      {raumUrl ? (
        <OkunCall
          roomUrl={raumUrl}
          userName={beraterName}
          role="advisor"
          slide={null}
          onLeave={() => setzeRaumUrl(null)}
          stageLayout={({ kacheln, steuerung }) => flaeche(kacheln, steuerung)}
        />
      ) : (
        flaeche()
      )}
    </div>
  );
}

/**
 * Die Gesprächsmaske.
 *
 * Im Termin wird nicht mehr vorbereitet, sondern gewählt. Deshalb steht
 * hier nur, was zur Wahl steht, und je Posten drei Knöpfe — und über allem
 * der Stand, damit niemand mehr verspricht, als das Paket hergibt.
 */
function Maske({
  posten,
  grenze,
  onZustand,
}: {
  posten: GespraechsPosten[];
  grenze: number;
  onZustand: (postenId: string, zustand: string) => Promise<{ error?: string } | unknown>;
}) {
  const [pending, startTransition] = useTransition();
  const [fehler, setzeFehler] = useState<string | null>(null);

  const automationen = posten.filter((p) => p.art === "automatisierung");
  const vergeben = automationen.filter((p) => p.zustand === "gewaehlt").length;
  const gewaehlt = posten.filter((p) => p.zustand === "gewaehlt").length;

  function setze(id: string, zustand: string) {
    setzeFehler(null);
    startTransition(async () => {
      const ergebnis = (await onZustand(id, zustand)) as { error?: string } | null;
      if (ergebnis && typeof ergebnis === "object" && "error" in ergebnis && ergebnis.error) {
        setzeFehler(ergebnis.error);
      }
    });
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="px-4 py-3 border-b border-[#0f1d2f] flex items-center justify-between">
        <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#3f5572]">
          Die Auswahl
        </span>
        <span className="font-mono text-[11px] text-[#9fdcff]">
          {vergeben} / {grenze}
          <span className="text-[#3f5572]"> · {gewaehlt} gesamt</span>
        </span>
      </div>

      {fehler && (
        <p className="mx-3 mt-3 px-3 py-2 rounded-lg bg-[rgba(240,80,74,.1)] border border-[rgba(240,80,74,.3)] text-[#f0504a] text-[10.5px]">
          {fehler}
        </p>
      )}

      <ul className="p-3 space-y-2">
        {posten.map((p) => {
          const istGewaehlt = p.zustand === "gewaehlt";
          return (
            <li
              key={p.id}
              className={`rounded-xl border px-3 py-2.5 transition-colors ${
                istGewaehlt
                  ? "border-[rgba(0,184,255,.45)] bg-[rgba(0,184,255,.07)]"
                  : p.zustand === "verworfen"
                    ? "border-[#16263d] bg-transparent opacity-50"
                    : "border-[#16263d] bg-[rgba(255,255,255,.015)]"
              }`}
            >
              <b className="block text-[12px] font-semibold text-[#dce9f6] leading-snug">
                {p.titel}
              </b>
              {p.womit && (
                <span className="block mt-0.5 text-[10px] text-[#5b6b7f]">{p.womit}</span>
              )}
              <div className="mt-2 flex gap-1">
                {(
                  [
                    ["gewaehlt", "Gewählt"],
                    ["spaeter", "Später"],
                    ["verworfen", "Nein"],
                  ] as const
                ).map(([wert, label]) => (
                  <button
                    key={wert}
                    disabled={pending}
                    onClick={() => setze(p.id, wert)}
                    className={`px-2 py-1 rounded-md text-[10px] font-medium transition-colors
                      disabled:opacity-50 ${
                        p.zustand === wert
                          ? "bg-[#00b8ff] text-[#041018]"
                          : "bg-[rgba(255,255,255,.05)] text-[#7d93ad] hover:text-[#dce9f6]"
                      }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </li>
          );
        })}
        {posten.length === 0 && (
          <li className="text-[#44546b] text-[11px] px-1 py-4 text-center">
            Für dieses Gespräch steht nichts zur Wahl.
          </li>
        )}
      </ul>

      <p className="px-4 pb-4 text-[10px] text-[#3f5572] leading-relaxed">
        {ANSICHTEN.length} Orte im Haus. Was Sie hier wählen, steht nach dem Gespräch im
        Schlussraum und im Portal des Kunden.
      </p>
    </div>
  );
}
