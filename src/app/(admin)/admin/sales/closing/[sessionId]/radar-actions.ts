"use server";

import { revalidatePath } from "next/cache";
import { guarded, requireSessionAccess } from "@/lib/auth-guards";
import { KATALOG_VERSION, frage as frageAusKatalog } from "@/lib/radar/catalog";
import {
  blendeRadarAus,
  gibErgebnisFrei,
  ladeRadar,
  protokolliere,
  schliesseAb,
  setzeAntwort,
  setzeCloserEinschaetzung,
  setzeCursor,
  setzeNotiz,
  setzePhase,
  setzeProfil,
  setzeSpotlight,
  starteRadar,
  werteAus,
  type RadarProfil,
} from "@/lib/radar/service";
import { closerAnsicht, naechsterSchritt, type RadarCloserAnsicht } from "@/lib/radar/views";

/**
 * Das Steuerpult des Closers.
 *
 * Jede Aktion prüft zuerst, dass dieser Closer dieses Gespräch führen darf —
 * über dieselbe Schranke wie Angebot, Präsentation und Vertragsabschluss. Und
 * jede Aktion prüft zusätzlich, dass die Analyse zu genau diesem Gespräch
 * gehört: Eine fremde Analyse-ID in der Anfrage darf nicht genügen, um eine
 * fremde Analyse zu bearbeiten.
 */

function pfad(closingSessionId: string): string {
  return `/admin/sales/closing/${closingSessionId}`;
}

/** Lädt die Analyse und stellt sicher, dass sie zu diesem Gespräch gehört. */
async function zugang(closingSessionId: string, radarSessionId: string) {
  const { actor, companyId } = await requireSessionAccess(closingSessionId);
  const datensatz = await ladeRadar(radarSessionId);
  if (!datensatz) throw new Error("Die Analyse wurde nicht gefunden.");
  if (datensatz.closingSessionId !== closingSessionId) {
    throw new Error("Die Analyse gehört nicht zu diesem Gespräch.");
  }
  return { actor, companyId, datensatz };
}

async function antwort(closingSessionId: string, radarSessionId: string) {
  const datensatz = await ladeRadar(radarSessionId);
  if (!datensatz) throw new Error("Die Analyse wurde nicht gefunden.");
  return { ansicht: closerAnsicht(datensatz, KATALOG_VERSION) satisfies RadarCloserAnsicht };
}

export async function radarStarten(closingSessionId: string) {
  return guarded(async () => {
    const { actor, companyId } = await requireSessionAccess(closingSessionId);
    const datensatz = await starteRadar({ closingSessionId, companyId, closerId: actor.id });
    await protokolliere({
      closingSessionId,
      companyId,
      actorId: actor.id,
      eventType: "radar.gestartet",
      metadata: { radarSessionId: datensatz.id, katalogVersion: datensatz.katalogVersion },
    });
    revalidatePath(pfad(closingSessionId));
    return { ansicht: closerAnsicht(datensatz, KATALOG_VERSION) };
  });
}

/** Holt den aktuellen Stand. Grundlage für den Abgleich während des Gesprächs. */
export async function radarStand(closingSessionId: string, radarSessionId: string) {
  return guarded(async () => {
    await zugang(closingSessionId, radarSessionId);
    return antwort(closingSessionId, radarSessionId);
  });
}

export async function radarProfilSpeichern(
  closingSessionId: string,
  radarSessionId: string,
  profil: RadarProfil
) {
  return guarded(async () => {
    await zugang(closingSessionId, radarSessionId);
    await setzeProfil(radarSessionId, profil);
    return antwort(closingSessionId, radarSessionId);
  });
}

/** Zeigt eine bestimmte Frage. Beide Seiten sehen daraufhin dieselbe. */
export async function radarZeigeFrage(
  closingSessionId: string,
  radarSessionId: string,
  frageKey: string
) {
  return guarded(async () => {
    await zugang(closingSessionId, radarSessionId);
    const f = frageAusKatalog(frageKey);
    if (!f) return { error: "Diese Frage gibt es nicht." };
    await setzePhase(radarSessionId, f.phase, frageKey);
    return antwort(closingSessionId, radarSessionId);
  });
}

/** Weiter zur nächsten offenen Frage — oder in die nächste Phase. */
export async function radarWeiter(closingSessionId: string, radarSessionId: string) {
  return guarded(async () => {
    const { datensatz } = await zugang(closingSessionId, radarSessionId);
    const naechste = naechsterSchritt(datensatz);
    await setzePhase(radarSessionId, naechste.phase, naechste.frageKey);
    return antwort(closingSessionId, radarSessionId);
  });
}

/** Zurück zur vorherigen aktiven Frage. */
export async function radarZurueck(closingSessionId: string, radarSessionId: string) {
  return guarded(async () => {
    const { datensatz } = await zugang(closingSessionId, radarSessionId);
    const ansicht = closerAnsicht(datensatz, KATALOG_VERSION);
    const index = ansicht.fragen.findIndex((f) => f.key === datensatz.cursorKey);
    if (index <= 0) {
      // Vor der ersten Frage steht das Profil.
      await setzePhase(radarSessionId, "profil", null);
      return antwort(closingSessionId, radarSessionId);
    }
    const vorherige = ansicht.fragen[index - 1];
    await setzePhase(radarSessionId, vorherige.phase, vorherige.key);
    return antwort(closingSessionId, radarSessionId);
  });
}

/** Der Closer trägt eine Antwort für den Interessenten ein. */
export async function radarAntwortSetzen(
  closingSessionId: string,
  radarSessionId: string,
  frageKey: string,
  optionKeys: string[]
) {
  return guarded(async () => {
    await zugang(closingSessionId, radarSessionId);
    const f = frageAusKatalog(frageKey);
    if (!f) return { error: "Diese Frage gibt es nicht." };
    const gueltig = optionKeys.filter((k) => f.optionen.some((o) => o.key === k));
    await setzeAntwort({ radarSessionId, frageKey, optionKeys: gueltig, quelle: "closer" });
    return antwort(closingSessionId, radarSessionId);
  });
}

export async function radarFrageUeberspringen(
  closingSessionId: string,
  radarSessionId: string,
  frageKey: string
) {
  return guarded(async () => {
    const { datensatz } = await zugang(closingSessionId, radarSessionId);
    await setzeAntwort({
      radarSessionId,
      frageKey,
      optionKeys: [],
      uebersprungen: true,
      quelle: "closer",
    });
    const nach = await ladeRadar(radarSessionId);
    if (nach) {
      const naechste = naechsterSchritt(nach);
      await setzePhase(radarSessionId, naechste.phase, naechste.frageKey);
    }
    void datensatz;
    return antwort(closingSessionId, radarSessionId);
  });
}

export async function radarSpotlightWaehlen(
  closingSessionId: string,
  radarSessionId: string,
  spotlightKey: string
) {
  return guarded(async () => {
    await zugang(closingSessionId, radarSessionId);
    await setzeSpotlight(radarSessionId, spotlightKey);
    const nach = await ladeRadar(radarSessionId);
    if (nach) {
      const naechste = naechsterSchritt(nach);
      await setzePhase(radarSessionId, naechste.phase, naechste.frageKey);
    }
    return antwort(closingSessionId, radarSessionId);
  });
}

export async function radarNotizSpeichern(
  closingSessionId: string,
  radarSessionId: string,
  notiz: string
) {
  return guarded(async () => {
    await zugang(closingSessionId, radarSessionId);
    // Bewusst ohne `rev`-Erhöhung: Die Notiz geht die Kundenseite nichts an,
    // und ein Tastendruck des Closers soll dort nichts nachladen.
    await setzeNotiz(radarSessionId, notiz);
    return { ok: true as const };
  });
}

/** Rechnet das Ergebnis. Der Kunde sieht es damit noch nicht. */
export async function radarAuswerten(closingSessionId: string, radarSessionId: string) {
  return guarded(async () => {
    const { actor, companyId } = await zugang(closingSessionId, radarSessionId);
    const ergebnis = await werteAus(radarSessionId);
    if (!ergebnis) return { error: "Die Auswertung konnte nicht erzeugt werden." };
    await protokolliere({
      closingSessionId,
      companyId,
      actorId: actor.id,
      eventType: "radar.ausgewertet",
      metadata: {
        radarSessionId,
        stufe: ergebnis.stufe,
        aussagekraft: ergebnis.aussagekraft,
        achsen: Object.fromEntries(ergebnis.achsen.map((a) => [a.achse, a.wert])),
      },
    });
    revalidatePath(pfad(closingSessionId));
    return antwort(closingSessionId, radarSessionId);
  });
}

/** Gibt das Ergebnis für den Interessenten frei — erst jetzt sieht er es. */
export async function radarErgebnisFreigeben(closingSessionId: string, radarSessionId: string) {
  return guarded(async () => {
    const { datensatz } = await zugang(closingSessionId, radarSessionId);
    if (!datensatz.ergebnis) return { error: "Es liegt noch keine Auswertung vor." };
    await gibErgebnisFrei(radarSessionId);
    return antwort(closingSessionId, radarSessionId);
  });
}

export async function radarEinschaetzungSpeichern(
  closingSessionId: string,
  radarSessionId: string,
  stufe: "A" | "B" | "C",
  notiz: string
) {
  return guarded(async () => {
    const { actor, companyId } = await zugang(closingSessionId, radarSessionId);
    if (!notiz.trim()) {
      return { error: "Eine abweichende Einschätzung braucht eine Begründung." };
    }
    await setzeCloserEinschaetzung({ radarSessionId, stufe, notiz });
    await protokolliere({
      closingSessionId,
      companyId,
      actorId: actor.id,
      eventType: "radar.einschaetzung_abweichend",
      metadata: { radarSessionId, stufe },
    });
    return antwort(closingSessionId, radarSessionId);
  });
}

/** Schließt die Analyse ab. Ein zweiter Klick ändert nichts. */
export async function radarAbschliessen(closingSessionId: string, radarSessionId: string) {
  return guarded(async () => {
    const { actor, companyId } = await zugang(closingSessionId, radarSessionId);
    const { ergebnis, warBereitsAbgeschlossen } = await schliesseAb(radarSessionId);
    if (!warBereitsAbgeschlossen) {
      await protokolliere({
        closingSessionId,
        companyId,
        actorId: actor.id,
        eventType: "radar.abgeschlossen",
        metadata: { radarSessionId, stufe: ergebnis?.stufe ?? null },
      });
    }
    revalidatePath(pfad(closingSessionId));
    return { ...(await antwort(closingSessionId, radarSessionId)), warBereitsAbgeschlossen };
  });
}

/** Nimmt das Radar von der Kundenbühne — etwa für den Wechsel zum Angebot. */
export async function radarAusblenden(closingSessionId: string) {
  return guarded(async () => {
    await requireSessionAccess(closingSessionId);
    await blendeRadarAus(closingSessionId);
    revalidatePath(pfad(closingSessionId));
    return { ok: true as const };
  });
}

/** Schaltet das Radar wieder auf die Kundenbühne. */
export async function radarEinblenden(closingSessionId: string, radarSessionId: string) {
  return guarded(async () => {
    const { actor, companyId } = await zugang(closingSessionId, radarSessionId);
    await starteRadar({ closingSessionId, companyId, closerId: actor.id });
    revalidatePath(pfad(closingSessionId));
    return antwort(closingSessionId, radarSessionId);
  });
}
