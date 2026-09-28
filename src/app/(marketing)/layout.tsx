import type { Metadata } from "next";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";

/**
 * Der öffentliche Teil: die Website.
 *
 * Sie liegt bewusst in derselben Anwendung wie das Kundenportal. Wer ein
 * Strategiegespräch bucht, eine Analyse ausfüllt und später als Kunde das
 * Portal nutzt, bleibt die ganze Zeit unter derselben Adresse — und wir
 * pflegen eine Oberfläche statt zwei.
 */

export const metadata: Metadata = {
  title: {
    default: "OKUN Systems – Digitale Lösungen für eine starke Zukunft",
    template: "%s · OKUN Systems",
  },
  description:
    "OKUN Systems entwickelt individuelle digitale Lösungen, Automatisierungen und Infrastrukturen, die Prozesse vereinfachen, Ressourcen sparen und Wachstum ermöglichen.",
};

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-[#060a11]">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
