/**
 * Die Aufgaben, die ein Mitarbeiter übernehmen kann.
 *
 * Es gibt zwei: das Closing-Gespräch, mit dem ein Interessent Kunde wird, und
 * das Strategiegespräch, das danach kommt. Jemand kann das eine, das andere
 * oder beides. Ein Administrator kann ohnehin alles.
 *
 * Abgebildet wird das über zwei Felder am Benutzer statt über eine Liste von
 * Rollennamen, und zwar mit Absicht: `role` ist die Schranke, an der 29
 * Stellen im Sales-Bereich bereits prüfen. Wer dort nicht `CLOSER` heißt, kommt
 * nicht hinein — ohne dass eine dieser 29 Stellen angefasst werden müsste. Ein
 * neuer Rollenname, den eine davon versehentlich durchlässt, wäre ein Loch im
 * Vertriebsbereich; ein zusätzliches Feld kann das nicht sein.
 */

export const TEAM_ROLES = [
  {
    key: "closing",
    label: "Closing",
    beschreibung: "Führt Closing-Gespräche. Sieht den Vertriebsbereich.",
    role: "CLOSER",
    canStrategy: false,
  },
  {
    key: "strategie",
    label: "Strategiegespräch",
    beschreibung:
      "Führt Strategiegespräche nach dem Blueprint. Sieht den Kundenbereich samt Leitfaden, nicht den Vertrieb.",
    role: "STRATEGIST",
    canStrategy: true,
  },
  {
    key: "beides",
    label: "Closing und Strategiegespräch",
    beschreibung: "Beides.",
    role: "CLOSER",
    canStrategy: true,
  },
] as const;

export type TeamRoleKey = (typeof TEAM_ROLES)[number]["key"];

/** Rollennamen, die in der Datenbank stehen dürfen. */
export const STAFF_ROLES = ["ADMIN", "CLOSER", "STRATEGIST"] as const;

export function teamRoleByKey(key: string) {
  return TEAM_ROLES.find((r) => r.key === key) ?? null;
}

/** Welche der drei Aufgaben beschreibt diesen Benutzer? */
export function teamRoleKeyOf(user: {
  role?: string | null;
  canStrategy?: boolean | null;
}): TeamRoleKey | null {
  if (user.role === "STRATEGIST") return "strategie";
  if (user.role === "CLOSER") return user.canStrategy ? "beides" : "closing";
  return null;
}

export function teamRoleLabel(user: {
  role?: string | null;
  canStrategy?: boolean | null;
}): string {
  if (user.role === "ADMIN") return "Administrator";
  const key = teamRoleKeyOf(user);
  return key ? teamRoleByKey(key)!.label : "—";
}

/** Darf Closing-Gespräche führen und den Vertriebsbereich betreten. */
export function mayDoClosing(role?: string | null): boolean {
  return role === "ADMIN" || role === "CLOSER";
}

/**
 * Darf Strategiegespräche führen und den Leitfaden sehen.
 *
 * `canStrategy` kommt bei Mitarbeitern aus der Datenbank. Steht es nicht fest —
 * etwa in einer Anmeldung, die vor dieser Änderung ausgestellt wurde —, gilt es
 * als nicht erteilt. Ein fehlendes Recht ist nie ein erteiltes.
 */
export function mayDoStrategy(
  role?: string | null,
  canStrategy?: boolean | null
): boolean {
  if (role === "ADMIN") return true;
  return canStrategy === true;
}
