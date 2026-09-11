import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getActor } from "@/lib/auth-guards";
import { ErklaerungenClient } from "./ErklaerungenClient";

export default async function ErklaerungenPage() {
  const actor = await getActor();
  if (!actor) redirect("/login");
  if (actor.role !== "ADMIN") redirect("/admin/dashboard");

  const [definitions, documents, packages] = await Promise.all([
    db.consentDefinition.findMany({
      orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
      include: {
        contractDocument: { select: { id: true, name: true } },
        documentVersion: { select: { id: true, version: true, title: true } },
        _count: { select: { consentAuditEvents: true } },
      },
    }),
    db.contractDocument.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        versions: {
          where: { isActive: true },
          select: { id: true, version: true },
          take: 1,
        },
      },
    }),
    db.offerTemplate.findMany({
      where: { status: "published" },
      select: { packageType: true, name: true },
      distinct: ["packageType"],
    }),
  ]);

  return (
    <ErklaerungenClient
      definitions={definitions.map((d) => ({
        id: d.id,
        key: d.key,
        title: d.title,
        checkboxText: d.checkboxText,
        consentType: d.consentType,
        isRequired: d.isRequired,
        isActive: d.isActive,
        displayOrder: d.displayOrder,
        version: d.version,
        appliesTo: Array.isArray(d.appliesTo) ? (d.appliesTo as string[]) : [],
        contractDocumentId: d.contractDocumentId,
        contractDocumentName: d.contractDocument?.name ?? null,
        documentVersionId: d.documentVersionId,
        documentVersionLabel: d.documentVersion?.version ?? null,
        usageCount: d._count.consentAuditEvents,
      }))}
      documents={documents.map((doc) => ({
        id: doc.id,
        name: doc.name,
        activeVersion: doc.versions[0]?.version ?? null,
      }))}
      packages={packages.map((p) => ({ value: p.packageType, label: p.name }))}
    />
  );
}
