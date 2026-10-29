"use client";

import { useState } from "react";
import { OkunCall } from "@/components/closing/okun-call";
import { Vorraum, type VorraumWahl } from "@/components/closing/vorraum";
import { OkunLogo } from "@/components/layout/okun-logo";

/**
 * Der Gast betritt den Raum — unter seinem Namen und in unserem Haus.
 *
 * Erst der Vorraum: eigenes Bild, Kamera und Mikrofon zur Wahl, ein
 * Ausschlag, der zeigt, dass der Ton ankommt. Wer dort sieht, was gesendet
 * wird, steht später nicht im Gespräch und wundert sich.
 */
export function GastRaum({
  raumUrl,
  titel,
  vorschlag,
}: {
  raumUrl: string;
  titel: string;
  vorschlag: string;
}) {
  const [wahl, setzeWahl] = useState<VorraumWahl | null>(null);

  if (!wahl) {
    return <Vorraum titel={titel} vorschlag={vorschlag} onBetreten={setzeWahl} />;
  }

  return (
    <div className="fixed inset-0 z-[120] bg-[#04080f]">
      <OkunCall
        roomUrl={raumUrl}
        userName={wahl.name}
        role="client"
        slide={null}
        startOhneKamera={wahl.ohneKamera}
        kameraId={wahl.kamera}
        mikroId={wahl.mikro}
        /*
          Verlassen heißt: Seite neu laden.

          Beim Verlassen räumt daily-react das Gesprächsobjekt ab — und gibt
          es beim nächsten Beitritt in genau diesem Zustand wieder heraus.
          Der zweite Beitritt stirbt dann mit „undefined is not an object".
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
            <div className="px-4 py-3 border-t border-[#0f1d2f] flex justify-center">
              {steuerung}
            </div>
          </div>
        )}
      />
    </div>
  );
}
