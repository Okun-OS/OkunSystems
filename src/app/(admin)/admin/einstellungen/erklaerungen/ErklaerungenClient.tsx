"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";
import { isFailure } from "@/lib/action-result";
import { CONSENT_TYPE_LABELS, CONSENT_TYPES } from "@/lib/closing/consent-types";
import {
  Banner,
  Field,
  GhostButton,
  Panel,
  Pill,
  PrimaryButton,
  inputClass,
} from "@/components/ui/admin-form";
import {
  createConsentDefinition,
  toggleConsentDefinition,
  updateConsentDefinition,
} from "./actions";

/**
 * Consent-Konfiguration.
 *
 * Jeder Checkbox-Text ist hier frei bearbeitbar — auch der Text zur
 * Vertragsaufzeichnung (Typ RECORDING_CONSENT). Im Code steht keine dieser
 * Formulierungen; die Kundenseite zeigt exakt, was hier hinterlegt ist.
 */

export type ConsentDefinitionView = {
  id: string;
  key: string;
  title: string;
  checkboxText: string;
  consentType: string;
  isRequired: boolean;
  isActive: boolean;
  displayOrder: number;
  version: number;
  appliesTo: string[];
  contractDocumentId: string | null;
  contractDocumentName: string | null;
  documentVersionId: string | null;
  documentVersionLabel: string | null;
  usageCount: number;
};

type DocOption = { id: string; name: string; activeVersion: string | null };
type PackageOption = { value: string; label: string };

export function ErklaerungenClient({
  definitions,
  documents,
  packages,
}: {
  definitions: ConsentDefinitionView[];
  documents: DocOption[];
  packages: PackageOption[];
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);

  function run(fn: () => Promise<unknown>, success: string) {
    setMessage(null);
    startTransition(async () => {
      const result = await fn();
      if (isFailure(result as object)) {
        setMessage({ kind: "error", text: (result as { error: string }).error });
        return;
      }
      const versioned = (result as { versioned?: boolean; newVersion?: number }).versioned;
      setMessage({
        kind: "success",
        text: versioned
          ? `${success} Neue Textversion: v${(result as { newVersion: number }).newVersion}. Bereits abgeschlossene Verträge bleiben unverändert.`
          : success,
      });
      setShowNew(false);
      setEditing(null);
    });
  }

  const hasRecordingConsent = definitions.some(
    (d) => d.consentType === "RECORDING_CONSENT" && d.isActive
  );

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
          <h1 className="text-2xl font-bold text-[#eef2f7] mb-1">Erklärungen &amp; Checkboxen</h1>
          <p className="text-[#8899b4] text-sm max-w-2xl">
            Der Wortlaut jeder Checkbox wird hier gepflegt — einschließlich der Einwilligung in
            die Vertragsaufzeichnung. Beim Vertragsabschluss wird der exakte Wortlaut als
            Snapshot gespeichert; spätere Änderungen wirken nur auf neue Abschlüsse.
          </p>
        </div>
        <PrimaryButton
          onClick={() => setShowNew((v) => !v)}
          className="flex items-center gap-2 flex-shrink-0"
        >
          <Plus size={14} /> Erklärung anlegen
        </PrimaryButton>
      </div>

      {message && (
        <div className="mb-5">
          <Banner kind={message.kind}>{message.text}</Banner>
        </div>
      )}

      {!hasRecordingConsent && (
        <div className="mb-5">
          <Banner kind="info">
            Es ist keine aktive Einwilligung vom Typ &bdquo;Einwilligung
            Vertragsaufzeichnung&ldquo; konfiguriert. Ohne sie l&auml;sst sich keine
            Aufzeichnung starten.
          </Banner>
        </div>
      )}

      {showNew && (
        <div className="mb-5">
          <Panel title="Neue Erklärung">
            <ConsentForm
              documents={documents}
              packages={packages}
              pending={pending}
              onSubmit={(fd) => run(() => createConsentDefinition(fd), "Erklärung angelegt.")}
              onCancel={() => setShowNew(false)}
            />
          </Panel>
        </div>
      )}

      <div className="space-y-4">
        {definitions.length === 0 && !showNew && (
          <Panel title="Noch keine Erklärungen konfiguriert">
            <p className="text-[#8899b4] text-sm">
              Ohne konfigurierte Erklärung kann kein Vertragsabschluss gestartet werden.
            </p>
          </Panel>
        )}

        {definitions.map((definition) => (
          <Panel
            key={definition.id}
            title={definition.title}
            subtitle={`${CONSENT_TYPE_LABELS[definition.consentType] ?? definition.consentType} · Textversion v${definition.version}${definition.usageCount > 0 ? ` · ${definition.usageCount} protokollierte Erklärung(en)` : ""}`}
            action={
              <div className="flex items-center gap-2 flex-shrink-0">
                <Pill tone={definition.isRequired ? "on" : "muted"}>
                  {definition.isRequired ? "Pflicht" : "optional"}
                </Pill>
                <Pill tone={definition.isActive ? "on" : "off"}>
                  {definition.isActive ? "aktiv" : "inaktiv"}
                </Pill>
                <GhostButton
                  onClick={() =>
                    run(
                      () => toggleConsentDefinition(definition.id, !definition.isActive),
                      definition.isActive ? "Erklärung deaktiviert." : "Erklärung aktiviert."
                    )
                  }
                  disabled={pending}
                >
                  {definition.isActive ? "Deaktivieren" : "Aktivieren"}
                </GhostButton>
                <GhostButton
                  onClick={() => setEditing(editing === definition.id ? null : definition.id)}
                >
                  {editing === definition.id ? "Schließen" : "Bearbeiten"}
                </GhostButton>
              </div>
            }
          >
            {editing === definition.id ? (
              <ConsentForm
                definition={definition}
                documents={documents}
                packages={packages}
                pending={pending}
                onSubmit={(fd) =>
                  run(() => updateConsentDefinition(definition.id, fd), "Erklärung gespeichert.")
                }
                onCancel={() => setEditing(null)}
              />
            ) : (
              <div className="space-y-2">
                <p className="text-[#c9d4e4] text-sm leading-relaxed px-4 py-3 rounded-lg bg-[#0a1119] border border-[#1a2840]">
                  {definition.checkboxText}
                </p>
                <p className="text-[#5b6b7f] text-xs">
                  {definition.contractDocumentName
                    ? `Dokument: ${definition.contractDocumentName}${
                        definition.documentVersionLabel
                          ? ` (fest auf Version ${definition.documentVersionLabel})`
                          : " (jeweils aktive Version)"
                      }`
                    : "Kein Dokumentbezug"}
                  {definition.appliesTo.length > 0
                    ? ` · nur für: ${definition.appliesTo.join(", ")}`
                    : " · alle Pakete"}
                  {` · Reihenfolge ${definition.displayOrder}`}
                </p>
              </div>
            )}
          </Panel>
        ))}
      </div>
    </div>
  );
}

function ConsentForm({
  definition,
  documents,
  packages,
  pending,
  onSubmit,
  onCancel,
}: {
  definition?: ConsentDefinitionView;
  documents: DocOption[];
  packages: PackageOption[];
  pending: boolean;
  onSubmit: (formData: FormData) => void;
  onCancel: () => void;
}) {
  const [consentType, setConsentType] = useState(definition?.consentType ?? "ACCEPTANCE");

  return (
    <form action={onSubmit} className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Titel (intern)" required>
          <input
            name="title"
            required
            defaultValue={definition?.title}
            className={inputClass}
            placeholder="z. B. AGB"
          />
        </Field>
        <Field label="Typ" required>
          <select
            name="consentType"
            value={consentType}
            onChange={(e) => setConsentType(e.target.value)}
            className={inputClass}
          >
            {CONSENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {CONSENT_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field
        label="Checkbox-Text (exakter Wortlaut für den Kunden)"
        required
        hint="Genau dieser Text erscheint im Kundenportal und wird beim Abschluss unveränderlich protokolliert."
      >
        <textarea
          name="checkboxText"
          required
          rows={3}
          defaultValue={definition?.checkboxText}
          className={inputClass}
        />
      </Field>

      <div className="grid sm:grid-cols-2 gap-4">
        <Field
          label="Vertragsdokument"
          hint={
            consentType === "RECORDING_CONSENT"
              ? "Für Aufzeichnungs-Einwilligungen optional."
              : "Erforderlich — die jeweils aktive Version wird beim Abschluss eingefroren."
          }
        >
          <select
            name="contractDocumentId"
            defaultValue={definition?.contractDocumentId ?? ""}
            className={inputClass}
          >
            <option value="">— kein Dokument —</option>
            {documents.map((doc) => (
              <option key={doc.id} value={doc.id}>
                {doc.name}
                {doc.activeVersion ? ` (aktiv: ${doc.activeVersion})` : " (keine aktive Version)"}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Reihenfolge">
          <input
            name="displayOrder"
            type="number"
            defaultValue={definition?.displayOrder ?? 0}
            className={inputClass}
          />
        </Field>
      </div>

      <Field
        label="Gilt für Pakete"
        hint={
          packages.length > 0
            ? `Kommagetrennte Paket-Schlüssel, leer = alle Pakete. Verfügbar: ${packages.map((p) => p.value).join(", ")}`
            : "Kommagetrennte Paket-Schlüssel, leer = alle Pakete."
        }
      >
        <input
          name="appliesTo"
          defaultValue={definition?.appliesTo.join(", ")}
          className={inputClass}
        />
      </Field>

      <div className="flex flex-wrap gap-5">
        <label className="flex items-center gap-2 text-[#c9d4e4] text-sm">
          <input
            type="checkbox"
            name="isRequired"
            value="true"
            defaultChecked={definition?.isRequired ?? true}
            className="accent-[#00b8ff]"
          />
          Pflichterklärung
        </label>
        <label className="flex items-center gap-2 text-[#c9d4e4] text-sm">
          <input
            type="checkbox"
            name="isActive"
            value="true"
            defaultChecked={definition?.isActive ?? true}
            className="accent-[#00b8ff]"
          />
          Aktiv
        </label>
      </div>
      <div className="flex gap-2">
        <PrimaryButton type="submit" disabled={pending}>
          Speichern
        </PrimaryButton>
        <GhostButton type="button" onClick={onCancel}>
          Abbrechen
        </GhostButton>
      </div>
    </form>
  );
}
