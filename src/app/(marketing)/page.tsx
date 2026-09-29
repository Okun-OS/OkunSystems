import { Brain, Layers, Settings, Share2, Code2, Database, ShieldCheck } from "lucide-react";
import {
  Backdrop,
  Card,
  Container,
  Eyebrow,
  HERO_OVERLAY_SOFT,
  Headline,
  KeywordList,
  PrimaryButton,
  Rule,
  SectionTitle,
} from "@/components/marketing/pieces";
import { OkunRing } from "@/components/marketing/okun-ring";
import { BOOKING_URL } from "@/lib/marketing/company";

/** Startseite. */
export default function HomePage() {
  return (
    <>
      {/* ── Kopfbereich ──────────────────────────────────────────────────── */}
      <Backdrop
        src="/marketing/hero-berge.jpg"
        overlay={HERO_OVERLAY_SOFT}
      >
        <Container className="relative py-16 sm:py-20 lg:py-24">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)] lg:items-center">
            <div className="space-y-6">
              <Eyebrow>
                Digitale Lösungen
                <br />
                für eine starke Zukunft
              </Eyebrow>

              <Headline
                lead={
                  <>
                    Automatisieren.
                    <br />
                    Optimieren.
                  </>
                }
                accent={
                  <>
                    <br className="hidden sm:block" />
                    Zukunft sichern.
                  </>
                }
                className="!text-[38px] sm:!text-[52px] lg:!text-[60px]"
              />

              <p className="max-w-lg text-[#9fb2c9] text-[15px] leading-relaxed">
                OKUN Systems entwickelt individuelle digitale Lösungen, Automatisierungen und
                Infrastrukturen, die Prozesse vereinfachen, Ressourcen sparen und Wachstum
                ermöglichen.
              </p>

              <div className="space-y-4 pt-2">
                <Rule />
                <p className="text-[#7d90ab] text-[11px] uppercase tracking-[0.28em]">
                  Ideen. Systeme. Fortschritt.
                </p>
              </div>

              <div className="pt-2">
                <PrimaryButton href={BOOKING_URL}>Strategiegespräch vereinbaren</PrimaryButton>
              </div>
            </div>

            <div className="flex items-center justify-center lg:justify-end">
              <OkunRing className="w-[260px] sm:w-[340px] lg:w-[400px]" />
            </div>
          </div>
        </Container>
      </Backdrop>

      {/* ── Unser Ansatz ─────────────────────────────────────────────────── */}
      <section className="border-t border-[#102138] bg-[#070c15]">
        <Container className="py-16 sm:py-20">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
            <div className="space-y-5 max-w-2xl">
              <Eyebrow>Unser Ansatz</Eyebrow>
              <SectionTitle
                lead={
                  <>
                    Digitale Systeme,
                    <br />
                    die im Alltag funktionieren.
                  </>
                }
              />
              <p className="text-[#9fb2c9] text-[15px] leading-relaxed">
                Wir entwickeln digitale Lösungen, die sich an Ihrem Unternehmen orientieren –
                individuell, effizient und praxisnah. Dabei verbinden wir strategisches Denken mit
                technischer Umsetzung und eigener Software.
              </p>
            </div>

            <div className="hidden lg:block border-l border-[#1a3050] pl-8">
              <KeywordList items={["Mehr Effizienz", "Mehr Freiraum", "Mehr Möglichkeiten"]} />
            </div>
          </div>

          <div className="mt-12 space-y-5">
            <Eyebrow>Unsere Kernbereiche</Eyebrow>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card icon={<Settings size={26} strokeWidth={1.5} />} title="Automatisierung">
                Prozesse effizienter gestalten und manuelle Abläufe reduzieren.
              </Card>
              <Card icon={<Layers size={26} strokeWidth={1.5} />} title="Digitale Systeme">
                Individuelle Lösungen für operative Unternehmensprozesse.
              </Card>
              <Card icon={<Brain size={26} strokeWidth={1.5} />} title="KI & intelligente Lösungen">
                Künstliche Intelligenz dort einsetzen, wo sie echten Mehrwert schafft.
              </Card>
              <Card icon={<Share2 size={26} strokeWidth={1.5} />} title="Digitale Infrastruktur">
                Systeme verbinden und eine skalierbare digitale Grundlage schaffen.
              </Card>
            </div>
          </div>
        </Container>
      </section>

      {/* ── Unser Unterschied ────────────────────────────────────────────── */}
      <section className="border-t border-[#102138]">
        <div className="grid lg:grid-cols-2">
          <Backdrop
            src="/marketing/platine.jpg"
            className="min-h-[280px] lg:min-h-[420px]"
            overlay="linear-gradient(90deg,rgba(6,10,17,0.25) 0%,rgba(6,10,17,0.15) 55%,rgba(6,10,17,0.75) 100%)"
          >
            <div className="h-full min-h-[280px] lg:min-h-[420px]" />
          </Backdrop>

          <div className="bg-[#070c15] flex items-center">
            <div className="px-5 py-14 sm:px-10 lg:px-14 space-y-5 max-w-xl">
              <Eyebrow>Unser Unterschied</Eyebrow>
              <SectionTitle lead="Nicht nur beraten." accent="Systeme schaffen." />
              <p className="text-[#9fb2c9] text-[15px] leading-relaxed">
                Wir setzen nicht ausschließlich auf bestehende Lösungen. OKUN Systems entwickelt
                auch eigene Software und Systeme, um Prozesse dort zu digitalisieren, wo
                Standardlösungen an ihre Grenzen kommen.
              </p>
              <Rule className="!w-8" />
              <div className="flex flex-wrap gap-x-8 gap-y-3 pt-1">
                {[
                  { icon: <Code2 size={16} strokeWidth={1.5} />, label: "Eigene Systeme" },
                  { icon: <Database size={16} strokeWidth={1.5} />, label: "Individuelle Entwicklung" },
                  { icon: <ShieldCheck size={16} strokeWidth={1.5} />, label: "Externe Technologien" },
                ].map((item) => (
                  <span key={item.label} className="flex items-center gap-2 text-[#c2d0e2] text-[13px]">
                    <span className="text-[#38a9f5]">{item.icon}</span>
                    {item.label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
