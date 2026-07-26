import { db } from "@/lib/db";
import { redirect } from "next/navigation";

export async function requireBlueprintComplete(companyId: string): Promise<void> {
  const completed = await db.analysisSession.findFirst({
    where: { companyId, status: "COMPLETED" },
    select: { id: true },
  });
  if (!completed) redirect("/analyse");
}
