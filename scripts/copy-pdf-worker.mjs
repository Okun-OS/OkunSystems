/**
 * Kopiert den pdf.js-Worker nach public/.
 *
 * Der Worker lässt sich nicht als Modul importieren — die Datei hat keinen
 * Default-Export, sondern ist Worker-Code zum Ausführen. Sie muss als eigene
 * Datei ausgeliefert werden, damit der Browser sie als Worker starten kann.
 *
 * Läuft bei postinstall und vor jedem Build, damit die ausgelieferte Datei
 * immer zur installierten Fassung von pdfjs-dist passt.
 */
import { copyFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);

try {
  const pdfjsEntry = require.resolve("pdfjs-dist/package.json");
  const source = join(dirname(pdfjsEntry), "build", "pdf.worker.min.mjs");
  const targetDir = join(process.cwd(), "public");
  mkdirSync(targetDir, { recursive: true });
  copyFileSync(source, join(targetDir, "pdf.worker.min.mjs"));
  console.log("[pdf] Worker nach public/pdf.worker.min.mjs kopiert");
} catch (error) {
  console.error("[pdf] Worker konnte nicht kopiert werden:", error);
  process.exitCode = 1;
}
