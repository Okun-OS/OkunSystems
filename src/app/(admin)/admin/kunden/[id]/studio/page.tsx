import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getActor } from "@/lib/auth-guards";
import { mayDoStrategy } from "@/lib/team/roles";

/**
 * Der kurze Weg ins Haus.
 *
 * Das Studio hängt an einer Sitzung, die Sitzung an einem Termin — und
 * deren Kennungen stehen in keiner Adresse, die man sich merken kann. Wer
 * „Haus ansehen" sucht, soll es im Reiter finden und nicht in einer
 * Verkettung von Seiten. Diese Seite sucht die jüngste Sitzung des Betriebs
 * und geht hinein.
 */
export default async function StudioWegweiser({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await getActor();
  if (!actor) redirect("/login");
  if (!mayDoStrategy(actor.role, actor.canStrategy)) redirect("/dashboard");

  const { id } = await params;
  const sitzung = await db.strategieSitzung.findFirst({
    where: { companyId: id },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });

  if (sitzung) redirect(`/admin/kunden/${id}/strategie/${sitzung.id}/studio`);

  return (
    <div className="max-w-[560px]">
      <p className="font-mono text-[#3f5572] text-[9.5px] uppercase tracking-[0.2em] font-semibold">
        Transformation Studio
      </p>
      <h1 className="text-[#f0f0f0] text-xl font-bold mt-1">Das Haus steht noch nicht</h1>
      <p className="text-[#888] text-sm mt-3 leading-relaxed">
        Es entsteht aus dem Blueprint, sobald das Gespräch aufgesetzt ist — ein
        Rundgang vom Vorplatz bis in die Räume, durch den Sie im Termin führen.
      </p>
      <Link
        href={`/admin/kunden/${id}/strategie`}
        className="inline-block mt-5 px-4 py-2.5 rounded-lg bg-[#00b8ff]
          text-[#041018] text-xs font-bold hover:bg-[#33c7ff] transition-colors"
      >
        Zur Vorbereitung →
      </Link>
    </div>
  );
}
