import { notFound, redirect } from "next/navigation";
import { getActor } from "@/lib/auth-guards";
import { mayDoStrategy } from "@/lib/team/roles";
import { ladeStudio } from "@/lib/strategie/studio";
import { db } from "@/lib/db";
import { Rundgang } from "@/components/studio/rundgang";
import { formatiereBerlin } from "@/lib/zeit";

/**
 * Die Vorschau des Rundgangs für den Berater.
 *
 * Dieselbe Oberfläche, die der Kunde im Gespräch sieht — nur ohne Freigabe,
 * damit sich das Haus vor dem Termin ansehen lässt. Was der Kunde sieht,
 * hängt weiter an der Freigabe; diese Seite hier erreicht niemand außer
 * jemandem, der Strategiegespräche führen darf.
 */
export default async function StudioVorschau({
  params,
}: {
  params: Promise<{ id: string; sitzungId: string }>;
}) {
  const actor = await getActor();
  if (!actor) redirect("/login");
  if (!mayDoStrategy(actor.role, actor.canStrategy)) redirect("/dashboard");

  const { id, sitzungId } = await params;
  const daten = await ladeStudio(sitzungId);
  if (!daten) notFound();

  const sitzung = await db.strategieSitzung.findUnique({
    where: { id: sitzungId },
    select: { companyId: true, company: { select: { industry: true } }, session: { select: { completedAt: true } } },
  });
  if (!sitzung || sitzung.companyId !== id) notFound();

  const fertig = sitzung.session?.completedAt;

  return (
    <Rundgang
      daten={daten}
      untertitel={sitzung.company.industry ?? null}
      fussnote={fertig ? `Blueprint vom ${formatiereBerlin(fertig).split(",")[0]}` : "Blueprint"}
    />
  );
}
