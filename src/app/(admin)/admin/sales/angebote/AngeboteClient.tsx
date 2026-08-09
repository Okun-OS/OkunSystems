"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { Plus, Edit2, Archive, Check, FileText, Upload, Loader2 } from "lucide-react";
import { createOfferTemplate, updateOfferTemplate, archiveOfferTemplate } from "./actions";

const PACKAGE_TYPES = [
  { value: "foundation", label: "Foundation" },
  { value: "operations", label: "Operations" },
  { value: "custom", label: "Custom" },
];

type Template = {
  id: string;
  name: string;
  packageType: string;
  description: string | null;
  priceNet: number;
  currency: string;
  validDays: number;
  r2Key: string | null;
  status: string;
  _count: { offers: number };
};

interface Props {
  templates: Template[];
  archivedTemplates: Template[];
}

export function AngeboteClient({ templates, archivedTemplates }: Props) {
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadTargetId = useRef<string | null>(null);

  function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setActionError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await createOfferTemplate(formData);
      if (result?.error) setActionError(result.error);
      else { setShowCreate(false); router.refresh(); }
    });
  }

  function handleUpdate(templateId: string, e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setActionError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await updateOfferTemplate(templateId, formData);
      if (result?.error) setActionError(result.error);
      else { setEditId(null); router.refresh(); }
    });
  }

  function handleArchive(templateId: string) {
    startTransition(async () => {
      await archiveOfferTemplate(templateId);
      router.refresh();
    });
  }

  function triggerPdfUpload(templateId: string) {
    uploadTargetId.current = templateId;
    setUploadError(null);
    fileInputRef.current?.click();
  }

  async function handlePdfFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    const templateId = uploadTargetId.current;
    if (!file || !templateId) return;
    if (file.type !== "application/pdf") {
      setUploadError("Nur PDF-Dateien erlaubt.");
      return;
    }
    e.target.value = "";

    setUploadingId(templateId);
    setUploadError(null);
    try {
      const fd = new FormData();
      fd.append("templateId", templateId);
      fd.append("file", file);
      const res = await fetch("/api/admin/offer-pdf-upload", { method: "POST", body: fd });
      const data = (await res.json()) as { key?: string; error?: string };
      if (data.error || !data.key) {
        setUploadError(data.error ?? "Upload fehlgeschlagen.");
        return;
      }
      router.refresh();
    } catch {
      setUploadError("Netzwerkfehler beim Upload.");
    } finally {
      setUploadingId(null);
    }
  }

  return (
    <div className="max-w-[1200px] mx-auto">
      {/* Hidden file input for PDF uploads */}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={handlePdfFileSelected}
      />

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#f0f0f0]">Angebots-Templates</h1>
          <p className="text-[#888] text-sm mt-1">{templates.length} aktive Templates</p>
        </div>
        <button
          onClick={() => { setShowCreate(true); setActionError(null); }}
          className="flex items-center gap-2 bg-[#00b8ff] hover:bg-[#0099dd] text-black font-semibold text-sm px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={15} />
          Neues Template
        </button>
      </div>

      {actionError && (
        <div className="mb-4 px-4 py-3 bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.2)] rounded-lg text-[#ef4444] text-sm">
          {actionError}
        </div>
      )}
      {uploadError && (
        <div className="mb-4 px-4 py-3 bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.2)] rounded-lg text-[#ef4444] text-sm">
          {uploadError}
        </div>
      )}

      {/* Create form */}
      {showCreate && (
        <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-6 mb-6">
          <h2 className="text-sm font-semibold text-[#f0f0f0] mb-4">Neues Template anlegen</h2>
          <form onSubmit={handleCreate}>
            <TemplateForm />
            <div className="flex items-center gap-3 mt-4">
              <button
                type="submit"
                disabled={pending}
                className="flex items-center gap-2 px-4 py-2 bg-[#00b8ff] hover:bg-[#0099dd] disabled:opacity-50 text-black font-semibold text-sm rounded-lg"
              >
                <Check size={14} />
                {pending ? "Wird gespeichert…" : "Speichern"}
              </button>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 text-sm text-[#666] hover:text-[#f0f0f0]"
              >
                Abbrechen
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Template list */}
      {templates.length === 0 && !showCreate ? (
        <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl py-16 text-center">
          <p className="text-[#666] text-sm">Noch keine Templates. Erstellen Sie das erste Template.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {templates.map((template) => (
            <div
              key={template.id}
              className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-5"
            >
              {editId === template.id ? (
                <form onSubmit={(e) => handleUpdate(template.id, e)}>
                  <TemplateForm defaultValues={template} />
                  <div className="flex items-center gap-3 mt-4">
                    <button
                      type="submit"
                      disabled={pending}
                      className="flex items-center gap-2 px-4 py-2 bg-[#00b8ff] hover:bg-[#0099dd] disabled:opacity-50 text-black font-semibold text-sm rounded-lg"
                    >
                      <Check size={14} />
                      {pending ? "…" : "Speichern"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditId(null)}
                      className="px-4 py-2 text-sm text-[#666] hover:text-[#f0f0f0]"
                    >
                      Abbrechen
                    </button>
                  </div>
                </form>
              ) : (
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-[#00b8ff] uppercase tracking-wide">
                        {template.packageType}
                      </span>
                      <span className="text-xs text-[#555]">· {template._count.offers} Angebote</span>
                      {template.r2Key && (
                        <span className="flex items-center gap-1 text-xs text-[#22c55e]">
                          <FileText size={11} />
                          PDF hochgeladen
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-semibold text-[#f0f0f0] mb-0.5">{template.name}</h3>
                    {template.description && (
                      <p className="text-sm text-[#888]">{template.description}</p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-sm">
                      <span className="font-mono text-[#22c55e] font-semibold">
                        {template.currency} {(template.priceNet / 100).toLocaleString("de-DE")} netto
                      </span>
                      <span className="text-[#666]">· Gültig {template.validDays} Tage</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => triggerPdfUpload(template.id)}
                      disabled={uploadingId === template.id}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-[#888] hover:text-[#f0f0f0] border border-[#1a2840] hover:border-[#243550] rounded-lg transition-colors disabled:opacity-40"
                      title="PDF hochladen"
                    >
                      {uploadingId === template.id ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <Upload size={12} />
                      )}
                      {template.r2Key ? "PDF ersetzen" : "PDF hochladen"}
                    </button>
                    <button
                      onClick={() => setEditId(template.id)}
                      className="p-2 text-[#666] hover:text-[#f0f0f0] transition-colors"
                      title="Bearbeiten"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => handleArchive(template.id)}
                      disabled={pending}
                      className="p-2 text-[#666] hover:text-[#ef4444] transition-colors disabled:opacity-40"
                      title="Archivieren"
                    >
                      <Archive size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Archived templates toggle */}
      {archivedTemplates.length > 0 && (
        <div className="mt-8">
          <button
            onClick={() => setShowArchived((v) => !v)}
            className="flex items-center gap-2 text-sm text-[#666] hover:text-[#f0f0f0] transition-colors"
          >
            <Archive size={14} />
            {showArchived ? "Archiv ausblenden" : `Archiv anzeigen (${archivedTemplates.length})`}
          </button>
          {showArchived && (
            <div className="mt-3 space-y-2 opacity-50">
              {archivedTemplates.map((t) => (
                <div key={t.id} className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <span className="text-sm text-[#888]">{t.name}</span>
                    <span className="text-xs text-[#555] ml-2 font-mono">
                      {t.currency} {(t.priceNet / 100).toLocaleString("de-DE")}
                    </span>
                  </div>
                  <span className="text-xs text-[#555]">archiviert</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TemplateForm({
  defaultValues,
}: {
  defaultValues?: {
    name: string;
    packageType: string;
    description: string | null;
    priceNet: number;
    currency: string;
    validDays: number;
  };
}) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="block text-xs font-medium text-[#888] uppercase tracking-wide mb-1.5">Name *</label>
        <input
          name="name"
          defaultValue={defaultValues?.name ?? ""}
          required
          className="w-full bg-[#080d14] border border-[#1a2840] rounded-lg px-3 py-2.5 text-sm text-[#f0f0f0] focus:outline-none focus:border-[#00b8ff] transition-colors"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-[#888] uppercase tracking-wide mb-1.5">Pakettyp</label>
        <select
          name="packageType"
          defaultValue={defaultValues?.packageType ?? "custom"}
          className="w-full bg-[#080d14] border border-[#1a2840] rounded-lg px-3 py-2.5 text-sm text-[#f0f0f0] focus:outline-none focus:border-[#00b8ff] transition-colors"
        >
          {PACKAGE_TYPES.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
      </div>
      <div className="col-span-2">
        <label className="block text-xs font-medium text-[#888] uppercase tracking-wide mb-1.5">Beschreibung</label>
        <textarea
          name="description"
          defaultValue={defaultValues?.description ?? ""}
          rows={2}
          className="w-full bg-[#080d14] border border-[#1a2840] rounded-lg px-3 py-2.5 text-sm text-[#f0f0f0] placeholder-[#444] focus:outline-none focus:border-[#00b8ff] resize-none"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-[#888] uppercase tracking-wide mb-1.5">Nettobetrag (€) *</label>
        <input
          name="priceNet"
          type="number"
          step="0.01"
          min="0"
          defaultValue={defaultValues ? String(defaultValues.priceNet / 100) : ""}
          required
          className="w-full bg-[#080d14] border border-[#1a2840] rounded-lg px-3 py-2.5 text-sm text-[#f0f0f0] focus:outline-none focus:border-[#00b8ff] transition-colors"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-[#888] uppercase tracking-wide mb-1.5">Gültigkeitsdauer (Tage)</label>
        <input
          name="validDays"
          type="number"
          min="1"
          defaultValue={defaultValues?.validDays ?? 30}
          className="w-full bg-[#080d14] border border-[#1a2840] rounded-lg px-3 py-2.5 text-sm text-[#f0f0f0] focus:outline-none focus:border-[#00b8ff] transition-colors"
        />
      </div>
    </div>
  );
}
