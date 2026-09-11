"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  FileText,
  Hash,
  Plus,
  Upload,
  X,
} from "lucide-react";
import { isFailure } from "@/lib/action-result";
import {
  Banner,
  Field,
  GhostButton,
  Panel,
  Pill,
  PrimaryButton,
  inputClass,
} from "@/components/ui/admin-form";
import { CONTRACT_DOCUMENT_TYPES } from "@/lib/closing/document-types";
import {
  activateDocumentVersion,
  backfillDocumentHashes,
  createContractDocument,
  createDocumentVersion,
  deactivateDocumentVersion,
  toggleContractDocument,
} from "./actions";

/**
 * Verwaltung der Vertragsdokumente.
 *
 * Eine neue Version überschreibt niemals eine bestehende Datei: sie entsteht als
 * eigener Datensatz mit eigenem R2-Objekt und eigenem SHA-256-Hash. Bereits
 * erteilte Zustimmungen bleiben dauerhaft mit ihrer Version verknüpft.
 */

export type DocVersion = {
  id: string;
  version: string;
  title: string;
  isActive: boolean;
  sha256: string | null;
  hasFile: boolean;
  hasContent: boolean;
  fileName: string | null;
  fileSize: number | null;
  createdAt: string;
  validFrom: string | null;
  validUntil: string | null;
  usageCount: number;
};

export type ContractDoc = {
  id: string;
  type: string;
  name: string;
  description: string | null;
  isActive: boolean;
  displayOrder: number;
  versions: DocVersion[];
};

export function VertragsdokumenteClient({ documents }: { documents: ContractDoc[] }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const [showNewDoc, setShowNewDoc] = useState(false);
  const [versionFor, setVersionFor] = useState<string | null>(null);

  function run(fn: () => Promise<unknown>, success: string) {
    setMessage(null);
    startTransition(async () => {
      const result = await fn();
      if (isFailure(result as object)) {
        setMessage({ kind: "error", text: (result as { error: string }).error });
      } else {
        setMessage({ kind: "success", text: success });
        setShowNewDoc(false);
        setVersionFor(null);
      }
    });
  }

  const missingHashes = documents
    .flatMap((d) => d.versions)
    .filter((v) => !v.sha256).length;

  return (
    <div className="max-w-[1000px]">
      <Link
        href="/admin/einstellungen"
        className="flex items-center gap-2 text-[#8899b4] hover:text-[#eef2f7] text-sm transition-colors mb-4"
      >
        <ArrowLeft size={14} /> Zurück zu den Einstellungen
      </Link>

      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#eef2f7] mb-1">Vertragsdokumente</h1>
          <p className="text-[#8899b4] text-sm max-w-2xl">
            AGB, AVV, Datenschutzerklärung und weitere Vertragsanlagen. Jede Version wird
            unveränderlich gespeichert und mit einem SHA-256-Hash nachgewiesen — eine neue
            Version ersetzt niemals die Datei einer alten.
          </p>
        </div>
        <PrimaryButton
          onClick={() => setShowNewDoc((v) => !v)}
          className="flex items-center gap-2 flex-shrink-0"
        >
          <Plus size={14} /> Dokument anlegen
        </PrimaryButton>
      </div>

      {message && (
        <div className="mb-5">
          <Banner kind={message.kind}>{message.text}</Banner>
        </div>
      )}

      {missingHashes > 0 && (
        <div className="mb-5 flex items-center justify-between gap-4 px-4 py-3 rounded-lg border border-[#f59e0b]/25 bg-[rgba(245,158,11,0.08)]">
          <p className="text-[#fbbf24] text-sm">
            Für {missingHashes} Version(en) liegt noch kein Hash vor (z. B. aus dem Altbestand).
          </p>
          <GhostButton
            onClick={() => run(() => backfillDocumentHashes(), "Hashes berechnet.")}
            disabled={pending}
          >
            <span className="flex items-center gap-1.5">
              <Hash size={13} /> Hashes berechnen
            </span>
          </GhostButton>
        </div>
      )}

      {showNewDoc && (
        <div className="mb-5">
          <Panel title="Neues Vertragsdokument">
            <form
              action={(fd) => run(() => createContractDocument(fd), "Dokument angelegt.")}
              className="grid sm:grid-cols-2 gap-4"
            >
              <Field label="Name" required>
                <input name="name" required className={inputClass} placeholder="z. B. AGB" />
              </Field>
              <Field label="Typ" required>
                <select name="type" required className={inputClass} defaultValue="agb">
                  {CONTRACT_DOCUMENT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="sm:col-span-2">
                <Field label="Beschreibung">
                  <input name="description" className={inputClass} />
                </Field>
              </div>
              <Field label="Sortierung">
                <input name="displayOrder" type="number" defaultValue={0} className={inputClass} />
              </Field>
              <div className="sm:col-span-2 flex gap-2">
                <PrimaryButton type="submit" disabled={pending}>
                  Anlegen
                </PrimaryButton>
                <GhostButton type="button" onClick={() => setShowNewDoc(false)}>
                  Abbrechen
                </GhostButton>
              </div>
            </form>
          </Panel>
        </div>
      )}

      <div className="space-y-4">
        {documents.length === 0 && (
          <Panel title="Noch keine Vertragsdokumente">
            <p className="text-[#8899b4] text-sm">
              Legen Sie AGB, AVV und weitere Unterlagen an und laden Sie die jeweilige
              PDF-Version hoch. Ohne aktive Dokumentversion lässt sich kein Vertragsabschluss
              starten.
            </p>
          </Panel>
        )}

        {documents.map((doc) => {
          const active = doc.versions.find((v) => v.isActive);
          return (
            <Panel
              key={doc.id}
              title={doc.name}
              subtitle={doc.description ?? undefined}
              action={
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Pill tone={doc.isActive ? "on" : "off"}>
                    {doc.isActive ? "aktiv" : "inaktiv"}
                  </Pill>
                  <GhostButton
                    onClick={() =>
                      run(
                        () => toggleContractDocument(doc.id, !doc.isActive),
                        doc.isActive ? "Dokument deaktiviert." : "Dokument aktiviert."
                      )
                    }
                    disabled={pending}
                  >
                    {doc.isActive ? "Deaktivieren" : "Aktivieren"}
                  </GhostButton>
                  <GhostButton
                    onClick={() => setVersionFor(versionFor === doc.id ? null : doc.id)}
                  >
                    <span className="flex items-center gap-1.5">
                      <Upload size={13} /> Neue Version
                    </span>
                  </GhostButton>
                </div>
              }
            >
              {versionFor === doc.id && (
                <div className="mb-5">
                  <NewVersionForm
                    documentId={doc.id}
                    suggestedVersion={nextVersionLabel(active?.version ?? null)}
                    pending={pending}
                    onSubmit={(fd) =>
                      run(() => createDocumentVersion(doc.id, fd), "Neue Version gespeichert.")
                    }
                    onCancel={() => setVersionFor(null)}
                  />
                </div>
              )}

              {doc.versions.length === 0 ? (
                <p className="text-[#8899b4] text-sm">
                  Noch keine Version hinterlegt. Laden Sie die erste PDF-Version hoch.
                </p>
              ) : (
                <div className="space-y-2">
                  {doc.versions.map((version) => (
                    <div
                      key={version.id}
                      className="flex flex-wrap items-center gap-3 px-4 py-3 rounded-lg border border-[#1a2840] bg-[#0a1119]"
                    >
                      <div className="flex items-center gap-2 min-w-[140px]">
                        <FileText size={14} className="text-[#5b6b7f]" />
                        <span className="text-[#eef2f7] text-sm font-semibold">
                          Version {version.version}
                        </span>
                        {version.isActive && <Pill tone="on">aktiv</Pill>}
                      </div>

                      <div className="flex-1 min-w-[220px]">
                        <p className="text-[#5b6b7f] text-xs font-mono break-all">
                          {version.sha256 ? `SHA-256 ${version.sha256}` : "kein Hash"}
                        </p>
                        <p className="text-[#5b6b7f] text-xs mt-0.5">
                          {new Date(version.createdAt).toLocaleDateString("de-DE")}
                          {version.fileName && ` · ${version.fileName}`}
                          {version.usageCount > 0 &&
                            ` · in ${version.usageCount} Abschluss/Abschlüssen referenziert`}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {(version.hasFile || version.hasContent) && (
                          <a
                            href={`/api/admin/contract-documents/download?versionId=${version.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 rounded-lg border border-[#1a2840] text-[#8899b4] text-xs hover:text-[#eef2f7] transition-colors"
                          >
                            Öffnen
                          </a>
                        )}
                        {version.isActive ? (
                          <GhostButton
                            onClick={() =>
                              run(
                                () => deactivateDocumentVersion(version.id),
                                "Version deaktiviert."
                              )
                            }
                            disabled={pending}
                            className="!px-3 !py-1.5 !text-xs"
                          >
                            <span className="flex items-center gap-1">
                              <X size={11} /> Deaktivieren
                            </span>
                          </GhostButton>
                        ) : (
                          <GhostButton
                            onClick={() =>
                              run(() => activateDocumentVersion(version.id), "Version aktiviert.")
                            }
                            disabled={pending}
                            className="!px-3 !py-1.5 !text-xs"
                          >
                            <span className="flex items-center gap-1">
                              <Check size={11} /> Aktivieren
                            </span>
                          </GhostButton>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          );
        })}
      </div>
    </div>
  );
}

function nextVersionLabel(current: string | null): string {
  if (!current) return "1.0";
  const match = current.match(/^(\d+)\.(\d+)$/);
  if (!match) return current;
  return `${match[1]}.${Number(match[2]) + 1}`;
}

function NewVersionForm({
  documentId,
  suggestedVersion,
  pending,
  onSubmit,
  onCancel,
}: {
  documentId: string;
  suggestedVersion: string;
  pending: boolean;
  onSubmit: (formData: FormData) => void;
  onCancel: () => void;
}) {
  const [upload, setUpload] = useState<{
    r2Key: string;
    sha256: string;
    fileSize: number;
    fileName: string;
  } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleUpload(file: File) {
    setUploading(true);
    setUploadError(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/admin/contract-documents/upload", { method: "POST", body });
      const data = (await res.json()) as {
        r2Key?: string;
        sha256?: string;
        fileSize?: number;
        fileName?: string;
        error?: string;
      };
      if (!res.ok || !data.r2Key) {
        setUploadError(data.error ?? "Upload fehlgeschlagen.");
        return;
      }
      setUpload({
        r2Key: data.r2Key,
        sha256: data.sha256!,
        fileSize: data.fileSize!,
        fileName: data.fileName!,
      });
    } catch {
      setUploadError("Netzwerkfehler beim Upload.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <form
      action={onSubmit}
      className="rounded-lg border border-[#00b8ff]/25 bg-[rgba(0,184,255,0.04)] p-4 space-y-4"
    >
      <input type="hidden" name="r2Key" value={upload?.r2Key ?? ""} />
      <input type="hidden" name="sha256" value={upload?.sha256 ?? ""} />
      <input type="hidden" name="fileSize" value={upload?.fileSize ?? ""} />
      <input type="hidden" name="fileName" value={upload?.fileName ?? ""} />

      <div className="grid sm:grid-cols-3 gap-4">
        <Field label="Versionsnummer" required>
          <input
            name="version"
            required
            defaultValue={suggestedVersion}
            className={inputClass}
          />
        </Field>
        <Field label="Titel (optional)">
          <input name="title" className={inputClass} />
        </Field>
        <Field label="Gültig ab">
          <input name="validFrom" type="date" className={inputClass} />
        </Field>
      </div>

      <div>
        <span className="block text-[#8899b4] text-xs font-semibold mb-1.5">PDF-Datei</span>
        <div className="flex items-center gap-3">
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleUpload(file);
            }}
            className="text-[#8899b4] text-xs file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:bg-[#16283d] file:text-[#8899b4] file:text-xs"
          />
          {uploading && <span className="text-[#8899b4] text-xs">lädt…</span>}
        </div>
        {upload && (
          <p className="mt-2 text-[#22c55e] text-xs font-mono break-all">
            {upload.fileName} · SHA-256 {upload.sha256}
          </p>
        )}
        {uploadError && <p className="mt-2 text-[#fca5a5] text-xs">{uploadError}</p>}
      </div>

      <Field
        label="Alternativ: Textinhalt"
        hint="Wird nur genutzt, wenn keine PDF-Datei hochgeladen wurde. Der Hash wird über den Text gebildet."
      >
        <textarea name="content" rows={4} className={inputClass} />
      </Field>

      <Field
        label="Paketzuordnung"
        hint="Optional, kommagetrennte Paket-Schlüssel. Leer = gilt für alle Pakete."
      >
        <input name="packageScope" className={inputClass} placeholder="z. B. foundation, operations" />
      </Field>

      <label className="flex items-center gap-2 text-[#c9d4e4] text-sm">
        <input type="checkbox" name="activate" value="true" defaultChecked className="accent-[#00b8ff]" />
        Diese Version sofort aktivieren (die bisher aktive Version wird deaktiviert, bleibt aber
        unverändert erhalten)
      </label>

      <div className="flex gap-2">
        <PrimaryButton type="submit" disabled={pending || uploading}>
          Version speichern
        </PrimaryButton>
        <GhostButton type="button" onClick={onCancel}>
          Abbrechen
        </GhostButton>
      </div>
      <input type="hidden" name="documentId" value={documentId} />
    </form>
  );
}
