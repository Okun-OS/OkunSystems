"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

export default function PasswortResetPage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("Passwörter stimmen nicht überein.");
      return;
    }
    if (password.length < 8) {
      setError("Passwort muss mindestens 8 Zeichen lang sein.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: params.token, password }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Fehler beim Zurücksetzen");
      setDone(true);
      setTimeout(() => router.push("/login"), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#080c14] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-[#f0f0f0]">Neues Passwort</h1>
          <p className="text-[#888] text-sm mt-2">Vergeben Sie ein neues Passwort für Ihr Konto.</p>
        </div>

        {done ? (
          <div className="bg-[#00b8ff]/10 border border-[#00b8ff]/20 rounded-xl p-6 text-center">
            <p className="text-[#00b8ff] font-semibold mb-1">Passwort geändert</p>
            <p className="text-[#888] text-sm">Sie werden zum Login weitergeleitet …</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[#888] text-xs mb-1.5">Neues Passwort</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                placeholder="Mindestens 8 Zeichen"
                className="w-full bg-[#0c1520] border border-[#1a2840] rounded-lg px-3 py-2.5 text-[#f0f0f0] text-sm placeholder-[#555] focus:outline-none focus:border-[#00b8ff]/50"
              />
            </div>
            <div>
              <label className="block text-[#888] text-xs mb-1.5">Passwort bestätigen</label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                placeholder="Passwort wiederholen"
                className="w-full bg-[#0c1520] border border-[#1a2840] rounded-lg px-3 py-2.5 text-[#f0f0f0] text-sm placeholder-[#555] focus:outline-none focus:border-[#00b8ff]/50"
              />
            </div>

            {error && <p className="text-red-400 text-sm text-center">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-[#00b8ff] hover:bg-[#0099d6] disabled:opacity-50 text-white font-semibold text-sm rounded-lg transition-colors"
            >
              {loading ? "Wird gespeichert …" : "Passwort speichern"}
            </button>

            <p className="text-center">
              <Link href="/login" className="text-[#555] hover:text-[#888] text-sm transition-colors">
                Zurück zum Login
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
