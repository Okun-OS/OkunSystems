"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";
import { isFailure } from "@/lib/action-result";
import {
  SCRIPT_KINDS,
  SCRIPT_KIND_LABELS,
  SCRIPT_PLACEHOLDERS,
} from "@/lib/closing/script-types";
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
  createClosingScript,
  toggleClosingScript,
  updateClosingScript,
} from "./actions";

/**
 * Closing Scripts.
 *
 * Die Texte schreibt ausschließlich OKUN. Das System setzt daraus automatisch
 * das Script für ein konkretes Closing zusammen: Einleitung + Paket-Abschnitt +
 * Add-on-Blöcke + verbindliche Annahme.
 */

export type ScriptView = {
  id: string;
  key: string;
  kind: string;
  title: string;
  body: string;
  packageType: string | null;
  addonKey: string | null;
  displayOrder: number;
  isActive: boolean;
  version: number;
  revisionCount: number;
};

export function ClosingScriptsClient({
  scripts,
  packages,
}: {
  scripts: ScriptView[];
  packages: Array<{ value: string; label: string }>;
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
          ? `${success} Neue Textversion: v${(result as { newVersion: number }).newVersion}. Bereits gerenderte Scripts bleiben unverändert.`
          : success,
      });
      setShowNew(false);
      setEditing(null);
    });
  }

  const byKind = SCRIPT_KINDS.map((kind) => ({
    kind,
    items: scripts.filter((s) => s.kind === kind),
  }));

  const hasIntro = scripts.some((s) => s.kind === "GENERAL_INTRO" && s.isActive);
  const hasFinal = scripts.some((s) => s.kind === "FINAL_ACCEPTANCE" && s.isActive);

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
          <h1 className="text-2xl font-bold text-[#eef2f7] mb-1">Closing Scripts</h1>
          <p className="text-[#8899b4] text-sm max-w-2xl">
            Texte für die Vertragsaufzeichnung. Das System setzt sie automatisch zusammen und
            ersetzt die Platzhalter durch die eingefrorenen Vertragsdaten.
          </p>
        </div>
        <PrimaryButton
          onClick={() => setShowNew((v) => !v)}
          className="flex items-center gap-2 flex-shrink-0"
        >
          <Plus size={14} /> Script anlegen
        </PrimaryButton>
      </div>

      {message && (
        <div className="mb-5">
          <Banner kind={message.kind}>{message.text}</Banner>
        </div>
      )}

      {(!hasIntro || !hasFinal) && (
        <div className="mb-5">
          <Banner kind="info">
            Für ein vollständiges Closing-Script fehlt noch:{" "}
            {[!hasIntro && "eine aktive allgemeine Einleitung", !hasFinal && "eine aktive verbindliche Annahme"]
              .filter(Boolean)
              .join(" und ")}
            .
          </Banner>
        </div>
      )}

      {showNew && (
        <div className="mb-5">
          <Panel title="Neues Script">
            <ScriptForm
              packages={packages}
              pending={pending}
              onSubmit={(fd) => run(() => createClosingScript(fd), "Script angelegt.")}
              onCancel={() => setShowNew(false)}
            />
          </Panel>
        </div>
      )}

      <div className="space-y-6">
        {byKind.map(({ kind, items }) => (
          <div key={kind}>
            <h2 className="text-[#5b6b7f] text-xs font-bold uppercase tracking-widest mb-2.5">
              {SCRIPT_KIND_LABELS[kind]}
            </h2>
            {items.length === 0 ? (
              <p className="text-[#5b6b7f] text-sm px-4 py-3 rounded-lg border border-dashed border-[#1a2840]">
                Noch kein Script dieses Typs.
              </p>
            ) : (
              <div className="space-y-3">
                {items.map((script) => (
                  <Panel
                    key={script.id}
                    title={script.title}
                    subtitle={[
                      `Textversion v${script.version}`,
                      script.packageType ? `Paket: ${script.packageType}` : null,
                      script.addonKey ? `Add-on: ${script.addonKey}` : null,
                      `Reihenfolge ${script.displayOrder}`,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                    action={
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Pill tone={script.isActive ? "on" : "off"}>
                          {script.isActive ? "aktiv" : "inaktiv"}
                        </Pill>
                        <GhostButton
                          onClick={() =>
                            run(
                              () => toggleClosingScript(script.id, !script.isActive),
                              script.isActive ? "Script deaktiviert." : "Script aktiviert."
                            )
                          }
                          disabled={pending}
                        >
                          {script.isActive ? "Deaktivieren" : "Aktivieren"}
                        </GhostButton>
                        <GhostButton
                          onClick={() => setEditing(editing === script.id ? null : script.id)}
                        >
                          {editing === script.id ? "Schließen" : "Bearbeiten"}
                        </GhostButton>
                      </div>
                    }
                  >
                    {editing === script.id ? (
                      <ScriptForm
                        script={script}
                        packages={packages}
                        pending={pending}
                        onSubmit={(fd) =>
                          run(() => updateClosingScript(script.id, fd), "Script gespeichert.")
                        }
                        onCancel={() => setEditing(null)}
                      />
                    ) : (
                      <pre className="text-[#c9d4e4] text-sm leading-relaxed whitespace-pre-wrap font-sans px-4 py-3 rounded-lg bg-[#0a1119] border border-[#1a2840]">
                        {script.body}
                      </pre>
                    )}
                  </Panel>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-8">
        <Panel
          title="Verfügbare Platzhalter"
          subtitle="Diese Platzhalter werden beim Rendern durch die konkreten Vertragsdaten ersetzt."
        >
          <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5">
            {SCRIPT_PLACEHOLDERS.map((p) => (
              <div key={p.key} className="flex items-baseline gap-3 text-xs">
                <code className="text-[#00b8ff] font-mono flex-shrink-0">{`{{${p.key}}}`}</code>
                <span className="text-[#5b6b7f]">{p.description}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function ScriptForm({
  script,
  packages,
  pending,
  onSubmit,
  onCancel,
}: {
  script?: ScriptView;
  packages: Array<{ value: string; label: string }>;
  pending: boolean;
  onSubmit: (formData: FormData) => void;
  onCancel: () => void;
}) {
  const [kind, setKind] = useState(script?.kind ?? "GENERAL_INTRO");

  return (
    <form action={onSubmit} className="space-y-4">
      <div className="grid sm:grid-cols-3 gap-4">
        <Field label="Typ" required>
          <select
            name="kind"
            value={kind}
            onChange={(e) => setKind(e.target.value)}
            className={inputClass}
          >
            {SCRIPT_KINDS.map((k) => (
              <option key={k} value={k}>
                {SCRIPT_KIND_LABELS[k]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Titel" required>
          <input name="title" required defaultValue={script?.title} className={inputClass} />
        </Field>
        <Field label="Reihenfolge">
          <input
            name="displayOrder"
            type="number"
            defaultValue={script?.displayOrder ?? 0}
            className={inputClass}
          />
        </Field>
      </div>

      {kind === "PACKAGE" && (
        <Field
          label="Paket"
          hint="Leer = gilt für alle Pakete, für die kein spezifisches Script existiert."
        >
          <select
            name="packageType"
            defaultValue={script?.packageType ?? ""}
            className={inputClass}
          >
            <option value="">— alle Pakete —</option>
            {packages.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label} ({p.value})
              </option>
            ))}
          </select>
        </Field>
      )}

      {kind === "ADDON" && (
        <Field
          label="Add-on-Schlüssel"
          hint="z. B. recurring, workforce, care — leer = Block wird immer eingefügt."
        >
          <input name="addonKey" defaultValue={script?.addonKey ?? ""} className={inputClass} />
        </Field>
      )}

      <Field
        label="Script-Text"
        required
        hint="Platzhalter in doppelten geschweiften Klammern werden mit den Vertragsdaten gefüllt."
      >
        <textarea
          name="body"
          required
          rows={8}
          defaultValue={script?.body}
          className={textareaClass}
        />
      </Field>

      <label className="flex items-center gap-2 text-[#c9d4e4] text-sm">
        <input
          type="checkbox"
          name="isActive"
          value="true"
          defaultChecked={script?.isActive ?? true}
          className="accent-[#00b8ff]"
        />
        Aktiv
      </label>

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
