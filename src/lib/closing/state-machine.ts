/**
 * Serverseitige Statusmaschine des Closings.
 *
 * Reguläre Übergänge entstehen ausschließlich aus echten Events (Snapshot
 * erzeugt, Consents bestätigt, Aufzeichnung beendet, Zahlung bestätigt …).
 * Über das Admin-UI dürfen nur die Sonderstatus `lost` und `cancelled` — und
 * deren Rücknahme — gesetzt werden, jeweils mit Begründung.
 */

export const CLOSING_STATUSES = [
  "lead",
  "closing_scheduled",
  "closing_in_progress",
  "offer_presented",
  "agreement_reached",
  "consent_pending",
  "consents_confirmed",
  "recording",
  "recording_completed",
  "contract_closed",
  "payment_pending",
  "paid",
  "customer_activated",
  "lost",
  "cancelled",
] as const;

export type ClosingStatus = (typeof CLOSING_STATUSES)[number];

/** Status, die administrativ (mit Begründung) gesetzt werden dürfen. */
export const ADMIN_SETTABLE_STATUSES: ClosingStatus[] = ["lost", "cancelled"];

/** Aus diesen Status heraus ist ein Abbruch jederzeit möglich. */
const ABORTABLE: ClosingStatus[] = [
  "lead",
  "closing_scheduled",
  "closing_in_progress",
  "offer_presented",
  "agreement_reached",
  "consent_pending",
  "consents_confirmed",
  "recording",
  "recording_completed",
  "contract_closed",
  "payment_pending",
];

const FORWARD: Record<ClosingStatus, ClosingStatus[]> = {
  lead: ["closing_scheduled"],
  closing_scheduled: ["closing_in_progress"],
  closing_in_progress: ["offer_presented"],
  offer_presented: ["agreement_reached", "closing_in_progress"],
  agreement_reached: ["consent_pending", "offer_presented"],
  consent_pending: ["consents_confirmed"],
  consents_confirmed: ["recording", "contract_closed"],
  recording: ["recording_completed"],
  recording_completed: ["contract_closed"],
  contract_closed: ["payment_pending", "paid"],
  payment_pending: ["paid"],
  paid: ["customer_activated"],
  customer_activated: [],
  lost: ["lead"],
  cancelled: ["lead"],
};

export const STATUS_LABELS: Record<ClosingStatus, string> = {
  lead: "Lead",
  closing_scheduled: "Closing geplant",
  closing_in_progress: "Closing läuft",
  offer_presented: "Angebot präsentiert",
  agreement_reached: "Einigung erzielt",
  consent_pending: "Bestätigung ausstehend",
  consents_confirmed: "Erklärungen bestätigt",
  recording: "Aufzeichnung läuft",
  recording_completed: "Aufzeichnung beendet",
  contract_closed: "Vertrag abgeschlossen",
  payment_pending: "Zahlung ausstehend",
  paid: "Bezahlt",
  customer_activated: "Kunde aktiviert",
  lost: "Verloren",
  cancelled: "Storniert",
};

/** Reihenfolge für Fortschrittsanzeigen (Sonderstatus ausgenommen). */
export const STATUS_SEQUENCE: ClosingStatus[] = [
  "lead",
  "closing_scheduled",
  "closing_in_progress",
  "offer_presented",
  "agreement_reached",
  "consent_pending",
  "consents_confirmed",
  "recording",
  "recording_completed",
  "contract_closed",
  "payment_pending",
  "paid",
  "customer_activated",
];

/** Alt-Bezeichnungen aus dem bisherigen Modul auf die Statusmaschine mappen. */
const LEGACY_ALIASES: Record<string, ClosingStatus> = {
  prospect: "lead",
  in_progress: "closing_in_progress",
  consent_given: "consents_confirmed",
  verloren: "lost",
  storniert: "cancelled",
  abgesagt: "cancelled",
};

export function normalizeStatus(raw: string | null | undefined): ClosingStatus {
  if (!raw) return "lead";
  if ((CLOSING_STATUSES as readonly string[]).includes(raw)) return raw as ClosingStatus;
  return LEGACY_ALIASES[raw] ?? "lead";
}

export function isClosingStatus(raw: string): raw is ClosingStatus {
  return (CLOSING_STATUSES as readonly string[]).includes(raw);
}

export function allowedTransitions(from: ClosingStatus): ClosingStatus[] {
  const next = [...FORWARD[from]];
  if (ABORTABLE.includes(from)) next.push("lost", "cancelled");
  return next;
}

export function canTransition(from: ClosingStatus, to: ClosingStatus): boolean {
  if (from === to) return true;
  return allowedTransitions(from).includes(to);
}

export class InvalidTransitionError extends Error {
  constructor(
    public readonly from: ClosingStatus,
    public readonly to: ClosingStatus
  ) {
    super(
      `Statusübergang ${STATUS_LABELS[from]} → ${STATUS_LABELS[to]} ist nicht zulässig.`
    );
    this.name = "InvalidTransitionError";
  }
}

export function assertTransition(from: ClosingStatus, to: ClosingStatus): void {
  if (!canTransition(from, to)) throw new InvalidTransitionError(from, to);
}

/** Position innerhalb der regulären Abfolge; -1 für Sonderstatus. */
export function statusIndex(status: ClosingStatus): number {
  return STATUS_SEQUENCE.indexOf(status);
}

export function isAtLeast(status: ClosingStatus, minimum: ClosingStatus): boolean {
  const a = statusIndex(status);
  const b = statusIndex(minimum);
  if (a < 0 || b < 0) return false;
  return a >= b;
}

export function isTerminal(status: ClosingStatus): boolean {
  return status === "lost" || status === "cancelled" || status === "customer_activated";
}

/**
 * Kürzester regulärer Vorwärtspfad von `from` nach `to` (ohne Sonderstatus).
 * Gibt null zurück, wenn `to` nicht erreichbar ist. Damit lassen sich mehrere
 * fachlich zusammengehörige Schritte in einem Event abbilden, ohne die
 * Übergangsvalidierung aufzuweichen.
 */
export function forwardPath(from: ClosingStatus, to: ClosingStatus): ClosingStatus[] | null {
  if (from === to) return [];
  const queue: Array<{ status: ClosingStatus; path: ClosingStatus[] }> = [
    { status: from, path: [] },
  ];
  const seen = new Set<ClosingStatus>([from]);
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const next of FORWARD[current.status]) {
      if (seen.has(next)) continue;
      const path = [...current.path, next];
      if (next === to) return path;
      seen.add(next);
      queue.push({ status: next, path });
    }
  }
  return null;
}
