"use client";

import { useState } from "react";
import { CreditCard } from "lucide-react";

export function SubscribeButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubscribe() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Fehler beim Starten des Checkouts");
        return;
      }
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      setError("Netzwerkfehler – bitte erneut versuchen");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleSubscribe}
        disabled={loading}
        className="w-full bg-[#00b8ff] hover:bg-[#0099d6] disabled:opacity-50 text-white font-semibold text-sm rounded-xl py-3 flex items-center justify-center gap-2 transition-colors"
      >
        {loading ? (
          <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
        ) : (
          <CreditCard size={15} />
        )}
        {loading ? "Weiterleitung…" : "Jetzt abonnieren – 299 € / Monat"}
      </button>
      {error && <p className="text-red-400 text-xs text-center">{error}</p>}
    </div>
  );
}
