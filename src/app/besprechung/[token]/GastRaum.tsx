"use client";

import { useState } from "react";
import { Video } from "lucide-react";
import { OkunCall } from "@/components/closing/okun-call";

/**
 * Der Gast betritt den Raum — unter seinem Namen und in unserem Haus.
 *
 * Der Name wird gefragt, nicht geraten: Im Gespräch steht er an der Kachel,
 * und „Gast" an einer Kachel ist das Gegenteil von persönlich.
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
  const [name, setzeName] = useState(vorschlag);
  const [drin, setzeDrin] = useState(false);

  if (!drin) {
    return (
      <div className="space-y-3">
        <div>
          <label className="block text-[11px] font-medium text-[#5b6b7f] mb-1.5">
            Ihr Name
          </label>
          <input
            value={name}
            onChange={(e) => setzeName(e.target.value)}
            placeholder="Vor- und Nachname"
            className="w-full px-3.5 py-2.5 rounded-xl bg-[#04080f] border border-[#16263d]
              text-[#f0f0f0] text-sm placeholder-[#33465e]
              focus:outline-none focus:border-[rgba(0,184,255,.45)]"
          />
        </div>
        <button
          onClick={() => setzeDrin(true)}
          disabled={name.trim().length < 2}
          className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl
            bg-[#00b8ff] text-[#041018] text-sm font-bold hover:bg-[#33c7ff]
            disabled:bg-[#16283d] disabled:text-[#4a5a70] transition-colors"
        >
          <Video size={15} /> Gespräch betreten
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[120] bg-[#04080f]">
      <OkunCall
        roomUrl={raumUrl}
        userName={name.trim()}
        role="client"
        slide={null}
        onLeave={() => setzeDrin(false)}
        stageLayout={({ kacheln, steuerung }) => (
          <div className="h-full flex flex-col">
            <div className="px-5 py-3 border-b border-[#0f1d2f] flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#3f5572]">
                  Besprechung · OKUN Systems
                </p>
                <h1 className="text-[#f0f0f0] text-sm font-semibold truncate">{titel}</h1>
              </div>
            </div>
            <div className="flex-1 min-h-0 p-4 overflow-y-auto">{kacheln}</div>
            <div className="px-4 py-3 border-t border-[#0f1d2f]">{steuerung}</div>
          </div>
        )}
      />
    </div>
  );
}
