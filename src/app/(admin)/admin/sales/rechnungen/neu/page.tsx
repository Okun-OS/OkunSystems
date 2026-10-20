import Link from "next/link";
import { redirect } from "next/navigation";
import { getActor } from "@/lib/auth-guards";
import { InvoiceEditor } from "../InvoiceEditor";
import { buildNewInvoiceEditorData } from "../editor-data";

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ closingSessionId?: string; companyId?: string }>;
}) {
  const actor = await getActor();
  if (!actor) redirect("/login");
  if (actor.role !== "ADMIN" && actor.role !== "CLOSER") redirect("/dashboard");

  const { closingSessionId, companyId } = await searchParams;
  const data = await buildNewInvoiceEditorData({ closingSessionId, companyId });

  if (!data) {
    return (
      <div className="max-w-[700px]">
        <h1 className="text-2xl font-bold text-[#eef2f7] mb-2">Rechnung erstellen</h1>
        <p className="text-[#8899b4] text-sm mb-4">
          Für diese Auswahl konnte kein Rechnungsentwurf erzeugt werden. Aus einem Closing heraus
          ist ein eingefrorener Contract Snapshot erforderlich.
        </p>
        <Link href="/admin/sales/rechnungen" className="text-[#00b8ff] text-sm hover:underline">
          Zurück zu den Rechnungen
        </Link>
      </div>
    );
  }

  return <InvoiceEditor data={data} />;
}
