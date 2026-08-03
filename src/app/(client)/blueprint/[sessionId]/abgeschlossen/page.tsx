import { auth } from "@/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Calendar, ArrowRight } from "lucide-react";

export default async function BlueprintCompletePage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;

  const session = await auth();
  if (!session?.user) redirect("/login");

  const userId = (session.user as { id: string }).id;
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user?.companyId) redirect("/dashboard");

  const analysisSession = await db.analysisSession.findUnique({
    where: { id: sessionId },
    select: { companyId: true, status: true, completedAt: true },
  });

  if (!analysisSession || analysisSession.companyId !== user.companyId) {
    redirect("/blueprint");
  }

  return (
    <div className="max-w-2xl mx-auto pt-8 px-4">
      <div className="bg-[#0c1520] border border-[#1a2840] rounded-2xl p-8 text-center">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-full bg-[#00b8ff]/10 border border-[#00b8ff]/30 flex items-center justify-center">
            <CheckCircle2 size={32} className="text-[#00b8ff]" />
          </div>
        </div>

        <h1 className="text-xl font-bold text-[#f0f0f0] mb-3">
          Ihr OKUN Blueprint ist abgeschlossen
        </h1>

        <p className="text-[#888] text-sm leading-relaxed mb-6 max-w-md mx-auto">
          Vielen Dank. Wir werten Ihre Angaben jetzt intern aus und bereiten Ihre
          individuelle Unternehmensanalyse vor.
        </p>

        <div className="bg-[#060a10] border border-[#111e30] rounded-xl p-5 mb-8 text-left">
          <p className="text-[#f0f0f0] text-sm font-semibold mb-2">Was als nächstes passiert</p>
          <ul className="space-y-2.5">
            {[
              "Unser Team wertet Ihre Antworten detailliert aus",
              "Wir identifizieren Ihre wichtigsten Potenziale und Handlungsfelder",
              "Im Strategiegespräch besprechen wir gemeinsam Ihre Ergebnisse und die empfohlene Roadmap",
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-3 text-[#888] text-sm">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[#00b8ff]/10 border border-[#00b8ff]/20 text-[#00b8ff] text-xs flex items-center justify-center font-semibold mt-0.5">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ul>
        </div>

        {analysisSession.completedAt && (
          <p className="text-[#555] text-xs mb-6">
            Abgeschlossen am{" "}
            {new Date(analysisSession.completedAt).toLocaleDateString("de-DE", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}
          </p>
        )}

        <div className="flex flex-col gap-3">
          <Link
            href="/termine"
            className="w-full bg-[#00b8ff] hover:bg-[#0099d6] text-white font-semibold text-sm rounded-xl py-3 flex items-center justify-center gap-2 transition-colors"
          >
            <Calendar size={15} />
            Strategiegespräch buchen
          </Link>
          <Link
            href="/dashboard"
            className="w-full bg-[#101c2e] hover:bg-[#222] border border-[#1a2840] text-[#ccc] hover:text-[#f0f0f0] font-medium text-sm rounded-xl py-3 flex items-center justify-center gap-2 transition-colors"
          >
            Zum Dashboard
            <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    </div>
  );
}
