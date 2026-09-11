import { auth } from "@/auth";
import { db } from "@/lib/db";

/**
 * Serverseitige Autorisierung.
 *
 * Rollen: ADMIN (voller Zugriff), CLOSER (nur die ihm zugewiesenen Closings),
 * CLIENT (ausschließlich eigene Daten). Jede schreibende Aktion und jeder
 * Download geht durch diese Prüfungen — die Rolle aus dem JWT wird zusätzlich
 * gegen die Datenbank verifiziert.
 */

export type ActorRole = "ADMIN" | "CLOSER" | "CLIENT";

export type Actor = {
  id: string;
  role: ActorRole;
  name: string | null;
  email: string;
  companyId: string | null;
};

export async function getActor(): Promise<Actor | null> {
  const session = await auth();
  if (!session?.user) return null;
  const userId = (session.user as { id?: string }).id;
  if (!userId) return null;

  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true, role: true, name: true, email: true, companyId: true,
      deactivatedAt: true,
    },
  });
  // Ein bereits ausgestelltes JWT darf ein deaktiviertes Konto nicht am Leben
  // halten — deshalb wird der Zustand bei jedem Zugriff gegen die DB geprüft.
  if (!user || user.deactivatedAt) return null;
  return {
    id: user.id,
    role: (user.role as ActorRole) ?? "CLIENT",
    name: user.name,
    email: user.email,
    companyId: user.companyId,
  };
}

export class AuthorizationError extends Error {
  constructor(message = "Keine Berechtigung") {
    super(message);
    this.name = "AuthorizationError";
  }
}

export async function requireAdmin(): Promise<Actor> {
  const actor = await getActor();
  if (!actor) throw new AuthorizationError("Nicht authentifiziert");
  if (actor.role !== "ADMIN") throw new AuthorizationError();
  return actor;
}

export async function requireSales(): Promise<Actor> {
  const actor = await getActor();
  if (!actor) throw new AuthorizationError("Nicht authentifiziert");
  if (actor.role !== "ADMIN" && actor.role !== "CLOSER") throw new AuthorizationError();
  return actor;
}

/** Closer dürfen ausschließlich ihre eigenen Closing Sessions bearbeiten. */
export async function requireSessionAccess(closingSessionId: string): Promise<{
  actor: Actor;
  closerId: string;
  companyId: string;
}> {
  const actor = await requireSales();
  const session = await db.closingSession.findUnique({
    where: { id: closingSessionId },
    select: { closerId: true, companyId: true },
  });
  if (!session) throw new AuthorizationError("Closing Session nicht gefunden");
  if (actor.role === "CLOSER" && session.closerId !== actor.id) {
    throw new AuthorizationError();
  }
  return { actor, closerId: session.closerId, companyId: session.companyId };
}

/** Closer dürfen nur Leads bearbeiten, die ihnen zugewiesen sind. */
export async function requireLeadAccess(companyId: string): Promise<Actor> {
  const actor = await requireSales();
  if (actor.role === "ADMIN") return actor;
  const company = await db.company.findUnique({
    where: { id: companyId },
    select: { assignedCloserId: true },
  });
  if (!company) throw new AuthorizationError("Lead nicht gefunden");
  if (company.assignedCloserId && company.assignedCloserId !== actor.id) {
    throw new AuthorizationError();
  }
  return actor;
}

/**
 * Closer dürfen nur Rechnungen bearbeiten, die aus einem ihrer Closings
 * stammen. Eine freistehende Rechnung ohne Closing-Bezug ist Adminsache.
 */
export async function requireInvoiceAccess(invoiceId: string): Promise<{
  actor: Actor;
  companyId: string;
  closingSessionId: string | null;
}> {
  const actor = await requireSales();
  const invoice = await db.invoice.findUnique({
    where: { id: invoiceId },
    select: { companyId: true, closingSessionId: true },
  });
  if (!invoice) throw new AuthorizationError("Rechnung nicht gefunden");

  if (actor.role !== "ADMIN") {
    if (!invoice.closingSessionId) throw new AuthorizationError();
    const session = await db.closingSession.findUnique({
      where: { id: invoice.closingSessionId },
      select: { closerId: true },
    });
    if (!session || session.closerId !== actor.id) throw new AuthorizationError();
  }

  return {
    actor,
    companyId: invoice.companyId,
    closingSessionId: invoice.closingSessionId,
  };
}

/** Kunden dürfen ausschließlich Daten des eigenen Unternehmens sehen. */
export async function requireClientCompany(): Promise<Actor & { companyId: string }> {
  const actor = await getActor();
  if (!actor) throw new AuthorizationError("Nicht authentifiziert");
  if (!actor.companyId) throw new AuthorizationError("Kein Unternehmen zugeordnet");
  return actor as Actor & { companyId: string };
}

/** Wrapper für Server Actions: Fehler werden als Rückgabewert gemeldet. */
export async function guarded<T>(
  fn: () => Promise<T>
): Promise<T | { error: string }> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof AuthorizationError) return { error: err.message };
    console.error("[action] unerwarteter Fehler:", err);
    return {
      error: err instanceof Error ? err.message : "Unerwarteter Fehler",
    };
  }
}
