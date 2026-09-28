import type { Metadata } from "next";
import {
  Brain,
  Clock,
  Layers,
  Monitor,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Users,
} from "lucide-react";
import {
  Backdrop,
  Card,
  Container,
  Eyebrow,
  HERO_OVERLAY,
  Headline,
  KeywordList,
  Rule,
  SectionTitle,
} from "@/components/marketing/pieces";

export const metadata: Metadata = {
  title: "Leistungen",
  description:
    "Analyse, Digitalisierung, Automatisierung, Implementierung, KI-Integration und individuelle Lösungen — von der Strategie bis zur Umsetzung.",
};

const LEISTUNGEN = [
  {
    icon: <Search size={26} strokeWidth={1.5} />,
    title: "Analyse von Unternehmensprozessen",
    text: "Wir identifizieren Potenziale und entwickeln eine klare Digitalisierungsstrategie.",
  },
  {
    icon: <Layers size={26} strokeWidth={1.5} />,
    title: "Digitalisierung",
    text: "Wir übertragen analoge und manuelle Abläufe in effiziente, digitale Prozesse.",
  },
  {
    icon: <Settings size={26} strokeWidth={1.5} />,
    title: "Automatisierung",
    text: "Wir reduzieren manuelle Tätigkeiten und schaffen effiziente, skalierbare Abläufe.",
  },
  {
    icon: <Monitor size={26} strokeWidth={1.5} />,
    title: "Implementierung von Systemen",
    text: "Wir führen passende Systeme ein und integrieren diese nahtlos in Ihre bestehende Infrastruktur.",
  },
  {
    icon: <Brain size={26} strokeWidth={1.5} />,
    title: "KI-Integration",
    text: "Wir nutzen künstliche Intelligenz dort, wo sie echten Mehrwert schafft – sicher, sinnvoll und praxisorientiert.",
  },
  {
    icon: <SlidersHorizontal size={26} strokeWidth={1.5} />,
    title: "Individuelle Lösungen",
    text: "Wir entwickeln maßgeschneiderte Konzepte, die exakt zu Ihren Anforderungen passen, und optimieren bestehende Abläufe nachhaltig.",
  },
];

export default function LeistungenPage() {
  return (
    <>
      {/* ── Kopfbereich ──────────────────────────────────────────────────── */}
      <Backdrop
        src="/marketing/leistungen-gebaeude.jpg"
        overlay={HERO_OVERLAY}
      >
        <Container className="relative py-16 sm:py-20">
          <div className="absolute right-5 top-8 hidden sm:block sm:right-8">
            <KeywordList items={["Technologie", "Menschen", "Potenzial"]} />
          </div>

          <div className="max-w-xl space-y-6">
            <Eyebrow>Unternehmen neu denken</Eyebrow>
            <Headline
              lead={
                <>
                  Aus Prozessen
                  <br />
                  Möglichkeiten
                </>
              }
              accent="machen."
            />
            <p className="text-[#9fb2c9] text-[15px] leading-relaxed">
              Wir analysieren, digitalisieren und automatisieren Ihre Unternehmensprozesse – von
              der Strategie bis zur Umsetzung. Effizient, individuell und zukunftssicher.
            </p>
            <div className="space-y-4 pt-2">
              <Rule />
              <p className="text-[#7d90ab] text-[11px] uppercase tracking-[0.28em]">
                Analysieren. Entwickeln. Realisieren.
              </p>
            </div>
          </div>
        </Container>
      </Backdrop>

      {/* ── Leistungen ───────────────────────────────────────────────────── */}
      <section className="border-t border-[#102138] bg-[#070c15]">
        <Container className="py-16 sm:py-20">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] lg:items-start">
            <div className="space-y-5">
              <Eyebrow>Unsere Leistungen</Eyebrow>
              <SectionTitle
                lead={
                  <>
                    Ganzheitliche Digitalisierung
                    <br />
                    für
                  </>
                }
                accent="Ihr Unternehmen."
              />
            </div>

            <div className="border-l border-[#1a3050] pl-6 space-y-4 lg:pt-8">
              <p className="text-[#9fb2c9] text-sm leading-relaxed">
                Wir begleiten Sie von der Analyse bis zur Umsetzung und schaffen digitale Lösungen,
                die wirklich funktionieren. Praxisnah, effizient und auf Ihre Ziele abgestimmt.
              </p>
              <p className="text-[#7d90ab] text-[11px] uppercase tracking-[0.24em] leading-relaxed">
                Mehr Effizienz. Mehr Freiraum. Mehr Möglichkeiten.
              </p>
            </div>
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {LEISTUNGEN.map((leistung) => (
              <Card key={leistung.title} icon={leistung.icon} title={leistung.title}>
                {leistung.text}
              </Card>
            ))}
          </div>
        </Container>
      </section>

      {/* ── Eigene Lösung: OKUN Workforce ────────────────────────────────── */}
      {/*
        Das Banner ist heller und blauer als der Rest der Seite. Ungemildert
        klebt es als Fremdkörper in der Seite — deshalb laufen seine Kanten in
        die Seitenfarbe aus und ein leichter Schleier nimmt ihm die Härte. Der
        Blick soll auf dem Gerät landen, nicht auf der Naht.

        Auf dem Telefon steht das Banner nicht: Seine Schrift wäre bei 390 px
        wenige Pixel hoch und weder lesbar noch vorlesbar. Dort trägt derselbe
        Inhalt echte Schrift — im selben Gewand, nicht als Notlösung.
      */}
      <section className="relative overflow-hidden border-t border-[#102138] bg-[#060a11]">
        <div className="relative hidden lg:block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/marketing/workforce-banner.jpg"
            alt="OKUN Workforce — digitale HR-Prozesse von der Dienstplanung bis zur Lohnabrechnung: effizientere Personalprozesse, weniger Fehler, mehr Zeit für das Wesentliche."
            className="block w-full"
          />
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                // Eng an den Kanten: Weiter innen läge der Schleier auf der
                // Wortmarke und den drei Punkten und nähme ihnen das Weiß.
                "linear-gradient(180deg,#060a11 0%,rgba(6,10,17,0.5) 4%,rgba(6,10,17,0) 13%," +
                "rgba(6,10,17,0) 86%,rgba(6,10,17,0.5) 96%,#060a11 100%)",
            }}
          />
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "linear-gradient(90deg,#060a11 0%,rgba(6,10,17,0.3) 2%,rgba(6,10,17,0) 9%," +
                "rgba(6,10,17,0) 93%,rgba(6,10,17,0.35) 98%,#060a11 100%)",
            }}
          />
          <span aria-hidden className="pointer-events-none absolute inset-0 bg-[rgba(6,10,17,0.1)]" />
        </div>

        {/* ── Dieselbe Aussage für schmale Bildschirme ── */}
        <div className="lg:hidden">
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(120% 75% at 85% 45%,rgba(20,86,163,0.34) 0%,rgba(9,24,46,0.5) 45%,rgba(6,10,17,0) 75%)",
            }}
          />

          <Container className="relative py-14">
            <Eyebrow>Eine unserer eigenen Lösungen</Eyebrow>

            <div className="mt-5">
              <p className="text-[#f4f8fd] text-[34px] font-bold leading-[0.95] tracking-tight">
                OKUN
              </p>
              <p className="text-[#38a9f5] text-[38px] font-bold leading-tight tracking-tight">
                Workforce
              </p>
            </div>

            <h3 className="mt-4 text-[#f4f8fd] text-[16px] font-semibold leading-snug">
              Digitale HR-Prozesse. Mehr Zeit für das Wesentliche.
            </h3>

            <p className="mt-3 text-[#9fb2c9] text-[15px] leading-relaxed">
              OKUN Workforce digitalisiert und automatisiert alle HR-Prozesse von der
              Dienstplanung bis zur Lohnabrechnung. So sparen Sie Zeit, reduzieren Fehler und
              schaffen mehr Freiraum für das, was wirklich zählt: Ihre Mitarbeitenden und
              Mitarbeiter.
            </p>

            <Rule className="mt-6" />

            {/* Das Gerät bekommt Luft und einen Schein, statt in einem Kasten
                zu sitzen — so wirkt es wie im Banner. */}
            <div className="relative mt-7">
              <span
                aria-hidden
                className="pointer-events-none absolute -inset-x-6 -inset-y-4 rounded-[28px]"
                style={{
                  background:
                    "radial-gradient(70% 70% at 50% 45%,rgba(35,126,214,0.35) 0%,rgba(6,10,17,0) 70%)",
                }}
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/marketing/workforce.jpg"
                alt="OKUN Workforce auf Laptop und Telefon: Dashboard mit Mitarbeiterzahl, offenen Schichten und Einsatzplanung."
                className="relative block w-full rounded-2xl border border-[#16304f]"
              />
            </div>

            {/* Die drei Punkte wie im Banner: Zeichen oben, Trennstriche dazwischen. */}
            <ul className="mt-8 grid grid-cols-3 gap-0">
              {[
                { icon: <Users size={22} strokeWidth={1.4} />, lines: ["Effizientere", "Personalprozesse"] },
                { icon: <ShieldCheck size={22} strokeWidth={1.4} />, lines: ["Weniger Fehler", "Mehr Sicherheit"] },
                { icon: <Clock size={22} strokeWidth={1.4} />, lines: ["Mehr Zeit für", "das Wesentliche"] },
              ].map((item, index) => (
                <li
                  key={item.lines.join()}
                  className={`flex flex-col items-center gap-2.5 px-1.5 text-center ${
                    index > 0 ? "border-l border-[#16304f]" : ""
                  }`}
                >
                  <span className="text-[#38a9f5]">{item.icon}</span>
                  {/* Die Zeilen stehen fest: „Weniger Fehler / Mehr Sicherheit"
                      sind zwei Aussagen und sollen nicht beliebig umbrechen. */}
                  <span className="text-[#c2d0e2] text-[11px] leading-snug whitespace-nowrap">
                    {item.lines[0]}
                    <br />
                    {item.lines[1]}
                  </span>
                </li>
              ))}
            </ul>
          </Container>
        </div>
      </section>

    </>
  );
}
