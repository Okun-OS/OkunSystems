import { db } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { getActor } from "@/lib/auth-guards";
import { mayDoStrategy } from "@/lib/team/roles";
import LeitfadenClient from "./LeitfadenClient";
import type { GuideDocument, ProtokollEintrag } from "@/lib/strategy-guide/types";
import { leseGuide } from "@/lib/strategy-guide/normalisieren";

/**
 * Der Leitfaden für das Strategiegespräch.
 *
 * Interne Unterlage: Sie sagt dem Kollegen, der das Gespräch führt, was wir
 * festgestellt haben, wie er es vorträgt und welche Projekte sich anbieten.
 * Der Kunde darf sie nie sehen.
 *
 * Zugang hat, wer Strategiegespräche führen darf — Administratoren ohnehin,
 * sonst nur mit ausdrücklich erteiltem Recht. Wer allein Closing-Gespräche
 * führt, kommt hier nicht herein.
 */
export default async function LeitfadenPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Die Rolle kommt aus der Datenbank, nicht aus dem JWT: ein Recht, das
  // gerade entzogen wurde, soll nicht bis zum nächsten Anmelden fortwirken.
  const actor = await getActor();
  if (!actor) redirect("/login");
  if (!mayDoStrategy(actor.role, actor.canStrategy)) redirect("/dashboard");

  const { id } = await params;

  const company = await db.company.findUnique({
    where: { id },
    select: { id: true, name: true, plan: true },
  });
  if (!company) notFound();

  const blueprint = await db.analysisSession.findFirst({
    where: { companyId: id, blueprintVersion: "2.0", status: "COMPLETED" },
    orderBy: { completedAt: "desc" },
    select: { id: true, completedAt: true, reportTexts: true },
  });

  const guide = blueprint
    ? await db.strategyGuide.findUnique({
        where: { sessionId: blueprint.id },
        include: {
          versions: {
            orderBy: { version: "desc" },
            include: { createdBy: { select: { name: true, email: true } } },
          },
        },
      })
    : null;

  const fassungen = (guide?.versions ?? []).map((v) => {
    let document: GuideDocument | null = null;
    let protokoll: ProtokollEintrag[] = [];
    // Über leseGuide, nicht roh: Fassungen aus der Zeit vor einem neuen
    // Abschnitt kennen dessen Feld nicht, und ein Zugriff darauf ließe die
    // Seite abstürzen.
    document = leseGuide(v.content);
    try {
      protokoll = JSON.parse(v.reviewLog) as ProtokollEintrag[];
    } catch {
      protokoll = [];
    }
    return {
      version: v.version,
      instruction: v.instruction,
      rounds: v.rounds,
      createdAt: v.createdAt.toISOString(),
      createdBy: v.createdBy.name ?? v.createdBy.email,
      document,
      protokoll,
    };
  });

  return (
    <LeitfadenClient
      companyName={company.name}
      companyId={company.id}
      sessionId={blueprint?.id ?? null}
      blueprintCompletedAt={blueprint?.completedAt?.toISOString() ?? null}
      hatBerichtstexte={!!blueprint?.reportTexts}
      fassungen={fassungen}
    />
  );
}
