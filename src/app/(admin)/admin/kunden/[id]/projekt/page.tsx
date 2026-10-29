import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getActor } from "@/lib/auth-guards";
import { auftragsPosten, type AuftragsPosten } from "@/lib/projekt/auftrag";
import { ProjektClient } from "./ProjektClient";

/**
 * Die Umsetzung, wie wir sie führen.
 *
 * Zwischen dem Strategiegespräch und dem fertigen System lagen bisher Wochen
 * ohne Spur im Portal: Der Kunde hatte seine Auswahl gesehen und danach
 * nichts mehr. Hier wird daraus eine Liste mit drei Zuständen — und genau
 * die liest er auf seiner Projektseite.
 */
export default async function AdminProjektPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await getActor();
  if (!actor) redirect("/login");
  if (actor.role === "CLIENT") redirect("/dashboard");

  const { id } = await params;
  const company = await db.company.findUnique({
    where: { id },
    select: { id: true, name: true },
  });
  if (!company) notFound();

  const projekte = await db.project.findMany({
    where: { companyId: id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      description: true,
      status: true,
      progress: true,
      isVisibleToClient: true,
      strategieSitzungId: true,
      milestones: {
        orderBy: { order: "asc" },
        select: { id: true, title: true, description: true, zustand: true },
      },
    },
  });

  /*
    Welche Sitzung noch nicht übernommen ist.

    Nur freigegebene Gespräche: Vor der Freigabe ist die Auswahl noch im
    Werden, und ein Projekt daraus wäre ein Versprechen, das niemand gegeben
    hat.
  */
  const sitzungen = await db.strategieSitzung.findMany({
    where: { companyId: id, freigegebenAm: { not: null }, projekt: null },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      abgeschlossenAm: true,
      posten: {
        select: {
          id: true,
          titel: true,
          warum: true,
          art: true,
          zustand: true,
          kundeSieht: true,
          position: true,
        },
      },
    },
  });

  const offeneAuftraege = sitzungen
    .map((s) => ({
      sitzungId: s.id,
      abgeschlossenAm: s.abgeschlossenAm,
      posten: auftragsPosten(s.posten as AuftragsPosten[]).map((p) => p.titel),
    }))
    .filter((s) => s.posten.length > 0);

  return (
    <ProjektClient
      company={company}
      projekte={projekte}
      offeneAuftraege={offeneAuftraege}
    />
  );
}
