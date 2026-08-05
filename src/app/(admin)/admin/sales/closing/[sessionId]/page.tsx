import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";

export default async function ClosingWorkspacePage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");
  const userId = (session.user as { id: string }).id;
  const userRecord = await db.user.findUnique({ where: { id: userId } });
  if (!userRecord || (userRecord.role !== "ADMIN" && userRecord.role !== "CLOSER")) {
    redirect("/dashboard");
  }

  const closingSession = await db.closingSession.findUnique({
    where: { id: sessionId },
    include: { company: { select: { name: true, leadStatus: true } } },
  });

  if (!closingSession) redirect("/admin/sales");
  if (userRecord.role === "CLOSER" && closingSession.closerId !== userId) {
    redirect("/admin/sales");
  }

  return (
    <div className="max-w-[1400px] mx-auto">
      <h1 className="text-2xl font-bold text-[#f0f0f0] mb-2">
        Closing Workspace — {closingSession.company.name}
      </h1>
      <p className="text-[#888] text-sm mb-8">Phase 3 — wird in Kürze implementiert.</p>
      <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-12 text-center text-[#555] text-sm">
        Live-Call-Oberfläche, Angebot-Präsentation, Consent &amp; Recording kommen in Phase 3–6.
      </div>
    </div>
  );
}
