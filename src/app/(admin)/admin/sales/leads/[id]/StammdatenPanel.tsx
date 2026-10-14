"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, Check, Save } from "lucide-react";
import { isFailure } from "@/lib/action-result";
import { LEGAL_FORMS, GROUP_LABELS, type MasterDataGroup } from "@/lib/closing/master-data-catalog";
import {
  Banner,
  Field,
  GhostButton,
  PrimaryButton,
  inputClass,
} from "@/components/ui/admin-form";
import { saveCompanyMasterData } from "../../closing/portal-actions";

/**
 * Stammdaten eines Leads.
 *
 * Vor „Closing Meeting erstellen" prüft der Server, ob alle für den
 * Vertragsabschluss nötigen Angaben vorliegen — abhängig von Rechtsform und
 * davon, ob eine abweichende Rechnungsanschrift gepflegt wird.
 */

export type MasterDataValues = Record<string, string | boolean | null>;

export type RequirementView = {
  key: string;
  label: string;
  group: MasterDataGroup;
  isRequired: boolean;
  helpText?: string;
};

export function StammdatenPanel({
  companyId,
  values,
  requirements,
  missing,
}: {
  companyId: string;
  values: MasterDataValues;
  requirements: RequirementView[];
  missing: Array<{ key: string; label: string }>;
}) {
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(missing.length > 0);
  const [message, setMessage] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const [legalForm, setLegalForm] = useState((values.legalForm as string) ?? "");
  const [billingDiffers, setBillingDiffers] = useState(Boolean(values.billingDiffers));

  // Rechtsformabhängige Felder werden erst nach Auswahl der Rechtsform gezeigt.
  const visible = requirements.filter((req) => {
    if (req.group === "billing") return billingDiffers;
    if (req.group === "registry" && (req.key === "registerCourt" || req.key === "registerNumber")) {
      const form = LEGAL_FORMS.find((f) => f.value === legalForm);
      return Boolean(form?.registered);
    }
    return true;
  });

  const groups = visible.reduce<Record<string, RequirementView[]>>((acc, req) => {
    (acc[req.group] ??= []).push(req);
    return acc;
  }, {});

  function onSubmit(formData: FormData) {
    setMessage(null);
    startTransition(async () => {
      const result = await saveCompanyMasterData(companyId, formData);
      if (isFailure(result as object)) {
        setMessage({ kind: "error", text: (result as { error: string }).error });
        return;
      }
      const complete = (result as { complete: boolean }).complete;
      setMessage({
        kind: complete ? "success" : "error",
        text: complete
          ? "Stammdaten vollständig — das Closing Meeting kann erstellt werden."
          : "Gespeichert. Für den Vertragsabschluss fehlen noch Angaben.",
      });
    });
  }

  return (
    <section id="stammdaten" className="rounded-xl border border-[#1a2840] bg-[#0c1520] overflow-hidden">
      <div className="px-5 py-4 border-b border-[#1a2840] flex items-start justify-between gap-4">
        <div>
          <h2 className="text-[#eef2f7] text-sm font-bold flex items-center gap-2">
            Vertragsstammdaten
            {missing.length === 0 ? (
              <span className="inline-flex items-center gap-1 text-[#22c55e] text-xs font-semibold">
                <Check size={12} /> vollständig
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[#fbbf24] text-xs font-semibold">
                <AlertTriangle size={12} /> {missing.length} fehlen
              </span>
            )}
          </h2>
          <p className="text-[#8899b4] text-xs mt-1 max-w-2xl">
            Diese Angaben werden für Angebot, Contract Snapshot, AVV, Abschlussprotokoll und
            Rechnung wiederverwendet — eine Mehrfacheingabe ist nicht nötig.
          </p>
        </div>
        <GhostButton onClick={() => setOpen((v) => !v)}>
          {open ? "Schließen" : "Bearbeiten"}
        </GhostButton>
      </div>

      <div className="px-5 py-5">
        {missing.length > 0 && (
          <div className="mb-4">
            <Banner kind="error">
              <p className="font-semibold mb-1">
                Für den Vertragsabschluss fehlen noch folgende Angaben:
              </p>
              <ul className="list-disc list-inside space-y-0.5">
                {missing.map((m) => (
                  <li key={m.key}>{m.label}</li>
                ))}
              </ul>
            </Banner>
          </div>
        )}
        {message && (
          <div className="mb-4">
            <Banner kind={message.kind}>{message.text}</Banner>
          </div>
        )}

        {!open ? (
          <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5">
            {visible.map((req) => (
              <div key={req.key} className="flex items-baseline justify-between gap-3">
                <dt className="text-[#8899b4] text-xs">{req.label}</dt>
                <dd className="text-[#c9d4e4] text-xs text-right">
                  {req.key === "legalForm"
                    ? (LEGAL_FORMS.find((f) => f.value === values.legalForm)?.label ?? "—")
                    : ((values[req.key] as string) || "—")}
                </dd>
              </div>
            ))}
          </dl>
        ) : (
          <form action={onSubmit} className="space-y-5">
            {Object.entries(groups).map(([group, fields]) => (
              <div key={group}>
                <h3 className="text-[#5b6b7f] text-xs font-bold uppercase tracking-widest mb-2.5">
                  {GROUP_LABELS[group as MasterDataGroup]}
                </h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  {fields.map((req) => (
                    <Field
                      key={req.key}
                      label={req.label}
                      required={req.isRequired}
                      hint={req.helpText}
                    >
                      {req.key === "legalForm" ? (
                        <select
                          name="legalForm"
                          value={legalForm}
                          onChange={(e) => setLegalForm(e.target.value)}
                          className={inputClass}
                        >
                          <option value="">— bitte wählen —</option>
                          {LEGAL_FORMS.map((f) => (
                            <option key={f.value} value={f.value}>
                              {f.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          name={req.key}
                          defaultValue={(values[req.key] as string) ?? ""}
                          className={inputClass}
                        />
                      )}
                    </Field>
                  ))}
                </div>
              </div>
            ))}

            <label className="flex items-center gap-2 text-[#c9d4e4] text-sm">
              <input
                type="checkbox"
                name="billingDiffers"
                value="true"
                checked={billingDiffers}
                onChange={(e) => setBillingDiffers(e.target.checked)}
                className="accent-[#00b8ff]"
              />
              Abweichende Rechnungsanschrift
            </label>

            <div className="flex gap-2">
              <PrimaryButton type="submit" disabled={pending} className="flex items-center gap-2">
                <Save size={14} /> {pending ? "Speichert…" : "Stammdaten speichern"}
              </PrimaryButton>
              <GhostButton type="button" onClick={() => setOpen(false)}>
                Abbrechen
              </GhostButton>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
