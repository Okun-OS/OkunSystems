import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getActor } from "@/lib/auth-guards";
import { VorlagenClient } from "./VorlagenClient";

export default async function VorlagenPage({
  searchParams,
}: {
  searchParams: Promise<{ template?: string }>;
}) {
  const actor = await getActor();
  if (!actor) redirect("/login");
  if (actor.role !== "ADMIN") redirect("/admin/dashboard");

  const { template: selectedId } = await searchParams;

  const templates = await db.documentTemplate.findMany({
    orderBy: [{ type: "asc" }, { name: "asc" }],
    include: {
      versions: { orderBy: { version: "desc" }, select: { version: true, note: true, createdAt: true } },
      customPlaceholders: { orderBy: { displayOrder: "asc" } },
    },
  });

  const active = templates.find((t) => t.id === selectedId) ?? templates[0] ?? null;
  const activeVersion = active
    ? await db.documentTemplateVersion.findFirst({
        where: { templateId: active.id, version: active.currentVersion },
      })
    : null;

  return (
    <VorlagenClient
      templates={templates.map((t) => ({
        id: t.id,
        type: t.type,
        name: t.name,
        description: t.description,
        isActive: t.isActive,
        isDefault: t.isDefault,
        currentVersion: t.currentVersion,
        versions: t.versions.map((v) => ({
          version: v.version,
          note: v.note,
          createdAt: v.createdAt.toISOString(),
        })),
        placeholders: t.customPlaceholders.map((p) => ({
          id: p.id,
          key: p.key,
          label: p.label,
          type: p.type,
          defaultValue: p.defaultValue,
          isRequired: p.isRequired,
        })),
      }))}
      activeId={active?.id ?? null}
      activeHtml={activeVersion?.html ?? ""}
      activeCss={activeVersion?.css ?? ""}
    />
  );
}
