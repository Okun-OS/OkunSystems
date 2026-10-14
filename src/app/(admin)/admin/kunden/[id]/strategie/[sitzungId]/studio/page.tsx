import { notFound, redirect } from "next/navigation";
import { getActor } from "@/lib/auth-guards";
import { mayDoStrategy } from "@/lib/team/roles";
import { ladeStudio } from "@/lib/strategie/studio";
import { db } from "@/lib/db";
import { StudioFuehrung } from "@/components/studio/fuehrung-client";
import { alsAnsicht } from "@/lib/strategie/katalog";
import { formatiereBerlin } from "@/lib/zeit";

/**
 * Der Rundgang aus Sicht des Beraters.
 *
 * Dieselbe Oberfläche, die der Kunde sieht — hier steuert sie. Jeder Schritt
 * wird gemeldet, und die Kundenseite folgt ihm. Vor dem Termin ist das die
 * Vorschau: Das Haus lässt sich ansehen, auch ohne Freigabe. Beim Kunden
 * erscheint trotzdem nichts, denn dort hängt alles an der Freigabe.
 *
 * Diese Seite erreicht niemand außer jemandem, der Strategiegespräche führen
 * darf.
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
    select: {
      companyId: true,
      ansicht: true,
      company: { select: { industry: true } },
      session: { select: { completedAt: true } },
    },
  });
  if (!sitzung || sitzung.companyId !== id) notFound();

  const fertig = sitzung.session?.completedAt;

  return (
    <StudioFuehrung
      sitzungId={sitzungId}
      daten={daten}
      untertitel={sitzung.company.industry ?? null}
      fussnote={fertig ? `Blueprint vom ${formatiereBerlin(fertig).split(",")[0]}` : "Blueprint"}
      /*
        Wer die Seite neu lädt, steht wieder da, wo er stehen geblieben ist —
        sonst fängt der Rundgang mitten im Gespräch von vorne an.
      */
      startOrt={alsAnsicht(sitzung.ansicht)}
    />
  );
}
