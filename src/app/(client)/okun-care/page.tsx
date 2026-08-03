import { auth } from "@/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { HeartHandshake, Check, ArrowRight, Phone } from "lucide-react";
import Link from "next/link";
import { SubscribeButton } from "./SubscribeButton";

const FEATURES = [
  "Laufende Optimierung Ihrer implementierten Systeme",
  "Monatliche Strategie-Check-ins mit Ihrem OKUN-Berater",
  "Prioritäts-Support bei technischen Fragen und Anpassungen",
  "Zugang zu neuen Lerninhalten und Updates",
  "Proaktive Identifikation von Verbesserungspotenzialen",
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

  const userId = (session.user as any).id as string;
  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      company: {
        select: {
          id: true,
          name: true,
          careSubscription: { select: { status: true, startedAt: true } },
        },
      },
    },
  });

  const careStatus = user?.company?.careSubscription?.status ?? "inactive";
  const isActive = careStatus === "active";

  return (
    <div className="max-w-[700px] mx-auto pt-6 pb-16 px-4 space-y-6">
      {/* Header */}
      <div className="bg-[#0c1520] border border-[#1a2840] rounded-2xl p-8 text-center">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-full bg-[#00b8ff]/10 border border-[#00b8ff]/30 flex items-center justify-center">
            <HeartHandshake size={32} className="text-[#00b8ff]" />
          </div>
        </div>

        <p className="text-[#888] text-xs mb-2 tracking-wider uppercase">
          OKUN Care
        </p>
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

      {/* CTA */}
      {isActive ? (
        <div className="bg-[#0c1520] border border-[#00b8ff]/20 rounded-2xl p-6 text-center">
          <div className="flex justify-center mb-3">
            <span className="text-xs px-3 py-1 rounded-full bg-[#00b8ff]/10 border border-[#00b8ff]/20 text-[#00b8ff] font-medium">
              OKUN Care aktiv
            </span>
          </div>
          <p className="text-[#888] text-sm">
            Ihr OKUN Care-Abonnement ist aktiv. Bei Fragen wenden Sie sich jederzeit an Ihren Berater.
          </p>
          <Link
            href="/termine"
            className="mt-4 inline-flex items-center gap-2 text-[#00b8ff] text-sm hover:underline"
          >
            Termin buchen
            <ArrowRight size={14} />
          </Link>
        </div>
      ) : (
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
      )}

      {/* Info */}
      <div className="bg-[#060a10] border border-[#111e30] rounded-xl p-4">
        <p className="text-[#555] text-xs leading-relaxed">
          OKUN Care ist ein optionaler Zusatzdienst nach Abschluss Ihres OKUN-Projekts.
          Er ist monatlich kündbar und ergänzt keine laufende Projektpauschale.
          Drittanbieter-Lizenzen sind nicht im Preis enthalten.
        </p>
      </div>
    </div>
  );
}
