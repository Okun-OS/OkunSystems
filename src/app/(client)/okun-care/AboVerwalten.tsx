"use client";

import { useState } from "react";
import { CreditCard, ExternalLink } from "lucide-react";

/**
 * Zahlungsdaten, Rechnungen, Kündigung — alles bei Stripe.
 *
 * Der Knopf holt sich die Portalsitzung und leitet weiter. Kein eigenes
 * Formular: Was hier entstünde, wäre eine zweite Wahrheit über ein Abo,
 * dessen erste bei Stripe liegt.
 */
export function AboVerwalten() {
  const [laedt, setzeLaedt] = useState(false);
  const [fehler, setzeFehler] = useState<string | null>(null);

  async function oeffnen() {
    setzeLaedt(true);
    setzeFehler(null);
    try {
      const antwort = await fetch("/api/stripe/care-portal", { method: "POST" });
      const daten: { url?: string; error?: string } = await antwort.json();
      if (!antwort.ok || !daten.url) {
        setzeFehler(daten.error ?? "Das Portal ließ sich nicht öffnen.");
        return;
      }
      window.location.href = daten.url;
    } catch {
      setzeFehler("Netzwerkfehler – bitte erneut versuchen.");
    } finally {
      setzeLaedt(false);
    }
  }

  return (
    <div>
      <button
        onClick={() => void oeffnen()}
        disabled={laedt}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#1a2840]
          text-[#888] text-sm hover:text-[#f0f0f0] hover:border-[#3a3a3a] hover:bg-[#101c2e]
          disabled:opacity-50 transition-colors"
      >
        <CreditCard size={15} />
        {laedt ? "Wird geöffnet…" : "Zahlungsdaten & Rechnungen"}
        <ExternalLink size={12} className="text-[#555]" />
      </button>
      {fehler && <p className="mt-2 text-[#f0504a] text-xs">{fehler}</p>}
    </div>
  );
}
