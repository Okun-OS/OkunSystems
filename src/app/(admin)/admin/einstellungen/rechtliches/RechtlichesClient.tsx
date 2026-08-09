"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Edit2, Eye, EyeOff, Check, ChevronDown, ChevronUp } from "lucide-react";
import { createLegalDocument, updateLegalDocument, toggleLegalDocumentActive } from "./actions";

const DOC_TYPES = [
  { value: "AGB", label: "AGB" },
  { value: "DATENSCHUTZ", label: "Datenschutzerklärung" },
  { value: "WIDERRUFSRECHT", label: "Widerrufsrecht" },
  { value: "AUFTRAGSVERARBEITUNG", label: "Auftragsverarbeitungsvertrag" },
];

type Doc = {
  id: string;
  title: string;
  type: string;
  version: string;
  content: string | null;
  checkboxLabel: string | null;
  isRequired: boolean;
  isActive: boolean;
  displayOrder: number;
  _count: { consentRecords: number };
};

interface Props {
  documents: Doc[];
}

export function RechtlichesClient({ documents }: Props) {
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [expandId, setExpandId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await createLegalDocument(formData);
      if (result?.error) { setError(result.error); return; }
      setShowCreate(false);
      router.refresh();
    });
  }

  function handleUpdate(id: string, e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await updateLegalDocument(id, formData);
      if (result?.error) { setError(result.error); return; }
      setEditId(null);
      router.refresh();
    });
  }

  function handleToggle(id: string, current: boolean) {
    startTransition(async () => {
      await toggleLegalDocumentActive(id, !current);
      router.refresh();
    });
  }

  const active = documents.filter((d) => d.isActive);
  const inactive = documents.filter((d) => !d.isActive);

  return (
    <div className="max-w-[900px] mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#f0f0f0]">Rechtliche Dokumente</h1>
          <p className="text-[#888] text-sm mt-1">{active.length} aktive Dokumente · werden Kunden im Closing angezeigt</p>
        </div>
        <button
          onClick={() => { setShowCreate(true); setError(null); }}
          className="flex items-center gap-2 bg-[#00b8ff] hover:bg-[#0099dd] text-black font-semibold text-sm px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={15} />
          Neues Dokument
        </button>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.2)] rounded-lg text-[#ef4444] text-sm">
          {error}
        </div>
      )}

      {/* Create form */}
      {showCreate && (
        <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-6 mb-6">
          <h2 className="text-sm font-semibold text-[#f0f0f0] mb-4">Neues Dokument anlegen</h2>
          <form onSubmit={handleCreate}>
            <DocForm />
            <div className="flex items-center gap-3 mt-4">
              <button
                type="submit"
                disabled={pending}
                className="flex items-center gap-2 px-4 py-2 bg-[#00b8ff] hover:bg-[#0099dd] disabled:opacity-50 text-black font-semibold text-sm rounded-lg"
              >
                <Check size={14} />
                {pending ? "Wird gespeichert…" : "Speichern"}
              </button>
              <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-[#666] hover:text-[#f0f0f0]">
                Abbrechen
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Active documents */}
      {active.length === 0 && !showCreate ? (
        <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl py-16 text-center">
          <p className="text-[#666] text-sm">Noch keine rechtlichen Dokumente. Erstellen Sie das erste Dokument.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {active.map((doc) => (
            <div key={doc.id} className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-5">
              {editId === doc.id ? (
                <form onSubmit={(e) => handleUpdate(doc.id, e)}>
                  <DocForm defaultValues={doc} />
                  <div className="flex items-center gap-3 mt-4">
                    <button type="submit" disabled={pending} className="flex items-center gap-2 px-4 py-2 bg-[#00b8ff] hover:bg-[#0099dd] disabled:opacity-50 text-black font-semibold text-sm rounded-lg">
                      <Check size={14} />
                      {pending ? "…" : "Speichern"}
                    </button>
                    <button type="button" onClick={() => setEditId(null)} className="px-4 py-2 text-sm text-[#666] hover:text-[#f0f0f0]">Abbrechen</button>
                  </div>
                </form>
              ) : (
                <div>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-xs font-medium text-[#00b8ff] uppercase tracking-wide">{doc.type}</span>
                        <span className="text-xs text-[#555]">v{doc.version}</span>
                        {doc.isRequired && (
                          <span className="text-xs text-[#ef4444] font-medium">Pflicht</span>
                        )}
                        <span className="text-xs text-[#555]">· {doc._count.consentRecords} Einwilligungen</span>
                      </div>
                      <h3 className="text-base font-semibold text-[#f0f0f0]">{doc.title}</h3>
                      {doc.checkboxLabel && (
                        <p className="text-sm text-[#888] mt-1">Checkbox: „{doc.checkboxLabel}"</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => setExpandId(expandId === doc.id ? null : doc.id)}
                        className="p-2 text-[#666] hover:text-[#f0f0f0] transition-colors"
                        title="Inhalt anzeigen"
                      >
                        {expandId === doc.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                      <button onClick={() => setEditId(doc.id)} className="p-2 text-[#666] hover:text-[#f0f0f0] transition-colors" title="Bearbeiten">
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleToggle(doc.id, doc.isActive)}
                        disabled={pending}
                        className="p-2 text-[#666] hover:text-[#f59e0b] transition-colors disabled:opacity-40"
                        title="Deaktivieren"
                      >
                        <EyeOff size={14} />
                      </button>
                    </div>
                  </div>
                  {expandId === doc.id && (
                    <div className="mt-4 pt-4 border-t border-[#1a2840]">
                      <pre className="text-xs text-[#888] whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">{doc.content ?? "(kein Inhalt)"}</pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Inactive documents */}
      {inactive.length > 0 && (
        <div className="mt-8">
          <div className="text-sm text-[#555] font-medium mb-3">Deaktivierte Dokumente ({inactive.length})</div>
          <div className="space-y-2 opacity-50">
            {inactive.map((doc) => (
              <div key={doc.id} className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-4 flex items-center justify-between">
                <div>
                  <span className="text-sm text-[#888]">{doc.title}</span>
                  <span className="text-xs text-[#555] ml-2">v{doc.version}</span>
                </div>
                <button
                  onClick={() => handleToggle(doc.id, doc.isActive)}
                  disabled={pending}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-[#666] hover:text-[#22c55e] border border-[#1a2840] hover:border-[#22c55e] rounded-lg transition-colors disabled:opacity-40"
                >
                  <Eye size={12} />
                  Aktivieren
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DocForm({
  defaultValues,
}: {
  defaultValues?: {
    title: string;
    type: string;
    version: string;
    content: string | null;
    checkboxLabel: string | null;
    isRequired: boolean;
    displayOrder: number;
  };
}) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="block text-xs font-medium text-[#888] uppercase tracking-wide mb-1.5">Titel *</label>
        <input
          name="title"
          defaultValue={defaultValues?.title ?? ""}
          required
          className="w-full bg-[#080d14] border border-[#1a2840] rounded-lg px-3 py-2.5 text-sm text-[#f0f0f0] focus:outline-none focus:border-[#00b8ff] transition-colors"
          placeholder="z.B. Allgemeine Geschäftsbedingungen"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-[#888] uppercase tracking-wide mb-1.5">Typ *</label>
        <select
          name="type"
          defaultValue={defaultValues?.type ?? "AGB"}
          className="w-full bg-[#080d14] border border-[#1a2840] rounded-lg px-3 py-2.5 text-sm text-[#f0f0f0] focus:outline-none focus:border-[#00b8ff] transition-colors"
        >
          {DOC_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-[#888] uppercase tracking-wide mb-1.5">Version</label>
        <input
          name="version"
          defaultValue={defaultValues?.version ?? "1.0"}
          className="w-full bg-[#080d14] border border-[#1a2840] rounded-lg px-3 py-2.5 text-sm text-[#f0f0f0] focus:outline-none focus:border-[#00b8ff] transition-colors"
          placeholder="1.0"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-[#888] uppercase tracking-wide mb-1.5">Anzeigereihenfolge</label>
        <input
          name="displayOrder"
          type="number"
          min="0"
          defaultValue={defaultValues?.displayOrder ?? 0}
          className="w-full bg-[#080d14] border border-[#1a2840] rounded-lg px-3 py-2.5 text-sm text-[#f0f0f0] focus:outline-none focus:border-[#00b8ff] transition-colors"
        />
      </div>
      <div className="col-span-2">
        <label className="block text-xs font-medium text-[#888] uppercase tracking-wide mb-1.5">Checkbox-Text (für Kunden)</label>
        <input
          name="checkboxLabel"
          defaultValue={defaultValues?.checkboxLabel ?? ""}
          className="w-full bg-[#080d14] border border-[#1a2840] rounded-lg px-3 py-2.5 text-sm text-[#f0f0f0] focus:outline-none focus:border-[#00b8ff] transition-colors"
          placeholder='z.B. "Ich akzeptiere die AGB"'
        />
      </div>
      <div className="col-span-2">
        <label className="block text-xs font-medium text-[#888] uppercase tracking-wide mb-1.5">Inhalt *</label>
        <textarea
          name="content"
          defaultValue={defaultValues?.content ?? "" }
          rows={8}
          required
          className="w-full bg-[#080d14] border border-[#1a2840] rounded-lg px-3 py-2.5 text-sm text-[#f0f0f0] placeholder-[#444] focus:outline-none focus:border-[#00b8ff] resize-y"
          placeholder="Vollständiger Text des Dokuments..."
        />
      </div>
      <div className="col-span-2 flex items-center gap-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            name="isRequired"
            value="true"
            defaultChecked={defaultValues?.isRequired ?? true}
            className="w-4 h-4 rounded border-[#1a2840] accent-[#00b8ff]"
          />
          <span className="text-sm text-[#ccc]">Pflichtdokument (Zustimmung erforderlich vor Zahlung)</span>
        </label>
      </div>
    </div>
  );
}
