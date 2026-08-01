"use client";

import { useSession } from "next-auth/react";
import { useState } from "react";
import { User, Mail, Building2, Lock } from "lucide-react";

export default function ProfilPage() {
  const { data: session } = useSession();
  const user = session?.user as any;

  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMessage, setPwMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    if (pwForm.next !== pwForm.confirm) {
      setPwMessage({ type: "error", text: "Passwörter stimmen nicht überein." });
      return;
    }
    if (pwForm.next.length < 8) {
      setPwMessage({ type: "error", text: "Passwort muss mindestens 8 Zeichen haben." });
      return;
    }
    setPwLoading(true);
    setPwMessage(null);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: pwForm.current, newPassword: pwForm.next }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Fehler");
      setPwMessage({ type: "ok", text: "Passwort erfolgreich geändert." });
      setPwForm({ current: "", next: "", confirm: "" });
    } catch (err) {
      setPwMessage({ type: "error", text: err instanceof Error ? err.message : "Fehler" });
    } finally {
      setPwLoading(false);
    }
  }

  return (
    <div className="max-w-[560px] mx-auto py-8 px-4 space-y-6">
      <h1 className="text-xl font-bold text-[#f0f0f0]">Mein Profil</h1>

      {/* Account info */}
      <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-6 space-y-4">
        <h2 className="text-[#888] text-xs font-medium uppercase tracking-wide">Kontoinformationen</h2>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <User size={15} className="text-[#555] flex-shrink-0" />
            <div>
              <p className="text-[#555] text-xs">Name</p>
              <p className="text-[#f0f0f0] text-sm">{user?.name ?? "–"}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Mail size={15} className="text-[#555] flex-shrink-0" />
            <div>
              <p className="text-[#555] text-xs">E-Mail</p>
              <p className="text-[#f0f0f0] text-sm">{user?.email ?? "–"}</p>
            </div>
          </div>
          {user?.companyName && (
            <div className="flex items-center gap-3">
              <Building2 size={15} className="text-[#555] flex-shrink-0" />
              <div>
                <p className="text-[#555] text-xs">Unternehmen</p>
                <p className="text-[#f0f0f0] text-sm">{user.companyName}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Change password */}
      <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-6">
        <h2 className="text-[#888] text-xs font-medium uppercase tracking-wide mb-4">Passwort ändern</h2>
        <form onSubmit={handlePasswordChange} className="space-y-3">
          <div>
            <label className="text-[#888] text-xs block mb-1.5">Aktuelles Passwort</label>
            <input
              type="password"
              value={pwForm.current}
              onChange={(e) => setPwForm(f => ({ ...f, current: e.target.value }))}
              required
              className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-[#f0f0f0] text-sm focus:outline-none focus:border-[#22c55e]/50"
            />
          </div>
          <div>
            <label className="text-[#888] text-xs block mb-1.5">Neues Passwort</label>
            <input
              type="password"
              value={pwForm.next}
              onChange={(e) => setPwForm(f => ({ ...f, next: e.target.value }))}
              required
              minLength={8}
              className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-[#f0f0f0] text-sm focus:outline-none focus:border-[#22c55e]/50"
            />
          </div>
          <div>
            <label className="text-[#888] text-xs block mb-1.5">Passwort bestätigen</label>
            <input
              type="password"
              value={pwForm.confirm}
              onChange={(e) => setPwForm(f => ({ ...f, confirm: e.target.value }))}
              required
              className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-[#f0f0f0] text-sm focus:outline-none focus:border-[#22c55e]/50"
            />
          </div>

          {pwMessage && (
            <p className={`text-sm ${pwMessage.type === "ok" ? "text-[#22c55e]" : "text-red-400"}`}>
              {pwMessage.text}
            </p>
          )}

          <button
            type="submit"
            disabled={pwLoading}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#22c55e] hover:bg-[#16a34a] disabled:opacity-50 text-black text-sm font-semibold rounded-lg transition-colors"
          >
            <Lock size={13} />
            {pwLoading ? "Wird gespeichert …" : "Passwort ändern"}
          </button>
        </form>
      </div>
    </div>
  );
}
