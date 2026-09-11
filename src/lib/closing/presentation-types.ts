/** Folien-Typen als importfreies Modul (auch im Client nutzbar). */

export type SlideUpload = {
  r2Key: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  sha256: string;
  title?: string | null;
};

export const PRESENTATION_STATUS_LABELS: Record<string, string> = {
  draft: "Entwurf",
  submitted: "Wartet auf Freigabe",
  approved: "Freigegeben",
  archived: "Archiviert",
};

/** Zulässige Folienformate — Bilder als Folie, PDF als Dokument. */
export const SLIDE_ACCEPT = "image/png,image/jpeg,image/webp,image/gif,application/pdf";
