import { COMPANY } from "@/lib/marketing/company";

/**
 * Der direkte Draht in OKUN Care.
 *
 * Wer Care gebucht hat, soll nicht überlegen müssen, wie er uns erreicht.
 * Deshalb stehen die Wege an einer Stelle — und zwar als Daten, nicht als
 * Text in einer Seite: Eine Nummer, die in drei Dateien steht, ist nach dem
 * ersten Umzug an zwei Stellen falsch.
 *
 * Die WhatsApp-Nummer kommt aus der Umgebung, weil sie nicht die
 * Impressumsnummer ist: Ein Festnetzanschluss hat kein WhatsApp. Ist sie
 * nicht gesetzt, fällt die Seite auf Telefon und E-Mail zurück und
 * verspricht keinen Kanal, den es nicht gibt.
 */

/** Nur Ziffern — so, wie wa.me die Nummer erwartet (Landesvorwahl ohne „+"). */
function nurZiffern(roh: string | undefined): string {
  return (roh ?? "").replace(/[^\d]/g, "");
}

export type CareKontakt = {
  /** Gesetzt, wenn ein WhatsApp-Kanal vorhanden ist. */
  whatsappNummer: string | null;
  telefon: string;
  telefonHref: string;
  email: string;
};

export function careKontakt(): CareKontakt {
  const whatsapp = nurZiffern(process.env.OKUN_WHATSAPP);
  return {
    whatsappNummer: whatsapp.length >= 8 ? whatsapp : null,
    telefon: COMPANY.phone,
    telefonHref: COMPANY.phoneHref,
    email: process.env.OKUN_CARE_EMAIL ?? "care@okun-systems.com",
  };
}

/**
 * Wie schnell wir antworten.
 *
 * Ein Versprechen, das man nicht hält, ist schlimmer als keines. Deshalb
 * steht hier die Zusage, die auch an einem vollen Tag noch stimmt — und zwar
 * an einer Stelle, damit sie sich ändern lässt, ohne sie zu suchen.
 */
export const REAKTIONSZEIT = "an Werktagen innerhalb von 24 Stunden";

/**
 * Der vorbereitete erste Satz.
 *
 * WhatsApp öffnet mit diesem Text im Eingabefeld. Er nennt den Betrieb,
 * damit auf unserer Seite niemand erst fragen muss, wer schreibt — und er
 * endet offen, damit der Kunde weiterschreibt statt zu löschen.
 */
export function whatsappLink(nummer: string, firma: string): string {
  const text = `Hallo OKUN Systems, hier ${firma} (OKUN Care). `;
  return `https://wa.me/${nummer}?text=${encodeURIComponent(text)}`;
}

export function mailtoLink(email: string, firma: string): string {
  const betreff = `OKUN Care — ${firma}`;
  return `mailto:${email}?subject=${encodeURIComponent(betreff)}`;
}
