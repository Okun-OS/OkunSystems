"use client";

import { useEffect, useRef, useState } from "react";
import { MessageSquare, Send, X } from "lucide-react";

/**
 * Der Chat im Gespräch.
 *
 * Er ist nicht zum Plaudern da, sondern für den Moment, in dem die Technik
 * klemmt: „Ich sehe Sie nicht mehr", „Ton ist weg", „einen Moment, ich
 * komme wieder rein". Ohne ihn bleibt in so einem Moment nur das Telefon —
 * und die Nummer hat selten jemand zur Hand.
 *
 * Deshalb läuft er über denselben Datenkanal wie der Zeiger und die
 * Radar-Stupser (`sendAppMessage`) und ist in **jedem** Gespräch da:
 * Closing, Radar, Strategiegespräch. Er wird nirgends gespeichert — was im
 * Gespräch geschrieben wurde, ist mit dem Gespräch vorbei. Für alles, was
 * bleiben soll, gibt es das Protokoll.
 *
 * Eine Nachricht erreicht nur, wer gerade im Raum ist. Wer rausgeflogen ist,
 * sieht sie nicht — deshalb steht beim Senden dabei, wie viele mithören.
 */

export type ChatNachricht = {
  id: string;
  von: string;
  text: string;
  zeit: number;
  eigen: boolean;
};

export function CallChat({
  nachrichten,
  offen,
  ungelesen,
  teilnehmer,
  onOeffnen,
  onSchliessen,
  onSenden,
}: {
  nachrichten: ChatNachricht[];
  offen: boolean;
  ungelesen: number;
  /** Wie viele außer einem selbst im Raum sind. */
  teilnehmer: number;
  onOeffnen: () => void;
  onSchliessen: () => void;
  onSenden: (text: string) => void;
}) {
  const [entwurf, setEntwurf] = useState("");
  const ende = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (offen) ende.current?.scrollIntoView({ block: "end" });
  }, [offen, nachrichten.length]);

  if (!offen) {
    return (
      <button
        type="button"
        onClick={onOeffnen}
        aria-label="Chat öffnen"
        className="fixed bottom-4 right-4 z-[60] flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-[#17304d] bg-[#0a1322]/95 backdrop-blur text-[#8899b4] text-[12.5px] font-medium shadow-[0_18px_44px_-20px_rgba(0,0,0,0.9)] hover:text-[#eef2f7] hover:border-[#24415f] transition-colors"
      >
        <MessageSquare size={14} />
        Chat
        {ungelesen > 0 && (
          <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-[#00b8ff] text-[#041018] font-mono text-[10px] font-bold flex items-center justify-center tabular-nums">
            {ungelesen > 9 ? "9+" : ungelesen}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-[60] w-[min(340px,calc(100vw-2rem))] max-h-[min(460px,70vh)] flex flex-col rounded-2xl border border-[#17304d] bg-[#070d17]/97 backdrop-blur shadow-[0_28px_70px_-28px_rgba(0,0,0,0.95)] overflow-hidden">
      <div className="flex-shrink-0 flex items-center justify-between gap-2 px-3.5 py-2.5 border-b border-[#122339]">
        <p className="flex items-center gap-2 text-[#cfe0f2] text-[12.5px] font-semibold">
          <MessageSquare size={13} className="text-[#00b8ff]" />
          Chat
        </p>
        <button
          type="button"
          onClick={onSchliessen}
          aria-label="Chat schließen"
          className="p-1 rounded-lg text-[#44546b] hover:text-[#eef2f7] hover:bg-[#13243c] transition-colors"
        >
          <X size={13} />
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-3.5 py-3 space-y-2.5">
        {nachrichten.length === 0 ? (
          <p className="text-[#44546b] text-[11.5px] leading-relaxed">
            Für den Fall, dass die Technik klemmt: Hier können Sie schreiben, ohne das Gespräch
            zu verlassen. Nachrichten werden nicht gespeichert.
          </p>
        ) : (
          nachrichten.map((n) => (
            <div key={n.id} className={n.eigen ? "flex justify-end" : "flex justify-start"}>
              <div
                className={`max-w-[85%] rounded-xl px-3 py-2 ${
                  n.eigen
                    ? "bg-[rgba(0,184,255,0.12)] border border-[#17304d]"
                    : "bg-[#0c1522] border border-[#122339]"
                }`}
              >
                {!n.eigen && (
                  <p className="font-mono text-[#4a6383] text-[9.5px] uppercase tracking-[0.12em] mb-0.5 truncate">
                    {n.von}
                  </p>
                )}
                <p className="text-[#eef2f7] text-[12.5px] leading-snug whitespace-pre-wrap break-words">
                  {n.text}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={ende} />
      </div>

      <form
        className="flex-shrink-0 border-t border-[#122339] p-2.5 flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const text = entwurf.trim();
          if (!text) return;
          onSenden(text);
          setEntwurf("");
        }}
      >
        <textarea
          value={entwurf}
          onChange={(e) => setEntwurf(e.target.value)}
          onKeyDown={(e) => {
            // Eingabetaste sendet, Umschalt+Eingabe macht eine neue Zeile —
            // so, wie man es von jedem Messenger kennt.
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              const text = entwurf.trim();
              if (!text) return;
              onSenden(text);
              setEntwurf("");
            }
          }}
          rows={1}
          placeholder={teilnehmer > 0 ? "Nachricht…" : "Niemand sonst im Raum"}
          className="flex-1 resize-none px-3 py-2 rounded-xl bg-[#0a1322] border border-[#14263e] text-[#eef2f7] text-[12.5px] outline-none focus:border-[#00b8ff]/60 transition-colors max-h-24"
        />
        <button
          type="submit"
          disabled={!entwurf.trim()}
          aria-label="Senden"
          className="flex-shrink-0 p-2.5 rounded-xl bg-[#00b8ff] text-[#041018] disabled:bg-[#13243c] disabled:text-[#44546b] transition-colors"
        >
          <Send size={14} />
        </button>
      </form>

      {teilnehmer === 0 && nachrichten.length > 0 && (
        <p className="flex-shrink-0 px-3.5 pb-2.5 text-[#f59e0b] text-[10.5px] leading-snug">
          Gerade ist niemand sonst im Raum — Ihre Nachricht kommt erst an, wenn jemand
          zurückkommt.
        </p>
      )}
    </div>
  );
}
