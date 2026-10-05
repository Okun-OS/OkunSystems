/**
 * Die Firmendaten der Website.
 *
 * Einmal hier, weil sie an mehreren Stellen stehen — Impressum, Kontaktseite,
 * später Angebote und E-Mails. Eine Nummer, die an zwei Orten gepflegt wird,
 * ist irgendwann an einem Ort falsch.
 */
export const COMPANY = {
  legalName: "OKUN SYSTEMS UG (haftungsbeschränkt)",
  street: "Potsdamer Platz 1",
  postalCode: "10785",
  city: "Berlin",
  country: "Deutschland",

  managingDirector: "Felix Okun",

  phone: "030 13883330",
  /** Dieselbe Nummer in der Form, die ein Telefon versteht. */
  phoneHref: "+493013883330",
  email: "kontakt@okun-systems.com",

  /* Eingetragen am Amtsgericht Charlottenburg, Berlin. */
  registerCourt: "Amtsgericht Charlottenburg (Berlin)",
  registerNumber: "HRB 292175 B",
  /**
   * Steht leer, solange die Nummer nicht vorliegt — das Impressum sagt das
   * dann auch so, statt eine Zeile zu zeigen, die vergessen aussieht.
   */
  vatId: "",
} as const;

/** Die Anschrift als Zeilen, in der Reihenfolge, in der sie gelesen wird. */
export const ADDRESS_LINES = [
  COMPANY.legalName,
  COMPANY.street,
  `${COMPANY.postalCode} ${COMPANY.city}`,
  COMPANY.country,
] as const;

/**
 * Die Terminbuchung läuft über Calendly.
 *
 * Ohne Monatsparameter: Der Link, den Calendly beim Teilen anbietet, enthält
 * den gerade geöffneten Monat. Fest eingebaut zeigt er ein Jahr später auf
 * einen Monat in der Vergangenheit — Calendly öffnet von selbst den nächsten
 * Monat mit freien Terminen.
 */
export const BOOKING_URL = "https://calendly.com/kontakt-okun-systems/30min";
