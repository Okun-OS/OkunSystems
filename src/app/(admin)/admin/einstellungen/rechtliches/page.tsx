import { redirect } from "next/navigation";

/**
 * Die frühere Verwaltung „Rechtliche Dokumente" ist in die Vertragsdokumente
 * aufgegangen: Datei, Versionen und der zugehörige Checkbox-Text stehen dort
 * gemeinsam auf einer Seite. Der alte Pfad bleibt als Weiterleitung bestehen,
 * damit gespeicherte Links weiter funktionieren.
 *
 * Das direkte Bearbeiten einer bereits veröffentlichten Version ist bewusst
 * entfallen: Sobald ein Kunde einer Fassung zugestimmt hat, muss sie
 * unverändert bleiben, sonst stimmt die hinterlegte Prüfsumme nicht mehr.
 * Änderungen entstehen als neue Version.
 */
export default function RechtlichesPage() {
  redirect("/admin/einstellungen/vertragsdokumente");
}
