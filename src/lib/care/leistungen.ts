import { db } from "@/lib/db";
import type { CareStand } from "./katalog";

/**
 * OKUN Care, von innen.
 *
 * Care war bisher eine Verkaufsseite, die nach der Buchung stehenblieb: ein
 * Abzeichen „aktiv" und der Hinweis, man möge sich an seinen Berater wenden.
 * Das ist kein Dienst, das ist eine Quittung. Hier wird deshalb geladen, was
 * die Seite nach der Buchung zeigt — Draht, Protokoll und Termin. Was Care
 * *ist*, steht im Katalog nebenan.
 */

// ─── Laden ───────────────────────────────────────────────────────────────────


/**
 * Der Stand von Care für einen Betrieb.
 *
 * `nurSichtbare` trennt die beiden Leser: Der Kunde sieht sein Protokoll,
 * der Berater auch die internen Zeilen. Dieselbe Abfrage mit einem Schalter
 * statt zwei Abfragen, die auseinanderlaufen.
 */
export async function ladeCare(
  companyId: string,
  nurSichtbare: boolean
): Promise<CareStand> {
  const [abo, company, leistungen, termin] = await Promise.all([
    db.careSubscription.findUnique({ where: { companyId } }),
    db.company.findUnique({
      where: { id: companyId },
      select: {
        assignedCloser: { select: { name: true, email: true } },
        strategieSitzungen: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { berater: { select: { name: true, email: true } } },
        },
      },
    }),
    db.careLeistung.findMany({
      where: { companyId, ...(nurSichtbare ? { kundeSieht: true } : {}) },
      orderBy: { erledigtAm: "desc" },
      take: 50,
      select: {
        id: true,
        titel: true,
        art: true,
        beschreibung: true,
        erledigtAm: true,
        minuten: true,
        kundeSieht: true,
        erfasstVon: { select: { name: true } },
      },
    }),
    db.appointment.findFirst({
      where: { companyId, status: "SCHEDULED", startTime: { gte: new Date() } },
      orderBy: { startTime: "asc" },
      select: { id: true, title: true, startTime: true },
    }),
  ]);

  /*
    Wer betreut, steht nicht an einer Stelle.

    Der zugeteilte Closer ist die Regel; wo keiner zugeteilt ist, hat aber
    meist jemand das Strategiegespräch geführt — und das ist aus Sicht des
    Kunden derselbe Mensch. Erst wenn beides fehlt, bleibt die Zeile leer,
    statt einen Namen zu erfinden.
  */
  const berater =
    company?.assignedCloser ?? company?.strategieSitzungen[0]?.berater ?? null;

  return {
    status: abo?.status ?? "inactive",
    aktiv: abo?.status === "active",
    seit: abo?.startedAt ?? null,
    gekuendigtAm: abo?.cancelledAt ?? null,
    hatZahlungsdaten: Boolean(abo?.stripeCustomerId),
    berater: berater?.name ? { name: berater.name, email: berater.email ?? null } : null,
    naechsterTermin: termin
      ? { id: termin.id, titel: termin.title, beginn: termin.startTime }
      : null,
    leistungen: leistungen.map((l) => ({
      id: l.id,
      titel: l.titel,
      art: l.art,
      beschreibung: l.beschreibung,
      erledigtAm: l.erledigtAm,
      minuten: l.minuten,
      kundeSieht: l.kundeSieht,
      erfasstVon: l.erfasstVon?.name ?? null,
    })),
  };
}
