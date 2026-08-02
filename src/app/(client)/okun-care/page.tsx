import { auth } from "@/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { HeartHandshake, Check, ArrowRight, Phone } from "lucide-react";
import Link from "next/link";

const FEATURES = [
  "Laufende Optimierung Ihrer implementierten Systeme",
  "Monatliche Strategie-Check-ins mit Ihrem OKUN-Berater",
  "Prioritäts-Support bei technischen Fragen und Anpassungen",
  "Zugang zu neuen Lerninhalten und Updates",
  "Proaktive Identifikation von Verbesserungspotenzialen",
  "Monatlich kündbar – keine Mindestlaufzeit",
];

export default async function OkunCarePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

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
      <div className="bg-[#141414] border border-[#2a2a2a] rounded-2xl p-8 text-center">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-full bg-[#22c55e]/10 border border-[#22c55e]/30 flex items-center justify-center">
            <HeartHandshake size={32} className="text-[#22c55e]" />
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
      <div className="bg-[#141414] border border-[#2a2a2a] rounded-2xl p-6">
        <h2 className="text-[#f0f0f0] font-semibold text-sm mb-4">Was OKUN Care beinhaltet</h2>
        <ul className="space-y-3">
          {FEATURES.map((f) => (
            <li key={f} className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-[#22c55e]/10 border border-[#22c55e]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Check size={11} className="text-[#22c55e]" strokeWidth={3} />
              </div>
              <span className="text-[#888] text-sm">{f}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* CTA */}
      {isActive ? (
        <div className="bg-[#141414] border border-[#22c55e]/20 rounded-2xl p-6 text-center">
          <div className="flex justify-center mb-3">
            <span className="text-xs px-3 py-1 rounded-full bg-[#22c55e]/10 border border-[#22c55e]/20 text-[#22c55e] font-medium">
              OKUN Care aktiv
            </span>
          </div>
          <p className="text-[#888] text-sm">
            Ihr OKUN Care-Abonnement ist aktiv. Bei Fragen wenden Sie sich jederzeit an Ihren Berater.
          </p>
          <Link
            href="/termine"
            className="mt-4 inline-flex items-center gap-2 text-[#22c55e] text-sm hover:underline"
          >
            Termin buchen
            <ArrowRight size={14} />
          </Link>
        </div>
      ) : (
        <div className="bg-[#141414] border border-[#2a2a2a] rounded-2xl p-6 text-center">
          <p className="text-[#888] text-sm leading-relaxed mb-6">
            Sie möchten OKUN Care aktivieren? Sprechen Sie mit Ihrem OKUN-Berater —
            wir richten alles gemeinsam mit Ihnen ein.
          </p>
          <div className="flex flex-col gap-3">
            <Link
              href="/termine"
              className="w-full bg-[#22c55e] hover:bg-[#16a34a] text-black font-semibold text-sm rounded-xl py-3 flex items-center justify-center gap-2 transition-colors"
            >
              <Phone size={15} />
              Beratungsgespräch buchen
            </Link>
            <p className="text-[#555] text-xs">
              Online-Zahlung via Stripe wird demnächst verfügbar.
            </p>
          </div>
        </div>
      )}

      {/* Info */}
      <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-xl p-4">
        <p className="text-[#555] text-xs leading-relaxed">
          OKUN Care ist ein optionaler Zusatzdienst nach Abschluss Ihres OKUN-Projekts.
          Er ist monatlich kündbar und ergänzt keine laufende Projektpauschale.
          Drittanbieter-Lizenzen sind nicht im Preis enthalten.
        </p>
      </div>
    </div>
  );
}
