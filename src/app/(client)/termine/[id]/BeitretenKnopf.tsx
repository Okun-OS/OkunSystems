"use client";

import { useState } from "react";
import { Video } from "lucide-react";
import { OkunCall } from "@/components/closing/okun-call";
import { Vorraum, type VorraumWahl } from "@/components/closing/vorraum";
import { OkunLogo } from "@/components/layout/okun-logo";

/**
 * Der Weg ins Gespräch, von der Kundenseite.
 *
 * Erst der Vorraum — eigenes Bild, Kamera und Mikrofon zur Wahl —, dann
 * das Gespräch. Ohne Ticket: Der Kunde nimmt teil, mehr nicht. Das
 * Mithören startet die Beraterseite, und alle sehen es.
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
  const [offen, setzeOffen] = useState(false);
  const [wahl, setzeWahl] = useState<VorraumWahl | null>(null);

  if (!offen) {
    return (
      <button
        onClick={() => setzeOffen(true)}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#00b8ff]
          text-[#041018] text-sm font-semibold hover:bg-[#33c7ff] transition-colors"
      >
        <Video size={15} /> Dem Gespräch beitreten
      </button>
    );
  }

  if (!wahl) {
    return (
      <div className="fixed inset-0 z-[120] bg-[#04080f] overflow-y-auto py-10 px-4">
        <div className="flex justify-center mb-7">
          <div className="w-[150px]">
            <OkunLogo size="sm" />
          </div>
        </div>
        <Vorraum
          titel={titel}
          vorschlag={name}
          nameAendern={false}
          onBetreten={setzeWahl}
        />
        <p className="mt-5 text-center">
          <button
            onClick={() => setzeOffen(false)}
            className="text-[#5b6b7f] hover:text-[#c9d4e4] text-xs transition-colors"
          >
            Abbrechen
          </button>
        </p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[120] bg-[#04080f]">
      <OkunCall
        roomUrl={raumUrl}
        userName={name}
        role="client"
        slide={null}
        startOhneKamera={wahl.ohneKamera}
        kameraId={wahl.kamera}
        mikroId={wahl.mikro}
        // Verlassen lädt neu: Sonst gibt daily-react beim zweiten Beitritt
        // das abgeräumte Gesprächsobjekt heraus.
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
            <div className="px-4 py-3 border-t border-[#0f1d2f] flex justify-center">
              {steuerung}
            </div>
          </div>
        )}
      />
    </div>
  );
}
