import { Backdrop, Container, KeywordList, Rule } from "./pieces";

/** Das Schlussbild mit Zitat — steht auf mehreren Seiten. */
export function ClosingQuote() {
  return (
    <Backdrop
      src="/marketing/berge-nacht.jpg"
      className="border-t border-[#102138]"
      overlay="linear-gradient(180deg,rgba(6,10,17,0.72) 0%,rgba(6,10,17,0.82) 100%)"
    >
      <Container className="relative py-14 sm:py-16">
        <div className="absolute right-5 top-1/2 hidden -translate-y-1/2 sm:block sm:right-8">
          <KeywordList items={["Unternehmen", "Prozesse", "Menschen", "Zukunft"]} />
        </div>
        <blockquote className="max-w-2xl text-[#eef4fb] text-[19px] sm:text-[23px] leading-relaxed">
          &bdquo;Die besten Ergebnisse entstehen,
          <br />
          wenn Technologie und Menschen zusammenarbeiten.&ldquo;
        </blockquote>
        <Rule className="mt-6" />
      </Container>
    </Backdrop>
  );
}
