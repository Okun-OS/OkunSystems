/**
 * pdf.js liefert den Worker als ESM-Modul ohne Typen aus. Der Default-Export
 * ist eine Worker-Klasse, die der Bundler mit dem passenden Bundle verdrahtet.
 */
declare module "pdfjs-dist/build/pdf.worker.min.mjs" {
  const PdfWorker: new () => Worker;
  export default PdfWorker;
}
