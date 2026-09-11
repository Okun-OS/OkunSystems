"use client";

import { useRef, useState, useTransition } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  FileText,
  Loader2,
  Monitor,
  Plus,
  Send,
  Square,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { isFailure } from "@/lib/action-result";
import {
  PRESENTATION_STATUS_LABELS,
  SLIDE_ACCEPT,
  type SlideUpload,
} from "@/lib/closing/presentation-types";
import {
  addSlides,
  approvePresentation,
  createPresentation,
  deletePresentation,
  deleteSlide,
  rejectPresentation,
  showSlide,
  startPresentation,
  stopPresentation,
  submitPresentation,
} from "./presentation-actions";

/**
 * Präsentationen für das Gespräch.
 *
 * Der Berater bereitet seine Folien vorab vor und reicht sie zur Freigabe ein.
 * Erst eine freigegebene Präsentation lässt sich im Gespräch starten — und erst
 * dann liefert der Server ihre Folien überhaupt an den Kunden aus.
 *
 * Im Gespräch bestimmt der Berater, welche Folie der Kunde sieht.
 */

export type PresentationSlide = {
  id: string;
  position: number;
  title: string | null;
  fileName: string;
  mimeType: string;
};

export type PresentationItem = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  reviewNote: string | null;
  approvedByName: string | null;
  approvedAt: string | null;
  slides: PresentationSlide[];
};

export function PresentationPanel({
  closingSessionId,
  presentations,
  livePresentationId,
  liveSlidePosition,
  isAdmin,
}: {
  closingSessionId: string;
  presentations: PresentationItem[];
  livePresentationId: string | null;
  liveSlidePosition: number | null;
  isAdmin: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ kind: "error" | "ok"; text: string } | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [uploadFor, setUploadFor] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [rejectFor, setRejectFor] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function run(fn: () => Promise<unknown>, success: string) {
    setMessage(null);
    startTransition(async () => {
      const result = await fn();
      if (isFailure(result as object)) {
        setMessage({ kind: "error", text: (result as { error: string }).error });
      } else {
        setMessage({ kind: "ok", text: success });
        setShowNew(false);
        setRejectFor(null);
      }
    });
  }

  /** Lädt die gewählten Dateien nacheinander hoch und hängt sie als Folien an. */
  async function handleUpload(presentationId: string, files: FileList) {
    setUploading(true);
    setMessage(null);
    const uploaded: SlideUpload[] = [];
    try {
      for (const file of Array.from(files)) {
        const body = new FormData();
        body.append("file", file);
        body.append("closingSessionId", closingSessionId);
        const res = await fetch("/api/admin/presentations/upload", { method: "POST", body });
        const data = (await res.json()) as Partial<SlideUpload> & { error?: string };
        if (!res.ok || !data.r2Key) {
          setMessage({
            kind: "error",
            text: `${file.name}: ${data.error ?? "Upload fehlgeschlagen."}`,
          });
          break;
        }
        uploaded.push({
          r2Key: data.r2Key,
          fileName: data.fileName!,
          mimeType: data.mimeType!,
          fileSize: data.fileSize!,
          sha256: data.sha256!,
          title: file.name.replace(/\.[a-z0-9]+$/i, ""),
        });
      }
      if (uploaded.length > 0) {
        const result = await addSlides(presentationId, uploaded);
        if (isFailure(result as object)) {
          setMessage({ kind: "error", text: (result as { error: string }).error });
        } else {
          setMessage({
            kind: "ok",
            text: `${uploaded.length} Folie(n) hinzugefügt.`,
          });
          setUploadFor(null);
        }
      }
    } catch {
      setMessage({ kind: "error", text: "Netzwerkfehler beim Upload." });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const live = presentations.find((p) => p.id === livePresentationId) ?? null;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-[#f0f0f0] text-sm font-semibold mb-1">Präsentationen</h2>
          <p className="text-[#888] text-xs max-w-2xl leading-relaxed">
            Folien vor dem Gespräch vorbereiten, freigeben lassen und im Gespräch zeigen. Bilder
            (PNG, JPG, WebP) werden als einzelne Folien angezeigt und lassen sich weiterblättern;
            eine PDF erscheint als Dokument zum Scrollen.
          </p>
        </div>
        <button
          onClick={() => setShowNew((v) => !v)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[rgba(0,184,255,0.1)] border border-[rgba(0,184,255,0.25)] text-[#00b8ff] text-xs font-medium hover:bg-[rgba(0,184,255,0.16)] transition-colors flex-shrink-0"
        >
          <Plus size={13} /> Neue Präsentation
        </button>
      </div>

      {message && (
        <div
          className={`px-4 py-2.5 rounded-lg border text-xs ${
            message.kind === "error"
              ? "bg-[rgba(239,68,68,0.1)] border-[#ef4444]/25 text-[#fca5a5]"
              : "bg-[rgba(34,197,94,0.1)] border-[#22c55e]/25 text-[#86efac]"
          }`}
        >
          {message.text}
        </div>
      )}

      {showNew && (
        <form
          action={(fd) => run(() => createPresentation(closingSessionId, fd), "Präsentation angelegt.")}
          className="bg-[#0c1520] border border-[rgba(0,184,255,0.25)] rounded-xl p-4 space-y-3"
        >
          <div>
            <label className="block text-[#888] text-xs font-medium mb-1.5">Titel</label>
            <input
              name="title"
              required
              placeholder="z. B. Foundation-Paket im Überblick"
              className="w-full px-3 py-2 rounded-lg bg-[#080d14] border border-[#1a2840] text-[#f0f0f0] text-sm focus:outline-none focus:border-[#00b8ff]/50"
            />
          </div>
          <div>
            <label className="block text-[#888] text-xs font-medium mb-1.5">
              Beschreibung (optional)
            </label>
            <input
              name="description"
              className="w-full px-3 py-2 rounded-lg bg-[#080d14] border border-[#1a2840] text-[#f0f0f0] text-sm focus:outline-none focus:border-[#00b8ff]/50"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={pending}
              className="px-4 py-2 rounded-lg bg-[#00b8ff] text-black text-xs font-semibold disabled:opacity-40"
            >
              Anlegen
            </button>
            <button
              type="button"
              onClick={() => setShowNew(false)}
              className="px-4 py-2 rounded-lg border border-[#1a2840] text-[#888] text-xs"
            >
              Abbrechen
            </button>
          </div>
        </form>
      )}

      {live && <LiveControls
        presentation={live}
        position={liveSlidePosition}
        pending={pending}
        onShow={(pos) => run(() => showSlide(closingSessionId, pos), "Folie gewechselt.")}
        onStop={() => run(() => stopPresentation(closingSessionId), "Präsentation beendet.")}
      />}

      {presentations.length === 0 && !showNew && (
        <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-6 text-center">
          <Monitor size={20} className="text-[#444] mx-auto mb-2" />
          <p className="text-[#888] text-xs">
            Noch keine Präsentation vorbereitet.
          </p>
        </div>
      )}

      {presentations.map((presentation) => {
        const isLive = presentation.id === livePresentationId;
        const editable = presentation.status !== "approved";
        return (
          <div
            key={presentation.id}
            className={`bg-[#0c1520] border rounded-xl overflow-hidden ${
              isLive ? "border-[#22c55e]/40" : "border-[#1a2840]"
            }`}
          >
            <div className="px-5 py-3.5 border-b border-[#1a2840] flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-[#f0f0f0] text-sm font-semibold">{presentation.title}</h3>
                  <StatusPill status={presentation.status} />
                  {isLive && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border bg-[rgba(34,197,94,0.12)] text-[#22c55e] border-[#22c55e]/25">
                      <span className="w-1 h-1 rounded-full bg-[#22c55e] animate-pulse" /> LIVE
                    </span>
                  )}
                </div>
                {presentation.description && (
                  <p className="text-[#888] text-xs mt-1">{presentation.description}</p>
                )}
                <p className="text-[#555] text-xs mt-1">
                  {presentation.slides.length} Folie(n)
                  {presentation.approvedByName &&
                    ` · freigegeben von ${presentation.approvedByName}`}
                </p>
                {presentation.reviewNote && (
                  <p className="mt-2 text-[#fbbf24] text-xs">
                    Rückmeldung: {presentation.reviewNote}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                {editable && (
                  <button
                    onClick={() =>
                      setUploadFor(uploadFor === presentation.id ? null : presentation.id)
                    }
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#1a2840] text-[#888] text-xs hover:text-[#f0f0f0] transition-colors"
                  >
                    <Upload size={12} /> Folien hochladen
                  </button>
                )}
                {presentation.status === "draft" && presentation.slides.length > 0 && (
                  <button
                    onClick={() =>
                      run(
                        () => submitPresentation(presentation.id),
                        "Zur Freigabe eingereicht."
                      )
                    }
                    disabled={pending}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[rgba(0,184,255,0.25)] bg-[rgba(0,184,255,0.1)] text-[#00b8ff] text-xs disabled:opacity-40"
                  >
                    <Send size={12} /> Zur Freigabe
                  </button>
                )}
                {isAdmin && presentation.status === "submitted" && (
                  <>
                    <button
                      onClick={() =>
                        run(() => approvePresentation(presentation.id), "Freigegeben.")
                      }
                      disabled={pending}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#22c55e]/30 bg-[rgba(34,197,94,0.1)] text-[#22c55e] text-xs disabled:opacity-40"
                    >
                      <Check size={12} /> Freigeben
                    </button>
                    <button
                      onClick={() =>
                        setRejectFor(rejectFor === presentation.id ? null : presentation.id)
                      }
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#1a2840] text-[#888] text-xs hover:text-[#fca5a5]"
                    >
                      <X size={12} /> Zurückweisen
                    </button>
                  </>
                )}
                {presentation.status === "approved" && !isLive && (
                  <button
                    onClick={() =>
                      run(
                        () => startPresentation(closingSessionId, presentation.id),
                        "Präsentation gestartet — der Kunde sieht jetzt die erste Folie."
                      )
                    }
                    disabled={pending}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#00b8ff] text-black text-xs font-semibold disabled:opacity-40"
                  >
                    <Monitor size={12} /> Starten
                  </button>
                )}
                {isLive && (
                  <button
                    onClick={() =>
                      run(() => stopPresentation(closingSessionId), "Präsentation beendet.")
                    }
                    disabled={pending}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#ef4444]/30 text-[#fca5a5] text-xs disabled:opacity-40"
                  >
                    <Square size={11} /> Beenden
                  </button>
                )}
                {!isLive && (editable || isAdmin) && (
                  <button
                    onClick={() =>
                      run(() => deletePresentation(presentation.id), "Präsentation entfernt.")
                    }
                    disabled={pending}
                    className="p-1.5 rounded-lg border border-[#1a2840] text-[#555] hover:text-[#fca5a5] transition-colors disabled:opacity-40"
                    title="Präsentation löschen"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            </div>

            {rejectFor === presentation.id && (
              <form
                action={(fd) =>
                  run(
                    () => rejectPresentation(presentation.id, (fd.get("note") as string) ?? ""),
                    "Zurückgewiesen."
                  )
                }
                className="px-5 py-3 border-b border-[#1a2840] bg-[#080d14] flex flex-wrap gap-2"
              >
                <input
                  name="note"
                  placeholder="Was muss geändert werden?"
                  className="flex-1 min-w-[240px] px-3 py-2 rounded-lg bg-[#0c1520] border border-[#1a2840] text-[#f0f0f0] text-xs focus:outline-none focus:border-[#00b8ff]/50"
                />
                <button
                  type="submit"
                  disabled={pending}
                  className="px-3 py-2 rounded-lg border border-[#1a2840] text-[#888] text-xs disabled:opacity-40"
                >
                  Zurückweisen
                </button>
              </form>
            )}

            {uploadFor === presentation.id && (
              <div className="px-5 py-3.5 border-b border-[#1a2840] bg-[#080d14]">
                <input
                  ref={fileRef}
                  type="file"
                  accept={SLIDE_ACCEPT}
                  multiple
                  disabled={uploading}
                  onChange={(e) => {
                    const files = e.target.files;
                    if (files && files.length > 0) void handleUpload(presentation.id, files);
                  }}
                  className="text-[#888] text-xs file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:bg-[#1a2840] file:text-[#f0f0f0] file:text-xs"
                />
                <p className="text-[#555] text-xs mt-2">
                  Mehrfachauswahl möglich — die Folien werden in der gewählten Reihenfolge
                  angehängt. In PowerPoint, Keynote und Google Slides über „Exportieren als
                  Bilder“.
                </p>
                {uploading && (
                  <p className="text-[#00b8ff] text-xs mt-2 flex items-center gap-1.5">
                    <Loader2 size={12} className="animate-spin" /> Folien werden hochgeladen…
                  </p>
                )}
              </div>
            )}

            {presentation.slides.length > 0 && (
              <div className="px-5 py-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {presentation.slides.map((slide) => (
                  <SlideCard
                    key={slide.id}
                    slide={slide}
                    live={isLive && slide.position === liveSlidePosition}
                    canDelete={editable}
                    pending={pending}
                    onShow={
                      isLive
                        ? () =>
                            run(
                              () => showSlide(closingSessionId, slide.position),
                              `Folie ${slide.position} wird gezeigt.`
                            )
                        : undefined
                    }
                    onDelete={() => run(() => deleteSlide(slide.id), "Folie entfernt.")}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Steuerung der laufenden Präsentation — bewusst groß und griffbereit. */
function LiveControls({
  presentation,
  position,
  pending,
  onShow,
  onStop,
}: {
  presentation: PresentationItem;
  position: number | null;
  pending: boolean;
  onShow: (position: number) => void;
  onStop: () => void;
}) {
  const index = presentation.slides.findIndex((s) => s.position === position);
  const current = index >= 0 ? presentation.slides[index] : presentation.slides[0];
  const previous = index > 0 ? presentation.slides[index - 1] : null;
  const next =
    index >= 0 && index < presentation.slides.length - 1 ? presentation.slides[index + 1] : null;

  return (
    <div className="bg-[#0c1520] border border-[#22c55e]/40 rounded-xl p-4">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse flex-shrink-0" />
          <span className="text-[#f0f0f0] text-xs font-semibold truncate">
            Der Kunde sieht: {current?.title ?? current?.fileName ?? "—"}
          </span>
          <span className="text-[#555] text-xs flex-shrink-0">
            {index >= 0 ? index + 1 : 1} / {presentation.slides.length}
          </span>
        </div>
        <button
          onClick={onStop}
          disabled={pending}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#ef4444]/30 text-[#fca5a5] text-xs disabled:opacity-40"
        >
          <Square size={11} /> Beenden
        </button>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => previous && onShow(previous.position)}
          disabled={pending || !previous}
          className="flex items-center gap-1 px-4 py-2.5 rounded-lg border border-[#1a2840] text-[#888] text-sm hover:text-[#f0f0f0] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft size={15} /> Zurück
        </button>
        <button
          onClick={() => next && onShow(next.position)}
          disabled={pending || !next}
          className="flex-1 flex items-center justify-center gap-1 px-4 py-2.5 rounded-lg bg-[#00b8ff] text-black text-sm font-semibold disabled:bg-[#16283d] disabled:text-[#4a5a70] disabled:cursor-not-allowed transition-colors"
        >
          Weiter <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}

function SlideCard({
  slide,
  live,
  canDelete,
  pending,
  onShow,
  onDelete,
}: {
  slide: PresentationSlide;
  live: boolean;
  canDelete: boolean;
  pending: boolean;
  onShow?: () => void;
  onDelete: () => void;
}) {
  const src = `/api/admin/presentations/slide?slideId=${encodeURIComponent(slide.id)}`;
  const isPdf = slide.mimeType === "application/pdf";

  return (
    <div
      className={`rounded-lg border overflow-hidden bg-[#080d14] ${
        live ? "border-[#22c55e]" : "border-[#1a2840]"
      }`}
    >
      <button
        onClick={onShow}
        disabled={!onShow || pending}
        className="block w-full aspect-video bg-[#05080d] overflow-hidden disabled:cursor-default"
        title={onShow ? "Diese Folie zeigen" : slide.fileName}
      >
        {isPdf ? (
          <span className="w-full h-full flex flex-col items-center justify-center gap-1 text-[#555]">
            <FileText size={18} />
            <span className="text-[10px]">PDF</span>
          </span>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={slide.title ?? slide.fileName}
            className="w-full h-full object-contain"
          />
        )}
      </button>
      <div className="px-2 py-1.5 flex items-center justify-between gap-2">
        <span className="text-[#888] text-[10px] truncate" title={slide.fileName}>
          {slide.position}. {slide.title ?? slide.fileName}
        </span>
        {canDelete && (
          <button
            onClick={onDelete}
            disabled={pending}
            className="text-[#444] hover:text-[#fca5a5] transition-colors flex-shrink-0 disabled:opacity-40"
            title="Folie entfernen"
          >
            <Trash2 size={11} />
          </button>
        )}
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: "bg-[#101c2e] text-[#888] border-[#1a2840]",
    submitted: "bg-[rgba(245,158,11,0.1)] text-[#fbbf24] border-[#f59e0b]/25",
    approved: "bg-[rgba(34,197,94,0.12)] text-[#22c55e] border-[#22c55e]/25",
    archived: "bg-[#101c2e] text-[#555] border-[#1a2840]",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${
        styles[status] ?? styles.draft
      }`}
    >
      {PRESENTATION_STATUS_LABELS[status] ?? status}
    </span>
  );
}
