import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getActor } from "@/lib/auth-guards";
import { ClosingScriptsClient } from "./ClosingScriptsClient";

export default async function ClosingScriptsPage() {
  const actor = await getActor();
  if (!actor) redirect("/login");
  if (actor.role !== "ADMIN") redirect("/admin/dashboard");

  const [scripts, packages] = await Promise.all([
    db.closingScript.findMany({
      orderBy: [{ kind: "asc" }, { displayOrder: "asc" }, { createdAt: "asc" }],
      include: { _count: { select: { revisions: true } } },
    }),
    db.offerTemplate.findMany({
      where: { status: "published" },
      select: { packageType: true, name: true },
      distinct: ["packageType"],
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <ClosingScriptsClient
      scripts={scripts.map((s) => ({
        id: s.id,
        key: s.key,
        kind: s.kind,
        title: s.title,
        body: s.body,
        packageType: s.packageType,
        addonKey: s.addonKey,
        displayOrder: s.displayOrder,
        isActive: s.isActive,
        version: s.version,
        revisionCount: s._count.revisions,
      }))}
      packages={packages.map((p) => ({ value: p.packageType, label: p.name }))}
    />
  );
}
