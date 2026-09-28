import type { Metadata } from "next";
import { CalendarDays, Lightbulb, Mail, MapPin, Phone, Users } from "lucide-react";
import {
  Backdrop,
  Container,
  Eyebrow,
  HERO_OVERLAY,
  Headline,
  KeywordList,
  PrimaryButton,
  Rule,
  SectionTitle,
} from "@/components/marketing/pieces";
import { ClosingQuote } from "@/components/marketing/closing-quote";
import { ContactForm } from "@/components/marketing/contact-form";

export const metadata: Metadata = {
  title: "Kontakt",
  description:
    "Sprechen Sie mit uns über Ihre Prozesse: unverbindliches Erstgespräch, individuelle Lösungsansätze, persönlich und auf Augenhöhe.",
};

const ADDRESS = {
  company: "OKUN SYSTEMS UG (haftungsbeschränkt)",
  street: "Potsdamer Platz 1",
  city: "10785 Berlin",
  country: "Deutschland",
  phone: "030 13883330",
  phoneHref: "+493013883330",
  email: "kontakt@okun-systems.com",
};

export default function KontaktPage() {
  return (
    <>
      {/* ── Kopfbereich ──────────────────────────────────────────────────── */}
      <Backdrop
        src="/marketing/kontakt-hero.jpg"
        overlay={HERO_OVERLAY}
      >
        <Container className="relative py-16 sm:py-20">
          <div className="absolute right-5 top-8 hidden sm:block sm:right-8">
            <KeywordList items={["Technologie", "Menschen", "Potenzial"]} />
          </div>

          <div className="max-w-xl space-y-6">
            <Eyebrow>Menschen. Ideen. Lösungen.</Eyebrow>
            <Headline lead={<>Lassen Sie uns über Ihre Prozesse</>} accent="sprechen." />
            <p className="text-[#9fb2c9] text-[15px] leading-relaxed">
              Sie möchten Prozesse digitalisieren, automatisieren oder bestehende Systeme
              optimieren? Sprechen Sie mit uns über Ihre Anforderungen und die Möglichkeiten für
              Ihr Unternehmen.
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

      {/* ── Gespräch und Formular ────────────────────────────────────────── */}
      <section className="border-t border-[#102138] bg-[#070c15]">
        <Container className="py-14 sm:py-16">
          <div className="grid gap-5 lg:grid-cols-2">
            {/* Direkt ins Gespräch */}
            <div className="rounded-xl border border-[#16304f] bg-[linear-gradient(160deg,#0d1b2e_0%,#0a1524_100%)] p-6 sm:p-8 flex flex-col">
              <Eyebrow>Direkt ins Gespräch</Eyebrow>
              <div className="mt-4">
                <SectionTitle lead={<>Gemeinsam mehr</>} accent="erreichen." />
              </div>
              <p className="mt-4 text-[#9fb2c9] text-sm leading-relaxed">
                In einem unverbindlichen Gespräch lernen wir Ihre Anforderungen kennen und zeigen
                Ihnen konkrete Möglichkeiten auf, wie wir Sie unterstützen können.
              </p>

              <ul className="mt-6 space-y-3.5">
                {[
                  { icon: <CalendarDays size={18} strokeWidth={1.5} />, label: "Unverbindliches Erstgespräch" },
                  { icon: <Lightbulb size={18} strokeWidth={1.5} />, label: "Individuelle Lösungsansätze" },
                  { icon: <Users size={18} strokeWidth={1.5} />, label: "Persönlich und auf Augenhöhe" },
                ].map((item) => (
                  <li key={item.label} className="flex items-center gap-3">
                    <span className="text-[#38a9f5]">{item.icon}</span>
                    <span className="h-5 w-px bg-[#1a3050]" />
                    <span className="text-[#c2d0e2] text-sm">{item.label}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-auto pt-7 space-y-2.5">
                <PrimaryButton href={`mailto:${ADDRESS.email}?subject=Terminanfrage`} className="w-full">
                  Termin anfragen
                </PrimaryButton>
                <p className="text-[#6f8299] text-xs">
                  Oder schreiben Sie uns über das Formular — wir schlagen Ihnen passende Termine vor.
                </p>
              </div>
            </div>

            {/* Formular */}
            <div className="rounded-xl border border-[#16304f] bg-[linear-gradient(160deg,#0d1b2e_0%,#0a1524_100%)] p-6 sm:p-8">
              <Eyebrow>Kontaktformular</Eyebrow>
              <div className="mt-4">
                <SectionTitle lead="Schreiben Sie" accent="uns." />
              </div>
              <p className="mt-3 mb-6 text-[#9fb2c9] text-sm leading-relaxed">
                Alternativ können Sie uns jederzeit eine Nachricht senden. Wir melden uns
                schnellstmöglich bei Ihnen.
              </p>
              <ContactForm />
            </div>
          </div>
        </Container>
      </section>

      {/* ── Standort ─────────────────────────────────────────────────────── */}
      <section className="border-t border-[#102138] bg-[#060a11]">
        <Container className="py-14 sm:py-16">
          <div className="rounded-xl border border-[#16304f] bg-[linear-gradient(160deg,#0d1b2e_0%,#0a1524_100%)] overflow-hidden">
            <div className="grid gap-0 lg:grid-cols-2">
              <div className="p-6 sm:p-8 space-y-6">
                <Eyebrow>Unser Standort</Eyebrow>
                <SectionTitle lead="Hier finden Sie" accent="uns." />

                <div className="space-y-5 pt-1">
                  <div className="flex gap-3">
                    <MapPin size={18} strokeWidth={1.5} className="text-[#38a9f5] mt-0.5 flex-shrink-0" />
                    <address className="not-italic text-[#c2d0e2] text-sm leading-relaxed">
                      {ADDRESS.company}
                      <br />
                      {ADDRESS.street}
                      <br />
                      {ADDRESS.city}
                      <br />
                      {ADDRESS.country}
                    </address>
                  </div>

                  <div className="flex gap-3">
                    <Phone size={18} strokeWidth={1.5} className="text-[#38a9f5] mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-[#c2d0e2] text-sm">Telefon</p>
                      <a
                        href={`tel:${ADDRESS.phoneHref}`}
                        className="text-[#38a9f5] text-sm underline underline-offset-4 hover:text-[#7cc6fa]"
                      >
                        {ADDRESS.phone}
                      </a>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Mail size={18} strokeWidth={1.5} className="text-[#38a9f5] mt-0.5 flex-shrink-0" />
                    <a
                      href={`mailto:${ADDRESS.email}`}
                      className="text-[#c2d0e2] text-sm hover:text-[#f4f8fd]"
                    >
                      {ADDRESS.email}
                    </a>
                  </div>
                </div>

                <Rule />
              </div>

              {/* Bewusst ein Bild statt eines eingebetteten Kartendienstes:
                  Ein fremder Rahmen lädt beim Aufruf Daten des Besuchers zu
                  einem Dritten, bevor er überhaupt etwas angeklickt hat. Wer
                  die Route will, klickt — und weiß dann, wohin er geht. */}
              <a
                href="https://www.google.com/maps/search/?api=1&query=Potsdamer+Platz+1%2C+10785+Berlin"
                target="_blank"
                rel="noopener noreferrer"
                className="group relative block min-h-[280px] lg:min-h-[340px]"
                aria-label="Standort am Potsdamer Platz 1 in Berlin bei Google Maps öffnen"
              >
                <span
                  aria-hidden
                  className="absolute inset-0 bg-cover bg-center"
                  style={{ backgroundImage: "url(/marketing/karte.jpg)" }}
                />
                <span
                  aria-hidden
                  className="absolute inset-0 bg-[rgba(6,10,17,0.15)] transition-colors group-hover:bg-[rgba(6,10,17,0.05)]"
                />
                <span className="absolute bottom-3 right-3 rounded-lg border border-[#2f7fd4]/50 bg-[rgba(9,20,38,0.9)] px-3 py-1.5 text-xs text-[#c2d0e2]">
                  Route öffnen →
                </span>
              </a>
            </div>
          </div>
        </Container>
      </section>

      <ClosingQuote />
    </>
  );
}
