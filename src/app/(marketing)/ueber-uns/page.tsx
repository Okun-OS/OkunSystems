import type { Metadata } from "next";
import { BarChart3, Target, Users } from "lucide-react";
import { ClosingQuote } from "@/components/marketing/closing-quote";
import {
  Backdrop,
  Card,
  Container,
  Eyebrow,
  Headline,
  KeywordList,
  Rule,
  SectionTitle,
} from "@/components/marketing/pieces";

export const metadata: Metadata = {
  title: "Über uns",
  description:
    "OKUN Systems entwickelt digitale Lösungen, die Unternehmen dabei unterstützen, Prozesse einfacher, effizienter und zukunftsfähiger zu gestalten.",
};

export default function UeberUnsPage() {
  return (
    <>
      {/* ── Kopfbereich ──────────────────────────────────────────────────── */}
      <Backdrop
        src="/marketing/ueber-uns-hero.jpg"
        overlay="linear-gradient(180deg,rgba(6,10,17,0.55) 0%,rgba(6,10,17,0.7) 55%,rgba(6,10,17,0.97) 100%)"
      >
        <Container className="relative py-16 sm:py-20">
          <div className="absolute right-5 top-8 hidden sm:block sm:right-8">
            <KeywordList items={["Technologie", "Menschen", "Potenzial"]} />
          </div>

          <div className="max-w-xl space-y-6">
            <Eyebrow>Menschen. Ideen. Lösungen.</Eyebrow>
            <Headline lead={<>Technologie mit einem</>} accent="klaren Ziel." />
            <p className="text-[#9fb2c9] text-[15px] leading-relaxed">
              OKUN Systems entwickelt digitale Lösungen, die Unternehmen dabei unterstützen,
              Prozesse einfacher, effizienter und zukunftsfähiger zu gestalten. Wir verbinden
              technologisches Know-how mit einem klaren Verständnis für die Anforderungen des
              operativen Alltags.
            </p>
            <div className="space-y-4 pt-2">
              <Rule />
              <p className="text-[#7d90ab] text-[11px] uppercase tracking-[0.28em]">
                Effizienter. Digitaler. Zukunftssicher.
              </p>
            </div>
          </div>
        </Container>
      </Backdrop>

      {/* ── Motivation ───────────────────────────────────────────────────── */}
      <section className="border-t border-[#102138] bg-[#070c15]">
        <Container className="py-16 sm:py-20">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.62fr)_minmax(0,0.6fr)] lg:items-start">
            <div className="space-y-5">
              <Eyebrow>Unsere Motivation</Eyebrow>
              <h2 className="text-[#f4f8fd] text-[26px] sm:text-[32px] lg:text-[38px] font-bold tracking-tight leading-[1.15]">
                <span className="text-[#38a9f5]">Mehr</span> als Technologie.
              </h2>

              <p className="text-[#9fb2c9] text-[15px] leading-relaxed">
                Wir haben OKUN Systems gegründet, weil wir überzeugt sind, dass Digitalisierung
                mehr ist als der Einsatz neuer Software. Technologie sollte Arbeit vereinfachen,
                Ressourcen sinnvoll einsetzen und Unternehmen echten Freiraum für ihre Entwicklung
                geben.
              </p>
              <p className="text-[#9fb2c9] text-[15px] leading-relaxed">
                Deshalb entwickeln wir Lösungen nicht um der Technologie willen, sondern dort, wo
                sie im täglichen Betrieb einen messbaren Unterschied machen.
              </p>

              <div className="space-y-4 pt-2">
                <Rule />
                <p className="text-[#7d90ab] text-[11px] uppercase tracking-[0.24em]">
                  Ideen in Lösungen. Für eine starke Zukunft.
                </p>
              </div>
            </div>

            {/* Porträt */}
            <div className="max-w-[280px] w-full">
              <Backdrop
                src="/marketing/felix-okun.jpg"
                alt="Felix Okun, Geschäftsführer von OKUN Systems"
                className="rounded-xl border border-[#16304f] aspect-[3/4]"
                overlay="linear-gradient(180deg,rgba(6,10,17,0) 55%,rgba(6,10,17,0.85) 100%)"
              >
                <div className="flex h-full min-h-[320px] flex-col justify-end p-4">
                  <p className="text-[#f4f8fd] text-[22px] italic leading-tight">Felix Okun</p>
                  <p className="text-[#9fb2c9] text-xs mt-1">Geschäftsführer · OKUN Systems</p>
                </div>
              </Backdrop>
            </div>

            {/* Zitat */}
            <div className="space-y-5 lg:pt-6">
              <blockquote className="text-[#dce8f6] text-[20px] sm:text-[22px] italic leading-relaxed">
                &bdquo;Technologie entfaltet ihren Wert erst dann, wenn sie Menschen wirklich
                weiterbringt.&ldquo;
              </blockquote>
              <Rule />
            </div>
          </div>
        </Container>
      </section>

      {/* ── Anspruch ─────────────────────────────────────────────────────── */}
      <section className="border-t border-[#102138] bg-[#060a11]">
        <Container className="py-16 sm:py-20">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)] lg:items-start">
            <div className="space-y-5">
              <Eyebrow>Unser Anspruch</Eyebrow>
              <SectionTitle lead="Lösungen, die" accent="wirklich wirken." />
              <p className="text-[#9fb2c9] text-[15px] leading-relaxed">
                Unser Ziel ist es, digitale Strukturen zu schaffen, die langfristig funktionieren
                und mit Unternehmen wachsen. Dafür analysieren wir bestehende Prozesse,
                hinterfragen gewohnte Abläufe und entwickeln Lösungen, die zu den tatsächlichen
                Anforderungen eines Unternehmens passen – mit bestehenden Technologien,
                individuellen Entwicklungen und eigenen Systemen.
              </p>
              <div className="space-y-4 pt-2">
                <Rule />
                <p className="text-[#7d90ab] text-[11px] uppercase tracking-[0.24em]">
                  Langfristige Partnerschaften. Echte Ergebnisse.
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <Card icon={<Target size={26} strokeWidth={1.5} />} title="Klare Ziele">
                Wir fokussieren auf Lösungen mit messbarem Mehrwert.
              </Card>
              <Card icon={<Users size={26} strokeWidth={1.5} />} title="Praxisnah">
                Technologie, die im Alltag funktioniert – nicht nur auf dem Papier.
              </Card>
              <Card icon={<BarChart3 size={26} strokeWidth={1.5} />} title="Nachhaltig">
                Wir denken langfristig und schaffen digitale Strukturen, die mitwachsen.
              </Card>
            </div>
          </div>
        </Container>
      </section>

      <ClosingQuote />
    </>
  );
}
