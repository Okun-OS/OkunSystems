import { redirect } from "next/navigation";
import { getActor } from "@/lib/auth-guards";
import { db } from "@/lib/db";
import DemoClient from "./DemoClient";
import { DEMO_FIRMA } from "@/lib/demo/nordlicht";

/**
 * Demo-Daten anlegen und entfernen.
 *
 * Nur für Administratoren: Die Seite schreibt und löscht Unternehmensdaten.
 */
export default async function DemoPage() {
  const actor = await getActor();
  if (!actor) redirect("/login");
  if (actor.role !== "ADMIN") redirect("/dashboard");

  const vorhanden = await db.company.findFirst({
    where: { name: { contains: "Nordlicht" } },
    select: { id: true, name: true },
  });

  return (
    <DemoClient
      firmenname={DEMO_FIRMA}
      vorhandenId={vorhanden?.id ?? null}
      vorhandenName={vorhanden?.name ?? null}
    />
  );
}
