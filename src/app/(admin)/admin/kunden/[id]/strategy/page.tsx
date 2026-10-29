import { redirect } from "next/navigation";

/**
 * Die alte Strategie-Vorbereitung — nur noch als Wegweiser.
 *
 * Sie hing am `OkunScore`, den allein die alte Advisor-Analyse schrieb. Wer
 * den Blueprint 2.0 durchlaufen hat, hatte keinen: Die Seite meldete „No
 * score available" und war eine Sackgasse — mit Leitfaden daneben, aber ohne
 * Weg ins Transformation Studio. Wer hier noch landet, kommt über ein
 * Lesezeichen aus dieser Zeit.
 *
 * Deshalb steht hier keine zweite Vorbereitung mehr, sondern ein Umzug auf
 * die, die es gibt.
 */
export default async function AlteStrategieSeite({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/admin/kunden/${id}/strategie`);
}
