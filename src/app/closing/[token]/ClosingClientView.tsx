"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Video, VideoOff, FileText, ExternalLink } from "lucide-react";

type Offer = {
  id: string;
  priceNet: number;
  currency: string;
  validUntil: Date | null;
  status: string;
  acceptedAt: Date | null;
  template: { name: string; description: string | null; r2Key: string | null } | null;
};

type LegalDoc = {
  id: string;
  title: string;
  type: string;
  version: string;
  isRequired: boolean;
};

type ConsentRecord = {
  id: string;
  legalDocumentId: string;
  consentType: string;
  agreementAt: Date | null;
};

type Session = {
  id: string;
  status: string;
  company: { name: string };
  closer: { name: string | null };
  appointment: {
    startTime: Date;
    endTime: Date | null;
    bookedByName: string | null;
    meetingUrl: string | null;
  } | null;
  activeOffer: Offer | null;
  legalDocuments: LegalDoc[];
  consentRecords: ConsentRecord[];
};

type Props = { session: Session; token: string };

const STATUS_ORDER = [
  "closing_scheduled",
  "in_progress",
  "offer_presented",
  "agreement_reached",
  "consent_given",
  "contract_closed",
  "payment_pending",
];

function fmtEur(cents: number) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(cents / 100);
}
function fmtDate(d: Date) {
  return new Date(d).toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" });
}
function fmtTime(d: Date) {
  return new Date(d).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
}

export function ClosingClientView({ session: s, token }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [paying, startPay] = useTransition();
  const [callActive, setCallActive] = useState(false);
  const [consented, setConsented] = useState<Set<string>>(
    new Set(s.consentRecords.map((r) => r.legalDocumentId))
  );
  const [consentPending, setConsentPending] = useState<string | null>(null);

  const paymentResult = searchParams.get("payment");
  const isPaid = s.activeOffer?.status === "accepted";
  const statusIdx = STATUS_ORDER.indexOf(s.status);
  const isWaiting = statusIdx < 1; // closing_scheduled
  const offerVisible = statusIdx >= 2 && s.activeOffer !== null;
  const paymentReady = s.status === "contract_closed" && !isPaid;
  const paymentPending = s.status === "payment_pending";
  const canJoinCall = !!s.appointment?.meetingUrl && statusIdx >= 1 && !isPaid;

  const requiredDocs = s.legalDocuments.filter((d) => d.isRequired);
  const allRequiredConsented = requiredDocs.every((d) => consented.has(d.id));
  const showConsentForm = paymentReady && s.legalDocuments.length > 0;

  useEffect(() => {
    if (isPaid || s.status === "verloren") return;
    const id = setInterval(() => router.refresh(), 20_000);
    return () => clearInterval(id);
  }, [isPaid, s.status, router]);

  async function handleConsent(doc: LegalDoc) {
    if (consented.has(doc.id) || consentPending) return;
    setConsentPending(doc.id);
    try {
      const grossCents = s.activeOffer ? Math.round(s.activeOffer.priceNet * 1.19) : 0;
      const res = await fetch("/api/closing/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          legalDocumentId: doc.id,
          consentType: doc.type,
          displayedPriceCents: grossCents,
        }),
      });
      if (res.ok) {
        setConsented((prev) => new Set([...prev, doc.id]));
      }
    } finally {
      setConsentPending(null);
    }
  }

  async function handlePay() {
    startPay(async () => {
      const res = await fetch("/api/stripe/client-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error ?? "Fehler beim Starten der Zahlung");
      }
    });
  }

  return (
    <>
      {/* Floating video call — stays mounted so call doesn't drop */}
      {callActive && s.appointment?.meetingUrl && (
        <div className="fixed bottom-4 right-4 z-50 w-[340px] h-[240px] flex flex-col rounded-xl overflow-hidden shadow-2xl border border-[#1a2840] bg-[#080d14]">
          <div className="flex items-center justify-between px-3 py-1.5 bg-[#0c1520] border-b border-[#1a2840]">
            <span className="text-xs text-[#888] font-medium">Video-Gespräch</span>
            <button
              onClick={() => setCallActive(false)}
              className="text-xs text-[#666] hover:text-[#f0f0f0] transition-colors px-1"
            >
              ✕
            </button>
          </div>
          <iframe
            src={s.appointment.meetingUrl}
            allow="camera; microphone; fullscreen; display-capture; screen-wake-lock"
            className="w-full flex-1 border-0"
            title="Gespräch"
          />
        </div>
      )}

      <div className="min-h-screen bg-[#080d14] text-[#f0f0f0] p-4 flex flex-col items-center justify-start pt-12 pb-16">
        <div className="max-w-xl w-full space-y-5">

          {/* Logo */}
          <div className="text-center mb-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/okun-logo.png"
              alt="OKUN Systems"
              className="h-8 mx-auto"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
          </div>

          {/* Join call banner */}
          {canJoinCall && (
            <div className="rounded-2xl bg-[rgba(0,184,255,0.05)] border border-[rgba(0,184,255,0.2)] p-4 flex items-center justify-between gap-4">
              <div className="text-sm text-[#aaa]">
                Ihr Berater wartet im Video-Gespräch auf Sie.
              </div>
              <button
                onClick={() => setCallActive((v) => !v)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex-shrink-0 ${
                  callActive
                    ? "bg-[rgba(239,68,68,0.15)] text-[#ef4444] border border-[rgba(239,68,68,0.3)]"
                    : "bg-[#00b8ff] text-black hover:bg-[#0099dd]"
                }`}
              >
                {callActive ? <VideoOff size={13} /> : <Video size={13} />}
                {callActive ? "Verlassen" : "Beitreten"}
              </button>
            </div>
          )}

          {/* Payment success banner */}
          {(paymentResult === "success" || isPaid) && (
            <div className="rounded-2xl bg-[rgba(34,197,94,0.08)] border border-[rgba(34,197,94,0.2)] p-6 text-center">
              <div className="text-4xl mb-3">✅</div>
              <h2 className="text-lg font-bold text-[#22c55e] mb-2">Zahlung erfolgreich</h2>
              <p className="text-sm text-[#888]">
                Vielen Dank! Wir haben Ihre Zahlung erhalten und Ihr Konto wird in Kürze aktiviert.
                Sie erhalten eine Bestätigung per E-Mail.
              </p>
            </div>
          )}

          {/* Payment cancelled banner */}
          {paymentResult === "cancelled" && !isPaid && (
            <div className="rounded-2xl bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.2)] p-5 text-center">
              <p className="text-sm text-[#ef4444]">Zahlung abgebrochen. Sie können es jederzeit erneut versuchen.</p>
            </div>
          )}

          {/* Session info card */}
          <div className="rounded-2xl bg-[#0c1520] border border-[#1a2840] p-6 space-y-4">
            <div className="text-xs font-medium text-[#444] uppercase tracking-widest">Gesprächsdetails</div>

            <div className="space-y-3">
              <Row icon="🏢" label="Unternehmen" value={s.company.name} />
              {s.closer.name && <Row icon="👤" label="Ihr Berater" value={s.closer.name} />}
              {s.appointment && (
                <Row
                  icon="📅"
                  label="Termin"
                  value={fmtDate(s.appointment.startTime)}
                  sub={fmtTime(s.appointment.startTime) + " Uhr"}
                />
              )}
            </div>

            <StatusPill status={s.status} isPaid={isPaid} />
          </div>

          {/* Offer card */}
          {offerVisible && s.activeOffer && !isPaid && (
            <OfferCard offer={s.activeOffer} token={token} />
          )}

          {/* Consent form — shown when contract is ready for payment */}
          {showConsentForm && !isPaid && (
            <div className="rounded-2xl bg-[#0c1520] border border-[#1a2840] p-6 space-y-4">
              <div className="text-xs font-medium text-[#444] uppercase tracking-widest">Einwilligungen</div>
              <p className="text-sm text-[#888]">
                Bitte bestätigen Sie die folgenden Dokumente, um den Vertrag abzuschließen.
              </p>
              <div className="space-y-3">
                {s.legalDocuments.map((doc) => {
                  const checked = consented.has(doc.id);
                  const loading = consentPending === doc.id;
                  return (
                    <label
                      key={doc.id}
                      className={`flex items-start gap-3 cursor-pointer group ${loading ? "opacity-60" : ""}`}
                      onClick={() => !checked && handleConsent(doc)}
                    >
                      <div
                        className={`mt-0.5 w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border transition-colors ${
                          checked
                            ? "bg-[#22c55e] border-[#22c55e]"
                            : "border-[#2a3a50] group-hover:border-[#00b8ff]"
                        }`}
                      >
                        {checked && (
                          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                            <path d="M1 4L3.5 6.5L9 1" stroke="black" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>
                      <span className="text-sm text-[#ccc] leading-tight">
                        Ich akzeptiere die{" "}
                        <span className="text-[#00b8ff] font-medium">{doc.title}</span>
                        {doc.isRequired && <span className="text-[#ef4444] ml-0.5">*</span>}
                        <span className="text-[#555] text-xs ml-1">v{doc.version}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
              {requiredDocs.length > 0 && (
                <p className="text-xs text-[#444]">* Pflichtfeld</p>
              )}
            </div>
          )}

          {/* Consent records summary (already given) */}
          {s.consentRecords.length > 0 && isPaid && (
            <div className="rounded-2xl bg-[#0c1520] border border-[#1a2840] p-6 space-y-3">
              <div className="text-xs font-medium text-[#444] uppercase tracking-widest">Ihre Einwilligungen</div>
              {s.consentRecords.map((cr) => {
                const doc = s.legalDocuments.find((d) => d.id === cr.legalDocumentId);
                return (
                  <div key={cr.id} className="flex items-center gap-3 text-sm">
                    <span className="text-[#22c55e] flex-shrink-0">✓</span>
                    <span className="text-[#ccc]">{doc?.title ?? cr.consentType}</span>
                    <span className="ml-auto text-[#444] text-xs">
                      {cr.agreementAt ? fmtDate(new Date(cr.agreementAt)) : "—"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Payment CTA */}
          {paymentReady && s.activeOffer && (
            <div className="rounded-2xl bg-[#0c1520] border border-[rgba(0,184,255,0.2)] p-6 space-y-4">
              <div className="text-xs font-medium text-[#444] uppercase tracking-widest">Vertragsabschluss</div>
              <p className="text-sm text-[#aaa]">
                Ihr Berater hat den Vertrag bestätigt. Schließen Sie Ihre Bestellung jetzt ab.
              </p>
              <div className="flex items-baseline justify-between mb-1">
                <span className="text-[#888] text-sm">Gesamtbetrag inkl. MwSt.</span>
                <span className="text-2xl font-bold text-[#f0f0f0]">
                  {fmtEur(Math.round(s.activeOffer.priceNet * 1.19))}
                </span>
              </div>
              {showConsentForm && !allRequiredConsented && (
                <p className="text-xs text-[#f59e0b]">
                  Bitte bestätigen Sie alle Pflichtdokumente um fortzufahren.
                </p>
              )}
              <button
                onClick={handlePay}
                disabled={paying || (showConsentForm && !allRequiredConsented)}
                className="w-full py-3 rounded-xl bg-[#00b8ff] hover:bg-[#0099dd] disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors"
              >
                {paying ? "Weiterleitung…" : "Jetzt bezahlen →"}
              </button>
              <p className="text-xs text-[#444] text-center">
                Sicher über Stripe · Kreditkarte oder SEPA-Lastschrift
              </p>
            </div>
          )}

          {/* Payment pending */}
          {paymentPending && !isPaid && (
            <div className="rounded-2xl bg-[#0c1520] border border-[#1a2840] p-6 text-center space-y-3">
              <div className="text-3xl">⏳</div>
              <p className="text-sm text-[#888]">Zahlung wird verarbeitet. Diese Seite aktualisiert sich automatisch.</p>
            </div>
          )}

          {/* Lost */}
          {s.status === "verloren" && (
            <div className="rounded-2xl bg-[#0c1520] border border-[#1a2840] p-6 text-center">
              <p className="text-sm text-[#666] leading-relaxed">
                Das Gespräch wurde beendet. Bei Fragen wenden Sie sich bitte an Ihren Berater.
              </p>
            </div>
          )}

          {isWaiting && !isPaid && (
            <div className="text-center">
              <p className="text-xs text-[#333]">Diese Seite aktualisiert sich automatisch alle 20 Sekunden.</p>
            </div>
          )}

          <div className="text-center pt-2">
            <p className="text-xs text-[#333]">
              OKUN Systems ·{" "}
              <a href="mailto:info@okun-systems.de" className="hover:text-[#555] transition-colors">
                info@okun-systems.de
              </a>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

function Row({ icon, label, value, sub }: { icon: string; label: string; value: string; sub?: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#0e1a28] text-base flex-shrink-0 mt-0.5">
        {icon}
      </div>
      <div>
        <div className="text-xs text-[#444] mb-0.5">{label}</div>
        <div className="text-sm font-medium text-[#f0f0f0]">{value}</div>
        {sub && <div className="text-xs text-[#888]">{sub}</div>}
      </div>
    </div>
  );
}

function StatusPill({ status, isPaid }: { status: string; isPaid: boolean }) {
  if (isPaid) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[rgba(34,197,94,0.1)] border border-[rgba(34,197,94,0.2)] text-[#22c55e] text-xs font-medium w-fit">
        <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e]" />
        Bezahlt & Aktiv
      </div>
    );
  }
  const map: Record<string, { label: string; color: string; bg: string; border: string; pulse: boolean }> = {
    closing_scheduled: { label: "Termin bestätigt", color: "#00b8ff", bg: "rgba(0,184,255,0.1)", border: "rgba(0,184,255,0.2)", pulse: false },
    in_progress: { label: "Gespräch läuft", color: "#00b8ff", bg: "rgba(0,184,255,0.1)", border: "rgba(0,184,255,0.2)", pulse: true },
    offer_presented: { label: "Angebot wurde unterbreitet", color: "#f59e0b", bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.2)", pulse: false },
    agreement_reached: { label: "Einigung erzielt", color: "#8b5cf6", bg: "rgba(139,92,246,0.1)", border: "rgba(139,92,246,0.2)", pulse: false },
    consent_given: { label: "Einwilligung erteilt", color: "#8b5cf6", bg: "rgba(139,92,246,0.1)", border: "rgba(139,92,246,0.2)", pulse: false },
    contract_closed: { label: "Vertrag bestätigt", color: "#22c55e", bg: "rgba(34,197,94,0.1)", border: "rgba(34,197,94,0.2)", pulse: false },
    payment_pending: { label: "Zahlung ausstehend", color: "#f59e0b", bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.2)", pulse: true },
    verloren: { label: "Gespräch beendet", color: "#666", bg: "rgba(102,102,102,0.1)", border: "rgba(102,102,102,0.2)", pulse: false },
  };
  const cfg = map[status] ?? map.closing_scheduled;
  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium w-fit"
      style={{ color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}` }}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${cfg.pulse ? "animate-pulse" : ""}`}
        style={{ background: cfg.color }}
      />
      {cfg.label}
    </div>
  );
}

function OfferCard({ offer, token }: { offer: Offer; token: string }) {
  const grossCents = Math.round(offer.priceNet * 1.19);
  const netCents = offer.priceNet;
  const mwst = grossCents - netCents;

  return (
    <div className="rounded-2xl bg-[#0c1520] border border-[rgba(245,158,11,0.25)] p-6 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs font-medium text-[#444] uppercase tracking-widest mb-1">Ihr Angebot</div>
          <h3 className="text-base font-bold text-[#f0f0f0]">
            {offer.template?.name ?? "OKUN Systems Paket"}
          </h3>
          {offer.template?.description && (
            <p className="text-sm text-[#888] mt-1 leading-relaxed">{offer.template.description}</p>
          )}
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-2xl font-bold text-[#f0f0f0]">{fmtEur(grossCents)}</div>
          <div className="text-xs text-[#555]">inkl. MwSt.</div>
        </div>
      </div>

      <div className="border-t border-[#1a2840] pt-4 space-y-1.5 text-sm">
        <div className="flex justify-between text-[#888]">
          <span>Nettobetrag</span>
          <span>{fmtEur(netCents)}</span>
        </div>
        <div className="flex justify-between text-[#888]">
          <span>MwSt. 19%</span>
          <span>{fmtEur(mwst)}</span>
        </div>
        <div className="flex justify-between font-semibold text-[#f0f0f0]">
          <span>Gesamt</span>
          <span>{fmtEur(grossCents)}</span>
        </div>
      </div>

      {offer.template?.r2Key && (
        <a
          href={`/api/closing/offer-pdf?token=${encodeURIComponent(token)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-sm text-[#00b8ff] hover:text-[#0099dd] transition-colors"
        >
          <FileText size={14} />
          Angebot als PDF ansehen
          <ExternalLink size={11} className="opacity-60" />
        </a>
      )}

      {offer.validUntil && (
        <div className="text-xs text-[#555] text-right">
          Gültig bis: {fmtDate(new Date(offer.validUntil))}
        </div>
      )}
    </div>
  );
}
