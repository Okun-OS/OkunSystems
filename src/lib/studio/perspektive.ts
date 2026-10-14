/**
 * Die Geometrie der Innenräume.
 *
 * Jeder Raum ist eine Schachtel in Zentralperspektive: Man steht davor und
 * schaut hinein, der Fluchtpunkt liegt in der Mitte. Rückwand, zwei
 * Seitenwände, Boden und Decke sind Flächen in **einem** Koordinatensystem —
 * deshalb stehen die Formeln hier und nicht in den Szenen. Wer einen Tisch
 * in den Raum stellt, sagt „in halber Tiefe, mittig" und nicht „bei x=740".
 *
 * Alles rechnet in Bühnenkoordinaten (1600 × 900). Die Szenen zeichnen in
 * genau diesem Raster; die Bühne wird am Ende auf den Bildschirm gezogen.
 */

export const BUEHNE = { breite: 1600, hoehe: 900 } as const;

/** Die Rückwand — der Ausschnitt, der am Ende des Raums offen bleibt. */
export type Kasten = {
  links: number;
  rechts: number;
  oben: number;
  unten: number;
};

/**
 * Der Standardraum.
 *
 * Breit genug, dass an der Rückwand etwas stehen kann, und hoch genug für
 * eine Decke, die man sieht. Räume mit anderen Maßen geben ihren eigenen
 * Kasten mit — ein Flur ist flacher und breiter als eine Werkstatt.
 */
export const RAUM: Kasten = { links: 430, rechts: 1170, oben: 230, unten: 605 };

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Tiefe mit Perspektive.
 *
 * Gleich weit auseinanderstehende Dinge rücken nach hinten zusammen. Ohne
 * das wirkt ein Raum wie eine schräge Tapete: Die Linien stimmen, aber
 * nichts steht darin.
 *
 * `z` ist der Abstand in der Welt (0 = direkt vor einem, 1 = Rückwand),
 * heraus kommt die Tiefe auf der Bühne.
 */
export function tiefe(z: number, staerke = 0.55): number {
  if (z <= 0) return 0;
  if (z >= 1) return 1;
  return (z * (1 + staerke)) / (z + staerke);
}

export type Punkt = { x: number; y: number };

/**
 * Ein Punkt auf dem Boden.
 *
 * `t` ist die Tiefe (0 = Vorderkante der Bühne, 1 = Fuß der Rückwand),
 * `u` die Breite (0 = linke Wand, 1 = rechte Wand).
 */
export function boden(t: number, u: number, kasten: Kasten = RAUM): Punkt {
  return {
    x: lerp(lerp(0, kasten.links, t), lerp(BUEHNE.breite, kasten.rechts, t), u),
    y: lerp(BUEHNE.hoehe, kasten.unten, t),
  };
}

/** Derselbe Punkt an der Decke. */
export function decke(t: number, u: number, kasten: Kasten = RAUM): Punkt {
  return {
    x: lerp(lerp(0, kasten.links, t), lerp(BUEHNE.breite, kasten.rechts, t), u),
    y: lerp(0, kasten.oben, t),
  };
}

/**
 * Ein Punkt im Raum, über dem Boden.
 *
 * `h` ist die Höhe: 0 steht auf dem Boden, 1 stößt an die Decke. Damit
 * lassen sich Dinge stellen, ohne dass die Szene die Deckenhöhe kennt.
 */
export function raum(t: number, u: number, h: number, kasten: Kasten = RAUM): Punkt {
  const unten = boden(t, u, kasten);
  const oben = decke(t, u, kasten);
  return { x: unten.x, y: lerp(unten.y, oben.y, h) };
}

/**
 * Ein Punkt auf einer Seitenwand.
 *
 * `seite` ist "links" oder "rechts", `t` die Tiefe, `v` die Höhe von oben
 * (0 = Decke, 1 = Boden). Seitenwände brauchen eine eigene Formel, weil auf
 * ihnen Türen und Fenster sitzen — und die müssen am Boden stehen, nicht in
 * der Luft hängen.
 */
export function wand(
  seite: "links" | "rechts",
  t: number,
  v: number,
  kasten: Kasten = RAUM
): Punkt {
  const u = seite === "links" ? 0 : 1;
  const oben = decke(t, u, kasten);
  const unten = boden(t, u, kasten);
  return { x: oben.x, y: lerp(oben.y, unten.y, v) };
}

/** Ein Punkt auf der Rückwand, in deren eigenen Anteilen. */
export function rueckwand(u: number, v: number, kasten: Kasten = RAUM): Punkt {
  return {
    x: lerp(kasten.links, kasten.rechts, u),
    y: lerp(kasten.oben, kasten.unten, v),
  };
}

/** Punkte zu einem SVG-Polygon machen. */
export function flaeche(...punkte: Punkt[]): string {
  return punkte.map((p) => `${runde(p.x)},${runde(p.y)}`).join(" ");
}

function runde(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * Wie groß ein Ding in dieser Tiefe erscheint.
 *
 * Ein Tisch hinten im Raum ist derselbe Tisch wie vorne, nur kleiner. Der
 * Faktor kommt aus der Breite des Raums an dieser Stelle — so schrumpft
 * alles im selben Maß wie der Raum selbst.
 */
export function massstab(t: number, kasten: Kasten = RAUM): number {
  const vorne = BUEHNE.breite;
  const hier = lerp(BUEHNE.breite, kasten.rechts, t) - lerp(0, kasten.links, t);
  return hier / vorne;
}

/**
 * Gleichmäßig verteilte Plätze quer durch den Raum.
 *
 * Für Dinge, die in einer Reihe stehen: n Plätze, jeweils mit ihrem eigenen
 * Mittelpunkt und etwas Luft zum Rand.
 */
export function plaetze(n: number, rand = 0.06): number[] {
  if (n <= 0) return [];
  if (n === 1) return [0.5];
  const breite = 1 - 2 * rand;
  return Array.from({ length: n }, (_, i) => rand + (breite * i) / (n - 1));
}
