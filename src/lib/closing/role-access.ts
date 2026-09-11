/**
 * Welche Bereiche des Adminportals eine Rolle betreten darf.
 *
 * CLOSER arbeitet ausschließlich im Sales- und Closing-Bereich. Innerhalb
 * davon greift zusätzlich die Zuweisungsprüfung aus `auth-guards.ts`: eigene
 * Leads, eigene Closing Sessions. Diese Liste ist die äußere Schranke, die
 * Zuweisungsprüfung die innere.
 */

/** Pfadpräfixe, die ein CLOSER betreten darf. */
export const CLOSER_ALLOWED_PREFIXES = ["/admin/sales"] as const;

/** Startseite je Rolle. */
export const ROLE_HOME: Record<string, string> = {
  ADMIN: "/admin/dashboard",
  CLOSER: "/admin/sales",
  CLIENT: "/dashboard",
};

export function isAdminPath(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

/** Darf diese Rolle den Pfad betreten? */
export function canAccessAdminPath(role: string, pathname: string): boolean {
  if (role === "ADMIN") return true;
  if (role !== "CLOSER") return false;
  return CLOSER_ALLOWED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export function homeFor(role: string): string {
  return ROLE_HOME[role] ?? "/dashboard";
}
