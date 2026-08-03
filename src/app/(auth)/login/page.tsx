"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { OkunLogo } from "@/components/layout/okun-logo";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // 2FA state
  const [requires2FA, setRequires2FA] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [resending, setResending] = useState(false);
  const [resendMsg, setResendMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const body: Record<string, string> = { email, password };
      if (requires2FA && twoFactorCode) {
        body.twoFactorCode = twoFactorCode;
      }

      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Ungültige Zugangsdaten.");
      } else if (data.requires2FA) {
        setRequires2FA(true);
        if (data.codeSent) {
          setResendMsg("Code wurde per E-Mail gesendet.");
        }
      } else {
        router.push(data.redirectTo || "/dashboard");
        router.refresh();
      }
    } catch {
      setError("Verbindungsfehler – bitte erneut versuchen.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResendCode() {
    setResending(true);
    setResendMsg("");
    setError("");
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Fehler beim Senden.");
      } else {
        setResendMsg(data.codeSent ? "Neuer Code gesendet." : "Bitte warte kurz vor dem erneuten Senden.");
      }
    } catch {
      setError("Verbindungsfehler.");
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="w-full max-w-md">
      {/* Logo */}
      <div className="flex flex-col items-center mb-10">
        <div style={{ width: 210 }}>
          <OkunLogo size="lg" />
        </div>
        <p className="text-[#8899b4] text-sm mt-3 tracking-wide">Client Portal</p>
      </div>

      {/* Card */}
      <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-8">
        {!requires2FA ? (
          <>
            <h1 className="text-xl font-semibold text-[#f0f0f0] mb-2">Anmelden</h1>
            <p className="text-[#888] text-sm mb-6">Melden Sie sich mit Ihren Zugangsdaten an.</p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-[#ccc] mb-1.5">E-Mail-Adresse</label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ihre@email.de"
                  className="w-full bg-[#060a10] border border-[#1a2840] rounded-lg px-4 py-2.5 text-[#f0f0f0] text-sm placeholder-[#555] focus:outline-none focus:border-[#00b8ff] focus:ring-1 focus:ring-[#00b8ff] transition-colors"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-[#ccc] mb-1.5">Passwort</label>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#060a10] border border-[#1a2840] rounded-lg px-4 py-2.5 text-[#f0f0f0] text-sm placeholder-[#555] focus:outline-none focus:border-[#00b8ff] focus:ring-1 focus:ring-[#00b8ff] transition-colors"
                />
              </div>

              {error && (
                <div className="bg-red-950/40 border border-red-900/50 text-red-400 text-sm rounded-lg px-4 py-3">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#00b8ff] hover:bg-[#0099d6] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg px-4 py-2.5 text-sm transition-colors"
              >
                {loading ? "Wird angemeldet…" : "Anmelden"}
              </button>

              <p className="text-center text-[#555] text-sm">
                <a href="/passwort-vergessen" className="hover:text-[#888] transition-colors">Passwort vergessen?</a>
              </p>
            </form>
          </>
        ) : (
          <>
            <h1 className="text-xl font-semibold text-[#f0f0f0] mb-2">Bestätigung erforderlich</h1>
            <p className="text-[#888] text-sm mb-6">
              Ein 6-stelliger Code wurde an <span className="text-[#f0f0f0]">{email}</span> gesendet.
              Geben Sie ihn unten ein.
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="code" className="block text-sm font-medium text-[#ccc] mb-1.5">Sicherheitscode</label>
                <input
                  id="code"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  autoFocus
                  required
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="000000"
                  className="w-full bg-[#060a10] border border-[#1a2840] rounded-lg px-4 py-2.5 text-[#f0f0f0] text-sm placeholder-[#555] focus:outline-none focus:border-[#00b8ff] focus:ring-1 focus:ring-[#00b8ff] transition-colors text-center tracking-[0.4em] font-mono text-lg"
                />
              </div>

              {error && (
                <div className="bg-red-950/40 border border-red-900/50 text-red-400 text-sm rounded-lg px-4 py-3">
                  {error}
                </div>
              )}

              {resendMsg && (
                <p className="text-[#00b8ff] text-xs text-center">{resendMsg}</p>
              )}

              <button
                type="submit"
                disabled={loading || twoFactorCode.length !== 6}
                className="w-full bg-[#00b8ff] hover:bg-[#0099d6] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg px-4 py-2.5 text-sm transition-colors"
              >
                {loading ? "Wird geprüft…" : "Bestätigen"}
              </button>

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => { setRequires2FA(false); setTwoFactorCode(""); setError(""); }}
                  className="text-[#555] hover:text-[#888] text-sm transition-colors"
                >
                  ← Zurück
                </button>
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={resending}
                  className="text-[#00b8ff] hover:underline text-sm disabled:opacity-50"
                >
                  {resending ? "Sendet…" : "Code erneut senden"}
                </button>
              </div>
            </form>
          </>
        )}
      </div>

      <p className="text-center text-[#555] text-xs mt-6">
        © {new Date().getFullYear()} OKUN Systems GmbH
      </p>
    </div>
  );
}
