import type { Metadata } from "next";
import { Container, Eyebrow, KeywordList, Rule } from "@/components/marketing/pieces";
import { ClosingQuote } from "@/components/marketing/closing-quote";
import { ADDRESS_LINES, COMPANY } from "@/lib/marketing/company";
import { OkunRing } from "@/components/marketing/okun-ring";

export const metadata: Metadata = {
  title: "Impressum",
  description: "Angaben gemäß § 5 TMG für die OKUN SYSTEMS UG (haftungsbeschränkt).",
};

/**
 * Impressum.
 *
 * Die Angaben stehen hier fest im Code und nicht in der Datenbank: Sie ändern
 * sich selten, müssen aber immer erreichbar sein — auch wenn die Datenbank
 * einmal nicht antwortet.
 */
export default function ImpressumPage() {
  return (
    <>
      <section className="relative overflow-hidden border-b border-[#102138] bg-[radial-gradient(120%_100%_at_75%_30%,#10314f_0%,#070d17_55%,#05080e_100%)]">
        <Container className="relative py-14 sm:py-16">
          <div className="absolute right-5 top-8 hidden sm:block sm:right-8">
            <KeywordList items={["Technologie", "Menschen", "Potenzial"]} />
          </div>

          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div className="space-y-4">
              <Eyebrow>Rechtliches</Eyebrow>
              <h1 className="text-[#f4f8fd] text-[40px] sm:text-[52px] font-bold tracking-tight leading-none">
                Impressum
              </h1>
              <p className="text-[#c2d0e2] text-[17px]">Transparenz schafft Vertrauen.</p>
              <div className="space-y-4 pt-2">
                <Rule />
                <p className="text-[#7d90ab] text-[11px] uppercase tracking-[0.28em]">
                  Klar. Verlässlich. Verantwortungsvoll.
                </p>
              </div>
            </div>

            <div className="hidden lg:flex justify-end pr-24">
              <OkunRing className="w-[260px]" />
            </div>
          </div>
        </Container>
      </section>

      <section className="bg-[#070c15]">
        <Container className="py-14 sm:py-16">
          <div className="max-w-2xl space-y-9">
            <Block title="Angaben gemäß § 5 TMG">
              {ADDRESS_LINES.map((line, index) => (
                <p key={line} className={index === 0 ? "text-[#f4f8fd] font-semibold" : undefined}>
                  {line}
                </p>
              ))}
            </Block>

            <Block title="Vertreten durch">
              <p className="text-[#f4f8fd] font-semibold">{COMPANY.managingDirector}</p>
              <p>Geschäftsführer</p>
            </Block>

            <Block title="Kontakt">
              <p>
                Telefon:{" "}
                <a
                  href={`tel:${COMPANY.phoneHref}`}
                  className="text-[#38a9f5] hover:underline underline-offset-4"
                >
                  {COMPANY.phone}
                </a>
              </p>
              <p>
                E-Mail:{" "}
                <a
                  href={`mailto:${COMPANY.email}`}
                  className="text-[#38a9f5] hover:underline underline-offset-4"
                >
                  {COMPANY.email}
                </a>
              </p>
            </Block>

            <Block title="Handelsregister">
              {COMPANY.registerCourt || COMPANY.registerNumber ? (
                <>
                  <p>Eintragung im Handelsregister</p>
                  <p>Registergericht: {COMPANY.registerCourt}</p>
                  <p>Registernummer: {COMPANY.registerNumber}</p>
                </>
              ) : (
                // Solange die Eintragung läuft, steht das hier — und nicht eine
                // Zeile, die so aussieht, als hätte jemand sie vergessen.
                <p>Die Eintragung im Handelsregister ist beantragt.</p>
              )}
            </Block>

            <Block title="Umsatzsteuer">
              {COMPANY.vatId ? (
                <>
                  <p>Umsatzsteuer-Identifikationsnummer gemäß § 27 a UStG:</p>
                  <p>{COMPANY.vatId}</p>
                </>
              ) : (
                <p>
                  Eine Umsatzsteuer-Identifikationsnummer gemäß § 27 a UStG liegt derzeit
                  nicht vor.
                </p>
              )}
            </Block>

            <Block title="Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV">
              <p className="text-[#f4f8fd] font-semibold">{COMPANY.managingDirector}</p>
              {ADDRESS_LINES.slice(1).map((line) => (
                <p key={line}>{line}</p>
              ))}
            </Block>

            <Block title="Verbraucherstreitbeilegung">
              <p>
                Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer
                Verbraucherschlichtungsstelle teilzunehmen.
              </p>
            </Block>

            <p className="text-[#8fa3bc] text-sm leading-relaxed pt-2">
              Haftungshinweis: Trotz sorgfältiger inhaltlicher Kontrolle übernehmen wir keine
              Haftung für die Inhalte externer Links. Für den Inhalt der verlinkten Seiten sind
              ausschließlich deren Betreiber verantwortlich.
            </p>
          </div>
        </Container>
      </section>

      <ClosingQuote />
    </>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-3 sm:grid-cols-[auto_minmax(0,1fr)] sm:gap-6">
      <div className="pt-1.5">
        <Rule className="!w-8" />
      </div>
      <div className="space-y-1">
        <h2 className="text-[#38a9f5] text-[11px] font-medium uppercase tracking-[0.24em] mb-2.5">
          {title}
        </h2>
        <div className="space-y-1 text-[#c2d0e2] text-sm leading-relaxed">{children}</div>
      </div>
    </div>
  );
}
