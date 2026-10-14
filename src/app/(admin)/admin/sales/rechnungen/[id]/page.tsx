import { redirect } from "next/navigation";
import { getActor } from "@/lib/auth-guards";
import { InvoiceEditor } from "../InvoiceEditor";
import { loadInvoiceEditorData } from "../editor-data";

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const actor = await getActor();
  if (!actor) redirect("/login");
  if (actor.role !== "ADMIN" && actor.role !== "CLOSER") redirect("/dashboard");

  const data = await loadInvoiceEditorData(id);
  if (!data) redirect("/admin/sales/rechnungen");

  return <InvoiceEditor data={data} />;
}
