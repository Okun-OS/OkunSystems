import { db } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { getActor } from "@/lib/auth-guards";
import { mayDoStrategy } from "@/lib/team/roles";
import { findePosten } from "@/lib/strategy-guide/anleitung";
import type { Anleitung } from "@/lib/strategy-guide/types";
import AnleitungClient from "./AnleitungClient";

/**
 * Die Umsetzungsanleitung zu einem Posten.
 *
 * Interne Unterlage für die Abteilung, die es einrichtet — nicht für das
 * Kundengespräch. Derselbe Zugang wie beim Leitfaden.
 */
export default async function AnleitungPage({
  params,
}: {
  params: Promise<{ id: string; schluessel: string }>;
}) {
  const actor = await getActor();
  if (!actor) redirect("/login");
  if (!mayDoStrategy(actor.role, actor.canStrategy)) redirect("/dashboard");

  const { id, schluessel } = await params;
  const entschluesselt = decodeURIComponent(schluessel);

  const company = await db.company.findUnique({
    where: { id },
    select: { id: true, name: true },
  });
  if (!company) notFound();

  const blueprint = await db.analysisSession.findFirst({
    where: { companyId: id, blueprintVersion: "2.0", status: "COMPLETED" },
    orderBy: { completedAt: "desc" },
    select: { id: true },
  });
  if (!blueprint) notFound();

  const posten = await findePosten(blueprint.id, entschluesselt);
  if (!posten) notFound();

  const abgelegt = await db.umsetzungsAnleitung.findUnique({
    where: {
      sessionId_schluessel: { sessionId: blueprint.id, schluessel: entschluesselt },
    },
    include: { createdBy: { select: { name: true, email: true } } },
  });

  let anleitung: Anleitung | null = null;
  if (abgelegt) {
    try {
      anleitung = JSON.parse(abgelegt.content) as Anleitung;
    } catch {
      anleitung = null;
    }
  }

  return (
    <AnleitungClient
      companyId={company.id}
      companyName={company.name}
      sessionId={blueprint.id}
      schluessel={entschluesselt}
      posten={posten}
      anleitung={anleitung}
      erstelltAm={abgelegt?.updatedAt.toISOString() ?? null}
      erstelltVon={abgelegt?.createdBy.name ?? abgelegt?.createdBy.email ?? null}
    />
  );
}
