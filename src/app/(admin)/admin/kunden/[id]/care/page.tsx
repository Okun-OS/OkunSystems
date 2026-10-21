import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getActor } from "@/lib/auth-guards";
import { ladeCare } from "@/lib/care/leistungen";
import { CareClient } from "./CareClient";

/**
 * OKUN Care, von unserer Seite.
 *
 * Der Kunde sieht auf seiner Care-Seite ein Protokoll — hier entsteht es.
 * Ohne diese Seite wäre das Protokoll eine Tabelle, die niemand füllt, und
 * damit ein leeres Versprechen auf der Kundenseite.
 */
export default async function AdminCarePage({
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

  // Hier auch die internen Zeilen: Wer das Protokoll führt, muss sehen, was
  // er bewusst nicht gezeigt hat.
  const stand = await ladeCare(id, false);

  return <CareClient company={company} stand={stand} />;
}
