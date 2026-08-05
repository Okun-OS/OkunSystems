import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { BibliothekClient } from "./BibliothekClient";

export default async function BibliothekPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const userId = (session.user as { id: string }).id;
  const userRecord = await db.user.findUnique({ where: { id: userId } });
  if (!userRecord || userRecord.role !== "ADMIN") {
    redirect("/admin/sales");
  }

  const items = await db.salesContent.findMany({
    orderBy: [{ type: "asc" }, { order: "asc" }, { title: "asc" }],
  });

  return <BibliothekClient items={items} />;
}
