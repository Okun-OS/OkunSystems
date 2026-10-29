"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, FlaskConical, Trash2, AlertTriangle, ArrowRight } from "lucide-react";

export default function DemoClient({
  firmenname,
  vorhandenId,
  vorhandenName,
}: {
  firmenname: string;
  vorhandenId: string | null;
  vorhandenName: string | null;
}) {
  const router = useRouter();
  const [laeuft, setLaeuft] = useState<"anlegen" | "entfernen" | null>(null);
  const [meldung, setMeldung] = useState<string | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);

  async function ausfuehren(aktion: "anlegen" | "entfernen") {
    setLaeuft(aktion);
    setMeldung(null);
    setFehler(null);
    try {
      const res = await fetch("/api/admin/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aktion }),
      });
      const daten = (await res.json()) as { meldung?: string; error?: string };
      if (!res.ok) throw new Error(daten.error ?? "Unbekannter Fehler");
      setMeldung(daten.meldung ?? "Fertig.");
      router.refresh();
    } catch (e) {
      setFehler(e instanceof Error ? e.message : "Unbekannter Fehler");
    } finally {
      setLaeuft(null);
    }
  }

  return (
    <div className="max-w-[780px] mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-[#f0f0f0]">Demo-Daten</h1>
        <p className="text-[#8899b4] text-sm mt-1">
          Ein erfundener Betrieb mit vollständig beantwortetem Blueprint.
        </p>
      </div>

      <div className="bg-[#1a1407] border border-[#3d2f0b] rounded-xl p-4 flex items-start gap-3">
        <AlertTriangle size={15} className="text-[#f59e0b] mt-0.5 flex-shrink-0" />
        <div className="text-[#d6c48a] text-xs leading-relaxed space-y-1.5">
          <p>
            Diese Firma ist nicht echt. Sie erscheint in der Kundenliste wie jeder andere
            Kunde — am Zusatz „(Demo)“ im Namen ist sie zu erkennen. Entfernen Sie sie
            wieder, sobald Sie fertig sind.
          </p>
          <p>
            Es werden <strong>keine Benutzerkonten</strong> angelegt. Niemand kann sich als
            diese Firma anmelden.
          </p>
        </div>
      </div>

      {meldung && (
        <div className="bg-[#07160d] border border-[#0d3b1f] rounded-xl p-4">
          <p className="text-[#4ade80] text-sm">{meldung}</p>
        </div>
      )}
      {fehler && (
        <div className="bg-[#1a0b0b] border border-[#3d1414] rounded-xl p-4">
          <p className="text-[#f87171] text-sm">{fehler}</p>
        </div>
      )}

      <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-5 space-y-4">
        {vorhandenId ? (
          <>
            <div>
              <p className="text-[#f0f0f0] font-semibold text-sm">{vorhandenName}</p>
              <p className="text-[#8899b4] text-xs mt-1">ist angelegt und einsatzbereit.</p>
            </div>
            <div className="flex flex-wrap gap-2.5">
              <Link
                href={`/admin/kunden/${vorhandenId}/leitfaden`}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#00b8ff]/10 border border-[#00b8ff]/25 text-[#00b8ff] text-sm hover:bg-[#00b8ff]/15 transition-colors"
              >
                Zum Leitfaden <ArrowRight size={14} />
              </Link>
              <Link
                href={`/admin/kunden/${vorhandenId}`}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#060a10] border border-[#1a2840] text-[#8899b4] text-sm hover:text-[#c9d4e4] transition-colors"
              >
                Zur Kundenakte
              </Link>
              <button
                onClick={() => ausfuehren("anlegen")}
                disabled={laeuft !== null}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#060a10] border border-[#1a2840] text-[#8899b4] text-sm hover:text-[#c9d4e4] disabled:opacity-50 transition-colors"
              >
                {laeuft === "anlegen" ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <FlaskConical size={14} />
                )}
                Neu aufsetzen
              </button>
              <button
                onClick={() => ausfuehren("entfernen")}
                disabled={laeuft !== null}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#1a0b0b] border border-[#3d1414] text-[#f87171] text-sm hover:bg-[#241010] disabled:opacity-50 transition-colors"
              >
                {laeuft === "entfernen" ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Trash2 size={14} />
                )}
                Restlos entfernen
              </button>
            </div>
          </>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-[#f0f0f0] font-semibold text-sm">{firmenname}</p>
              <p className="text-[#8899b4] text-xs mt-1 leading-relaxed">
                Handwerksbetrieb, 48 Mitarbeitende, Hamburg. Vorgespräch, alle
                Blueprint-Fragen und die dritte Säule sind gefüllt — Bericht und Leitfaden
                lassen sich sofort erzeugen.
              </p>
            </div>
            <button
              onClick={() => ausfuehren("anlegen")}
              disabled={laeuft !== null}
              className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#00b8ff]/10 border border-[#00b8ff]/25 text-[#00b8ff] text-sm hover:bg-[#00b8ff]/15 disabled:opacity-50 transition-colors"
            >
              {laeuft === "anlegen" ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <FlaskConical size={15} />
              )}
              {laeuft === "anlegen" ? "Wird angelegt…" : "Anlegen"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
