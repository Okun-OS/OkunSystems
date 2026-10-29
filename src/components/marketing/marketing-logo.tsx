import Image from "next/image";

/**
 * Die Wortmarke für Kopf- und Fußzeile der Website.
 *
 * Quelle ist die freigestellte Logodatei. Bildmarke und Schriftzug liegen
 * darin als Vektor, deshalb bleibt die Marke in jeder Größe und auf jedem
 * Bildschirm scharf — die vorige Fassung war ein Ausschnitt aus einer
 * Rastergrafik und trug den dunklen Schein der Vorlage mit sich, der über
 * hellem Grund als Fleck stand.
 *
 * `unoptimized`, weil der Bildumwandler von Next SVG nicht anfasst und sonst
 * `dangerouslyAllowSVG` in der Konfiguration verlangt. Die Datei ist 3 kB
 * groß; da ist nichts zu optimieren.
 */
export function MarketingLogo({ width = 140 }: { width?: number }) {
  return (
    <Image
      src="/marketing/okun-wortmarke.svg"
      alt="OKUN Systems"
      width={870}
      height={216}
      priority
      unoptimized
      style={{ width, height: "auto", display: "block" }}
    />
  );
}
