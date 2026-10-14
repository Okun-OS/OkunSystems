"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { MarketingLogo } from "./marketing-logo";
import { PrimaryButton, Container } from "./pieces";
import { BOOKING_URL } from "@/lib/marketing/company";

const NAV = [
  { href: "/", label: "Startseite" },
  { href: "/leistungen", label: "Leistungen" },
  { href: "/ueber-uns", label: "Über uns" },
  { href: "/kontakt", label: "Kontakt" },
];

/**
 * Die Kopfzeile der Website.
 *
 * Neben der Navigation steht ein Zugang zum Kundenportal. Er führt auf die
 * Anmeldung; wer bereits angemeldet ist, landet von dort automatisch in
 * seinem Bereich — Kunde im Portal, Berater im Adminbereich.
 */
export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-[#102138] bg-[#070c15]/92 backdrop-blur">
      <Container className="flex items-center justify-between gap-6 py-3.5">
        <Link href="/" aria-label="OKUN Systems — Startseite" className="flex-shrink-0">
          <MarketingLogo width={138} />
        </Link>

        <nav className="hidden lg:flex items-center gap-8">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative text-sm transition-colors ${
                  active ? "text-[#38a9f5]" : "text-[#c2d0e2] hover:text-[#f4f8fd]"
                }`}
              >
                {item.label}
                {active && (
                  <span className="absolute -bottom-1.5 left-0 right-0 h-px bg-[#38a9f5]" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="hidden lg:flex items-center gap-5">
          <Link
            href="/login"
            className="text-sm text-[#8fa3bc] hover:text-[#f4f8fd] transition-colors"
          >
            Kundenportal
          </Link>
          <PrimaryButton href={BOOKING_URL} className="py-2.5">
            Strategiegespräch vereinbaren
          </PrimaryButton>
        </div>

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-label={open ? "Menü schließen" : "Menü öffnen"}
          aria-expanded={open}
          className="lg:hidden p-2 text-[#c2d0e2] hover:text-[#f4f8fd] transition-colors"
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </Container>

      {open && (
        <div className="lg:hidden border-t border-[#102138] bg-[#070c15]">
          <Container className="py-4 flex flex-col gap-1">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`py-2.5 text-sm ${
                  pathname === item.href ? "text-[#38a9f5]" : "text-[#c2d0e2]"
                }`}
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="py-2.5 text-sm text-[#8fa3bc]"
            >
              Kundenportal
            </Link>
            <PrimaryButton href={BOOKING_URL} className="mt-3 w-full">
              Strategiegespräch vereinbaren
            </PrimaryButton>
          </Container>
        </div>
      )}
    </header>
  );
}
