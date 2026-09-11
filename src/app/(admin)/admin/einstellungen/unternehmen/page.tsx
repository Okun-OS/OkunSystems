import { redirect } from "next/navigation";
import { getActor } from "@/lib/auth-guards";
import { COMPANY_SETTING_FIELDS, getCompanySettings } from "@/lib/company-settings";
import { UnternehmenClient } from "./UnternehmenClient";

export default async function UnternehmensEinstellungenPage() {
  const actor = await getActor();
  if (!actor) redirect("/login");
  if (actor.role !== "ADMIN") redirect("/admin/dashboard");

  const settings = await getCompanySettings();
  return <UnternehmenClient fields={COMPANY_SETTING_FIELDS} settings={settings} />;
}
