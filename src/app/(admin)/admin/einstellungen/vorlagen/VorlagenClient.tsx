"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Eye, History, Plus, Save, Star, Trash2 } from "lucide-react";
import { isFailure } from "@/lib/action-result";
import { TEMPLATE_TYPE_LABELS } from "@/lib/documents/template-type-labels";
import {
  Banner,
  Field,
  GhostButton,
  Panel,
  Pill,
  PrimaryButton,
  inputClass,
  textareaClass,
} from "@/components/ui/admin-form";
import {
  createCustomPlaceholder,
  deleteCustomPlaceholder,
  restoreTemplateVersion,
  saveTemplateVersion,
  setTemplateDefault,
  toggleTemplateActive,
} from "./actions";

/**
 * Vorlagen-Editor.
 *
 * Jede Änderung an HTML oder CSS legt eine neue Version an; bereits erzeugte
 * Dokumente verweisen auf ihre Version und bleiben unverändert. Die Vorschau
 * rendert serverseitig mit einem klar gekennzeichneten Musterdatensatz.
 */

export type TemplateView = {
  id: string;
  type: string;
  name: string;
  description: string | null;
  isActive: boolean;
  isDefault: boolean;
  currentVersion: number;
  versions: Array<{ version: number; note: string | null; createdAt: string }>;
  placeholders: Array<{
    id: string;
    key: string;
    label: string;
    type: string;
    defaultValue: string | null;
    isRequired: boolean;
  }>;
};

const PLACEHOLDER_TYPES = [
  { value: "text", label: "Text" },
  { value: "multiline", label: "Mehrzeiliger Text" },
  { value: "number", label: "Zahl" },
  { value: "date", label: "Datum" },
  { value: "currency", label: "Betrag" },
  { value: "boolean", label: "Ja/Nein" },
];

const SYSTEM_PLACEHOLDER_HELP = [
  "{{company.name}}", "{{company.addressLines}}", "{{company.iban}}", "{{company.bic}}",
  "{{company.vatId}}", "{{customer.addressLines}}", "{{customer.contact}}",
  "{{invoice.number}}", "{{invoice.date}}", "{{invoice.due_date}}", "{{invoice.service_date}}",
  "{{invoice.net_total}}", "{{invoice.vat_total}}", "{{invoice.gross_total}}",
  "{{invoice.payment_terms}}",
];

export function VorlagenClient({
  templates,
  activeId,
  activeHtml,
  activeCss,
}: {
  templates: TemplateView[];
  activeId: string | null;
  activeHtml: string;
  activeCss: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const [html, setHtml] = useState(activeHtml);
  const [css, setCss] = useState(activeCss);
  const [preview, setPreview] = useState<string>("");
  const [previewMissing, setPreviewMissing] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const active = templates.find((t) => t.id === activeId) ?? null;

  useEffect(() => {
    setHtml(activeHtml);
    setCss(activeCss);
  }, [activeHtml, activeCss, activeId]);

  const loadPreview = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/template-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ html, css }),
      });
      const data = (await res.json()) as { html?: string; missing?: string[]; error?: string };
      if (data.html) {
        setPreview(data.html);
        setPreviewMissing(data.missing ?? []);
      } else {
        setMessage({ kind: "error", text: data.error ?? "Vorschau fehlgeschlagen." });
      }
    } catch {
      setMessage({ kind: "error", text: "Vorschau konnte nicht geladen werden." });
    }
  }, [html, css]);

  function run(fn: () => Promise<unknown>, success: string) {
    setMessage(null);
    startTransition(async () => {
      const result = await fn();
      if (isFailure(result as object)) {
        setMessage({ kind: "error", text: (result as { error: string }).error });
        return;
      }
      const unchanged = (result as { unchanged?: boolean }).unchanged;
      setMessage({
        kind: "success",
        text: unchanged
          ? "Keine Änderung — es wurde keine neue Version angelegt."
          : `${success}${(result as { version?: number }).version ? ` (Version ${(result as { version: number }).version})` : ""}`,
      });
      router.refresh();
    });
  }

  return (
    <div className="max-w-[1200px]">
      <Link
        href="/admin/einstellungen"
        className="flex items-center gap-2 text-[#8899b4] hover:text-[#eef2f7] text-sm transition-colors mb-4"
      >
        <ArrowLeft size={14} /> Zurück zu den Einstellungen
      </Link>

      <h1 className="text-2xl font-bold text-[#eef2f7] mb-1">Dokumentvorlagen</h1>
      <p className="text-[#8899b4] text-sm mb-6 max-w-2xl">
        HTML/CSS-Vorlagen für Rechnungen, Abschlussprotokolle und weitere Dokumente. Eine
        Änderung erzeugt immer eine neue Version — bereits erzeugte PDFs bleiben unverändert.
      </p>

      {message && (
        <div className="mb-5">
          <Banner kind={message.kind}>{message.text}</Banner>
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-6">
        {templates.map((template) => (
          <Link
            key={template.id}
            href={`/admin/einstellungen/vorlagen?template=${template.id}`}
            className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
              template.id === activeId
                ? "border-[#00b8ff]/50 bg-[rgba(0,184,255,0.12)] text-[#00b8ff]"
                : "border-[#1a2840] text-[#8899b4] hover:text-[#eef2f7]"
            }`}
          >
            {template.name}
            <span className="block text-xs opacity-70">
              {TEMPLATE_TYPE_LABELS[template.type] ?? template.type} · v{template.currentVersion}
            </span>
          </Link>
        ))}
      </div>

      {!active ? (
        <Panel title="Keine Vorlage vorhanden">
          <p className="text-[#8899b4] text-sm">
            Es ist noch keine Dokumentvorlage angelegt. Der Bootstrap legt beim Deploy die
            OKUN-Standardvorlagen für Rechnung und Abschlussprotokoll an.
          </p>
        </Panel>
      ) : (
        <div className="space-y-5">
          <Panel
            title={active.name}
            subtitle={active.description ?? undefined}
            action={
              <div className="flex items-center gap-2 flex-shrink-0">
                <Pill tone={active.isDefault ? "on" : "muted"}>
                  {active.isDefault ? "Standard" : "alternativ"}
                </Pill>
                <Pill tone={active.isActive ? "on" : "off"}>
                  {active.isActive ? "aktiv" : "inaktiv"}
                </Pill>
                {!active.isDefault && (
                  <GhostButton
                    onClick={() => run(() => setTemplateDefault(active.id), "Als Standard gesetzt.")}
                    disabled={pending}
                  >
                    <span className="flex items-center gap-1.5">
                      <Star size={12} /> Als Standard
                    </span>
                  </GhostButton>
                )}
                <GhostButton
                  onClick={() =>
                    run(
                      () => toggleTemplateActive(active.id, !active.isActive),
                      active.isActive ? "Vorlage deaktiviert." : "Vorlage aktiviert."
                    )
                  }
                  disabled={pending}
                >
                  {active.isActive ? "Deaktivieren" : "Aktivieren"}
                </GhostButton>
                <GhostButton onClick={() => setShowHistory((v) => !v)}>
                  <span className="flex items-center gap-1.5">
                    <History size={12} /> Versionen ({active.versions.length})
                  </span>
                </GhostButton>
              </div>
            }
          >
            {showHistory && (
              <div className="mb-5 space-y-1.5">
                {active.versions.map((v) => (
                  <div
                    key={v.version}
                    className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg border border-[#1a2840] bg-[#0a1119]"
                  >
                    <span className="text-[#c9d4e4] text-sm">
                      Version {v.version}
                      {v.version === active.currentVersion && (
                        <span className="ml-2 text-[#22c55e] text-xs">aktuell</span>
                      )}
                    </span>
                    <span className="text-[#5b6b7f] text-xs flex-1">
                      {new Date(v.createdAt).toLocaleString("de-DE")}
                      {v.note && ` · ${v.note}`}
                    </span>
                    {v.version !== active.currentVersion && (
                      <GhostButton
                        onClick={() =>
                          run(
                            () => restoreTemplateVersion(active.id, v.version),
                            `Version ${v.version} wiederhergestellt.`
                          )
                        }
                        disabled={pending}
                        className="!px-2.5 !py-1 !text-xs"
                      >
                        Wiederherstellen
                      </GhostButton>
                    )}
                  </div>
                ))}
              </div>
            )}

            <form
              action={(fd) => {
                fd.set("html", html);
                fd.set("css", css);
                run(() => saveTemplateVersion(active.id, fd), "Neue Version gespeichert.");
              }}
              className="space-y-4"
            >
              <div className="grid lg:grid-cols-2 gap-4">
                <Field label="Name">
                  <input name="name" defaultValue={active.name} className={inputClass} />
                </Field>
                <Field label="Änderungsnotiz">
                  <input name="note" className={inputClass} placeholder="z. B. Fußzeile angepasst" />
                </Field>
              </div>

              <Field label="Template-HTML">
                <textarea
                  value={html}
                  onChange={(e) => setHtml(e.target.value)}
                  rows={16}
                  className={`${textareaClass} text-xs`}
                  spellCheck={false}
                />
              </Field>

              <Field label="Template-CSS">
                <textarea
                  value={css}
                  onChange={(e) => setCss(e.target.value)}
                  rows={10}
                  className={`${textareaClass} text-xs`}
                  spellCheck={false}
                />
              </Field>

              <div className="flex flex-wrap gap-2">
                <PrimaryButton type="submit" disabled={pending} className="flex items-center gap-2">
                  <Save size={14} /> Als neue Version speichern
                </PrimaryButton>
                <GhostButton type="button" onClick={() => void loadPreview()}>
                  <span className="flex items-center gap-1.5">
                    <Eye size={13} /> Vorschau aktualisieren
                  </span>
                </GhostButton>
              </div>
            </form>
          </Panel>

          {preview && (
            <Panel
              title="Vorschau"
              subtitle="Musterdatensatz zur Layoutkontrolle — Firmendaten stammen aus den Unternehmenseinstellungen."
            >
              {previewMissing.length > 0 && (
                <div className="mb-3">
                  <Banner kind="info">
                    Nicht auflösbare Platzhalter: {previewMissing.join(", ")}
                  </Banner>
                </div>
              )}
              <iframe
                title="Vorlagenvorschau"
                srcDoc={preview}
                sandbox=""
                className="w-full h-[900px] rounded-lg border border-[#1a2840] bg-white"
              />
            </Panel>
          )}

          <Panel
            title="Eigene Platzhalter"
            subtitle="Beim Erstellen einer Rechnung erscheint für jeden Platzhalter ein Eingabefeld. Im Template als {{custom.<key>}} verwendbar. Systemfelder lassen sich nicht überschreiben."
          >
            <div className="space-y-2 mb-5">
              {active.placeholders.length === 0 && (
                <p className="text-[#8899b4] text-sm">Noch keine eigenen Platzhalter definiert.</p>
              )}
              {active.placeholders.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg border border-[#1a2840] bg-[#0a1119]"
                >
                  <code className="text-[#00b8ff] text-xs font-mono">{`{{custom.${p.key}}}`}</code>
                  <span className="text-[#c9d4e4] text-sm flex-1">{p.label}</span>
                  <span className="text-[#5b6b7f] text-xs">
                    {PLACEHOLDER_TYPES.find((t) => t.value === p.type)?.label ?? p.type}
                    {p.isRequired && " · Pflicht"}
                  </span>
                  <GhostButton
                    onClick={() => run(() => deleteCustomPlaceholder(p.id), "Platzhalter gelöscht.")}
                    disabled={pending}
                    className="!px-2 !py-1"
                  >
                    <Trash2 size={12} />
                  </GhostButton>
                </div>
              ))}
            </div>

            <form
              action={(fd) =>
                run(() => createCustomPlaceholder(active.id, fd), "Platzhalter angelegt.")
              }
              className="grid sm:grid-cols-4 gap-3 items-end"
            >
              <Field label="Schlüssel" required>
                <input name="key" required className={inputClass} placeholder="project_reference" />
              </Field>
              <Field label="Anzeigename" required>
                <input name="label" required className={inputClass} placeholder="Projekt-Referenz" />
              </Field>
              <Field label="Typ">
                <select name="type" className={inputClass} defaultValue="text">
                  {PLACEHOLDER_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </Field>
              <PrimaryButton type="submit" disabled={pending} className="flex items-center gap-2">
                <Plus size={13} /> Anlegen
              </PrimaryButton>
            </form>
          </Panel>

          <Panel title="Systemplatzhalter" subtitle="Werden automatisch befüllt und sind geschützt.">
            <div className="flex flex-wrap gap-2">
              {SYSTEM_PLACEHOLDER_HELP.map((p) => (
                <code
                  key={p}
                  className="px-2 py-1 rounded bg-[#0a1119] border border-[#1a2840] text-[#7dd3fc] text-xs font-mono"
                >
                  {p}
                </code>
              ))}
            </div>
            <p className="text-[#5b6b7f] text-xs mt-3">
              Für Listen wie Rechnungspositionen steht eine echte Wiederholung zur Verfügung:
              <code className="mx-1 text-[#7dd3fc]">{"{{#each invoice.items}} … {{/each}}"}</code>
              mit den Feldern position, description, quantity, unit, unitPrice, vatRate,
              netAmount, vatAmount, grossAmount.
            </p>
          </Panel>
        </div>
      )}
    </div>
  );
}
