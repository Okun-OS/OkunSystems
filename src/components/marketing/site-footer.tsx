import Link from "next/link";
import { MarketingLogo } from "./marketing-logo";
import { Container } from "./pieces";

/** Die Fußzeile — auf jeder Seite dieselbe. */
export function SiteFooter() {
  return (
    <footer className="border-t border-[#102138] bg-[#060a11]">
      <Container className="flex flex-col gap-6 py-7 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-shrink-0">
          <MarketingLogo width={132} />
        </div>

        <nav className="flex flex-wrap items-center gap-6">
          <Link href="/impressum" className="text-sm text-[#9fb2c9] hover:text-[#f4f8fd] transition-colors">
            Impressum
          </Link>
          <Link href="/datenschutz" className="text-sm text-[#9fb2c9] hover:text-[#f4f8fd] transition-colors">
            Datenschutz
          </Link>
          <a
            href="https://www.instagram.com/okunsystems/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-[#9fb2c9] hover:text-[#f4f8fd] transition-colors"
          >
            Instagram
          </a>
        </nav>

        <div className="flex items-center gap-4">
          <span aria-hidden className="h-px w-8 bg-[#2f7fd4]" />
          <span className="text-[#6f8299] text-[10px] uppercase tracking-[0.28em]">
            Systems for a brighter tomorrow.
          </span>
        </div>
      </Container>
    </footer>
  );
}
