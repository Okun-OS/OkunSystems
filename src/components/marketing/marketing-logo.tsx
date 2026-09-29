import Image from "next/image";

/**
 * Die Wortmarke für Kopf- und Fußzeile der Website.
 *
 * Bewusst eine eigene Datei statt eines Beschnitts per CSS: Die Logodatei des
 * Portals trägt unter der Marke noch Trennstrich und Claim. Ein einzelner
 * Ausschnitt bekommt beides nicht weg, ohne die Bildmarke anzuschneiden — der
 * Ring reicht tiefer als die Trennlinie. Diese Datei setzt deshalb Bildmarke
 * und Schriftzug getrennt wieder zusammen, an ihren ursprünglichen Stellen;
 * erzeugt wird sie aus `public/okun-logo.png`. Die Höhe ergibt sich aus der
 * Breite.
 */
export function MarketingLogo({ width = 140 }: { width?: number }) {
  return (
    <Image
      src="/marketing/okun-wortmarke.png"
      alt="OKUN Systems"
      width={1030}
      height={318}
      priority
      style={{ width, height: "auto", display: "block" }}
    />
  );
}
