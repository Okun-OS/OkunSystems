"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Ungültige E-Mail-Adresse oder falsches Passwort.");
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } catch {
      setError("Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md">
      {/* Logo */}
      <div className="flex flex-col items-center mb-10">
        <div className="mb-4">
          <svg width="120" height="48" viewBox="0 0 120 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <text
              x="0"
              y="36"
              fontFamily="Arial, sans-serif"
              fontSize="38"
              fontWeight="700"
              letterSpacing="4"
              fill="url(#metalGradient)"
            >
              OKUN
            </text>
            <text
              x="2"
              y="48"
              fontFamily="Arial, sans-serif"
              fontSize="11"
              fontWeight="400"
              letterSpacing="8"
              fill="#888888"
            >
              SYSTEMS
            </text>
            <defs>
              <linearGradient id="metalGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f0f0f0" />
                <stop offset="40%" stopColor="#22c55e" />
                <stop offset="100%" stopColor="#16a34a" />
              </linearGradient>
            </defs>
          </svg>
        </div>
        <p className="text-[#888] text-sm mt-1">Client Portal</p>
      </div>

      {/* Card */}
      <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-8">
        <h1 className="text-xl font-semibold text-[#f0f0f0] mb-2">Anmelden</h1>
        <p className="text-[#888] text-sm mb-6">
          Melden Sie sich mit Ihren Zugangsdaten an.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-[#ccc] mb-1.5"
            >
              E-Mail-Adresse
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ihre@email.de"
              className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-4 py-2.5 text-[#f0f0f0] text-sm placeholder-[#555] focus:outline-none focus:border-[#22c55e] focus:ring-1 focus:ring-[#22c55e] transition-colors"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-[#ccc] mb-1.5"
            >
              Passwort
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-4 py-2.5 text-[#f0f0f0] text-sm placeholder-[#555] focus:outline-none focus:border-[#22c55e] focus:ring-1 focus:ring-[#22c55e] transition-colors"
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
            className="w-full bg-[#22c55e] hover:bg-[#16a34a] disabled:opacity-50 disabled:cursor-not-allowed text-black font-semibold rounded-lg px-4 py-2.5 text-sm transition-colors"
          >
            {loading ? "Wird angemeldet…" : "Anmelden"}
          </button>
        </form>
      </div>

      <p className="text-center text-[#555] text-xs mt-6">
        © {new Date().getFullYear()} OKUN Systems GmbH
      </p>
    </div>
  );
}
