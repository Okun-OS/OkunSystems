import { db } from "@/lib/db";
import { renderHtmlToPdf } from "@/lib/blueprint/pdf-generator";
import { uploadToR2 } from "@/lib/storage";
import { sha256Buffer, verifyR2Object } from "./hash";
import {
  buildDocumentHtml,
  renderTemplate,
  type TemplateContext,
} from "./template-engine";

/**
 * Gemeinsame Pipeline für alle serverseitig erzeugten Dokumente:
 * Template + Daten → HTML → PDF → SHA-256 → privater R2-Upload → Verifizierung.
 */

export const TEMPLATE_TYPES = [
  "invoice",
  "closing_certificate",
  "order_confirmation",
  "payment_reminder",
  "dunning",
  "acceptance_protocol",
  "strategy_protocol",
] as const;

export type TemplateType = (typeof TEMPLATE_TYPES)[number];

export { TEMPLATE_TYPE_LABELS } from "./template-type-labels";
import { TEMPLATE_TYPE_LABELS } from "./template-type-labels";

export type ResolvedTemplate = {
  templateId: string;
  templateName: string;
  version: number;
  html: string;
  css: string;
  settings: Record<string, unknown>;
};

/** Aktive Vorlage eines Dokumenttyps mit ihrer aktuellen Version laden. */
export async function resolveTemplate(
  type: TemplateType,
  templateId?: string | null,
  version?: number | null
): Promise<ResolvedTemplate | null> {
  const template = templateId
    ? await db.documentTemplate.findUnique({ where: { id: templateId } })
    : ((await db.documentTemplate.findFirst({
        where: { type, isActive: true, isDefault: true },
        orderBy: { updatedAt: "desc" },
      })) ??
      (await db.documentTemplate.findFirst({
        where: { type, isActive: true },
        orderBy: { updatedAt: "desc" },
      })));
  if (!template) return null;

  const templateVersion = await db.documentTemplateVersion.findFirst({
    where: {
      templateId: template.id,
      version: version ?? template.currentVersion,
    },
  });
  if (!templateVersion) return null;

  return {
    templateId: template.id,
    templateName: template.name,
    version: templateVersion.version,
    html: templateVersion.html,
    css: templateVersion.css,
    settings: (templateVersion.settings as Record<string, unknown>) ?? {},
  };
}

export type RenderedDocument = {
  html: string;
  buffer: Buffer;
  sha256: string;
  size: number;
  templateId: string | null;
  templateVersion: number | null;
  missingPlaceholders: string[];
};

/** Rendert eine Vorlage zu HTML — ohne PDF, z. B. für die Live-Vorschau. */
export async function renderTemplateHtml(input: {
  type: TemplateType;
  context: TemplateContext;
  title: string;
  templateId?: string | null;
  templateVersion?: number | null;
}): Promise<{ html: string; template: ResolvedTemplate; missing: string[] } | null> {
  const template = await resolveTemplate(input.type, input.templateId, input.templateVersion);
  if (!template) return null;

  const missing: string[] = [];
  const body = renderTemplate(template.html, input.context, { collectMissing: missing });
  const css = renderTemplate(template.css, input.context, { missingValue: "" });

  return {
    html: buildDocumentHtml({ html: body, css, title: input.title }),
    template,
    missing,
  };
}

/** Rendert eine Vorlage zu einem PDF inklusive Integritäts-Hash. */
export async function renderDocumentPdf(input: {
  type: TemplateType;
  context: TemplateContext;
  title: string;
  templateId?: string | null;
  templateVersion?: number | null;
}): Promise<RenderedDocument> {
  const rendered = await renderTemplateHtml(input);
  if (!rendered) {
    throw new Error(
      `Für den Dokumenttyp „${TEMPLATE_TYPE_LABELS[input.type] ?? input.type}" ist keine aktive Vorlage konfiguriert.`
    );
  }

  const buffer = await renderHtmlToPdf(rendered.html);
  return {
    html: rendered.html,
    buffer,
    sha256: sha256Buffer(buffer),
    size: buffer.byteLength,
    templateId: rendered.template.templateId,
    templateVersion: rendered.template.version,
    missingPlaceholders: rendered.missing,
  };
}

export type StoredDocument = {
  r2Key: string;
  sha256: string;
  size: number;
};

/**
 * Lädt ein erzeugtes PDF in den privaten R2-Bucket und verifiziert den Upload.
 * Erst nach erfolgreicher Verifizierung gilt das Dokument als archiviert.
 */
export async function storeDocumentPdf(input: {
  buffer: Buffer;
  key: string;
  sha256?: string;
}): Promise<StoredDocument> {
  const sha256 = input.sha256 ?? sha256Buffer(input.buffer);
  await uploadToR2(input.buffer, input.key, "application/pdf");

  const verified = await verifyR2Object(input.key, input.buffer.byteLength);
  if (!verified.ok) {
    throw new Error(
      `Upload nach R2 konnte nicht verifiziert werden: ${verified.error ?? "unbekannter Fehler"}`
    );
  }

  return { r2Key: input.key, sha256, size: input.buffer.byteLength };
}

export function buildContractDocumentKey(
  companyId: string,
  kind: string,
  fileName: string
): string {
  const sanitized = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `contracts/${companyId}/${kind}/${Date.now()}_${sanitized}`;
}

export function buildRecordingKey(closingSessionId: string, fileName: string): string {
  const sanitized = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `recordings/${closingSessionId}/${Date.now()}_${sanitized}`;
}
