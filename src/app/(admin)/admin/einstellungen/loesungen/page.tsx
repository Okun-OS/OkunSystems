import { auth } from "@/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { ArrowLeft, Plus, Pencil, Trash2, Package, CheckCircle, Circle } from "lucide-react";

export default async function LoesungenPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN") redirect("/login");

  const { edit } = await searchParams;

  const solutions = await db.solutionLibrary.findMany({
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });

  const editTarget = edit ? solutions.find((s) => s.id === edit) : null;

  async function createSolution(formData: FormData) {
    "use server";
    const name = formData.get("name") as string;
    const category = formData.get("category") as string;
    const description = formData.get("description") as string;
    const externalId = formData.get("externalId") as string;
    const packageTypesRaw = formData.getAll("packageType") as string[];

    if (!name || !category || !description || !externalId) return;

    await db.solutionLibrary.create({
      data: {
        externalId,
        name,
        category,
        description,
        packageTypes: JSON.stringify(packageTypesRaw),
        isActive: true,
      },
    });
    revalidatePath("/admin/einstellungen/loesungen");
  }

  async function updateSolution(formData: FormData) {
    "use server";
    const id = formData.get("id") as string;
    const name = formData.get("name") as string;
    const category = formData.get("category") as string;
    const description = formData.get("description") as string;
    const packageTypesRaw = formData.getAll("packageType") as string[];
    const isActive = formData.get("isActive") === "true";

    await db.solutionLibrary.update({
      where: { id },
      data: { name, category, description, packageTypes: JSON.stringify(packageTypesRaw), isActive },
    });
    redirect("/admin/einstellungen/loesungen");
  }

  async function deleteSolution(formData: FormData) {
    "use server";
    const id = formData.get("id") as string;
    await db.solutionLibrary.delete({ where: { id } });
    revalidatePath("/admin/einstellungen/loesungen");
  }

  const byCategory = solutions.reduce<Record<string, typeof solutions>>((acc, s) => {
    if (!acc[s.category]) acc[s.category] = [];
    acc[s.category].push(s);
    return acc;
  }, {});

  const PACKAGE_OPTIONS = [
    { value: "foundation", label: "Foundation" },
    { value: "operations", label: "Operations" },
    { value: "custom", label: "Custom" },
  ];

  function SolutionForm({
    action,
    initial,
  }: {
    action: (fd: FormData) => Promise<void>;
    initial?: typeof solutions[0];
  }) {
    const pkgs: string[] = initial ? JSON.parse(initial.packageTypes || "[]") : [];
    return (
      <form action={action} className="space-y-4">
        {initial && <input type="hidden" name="id" value={initial.id} />}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-[#888] mb-1.5">Name *</label>
            <input
              name="name"
              required
              defaultValue={initial?.name}
              className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-[#f0f0f0] text-sm placeholder-[#555] focus:outline-none focus:border-[#22c55e]/50"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#888] mb-1.5">Kategorie *</label>
            <input
              name="category"
              required
              defaultValue={initial?.category}
              placeholder="z.B. CRM, HR, Buchhaltung"
              className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-[#f0f0f0] text-sm placeholder-[#555] focus:outline-none focus:border-[#22c55e]/50"
            />
          </div>
        </div>

        {!initial && (
          <div>
            <label className="block text-xs font-medium text-[#888] mb-1.5">Externe ID *</label>
            <input
              name="externalId"
              required
              placeholder="z.B. SOL_CRM_001"
              className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-[#f0f0f0] text-sm placeholder-[#555] focus:outline-none focus:border-[#22c55e]/50"
            />
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-[#888] mb-1.5">Beschreibung *</label>
          <textarea
            name="description"
            required
            defaultValue={initial?.description}
            rows={3}
            className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-[#f0f0f0] text-sm placeholder-[#555] focus:outline-none focus:border-[#22c55e]/50 resize-none"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-[#888] mb-2">Pakete</label>
          <div className="flex items-center gap-3">
            {PACKAGE_OPTIONS.map((opt) => (
              <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="packageType"
                  value={opt.value}
                  defaultChecked={pkgs.includes(opt.value)}
                  className="rounded"
                />
                <span className="text-[#888] text-sm">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>

        {initial && (
          <div>
            <label className="block text-xs font-medium text-[#888] mb-2">Status</label>
            <select
              name="isActive"
              defaultValue={initial.isActive ? "true" : "false"}
              className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-sm text-[#f0f0f0] focus:outline-none"
            >
              <option value="true">Aktiv</option>
              <option value="false">Inaktiv</option>
            </select>
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            className="flex items-center gap-2 px-4 py-2.5 bg-[#22c55e] hover:bg-[#16a34a] text-black font-semibold text-sm rounded-lg transition-colors"
          >
            {initial ? "Speichern" : "Hinzufügen"}
          </button>
          {initial && (
            <Link
              href="/admin/einstellungen/loesungen"
              className="px-4 py-2.5 bg-[#1a1a1a] hover:bg-[#222] border border-[#2a2a2a] text-[#888] text-sm rounded-lg transition-colors"
            >
              Abbrechen
            </Link>
          )}
        </div>
      </form>
    );
  }

  return (
    <div className="max-w-[1000px] mx-auto">
      <div className="mb-6">
        <Link
          href="/admin/einstellungen"
          className="inline-flex items-center gap-2 text-[#888] hover:text-[#f0f0f0] text-sm mb-4 transition-colors"
        >
          <ArrowLeft size={15} />
          Einstellungen
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#f0f0f0]">Lösungskatalog</h1>
            <p className="text-[#888] text-sm mt-1">{solutions.length} Lösungen im Katalog</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Edit / Create form */}
        <div className="lg:col-span-2">
          <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-5 sticky top-6">
            <h2 className="text-[#f0f0f0] font-semibold text-sm mb-4 flex items-center gap-2">
              <Plus size={14} className="text-[#22c55e]" />
              {editTarget ? "Lösung bearbeiten" : "Neue Lösung"}
            </h2>
            {editTarget ? (
              <SolutionForm action={updateSolution} initial={editTarget} />
            ) : (
              <SolutionForm action={createSolution} />
            )}
          </div>
        </div>

        {/* Solution list */}
        <div className="lg:col-span-3 space-y-6">
          {Object.keys(byCategory).length === 0 && (
            <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-12 text-center">
              <Package size={32} className="text-[#333] mx-auto mb-3" />
              <p className="text-[#555] text-sm">Noch keine Lösungen im Katalog.</p>
            </div>
          )}

          {(Object.entries(byCategory) as [string, typeof solutions][]).map(([cat, items]) => (
            <div key={cat}>
              <h2 className="text-[#888] text-xs font-semibold uppercase tracking-wider mb-2">
                {cat}
              </h2>
              <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl overflow-hidden">
                <div className="divide-y divide-[#2a2a2a]">
                  {items.map((sol) => {
                    const pkgs: string[] = JSON.parse(sol.packageTypes || "[]");
                    return (
                      <div key={sol.id} className="flex items-start gap-3 px-5 py-4">
                        <div className="flex-shrink-0 mt-0.5">
                          {sol.isActive ? (
                            <CheckCircle size={15} className="text-[#22c55e]" />
                          ) : (
                            <Circle size={15} className="text-[#555]" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[#f0f0f0] text-sm font-medium">{sol.name}</p>
                          <p className="text-[#555] text-xs mt-0.5 line-clamp-2 leading-relaxed">
                            {sol.description}
                          </p>
                          {pkgs.length > 0 && (
                            <div className="flex items-center gap-1.5 mt-1.5">
                              {pkgs.map((p) => (
                                <span
                                  key={p}
                                  className="text-xs px-1.5 py-0.5 rounded bg-[#1a1a1a] border border-[#2a2a2a] text-[#888] capitalize"
                                >
                                  {p}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Link
                            href={`/admin/einstellungen/loesungen?edit=${sol.id}`}
                            className="p-1.5 rounded-lg hover:bg-[#1a1a1a] text-[#555] hover:text-[#888] transition-colors"
                          >
                            <Pencil size={13} />
                          </Link>
                          <form action={deleteSolution}>
                            <input type="hidden" name="id" value={sol.id} />
                            <button
                              type="submit"
                              className="p-1.5 rounded-lg hover:bg-red-500/10 text-[#555] hover:text-red-400 transition-colors"
                            >
                              <Trash2 size={13} />
                            </button>
                          </form>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
