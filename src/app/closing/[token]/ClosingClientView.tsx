"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  CircleDot,
  ExternalLink,
  FileText,
  Loader2,
  Lock,
  Radio,
  ShieldCheck,
  Video,
} from "lucide-react";
import { OkunLogo } from "@/components/layout/okun-logo";
import type { ClientClosingState } from "@/lib/closing/client-view";

/**
 * Kundenseite des Closings.
 *
 * Ablauf: Angebot → Vertragsunterlagen → Bestätigen → Vertragsaufzeichnung →
 * Zahlung → Abschluss.
 *
 * Sämtliche Checkbox-Texte — einschließlich der Einwilligung in die
 * Vertragsaufzeichnung — stammen aus der Admin-Konfiguration und werden hier
 * nur angezeigt. Im Code steht keine dieser Formulierungen.
 */

type Props = { initialState: ClientClosingState; token: string };

const STEPS = [
  { key: "offer", label: "Angebot" },
  { key: "documents", label: "Vertragsunterlagen" },
  { key: "confirm", label: "Bestätigen" },
  { key: "recording", label: "Vertragsaufzeichnung" },
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
  if (state.offer) return 1;
  return 0;
}

export function ClosingClientView({ initialState, token }: Props) {
  const [state, setState] = useState(initialState);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [missing, setMissing] = useState<string[]>([]);
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

  useEffect(() => {
    const interval = state.isActivated ? 60_000 : 8_000;
    pollRef.current = setInterval(refresh, interval);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [refresh, state.isActivated]);

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

  return (
    <div className="min-h-screen bg-[#080c14]">
      {state.recordingActive && (
        <div className="sticky top-0 z-30 bg-[#7f1d1d] border-b border-[#ef4444]/40">
          <div className="max-w-[900px] mx-auto px-6 py-2.5 flex items-center gap-2.5">
            <Radio size={15} className="text-[#fca5a5] animate-pulse-accent" />
            <span className="text-[#fee2e2] text-sm font-semibold">Aufzeichnung läuft</span>
            <span className="text-[#fca5a5] text-xs">
              Der Vertragsabschluss wird mit Ihrer Einwilligung aufgezeichnet.
            </span>
          </div>
        </div>
      )}

      <div className="max-w-[900px] mx-auto px-6 py-10">
        <header className="mb-10">
          <div className="flex items-start justify-between gap-6 mb-8">
            <OkunLogo size="sm" />
            <div className="text-right">
              <p className="text-[#eef2f7] text-sm font-semibold">{state.companyName}</p>
              {state.closerName && (
                <p className="text-[#8899b4] text-xs mt-0.5">Ihr Berater: {state.closerName}</p>
              )}
            </div>
          </div>

          <ol className="flex flex-wrap items-center gap-x-2 gap-y-2">
            {STEPS.map((step, index) => {
              const done = index < activeStep;
              const current = index === activeStep;
              return (
                <li key={step.key} className="flex items-center gap-2">
                  <span
                    className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border transition-colors ${
                      done
                        ? "border-[#22c55e]/30 bg-[rgba(34,197,94,0.1)] text-[#22c55e]"
                        : current
                          ? "border-[#00b8ff]/40 bg-[rgba(0,184,255,0.12)] text-[#00b8ff]"
                          : "border-[#1a2840] text-[#5b6b7f]"
                    }`}
                  >
                    {done ? <Check size={11} /> : <CircleDot size={11} />}
                    {step.label}
                  </span>
                  {index < STEPS.length - 1 && (
                    <span className="w-4 h-px bg-[#1a2840] hidden sm:block" />
                  )}
                </li>
              );
            })}
          </ol>
        </header>

        {state.meetingUrl && !state.isPaid && (
          <a
            href={state.meetingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 mb-6 px-5 py-4 rounded-xl bg-[#0c1520] border border-[#1a2840] hover:border-[#00b8ff]/40 transition-colors group"
          >
            <div className="w-9 h-9 rounded-lg bg-[rgba(0,184,255,0.12)] flex items-center justify-center">
              <Video size={16} className="text-[#00b8ff]" />
            </div>
            <div className="flex-1">
              <p className="text-[#eef2f7] text-sm font-semibold">Zum Videogespräch</p>
              <p className="text-[#8899b4] text-xs">
                Öffnet den Videoraum in einem neuen Fenster.
              </p>
            </div>
            <ExternalLink size={14} className="text-[#5b6b7f] group-hover:text-[#00b8ff]" />
          </a>
        )}

        {/* 1 — Angebot */}
        {state.offer ? (
          <section className="mb-6 rounded-xl bg-[#0c1520] border border-[#1a2840] overflow-hidden">
            <div className="px-6 py-4 border-b border-[#1a2840] flex items-center justify-between gap-4">
              <h2 className="text-[#eef2f7] text-sm font-bold">Ihr Angebot</h2>
              {state.offer.offerNumber && (
                <span className="text-[#5b6b7f] text-xs font-mono">
                  {state.offer.offerNumber}
                </span>
              )}
            </div>
            <div className="px-6 py-5 space-y-3">
              <Row label="Paket" value={state.offer.packageName ?? "—"} strong />
              <Row label="Einmalige Investition (netto)" value={state.offer.oneTimeNet} />
              <Row
                label={`zzgl. USt. ${state.offer.vatRateLabel}`}
                value={state.offer.oneTimeVat}
              />
              <Row label="Gesamtbetrag (brutto)" value={state.offer.oneTimeGross} strong />
              {state.offer.recurring && (
                <Row
                  label={`Laufende Kosten${state.offer.recurringInterval ? ` (${state.offer.recurringInterval})` : ""}`}
                  value={state.offer.recurring}
                />
              )}
              {state.offer.minimumTermMonths && (
                <Row label="Mindestlaufzeit" value={`${state.offer.minimumTermMonths} Monate`} />
              )}
              {state.offer.extras.length > 0 && (
                <div className="pt-2 border-t border-[#141f31]">
                  <p className="text-[#5b6b7f] text-xs uppercase tracking-wider mb-2">
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
          </section>
        ) : (
          <EmptyPanel
            icon={<Loader2 size={18} className="text-[#5b6b7f] animate-spin" />}
            title="Ihr Berater bereitet das Angebot vor"
            body="Sobald das Angebot freigegeben ist, erscheint es hier automatisch."
          />
        )}

        {/* 2 + 3 — Vertragsunterlagen und Bestätigung */}
        {state.consents.length > 0 && (
          <section className="mb-6 rounded-xl bg-[#0c1520] border border-[#1a2840] overflow-hidden">
            <div className="px-6 py-4 border-b border-[#1a2840]">
              <h2 className="text-[#eef2f7] text-sm font-bold">
                Vertragsunterlagen &amp; Erklärungen
              </h2>
              <p className="text-[#8899b4] text-xs mt-1">
                Bitte öffnen Sie die Unterlagen und bestätigen Sie die erforderlichen Erklärungen.
              </p>
            </div>

            <div className="divide-y divide-[#141f31]">
              {state.consents.map((consent) => {
                const isChecked = consent.accepted || checked.has(consent.definitionId);
                return (
                  <div key={consent.definitionId} className="px-6 py-4">
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
                            : "border-[#1a2840] text-[#5b6b7f] cursor-not-allowed"
                        }`}
                      >
                        <FileText size={12} />
                        {consent.document.name} Version {consent.document.versionLabel} öffnen
                      </a>
                    )}

                    <label
                      className={`flex items-start gap-3 ${
                        consent.accepted || !state.snapshotReady
                          ? "cursor-default"
                          : "cursor-pointer"
                      }`}
                    >
                      <span
                        className={`mt-0.5 w-[18px] h-[18px] rounded flex-shrink-0 border flex items-center justify-center transition-colors ${
                          isChecked
                            ? "bg-[#00b8ff] border-[#00b8ff]"
                            : "border-[#2a3a55] bg-[#0a1119]"
                        }`}
                      >
                        {isChecked && <Check size={12} className="text-[#041018]" strokeWidth={3} />}
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={isChecked}
                          disabled={consent.accepted || !state.snapshotReady || submitting}
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

            <div className="px-6 py-5 border-t border-[#1a2840] bg-[#0a1119]">
              {!state.snapshotReady ? (
                <p className="text-[#8899b4] text-xs flex items-center gap-2">
                  <Lock size={13} />
                  Ihr Berater startet den Vertragsabschluss gleich — danach können Sie
                  verbindlich bestätigen.
                </p>
              ) : state.allRequiredConfirmed ? (
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
                    className="w-full sm:w-auto px-6 py-3 rounded-lg bg-[#00b8ff] text-[#041018] text-sm font-bold disabled:bg-[#16283d] disabled:text-[#4a5a70] disabled:cursor-not-allowed hover:bg-[#0099d6] transition-colors flex items-center justify-center gap-2"
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
          </section>
        )}

        {/* 4 — Aufzeichnung */}
        {state.allRequiredConfirmed && !state.isPaid && (
          <section className="mb-6 rounded-xl bg-[#0c1520] border border-[#1a2840] px-6 py-5">
            <h2 className="text-[#eef2f7] text-sm font-bold mb-1.5">Vertragsaufzeichnung</h2>
            <p className="text-[#8899b4] text-xs leading-relaxed">
              {state.recordingActive
                ? "Die Aufzeichnung läuft. Ihr Berater führt Sie durch die verbindliche Annahme."
                : state.recordingArchived
                  ? "Die Aufzeichnung wurde beendet und revisionssicher archiviert."
                  : "Ihr Berater startet die Aufzeichnung, sobald Sie bereit sind."}
            </p>
          </section>
        )}

        {/* 5 — Zahlung */}
        {state.invoice && (
          <section className="mb-6 rounded-xl bg-[#0c1520] border border-[#1a2840] overflow-hidden">
            <div className="px-6 py-4 border-b border-[#1a2840]">
              <h2 className="text-[#eef2f7] text-sm font-bold">Rechnung {state.invoice.number}</h2>
            </div>
            <div className="px-6 py-5 space-y-3">
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
                Die Rechnung finden Sie nach der Freischaltung jederzeit in Ihrem Kundenportal
                unter &bdquo;Dokumente&ldquo;.
              </p>
            </div>
          </section>
        )}

        {/* 6 — Abschluss */}
        {state.isActivated && (
          <section className="rounded-xl bg-[rgba(34,197,94,0.06)] border border-[#22c55e]/25 px-6 py-6 text-center">
            <ShieldCheck size={26} className="text-[#22c55e] mx-auto mb-3" />
            <h2 className="text-[#eef2f7] text-base font-bold mb-1.5">
              Willkommen bei OKUN Systems
            </h2>
            <p className="text-[#8899b4] text-sm">
              Ihr Kundenzugang ist freigeschaltet. Alle Vertragsunterlagen finden Sie in Ihrem
              Portal unter &bdquo;Dokumente&ldquo;.
            </p>
          </section>
        )}
      </div>
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

function EmptyPanel({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <section className="mb-6 rounded-xl bg-[#0c1520] border border-[#1a2840] px-6 py-10 text-center">
      <div className="flex justify-center mb-3">{icon}</div>
      <p className="text-[#eef2f7] text-sm font-semibold">{title}</p>
      <p className="text-[#8899b4] text-xs mt-1">{body}</p>
    </section>
  );
}
