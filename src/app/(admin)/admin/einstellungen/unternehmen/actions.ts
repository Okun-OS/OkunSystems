"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, guarded } from "@/lib/auth-guards";
import { COMPANY_SETTING_FIELDS, saveCompanySettings } from "@/lib/company-settings";

export async function saveCompanySettingsAction(formData: FormData) {
  return guarded(async () => {
    await requireAdmin();
    const values: Record<string, string> = {};
    for (const field of COMPANY_SETTING_FIELDS) {
      const raw = formData.get(field.key);
      if (typeof raw === "string") values[field.key] = raw;
    }
    await saveCompanySettings(values);
    revalidatePath("/admin/einstellungen/unternehmen");
    revalidatePath("/admin/sales/rechnungen");
    return { ok: true };
  });
}
