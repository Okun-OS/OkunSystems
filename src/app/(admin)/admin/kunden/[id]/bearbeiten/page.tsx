import { auth } from "@/auth";
import { db } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Save } from "lucide-react";

const PROJECT_PHASES = [
  { value: "onboarding",       label: "Onboarding" },
  { value: "blueprint",        label: "Blueprint" },
  { value: "internal_review",  label: "Interne Auswertung" },
  { value: "strategy_session", label: "Strategiegespräch" },
  { value: "learning",         label: "Lernphase" },
  { value: "implementation",   label: "Implementierung" },
  { value: "stabilization",    label: "Stabilisierung" },
  { value: "completed",        label: "Abgeschlossen" },
];

const STATUS_OPTIONS = [
  { value: "ONBOARDING", label: "Onboarding" },
  { value: "ACTIVE",     label: "Aktiv" },
  { value: "INACTIVE",   label: "Inaktiv" },
  { value: "PAUSED",     label: "Pausiert" },
];

export default async function KundeBearbeitenPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if ((session.user as any).role !== "ADMIN") redirect("/dashboard");

  const { id } = await params;

  const company = await db.company.findUnique({
    where: { id },
    select: {
      id: true, name: true, industry: true, website: true, phone: true,
      address: true, status: true, plan: true, contactPerson: true, projectPhase: true,
    },
  });

  if (!company) notFound();

  async function handleSave(formData: FormData) {
    "use server";
    await db.company.update({
      where: { id },
      data: {
        name:          (formData.get("name") as string).trim(),
        industry:      (formData.get("industry") as string) || null,
        website:       (formData.get("website") as string) || null,
        phone:         (formData.get("phone") as string) || null,
        address:       (formData.get("address") as string) || null,
        plan:          (formData.get("plan") as string) || null,
        contactPerson: (formData.get("contactPerson") as string) || null,
        status:        formData.get("status") as string,
        // projectPhase is managed automatically by the workflow — not editable here
      },
    });
    revalidatePath(`/admin/kunden/${id}`);
    redirect(`/admin/kunden/${id}/bearbeiten`);
  }

  return (
    <div className="max-w-[640px] space-y-6">
      <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-6">
        <h2 className="text-[#f0f0f0] font-semibold text-sm mb-5">Stammdaten</h2>

        <form action={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="text-[#888] text-xs block mb-1.5">Unternehmensname *</label>
              <input
                name="name"
                required
                defaultValue={company.name}
                className="w-full bg-[#060a10] border border-[#1a2840] rounded-lg px-3 py-2.5 text-[#f0f0f0] text-sm focus:outline-none focus:border-[#00b8ff]/50"
              />
            </div>

            <div>
              <label className="text-[#888] text-xs block mb-1.5">Ansprechpartner</label>
              <input
                name="contactPerson"
                defaultValue={company.contactPerson ?? ""}
                placeholder="Max Mustermann"
                className="w-full bg-[#060a10] border border-[#1a2840] rounded-lg px-3 py-2.5 text-[#f0f0f0] text-sm placeholder-[#555] focus:outline-none focus:border-[#00b8ff]/50"
              />
            </div>

            <div>
              <label className="text-[#888] text-xs block mb-1.5">Telefon</label>
              <input
                name="phone"
                defaultValue={company.phone ?? ""}
                placeholder="+49 ..."
                className="w-full bg-[#060a10] border border-[#1a2840] rounded-lg px-3 py-2.5 text-[#f0f0f0] text-sm placeholder-[#555] focus:outline-none focus:border-[#00b8ff]/50"
              />
            </div>

            <div>
              <label className="text-[#888] text-xs block mb-1.5">Branche</label>
              <input
                name="industry"
                defaultValue={company.industry ?? ""}
                placeholder="z.B. Gastronomie"
                className="w-full bg-[#060a10] border border-[#1a2840] rounded-lg px-3 py-2.5 text-[#f0f0f0] text-sm placeholder-[#555] focus:outline-none focus:border-[#00b8ff]/50"
              />
            </div>

            <div>
              <label className="text-[#888] text-xs block mb-1.5">Gebuchtes Paket</label>
              <select
                name="plan"
                defaultValue={company.plan ?? ""}
                className="w-full bg-[#060a10] border border-[#1a2840] rounded-lg px-3 py-2.5 text-sm text-[#f0f0f0] focus:outline-none focus:border-[#00b8ff]/50"
              >
                <option value="">— kein Paket —</option>
                <option value="foundation">OKUN Foundation (ab 5.900 €)</option>
                <option value="operations">OKUN Operations (ab 7.500 €)</option>
                <option value="custom">OKUN Custom (ab 20.000 €)</option>
              </select>
            </div>

            <div>
              <label className="text-[#888] text-xs block mb-1.5">Website</label>
              <input
                name="website"
                defaultValue={company.website ?? ""}
                placeholder="https://..."
                className="w-full bg-[#060a10] border border-[#1a2840] rounded-lg px-3 py-2.5 text-[#f0f0f0] text-sm placeholder-[#555] focus:outline-none focus:border-[#00b8ff]/50"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-[#888] text-xs block mb-1.5">Adresse</label>
              <input
                name="address"
                defaultValue={company.address ?? ""}
                placeholder="Musterstraße 1, 12345 Musterstadt"
                className="w-full bg-[#060a10] border border-[#1a2840] rounded-lg px-3 py-2.5 text-[#f0f0f0] text-sm placeholder-[#555] focus:outline-none focus:border-[#00b8ff]/50"
              />
            </div>
          </div>

          <hr className="border-[#1a2840]" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[#888] text-xs block mb-1.5">Account-Status</label>
              <select
                name="status"
                defaultValue={company.status}
                className="w-full bg-[#060a10] border border-[#1a2840] rounded-lg px-3 py-2.5 text-sm text-[#f0f0f0] focus:outline-none focus:border-[#00b8ff]/50"
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[#888] text-xs block mb-1.5">Projektphase</label>
              <div className="w-full bg-[#060a10] border border-[#1a2840] rounded-lg px-3 py-2.5 text-sm text-[#888] flex items-center justify-between">
                <span>{PROJECT_PHASES.find((p) => p.value === company.projectPhase)?.label ?? company.projectPhase}</span>
                <span className="text-xs text-[#555]">automatisch</span>
              </div>
              <p className="text-[#555] text-xs mt-1">Wird automatisch durch den Workflow gesetzt.</p>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2.5 bg-[#00b8ff] hover:bg-[#0099d6] text-white text-sm font-semibold rounded-lg transition-colors"
            >
              <Save size={13} />
              Speichern
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
