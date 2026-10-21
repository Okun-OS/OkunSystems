import { auth } from "@/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import {
  HeartHandshake,
  Check,
  ArrowRight,
  Phone,
  Mail,
  MessageCircle,
  CalendarDays,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { SubscribeButton } from "./SubscribeButton";
import { AboVerwalten } from "./AboVerwalten";
import { ladeCare } from "@/lib/care/leistungen";
import { careArtLabel, CARE_UMFANG, type CareStand } from "@/lib/care/katalog";
import { careKontakt, mailtoLink, whatsappLink, REAKTIONSZEIT } from "@/lib/care/kontakt";
import { formatiereBerlin } from "@/lib/zeit";

/**
 * OKUN Care — vor und nach der Buchung.
 *
 * Vorher ist diese Seite ein Angebot: Preis, Umfang, ein Knopf. Nachher darf
 * sie das nicht mehr sein. Ein Kunde, der bezahlt und weiterhin seinen
 * eigenen Preis liest, fragt sich, wofür. Nach der Buchung steht hier
 * deshalb der Dienst selbst: wie er uns erreicht, was wir ihm zugesagt
 * haben, wann wir uns als Nächstes sehen und was wir seither getan haben.
 */

const FEATURES = [
  "Laufende Optimierung Ihrer implementierten Systeme",
  "Kleine Automationen und Anpassungen zwischendurch",
  "Monatliche Strategie-Check-ins mit Ihrem OKUN-Berater",
  "Prioritäts-Support bei technischen Fragen und Anpassungen",
  "Zugang zu neuen Lerninhalten und Updates",
  "Monatlich kündbar – keine Mindestlaufzeit",
];

export default async function OkunCarePage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { success } = await searchParams;
  const justSubscribed = success === "1";

  const userId = (session.user as { id: string }).id;
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { company: { select: { id: true, name: true } } },
  });

  const firma = user?.company;
  const stand = firma ? await ladeCare(firma.id, true) : null;

  if (!firma || !stand?.aktiv) {
    return <Angebot justSubscribed={justSubscribed} />;
  }

  return <Betreuung firma={firma} stand={stand} />;
}

// ─── Nach der Buchung ────────────────────────────────────────────────────────

function Betreuung({
  firma,
  stand,
}: {
  firma: { id: string; name: string };
  stand: CareStand;
}) {
  const kontakt = careKontakt();

  return (
    <div className="max-w-[760px] mx-auto pt-6 pb-16 px-4 space-y-5">
      {/* Kopf */}
      <div className="bg-[#0c1520] border border-[#1a2840] rounded-2xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-[#00b8ff]/10 border border-[#00b8ff]/30 flex items-center justify-center flex-shrink-0">
            <HeartHandshake size={22} className="text-[#00b8ff]" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-[#888] text-xs tracking-wider uppercase">OKUN Care</p>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#2ee6c5]/10 border border-[#2ee6c5]/25 text-[#2ee6c5] font-medium">
                aktiv
              </span>
            </div>
            <h1 className="text-xl font-bold text-[#f0f0f0] mt-1">
              Wir sind für {firma.name} dran.
            </h1>
            <p className="text-[#888] text-sm mt-1.5 leading-relaxed">
              {stand.seit
                ? `Seit ${formatiereBerlin(stand.seit).split(",")[0]} in Betreuung. `
                : ""}
              Sie melden sich, wir antworten {REAKTIONSZEIT}.
            </p>
          </div>
        </div>
      </div>

      {/* Der direkte Draht */}
      <div className="bg-[#0c1520] border border-[#1a2840] rounded-2xl p-6">
        <h2 className="text-[#f0f0f0] font-semibold text-sm">Ihr direkter Draht</h2>
        <p className="text-[#888] text-xs mt-1 leading-relaxed">
          Kein Ticketsystem, kein Formular. Schreiben Sie, als würden Sie einem
          Kollegen schreiben — ein Satz genügt.
        </p>

        <div className="mt-4 space-y-2">
          {kontakt.whatsappNummer && (
            <a
              href={whatsappLink(kontakt.whatsappNummer, firma.name)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#00b8ff] text-[#041018]
                font-semibold text-sm hover:bg-[#33c7ff] transition-colors"
            >
              <MessageCircle size={16} />
              Über WhatsApp schreiben
              <ArrowRight size={14} className="ml-auto" />
            </a>
          )}
          <a
            href={`tel:${kontakt.telefonHref}`}
            className="flex items-center gap-3 px-4 py-3 rounded-xl border border-[#1a2840]
              text-[#c9d4e4] text-sm hover:border-[#00b8ff]/40 hover:bg-[#101c2e] transition-colors"
          >
            <Phone size={15} className="text-[#00b8ff]" />
            {kontakt.telefon}
            <span className="ml-auto text-[#555] text-xs">anrufen</span>
          </a>
          <a
            href={mailtoLink(kontakt.email, firma.name)}
            className="flex items-center gap-3 px-4 py-3 rounded-xl border border-[#1a2840]
              text-[#c9d4e4] text-sm hover:border-[#00b8ff]/40 hover:bg-[#101c2e] transition-colors"
          >
            <Mail size={15} className="text-[#00b8ff]" />
            {kontakt.email}
            <span className="ml-auto text-[#555] text-xs">schreiben</span>
          </a>
        </div>

        {stand.berater && (
          <div className="mt-4 pt-4 border-t border-[#111e30] flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#101c2e] border border-[#1a2840] flex items-center justify-center flex-shrink-0">
              <span className="text-[#00b8ff] text-xs font-bold">
                {initialen(stand.berater.name)}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-[#f0f0f0] text-sm font-medium">{stand.berater.name}</p>
              <p className="text-[#555] text-xs">Ihr Berater bei OKUN Systems</p>
            </div>
          </div>
        )}
      </div>

      {/* Nicht nur Support */}
      <div className="bg-[#0c1520] border border-[#1a2840] rounded-2xl p-6">
        <h2 className="text-[#f0f0f0] font-semibold text-sm flex items-center gap-2">
          <Wrench size={15} className="text-[#00b8ff]" />
          Care ist nicht nur Support
        </h2>
        <p className="text-[#888] text-xs mt-1 leading-relaxed">
          Fragen Sie auch das an, was Sie sonst {"„irgendwann mal“"} selbst machen würden.
          Wenn es klein ist, machen wir es einfach.
        </p>
        <ul className="mt-4 space-y-3">
          {CARE_UMFANG.map((u) => (
            <li key={u.titel} className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-[#00b8ff]/10 border border-[#00b8ff]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Check size={11} className="text-[#00b8ff]" strokeWidth={3} />
              </div>
              <div className="min-w-0">
                <p className="text-[#dce9f6] text-sm font-medium">{u.titel}</p>
                <p className="text-[#888] text-xs mt-0.5 leading-relaxed">{u.text}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Nächster Check-in */}
      <div className="bg-[#0c1520] border border-[#1a2840] rounded-2xl p-6">
        <h2 className="text-[#f0f0f0] font-semibold text-sm flex items-center gap-2">
          <CalendarDays size={15} className="text-[#00b8ff]" />
          Nächster Check-in
        </h2>
        {stand.naechsterTermin ? (
          <div className="mt-3 flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-[#0a121c] border border-[#1a2840]">
            <div className="min-w-0">
              <p className="text-[#f0f0f0] text-sm font-medium truncate">
                {stand.naechsterTermin.titel}
              </p>
              <p className="text-[#888] text-xs mt-0.5">
                {formatiereBerlin(stand.naechsterTermin.beginn)} Uhr
              </p>
            </div>
            <Link
              href="/termine"
              className="flex-shrink-0 text-[#00b8ff] text-xs hover:underline whitespace-nowrap"
            >
              Termine →
            </Link>
          </div>
        ) : (
          <div className="mt-3">
            <p className="text-[#888] text-xs leading-relaxed">
              Es steht noch kein Termin. Einmal im Monat sehen wir gemeinsam drauf — Sie
              können sich den Termin selbst legen.
            </p>
            <Link
              href="/termine"
              className="mt-3 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#00b8ff]
                text-[#041018] text-sm font-semibold hover:bg-[#33c7ff] transition-colors"
            >
              Check-in vereinbaren
              <ArrowRight size={14} />
            </Link>
          </div>
        )}
      </div>

      {/* Was wir gemacht haben */}
      <div className="bg-[#0c1520] border border-[#1a2840] rounded-2xl p-6">
        <h2 className="text-[#f0f0f0] font-semibold text-sm">Was wir für Sie gemacht haben</h2>
        {stand.leistungen.length > 0 ? (
          <ul className="mt-4 space-y-3">
            {stand.leistungen.map((l) => (
              <li
                key={l.id}
                className="pl-4 border-l-2 border-[#1a2840] hover:border-[#00b8ff]/40 transition-colors"
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#101c2e] border border-[#1a2840] text-[#8899b4]">
                    {careArtLabel(l.art)}
                  </span>
                  <span className="text-[#555] text-xs">
                    {formatiereBerlin(l.erledigtAm).split(",")[0]}
                  </span>
                </div>
                <p className="text-[#f0f0f0] text-sm font-medium mt-1">{l.titel}</p>
                {l.beschreibung && (
                  <p className="text-[#888] text-xs mt-0.5 leading-relaxed">{l.beschreibung}</p>
                )}
              </li>
            ))}
          </ul>
        ) : (
          /*
            Kein Protokoll heißt nicht, dass nichts passiert.

            Ein leeres „Noch keine Einträge" liest sich wie eine Mahnung an
            uns. Deshalb steht hier, was als Erstes hineinkommt — und der
            Weg, es anzustoßen.
          */
          <p className="text-[#888] text-xs mt-3 leading-relaxed">
            Hier steht künftig jede Anpassung, jede Automation und jeder Check-in mit
            Datum. Noch ist nichts angefallen — melden Sie sich einfach, wenn Ihnen etwas
            auffällt.
          </p>
        )}
      </div>

      {/* Abo */}
      <div className="bg-[#060a10] border border-[#111e30] rounded-xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[#c9d4e4] text-sm font-medium">Ihr Abonnement</p>
            <p className="text-[#555] text-xs mt-0.5">
              299 € / Monat · monatlich kündbar · zzgl. MwSt.
            </p>
          </div>
          {stand.hatZahlungsdaten ? (
            <AboVerwalten />
          ) : (
            <p className="text-[#555] text-xs max-w-[280px]">
              Abrechnung außerhalb von Stripe — Rechnungen kommen von uns direkt.
            </p>
          )}
        </div>
        {stand.gekuendigtAm && (
          <p className="mt-3 text-[#f5a524] text-xs">
            Gekündigt am {formatiereBerlin(stand.gekuendigtAm).split(",")[0]} — die
            Betreuung läuft bis zum Ende des bezahlten Monats weiter.
          </p>
        )}
      </div>
    </div>
  );
}

/** Zwei Buchstaben statt eines Platzhalterbilds, das niemand hochgeladen hat. */
function initialen(name: string): string {
  const teile = name.trim().split(/\s+/).filter(Boolean);
  if (teile.length === 0) return "?";
  if (teile.length === 1) return teile[0].slice(0, 2).toUpperCase();
  return (teile[0][0] + teile[teile.length - 1][0]).toUpperCase();
}

// ─── Vor der Buchung ─────────────────────────────────────────────────────────

function Angebot({ justSubscribed }: { justSubscribed: boolean }) {
  return (
    <div className="max-w-[700px] mx-auto pt-6 pb-16 px-4 space-y-6">
      {/* Header */}
      <div className="bg-[#0c1520] border border-[#1a2840] rounded-2xl p-8 text-center">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-full bg-[#00b8ff]/10 border border-[#00b8ff]/30 flex items-center justify-center">
            <HeartHandshake size={32} className="text-[#00b8ff]" />
          </div>
        </div>

        <p className="text-[#888] text-xs mb-2 tracking-wider uppercase">OKUN Care</p>
        <h1 className="text-2xl font-bold text-[#f0f0f0] mb-2">
          Laufende Betreuung & Optimierung
        </h1>
        <p className="text-[#888] text-sm leading-relaxed max-w-md mx-auto">
          Nach Abschluss Ihres Projekts sorgen wir dafür, dass Ihre Systeme kontinuierlich
          optimiert werden und Sie immer den besten Nutzen aus Ihren Investitionen ziehen.
        </p>

        <div className="mt-6 inline-flex items-baseline gap-1">
          <span className="text-4xl font-bold text-[#f0f0f0]">299 €</span>
          <span className="text-[#888] text-sm">/ Monat</span>
        </div>
        <p className="text-[#555] text-xs mt-1">Monatlich kündbar · zzgl. MwSt.</p>
      </div>

      {/* Features */}
      <div className="bg-[#0c1520] border border-[#1a2840] rounded-2xl p-6">
        <h2 className="text-[#f0f0f0] font-semibold text-sm mb-4">Was OKUN Care beinhaltet</h2>
        <ul className="space-y-3">
          {FEATURES.map((f) => (
            <li key={f} className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-[#00b8ff]/10 border border-[#00b8ff]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Check size={11} className="text-[#00b8ff]" strokeWidth={3} />
              </div>
              <span className="text-[#888] text-sm">{f}</span>
            </li>
          ))}
        </ul>
      </div>

      {/*
        Dass Care auch kleine Bauarbeiten umfasst, ist der Satz, der den
        Unterschied macht — und er stand bisher nirgends. „Support" liest
        sich wie eine Hotline für den Fall, dass etwas kaputt ist.
      */}
      <div className="bg-[#0c1520] border border-[#1a2840] rounded-2xl p-6">
        <h2 className="text-[#f0f0f0] font-semibold text-sm flex items-center gap-2 mb-1">
          <Wrench size={15} className="text-[#00b8ff]" />
          Nicht nur Support
        </h2>
        <p className="text-[#888] text-xs leading-relaxed">
          Eine Automation, die noch fehlt, oder ein Sheet, das rechnen soll: Was klein ist,
          machen wir zwischendurch — ohne dass daraus ein eigenes Projekt werden muss.
        </p>
      </div>

      {/* CTA */}
      <div className="bg-[#0c1520] border border-[#1a2840] rounded-2xl p-6 text-center">
        {justSubscribed && (
          <div className="mb-4 px-4 py-3 bg-[#00b8ff]/10 border border-[#00b8ff]/20 rounded-xl">
            <p className="text-[#00b8ff] text-sm font-medium">
              Vielen Dank! Ihr Abonnement wird in Kürze aktiviert.
            </p>
          </div>
        )}
        <p className="text-[#888] text-sm leading-relaxed mb-6">
          Jetzt direkt online abonnieren oder zuerst ein Beratungsgespräch buchen.
        </p>
        <div className="flex flex-col gap-3">
          <SubscribeButton />
          <p className="text-[#555] text-xs">Sichere Zahlung via Stripe · monatlich kündbar</p>
          <div className="flex items-center gap-3 my-1">
            <div className="flex-1 border-t border-[#1a2840]" />
            <span className="text-[#444] text-xs">oder</span>
            <div className="flex-1 border-t border-[#1a2840]" />
          </div>
          <Link
            href="/termine"
            className="w-full border border-[#1a2840] hover:border-[#3a3a3a] hover:bg-[#101c2e] text-[#888] hover:text-[#f0f0f0] font-medium text-sm rounded-xl py-3 flex items-center justify-center gap-2 transition-colors"
          >
            <Phone size={15} />
            Beratungsgespräch buchen
          </Link>
        </div>
      </div>

      {/* Info */}
      <div className="bg-[#060a10] border border-[#111e30] rounded-xl p-4">
        <p className="text-[#555] text-xs leading-relaxed">
          OKUN Care ist ein optionaler Zusatzdienst nach Abschluss Ihres OKUN-Projekts. Er
          ist monatlich kündbar und ergänzt keine laufende Projektpauschale.
          Drittanbieter-Lizenzen sind nicht im Preis enthalten.
        </p>
      </div>
    </div>
  );
}
