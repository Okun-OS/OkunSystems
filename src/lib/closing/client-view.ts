import { db } from "@/lib/db";
import { formatCents } from "@/lib/money";
import { evaluateConsentState } from "./consent";
import { resolveLiveConsents } from "./consent-resolver";
import { getSnapshotData, type ContractSnapshotData } from "./snapshot";
import { normalizeStatus, type ClosingStatus } from "./state-machine";
import { RECURRING_INTERVAL_LABELS } from "./scripts";

/**
 * Aufbereiteter Datenstand für die Kundenseite.
 *
 * Es werden ausschließlich Informationen ausgeliefert, die der Kunde sehen
 * darf: Angebot, erforderliche Erklärungen samt Dokumentbezeichnung und
 * Version, Statusinformationen. Weder R2-Schlüssel noch Recording-Pfade noch
 * interne IDs anderer Kunden verlassen den Server.
 */

export type ClientConsentItem = {
  definitionId: string;
  title: string;
  checkboxText: string;
  consentType: string;
  isRequired: boolean;
  accepted: boolean;
  acceptedAt: string | null;
  document: {
    versionId: string;
    name: string;
    versionLabel: string;
    openable: boolean;
  } | null;
};

/** Folie, die der Berater dem Kunden gerade zeigt. */
export type ClientPresentation = {
  title: string;
  slideCount: number;
  position: number;
  slideId: string;
  slideTitle: string | null;
  /** image/* wird als Folie dargestellt, application/pdf als Dokument. */
  mimeType: string;
};

export type ClientClosingState = {
  sessionId: string;
  status: ClosingStatus;
  companyName: string;
  closerName: string | null;
  contactName: string | null;
  meetingUrl: string | null;
  appointmentStart: string | null;
  /** Der Berater ist im Videoraum (Heartbeat jünger als ADVISOR_PRESENCE_TTL_MS). */
  advisorPresent: boolean;
  presentation: ClientPresentation | null;
  snapshotReady: boolean;
  offer: {
    packageName: string | null;
    offerNumber: string | null;
    oneTimeNet: string;
    oneTimeVat: string;
    oneTimeGross: string;
    vatRateLabel: string;
    recurring: string | null;
    recurringInterval: string | null;
    minimumTermMonths: number | null;
    paymentTerms: string | null;
    extras: Array<{ description: string; amount: string }>;
    validUntil: string | null;
  } | null;
  /** Das Angebot kann als PDF geöffnet werden. */
  offerPdfAvailable: boolean;
  consents: ClientConsentItem[];
  allRequiredConfirmed: boolean;
  recordingConsentConfirmed: boolean;
  recordingActive: boolean;
  recordingArchived: boolean;
  certificateAvailable: boolean;
  invoice: {
    number: string;
    grossTotal: string;
    dueDate: string | null;
    status: string;
  } | null;
  paymentMethod: string | null;
  isPaid: boolean;
  isActivated: boolean;
};

/**
 * Wie lange der letzte Heartbeat des Beraters als „anwesend" gilt. Der
 * Berater-Arbeitsplatz meldet sich alle 30 Sekunden; ein abgestürzter Tab
 * lässt den Status damit nach spätestens 90 Sekunden verfallen.
 */
export const ADVISOR_PRESENCE_TTL_MS = 90_000;

export async function buildClientClosingState(
  closingSessionId: string
): Promise<ClientClosingState | null> {
  const session = await db.closingSession.findUnique({
    where: { id: closingSessionId },
    include: {
      company: {
        select: {
          name: true,
          contactFirstName: true,
          contactLastName: true,
          activatedAt: true,
        },
      },
      closer: { select: { name: true } },
      appointment: { select: { startTime: true, meetingUrl: true, bookedByName: true } },
      recordings: { orderBy: { createdAt: "desc" }, take: 1 },
      certificates: { orderBy: { version: "desc" }, take: 1 },
      invoices: {
        where: { finalizedAt: { not: null } },
        orderBy: { finalizedAt: "desc" },
        take: 1,
      },
    },
  });
  if (!session) return null;

  const status = normalizeStatus(session.status);
  const data: ContractSnapshotData | null = await getSnapshotData(closingSessionId);

  let consents: ClientConsentItem[] = [];
  let allRequiredConfirmed = false;
  let recordingConsentConfirmed = false;

  if (data) {
    const state = await evaluateConsentState(closingSessionId);
    allRequiredConfirmed = state.allRequiredConfirmed;
    recordingConsentConfirmed = state.recordingConsentConfirmed;
    consents = state.consents.map((c) => ({
      definitionId: c.definitionId,
      title: c.title,
      checkboxText: c.checkboxText,
      consentType: c.consentType,
      isRequired: c.isRequired,
      accepted: c.accepted,
      acceptedAt: c.acceptedAt ? c.acceptedAt.toISOString() : null,
      document: c.document
        ? {
            versionId: c.document.versionId,
            name: c.document.name,
            versionLabel: c.document.versionLabel,
            openable: c.document.hasFile || c.document.hasInlineContent,
          }
        : null,
    }));
  } else if (status === "offer_presented" || status === "agreement_reached") {
    // Vorschau vor dem Einfrieren: der Kunde sieht bereits, was verlangt wird.
    const offer = session.activeOfferId
      ? await db.offer.findUnique({
          where: { id: session.activeOfferId },
          select: { packageType: true, template: { select: { packageType: true } } },
        })
      : null;
    const live = await resolveLiveConsents(
      offer?.packageType ?? offer?.template?.packageType ?? null
    );
    consents = live.consents.map((c) => ({
      definitionId: c.definitionId,
      title: c.title,
      checkboxText: c.checkboxText,
      consentType: c.consentType,
      isRequired: c.isRequired,
      accepted: false,
      acceptedAt: null,
      document: c.document
        ? {
            versionId: c.document.versionId,
            name: c.document.name,
            versionLabel: c.document.versionLabel,
            openable: c.document.hasFile || c.document.hasInlineContent,
          }
        : null,
    }));
  }

  const currency = data?.offer?.currency ?? "EUR";
  const recording = session.recordings[0] ?? null;
  const invoice = session.invoices[0] ?? null;

  let offer: ClientClosingState["offer"] = null;
  if (data?.offer) {
    offer = {
      packageName: data.offer.packageName ?? data.offer.packageType,
      offerNumber: data.offer.offerNumber,
      oneTimeNet: formatCents(data.offer.oneTimeNetCents, currency),
      oneTimeVat: formatCents(data.offer.oneTimeVatCents, currency),
      oneTimeGross: formatCents(data.offer.oneTimeGrossCents, currency),
      vatRateLabel: `${(data.offer.vatRateBp / 100).toLocaleString("de-DE", { maximumFractionDigits: 2 })} %`,
      recurring:
        data.offer.recurringNetCents && data.offer.recurringNetCents > 0
          ? formatCents(data.offer.recurringNetCents, currency)
          : null,
      recurringInterval:
        RECURRING_INTERVAL_LABELS[data.offer.recurringInterval ?? ""] ?? null,
      minimumTermMonths: data.offer.minimumTermMonths,
      paymentTerms: data.payment?.terms ?? null,
      extras: (data.offer.extras ?? []).map((e) => ({
        description: e.description,
        amount: formatCents(e.netCents, currency),
      })),
      validUntil: data.offer.validUntil,
    };
  } else if (session.activeOfferId) {
    const raw = await db.offer.findUnique({
      where: { id: session.activeOfferId },
      include: { template: { select: { name: true } } },
    });
    if (raw) {
      const vatRateBp = raw.vatRateBp ?? 1900;
      const vat = Math.round((raw.priceNet * vatRateBp) / 10000);
      offer = {
        packageName: raw.template?.name ?? raw.packageType,
        offerNumber: raw.offerNumber,
        oneTimeNet: formatCents(raw.priceNet, raw.currency),
        oneTimeVat: formatCents(vat, raw.currency),
        oneTimeGross: formatCents(raw.priceNet + vat, raw.currency),
        vatRateLabel: `${(vatRateBp / 100).toLocaleString("de-DE", { maximumFractionDigits: 2 })} %`,
        recurring:
          raw.recurringNetCents && raw.recurringNetCents > 0
            ? formatCents(raw.recurringNetCents, raw.currency)
            : null,
        recurringInterval: RECURRING_INTERVAL_LABELS[raw.recurringInterval ?? ""] ?? null,
        minimumTermMonths: raw.minimumTermMonths,
        paymentTerms: raw.paymentTerms,
        extras: [],
        validUntil: raw.validUntil ? raw.validUntil.toISOString() : null,
      };
    }
  }

  const advisorPresent = Boolean(
    session.advisorPresenceAt &&
      Date.now() - session.advisorPresenceAt.getTime() < ADVISOR_PRESENCE_TTL_MS
  );

  const presentation = await resolveLivePresentation(
    session.livePresentationId,
    session.liveSlidePosition
  );

  // Das PDF entsteht entweder aus einer hinterlegten Paket-Datei oder aus der
  // Vorlage „Angebot". Ohne Angebotsdaten gibt es nichts zu zeigen.
  const offerPdfAvailable =
    Boolean(offer) &&
    (await db.documentTemplate.count({ where: { type: "offer", isActive: true } })) > 0;

  return {
    sessionId: session.id,
    status,
    companyName: session.company.name,
    closerName: session.closer.name,
    contactName:
      [session.company.contactFirstName, session.company.contactLastName]
        .filter(Boolean)
        .join(" ") ||
      session.appointment?.bookedByName ||
      null,
    meetingUrl: session.appointment?.meetingUrl ?? null,
    appointmentStart: session.appointment?.startTime.toISOString() ?? null,
    advisorPresent,
    presentation,
    snapshotReady: Boolean(data),
    offer,
    offerPdfAvailable,
    consents,
    allRequiredConfirmed,
    recordingConsentConfirmed,
    recordingActive: recording?.status === "recording",
    recordingArchived: recording?.status === "archived",
    certificateAvailable: session.certificates.length > 0,
    invoice: invoice
      ? {
          number: invoice.invoiceNumber,
          grossTotal: formatCents(
            invoice.grossTotalCents ?? invoice.grossAmount,
            invoice.currency
          ),
          dueDate: invoice.dueDate.toISOString(),
          status: invoice.status,
        }
      : null,
    paymentMethod: session.paymentMethod,
    isPaid: status === "paid" || status === "customer_activated",
    isActivated: Boolean(session.company.activatedAt),
  };
}

/**
 * Die Folie, die der Berater gerade zeigt.
 *
 * Ausgeliefert werden nur Folien einer freigegebenen Präsentation. Der
 * R2-Schlüssel bleibt auf dem Server; der Kunde erhält lediglich die Folien-ID
 * und holt sich die Datei über eine kurzlebige Signed URL.
 */
async function resolveLivePresentation(
  presentationId: string | null,
  position: number | null
): Promise<ClientPresentation | null> {
  if (!presentationId) return null;

  const presentation = await db.closingPresentation.findUnique({
    where: { id: presentationId },
    select: {
      title: true,
      status: true,
      slides: {
        orderBy: { position: "asc" },
        select: { id: true, position: true, title: true, mimeType: true },
      },
    },
  });
  if (!presentation || presentation.status !== "approved") return null;
  if (presentation.slides.length === 0) return null;

  const wanted = position ?? presentation.slides[0].position;
  const slide =
    presentation.slides.find((s) => s.position === wanted) ?? presentation.slides[0];

  return {
    title: presentation.title,
    slideCount: presentation.slides.length,
    position: slide.position,
    slideId: slide.id,
    slideTitle: slide.title,
    mimeType: slide.mimeType,
  };
}
