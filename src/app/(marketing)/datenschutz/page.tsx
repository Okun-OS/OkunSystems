import type { Metadata } from "next";
import { Container, Eyebrow, Rule } from "@/components/marketing/pieces";
import { ClosingQuote } from "@/components/marketing/closing-quote";

export const metadata: Metadata = {
  title: "Datenschutz",
  description: "Datenschutzerklärung der OKUN SYSTEMS UG (haftungsbeschränkt).",
  robots: { index: false },
};

/**
 * Datenschutzerklärung.
 *
 * Der Rahmen steht, der Text kommt aus dem Unternehmen: Eine
 * Datenschutzerklärung ist ein Rechtstext und wird nicht geschrieben, sondern
 * übernommen. Bis der freigegebene Text vorliegt, steht das hier auch so da —
 * lieber ein ehrlicher Hinweis als eine erfundene Erklärung.
 */
export default function DatenschutzPage() {
  return (
    <>
      <section className="border-b border-[#102138] bg-[radial-gradient(120%_100%_at_75%_30%,#10314f_0%,#070d17_55%,#05080e_100%)]">
        <Container className="py-14 sm:py-16">
          <div className="max-w-2xl space-y-4">
            <Eyebrow>Rechtliches</Eyebrow>
            <h1 className="text-[#f4f8fd] text-[40px] sm:text-[52px] font-bold tracking-tight leading-none">
              Datenschutz
            </h1>
            <p className="text-[#c2d0e2] text-[17px]">Ihre Daten, nachvollziehbar behandelt.</p>
            <div className="space-y-4 pt-2">
              <Rule />
              <p className="text-[#7d90ab] text-[11px] uppercase tracking-[0.28em]">
                Klar. Verlässlich. Verantwortungsvoll.
              </p>
            </div>
          </div>
        </Container>
      </section>

      <section className="bg-[#070c15]">
        <Container className="py-14 sm:py-16">
          <div className="max-w-2xl space-y-5">
            <div className="rounded-xl border border-[#16304f] bg-[#0b1626] p-6">
              <p className="text-[#f4f8fd] text-sm font-semibold mb-2">
                Der freigegebene Text wird hier eingesetzt.
              </p>
              <p className="text-[#9fb2c9] text-sm leading-relaxed">
                Bis dahin erreichen Sie uns für alle Fragen zum Datenschutz unter{" "}
                <a
                  href="mailto:kontakt@okun-systems.com"
                  className="text-[#38a9f5] hover:underline underline-offset-4"
                >
                  kontakt@okun-systems.com
                </a>
                .
              </p>
            </div>

            <p className="text-[#8fa3bc] text-sm leading-relaxed">
              Verantwortliche Stelle im Sinne der Datenschutz-Grundverordnung ist die OKUN SYSTEMS
              UG (haftungsbeschränkt), Potsdamer Platz 1, 10785 Berlin.
            </p>
          </div>
        </Container>
      </section>

      <ClosingQuote />
    </>
  );
}
