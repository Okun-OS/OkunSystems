import Image from "next/image";

/**
 * Die Wortmarke für Kopf- und Fußzeile der Website.
 *
 * Bewusst eine eigene Datei statt eines Beschnitts per CSS: Die Logodatei des
 * Portals trägt unter der Marke noch Trennstrich und Claim, und wer sie über
 * die Höhe abschneidet, erwischt je nach Breite genau die Linie. Hier liegt
 * die Marke für sich, und die Höhe ergibt sich aus der Breite.
 */
export function MarketingLogo({ width = 140 }: { width?: number }) {
  return (
    <Image
      src="/marketing/okun-wortmarke.png"
      alt="OKUN Systems"
      width={1039}
      height={258}
      priority
      style={{ width, height: "auto", display: "block" }}
    />
  );
}
