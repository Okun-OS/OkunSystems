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
