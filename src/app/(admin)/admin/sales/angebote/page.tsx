import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { AngeboteClient } from "./AngeboteClient";

export default async function AngebotePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const userId = (session.user as { id: string }).id;
  const userRecord = await db.user.findUnique({ where: { id: userId } });
  if (!userRecord || userRecord.role !== "ADMIN") {
    redirect("/admin/sales");
  }

  const [templates, archivedTemplates] = await Promise.all([
    db.offerTemplate.findMany({
      where: { status: "published" },
      include: { _count: { select: { offers: true } } },
      orderBy: { priceNet: "asc" },
    }),
    db.offerTemplate.findMany({
      where: { status: "archived" },
      include: { _count: { select: { offers: true } } },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  return <AngeboteClient templates={templates} archivedTemplates={archivedTemplates} />;
}
