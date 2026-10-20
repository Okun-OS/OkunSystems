import { readFile } from "fs/promises";
import path from "path";

/**
 * Liefert das OKUN-Logo als Data-URI. Beim serverseitigen PDF-Rendering gibt es
 * keine Basis-URL, relative Pfade würden daher nicht aufgelöst.
 */
let cached: string | null | undefined;

export async function getLogoDataUri(): Promise<string | null> {
  if (cached !== undefined) return cached;
  const candidates = ["okun-logo.png", "okun-icon.png"];
  for (const file of candidates) {
    try {
      const buffer = await readFile(path.join(process.cwd(), "public", file));
      cached = `data:image/png;base64,${buffer.toString("base64")}`;
      return cached;
    } catch {
      // nächste Datei versuchen
    }
  }
  cached = null;
  return cached;
}

export const OKUN_COLORS = {
  ink: "#0f1720",
  muted: "#5b6b7f",
  line: "#d8e0ea",
  accent: "#00b8ff",
  accentDark: "#0284b8",
};
