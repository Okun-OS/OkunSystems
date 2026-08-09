import { auth } from "@/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { RechtlichesClient } from "./RechtlichesClient";

export default async function RechtlichesPage() {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    redirect("/login");
  }

  const documents = await db.legalDocument.findMany({
    select: {
      id: true,
      title: true,
      type: true,
      version: true,
      content: true,
      checkboxLabel: true,
      isRequired: true,
      isActive: true,
      displayOrder: true,
      _count: { select: { consentRecords: true } },
    },
    orderBy: [{ isActive: "desc" }, { displayOrder: "asc" }, { title: "asc" }],
  });

  return (
    <div className="p-6 lg:p-10">
      <RechtlichesClient documents={documents} />
    </div>
  );
}
