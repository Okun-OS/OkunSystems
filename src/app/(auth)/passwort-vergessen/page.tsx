"use client";

import { useState } from "react";
import Link from "next/link";

export default function PasswortVergessenPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "Fehler beim Senden");
      }
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-[#f0f0f0]">Passwort vergessen</h1>
          <p className="text-[#888] text-sm mt-2">
            Wir senden Ihnen einen Reset-Link per E-Mail.
          </p>
        </div>

        {sent ? (
          <div className="bg-[#22c55e]/10 border border-[#22c55e]/20 rounded-xl p-6 text-center">
            <p className="text-[#22c55e] font-semibold mb-1">E-Mail gesendet</p>
            <p className="text-[#888] text-sm">
              Falls ein Konto mit dieser E-Mail-Adresse existiert, erhalten Sie in Kürze einen Link zum Zurücksetzen.
            </p>
            <Link
              href="/login"
              className="inline-block mt-4 text-[#22c55e] text-sm hover:underline"
            >
              Zurück zum Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[#888] text-xs mb-1.5">E-Mail-Adresse</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="ihre@email.de"
                className="w-full bg-[#141414] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-[#f0f0f0] text-sm placeholder-[#555] focus:outline-none focus:border-[#22c55e]/50"
              />
            </div>

            {error && (
              <p className="text-red-400 text-sm text-center">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-[#22c55e] hover:bg-[#16a34a] disabled:opacity-50 text-black font-semibold text-sm rounded-lg transition-colors"
            >
              {loading ? "Wird gesendet …" : "Reset-Link senden"}
            </button>

            <p className="text-center text-[#555] text-sm">
              <Link href="/login" className="text-[#888] hover:text-[#f0f0f0] transition-colors">
                Zurück zum Login
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
