/**
 * Der Schlüssel, unter dem eine Umsetzungsanleitung wiedergefunden wird.
 *
 * Steht für sich, ohne Datenbank und ohne Modell, weil ihn auch die Seite im
 * Browser bildet, um den Verweis zu bauen.
 *
 * Aus Block und Titel gebildet, damit derselbe Posten eine Nachschärfung des
 * Gesprächsleitfadens überlebt: Der Leitfaden darf sich ändern, die Anleitung
 * zum Einrichten einer Dateiablage bleibt dieselbe.
 */
export function anleitungsSchluessel(block: string, titel: string): string {
  return `${block}|${titel}`
    .toLowerCase()
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .replace(/[^a-z0-9|]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 180)
    // Bleibt nur der Trenner übrig, war nichts da. Ein Schlüssel aus einem
    // einzelnen Strich fände nie etwas und sähe in der Adresse aus wie ein
    // Fehler — leer ist ehrlicher.
    .replace(/^\|$/, "");
}
