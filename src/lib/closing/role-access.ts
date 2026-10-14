/**
 * Welche Bereiche des Adminportals eine Rolle betreten darf.
 *
 * CLOSER arbeitet im Sales- und Closing-Bereich. Innerhalb davon greift
 * zusätzlich die Zuweisungsprüfung: eigene Leads, eigene Closing Sessions.
 * Diese Liste ist die äußere Schranke, die Zuweisungsprüfung die innere.
 *
 * Wer Strategiegespräche führt, braucht den Kundenbereich — dort liegt der
 * Leitfaden, und dort findet er den Kunden. Den Vertrieb braucht er dafür
 * nicht und bekommt ihn auch nicht.
 */

/** Pfadpräfixe für den Vertriebs- und Closing-Bereich. */
export const CLOSER_ALLOWED_PREFIXES = ["/admin/sales"] as const;

/** Pfadpräfixe für das Strategiegespräch. */
export const STRATEGY_ALLOWED_PREFIXES = ["/admin/kunden"] as const;

/** Startseite je Rolle. */
export const ROLE_HOME: Record<string, string> = {
  ADMIN: "/admin/dashboard",
  CLOSER: "/admin/sales",
  STRATEGIST: "/admin/kunden",
  CLIENT: "/dashboard",
};

export function isAdminPath(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

function matches(pathname: string, prefixes: readonly string[]): boolean {
  return prefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

/**
 * Darf dieser Benutzer den Pfad betreten?
 *
 * `canStrategy` stammt aus der Anmeldung. Fehlt es — etwa bei einer Anmeldung
 * aus der Zeit vor dieser Änderung —, gilt es als nicht erteilt; die Seite
 * selbst prüft ohnehin noch einmal gegen die Datenbank.
 */
export function canAccessAdminPath(
  role: string,
  pathname: string,
  canStrategy = false
): boolean {
  if (role === "ADMIN") return true;

  if (role === "CLOSER") {
    if (matches(pathname, CLOSER_ALLOWED_PREFIXES)) return true;
    return canStrategy && matches(pathname, STRATEGY_ALLOWED_PREFIXES);
  }

  if (role === "STRATEGIST") {
    return matches(pathname, STRATEGY_ALLOWED_PREFIXES);
  }

  return false;
}

export function homeFor(role: string): string {
  return ROLE_HOME[role] ?? "/dashboard";
}
