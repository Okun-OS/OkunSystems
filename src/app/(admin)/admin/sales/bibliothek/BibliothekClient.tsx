"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Edit2, Trash2, Eye, EyeOff, Check } from "lucide-react";
import { createSalesContent, updateSalesContent, deleteSalesContent, toggleSalesContentStatus } from "./actions";

const CONTENT_TYPES = [
  { value: "closing_script", label: "Closing-Skript" },
  { value: "objection", label: "Einwand" },
  { value: "faq", label: "FAQ" },
  { value: "package_info", label: "Paket-Info" },
  { value: "guide", label: "Leitfaden" },
];

const TYPE_COLORS: Record<string, string> = {
  closing_script: "bg-[rgba(0,184,255,0.1)] text-[#00b8ff]",
  objection: "bg-[rgba(239,68,68,0.1)] text-[#ef4444]",
  faq: "bg-[rgba(245,158,11,0.1)] text-[#f59e0b]",
  package_info: "bg-[rgba(34,197,94,0.1)] text-[#22c55e]",
  guide: "bg-[#1a2840] text-[#8899b4]",
};

type SalesContentItem = {
  id: string;
  type: string;
  category: string | null;
  title: string;
  content: string;
  order: number;
  status: string;
};

interface Props {
  items: SalesContentItem[];
}

export function BibliothekClient({ items }: Props) {
  const router = useRouter();
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [showCreate, setShowCreate] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const allTypes = Array.from(new Set(items.map((i) => i.type)));
  const filtered = typeFilter === "all" ? items : items.filter((i) => i.type === typeFilter);

  function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setActionError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await createSalesContent(fd);
      if (result?.error) setActionError(result.error);
      else { setShowCreate(false); router.refresh(); }
    });
  }

  function handleUpdate(id: string, e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setActionError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await updateSalesContent(id, fd);
      if (result?.error) setActionError(result.error);
      else { setEditId(null); router.refresh(); }
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteSalesContent(id);
      router.refresh();
    });
  }

  function handleToggle(id: string) {
    startTransition(async () => {
      await toggleSalesContentStatus(id);
      router.refresh();
    });
  }

  return (
    <div className="max-w-[1200px] mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#f0f0f0]">Sales-Bibliothek</h1>
          <p className="text-[#888] text-sm mt-1">{items.filter((i) => i.status === "published").length} veröffentlichte Inhalte</p>
        </div>
        <button
          onClick={() => { setShowCreate(true); setActionError(null); }}
          className="flex items-center gap-2 bg-[#00b8ff] hover:bg-[#0099dd] text-black font-semibold text-sm px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={15} />
          Neuer Inhalt
        </button>
      </div>

      {actionError && (
        <div className="mb-4 px-4 py-3 bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.2)] rounded-lg text-[#ef4444] text-sm">
          {actionError}
        </div>
      )}

      {/* Type filter chips */}
      <div className="flex flex-wrap gap-2 mb-6">
        {["all", ...allTypes].map((type) => {
          const typeLabel = type === "all" ? "Alle" : CONTENT_TYPES.find((t) => t.value === type)?.label ?? type;
          return (
            <button
              key={type}
              onClick={() => setTypeFilter(type)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                typeFilter === type
                  ? "bg-[#00b8ff] text-black"
                  : "bg-[#0c1520] border border-[#1a2840] text-[#888] hover:text-[#f0f0f0]"
              }`}
            >
              {typeLabel}
            </button>
          );
        })}
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-6 mb-6">
          <h2 className="text-sm font-semibold text-[#f0f0f0] mb-4">Neuer Inhalt</h2>
          <form onSubmit={handleCreate}>
            <ContentForm />
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

      {/* List */}
      {filtered.length === 0 ? (
        <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl py-16 text-center">
          <p className="text-[#666] text-sm">Keine Inhalte gefunden.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((item) => (
            <div
              key={item.id}
              className={`bg-[#0c1520] border rounded-xl transition-colors ${
                item.status === "draft" ? "border-[#111e30] opacity-60" : "border-[#1a2840]"
              }`}
            >
              {editId === item.id ? (
                <div className="p-6">
                  <form onSubmit={(e) => handleUpdate(item.id, e)}>
                    <ContentForm defaultValues={item} />
                    <div className="flex items-center gap-3 mt-4">
                      <button
                        type="submit"
                        disabled={pending}
                        className="flex items-center gap-2 px-4 py-2 bg-[#00b8ff] hover:bg-[#0099dd] disabled:opacity-50 text-black font-semibold text-sm rounded-lg"
                      >
                        <Check size={14} />
                        {pending ? "…" : "Speichern"}
                      </button>
                      <button type="button" onClick={() => setEditId(null)} className="px-4 py-2 text-sm text-[#666] hover:text-[#f0f0f0]">
                        Abbrechen
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <button
                      className="flex-1 text-left"
                      onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded ${TYPE_COLORS[item.type] ?? "bg-[#1a2840] text-[#888]"}`}>
                          {CONTENT_TYPES.find((t) => t.value === item.type)?.label ?? item.type}
                        </span>
                        {item.category && <span className="text-[10px] text-[#555]">{item.category}</span>}
                        {item.status === "draft" && <span className="text-[10px] text-[#666] italic">Entwurf</span>}
                      </div>
                      <div className="text-sm font-medium text-[#f0f0f0]">{item.title}</div>
                      {expandedId === item.id && (
                        <div className="mt-3 pt-3 border-t border-[#1a2840] text-sm text-[#aab4c4] leading-relaxed whitespace-pre-wrap">
                          {item.content}
                        </div>
                      )}
                    </button>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => handleToggle(item.id)}
                        disabled={pending}
                        className="p-1.5 text-[#666] hover:text-[#f0f0f0] transition-colors disabled:opacity-40"
                        title={item.status === "published" ? "Auf Entwurf setzen" : "Veröffentlichen"}
                      >
                        {item.status === "published" ? <Eye size={14} /> : <EyeOff size={14} />}
                      </button>
                      <button
                        onClick={() => setEditId(item.id)}
                        className="p-1.5 text-[#666] hover:text-[#f0f0f0] transition-colors"
                        title="Bearbeiten"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        disabled={pending}
                        className="p-1.5 text-[#666] hover:text-[#ef4444] transition-colors disabled:opacity-40"
                        title="Löschen"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ContentForm({
  defaultValues,
}: {
  defaultValues?: {
    type: string;
    category: string | null;
    title: string;
    content: string;
    order: number;
  };
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-medium text-[#888] uppercase tracking-wide mb-1.5">Typ</label>
          <select
            name="type"
            defaultValue={defaultValues?.type ?? "closing_script"}
            className="w-full bg-[#080d14] border border-[#1a2840] rounded-lg px-3 py-2.5 text-sm text-[#f0f0f0] focus:outline-none focus:border-[#00b8ff] transition-colors"
          >
            {CONTENT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-[#888] uppercase tracking-wide mb-1.5">Kategorie</label>
          <input
            name="category"
            defaultValue={defaultValues?.category ?? ""}
            placeholder="z.B. Preis-Einwand"
            className="w-full bg-[#080d14] border border-[#1a2840] rounded-lg px-3 py-2.5 text-sm text-[#f0f0f0] placeholder-[#444] focus:outline-none focus:border-[#00b8ff] transition-colors"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-[#888] uppercase tracking-wide mb-1.5">Reihenfolge</label>
          <input
            name="order"
            type="number"
            defaultValue={defaultValues?.order ?? 0}
            className="w-full bg-[#080d14] border border-[#1a2840] rounded-lg px-3 py-2.5 text-sm text-[#f0f0f0] focus:outline-none focus:border-[#00b8ff] transition-colors"
          />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-[#888] uppercase tracking-wide mb-1.5">Titel *</label>
        <input
          name="title"
          defaultValue={defaultValues?.title ?? ""}
          required
          className="w-full bg-[#080d14] border border-[#1a2840] rounded-lg px-3 py-2.5 text-sm text-[#f0f0f0] focus:outline-none focus:border-[#00b8ff] transition-colors"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-[#888] uppercase tracking-wide mb-1.5">Inhalt *</label>
        <textarea
          name="content"
          defaultValue={defaultValues?.content ?? ""}
          required
          rows={8}
          placeholder="Skript, Einwandbehandlung oder FAQ-Antwort…"
          className="w-full bg-[#080d14] border border-[#1a2840] rounded-lg px-3 py-2.5 text-sm text-[#f0f0f0] placeholder-[#444] focus:outline-none focus:border-[#00b8ff] resize-y"
        />
      </div>
    </div>
  );
}
