"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  FileText,
  Info,
  Pencil,
  Plus,
  ShieldCheck,
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
import { CONSENT_TYPES, CONSENT_TYPE_LABELS } from "@/lib/closing/consent-types";
import {
  activateDocumentVersion,
  backfillDocumentHashes,
  createContractDocument,
  createDocumentVersion,
  deactivateDocumentVersion,
  toggleContractDocument,
} from "./actions";
import {
  createConsentDefinition,
  toggleConsentDefinition,
  updateConsentDefinition,
} from "./consent-actions";

/**
 * Vertragsdokumente und die zugehörigen Checkbox-Texte auf einer Seite.
 *
 * Ein Dokument, seine Datei-Versionen und der Satz, den der Kunde im Closing
 * abhaken muss, gehören fachlich zusammen und werden deshalb gemeinsam
 * dargestellt und bearbeitet.
 *
 * Eine neue Datei-Version überschreibt niemals eine bestehende: sie entsteht als
 * eigener Datensatz mit eigenem R2-Objekt und eigener Prüfsumme. Bereits
 * erteilte Zustimmungen bleiben dauerhaft mit ihrer Version verknüpft.
 */

export type DocVersion = {
  id: string;
  version: string;
  isActive: boolean;
  sha256: string | null;
  hasFile: boolean;
  hasContent: boolean;
  fileName: string | null;
  createdAt: string;
  usageCount: number;
};

export type ConsentDef = {
  id: string;
  title: string;
  checkboxText: string;
  consentType: string;
  isRequired: boolean;
  isActive: boolean;
  displayOrder: number;
  version: number;
  usageCount: number;
};

export type ContractDoc = {
  id: string;
  type: string;
  name: string;
  description: string | null;
  isActive: boolean;
  displayOrder: number;
  consent: ConsentDef | null;
  versions: DocVersion[];
};

export function VertragsdokumenteClient({
  documents,
  standaloneConsents,
}: {
  documents: ContractDoc[];
  standaloneConsents: ConsentDef[];
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const [showNewDoc, setShowNewDoc] = useState(false);
  const [showNewConsent, setShowNewConsent] = useState(false);
  const [versionFor, setVersionFor] = useState<string | null>(null);
  const [consentFor, setConsentFor] = useState<string | null>(null);

  function run(fn: () => Promise<unknown>, success: string) {
    setMessage(null);
    startTransition(async () => {
      const result = await fn();
      if (isFailure(result as object)) {
        setMessage({ kind: "error", text: (result as { error: string }).error });
      } else {
        setMessage({ kind: "success", text: success });
        setShowNewDoc(false);
        setShowNewConsent(false);
        setVersionFor(null);
        setConsentFor(null);
      }
    });
  }

  const missingHashes = documents.flatMap((d) => d.versions).filter((v) => !v.sha256).length;

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
          <h1 className="text-2xl font-bold text-[#eef2f7] mb-1">
            Rechtliche Dokumente &amp; Erklärungen
          </h1>
          <p className="text-[#8899b4] text-sm max-w-2xl">
            AGB, AVV, Datenschutzerklärung und weitere Vertragsanlagen — jeweils mit der Datei und
            dem Satz, den der Kunde im Closing-Portal abhaken muss. Beides steht hier zusammen und
            ist frei bearbeitbar.
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

      <ChecksumExplainer
        missingHashes={missingHashes}
        pending={pending}
        onBackfill={() => run(() => backfillDocumentHashes(), "Prüfsummen berechnet.")}
      />

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
              <Field label="Reihenfolge" hint="Bestimmt die Position im Closing-Portal.">
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
              Legen Sie AGB, AVV und weitere Unterlagen an und laden Sie die jeweilige PDF-Version
              hoch. Ohne aktive Dokumentversion lässt sich kein Vertragsabschluss starten.
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
                  <GhostButton onClick={() => setVersionFor(versionFor === doc.id ? null : doc.id)}>
                    <span className="flex items-center gap-1.5">
                      <Upload size={13} /> Neue Version
                    </span>
                  </GhostButton>
                </div>
              }
            >
              {/* 1. Der Satz, den der Kunde abhakt. */}
              <SectionLabel>Checkbox im Closing-Portal</SectionLabel>

              {consentFor === doc.id ? (
                <ConsentEditor
                  consent={doc.consent}
                  documentId={doc.id}
                  lockRecordingType={false}
                  pending={pending}
                  onSubmit={(fd) =>
                    run(
                      () =>
                        doc.consent
                          ? updateConsentDefinition(doc.consent.id, fd)
                          : createConsentDefinition(fd),
                      doc.consent ? "Checkbox-Text gespeichert." : "Checkbox angelegt."
                    )
                  }
                  onCancel={() => setConsentFor(null)}
                />
              ) : doc.consent ? (
                <ConsentPreview
                  consent={doc.consent}
                  pending={pending}
                  onEdit={() => setConsentFor(doc.id)}
                  onToggle={() =>
                    run(
                      () => toggleConsentDefinition(doc.consent!.id, !doc.consent!.isActive),
                      doc.consent!.isActive ? "Checkbox deaktiviert." : "Checkbox aktiviert."
                    )
                  }
                />
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-lg border border-dashed border-[#1a2840] bg-[#0a1119]">
                  <p className="text-[#8899b4] text-sm">
                    Für dieses Dokument ist noch kein Checkbox-Text hinterlegt — im Closing-Portal
                    taucht es dadurch nicht als Zustimmung auf.
                  </p>
                  <GhostButton onClick={() => setConsentFor(doc.id)}>
                    <span className="flex items-center gap-1.5">
                      <Plus size={13} /> Checkbox anlegen
                    </span>
                  </GhostButton>
                </div>
              )}

              {/* 2. Die Dateien dahinter. */}
              <div className="mt-6">
                <SectionLabel>
                  Dateien{" "}
                  <span className="font-normal text-[#5b6b7f] normal-case tracking-normal">
                    — die Version, die der Kunde beim Abhaken sieht
                  </span>
                </SectionLabel>
              </div>

              {versionFor === doc.id && (
                <div className="mb-4">
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
                  Noch keine Datei hinterlegt. Laden Sie über „Neue Version“ die erste PDF hoch.
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
                          {version.sha256 ? (
                            <span title={version.sha256}>
                              Prüfsumme {version.sha256.slice(0, 16)}…
                            </span>
                          ) : (
                            "Prüfsumme noch nicht berechnet"
                          )}
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

      {/* Erklärungen ohne Datei — typischerweise die Aufzeichnungs-Einwilligung. */}
      <div className="mt-10 flex items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="text-lg font-bold text-[#eef2f7] mb-1">Erklärungen ohne Dokument</h2>
          <p className="text-[#8899b4] text-sm max-w-2xl">
            Zustimmungen, hinter denen keine Datei steht — etwa die Einwilligung in die
            Vertragsaufzeichnung. Ohne eine aktive Einwilligung dieses Typs kann keine Aufzeichnung
            gestartet werden.
          </p>
        </div>
        <GhostButton
          onClick={() => setShowNewConsent((v) => !v)}
          className="flex-shrink-0"
        >
          <span className="flex items-center gap-1.5">
            <Plus size={13} /> Erklärung anlegen
          </span>
        </GhostButton>
      </div>

      <div className="space-y-4">
        {showNewConsent && (
          <Panel title="Neue Erklärung ohne Dokument">
            <ConsentEditor
              consent={null}
              documentId={null}
              lockRecordingType
              pending={pending}
              onSubmit={(fd) => run(() => createConsentDefinition(fd), "Erklärung angelegt.")}
              onCancel={() => setShowNewConsent(false)}
            />
          </Panel>
        )}

        {standaloneConsents.length === 0 && !showNewConsent && (
          <Panel title="Keine Erklärung ohne Dokument hinterlegt">
            <p className="text-[#8899b4] text-sm">
              Solange hier keine aktive Einwilligung zur Vertragsaufzeichnung steht, bleibt die
              Aufzeichnung im Closing gesperrt.
            </p>
          </Panel>
        )}

        {standaloneConsents.map((consent) => (
          <Panel
            key={consent.id}
            title={consent.title}
            subtitle={CONSENT_TYPE_LABELS[consent.consentType] ?? consent.consentType}
            action={
              <div className="flex items-center gap-2 flex-shrink-0">
                <Pill tone={consent.isActive ? "on" : "off"}>
                  {consent.isActive ? "aktiv" : "inaktiv"}
                </Pill>
                <GhostButton
                  onClick={() =>
                    run(
                      () => toggleConsentDefinition(consent.id, !consent.isActive),
                      consent.isActive ? "Erklärung deaktiviert." : "Erklärung aktiviert."
                    )
                  }
                  disabled={pending}
                >
                  {consent.isActive ? "Deaktivieren" : "Aktivieren"}
                </GhostButton>
              </div>
            }
          >
            {consentFor === consent.id ? (
              <ConsentEditor
                consent={consent}
                documentId={null}
                lockRecordingType
                pending={pending}
                onSubmit={(fd) =>
                  run(() => updateConsentDefinition(consent.id, fd), "Checkbox-Text gespeichert.")
                }
                onCancel={() => setConsentFor(null)}
              />
            ) : (
              <ConsentPreview
                consent={consent}
                pending={pending}
                onEdit={() => setConsentFor(consent.id)}
              />
            )}
          </Panel>
        ))}
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[#8899b4] text-xs font-bold uppercase tracking-wider mb-3">{children}</h3>
  );
}

/**
 * Erklärt in Alltagssprache, was eine Prüfsumme ist, und bietet — falls nötig —
 * das Nachberechnen an. Bewusst ruhig gehalten: eine fehlende Prüfsumme ist
 * kein Fehler, sondern nur ein noch nicht erbrachter Nachweis.
 */
function ChecksumExplainer({
  missingHashes,
  pending,
  onBackfill,
}: {
  missingHashes: number;
  pending: boolean;
  onBackfill: () => void;
}) {
  return (
    <div className="mb-5 rounded-lg border border-[#1a2840] bg-[#0c1520] overflow-hidden">
      <details>
        <summary className="px-4 py-3 flex items-center gap-2 cursor-pointer text-[#8899b4] text-sm hover:text-[#eef2f7] transition-colors list-none [&::-webkit-details-marker]:hidden">
          <Info size={14} className="text-[#00b8ff] flex-shrink-0" />
          Was ist die „Prüfsumme“ neben jeder Datei?
        </summary>
        <div className="px-4 pb-4 pt-1 text-[#8899b4] text-sm leading-relaxed space-y-2">
          <p>
            Eine Prüfsumme (technisch: SHA-256-Hash) ist ein 64-stelliger Fingerabdruck einer
            Datei. Aus dem Inhalt wird eine feste Zeichenfolge errechnet — ändert sich auch nur ein
            einziges Zeichen in der PDF, ergibt sich eine völlig andere Zeichenfolge.
          </p>
          <p>
            Der Nutzen im Streitfall: Zu jedem Abschluss wird gespeichert, welche Prüfsumme die
            Datei hatte, der der Kunde zugestimmt hat. Jahre später lässt sich damit belegen, dass
            die vorgelegte AGB-Datei exakt die ist, die der Kunde gesehen hat — und nicht
            nachträglich geändert wurde.
          </p>
          <p className="text-[#5b6b7f]">
            Die Prüfsumme wird beim Hochladen automatisch berechnet. Sie müssen nichts damit tun.
          </p>
        </div>
      </details>

      {missingHashes > 0 && (
        <div className="px-4 py-3 border-t border-[#1a2840] flex flex-wrap items-center justify-between gap-3">
          <p className="text-[#8899b4] text-sm">
            {missingHashes === 1
              ? "Für eine Datei aus dem Altbestand ist noch keine Prüfsumme hinterlegt."
              : `Für ${missingHashes} Dateien aus dem Altbestand ist noch keine Prüfsumme hinterlegt.`}{" "}
            Alles funktioniert normal weiter — der Nachweis lässt sich jederzeit nachholen.
          </p>
          <GhostButton onClick={onBackfill} disabled={pending} className="flex-shrink-0">
            <span className="flex items-center gap-1.5">
              <ShieldCheck size={13} /> Jetzt berechnen
            </span>
          </GhostButton>
        </div>
      )}
    </div>
  );
}

/** Zeigt den Checkbox-Text so, wie der Kunde ihn im Portal sieht. */
function ConsentPreview({
  consent,
  pending,
  onEdit,
  onToggle,
}: {
  consent: ConsentDef;
  pending: boolean;
  onEdit: () => void;
  onToggle?: () => void;
}) {
  return (
    <div className="rounded-lg border border-[#1a2840] bg-[#0a1119] p-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 w-4 h-4 rounded border border-[#2a3a55] bg-[#101c2e] flex-shrink-0" />
        <p className="flex-1 text-[#c9d4e4] text-sm leading-relaxed">{consent.checkboxText}</p>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 pl-7">
        <Pill tone={consent.isRequired ? "on" : "muted"}>
          {consent.isRequired ? "Pflicht" : "optional"}
        </Pill>
        {!consent.isActive && <Pill tone="off">im Portal ausgeblendet</Pill>}
        <span className="text-[#5b6b7f] text-xs">
          Fassung {consent.version}
          {consent.usageCount > 0 &&
            ` · ${consent.usageCount}× bestätigt (diese Bestätigungen bleiben unverändert)`}
        </span>
        <span className="flex-1" />
        {onToggle && (
          <GhostButton onClick={onToggle} disabled={pending} className="!px-3 !py-1.5 !text-xs">
            {consent.isActive ? "Ausblenden" : "Einblenden"}
          </GhostButton>
        )}
        <GhostButton onClick={onEdit} className="!px-3 !py-1.5 !text-xs">
          <span className="flex items-center gap-1">
            <Pencil size={11} /> Text bearbeiten
          </span>
        </GhostButton>
      </div>
    </div>
  );
}

/**
 * Bearbeitet den Checkbox-Text. Jede inhaltliche Änderung erzeugt serverseitig
 * eine neue Fassung; laufende und abgeschlossene Abschlüsse behalten ihren Text.
 */
function ConsentEditor({
  consent,
  documentId,
  lockRecordingType,
  pending,
  onSubmit,
  onCancel,
}: {
  consent: ConsentDef | null;
  documentId: string | null;
  lockRecordingType: boolean;
  pending: boolean;
  onSubmit: (formData: FormData) => void;
  onCancel: () => void;
}) {
  return (
    <form
      action={onSubmit}
      className="rounded-lg border border-[#00b8ff]/25 bg-[rgba(0,184,255,0.04)] p-4 space-y-4"
    >
      {documentId && <input type="hidden" name="contractDocumentId" value={documentId} />}

      <Field label="Titel (nur intern)" required>
        <input
          name="title"
          required
          defaultValue={consent?.title ?? ""}
          className={inputClass}
          placeholder="z. B. AGB"
        />
      </Field>

      <Field
        label="Checkbox-Text"
        required
        hint="Genau dieser Satz erscheint im Closing-Portal neben der Checkbox und wird mit der Bestätigung revisionssicher archiviert."
      >
        <textarea
          name="checkboxText"
          required
          rows={3}
          defaultValue={consent?.checkboxText ?? ""}
          className={inputClass}
        />
      </Field>

      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Art der Erklärung" required>
          <select
            name="consentType"
            required
            className={inputClass}
            defaultValue={
              consent?.consentType ?? (lockRecordingType ? "RECORDING_CONSENT" : "ACCEPTANCE")
            }
          >
            {CONSENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {CONSENT_TYPE_LABELS[t] ?? t}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Reihenfolge" hint="Kleinere Zahl steht im Portal weiter oben.">
          <input
            name="displayOrder"
            type="number"
            defaultValue={consent?.displayOrder ?? 0}
            className={inputClass}
          />
        </Field>
      </div>

      <div className="space-y-2">
        <label className="flex items-center gap-2 text-[#c9d4e4] text-sm">
          <input
            type="checkbox"
            name="isRequired"
            value="true"
            defaultChecked={consent?.isRequired ?? true}
            className="accent-[#00b8ff]"
          />
          Pflicht — ohne Haken kann der Kunde den Abschluss nicht fortsetzen
        </label>
        <label className="flex items-center gap-2 text-[#c9d4e4] text-sm">
          <input
            type="checkbox"
            name="isActive"
            value="true"
            defaultChecked={consent?.isActive ?? true}
            className="accent-[#00b8ff]"
          />
          Im Closing-Portal anzeigen
        </label>
      </div>

      <p className="text-[#5b6b7f] text-xs leading-relaxed">
        Änderungen gelten ab dem nächsten Abschluss. Bereits bestätigte Texte bleiben so erhalten,
        wie der Kunde sie gesehen hat.
      </p>

      <div className="flex gap-2">
        <PrimaryButton type="submit" disabled={pending}>
          {consent ? "Text speichern" : "Anlegen"}
        </PrimaryButton>
        <GhostButton type="button" onClick={onCancel}>
          Abbrechen
        </GhostButton>
      </div>
    </form>
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

      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Versionsnummer" required>
          <input name="version" required defaultValue={suggestedVersion} className={inputClass} />
        </Field>
        <Field label="Gültig ab" hint="Leer = ab sofort.">
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
            {upload.fileName} · Prüfsumme {upload.sha256}
          </p>
        )}
        {uploadError && <p className="mt-2 text-[#fca5a5] text-xs">{uploadError}</p>}
      </div>

      <Field
        label="Alternativ: Textinhalt"
        hint="Wird nur genutzt, wenn keine PDF-Datei hochgeladen wurde. Die Prüfsumme wird dann über den Text gebildet."
      >
        <textarea name="content" rows={4} className={inputClass} />
      </Field>

      <label className="flex items-center gap-2 text-[#c9d4e4] text-sm">
        <input
          type="checkbox"
          name="activate"
          value="true"
          defaultChecked
          className="accent-[#00b8ff]"
        />
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
