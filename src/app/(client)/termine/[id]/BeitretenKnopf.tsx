"use client";

import { useState } from "react";
import { Loader2, Video } from "lucide-react";
import { OkunCall } from "@/components/closing/okun-call";
import { OkunLogo } from "@/components/layout/okun-logo";
import { frageGeraete } from "@/lib/video/geraete";

/**
 * Der Weg ins Gespräch, von der Kundenseite.
 *
 * Ohne Ticket: Der Kunde nimmt teil, mehr nicht. Das Mithören startet die
 * Beraterseite — und alle sehen es, weil Daily es anzeigt.
 *
 * Kamera und Mikrofon werden im Klick freigegeben: Ein Browser fragt nur,
 * wenn die Frage aus einer Handlung des Benutzers kommt. Sonst bleibt der
 * Beitritt hängen, ohne dass jemand den Grund sieht.
 */
export function BeitretenKnopf({
  raumUrl,
  titel,
  name,
}: {
  raumUrl: string;
  titel: string;
  name: string;
}) {
  const [drin, setzeDrin] = useState(false);
  const [fragt, setzeFragt] = useState(false);
  const [ohneKamera, setzeOhneKamera] = useState(false);
  const [huerde, setzeHuerde] = useState<string | null>(null);

  async function betreten() {
    setzeHuerde(null);
    setzeFragt(true);
    try {
      const antwort = await frageGeraete();
      if (!antwort.ok) {
        setzeHuerde(antwort.grund);
        return;
      }
      setzeOhneKamera(!antwort.kamera);
      setzeDrin(true);
    } finally {
      setzeFragt(false);
    }
  }

  if (!drin) {
    return (
      <div className="space-y-3">
        <button
          onClick={() => void betreten()}
          disabled={fragt}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#00b8ff]
            text-[#041018] text-sm font-semibold hover:bg-[#33c7ff]
            disabled:bg-[#16283d] disabled:text-[#4a5a70] transition-colors"
        >
          {fragt ? <Loader2 size={15} className="animate-spin" /> : <Video size={15} />}
          {fragt ? "Kamera und Mikrofon freigeben…" : "Dem Gespräch beitreten"}
        </button>

        {huerde && (
          <div className="px-3.5 py-3 rounded-xl bg-[rgba(240,80,74,.08)] border border-[rgba(240,80,74,.25)]">
            <p className="text-[#f0a09a] text-xs leading-relaxed">{huerde}</p>
            <button
              onClick={() => {
                setzeOhneKamera(true);
                setzeDrin(true);
              }}
              className="mt-2.5 px-3.5 py-2 rounded-lg border border-[#1a2840] text-[#c9d4e4]
                text-xs font-medium hover:border-[rgba(0,184,255,.4)] transition-colors"
            >
              Trotzdem beitreten
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[120] bg-[#04080f]">
      <OkunCall
        roomUrl={raumUrl}
        userName={name}
        role="client"
        startOhneKamera={ohneKamera}
        slide={null}
        /*
          Verlassen heißt: Seite neu laden.

          Sonst gibt daily-react beim zweiten Beitritt das abgeräumte
          Gesprächsobjekt heraus, und der Beitritt stirbt mit
          „undefined is not an object". Nach dem Neuladen steht wieder der
          Termin mit dem Knopf da.
        */
        onLeave={() => window.location.reload()}
        stageLayout={({ kacheln, steuerung }) => (
          <div className="h-full flex flex-col">
            <div className="px-5 py-2.5 border-b border-[#0f1d2f] flex flex-col items-center">
              <div className="w-[116px]">
                <OkunLogo size="sm" />
              </div>
              <h1 className="mt-1 text-[#8da3bd] text-xs font-medium truncate max-w-full">
                {titel}
              </h1>
            </div>
            <div className="flex-1 min-h-0 p-4">{kacheln}</div>
            <div className="px-4 py-3 border-t border-[#0f1d2f]">{steuerung}</div>
          </div>
        )}
      />
    </div>
  );
}
