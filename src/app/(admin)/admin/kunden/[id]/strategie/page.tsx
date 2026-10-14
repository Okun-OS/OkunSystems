import { db } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { getActor } from "@/lib/auth-guards";
import { mayDoStrategy } from "@/lib/team/roles";
import { ladeSitzung } from "@/lib/strategie/sitzung";
import StrategieClient from "./StrategieClient";

/**
 * Die Vorbereitung des Strategiegesprächs.
 *
 * Schritt 3 des Projektablaufs: Ergebnispräsentation, Roadmap und Auswahl der
 * Lösungen. Hier wird vorbereitet, was im Gespräch zur Wahl steht — und erst
 * die Freigabe lässt den Kunden etwas davon sehen.
 *
 * Zugang hat, wer Strategiegespräche führen darf. Dieselbe Hürde wie beim
 * Leitfaden: Die Posten stammen von dort und nennen Produkte beim Namen.
 */
export default async function StrategiePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await getActor();
  if (!actor) redirect("/login");
  if (!mayDoStrategy(actor.role, actor.canStrategy)) redirect("/dashboard");

  const { id } = await params;

  const company = await db.company.findUnique({
    where: { id },
    select: { id: true, name: true, contractPackage: true },
  });
  if (!company) notFound();

  /*
    Nur Strategietermine.

    Ein Closing-Termin hat seinen eigenen Arbeitsplatz; ihn hier anzubieten
    führte nur dazu, dass jemand auf dem falschen Termin eine Sitzung aufsetzt
    und sie im Gespräch nicht findet.
  */
  const termine = await db.appointment.findMany({
    where: { companyId: id, type: "STRATEGY" },
    orderBy: { startTime: "desc" },
    select: {
      id: true,
      title: true,
      startTime: true,
      meetingUrl: true,
      strategieSitzung: { select: { id: true, status: true } },
    },
  });

  const blueprint = await db.analysisSession.findFirst({
    where: { companyId: id, blueprintVersion: "2.0", status: "COMPLETED" },
    orderBy: { completedAt: "desc" },
    select: { id: true, completedAt: true },
  });

  const leitfadenVorhanden = blueprint
    ? (await db.strategyGuide.count({ where: { sessionId: blueprint.id } })) > 0
    : false;

  const offeneSitzung = termine.find((t) => t.strategieSitzung)?.strategieSitzung ?? null;
  const sitzung = offeneSitzung ? await ladeSitzung(offeneSitzung.id) : null;

  return (
    <StrategieClient
      company={company}
      termine={termine.map((t) => ({
        id: t.id,
        title: t.title,
        startTime: t.startTime.toISOString(),
        hatRaum: Boolean(t.meetingUrl),
        sitzungId: t.strategieSitzung?.id ?? null,
        sitzungStatus: t.strategieSitzung?.status ?? null,
      }))}
      blueprintFertigAm={blueprint?.completedAt?.toISOString() ?? null}
      leitfadenVorhanden={leitfadenVorhanden}
      sitzung={
        sitzung
          ? {
              ...sitzung,
              freigegebenAm: sitzung.freigegebenAm?.toISOString() ?? null,
              beraterPresenceAt: sitzung.beraterPresenceAt?.toISOString() ?? null,
              abgeschlossenAm: sitzung.abgeschlossenAm?.toISOString() ?? null,
              terminStart: sitzung.terminStart?.toISOString() ?? null,
            }
          : null
      }
    />
  );
}
