import { auth } from "@/auth";
import { db } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import LeitfadenClient from "./LeitfadenClient";
import type { GuideDocument, ProtokollEintrag } from "@/lib/strategy-guide/types";

/**
 * Der Leitfaden für das Strategiegespräch.
 *
 * Interne Unterlage: Sie sagt dem Kollegen, der das Gespräch führt, was wir
 * festgestellt haben, wie er es vorträgt und welche Projekte sich anbieten.
 * Der Kunde darf sie nie sehen.
 *
 * Vorerst nur für Admin. Ein CLOSER käme hier ohnehin nicht an — seine äußere
 * Schranke endet bei `/admin/sales` (siehe `role-access.ts`). Soll er den
 * Leitfaden führen dürfen, ist das eine bewusste Änderung an den Rollenregeln
 * und nicht hier zu entscheiden.
 */
export default async function LeitfadenPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const rolle = (session.user as { role?: string }).role;
  if (rolle !== "ADMIN") redirect("/dashboard");

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
    try {
      document = JSON.parse(v.content) as GuideDocument;
    } catch {
      document = null;
    }
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
