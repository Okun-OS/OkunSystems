import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getActor } from "@/lib/auth-guards";
import { VertragsdokumenteClient } from "./VertragsdokumenteClient";

export default async function VertragsdokumentePage() {
  const actor = await getActor();
  if (!actor) redirect("/login");
  if (actor.role !== "ADMIN") redirect("/admin/dashboard");

  const [documents, standaloneConsents] = await Promise.all([
    db.contractDocument.findMany({
      orderBy: [{ isActive: "desc" }, { displayOrder: "asc" }, { name: "asc" }],
      include: {
        versions: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            version: true,
            isActive: true,
            sha256: true,
            r2Key: true,
            content: true,
            fileName: true,
            createdAt: true,
            _count: { select: { consentAuditEvents: true } },
          },
        },
        consentDefinitions: {
          orderBy: { createdAt: "asc" },
          include: { _count: { select: { consentAuditEvents: true } } },
        },
      },
    }),
    // Erklärungen ohne Dokumentbezug — typischerweise die Einwilligung in die
    // Vertragsaufzeichnung.
    db.consentDefinition.findMany({
      where: { contractDocumentId: null, documentVersionId: null },
      orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
      include: { _count: { select: { consentAuditEvents: true } } },
    }),
  ]);

  const mapConsent = (c: {
    id: string;
    title: string;
    checkboxText: string;
    consentType: string;
    isRequired: boolean;
    isActive: boolean;
    displayOrder: number;
    version: number;
    _count: { consentAuditEvents: number };
  }) => ({
    id: c.id,
    title: c.title,
    checkboxText: c.checkboxText,
    consentType: c.consentType,
    isRequired: c.isRequired,
    isActive: c.isActive,
    displayOrder: c.displayOrder,
    version: c.version,
    usageCount: c._count.consentAuditEvents,
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
        consent: doc.consentDefinitions[0] ? mapConsent(doc.consentDefinitions[0]) : null,
        versions: doc.versions.map((v) => ({
          id: v.id,
          version: v.version,
          isActive: v.isActive,
          sha256: v.sha256,
          hasFile: Boolean(v.r2Key),
          hasContent: Boolean(v.content),
          fileName: v.fileName,
          createdAt: v.createdAt.toISOString(),
          usageCount: v._count.consentAuditEvents,
        })),
      }))}
      standaloneConsents={standaloneConsents.map(mapConsent)}
    />
  );
}
