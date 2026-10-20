import { notFound, redirect } from "next/navigation";
import { getActor } from "@/lib/auth-guards";
import { mayDoStrategy } from "@/lib/team/roles";
import { db } from "@/lib/db";
import { ladeStudio } from "@/lib/strategie/studio";
import { alsAnsicht, GRENZE_AUTOMATISIERUNGEN } from "@/lib/strategie/katalog";
import { GespraechsStudio } from "@/components/studio/gespraechs-studio";
import { formatiereBerlin } from "@/lib/zeit";
import { postenZustandSetzen } from "../../actions";

/**
 * Das Strategiegespräch, wie der Berater es führt.
 *
 * Alles an einem Ort: das Gegenüber, die Auswahl und das Haus. Die Vorschau
 * daneben (`../studio`) zeigt dasselbe Haus ohne Gespräch — zum Ansehen
 * vorher. Hier wird es geführt.
 */
export default async function StrategieGespraech({
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
      posten: {
        where: { zustand: { not: "verworfen" } },
        orderBy: { position: "asc" },
        select: { id: true, titel: true, art: true, zustand: true, womit: true },
      },
    },
  });
  if (!sitzung || sitzung.companyId !== id) notFound();

  const fertig = sitzung.session?.completedAt;

  async function zustandSetzen(postenId: string, zustand: string) {
    "use server";
    return postenZustandSetzen(
      sitzungId,
      postenId,
      zustand as "kandidat" | "gewaehlt" | "spaeter" | "verworfen"
    );
  }

  return (
    <GespraechsStudio
      sitzungId={sitzungId}
      companyId={id}
      daten={daten}
      untertitel={sitzung.company.industry ?? null}
      fussnote={fertig ? `Blueprint vom ${formatiereBerlin(fertig).split(",")[0]}` : "Blueprint"}
      beraterName={actor.name ?? "Ihr Berater"}
      posten={sitzung.posten}
      startOrt={alsAnsicht(sitzung.ansicht)}
      grenze={GRENZE_AUTOMATISIERUNGEN}
      zurueckLink={`/admin/kunden/${id}/strategie`}
      onZustand={zustandSetzen}
    />
  );
}
