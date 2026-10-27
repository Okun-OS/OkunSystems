"use client";

import { useState } from "react";
import { Video } from "lucide-react";
import { OkunCall } from "@/components/closing/okun-call";

/**
 * Der Weg ins Gespräch, von der Kundenseite.
 *
 * Ohne Ticket: Der Kunde nimmt teil, mehr nicht. Das Mithören startet die
 * Beraterseite — und alle sehen es, weil Daily es anzeigt.
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

  if (!drin) {
    return (
      <button
        onClick={() => setzeDrin(true)}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#00b8ff]
          text-[#041018] text-sm font-semibold hover:bg-[#33c7ff] transition-colors"
      >
        <Video size={15} /> Dem Gespräch beitreten
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-[120] bg-[#04080f]">
      <OkunCall
        roomUrl={raumUrl}
        userName={name}
        role="client"
        slide={null}
        onLeave={() => setzeDrin(false)}
        stageLayout={({ kacheln, steuerung }) => (
          <div className="h-full flex flex-col">
            <div className="px-5 py-3 border-b border-[#0f1d2f]">
              <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#3f5572]">
                Besprechung
              </p>
              <h1 className="text-[#f0f0f0] text-sm font-semibold truncate">{titel}</h1>
            </div>
            <div className="flex-1 min-h-0 p-4 overflow-y-auto">{kacheln}</div>
            <div className="px-4 py-3 border-t border-[#0f1d2f]">{steuerung}</div>
          </div>
        )}
      />
    </div>
  );
}
