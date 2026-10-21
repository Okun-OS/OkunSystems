import { db } from "@/lib/db";
import { sitzungFuerKunde } from "@/lib/strategie/fuehrung";
import { baueCheckliste, type OnboardingStand, type Schritt } from "./checkliste";

/**
 * Den Stand eines Betriebs einsammeln.
 *
 * Fünf Abfragen auf einmal, weil keine von der anderen abhängt — und weil
 * diese Liste auf dem Dashboard steht, also auf jedem ersten Blick ins
 * Portal. Was dort nacheinander läuft, merkt man.
 */
export async function ladeCheckliste(
  companyId: string,
  userId: string
): Promise<Schritt[]> {
  const [nutzer, blueprint, termin, studio, lernfortschritt, haken] = await Promise.all([
    db.user.findUnique({ where: { id: userId }, select: { firstLogin: true } }),
    db.analysisSession.findFirst({
      where: { companyId, status: "COMPLETED" },
      select: { id: true },
    }),
    db.appointment.findFirst({
      where: { companyId, type: "STRATEGY" },
      select: { id: true },
    }),
    sitzungFuerKunde(companyId),
    /*
      Eine Zeile allein heißt nichts: `LessonProgress` entsteht auch mit
      `not_started`, sobald eine Lektion geöffnet wird. Begonnen ist der
      Lernpfad erst, wenn jemand darin vorangekommen ist.
    */
    db.lessonProgress.findFirst({
      where: { user: { companyId }, status: { in: ["in_progress", "completed"] } },
      select: { id: true },
    }),
    db.onboardingHaken.findMany({ where: { companyId }, select: { schluessel: true } }),
  ]);

  const stand: OnboardingStand = {
    /*
      `firstLogin` wird bei der ersten gelungenen Anmeldung gelöscht. Es ist
      damit genau die Frage, die dieser Schritt stellt — und nicht „wurde
      jemals ein Konto angelegt".
    */
    zugangEingerichtet: nutzer ? !nutzer.firstLogin : false,
    blueprintFertig: Boolean(blueprint),
    strategieterminVorhanden: Boolean(termin),
    studioFreigegeben: Boolean(studio),
    lernenBegonnen: Boolean(lernfortschritt),
    selbstErledigt: haken.map((h) => h.schluessel),
  };

  return baueCheckliste(stand);
}
