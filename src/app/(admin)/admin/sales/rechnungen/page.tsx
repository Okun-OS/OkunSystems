import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";

export default async function RechnungenPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const userId = (session.user as { id: string }).id;
  const userRecord = await db.user.findUnique({ where: { id: userId } });
  if (!userRecord || (userRecord.role !== "ADMIN" && userRecord.role !== "CLOSER")) {
    redirect("/dashboard");
  }

  return (
    <div className="max-w-[1200px] mx-auto">
      <h1 className="text-2xl font-bold text-[#f0f0f0] mb-2">Rechnungen</h1>
      <p className="text-[#888] text-sm mb-8">Phase 8 — wird in Kürze implementiert.</p>
      <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-12 text-center text-[#555] text-sm">
        Rechnungs-Verwaltung kommt in Phase 8.
      </div>
    </div>
  );
}
