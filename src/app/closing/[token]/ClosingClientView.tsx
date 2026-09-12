"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  ExternalLink,
  FileText,
  Loader2,
  Radio,
  ShieldCheck,
  Video,
  X,
} from "lucide-react";
import { OkunLogo } from "@/components/layout/okun-logo";
import { OkunCall, type CallSlide } from "@/components/closing/okun-call";
import { PdfPage } from "@/components/closing/pdf-page";
import type { ClientClosingState } from "@/lib/closing/client-view";

/**
 * Kundenseite des Closings.
 *
 * Der Kunde bleibt durchgehend im OKUN-Fenster: das Gespräch läuft in unserer
 * eigenen Oberfläche, daneben stehen — sobald sie an der Reihe sind — Angebot,
 * Unterlagen und Erklärungen.
 *
 * Bewusst zurückhaltend am Anfang: Für den Kunden ist das zunächst ein
 * Strategiegespräch. Erst wenn der Berater ein Angebot vorstellt, erscheint
 * überhaupt etwas Vertriebliches; die Erklärungen kommen erst, wenn der
 * Vertragsabschluss eröffnet ist.
 *
 * Sämtliche Checkbox-Texte — einschließlich der Einwilligung in die
 * Vertragsaufzeichnung — stammen aus der Admin-Konfiguration und werden hier
 * nur angezeigt. Im Code steht keine dieser Formulierungen.
 */

type Props = { initialState: ClientClosingState; token: string };

const STEPS = [
  { key: "offer", label: "Angebot" },
  { key: "documents", label: "Unterlagen" },
  { key: "confirm", label: "Bestätigen" },
  { key: "recording", label: "Aufzeichnung" },
  { key: "payment", label: "Zahlung" },
  { key: "done", label: "Abschluss" },
] as const;

function stepIndexFor(state: ClientClosingState): number {
  if (state.isActivated || state.status === "customer_activated") return 5;
  if (state.isPaid) return 5;
  if (state.status === "payment_pending" || state.status === "contract_closed") return 4;
  if (state.status === "recording" || state.status === "recording_completed") return 3;
  if (state.snapshotReady && !state.allRequiredConfirmed) return 2;
  if (state.allRequiredConfirmed) return 3;
  return 0;
}

export function ClosingClientView({ initialState, token }: Props) {
  const [state, setState] = useState(initialState);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [missing, setMissing] = useState<string[]>([]);
  const [joined, setJoined] = useState(false);
  const [offerOpen, setOfferOpen] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/closing/state?token=${encodeURIComponent(token)}`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const next = (await res.json()) as ClientClosingState;
      setState(next);
    } catch {
      // Netzwerkaussetzer werden beim nächsten Intervall erneut versucht.
    }
  }, [token]);

  // Der Berater meldet Änderungen über den Datenkanal des Gesprächs; die
  // Abfrage ist nur die Rückfallebene, falls jemand noch nicht beigetreten ist.
  useEffect(() => {
    const interval = state.isActivated ? 60_000 : joined ? 15_000 : 8_000;
    pollRef.current = setInterval(refresh, interval);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [refresh, state.isActivated, joined]);

  const pendingConsents = useMemo(
    () => state.consents.filter((c) => !c.accepted),
    [state.consents]
  );
  const requiredPending = pendingConsents.filter((c) => c.isRequired);
  const canSubmit =
    state.snapshotReady &&
    requiredPending.length > 0 &&
    requiredPending.every((c) => checked.has(c.definitionId));

  const activeStep = stepIndexFor(state);
  const offerPdfUrl = `/api/closing/offer-pdf?token=${encodeURIComponent(token)}`;
  const showStage = Boolean(state.meetingUrl) && !state.isActivated;

  const slide: CallSlide | null = state.presentation
    ? {
        slideId: state.presentation.slideId,
        mimeType: state.presentation.mimeType,
        title: state.presentation.title,
        slideTitle: state.presentation.slideTitle,
        position: state.presentation.position,
        slideCount: state.presentation.slideCount,
        page: state.presentation.page,
        src: `/api/closing/slide?token=${encodeURIComponent(token)}&slideId=${encodeURIComponent(state.presentation.slideId)}`,
      }
    : null;

  async function handleConfirm() {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    setError(null);
    setMissing([]);
    try {
      const res = await fetch("/api/closing/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, accepted: [...checked] }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        missing?: string[];
        state?: ClientClosingState;
      };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Die Bestätigung konnte nicht verarbeitet werden.");
        setMissing(data.missing ?? []);
        // Auch im Fehlerfall den Serverstand übernehmen.
        await refresh();
        return;
      }
      if (data.state) setState(data.state);
      setChecked(new Set());
    } catch {
      setError(
        "Die Verbindung wurde unterbrochen. Ihre Bestätigung wurde möglicherweise nicht gespeichert — bitte prüfen Sie den Stand oben und versuchen Sie es erneut."
      );
      await refresh();
    } finally {
      setSubmitting(false);
    }
  }

  // Vor dem Angebot hat die rechte Spalte nichts zu zeigen — dann bekommt das
  // Gespräch die ganze Breite.
  const hasSidebar =
    state.offerPresented || state.consents.length > 0 || Boolean(state.invoice);

  return (
    <div className="min-h-screen bg-[#060a10] flex flex-col">
      {state.recordingActive && (
        <div className="bg-[#7f1d1d] border-b border-[#ef4444]/40">
          <div className="mx-auto w-full max-w-[1500px] px-4 sm:px-6 py-2 flex flex-wrap items-center gap-2">
            <Radio size={14} className="text-[#fca5a5] animate-pulse" />
            <span className="text-[#fee2e2] text-xs font-bold">Aufzeichnung läuft</span>
            <span className="text-[#fca5a5] text-xs">
              Der Vertragsabschluss wird mit Ihrer Einwilligung aufgezeichnet.
            </span>
          </div>
        </div>
      )}

      <header className="sticky top-0 z-20 border-b border-[#12203a] bg-[#080d16]/95 backdrop-blur">
        <div className="mx-auto w-full max-w-[1500px] px-4 sm:px-6 py-3 flex flex-wrap items-center gap-x-5 gap-y-3">
          <div className="w-[116px] flex-shrink-0">
            <OkunLogo size="sm" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[#eef2f7] text-sm font-semibold">{state.companyName}</p>
            {state.closerName && (
              <p className="truncate text-[#5b6b7f] text-xs">Ihr Berater: {state.closerName}</p>
            )}
          </div>
          {/* Die Schrittanzeige erscheint erst, wenn es tatsächlich Schritte gibt. */}
          {state.offerPresented && <CompactSteps active={activeStep} />}
        </div>
      </header>

      <main className="flex-1 w-full max-w-[1500px] mx-auto px-4 sm:px-6 py-5">
        <div
          className={`grid gap-5 items-start ${
            hasSidebar ? "lg:grid-cols-[minmax(0,1fr)_390px]" : ""
          }`}
        >
          <div className="min-w-0 space-y-5">
            {showStage &&
              (joined ? (
                <div
                  className="rounded-2xl border border-[#12203a] bg-[#0a111c] overflow-hidden"
                  style={{ height: "min(calc(100vh - 190px), 720px)" }}
                >
                  <OkunCall
                    roomUrl={state.meetingUrl!}
                    userName={state.contactName ?? state.companyName}
                    role="client"
                    slide={slide}
                    onLeave={() => setJoined(false)}
                    onRemoteChange={refresh}
                  />
                </div>
              ) : (
                <WaitingRoom
                  advisorPresent={state.advisorPresent}
                  appointmentStart={state.appointmentStart}
                  closerName={state.closerName}
                  onJoin={() => setJoined(true)}
                />
              ))}

            {!showStage && !state.isActivated && (
              <Card>
                <div className="px-5 py-10 text-center">
                  <Loader2 size={20} className="text-[#5b6b7f] animate-spin mx-auto mb-3" />
                  <p className="text-[#eef2f7] text-sm font-semibold">
                    Ihr Berater richtet den Gesprächsraum ein
                  </p>
                  <p className="text-[#8899b4] text-xs mt-1">
                    Sobald er bereitsteht, erscheint das Gespräch hier automatisch.
                  </p>
                </div>
              </Card>
            )}

            {state.isActivated && (
              <Card>
                <div className="px-5 py-10 text-center">
                  <ShieldCheck size={28} className="text-[#22c55e] mx-auto mb-3" />
                  <h2 className="text-[#eef2f7] text-base font-bold mb-1.5">
                    Willkommen bei OKUN Systems
                  </h2>
                  <p className="text-[#8899b4] text-sm max-w-md mx-auto">
                    Ihr Kundenzugang ist freigeschaltet. Alle Vertragsunterlagen finden Sie in
                    Ihrem Portal unter &bdquo;Dokumente&ldquo;.
                  </p>
                </div>
              </Card>
            )}
          </div>

          {hasSidebar && (
            <aside className="space-y-5 min-w-0">
              {state.offer && (
                <Card>
                  <CardHead title="Ihr Angebot" meta={state.offer.offerNumber ?? undefined} />
                  <div className="px-5 py-4 space-y-2.5">
                    <Row label="Paket" value={state.offer.packageName ?? "—"} strong />
                    <Row label="Einmalig (netto)" value={state.offer.oneTimeNet} />
                    <Row
                      label={`zzgl. USt. ${state.offer.vatRateLabel}`}
                      value={state.offer.oneTimeVat}
                    />
                    <Row label="Gesamtbetrag (brutto)" value={state.offer.oneTimeGross} strong />
                    {state.offer.recurring && (
                      <Row
                        label={`Laufend${state.offer.recurringInterval ? ` (${state.offer.recurringInterval})` : ""}`}
                        value={state.offer.recurring}
                      />
                    )}
                    {state.offer.minimumTermMonths && (
                      <Row
                        label="Mindestlaufzeit"
                        value={`${state.offer.minimumTermMonths} Monate`}
                      />
                    )}
                    {state.offer.extras.length > 0 && (
                      <div className="pt-2 border-t border-[#101b2c]">
                        <p className="text-[#5b6b7f] text-[11px] uppercase tracking-wider mb-2">
                          Zusatzleistungen
                        </p>
                        {state.offer.extras.map((extra, i) => (
                          <Row key={i} label={extra.description} value={extra.amount} />
                        ))}
                      </div>
                    )}
                    {state.offer.paymentTerms && (
                      <Row label="Zahlungsbedingungen" value={state.offer.paymentTerms} />
                    )}
                  </div>

                  {state.offerPdfAvailable && (
                    <div className="px-5 py-3.5 border-t border-[#12203a] bg-[#070d15] flex flex-wrap gap-2">
                      <button
                        onClick={() => setOfferOpen(true)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[rgba(0,184,255,0.12)] border border-[#00b8ff]/30 text-[#00b8ff] text-xs font-semibold hover:bg-[rgba(0,184,255,0.2)] transition-colors"
                      >
                        <FileText size={13} /> Angebot ansehen
                      </button>
                      <a
                        href={offerPdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#16283d] text-[#8899b4] text-xs hover:text-[#eef2f7] transition-colors"
                      >
                        <ExternalLink size={13} /> In neuem Tab
                      </a>
                    </div>
                  )}
                </Card>
              )}

              {state.consents.length > 0 && (
                <Card>
                  <CardHead
                    title="Unterlagen & Erklärungen"
                    subtitle="Bitte öffnen Sie die Unterlagen und bestätigen Sie die erforderlichen Erklärungen."
                  />

                  <div className="divide-y divide-[#101b2c]">
                    {state.consents.map((consent) => {
                      const isChecked = consent.accepted || checked.has(consent.definitionId);
                      return (
                        <div key={consent.definitionId} className="px-5 py-4">
                          {consent.document && (
                            <a
                              href={
                                consent.document.openable
                                  ? `/api/closing/document?token=${encodeURIComponent(token)}&versionId=${consent.document.versionId}`
                                  : undefined
                              }
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`inline-flex items-center gap-2 mb-2.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition-colors ${
                                consent.document.openable
                                  ? "border-[#00b8ff]/30 bg-[rgba(0,184,255,0.08)] text-[#00b8ff] hover:bg-[rgba(0,184,255,0.16)]"
                                  : "border-[#16283d] text-[#5b6b7f] cursor-not-allowed"
                              }`}
                            >
                              <FileText size={12} />
                              {consent.document.name} Version {consent.document.versionLabel}
                            </a>
                          )}

                          <label
                            className={`flex items-start gap-3 ${
                              consent.accepted ? "cursor-default" : "cursor-pointer"
                            }`}
                          >
                            <span
                              className={`mt-0.5 w-[18px] h-[18px] rounded flex-shrink-0 border flex items-center justify-center transition-colors ${
                                isChecked
                                  ? "bg-[#00b8ff] border-[#00b8ff]"
                                  : "border-[#2a3a55] bg-[#070d15]"
                              }`}
                            >
                              {isChecked && (
                                <Check size={12} className="text-[#041018]" strokeWidth={3} />
                              )}
                              <input
                                type="checkbox"
                                className="sr-only"
                                checked={isChecked}
                                disabled={consent.accepted || submitting}
                                onChange={(e) => {
                                  setChecked((prev) => {
                                    const next = new Set(prev);
                                    if (e.target.checked) next.add(consent.definitionId);
                                    else next.delete(consent.definitionId);
                                    return next;
                                  });
                                }}
                              />
                            </span>
                            <span className="flex-1">
                              {/* Wortlaut exakt aus der Admin-Konfiguration */}
                              <span className="text-[#c9d4e4] text-sm leading-relaxed">
                                {consent.checkboxText}
                              </span>
                              {!consent.isRequired && (
                                <span className="ml-2 text-[#5b6b7f] text-xs">(optional)</span>
                              )}
                              {consent.accepted && consent.acceptedAt && (
                                <span className="block mt-1 text-[#22c55e] text-xs">
                                  Bestätigt am{" "}
                                  {new Date(consent.acceptedAt).toLocaleString("de-DE", {
                                    day: "2-digit",
                                    month: "2-digit",
                                    year: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}{" "}
                                  Uhr
                                </span>
                              )}
                            </span>
                          </label>
                        </div>
                      );
                    })}
                  </div>

                  <div className="px-5 py-4 border-t border-[#12203a] bg-[#070d15]">
                    {state.allRequiredConfirmed ? (
                      <p className="text-[#22c55e] text-sm font-semibold flex items-center gap-2">
                        <ShieldCheck size={16} />
                        Alle erforderlichen Erklärungen wurden protokolliert.
                      </p>
                    ) : (
                      <>
                        {error && (
                          <div className="mb-3 px-3 py-2.5 rounded-lg bg-[rgba(239,68,68,0.1)] border border-[#ef4444]/25">
                            <p className="text-[#fca5a5] text-xs">{error}</p>
                            {missing.length > 0 && (
                              <ul className="mt-1.5 text-[#fca5a5] text-xs list-disc list-inside">
                                {missing.map((m) => (
                                  <li key={m}>{m}</li>
                                ))}
                              </ul>
                            )}
                          </div>
                        )}
                        <button
                          onClick={handleConfirm}
                          disabled={!canSubmit || submitting}
                          className="w-full px-6 py-3 rounded-lg bg-[#00b8ff] text-[#041018] text-sm font-bold disabled:bg-[#16283d] disabled:text-[#4a5a70] disabled:cursor-not-allowed hover:bg-[#0099d6] transition-colors flex items-center justify-center gap-2"
                        >
                          {submitting && <Loader2 size={15} className="animate-spin" />}
                          Verbindlich bestätigen
                        </button>
                        <p className="mt-2.5 text-[#5b6b7f] text-xs">
                          Der Zeitpunkt Ihrer Bestätigung wird serverseitig protokolliert.
                        </p>
                      </>
                    )}
                  </div>
                </Card>
              )}

              {state.allRequiredConfirmed && !state.isPaid && (
                <Card>
                  <div className="px-5 py-4">
                    <h2 className="text-[#eef2f7] text-sm font-bold mb-1.5">
                      Vertragsaufzeichnung
                    </h2>
                    <p className="text-[#8899b4] text-xs leading-relaxed">
                      {state.recordingActive
                        ? "Die Aufzeichnung läuft. Ihr Berater führt Sie durch die verbindliche Annahme."
                        : state.recordingArchived
                          ? "Die Aufzeichnung wurde beendet und revisionssicher archiviert."
                          : "Ihr Berater startet die Aufzeichnung, sobald Sie bereit sind."}
                    </p>
                  </div>
                </Card>
              )}

              {state.invoice && (
                <Card>
                  <CardHead title={`Rechnung ${state.invoice.number}`} />
                  <div className="px-5 py-4 space-y-2.5">
                    <Row label="Gesamtbetrag" value={state.invoice.grossTotal} strong />
                    {state.invoice.dueDate && (
                      <Row
                        label="Fällig bis"
                        value={new Date(state.invoice.dueDate).toLocaleDateString("de-DE")}
                      />
                    )}
                    <Row
                      label="Status"
                      value={state.invoice.status === "paid" ? "Bezahlt" : "Offen"}
                    />
                    <p className="text-[#5b6b7f] text-xs pt-1">
                      Die Rechnung finden Sie nach der Freischaltung jederzeit in Ihrem
                      Kundenportal unter &bdquo;Dokumente&ldquo;.
                    </p>
                  </div>
                </Card>
              )}
            </aside>
          )}
        </div>
      </main>

      <footer className="border-t border-[#12203a] py-4">
        <p className="text-center text-[#3f4d63] text-xs">
          Sicheres Gespräch · Powered by OKUN Systems
        </p>
      </footer>

      {offerOpen && <PdfViewer url={offerPdfUrl} title="Angebot" onClose={() => setOfferOpen(false)} />}
    </div>
  );
}

/** Schrittanzeige: eine Zeile statt sechs Kacheln. */
function CompactSteps({ active }: { active: number }) {
  return (
    <div className="flex items-center gap-2.5 flex-shrink-0">
      <div className="flex items-center gap-1" aria-hidden>
        {STEPS.map((step, index) => (
          <span
            key={step.key}
            title={step.label}
            className={`h-1 rounded-full transition-all ${
              index < active
                ? "w-4 bg-[#22c55e]"
                : index === active
                  ? "w-7 bg-[#00b8ff]"
                  : "w-4 bg-[#16283d]"
            }`}
          />
        ))}
      </div>
      <span className="text-xs text-[#8899b4] whitespace-nowrap">
        <span className="text-[#eef2f7] font-semibold">{STEPS[active]?.label}</span>
        <span className="text-[#3f4d63]"> · {active + 1}/{STEPS.length}</span>
      </span>
    </div>
  );
}

/** Wartezustand vor dem Beitritt — zeigt, ob der Berater schon da ist. */
function WaitingRoom({
  advisorPresent,
  appointmentStart,
  closerName,
  onJoin,
}: {
  advisorPresent: boolean;
  appointmentStart: string | null;
  closerName: string | null;
  onJoin: () => void;
}) {
  return (
    <Card>
      <div className="px-6 py-14 text-center">
        <div className="relative w-14 h-14 mx-auto mb-4">
          <span
            className={`absolute inset-0 rounded-full ${
              advisorPresent ? "bg-[#00b8ff]/20 animate-ping" : "bg-[#16283d] animate-pulse"
            }`}
          />
          <span className="absolute inset-0 rounded-full bg-[#0c1520] border border-[#1a2840] flex items-center justify-center">
            <Video size={20} className={advisorPresent ? "text-[#00b8ff]" : "text-[#5b6b7f]"} />
          </span>
        </div>

        <h2 className="text-[#eef2f7] text-base font-bold mb-1.5">
          {advisorPresent
            ? `${closerName ?? "Ihr Berater"} wartet im Gespräch auf Sie`
            : "Gleich geht es los"}
        </h2>
        <p className="text-[#8899b4] text-sm max-w-sm mx-auto">
          {advisorPresent
            ? "Sie können jetzt beitreten. Ihr Browser fragt anschließend nach Kamera und Mikrofon."
            : appointmentStart
              ? `Ihr Termin beginnt um ${new Date(appointmentStart).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} Uhr. Sobald Ihr Berater den Raum betritt, erscheint das hier.`
              : "Sobald Ihr Berater den Raum betritt, erscheint das hier."}
        </p>

        <button
          onClick={onJoin}
          className={`mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-colors ${
            advisorPresent
              ? "bg-[#00b8ff] text-[#041018] hover:bg-[#0099d6]"
              : "border border-[#16283d] text-[#8899b4] hover:text-[#eef2f7] hover:border-[#2a3a55]"
          }`}
        >
          <Video size={15} />
          {advisorPresent ? "Gespräch beitreten" : "Schon jetzt beitreten"}
        </button>
      </div>
    </Card>
  );
}

/**
 * PDF im Overlay — immer eine ganze Seite im Bild, geblättert wird seitenweise.
 * Ein eingebetteter Browser-Viewer zoomt nach eigenem Gutdünken hinein; das
 * hilft niemandem, der ein Angebot überblicken will.
 */
export function PdfViewer({
  url,
  title,
  onClose,
}: {
  url: string;
  title: string;
  onClose: () => void;
}) {
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") setPage((p) => Math.min(p + 1, pageCount));
      if (e.key === "ArrowLeft") setPage((p) => Math.max(p - 1, 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, pageCount]);

  return (
    <div className="fixed inset-0 z-50 bg-[#04070c]/95 backdrop-blur-sm flex flex-col p-3 sm:p-6">
      <div className="flex items-center justify-between gap-3 mb-3">
        <p className="text-[#eef2f7] text-sm font-semibold">{title}</p>
        <div className="flex items-center gap-2">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#16283d] text-[#8899b4] text-xs hover:text-[#eef2f7] transition-colors"
          >
            <ExternalLink size={12} /> In neuem Tab
          </a>
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#16283d] text-[#8899b4] text-xs hover:text-[#eef2f7] transition-colors"
          >
            <X size={12} /> Schließen
          </button>
        </div>
      </div>

      <PdfPage
        src={url}
        page={page}
        onDocumentLoad={setPageCount}
        className="flex-1 min-h-0 rounded-xl bg-[#0a111c] border border-[#12203a]"
      />

      <div className="mt-3 flex items-center justify-center gap-3">
        <button
          onClick={() => setPage((p) => Math.max(p - 1, 1))}
          disabled={page <= 1}
          className="px-4 py-2 rounded-lg border border-[#16283d] text-[#8899b4] text-xs hover:text-[#eef2f7] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          Zurück
        </button>
        <span className="text-[#8899b4] text-xs tabular-nums">
          Seite {Math.min(page, pageCount)} von {pageCount}
        </span>
        <button
          onClick={() => setPage((p) => Math.min(p + 1, pageCount))}
          disabled={page >= pageCount}
          className="px-4 py-2 rounded-lg border border-[#16283d] text-[#8899b4] text-xs hover:text-[#eef2f7] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          Weiter
        </button>
      </div>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-[#12203a] bg-[#0a111c] overflow-hidden">
      {children}
    </section>
  );
}

function CardHead({
  title,
  subtitle,
  meta,
}: {
  title: string;
  subtitle?: string;
  meta?: string;
}) {
  return (
    <div className="px-5 py-3.5 border-b border-[#12203a] flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-[#eef2f7] text-sm font-bold">{title}</h2>
        {subtitle && <p className="text-[#8899b4] text-xs mt-1">{subtitle}</p>}
      </div>
      {meta && <span className="text-[#5b6b7f] text-xs font-mono flex-shrink-0">{meta}</span>}
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-[#8899b4] text-sm">{label}</span>
      <span
        className={`text-right ${strong ? "text-[#eef2f7] text-sm font-bold" : "text-[#c9d4e4] text-sm"}`}
      >
        {value}
      </span>
    </div>
  );
}
