"use client";

import { useState } from "react";
import { Shield, Loader2, CheckCircle, AlertTriangle } from "lucide-react";

export function AdminTwoFASection({ initialEnabled }: { initialEnabled: boolean }) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  async function toggle() {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch("/api/auth/2fa/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ twoFactorEnabled: !enabled }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Fehler beim Speichern.");
      }
      setEnabled((v) => !v);
      setMsg(enabled ? "2FA wurde deaktiviert." : "2FA wurde aktiviert.");
      setIsError(false);
    } catch (err: unknown) {
      setMsg(err instanceof Error ? err.message : "Fehler.");
      setIsError(true);
    } finally {
      setLoading(false);
    }
  }

  async function sendTestCode() {
    setSending(true);
    setMsg(null);
    try {
      const res = await fetch("/api/auth/2fa/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.error?.includes("not configured") || res.status === 503) {
          setMsg("E-Mail-Versand nicht konfiguriert. RESEND_API_KEY fehlt.");
        } else {
          setMsg(data.error ?? "Fehler beim Senden.");
        }
        setIsError(true);
      } else {
        setMsg("Testcode wurde an Ihre E-Mail-Adresse gesendet.");
        setIsError(false);
      }
    } catch {
      setMsg("Netzwerkfehler beim Senden des Codes.");
      setIsError(true);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-6 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <Shield size={16} className="text-[#00b8ff]" />
        <h2 className="text-[#f0f0f0] font-semibold text-sm">Zwei-Faktor-Authentifizierung (Admin)</h2>
        <span className={`ml-auto text-xs px-2 py-0.5 rounded-full border ${enabled ? "bg-[#00b8ff]/10 text-[#00b8ff] border-[#00b8ff]/20" : "bg-[#888]/10 text-[#888] border-[#888]/20"}`}>
          {enabled ? "Aktiv" : "Deaktiviert"}
        </span>
      </div>

      <p className="text-[#888] text-xs leading-relaxed mb-4">
        Wenn aktiviert, müssen Sie bei jedem Login einen 6-stelligen Code aus Ihrer E-Mail eingeben.
        Erfordert korrekt konfiguriertes Resend (RESEND_API_KEY).
      </p>

      {msg && (
        <div className={`flex items-start gap-2 p-3 rounded-lg mb-4 text-xs ${isError ? "bg-red-500/10 border border-red-500/20 text-red-400" : "bg-[#00b8ff]/10 border border-[#00b8ff]/20 text-[#00b8ff]"}`}>
          {isError ? <AlertTriangle size={13} className="mt-0.5 shrink-0" /> : <CheckCircle size={13} className="mt-0.5 shrink-0" />}
          {msg}
        </div>
      )}

      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={toggle}
          disabled={loading}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
            enabled
              ? "bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20"
              : "bg-[#00b8ff] hover:bg-[#0099d6] text-white"
          }`}
        >
          {loading ? <Loader2 size={13} className="animate-spin" /> : <Shield size={13} />}
          {enabled ? "2FA deaktivieren" : "2FA aktivieren"}
        </button>

        {enabled && (
          <button
            onClick={sendTestCode}
            disabled={sending}
            className="flex items-center gap-2 px-4 py-2 text-sm border border-[#1a2840] bg-[#101c2e] hover:bg-[#222] text-[#888] hover:text-[#f0f0f0] rounded-lg transition-colors"
          >
            {sending ? <Loader2 size={13} className="animate-spin" /> : null}
            Testcode senden
          </button>
        )}
      </div>
    </div>
  );
}
