"use client";

import { useState, useTransition } from "react";
import { Check, X } from "lucide-react";
import { isFailure } from "@/lib/action-result";
import {
  approvePresentation,
  rejectPresentation,
} from "../closing/[sessionId]/presentation-actions";

/** Freigabe bzw. Zurückweisung einer eingereichten Präsentation. */
export function ReviewActions({ presentationId }: { presentationId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState("");

  function run(fn: () => Promise<unknown>) {
    setError(null);
    startTransition(async () => {
      const result = await fn();
      if (isFailure(result as object)) {
        setError((result as { error: string }).error);
      } else {
        setRejecting(false);
        setNote("");
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex items-center gap-2">
        <button
          onClick={() => run(() => approvePresentation(presentationId))}
          disabled={pending}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#22c55e]/30 bg-[rgba(34,197,94,0.1)] text-[#22c55e] text-xs disabled:opacity-40"
        >
          <Check size={12} /> Freigeben
        </button>
        <button
          onClick={() => setRejecting((v) => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#1a2840] text-[#8899b4] text-xs hover:text-[#fca5a5] transition-colors"
        >
          <X size={12} /> Zurückweisen
        </button>
      </div>

      {rejecting && (
        <div className="flex items-center gap-2">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Was muss geändert werden?"
            className="w-[240px] px-3 py-1.5 rounded-lg bg-[#0a1119] border border-[#1a2840] text-[#eef2f7] text-xs focus:outline-none focus:border-[#00b8ff]/50"
          />
          <button
            onClick={() => run(() => rejectPresentation(presentationId, note))}
            disabled={pending}
            className="px-3 py-1.5 rounded-lg border border-[#1a2840] text-[#8899b4] text-xs disabled:opacity-40"
          >
            Senden
          </button>
        </div>
      )}

      {error && <p className="text-[#fca5a5] text-xs">{error}</p>}
    </div>
  );
}
