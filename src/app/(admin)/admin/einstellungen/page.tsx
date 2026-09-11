import { auth } from "@/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Settings, Video, Upload, Trash2, Package, ArrowRight, Link2, FileText } from "lucide-react";
import Link from "next/link";
import { WelcomeVideoUpload } from "./WelcomeVideoUpload";
import { AdminTwoFASection } from "./AdminTwoFASection";

export default async function AdminEinstellungenPage() {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN") redirect("/login");

  const adminUserId = (session.user as any).id as string;
  const adminUser = await db.user.findUnique({
    where: { id: adminUserId },
    select: { twoFactorEnabled: true },
  });

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

      {/* Admin 2FA */}
      <AdminTwoFASection initialEnabled={adminUser?.twoFactorEnabled ?? false} />

      {/* Welcome video */}
      <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-6 mb-6">
        <div className="flex items-center gap-2 mb-5">
          <Video size={16} className="text-[#00b8ff]" />
          <h2 className="text-[#f0f0f0] font-semibold text-sm">Willkommensvideo</h2>
        </div>

        <p className="text-[#888] text-xs leading-relaxed mb-4">
          Das Willkommensvideo wird auf dem Client-Dashboard angezeigt.
          Hinterlegen Sie die URL eines öffentlich erreichbaren Videos (z.B. aus Cloudflare R2 mit öffentlicher Domain,
          Vimeo, oder einem anderen Videohoster).
        </p>

        {settingMap["welcome_video_url"] && (
          <div className="mb-4 bg-[#060a10] border border-[#1a2840] rounded-lg p-3">
            <p className="text-[#555] text-xs mb-1">Aktuell gesetzt:</p>
            <p className="text-[#00b8ff] text-xs font-mono break-all">{settingMap["welcome_video_url"]}</p>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <p className="text-xs font-medium text-[#888] mb-2 flex items-center gap-1.5">
              <Upload size={11} />
              Datei hochladen (R2)
            </p>
            <WelcomeVideoUpload />
          </div>

          <div className="flex items-center gap-3 my-1">
            <div className="flex-1 h-px bg-[#1a2840]" />
            <span className="text-[#555] text-xs">oder URL manuell eingeben</span>
            <div className="flex-1 h-px bg-[#1a2840]" />
          </div>

          <form action={saveSetting} className="space-y-3">
            <input type="hidden" name="key" value="welcome_video_url" />
            <div>
              <label className="block text-xs font-medium text-[#888] mb-1.5 flex items-center gap-1.5">
                <Link2 size={11} />
                Video-URL
              </label>
              <input
                name="value"
                type="url"
                defaultValue={settingMap["welcome_video_url"] ?? ""}
                placeholder="https://..."
                className="w-full bg-[#060a10] border border-[#1a2840] rounded-lg px-3 py-2.5 text-[#f0f0f0] text-sm placeholder-[#555] focus:outline-none focus:border-[#00b8ff]/50"
              />
            </div>
            <button
              type="submit"
              className="flex items-center gap-2 px-4 py-2 bg-[#00b8ff] hover:bg-[#0099d6] text-white text-sm font-semibold rounded-lg transition-colors"
            >
              <Upload size={13} />
              URL speichern
            </button>
          </form>
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
      </div>

      {/* Solution Library */}
      <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package size={16} className="text-[#888]" />
            <h2 className="text-[#f0f0f0] font-semibold text-sm">Lösungskatalog</h2>
          </div>
          <Link
            href="/admin/einstellungen/loesungen"
            className="flex items-center gap-1.5 text-[#00b8ff] text-sm hover:underline"
          >
            Verwalten
            <ArrowRight size={14} />
          </Link>
        </div>
        <p className="text-[#888] text-xs mt-2 leading-relaxed">
          Lösungen im Katalog pflegen – Kategorien, Pakete und Beschreibungen.
        </p>
      </div>

      {/* Closing Portal */}
      <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <FileText size={16} className="text-[#00b8ff]" />
          <h2 className="text-[#f0f0f0] font-semibold text-sm">Closing Portal</h2>
        </div>
        <p className="text-[#888] text-xs mb-5 leading-relaxed">
          Vertragsabschluss, Nachweiskette und Rechnungsdokumente. Alle Texte und Dokumente
          werden hier gepflegt – im Code ist nichts davon fest hinterlegt.
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          {[
            {
              href: "/admin/einstellungen/unternehmen",
              title: "Unternehmensdaten",
              desc: "Firmierung, Anschrift, Bank, Register – Grundlage für Rechnungen und Protokolle.",
            },
            {
              href: "/admin/einstellungen/vertragsdokumente",
              title: "Vertragsdokumente",
              desc: "AGB, AVV & Anlagen mit unveränderlicher Versionierung und SHA-256-Nachweis.",
            },
            {
              href: "/admin/einstellungen/erklaerungen",
              title: "Erklärungen & Checkboxen",
              desc: "Wortlaut aller Checkboxen – inklusive der Einwilligung zur Aufzeichnung.",
            },
            {
              href: "/admin/einstellungen/closing-scripts",
              title: "Closing Scripts",
              desc: "Teleprompter-Texte für die Vertragsaufzeichnung inkl. Platzhaltern.",
            },
            {
              href: "/admin/einstellungen/vorlagen",
              title: "Dokumentvorlagen",
              desc: "Rechnungs- und Protokollvorlage im OKUN-Briefbogen, versioniert.",
            },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block px-4 py-3.5 rounded-lg border border-[#1a2840] bg-[#0a1119] hover:border-[#00b8ff]/40 transition-colors group"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[#eef2f7] text-sm font-semibold">{item.title}</span>
                <ArrowRight size={14} className="text-[#5b6b7f] group-hover:text-[#00b8ff]" />
              </div>
              <p className="text-[#5b6b7f] text-xs mt-1 leading-relaxed">{item.desc}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Legal documents */}
      <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-[#888]" />
            <h2 className="text-[#f0f0f0] font-semibold text-sm">Rechtliche Dokumente</h2>
          </div>
          <Link
            href="/admin/einstellungen/rechtliches"
            className="flex items-center gap-1.5 text-[#00b8ff] text-sm hover:underline"
          >
            Verwalten
            <ArrowRight size={14} />
          </Link>
        </div>
        <p className="text-[#888] text-xs mt-2 leading-relaxed">
          Alter Bestand aus der Zeit vor der Dokumentversionierung. Für neue Abschlüsse gilt
          ausschlie&szlig;lich &bdquo;Vertragsdokumente&ldquo; im Closing Portal.
        </p>
      </div>

      {/* Integrations */}
      <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings size={16} className="text-[#00b8ff]" />
            <h2 className="text-[#f0f0f0] font-semibold text-sm">Integrationen &amp; Status</h2>
          </div>
          <Link
            href="/admin/einstellungen/integrationen"
            className="flex items-center gap-1.5 text-[#00b8ff] text-sm hover:underline"
          >
            Überprüfen
            <ArrowRight size={14} />
          </Link>
        </div>
        <p className="text-[#888] text-xs mt-2 leading-relaxed">
          Verbundene Dienste prüfen – R2, Stripe, Resend, Daily.co, Auth und mehr.
        </p>
      </div>

      {/* Other settings */}
      <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-6">
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
              className="w-full bg-[#060a10] border border-[#1a2840] rounded-lg px-3 py-2.5 text-[#f0f0f0] text-sm placeholder-[#555] focus:outline-none focus:border-[#00b8ff]/50"
            />
          </div>
          <button
            type="submit"
            className="flex items-center gap-2 px-4 py-2 bg-[#00b8ff] hover:bg-[#0099d6] text-white text-sm font-semibold rounded-lg transition-colors"
          >
            <Upload size={13} />
            Speichern
          </button>
        </form>
      </div>
    </div>
  );
}
