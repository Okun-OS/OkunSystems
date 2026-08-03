"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Building2, User, Mail, Globe, Phone, MapPin, Loader2, CheckCircle, AlertTriangle, Copy } from "lucide-react";

export default function NeuerKundePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<{ companyId: string; inviteUrl: string | null; invitationSent: boolean; invitationError: string | null } | null>(null);

  const [form, setForm] = useState({
    companyName: "", industry: "", website: "", phone: "", address: "",
    contactName: "", contactEmail: "",
    plan: "",
  });

  function update(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Fehler beim Anlegen");
      setCreated({
        companyId: data.id,
        inviteUrl: data.inviteUrl,
        invitationSent: data.invitationSent,
        invitationError: data.invitationError,
      });
    } catch (err: any) {
      setError(err.message ?? "Ein Fehler ist aufgetreten.");
    } finally {
      setLoading(false);
    }
  }

  if (created) {
    return (
      <div className="max-w-[640px] mx-auto">
        <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-[#00b8ff]/10 border border-[#00b8ff]/20 flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={24} className="text-[#00b8ff]" />
          </div>
          <h2 className="text-[#f0f0f0] font-bold text-lg mb-2">Kunde wurde angelegt</h2>
          <p className="text-[#888] text-sm mb-6">{form.companyName} — {form.contactName}</p>

          {created.invitationSent ? (
            <div className="bg-[#00b8ff]/5 border border-[#00b8ff]/20 rounded-xl p-4 mb-6 text-left">
              <p className="text-[#00b8ff] text-sm font-semibold flex items-center gap-2 mb-1">
                <CheckCircle size={14} /> Einladung per E-Mail gesendet
              </p>
              <p className="text-[#888] text-xs">
                {form.contactEmail} hat eine Einladung erhalten und kann sein Passwort selbst setzen.
              </p>
            </div>
          ) : (
            <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-4 mb-6 text-left">
              <p className="text-yellow-400 text-sm font-semibold flex items-center gap-2 mb-1">
                <AlertTriangle size={14} /> Einladung konnte nicht gesendet werden
              </p>
              <p className="text-[#888] text-xs mb-3">{created.invitationError}</p>
              {created.inviteUrl && (
                <div>
                  <p className="text-[#888] text-xs mb-1.5">Einladungslink manuell übermitteln:</p>
                  <div className="flex items-center gap-2 bg-[#060a10] border border-[#1a2840] rounded-lg px-3 py-2">
                    <code className="text-[#00b8ff] text-xs flex-1 break-all">{created.inviteUrl}</code>
                    <button
                      onClick={() => navigator.clipboard.writeText(created.inviteUrl!)}
                      className="text-[#555] hover:text-[#f0f0f0] transition-colors shrink-0"
                    >
                      <Copy size={13} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3 justify-center">
            <button
              onClick={() => router.push(`/admin/kunden/${created.companyId}`)}
              className="px-5 py-2.5 bg-[#00b8ff] hover:bg-[#0099d6] text-white font-semibold text-sm rounded-lg transition-colors"
            >
              Zur Kundenakte
            </button>
            <Link href="/admin/kunden" className="px-5 py-2.5 bg-[#101c2e] hover:bg-[#222] border border-[#1a2840] text-[#888] font-medium text-sm rounded-lg transition-colors">
              Zurück zur Liste
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[800px] mx-auto">
      <div className="mb-6">
        <Link href="/admin/kunden" className="flex items-center gap-2 text-[#888] hover:text-[#f0f0f0] text-sm mb-4 transition-colors">
          <ArrowLeft size={15} />
          Zurück zur Übersicht
        </Link>
        <h1 className="text-2xl font-bold text-[#f0f0f0]">Neuen Kunden anlegen</h1>
        <p className="text-[#888] text-sm mt-1">
          Der Kunde erhält eine Einladungs-E-Mail und setzt sein Passwort selbst. Kein Klartext-Passwort.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Company */}
        <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <Building2 size={15} className="text-[#00b8ff]" />
            <h2 className="text-[#f0f0f0] font-semibold text-sm">Unternehmensdaten</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-[#888] mb-1.5">Unternehmensname *</label>
              <input required value={form.companyName} onChange={(e) => update("companyName", e.target.value)}
                placeholder="Muster GmbH"
                className="w-full bg-[#060a10] border border-[#1a2840] rounded-lg px-3 py-2.5 text-[#f0f0f0] text-sm placeholder-[#555] focus:outline-none focus:border-[#00b8ff]/50" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#888] mb-1.5">Branche</label>
              <input value={form.industry} onChange={e => update("industry", e.target.value)}
                placeholder="z.B. Pflegedienstleister"
                className="w-full bg-[#060a10] border border-[#1a2840] rounded-lg px-3 py-2.5 text-[#f0f0f0] text-sm placeholder-[#555] focus:outline-none focus:border-[#00b8ff]/50" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#888] mb-1.5">Website</label>
              <div className="relative">
                <Globe size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555]" />
                <input value={form.website} onChange={e => update("website", e.target.value)}
                  placeholder="https://example.de"
                  className="w-full bg-[#060a10] border border-[#1a2840] rounded-lg pl-9 pr-3 py-2.5 text-[#f0f0f0] text-sm placeholder-[#555] focus:outline-none focus:border-[#00b8ff]/50" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#888] mb-1.5">Telefon</label>
              <div className="relative">
                <Phone size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555]" />
                <input value={form.phone} onChange={e => update("phone", e.target.value)}
                  placeholder="+49 ..."
                  className="w-full bg-[#060a10] border border-[#1a2840] rounded-lg pl-9 pr-3 py-2.5 text-[#f0f0f0] text-sm placeholder-[#555] focus:outline-none focus:border-[#00b8ff]/50" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#888] mb-1.5">Adresse</label>
              <div className="relative">
                <MapPin size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555]" />
                <input value={form.address} onChange={e => update("address", e.target.value)}
                  placeholder="Musterstraße 1, 12345 Stadt"
                  className="w-full bg-[#060a10] border border-[#1a2840] rounded-lg pl-9 pr-3 py-2.5 text-[#f0f0f0] text-sm placeholder-[#555] focus:outline-none focus:border-[#00b8ff]/50" />
              </div>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-[#888] mb-2">Paket</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: "foundation", label: "OKUN Foundation", price: "ab 5.900 €" },
                  { value: "operations", label: "OKUN Operations", price: "ab 7.500 €" },
                  { value: "custom", label: "OKUN Custom", price: "ab 20.000 €" },
                ].map((pkg) => (
                  <button
                    key={pkg.value}
                    type="button"
                    onClick={() => update("plan", pkg.value)}
                    className={`text-left p-3 rounded-lg border transition-all ${
                      form.plan === pkg.value
                        ? "border-[#00b8ff]/50 bg-[#00b8ff]/8 text-[#f0f0f0]"
                        : "border-[#1a2840] bg-[#060a10] text-[#888] hover:border-[#3a3a3a]"
                    }`}
                  >
                    <p className="text-xs font-semibold">{pkg.label}</p>
                    <p className="text-xs mt-0.5 text-[#555]">{pkg.price}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <User size={15} className="text-[#00b8ff]" />
            <h2 className="text-[#f0f0f0] font-semibold text-sm">Ansprechpartner & Portal-Zugang</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#888] mb-1.5">Name des Ansprechpartners *</label>
              <input required value={form.contactName} onChange={e => update("contactName", e.target.value)}
                placeholder="Max Mustermann"
                className="w-full bg-[#060a10] border border-[#1a2840] rounded-lg px-3 py-2.5 text-[#f0f0f0] text-sm placeholder-[#555] focus:outline-none focus:border-[#00b8ff]/50" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#888] mb-1.5">E-Mail-Adresse *</label>
              <div className="relative">
                <Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555]" />
                <input required type="email" value={form.contactEmail} onChange={e => update("contactEmail", e.target.value)}
                  placeholder="max@firma.de"
                  className="w-full bg-[#060a10] border border-[#1a2840] rounded-lg pl-9 pr-3 py-2.5 text-[#f0f0f0] text-sm placeholder-[#555] focus:outline-none focus:border-[#00b8ff]/50" />
              </div>
            </div>
          </div>
          <p className="text-[#555] text-xs mt-3">
            Der Kunde erhält eine Einladungs-E-Mail und setzt sein Passwort selbst. Es wird kein temporäres Passwort benötigt.
          </p>
        </div>

        {error && (
          <div className="bg-red-950/40 border border-red-900/50 text-red-400 text-sm rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button type="submit" disabled={loading}
            className="flex items-center gap-2 bg-[#00b8ff] hover:bg-[#0099d6] disabled:opacity-50 text-white font-semibold text-sm rounded-lg px-6 py-2.5 transition-colors">
            {loading && <Loader2 size={15} className="animate-spin" />}
            {loading ? "Wird erstellt..." : "Kunden anlegen & einladen"}
          </button>
          <Link href="/admin/kunden"
            className="px-6 py-2.5 bg-[#101c2e] hover:bg-[#222] border border-[#1a2840] text-[#888] font-medium text-sm rounded-lg transition-colors">
            Abbrechen
          </Link>
        </div>
      </form>
    </div>
  );
}
