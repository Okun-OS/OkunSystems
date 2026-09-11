import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getActor } from "@/lib/auth-guards";
import { VertragsdokumenteClient } from "./VertragsdokumenteClient";

export default async function VertragsdokumentePage() {
  const actor = await getActor();
  if (!actor) redirect("/login");
  if (actor.role !== "ADMIN") redirect("/admin/dashboard");

  const documents = await db.contractDocument.findMany({
    orderBy: [{ isActive: "desc" }, { displayOrder: "asc" }, { name: "asc" }],
    include: {
      versions: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          version: true,
          title: true,
          isActive: true,
          sha256: true,
          r2Key: true,
          content: true,
          fileName: true,
          fileSize: true,
          createdAt: true,
          validFrom: true,
          validUntil: true,
          _count: { select: { consentAuditEvents: true } },
        },
      },
    },
  });

  return (
    <VertragsdokumenteClient
      documents={documents.map((doc) => ({
        id: doc.id,
        type: doc.type,
        name: doc.name,
        description: doc.description,
        isActive: doc.isActive,
        displayOrder: doc.displayOrder,
        versions: doc.versions.map((v) => ({
          id: v.id,
          version: v.version,
          title: v.title,
          isActive: v.isActive,
          sha256: v.sha256,
          hasFile: Boolean(v.r2Key),
          hasContent: Boolean(v.content),
          fileName: v.fileName,
          fileSize: v.fileSize,
          createdAt: v.createdAt.toISOString(),
          validFrom: v.validFrom ? v.validFrom.toISOString() : null,
          validUntil: v.validUntil ? v.validUntil.toISOString() : null,
          usageCount: v._count.consentAuditEvents,
        })),
      }))}
    />
  );
}
