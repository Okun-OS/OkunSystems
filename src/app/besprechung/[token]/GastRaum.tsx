"use client";

import { useState } from "react";
import { Loader2, Video } from "lucide-react";
import { OkunCall } from "@/components/closing/okun-call";
import { OkunLogo } from "@/components/layout/okun-logo";
import { frageGeraete } from "@/lib/video/geraete";

/**
 * Der Gast betritt den Raum — unter seinem Namen und in unserem Haus.
 *
 * Der Name wird gefragt, nicht geraten: Im Gespräch steht er an der Kachel,
 * und „Gast" an einer Kachel ist das Gegenteil von persönlich.
 *
 * Kamera und Mikrofon werden hier im Klick freigegeben, nicht erst im
 * Gespräch. Ein Browser fragt nur, wenn die Frage aus einer Handlung des
 * Benutzers kommt; kommt sie später aus einem Effekt, bleibt der Beitritt
 * stumm hängen. Und ist etwas gesperrt, steht der Grund hier — nicht hinter
 * einem Kreisel, der sich dreht.
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
          onClick={() => void betreten()}
          disabled={name.trim().length < 2 || fragt}
          className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl
            bg-[#00b8ff] text-[#041018] text-sm font-bold hover:bg-[#33c7ff]
            disabled:bg-[#16283d] disabled:text-[#4a5a70] transition-colors"
        >
          {fragt ? <Loader2 size={15} className="animate-spin" /> : <Video size={15} />}
          {fragt ? "Kamera und Mikrofon freigeben…" : "Gespräch betreten"}
        </button>

        {huerde && (
          <div className="px-3.5 py-3 rounded-xl bg-[rgba(240,80,74,.08)] border border-[rgba(240,80,74,.25)]">
            <p className="text-[#f0a09a] text-xs leading-relaxed">{huerde}</p>
            <button
              onClick={() => {
                /*
                  Trotzdem hinein — ohne Bild und ohne Ton.

                  Zuhören und Mitlesen geht auch so, und wer erst einmal drin
                  ist, kann die Freigabe im Gespräch nachholen. Besser als vor
                  einer verschlossenen Tür zu stehen.
                */
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
        userName={name.trim()}
        role="client"
        startOhneKamera={ohneKamera}
        slide={null}
        /*
          Verlassen heißt: Seite neu laden.

          Beim Verlassen räumt daily-react das Gesprächsobjekt ab — und gibt
          es beim nächsten Beitritt in genau diesem Zustand wieder heraus
          (im Code der Bibliothek steht dazu ein offenes „TODO"). Der zweite
          Beitritt stirbt dann mit „undefined is not an object". Ein Neuladen
          ist der einzige Weg, der das zuverlässig vermeidet, und kostet hier
          nichts: Danach steht wieder die Eingangsseite mit dem Namensfeld.
        */
        onLeave={() => window.location.reload()}
        stageLayout={({ kacheln, steuerung }) => (
          <div className="h-full flex flex-col">
            {/*
              Das Zeichen in der Mitte, der Titel darunter.

              Der Gast ist auf unserer Seite, sieht aber vor allem das Video.
              Die Zeile links oben ging dabei unter. In der Mitte, über dem
              Bild, ist das Haus zu erkennen, ohne dass es Platz kostet.
            */}
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
