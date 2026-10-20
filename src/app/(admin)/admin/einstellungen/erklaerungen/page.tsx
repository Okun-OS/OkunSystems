import { redirect } from "next/navigation";

/**
 * Erklärungen werden gemeinsam mit den zugehörigen Dokumenten gepflegt.
 * Dieser Pfad bleibt für bestehende Verweise bestehen.
 */
export default function ErklaerungenPage() {
  redirect("/admin/einstellungen/vertragsdokumente");
}
