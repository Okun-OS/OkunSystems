import { auth } from "@/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, ChevronRight } from "lucide-react";

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
    <div className="max-w-2xl mx-auto pt-8">
      <div className="bg-[#141414] border border-[#2a2a2a] rounded-2xl p-8 text-center">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-full bg-[#22c55e]/10 border border-[#22c55e]/30 flex items-center justify-center">
            <CheckCircle2 size={32} className="text-[#22c55e]" />
          </div>
        </div>

        <h1 className="text-xl font-bold text-[#f0f0f0] mb-2">
          Fragebogen abgeschlossen
        </h1>
        <p className="text-[#888] text-sm leading-relaxed mb-8">
          Vielen Dank! Ihre Antworten werden jetzt ausgewertet. Sie erhalten in Kürze Ihren individuellen OKUN Blueprint™ Bericht mit konkreten Lösungsempfehlungen.
        </p>

        {analysisSession.completedAt && (
          <p className="text-[#555] text-xs mb-8">
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
            href={`/blueprint/${sessionId}/ergebnis`}
            className="w-full bg-[#22c55e] hover:bg-[#16a34a] text-black font-semibold text-sm rounded-xl py-3 flex items-center justify-center gap-2 transition-colors"
          >
            Meine Ergebnisse anzeigen
            <ChevronRight size={16} />
          </Link>
          <Link
            href="/termine"
            className="w-full bg-[#1a1a1a] hover:bg-[#222] border border-[#2a2a2a] text-[#ccc] hover:text-[#f0f0f0] font-medium text-sm rounded-xl py-3 flex items-center justify-center gap-2 transition-colors"
          >
            Strategiegespräch buchen
          </Link>
          <Link
            href="/dashboard"
            className="w-full text-[#555] hover:text-[#888] text-sm py-2 flex items-center justify-center transition-colors"
          >
            Zum Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
