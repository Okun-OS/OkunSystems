import { auth } from "@/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Settings, Video, Upload, Trash2 } from "lucide-react";

export default async function AdminEinstellungenPage() {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN") redirect("/login");

  const settings = await db.systemSetting.findMany();
  const settingMap = Object.fromEntries(settings.map((s) => [s.key, s.value]));

  async function saveSetting(formData: FormData) {
    "use server";
    const key = formData.get("key") as string;
    const value = formData.get("value") as string;
    await db.systemSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
    revalidatePath("/admin/einstellungen");
  }

  async function deleteSetting(formData: FormData) {
    "use server";
    const key = formData.get("key") as string;
    await db.systemSetting.deleteMany({ where: { key } });
    revalidatePath("/admin/einstellungen");
  }

  return (
    <div className="max-w-[800px] mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#f0f0f0]">Systemeinstellungen</h1>
        <p className="text-[#888] text-sm mt-1">Plattformweite Konfiguration</p>
      </div>

      {/* Welcome video */}
      <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-6 mb-6">
        <div className="flex items-center gap-2 mb-5">
          <Video size={16} className="text-[#22c55e]" />
          <h2 className="text-[#f0f0f0] font-semibold text-sm">Willkommensvideo</h2>
        </div>

        <p className="text-[#888] text-xs leading-relaxed mb-4">
          Das Willkommensvideo wird auf dem Client-Dashboard angezeigt.
          Hinterlegen Sie die URL eines öffentlich erreichbaren Videos (z.B. aus Cloudflare R2 mit öffentlicher Domain,
          Vimeo, oder einem anderen Videohoster).
        </p>

        {settingMap["welcome_video_url"] && (
          <div className="mb-4 bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg p-3">
            <p className="text-[#555] text-xs mb-1">Aktuell gesetzt:</p>
            <p className="text-[#22c55e] text-xs font-mono break-all">{settingMap["welcome_video_url"]}</p>
          </div>
        )}

        <form action={saveSetting} className="space-y-3">
          <input type="hidden" name="key" value="welcome_video_url" />
          <div>
            <label className="block text-xs font-medium text-[#888] mb-1.5">Video-URL</label>
            <input
              name="value"
              type="url"
              defaultValue={settingMap["welcome_video_url"] ?? ""}
              placeholder="https://..."
              className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-[#f0f0f0] text-sm placeholder-[#555] focus:outline-none focus:border-[#22c55e]/50"
            />
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              className="flex items-center gap-2 px-4 py-2 bg-[#22c55e] hover:bg-[#16a34a] text-black text-sm font-semibold rounded-lg transition-colors"
            >
              <Upload size={13} />
              Speichern
            </button>
            {settingMap["welcome_video_url"] && (
              <form action={deleteSetting}>
                <input type="hidden" name="key" value="welcome_video_url" />
                <button
                  type="submit"
                  className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-sm rounded-lg transition-colors"
                >
                  <Trash2 size={13} />
                  Entfernen
                </button>
              </form>
            )}
          </div>
        </form>
      </div>

      {/* Other settings */}
      <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-6">
        <div className="flex items-center gap-2 mb-5">
          <Settings size={16} className="text-[#888]" />
          <h2 className="text-[#f0f0f0] font-semibold text-sm">Weitere Einstellungen</h2>
        </div>

        <form action={saveSetting} className="space-y-4">
          <input type="hidden" name="key" value="platform_name" />
          <div>
            <label className="block text-xs font-medium text-[#888] mb-1.5">Plattformname</label>
            <input
              name="value"
              defaultValue={settingMap["platform_name"] ?? "OKUN Client Portal"}
              className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-[#f0f0f0] text-sm placeholder-[#555] focus:outline-none focus:border-[#22c55e]/50"
            />
          </div>
          <button
            type="submit"
            className="flex items-center gap-2 px-4 py-2 bg-[#22c55e] hover:bg-[#16a34a] text-black text-sm font-semibold rounded-lg transition-colors"
          >
            <Upload size={13} />
            Speichern
          </button>
        </form>
      </div>
    </div>
  );
}
