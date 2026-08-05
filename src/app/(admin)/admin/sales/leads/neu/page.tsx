"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createLead } from "../actions";

const LEAD_SOURCES = [
  "Referral",
  "LinkedIn",
  "Kaltakquise",
  "Website",
  "Messe",
  "Empfehlung",
  "Sonstiges",
];

const PACKAGES = [
  { value: "foundation", label: "Foundation" },
  { value: "operations", label: "Operations" },
  { value: "custom", label: "Custom" },
];

export default function NeuLeadPage() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsPending(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const result = await createLead(formData);

    if (result?.error) {
      setError(result.error);
      setIsPending(false);
    } else if (result?.id) {
      router.push(`/admin/sales/leads/${result.id}`);
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <Link
          href="/admin/sales/leads"
          className="flex items-center gap-2 text-[#666] hover:text-[#f0f0f0] text-sm transition-colors mb-6"
        >
          <ArrowLeft size={14} />
          Zurück zu Leads
        </Link>
        <h1 className="text-2xl font-bold text-[#f0f0f0]">Neuer Lead</h1>
        <p className="text-[#888] text-sm mt-1">
          Lead als Unternehmens-Datensatz anlegen
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Company Info */}
        <section className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-6 space-y-4">
          <h2 className="text-sm font-semibold text-[#f0f0f0] mb-4">Unternehmensdaten</h2>

          <div>
            <label className="block text-xs font-medium text-[#888] uppercase tracking-wide mb-1.5">
              Firmenname <span className="text-[#ef4444]">*</span>
            </label>
            <input
              name="name"
              required
              placeholder="Muster GmbH"
              className="w-full bg-[#080d14] border border-[#1a2840] rounded-lg px-3 py-2.5 text-sm text-[#f0f0f0] placeholder-[#444] focus:outline-none focus:border-[#00b8ff] transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#888] uppercase tracking-wide mb-1.5">
                Branche
              </label>
              <input
                name="industry"
                placeholder="z. B. IT-Dienstleistungen"
                className="w-full bg-[#080d14] border border-[#1a2840] rounded-lg px-3 py-2.5 text-sm text-[#f0f0f0] placeholder-[#444] focus:outline-none focus:border-[#00b8ff] transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#888] uppercase tracking-wide mb-1.5">
                Ansprechpartner
              </label>
              <input
                name="contactPerson"
                placeholder="Max Mustermann"
                className="w-full bg-[#080d14] border border-[#1a2840] rounded-lg px-3 py-2.5 text-sm text-[#f0f0f0] placeholder-[#444] focus:outline-none focus:border-[#00b8ff] transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#888] uppercase tracking-wide mb-1.5">
                Website
              </label>
              <input
                name="website"
                type="url"
                placeholder="https://beispiel.de"
                className="w-full bg-[#080d14] border border-[#1a2840] rounded-lg px-3 py-2.5 text-sm text-[#f0f0f0] placeholder-[#444] focus:outline-none focus:border-[#00b8ff] transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#888] uppercase tracking-wide mb-1.5">
                Telefon
              </label>
              <input
                name="phone"
                type="tel"
                placeholder="+49 89 12345678"
                className="w-full bg-[#080d14] border border-[#1a2840] rounded-lg px-3 py-2.5 text-sm text-[#f0f0f0] placeholder-[#444] focus:outline-none focus:border-[#00b8ff] transition-colors"
              />
            </div>
          </div>
        </section>

        {/* Sales Info */}
        <section className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-6 space-y-4">
          <h2 className="text-sm font-semibold text-[#f0f0f0] mb-4">Sales-Daten</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#888] uppercase tracking-wide mb-1.5">
                Lead-Quelle
              </label>
              <select
                name="leadSource"
                className="w-full bg-[#080d14] border border-[#1a2840] rounded-lg px-3 py-2.5 text-sm text-[#f0f0f0] focus:outline-none focus:border-[#00b8ff] transition-colors"
              >
                <option value="">— Quelle wählen —</option>
                {LEAD_SOURCES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#888] uppercase tracking-wide mb-1.5">
                Paket (Ersteinschätzung)
              </label>
              <select
                name="contractPackage"
                className="w-full bg-[#080d14] border border-[#1a2840] rounded-lg px-3 py-2.5 text-sm text-[#f0f0f0] focus:outline-none focus:border-[#00b8ff] transition-colors"
              >
                <option value="">— Paket wählen —</option>
                {PACKAGES.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#888] uppercase tracking-wide mb-1.5">
              Geschätzter Vertragswert (Netto in €)
            </label>
            <input
              name="contractValue"
              type="number"
              min="0"
              step="100"
              placeholder="0"
              className="w-full bg-[#080d14] border border-[#1a2840] rounded-lg px-3 py-2.5 text-sm text-[#f0f0f0] placeholder-[#444] focus:outline-none focus:border-[#00b8ff] transition-colors"
            />
            <p className="text-[#555] text-xs mt-1">Eingabe in Euro. Wird intern als Cent gespeichert.</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#888] uppercase tracking-wide mb-1.5">
              Interne Notizen (nicht für Kunden sichtbar)
            </label>
            <textarea
              name="closingNotes"
              rows={3}
              placeholder="Erstgespräch-Eindrücke, Besonderheiten, Vorgeschichte…"
              className="w-full bg-[#080d14] border border-[#1a2840] rounded-lg px-3 py-2.5 text-sm text-[#f0f0f0] placeholder-[#444] focus:outline-none focus:border-[#00b8ff] transition-colors resize-none"
            />
          </div>
        </section>

        {error && (
          <div className="bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.25)] rounded-lg px-4 py-3 text-[#ef4444] text-sm">
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-3">
          <Link
            href="/admin/sales/leads"
            className="px-4 py-2.5 text-sm text-[#888] hover:text-[#f0f0f0] transition-colors"
          >
            Abbrechen
          </Link>
          <button
            type="submit"
            disabled={isPending}
            className="px-5 py-2.5 bg-[#00b8ff] hover:bg-[#0099dd] disabled:opacity-50 text-black font-semibold text-sm rounded-lg transition-colors"
          >
            {isPending ? "Wird angelegt…" : "Lead anlegen"}
          </button>
        </div>
      </form>
    </div>
  );
}
