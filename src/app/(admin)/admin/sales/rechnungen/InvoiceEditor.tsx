"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Eye,
  FileCheck2,
  Lock,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { isFailure } from "@/lib/action-result";
import { VAT_MODE_LABELS, VAT_MODES } from "@/lib/invoicing/vat-modes";
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
  cancelInvoiceAction,
  finalizeInvoiceAction,
  recalculateInvoice,
  regeneratePdfAction,
  saveInvoice,
  type ClientInvoiceItem,
} from "./invoice-actions";
import { confirmPaymentReceived } from "../closing/portal-actions";

/**
 * Rechnungseditor mit beliebig vielen Positionen.
 *
 * Die Anzeige im Browser ist reine Vorschau — Positions- und Summenbeträge
 * werden vor jedem Speichern und vor der PDF-Erzeugung serverseitig neu
 * berechnet. Die Rechnungsnummer wird erst bei der Finalisierung vergeben.
 */

export type InvoiceEditorData = {
  id: string | null;
  invoiceNumber: string | null;
  status: string;
  finalized: boolean;
  companyId: string;
  companyName: string;
  closingSessionId: string | null;
  offerId: string | null;
  contractSnapshotId: string | null;
  billing: {
    name: string | null;
    street: string | null;
    houseNumber: string | null;
    postalCode: string | null;
    city: string | null;
    country: string | null;
    email: string | null;
    contactName: string | null;
    vatId: string | null;
  };
  currency: string;
  vatMode: string;
  vatRate: string;
  invoiceDate: string;
  dueDate: string;
  servicePeriodText: string | null;
  paymentTerms: string | null;
  notes: string | null;
  footerNote: string | null;
  items: ClientInvoiceItem[];
  customPlaceholders: Array<{
    key: string;
    label: string;
    type: string;
    defaultValue: string | null;
    isRequired: boolean;
    value: string;
  }>;
  pdfSha256: string | null;
  paidAt: string | null;
  nextNumberPreview: string;
  companySettingsMissing: string[];
};

const emptyItem = (): ClientInvoiceItem => ({
  description: "",
  quantity: "1",
  unit: "",
  unitPrice: "",
  vatRate: "",
  discount: "",
});

function fmt(cents: number, currency: string) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency }).format(cents / 100);
}

export function InvoiceEditor({ data }: { data: InvoiceEditorData }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ kind: "error" | "success" | "info"; text: string } | null>(null);

  const [items, setItems] = useState<ClientInvoiceItem[]>(
    data.items.length > 0 ? data.items : [emptyItem()]
  );
  const [vatMode, setVatMode] = useState(data.vatMode);
  const [vatRate, setVatRate] = useState(data.vatRate);
  const [invoiceDate, setInvoiceDate] = useState(data.invoiceDate);
  const [dueDate, setDueDate] = useState(data.dueDate);
  const [servicePeriodText, setServicePeriodText] = useState(data.servicePeriodText ?? "");
  const [paymentTerms, setPaymentTerms] = useState(data.paymentTerms ?? "");
  const [notes, setNotes] = useState(data.notes ?? "");
  const [billing, setBilling] = useState(data.billing);
  const [custom, setCustom] = useState<Record<string, string>>(
    Object.fromEntries(data.customPlaceholders.map((p) => [p.key, p.value]))
  );
  const [totals, setTotals] = useState<{
    net: number;
    vat: number;
    gross: number;
    rows: Array<{ position: number; net: number; vat: number; gross: number }>;
    breakdown: Array<{ vatRateBp: number; netAmountCents: number; vatAmountCents: number }>;
  } | null>(null);
  const [calcError, setCalcError] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);

  const readOnly = data.finalized;

  /** Serverseitige Neuberechnung — die Anzeige folgt immer dem Server. */
  const recalc = useCallback(async () => {
    const usable = items.filter((i) => i.description.trim() && i.unitPrice.trim());
    if (usable.length === 0) {
      setTotals(null);
      setCalcError(null);
      return;
    }
    const result = await recalculateInvoice(items, vatMode, vatRate);
    if (isFailure(result as object)) {
      setCalcError((result as { error: string }).error);
      setTotals(null);
      return;
    }
    const t = (result as { totals: {
      netTotalCents: number;
      vatTotalCents: number;
      grossTotalCents: number;
      items: Array<{ position: number; netAmountCents: number; vatAmountCents: number; grossAmountCents: number }>;
      vatBreakdown: Array<{ vatRateBp: number; netAmountCents: number; vatAmountCents: number }>;
    } }).totals;
    setCalcError(null);
    setTotals({
      net: t.netTotalCents,
      vat: t.vatTotalCents,
      gross: t.grossTotalCents,
      rows: t.items.map((i) => ({
        position: i.position,
        net: i.netAmountCents,
        vat: i.vatAmountCents,
        gross: i.grossAmountCents,
      })),
      breakdown: t.vatBreakdown,
    });
  }, [items, vatMode, vatRate]);

  useEffect(() => {
    const timer = setTimeout(() => void recalc(), 400);
    return () => clearTimeout(timer);
  }, [recalc]);

  const payload = useMemo(
    () => ({
      invoiceId: data.id ?? undefined,
      companyId: data.companyId,
      closingSessionId: data.closingSessionId,
      offerId: data.offerId,
      contractSnapshotId: data.contractSnapshotId,
      billing,
      currency: data.currency,
      vatMode,
      vatRate,
      invoiceDate,
      dueDate,
      servicePeriodText: servicePeriodText || null,
      paymentTerms: paymentTerms || null,
      notes: notes || null,
      footerNote: data.footerNote,
      customPlaceholders: custom,
      items,
      idempotencyKey: data.id
        ? null
        : data.closingSessionId
          ? `invoice_from_closing:${data.closingSessionId}`
          : null,
    }),
    [
      data, billing, vatMode, vatRate, invoiceDate, dueDate, servicePeriodText,
      paymentTerms, notes, custom, items,
    ]
  );

  function handleSave(then?: (invoiceId: string) => void) {
    setMessage(null);
    startTransition(async () => {
      const result = await saveInvoice(payload);
      if (isFailure(result as object)) {
        setMessage({ kind: "error", text: (result as { error: string }).error });
        return;
      }
      const invoiceId = (result as { invoiceId: string }).invoiceId;
      setMessage({ kind: "success", text: "Entwurf gespeichert." });
      if (then) then(invoiceId);
      else if (!data.id) router.replace(`/admin/sales/rechnungen/${invoiceId}`);
      else router.refresh();
    });
  }

  function handleFinalize() {
    if (
      !window.confirm(
        "Rechnung final erstellen? Danach wird die Rechnungsnummer vergeben und die Rechnung lässt sich nicht mehr ändern."
      )
    )
      return;
    handleSave((invoiceId) => {
      startTransition(async () => {
        const result = await finalizeInvoiceAction(invoiceId);
        if (isFailure(result as object)) {
          setMessage({ kind: "error", text: (result as { error: string }).error });
          return;
        }
        const r = result as { invoiceNumber: string; alreadyFinal: boolean; pdfWarning?: string };
        setMessage({
          kind: r.pdfWarning ? "info" : "success",
          text: r.pdfWarning
            ? `Rechnung ${r.invoiceNumber} wurde festgeschrieben. Das PDF konnte nicht erzeugt werden: ${r.pdfWarning}`
            : `Rechnung ${r.invoiceNumber} wurde final erstellt und archiviert.`,
        });
        router.replace(`/admin/sales/rechnungen/${invoiceId}`);
        router.refresh();
      });
    });
  }

  function run(fn: () => Promise<unknown>, success: string) {
    setMessage(null);
    startTransition(async () => {
      const result = await fn();
      if (isFailure(result as object)) {
        setMessage({ kind: "error", text: (result as { error: string }).error });
        return;
      }
      setMessage({ kind: "success", text: success });
      router.refresh();
    });
  }

  function updateItem(index: number, patch: Partial<ClientInvoiceItem>) {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  return (
    <div className="max-w-[1100px]">
      <Link
        href="/admin/sales/rechnungen"
        className="flex items-center gap-2 text-[#8899b4] hover:text-[#eef2f7] text-sm transition-colors mb-4"
      >
        <ArrowLeft size={14} /> Zurück zu den Rechnungen
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#eef2f7] mb-1 flex items-center gap-3">
            {data.finalized ? `Rechnung ${data.invoiceNumber}` : "Rechnungsentwurf"}
            <Pill tone={data.finalized ? "on" : "muted"}>
              {data.finalized ? data.status : "Entwurf"}
            </Pill>
            {data.paidAt && <Pill tone="on">bezahlt</Pill>}
          </h1>
          <p className="text-[#8899b4] text-sm">
            {data.companyName}
            {!data.finalized && ` · nächste Nummer: ${data.nextNumberPreview}`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!readOnly && (
            <>
              <GhostButton onClick={() => handleSave()} disabled={pending}>
                <span className="flex items-center gap-1.5">
                  <Save size={13} /> Entwurf speichern
                </span>
              </GhostButton>
              <GhostButton
                onClick={() =>
                  handleSave((id) => {
                    setPreviewOpen(true);
                    setPreviewKey((k) => k + 1);
                    if (!data.id) router.replace(`/admin/sales/rechnungen/${id}`);
                  })
                }
                disabled={pending}
              >
                <span className="flex items-center gap-1.5">
                  <Eye size={13} /> Vorschau
                </span>
              </GhostButton>
              <PrimaryButton onClick={handleFinalize} disabled={pending || !totals}>
                Rechnung final erstellen
              </PrimaryButton>
            </>
          )}
          {data.finalized && (
            <>
              {data.pdfSha256 ? (
                <a
                  href={`/api/admin/invoices/pdf?invoiceId=${data.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 rounded-lg border border-[#1a2840] text-[#8899b4] text-sm hover:text-[#eef2f7] transition-colors flex items-center gap-1.5"
                >
                  <FileCheck2 size={13} /> PDF öffnen
                </a>
              ) : (
                <GhostButton
                  onClick={() => run(() => regeneratePdfAction(data.id!), "PDF erzeugt.")}
                  disabled={pending}
                >
                  PDF erneut erzeugen
                </GhostButton>
              )}
              {!data.paidAt && data.status !== "cancelled" && (
                <PrimaryButton
                  onClick={() => {
                    const note = window.prompt("Notiz zum Zahlungseingang (optional):") ?? "";
                    run(
                      () => confirmPaymentReceived(data.id!, note),
                      "Zahlungseingang bestätigt und protokolliert."
                    );
                  }}
                  disabled={pending}
                >
                  Zahlungseingang bestätigen
                </PrimaryButton>
              )}
              {!data.paidAt && data.status !== "cancelled" && (
                <GhostButton
                  onClick={() => {
                    const reason = window.prompt("Begründung für die Stornierung:");
                    if (!reason?.trim()) return;
                    run(() => cancelInvoiceAction(data.id!, reason), "Rechnung storniert.");
                  }}
                  disabled={pending}
                >
                  Stornieren
                </GhostButton>
              )}
            </>
          )}
        </div>
      </div>

      {message && (
        <div className="mb-5">
          <Banner kind={message.kind}>{message.text}</Banner>
        </div>
      )}
      {data.companySettingsMissing.length > 0 && (
        <div className="mb-5">
          <Banner kind="info">
            Für ein vollständiges Rechnungsdokument fehlen noch Unternehmensangaben:{" "}
            {data.companySettingsMissing.join(", ")}.{" "}
            <Link href="/admin/einstellungen/unternehmen" className="underline">
              Jetzt ergänzen
            </Link>
          </Banner>
        </div>
      )}
      {readOnly && (
        <div className="mb-5">
          <Banner kind="info">
            <span className="flex items-center gap-2">
              <Lock size={13} /> Diese Rechnung ist finalisiert und kann nicht mehr geändert
              werden. Eine Korrektur erfolgt über eine neue Rechnung.
            </span>
          </Banner>
        </div>
      )}

      <div className="space-y-5">
        <Panel title="Rechnungsempfänger">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Name">
              <input
                value={billing.name ?? ""}
                onChange={(e) => setBilling({ ...billing, name: e.target.value })}
                disabled={readOnly}
                className={inputClass}
              />
            </Field>
            <Field label="Ansprechpartner:in">
              <input
                value={billing.contactName ?? ""}
                onChange={(e) => setBilling({ ...billing, contactName: e.target.value })}
                disabled={readOnly}
                className={inputClass}
              />
            </Field>
            <Field label="Straße">
              <input
                value={billing.street ?? ""}
                onChange={(e) => setBilling({ ...billing, street: e.target.value })}
                disabled={readOnly}
                className={inputClass}
              />
            </Field>
            <Field label="Hausnummer">
              <input
                value={billing.houseNumber ?? ""}
                onChange={(e) => setBilling({ ...billing, houseNumber: e.target.value })}
                disabled={readOnly}
                className={inputClass}
              />
            </Field>
            <Field label="PLZ">
              <input
                value={billing.postalCode ?? ""}
                onChange={(e) => setBilling({ ...billing, postalCode: e.target.value })}
                disabled={readOnly}
                className={inputClass}
              />
            </Field>
            <Field label="Ort">
              <input
                value={billing.city ?? ""}
                onChange={(e) => setBilling({ ...billing, city: e.target.value })}
                disabled={readOnly}
                className={inputClass}
              />
            </Field>
            <Field label="Land">
              <input
                value={billing.country ?? ""}
                onChange={(e) => setBilling({ ...billing, country: e.target.value })}
                disabled={readOnly}
                className={inputClass}
              />
            </Field>
            <Field label="USt-IdNr.">
              <input
                value={billing.vatId ?? ""}
                onChange={(e) => setBilling({ ...billing, vatId: e.target.value })}
                disabled={readOnly}
                className={inputClass}
              />
            </Field>
          </div>
        </Panel>

        <Panel title="Rechnungsdaten">
          <div className="grid sm:grid-cols-3 gap-4">
            <Field label="Rechnungsdatum">
              <input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                disabled={readOnly}
                className={inputClass}
              />
            </Field>
            <Field label="Fällig bis">
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                disabled={readOnly}
                className={inputClass}
              />
            </Field>
            <Field label="Leistungszeitraum">
              <input
                value={servicePeriodText}
                onChange={(e) => setServicePeriodText(e.target.value)}
                disabled={readOnly}
                className={inputClass}
              />
            </Field>
            <Field label="Umsatzsteuer">
              <select
                value={vatMode}
                onChange={(e) => setVatMode(e.target.value)}
                disabled={readOnly}
                className={inputClass}
              >
                {VAT_MODES.map((mode) => (
                  <option key={mode} value={mode}>
                    {VAT_MODE_LABELS[mode]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Standard-Steuersatz (%)">
              <input
                value={vatRate}
                onChange={(e) => setVatRate(e.target.value)}
                disabled={readOnly || vatMode !== "standard"}
                className={inputClass}
              />
            </Field>
            <div className="sm:col-span-3">
              <Field label="Zahlungsbedingungen">
                <input
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                  disabled={readOnly}
                  className={inputClass}
                />
              </Field>
            </div>
            <div className="sm:col-span-3">
              <Field label="Hinweise">
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={readOnly}
                  rows={2}
                  className={inputClass}
                />
              </Field>
            </div>
          </div>
        </Panel>

        <Panel
          title={`Positionen (${items.length})`}
          subtitle="Beliebig viele Positionen — es gibt keine leeren Dummy-Zeilen. Alle Beträge werden serverseitig berechnet."
          action={
            !readOnly ? (
              <GhostButton onClick={() => setItems((prev) => [...prev, emptyItem()])}>
                <span className="flex items-center gap-1.5">
                  <Plus size={13} /> Position hinzufügen
                </span>
              </GhostButton>
            ) : undefined
          }
        >
          <div className="space-y-3">
            {items.map((item, index) => (
              <div
                key={index}
                className="grid grid-cols-12 gap-2 items-end px-3 py-3 rounded-lg border border-[#1a2840] bg-[#0a1119]"
              >
                <div className="col-span-12 sm:col-span-4">
                  <Field label={`Position ${index + 1}`}>
                    <input
                      value={item.description}
                      onChange={(e) => updateItem(index, { description: e.target.value })}
                      disabled={readOnly}
                      placeholder="Beschreibung"
                      className={inputClass}
                    />
                  </Field>
                </div>
                <div className="col-span-4 sm:col-span-1">
                  <Field label="Menge">
                    <input
                      value={item.quantity}
                      onChange={(e) => updateItem(index, { quantity: e.target.value })}
                      disabled={readOnly}
                      className={inputClass}
                    />
                  </Field>
                </div>
                <div className="col-span-4 sm:col-span-1">
                  <Field label="Einheit">
                    <input
                      value={item.unit}
                      onChange={(e) => updateItem(index, { unit: e.target.value })}
                      disabled={readOnly}
                      className={inputClass}
                    />
                  </Field>
                </div>
                <div className="col-span-4 sm:col-span-2">
                  <Field label="Einzelpreis netto">
                    <input
                      value={item.unitPrice}
                      onChange={(e) => updateItem(index, { unitPrice: e.target.value })}
                      disabled={readOnly}
                      placeholder="0,00"
                      className={inputClass}
                    />
                  </Field>
                </div>
                <div className="col-span-3 sm:col-span-1">
                  <Field label="USt. %">
                    <input
                      value={item.vatRate}
                      onChange={(e) => updateItem(index, { vatRate: e.target.value })}
                      disabled={readOnly || vatMode !== "standard"}
                      placeholder={vatRate}
                      className={inputClass}
                    />
                  </Field>
                </div>
                <div className="col-span-3 sm:col-span-1">
                  <Field label="Rabatt %">
                    <input
                      value={item.discount}
                      onChange={(e) => updateItem(index, { discount: e.target.value })}
                      disabled={readOnly}
                      placeholder="0"
                      className={inputClass}
                    />
                  </Field>
                </div>
                <div className="col-span-4 sm:col-span-1 text-right">
                  <span className="block text-[#8899b4] text-xs font-semibold mb-1.5">Netto</span>
                  <span className="block text-[#eef2f7] text-sm font-semibold py-2">
                    {totals?.rows[index] ? fmt(totals.rows[index].net, data.currency) : "—"}
                  </span>
                </div>
                <div className="col-span-2 sm:col-span-1 flex justify-end">
                  {!readOnly && items.length > 1 && (
                    <GhostButton
                      onClick={() => setItems((prev) => prev.filter((_, i) => i !== index))}
                      className="!px-2 !py-2"
                      title="Position entfernen"
                    >
                      <Trash2 size={13} />
                    </GhostButton>
                  )}
                </div>
              </div>
            ))}
          </div>

          {calcError && (
            <div className="mt-4">
              <Banner kind="error">
                <span className="flex items-center gap-2">
                  <AlertTriangle size={13} /> {calcError}
                </span>
              </Banner>
            </div>
          )}

          {totals && (
            <div className="mt-5 flex justify-end">
              <div className="w-full sm:w-[360px] space-y-1.5">
                <Row label="Zwischensumme netto" value={fmt(totals.net, data.currency)} />
                {totals.breakdown.map((row) => (
                  <Row
                    key={row.vatRateBp}
                    label={`zzgl. USt. ${(row.vatRateBp / 100).toLocaleString("de-DE")} %`}
                    value={fmt(row.vatAmountCents, data.currency)}
                  />
                ))}
                <div className="pt-2 border-t border-[#1a2840]">
                  <Row
                    label="Gesamtbetrag"
                    value={fmt(totals.gross, data.currency)}
                    strong
                  />
                </div>
                <p className="text-[#5b6b7f] text-xs pt-1 flex items-center gap-1.5">
                  <CheckCircle2 size={11} /> serverseitig berechnet
                </p>
              </div>
            </div>
          )}
        </Panel>

        {data.customPlaceholders.length > 0 && (
          <Panel
            title="Eigene Platzhalter"
            subtitle="Diese Werte stehen der Rechnungsvorlage als {{custom.<key>}} zur Verfügung."
          >
            <div className="grid sm:grid-cols-2 gap-4">
              {data.customPlaceholders.map((placeholder) => (
                <Field
                  key={placeholder.key}
                  label={placeholder.label}
                  required={placeholder.isRequired}
                  hint={`{{custom.${placeholder.key}}}`}
                >
                  <input
                    value={custom[placeholder.key] ?? ""}
                    onChange={(e) => setCustom({ ...custom, [placeholder.key]: e.target.value })}
                    disabled={readOnly}
                    type={
                      placeholder.type === "date"
                        ? "date"
                        : placeholder.type === "number"
                          ? "number"
                          : "text"
                    }
                    className={inputClass}
                  />
                </Field>
              ))}
            </div>
          </Panel>
        )}

        {(previewOpen || data.finalized) && data.id && (
          <Panel
            title="Vorschau"
            subtitle="Exakt die Vorlage, mit der auch das finale PDF erzeugt wird — inklusive Seitenumbrüchen, Bankdaten und Fußzeile."
          >
            <iframe
              key={previewKey}
              title="Rechnungsvorschau"
              src={`/api/admin/invoices/preview?invoiceId=${data.id}&v=${previewKey}`}
              className="w-full h-[1000px] rounded-lg border border-[#1a2840] bg-white"
            />
          </Panel>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-[#8899b4] text-sm">{label}</span>
      <span className={strong ? "text-[#eef2f7] text-base font-bold" : "text-[#c9d4e4] text-sm"}>
        {value}
      </span>
    </div>
  );
}
