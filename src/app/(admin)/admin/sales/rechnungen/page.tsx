import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { RechnungenClient } from "./RechnungenClient";

export default async function RechnungenPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const userId = (session.user as { id: string }).id;
  const userRecord = await db.user.findUnique({ where: { id: userId } });
  if (!userRecord || userRecord.role !== "ADMIN") {
    redirect("/admin/sales");
  }

  const [invoices, companies] = await Promise.all([
    db.invoice.findMany({
      include: {
        company: { select: { id: true, name: true } },
        offer: { include: { template: { select: { name: true } } } },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.company.findMany({
      where: { leadStatus: { not: null } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return <RechnungenClient invoices={invoices} companies={companies} />;
}
