"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";
import { isFailure } from "@/lib/action-result";
import type { CompanySettingField, CompanySettings } from "@/lib/company-settings";
import { Banner, Field, Panel, PrimaryButton, inputClass } from "@/components/ui/admin-form";
import { saveCompanySettingsAction } from "./actions";

const SECTION_LABELS: Record<string, string> = {
  identity: "Firmierung",
  address: "Anschrift",
  registry: "Register & Steuern",
  bank: "Bankverbindung",
  contact: "Kontakt",
  invoice: "Rechnungsvorgaben",
  branding: "Branding",
};

export function UnternehmenClient({
  fields,
  settings,
}: {
  fields: CompanySettingField[];
  settings: CompanySettings;
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ kind: "error" | "success"; text: string } | null>(null);

  const sections = fields.reduce<Record<string, CompanySettingField[]>>((acc, field) => {
    (acc[field.section] ??= []).push(field);
    return acc;
  }, {});

  const missing = fields.filter((f) => !settings[f.key]);

  function onSubmit(formData: FormData) {
    setMessage(null);
    startTransition(async () => {
      const result = await saveCompanySettingsAction(formData);
      if (isFailure(result as object)) {
        setMessage({ kind: "error", text: (result as { error: string }).error });
      } else {
        setMessage({ kind: "success", text: "Unternehmensdaten gespeichert." });
      }
    });
  }

  return (
    <div className="max-w-[880px]">
      <Link
        href="/admin/einstellungen"
        className="flex items-center gap-2 text-[#8899b4] hover:text-[#eef2f7] text-sm transition-colors mb-4"
      >
        <ArrowLeft size={14} /> Zurück zu den Einstellungen
      </Link>

      <h1 className="text-2xl font-bold text-[#eef2f7] mb-1">Unternehmenseinstellungen</h1>
      <p className="text-[#8899b4] text-sm mb-6">
        Diese Angaben erscheinen auf Rechnungen, Abschlussprotokollen und allen weiteren
        Dokumenten. Nicht gepflegte Felder werden in Dokumenten als
        &bdquo;nicht konfiguriert&ldquo; ausgewiesen — es werden keine Beispielwerte eingesetzt.
      </p>

      {missing.length > 0 && (
        <div className="mb-5">
          <Banner kind="info">
            {missing.length} von {fields.length} Angaben sind noch nicht konfiguriert.
          </Banner>
        </div>
      )}
      {message && (
        <div className="mb-5">
          <Banner kind={message.kind}>{message.text}</Banner>
        </div>
      )}

      <form action={onSubmit} className="space-y-5">
        {Object.entries(sections).map(([section, sectionFields]) => (
          <Panel key={section} title={SECTION_LABELS[section] ?? section}>
            <div className="grid sm:grid-cols-2 gap-4">
              {sectionFields.map((field) => (
                <div
                  key={field.key}
                  className={field.type === "multiline" ? "sm:col-span-2" : undefined}
                >
                  <Field label={field.label} hint={field.hint}>
                    {field.type === "multiline" ? (
                      <textarea
                        name={field.key}
                        defaultValue={settings[field.key] ?? ""}
                        rows={3}
                        className={inputClass}
                        placeholder="nicht konfiguriert"
                      />
                    ) : (
                      <input
                        name={field.key}
                        type={field.type === "number" ? "text" : field.type === "email" ? "email" : "text"}
                        inputMode={field.type === "number" ? "decimal" : undefined}
                        defaultValue={settings[field.key] ?? ""}
                        className={inputClass}
                        placeholder="nicht konfiguriert"
                      />
                    )}
                  </Field>
                </div>
              ))}
            </div>
          </Panel>
        ))}

        <PrimaryButton type="submit" disabled={pending} className="flex items-center gap-2">
          <Save size={14} />
          {pending ? "Speichert…" : "Unternehmensdaten speichern"}
        </PrimaryButton>
      </form>
    </div>
  );
}
