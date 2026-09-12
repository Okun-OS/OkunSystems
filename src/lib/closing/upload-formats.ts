/**
 * Dateiformate, die im Closing hochgeladen und angezeigt werden können.
 *
 * Maßgeblich ist, was ein Browser tatsächlich darstellen kann. Ein Format
 * anzunehmen, das sich später nicht zeigen lässt, verschiebt das Problem nur
 * in den Moment, in dem der Kunde zusieht.
 */

export type UploadFormat = {
  mimeType: string;
  extension: string;
  label: string;
};

/** Bilder, die jeder gängige Browser darstellt. */
export const IMAGE_FORMATS: UploadFormat[] = [
  { mimeType: "image/png", extension: "png", label: "PNG" },
  { mimeType: "image/jpeg", extension: "jpg", label: "JPG" },
  { mimeType: "image/webp", extension: "webp", label: "WebP" },
  { mimeType: "image/avif", extension: "avif", label: "AVIF" },
  { mimeType: "image/gif", extension: "gif", label: "GIF" },
  { mimeType: "image/bmp", extension: "bmp", label: "BMP" },
];

export const PDF_FORMAT: UploadFormat = {
  mimeType: "application/pdf",
  extension: "pdf",
  label: "PDF",
};

/** Alles, was sich im Gespräch zeigen lässt. */
export const DISPLAYABLE_FORMATS: UploadFormat[] = [PDF_FORMAT, ...IMAGE_FORMATS];

export const DISPLAYABLE_MIME_TYPES = DISPLAYABLE_FORMATS.map((f) => f.mimeType);

/** Für das `accept`-Attribut eines Dateifelds. */
export const DISPLAYABLE_ACCEPT = DISPLAYABLE_MIME_TYPES.join(",");

/** Aufzählung für Hinweise und Fehlermeldungen: „PDF, PNG, JPG, WebP …". */
export const DISPLAYABLE_LABELS = DISPLAYABLE_FORMATS.map((f) => f.label).join(", ");

export function isDisplayable(mimeType: string): boolean {
  return DISPLAYABLE_MIME_TYPES.includes(mimeType);
}

export function isImage(mimeType: string): boolean {
  return mimeType.startsWith("image/");
}

/** Dateiendung zum Medientyp — für den Objektnamen in R2. */
export function extensionFor(mimeType: string): string {
  return DISPLAYABLE_FORMATS.find((f) => f.mimeType === mimeType)?.extension ?? "bin";
}

/**
 * Büroformate, die verbreitet sind, sich im Browser aber nicht darstellen
 * lassen. Sie werden bewusst abgewiesen — mit einem Hinweis, der sagt, was zu
 * tun ist, statt nur „nicht erlaubt".
 */
export const OFFICE_MIME_TYPES = [
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.oasis.opendocument.text",
  "application/vnd.oasis.opendocument.presentation",
];

export const OFFICE_HINT =
  "Word-, PowerPoint- und Excel-Dateien lassen sich im Browser nicht anzeigen. " +
  "Speichern Sie die Datei als PDF (in Office über „Speichern unter“ → PDF) — " +
  "dann bleibt das Layout erhalten und der Kunde sieht sie sofort.";

/** Passende Fehlermeldung zum abgelehnten Medientyp. */
export function rejectionMessage(mimeType: string): string {
  if (OFFICE_MIME_TYPES.includes(mimeType)) return OFFICE_HINT;
  return `Zulässig sind ${DISPLAYABLE_LABELS}.`;
}
