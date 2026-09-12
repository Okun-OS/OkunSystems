"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

/**
 * Eine einzelne PDF-Seite, passgenau in ihren Container gerechnet.
 *
 * Gegenüber einem <iframe> mit eingebautem Browser-Viewer hat das drei Vorteile,
 * die im Closing zählen:
 *   • die Seite ist immer vollständig sichtbar statt willkürlich hineingezoomt,
 *   • das Blättern liegt bei uns — der Berater kann es für den Kunden steuern,
 *   • über der Seite lässt sich zeigen (Laserpointer), was über einem iframe
 *     nicht möglich wäre.
 *
 * pdf.js wird erst beim ersten Einsatz geladen, damit es nicht im Hauptbündel
 * der Anwendung landet.
 */

type PdfModule = typeof import("pdfjs-dist");

let pdfjsPromise: Promise<PdfModule> | null = null;

async function loadPdfjs(): Promise<PdfModule> {
  if (!pdfjsPromise) {
    pdfjsPromise = import("pdfjs-dist").then(async (module) => {
      const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs");
      // Der Worker bringt sich selbst mit; pdf.js erwartet ihn als Port.
      module.GlobalWorkerOptions.workerPort = new (
        worker as unknown as { default: new () => Worker }
      ).default();
      return module;
    });
  }
  return pdfjsPromise;
}

export function PdfPage({
  src,
  page,
  onDocumentLoad,
  className,
}: {
  src: string;
  /** 1-basiert. Seiten außerhalb des Dokuments werden begrenzt. */
  page: number;
  onDocumentLoad?: (pageCount: number) => void;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [boxSize, setBoxSize] = useState<{ width: number; height: number } | null>(null);
  const renderTaskRef = useRef<{ cancel: () => void } | null>(null);

  // Der Aufrufer darf eine frische Funktion übergeben, ohne einen erneuten
  // Zeichenvorgang auszulösen.
  const onDocumentLoadRef = useRef(onDocumentLoad);
  useEffect(() => {
    onDocumentLoadRef.current = onDocumentLoad;
  });

  // Containergröße beobachten — daraus ergibt sich der Maßstab.
  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (rect) setBoxSize({ width: rect.width, height: rect.height });
    });
    observer.observe(box);
    return () => observer.disconnect();
  }, []);

  /**
   * Zeichnet die Seite und meldet das Ergebnis zurück, statt den Zustand selbst
   * zu setzen — so bleibt der Effekt unten frei von Folgeschleifen.
   */
  const render = useCallback(async (): Promise<"ready" | "error" | "skip"> => {
    if (!boxSize || boxSize.width < 10 || boxSize.height < 10) return "skip";
    try {
      const pdfjs = await loadPdfjs();
      const doc = await pdfjs.getDocument({ url: src, withCredentials: true }).promise;
      onDocumentLoadRef.current?.(doc.numPages);

      const target = Math.min(Math.max(page, 1), doc.numPages);
      const pdfPage = await doc.getPage(target);

      const base = pdfPage.getViewport({ scale: 1 });
      // Ganze Seite sichtbar: der kleinere der beiden Maßstäbe gewinnt.
      const scale = Math.min(boxSize.width / base.width, boxSize.height / base.height);
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const viewport = pdfPage.getViewport({ scale: scale * ratio });

      const canvas = canvasRef.current;
      const context = canvas?.getContext("2d");
      if (!canvas || !context) return "skip";

      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      canvas.style.width = `${Math.floor(viewport.width / ratio)}px`;
      canvas.style.height = `${Math.floor(viewport.height / ratio)}px`;

      renderTaskRef.current?.cancel();
      const task = pdfPage.render({ canvas, canvasContext: context, viewport });
      renderTaskRef.current = task;
      await task.promise;
      return "ready";
    } catch (err) {
      // Ein abgebrochener Render ist kein Fehler — er passiert bei jedem
      // Seitenwechsel und bei jeder Größenänderung.
      const message = err instanceof Error ? err.message : String(err);
      if (/cancel/i.test(message)) return "skip";
      return "error";
    }
  }, [src, page, boxSize]);

  useEffect(() => {
    let cancelled = false;
    void render().then((result) => {
      if (cancelled || result === "skip") return;
      setStatus(result);
      setError(result === "error" ? "Die Seite konnte nicht geladen werden." : null);
    });
    return () => {
      cancelled = true;
    };
  }, [render]);

  return (
    <div
      ref={boxRef}
      className={`relative flex items-center justify-center overflow-hidden ${className ?? ""}`}
    >
      <canvas ref={canvasRef} className="block max-w-full max-h-full" />
      {status === "loading" && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 size={20} className="text-[#5b6b7f] animate-spin" />
        </div>
      )}
      {status === "error" && (
        <div className="absolute inset-0 flex items-center justify-center px-4 text-center">
          <p className="text-[#fca5a5] text-sm">{error}</p>
        </div>
      )}
    </div>
  );
}
