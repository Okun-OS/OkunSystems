"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getActor, guarded } from "@/lib/auth-guards";
import { ONBOARDING_SCHRITTE } from "@/lib/onboarding/checkliste";

/**
 * Die Haken, die der Kunde selbst setzt.
 *
 * Nur die Schritte, die er selbst beurteilen kann — ob er das Video gesehen
 * hat, ob seine Daten stimmen. Alles andere liest sich aus dem Stand des
 * Betriebs; ein Haken darauf wäre eine Behauptung, die sich beim nächsten
 * Laden widerlegt.
 */
export async function schrittAbhaken(schluessel: string, erledigt: boolean) {
  return guarded(async () => {
    const actor = await getActor();
    if (!actor?.companyId) return { error: "Kein Betrieb zugeordnet." };

    const vorlage = ONBOARDING_SCHRITTE.find((s) => s.schluessel === schluessel);
    if (!vorlage || vorlage.herkunft !== "selbst") {
      return { error: "Dieser Schritt hakt sich von selbst ab." };
    }

    if (erledigt) {
      await db.onboardingHaken.upsert({
        where: { companyId_schluessel: { companyId: actor.companyId, schluessel } },
        create: { companyId: actor.companyId, schluessel, erledigtVonId: actor.id },
        update: { erledigtAm: new Date(), erledigtVonId: actor.id },
      });
    } else {
      await db.onboardingHaken.deleteMany({
        where: { companyId: actor.companyId, schluessel },
      });
    }

    revalidatePath("/dashboard");
    return { ok: true as const };
  });
}
