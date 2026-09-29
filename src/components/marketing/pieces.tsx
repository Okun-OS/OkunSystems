import Link from "next/link";

/**
 * Bausteine der Website.
 *
 * Die Seite lebt von wenigen, immer gleichen Formen: der Versalien-Zeile über
 * jeder Überschrift, der blau gesetzten zweiten Satzhälfte, dem kurzen Strich
 * als Abschluss und den Karten mit Verlauf. Sie stehen hier einmal, damit
 * jede Seite gleich aussieht und eine Änderung an einer Stelle reicht.
 */

/** Kleine gesperrte Versalien-Zeile über einer Überschrift. */
export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[#7d90ab] text-[11px] font-medium uppercase tracking-[0.28em] leading-relaxed">
      {children}
    </p>
  );
}

/** Der kurze blaue Strich, der einen Abschnitt abschließt. */
export function Rule({ className = "" }: { className?: string }) {
  return <span className={`block h-px w-10 bg-[#2f7fd4] ${className}`} />;
}

/** Überschrift mit blau gesetztem Schluss — die Handschrift der Seite. */
export function Headline({
  lead,
  accent,
  className = "",
}: {
  lead: React.ReactNode;
  accent?: React.ReactNode;
  className?: string;
}) {
  return (
    <h1
      className={`text-[#f4f8fd] font-bold tracking-tight leading-[1.08] text-[34px] sm:text-[44px] lg:text-[52px] ${className}`}
    >
      {lead}
      {accent && (
        <>
          {" "}
          <span className="text-[#38a9f5]">{accent}</span>
        </>
      )}
    </h1>
  );
}

/** Dieselbe Form eine Stufe kleiner, für Abschnitte innerhalb einer Seite. */
export function SectionTitle({
  lead,
  accent,
}: {
  lead: React.ReactNode;
  accent?: React.ReactNode;
}) {
  return (
    <h2 className="text-[#f4f8fd] font-bold tracking-tight leading-[1.15] text-[26px] sm:text-[32px] lg:text-[38px]">
      {lead}
      {accent && (
        <>
          {" "}
          <span className="text-[#38a9f5]">{accent}</span>
        </>
      )}
    </h2>
  );
}

/** Die gesperrte Stichwortspalte am rechten Rand. */
export function KeywordList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1.5 text-right">
      {items.map((item) => (
        <li
          key={item}
          className="text-[#7d90ab] text-[10px] uppercase tracking-[0.28em]"
        >
          {item}
        </li>
      ))}
    </ul>
  );
}

/** Karte mit Verlauf — für Kernbereiche, Leistungen und Ansprüche. */
export function Card({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-[#16304f] bg-[linear-gradient(160deg,#0d1b2e_0%,#0a1524_100%)] p-5 sm:p-6 flex flex-col gap-3">
      <span className="text-[#38a9f5]">{icon}</span>
      <h3 className="text-[#f4f8fd] text-[15px] font-semibold leading-snug">{title}</h3>
      <p className="text-[#9fb2c9] text-sm leading-relaxed flex-1">{children}</p>
      <Rule />
    </div>
  );
}

/**
 * Der Knopf, der durch die ganze Seite führt.
 *
 * Zeigt er nach außen — etwa auf die Terminbuchung — öffnet er einen neuen
 * Tab und sagt es auch: Wer mitten im Lesen war, soll die Seite nicht
 * verlieren, und wer vorgelesen bekommt, soll es hören.
 */
export function PrimaryButton({
  href,
  children,
  className = "",
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  const classes = `inline-flex items-center justify-center gap-2 rounded-lg border border-[#2f7fd4]/60 bg-[linear-gradient(180deg,#1668c4_0%,#0d4f9e_100%)] px-5 py-3 text-sm font-semibold text-white transition-colors hover:border-[#4aa3ef] hover:bg-[linear-gradient(180deg,#1b78da_0%,#105ab0_100%)] ${className}`;
  const isExternal = href.startsWith("http");

  if (isExternal) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={classes}>
        {children}
        <span className="sr-only"> (öffnet in neuem Tab)</span>
        <span aria-hidden>→</span>
      </a>
    );
  }

  return (
    <Link href={href} className={classes}>
      {children}
      <span aria-hidden>→</span>
    </Link>
  );
}

/**
 * Ein Bildbereich, der auch ohne Bild bestehen kann.
 *
 * Die Fotos liegen unter `public/marketing/`. Fehlt eines, bleibt der Verlauf
 * stehen — die Seite bricht nicht, sie ist nur ruhiger.
 */
export function Backdrop({
  src,
  alt = "",
  className = "",
  children,
  overlay = "linear-gradient(180deg,rgba(6,10,16,0.35) 0%,rgba(6,10,16,0.92) 100%)",
}: {
  src?: string;
  alt?: string;
  className?: string;
  children?: React.ReactNode;
  overlay?: string;
}) {
  return (
    <div className={`relative overflow-hidden bg-[#060a10] ${className}`}>
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(120%_90%_at_70%_20%,#10314f_0%,#070d17_55%,#05080e_100%)]"
      />
      {src && (
        // Als Hintergrundbild, nicht als <img>: fehlt die Datei, bleibt der
        // Verlauf stehen, statt ein kaputtes Bildsymbol zu zeigen.
        <div
          role={alt ? "img" : undefined}
          aria-label={alt || undefined}
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${src})` }}
        />
      )}
      <div aria-hidden className="absolute inset-0" style={{ background: overlay }} />
      <div className="relative">{children}</div>
    </div>
  );
}

/**
 * Der Verlauf über einem Kopfbild.
 *
 * Zwei Lagen: eine von links, die dem Text dunklen Grund gibt, und eine nach
 * unten, die den Übergang zum nächsten Abschnitt schließt. Ohne die erste
 * verschwindet die Schrift auf hellen Fotos — Himmel, Glasfassaden, Mittag.
 */
export const HERO_OVERLAY =
  "linear-gradient(90deg,rgba(6,10,17,0.95) 0%,rgba(6,10,17,0.88) 34%,rgba(6,10,17,0.55) 68%,rgba(6,10,17,0.4) 100%)," +
  "linear-gradient(180deg,rgba(6,10,17,0.45) 0%,rgba(6,10,17,0.3) 50%,rgba(6,10,17,0.96) 100%)";

/**
 * Derselbe Verlauf, aber viel zurückhaltender — für dunkle Kopffotos.
 *
 * Wie viel Deckung die Schrift braucht, hängt am Foto. Über der hellen
 * Glasfassade und dem Mittagslicht am Potsdamer Platz braucht sie die volle
 * Stärke, über den Nachtbergen nicht: dort war die linke Seite unter
 * `HERO_OVERLAY` praktisch schwarz, und vom Bild blieb nur der rechte Rand
 * übrig. Ein gemeinsamer Wert für alle vier Köpfe hieße also: entweder dort
 * verschwindet die Schrift oder hier das Foto.
 */
export const HERO_OVERLAY_SOFT =
  "linear-gradient(90deg,rgba(6,10,17,0.6) 0%,rgba(6,10,17,0.5) 30%,rgba(6,10,17,0.26) 62%,rgba(6,10,17,0.12) 100%)," +
  "linear-gradient(180deg,rgba(6,10,17,0.3) 0%,rgba(6,10,17,0.18) 45%,rgba(6,10,17,0.94) 100%)";

/** Der Seitenrahmen — überall dieselbe Breite. */
export function Container({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`mx-auto w-full max-w-[1180px] px-5 sm:px-8 ${className}`}>{children}</div>
  );
}
