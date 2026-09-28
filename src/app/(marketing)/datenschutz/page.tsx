import type { Metadata } from "next";
import { Container, Eyebrow, Rule } from "@/components/marketing/pieces";
import { ClosingQuote } from "@/components/marketing/closing-quote";
import { PRIVACY_SECTIONS, PRIVACY_UPDATED, type PrivacyBlock } from "./content";

export const metadata: Metadata = {
  title: "Datenschutz",
  description:
    "Datenschutzerklärung der OKUN SYSTEMS UG (haftungsbeschränkt): welche personenbezogenen Daten beim Besuch dieser Website, bei der Kontaktaufnahme und bei der Terminbuchung verarbeitet werden.",
};

/**
 * Die Datenschutzerklärung.
 *
 * Der Text steht in content.ts, hier steht nur, wie er aussieht. Zahlen an
 * den Abschnitten kommen aus der Reihenfolge — verschiebt sich etwas, stimmt
 * die Nummerierung trotzdem.
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
          <div className="max-w-2xl space-y-10">
            {PRIVACY_SECTIONS.map((section, index) => (
              <section key={section.title} className="space-y-3">
                <h2 className="flex gap-3 text-[#38a9f5] text-[11px] font-medium uppercase tracking-[0.2em] leading-relaxed">
                  <span className="text-[#2f7fd4] tabular-nums">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span>{section.title}</span>
                </h2>
                <div className="space-y-3 pl-0 sm:pl-9">
                  {section.blocks.map((block, blockIndex) => (
                    <Block key={blockIndex} block={block} />
                  ))}
                </div>
              </section>
            ))}

            <p className="border-t border-[#12203a] pt-6 text-[#6f8299] text-sm">
              Stand: {PRIVACY_UPDATED}
            </p>
          </div>
        </Container>
      </section>

      <ClosingQuote />
    </>
  );
}

function Block({ block }: { block: PrivacyBlock }) {
  switch (block.kind) {
    case "text":
      return <p className="text-[#a8bacf] text-sm leading-relaxed">{block.text}</p>;

    case "list":
      return (
        <ul className="space-y-1.5">
          {block.items.map((item) => (
            <li key={item} className="flex gap-2.5 text-[#a8bacf] text-sm leading-relaxed">
              <span aria-hidden className="mt-2 h-1 w-1 flex-shrink-0 rounded-full bg-[#2f7fd4]" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      );

    case "term":
      return (
        <div className="pt-1">
          <p className="text-[#e3ecf7] text-sm font-semibold">{block.title}</p>
          <p className="mt-1 text-[#a8bacf] text-sm leading-relaxed">{block.text}</p>
        </div>
      );

    case "address":
      return (
        <address className="not-italic rounded-lg border border-[#16283d] bg-[#0b1626] px-4 py-3 text-[#c2d0e2] text-sm leading-relaxed">
          {block.lines.map((line) => (
            <span key={line} className="block">
              {line}
            </span>
          ))}
        </address>
      );
  }
}
