/**
 * Die drei Pakete.
 *
 * Bisher stand die Liste in fünf Oberflächen verstreut, jedes Mal neu
 * getippt — Kundenanlage, Kundenbearbeitung, Lösungsverwaltung, Angebote,
 * Leads. Eine Preisänderung hätte man an fünf Stellen nachziehen müssen.
 */
export const PACKAGES = [
  {
    key: "foundation",
    label: "OKUN Foundation",
    price: "ab 5.900 €",
    /** Was der Kunde im Portal davon hat — bewusst knapp. */
    summary: "Blueprint, Strategiegespräch und die Grundlagen-Kapitel.",
  },
  {
    key: "operations",
    label: "OKUN Operations",
    price: "ab 7.500 €",
    summary: "Zusätzlich die Kapitel zu Betrieb und Automatisierung.",
  },
  {
    key: "custom",
    label: "OKUN Custom",
    price: "ab 20.000 €",
    summary: "Alle Inhalte, dazu individuell entwickelte Lösungen.",
  },
] as const;

export type PackageKey = (typeof PACKAGES)[number]["key"];

/** Reihenfolge von klein nach groß — bestimmt, was „darüber hinaus" heißt. */
export const PACKAGE_ORDER: PackageKey[] = ["foundation", "operations", "custom"];

export function packageByKey(key: string | null | undefined) {
  if (!key) return null;
  return PACKAGES.find((p) => p.key === key) ?? null;
}

/** Der Anzeigename, oder der rohe Wert, falls jemand etwas anderes einträgt. */
export function packageLabel(key: string | null | undefined): string | null {
  if (!key) return null;
  return packageByKey(key)?.label ?? key;
}

/**
 * Liegt `candidate` oberhalb von `booked`?
 *
 * Unbekannte Werte gelten als nicht darüber — im Zweifel wird nichts als
 * Aufpreis markiert, was keiner ist.
 */
export function isAbovePackage(
  candidate: string | null | undefined,
  booked: string | null | undefined
): boolean {
  if (!booked || !candidate) return false;
  const a = PACKAGE_ORDER.indexOf(candidate as PackageKey);
  const b = PACKAGE_ORDER.indexOf(booked as PackageKey);
  return a >= 0 && b >= 0 && a > b;
}
