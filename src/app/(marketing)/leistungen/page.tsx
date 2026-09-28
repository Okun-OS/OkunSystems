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
        Auf dem Bildschirm steht das fertige Banner, so wie es gestaltet wurde.
        Auf dem Telefon nicht: Seine Schrift wäre dort wenige Pixel hoch und
        damit unlesbar. Deshalb trägt die schmale Ansicht denselben Inhalt als
        echten Text — eine Aussage, zwei Darstellungen.
      */}
      <section className="border-t border-[#102138] bg-[#060a11]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/marketing/workforce-banner.jpg"
          alt="OKUN Workforce — digitale HR-Prozesse von der Dienstplanung bis zur Lohnabrechnung: effizientere Personalprozesse, weniger Fehler, mehr Zeit für das Wesentliche."
          className="hidden lg:block w-full"
        />

        <Container className="py-14 lg:hidden">
          <Eyebrow>Eine unserer eigenen Lösungen</Eyebrow>

          <div className="mt-6 space-y-5">
            <div>
              <p className="text-[#f4f8fd] text-[30px] font-bold leading-none tracking-tight">
                OKUN
              </p>
              <p className="text-[#38a9f5] text-[34px] font-bold leading-tight tracking-tight">
                Workforce
              </p>
            </div>

            <h3 className="text-[#f4f8fd] text-[17px] font-semibold">
              Digitale HR-Prozesse. Mehr Zeit für das Wesentliche.
            </h3>

            <p className="text-[#9fb2c9] text-[15px] leading-relaxed">
              OKUN Workforce digitalisiert und automatisiert alle HR-Prozesse von der
              Dienstplanung bis zur Lohnabrechnung. So sparen Sie Zeit, reduzieren Fehler und
              schaffen mehr Freiraum für das, was wirklich zählt: Ihre Mitarbeitenden und
              Mitarbeiter.
            </p>

            <Backdrop
              src="/marketing/workforce.jpg"
              className="rounded-2xl border border-[#16304f] min-h-[240px]"
              overlay="linear-gradient(180deg,rgba(6,10,17,0.1) 0%,rgba(6,10,17,0.35) 100%)"
            >
              <div className="min-h-[240px]" />
            </Backdrop>

            <div className="grid gap-4 pt-1 sm:grid-cols-3">
              {[
                { icon: <Users size={18} strokeWidth={1.5} />, lines: ["Effizientere", "Personalprozesse"] },
                { icon: <ShieldCheck size={18} strokeWidth={1.5} />, lines: ["Weniger Fehler", "Mehr Sicherheit"] },
                { icon: <Clock size={18} strokeWidth={1.5} />, lines: ["Mehr Zeit für", "das Wesentliche"] },
              ].map((item) => (
                <div key={item.lines.join()} className="flex items-start gap-2.5">
                  <span className="text-[#38a9f5] mt-0.5">{item.icon}</span>
                  <span className="text-[#c2d0e2] text-[13px] leading-snug">
                    {item.lines[0]}
                    <br />
                    {item.lines[1]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Container>
      </section>

    </>
  );
}
