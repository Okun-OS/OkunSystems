import { redirect } from "next/navigation";

/**
 * Die alte Strategie-Übersicht — nur noch als Wegweiser.
 *
 * Sie zählte Betriebe nach `OkunScore` und schickte von dort in die alte
 * Vorbereitung. Beides stammt aus der Zeit vor dem Blueprint 2.0; in der
 * Navigation stand sie schon lange nicht mehr. Das Strategiegespräch beginnt
 * heute beim Betrieb, also führt dieser Weg dorthin.
 */
export default function AlteStrategieUebersicht() {
  redirect("/admin/kunden");
}
