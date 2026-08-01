"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, CheckCircle } from "lucide-react";

export function InvitationForm({
  token,
  email,
}: {
  token: string;
  email: string;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== passwordConfirm) {
      setError("Die Passwörter stimmen nicht überein.");
      return;
    }
    if (password.length < 8) {
      setError("Das Passwort muss mindestens 8 Zeichen lang sein.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/einladung/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, name, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Fehler beim Erstellen des Kontos.");
        return;
      }

      setSuccess(true);
      setTimeout(() => router.push("/login"), 2000);
    } catch {
      setError("Verbindungsfehler — bitte erneut versuchen.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="bg-[#141414] border border-[#22c55e]/20 rounded-xl p-8 flex flex-col items-center text-center">
        <CheckCircle size={32} className="text-[#22c55e] mb-4" />
        <h2 className="text-[#f0f0f0] font-bold mb-2">Konto erstellt</h2>
        <p className="text-[#888] text-sm">Sie werden zum Login weitergeleitet…</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-6 space-y-4">
      <div>
        <label className="text-[#888] text-xs block mb-1.5">E-Mail-Adresse</label>
        <input
          type="email"
          value={email}
          disabled
          className="w-full bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg px-3 py-2.5 text-[#555] text-sm cursor-not-allowed"
        />
      </div>

      <div>
        <label className="text-[#888] text-xs block mb-1.5">Ihr Name *</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="Max Mustermann"
          className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-[#f0f0f0] text-sm placeholder-[#555] focus:outline-none focus:border-[#22c55e]/50"
        />
      </div>

      <div>
        <label className="text-[#888] text-xs block mb-1.5">Passwort * (min. 8 Zeichen)</label>
        <div className="relative">
          <input
            type={showPw ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            placeholder="••••••••"
            className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2.5 pr-10 text-[#f0f0f0] text-sm placeholder-[#555] focus:outline-none focus:border-[#22c55e]/50"
          />
          <button
            type="button"
            onClick={() => setShowPw((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#555] hover:text-[#888]"
          >
            {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
      </div>

      <div>
        <label className="text-[#888] text-xs block mb-1.5">Passwort bestätigen *</label>
        <input
          type={showPw ? "text" : "password"}
          value={passwordConfirm}
          onChange={(e) => setPasswordConfirm(e.target.value)}
          required
          placeholder="••••••••"
          className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-[#f0f0f0] text-sm placeholder-[#555] focus:outline-none focus:border-[#22c55e]/50"
        />
      </div>

      {error && (
        <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 bg-[#22c55e] hover:bg-[#16a34a] disabled:opacity-50 text-black font-bold text-sm rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        {loading ? (
          <><Loader2 size={15} className="animate-spin" /> Konto wird erstellt…</>
        ) : (
          "Konto erstellen"
        )}
      </button>
    </form>
  );
}
