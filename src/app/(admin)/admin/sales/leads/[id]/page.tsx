import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { LeadDetailClient } from "./LeadDetailClient";
import {
  getMasterDataRequirements,
  validateMasterData,
  MASTER_DATA_FIELDS,
} from "@/lib/closing/master-data";

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const session = await auth();
  if (!session?.user) redirect("/login");
  const userId = (session.user as { id: string }).id;
  const userRecord = await db.user.findUnique({ where: { id: userId } });
  if (!userRecord || (userRecord.role !== "ADMIN" && userRecord.role !== "CLOSER")) {
    redirect("/dashboard");
  }

  const company = await db.company.findUnique({
    where: { id },
    include: {
      assignedCloser: { select: { id: true, name: true } },
      notes: {
        include: { author: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 50,
      },
      closingSessions: {
        include: {
          appointment: { select: { startTime: true, endTime: true, title: true } },
          closer: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      },
      invoices: {
        orderBy: { createdAt: "desc" },
        take: 5,
      },
      _count: {
        select: { closingSessions: true, offers: true, invoices: true },
      },
    },
  });

  if (!company || company.leadStatus === null) {
    redirect("/admin/sales/leads");
  }

  // CLOSER can only access their assigned leads
  if (
    userRecord.role === "CLOSER" &&
    company.assignedCloserId !== userId
  ) {
    redirect("/admin/sales/leads");
  }

  // Serverseitige Vollständigkeitsprüfung der Vertragsstammdaten.
  const requirements = await getMasterDataRequirements();
  const validation = validateMasterData(company, requirements);
  const masterDataValues = Object.fromEntries(
    [...MASTER_DATA_FIELDS.map((f) => f.key), "billingDiffers", "billingHouseNumber", "billingCountry"].map(
      (key) => [key, (company as unknown as Record<string, unknown>)[key] ?? null]
    )
  );

  const closers = await db.user.findMany({
    where: { role: { in: ["ADMIN", "CLOSER"] } },
    select: { id: true, name: true, role: true },
    orderBy: { name: "asc" },
  });

  return (
    <LeadDetailClient
      company={company as any}
      closers={closers}
      currentUserId={userId}
      currentUserRole={userRecord.role}
      masterData={{
        values: masterDataValues as Record<string, string | boolean | null>,
        // Alle aktiven Felder übergeben: die rechtsform- und
        // rechnungsanschriftabhängige Sichtbarkeit steuert das Formular selbst,
        // damit sich die Rechtsform überhaupt erst auswählen lässt.
        requirements: requirements
          .filter((req) => req.isActive)
          .map((req) => ({
            key: req.key,
            label: req.label,
            group: req.group,
            isRequired: req.isRequired,
            helpText: req.helpText,
          })),
        missing: validation.missing.map((m) => ({ key: m.key, label: m.label })),
      }}
    />
  );
}
