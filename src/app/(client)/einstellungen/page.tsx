import { auth } from "@/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { User, Lock, Bell, Shield } from "lucide-react";

export default async function EinstellungenPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = await db.user.findUnique({
    where: { id: (session.user as any).id },
    include: { company: true },
  });

  if (!user) redirect("/login");

  return (
    <div className="max-w-[700px] mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#f0f0f0]">Einstellungen</h1>
        <p className="text-[#888] text-sm mt-1">Profil und Kontoeinstellungen</p>
      </div>

      <div className="space-y-5">
        {/* Profile */}
        <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-6">
          <div className="flex items-center gap-3 mb-5">
            <User size={16} className="text-[#22c55e]" />
            <h2 className="text-[#f0f0f0] font-semibold text-sm">Profil</h2>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#888] mb-1.5">Name</label>
                <input
                  defaultValue={user.name ?? ""}
                  className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-[#f0f0f0] text-sm focus:outline-none focus:border-[#22c55e]/50"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#888] mb-1.5">E-Mail</label>
                <input
                  defaultValue={user.email}
                  disabled
                  className="w-full bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg px-3 py-2.5 text-[#555] text-sm cursor-not-allowed"
                />
              </div>
            </div>
            {user.company && (
              <div>
                <label className="block text-xs font-medium text-[#888] mb-1.5">Unternehmen</label>
                <input
                  defaultValue={user.company.name}
                  disabled
                  className="w-full bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg px-3 py-2.5 text-[#555] text-sm cursor-not-allowed"
                />
              </div>
            )}
            <button className="bg-[#22c55e] hover:bg-[#16a34a] text-black font-semibold text-sm rounded-lg px-4 py-2.5 transition-colors">
              Änderungen speichern
            </button>
          </div>
        </div>

        {/* Password */}
        <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-6">
          <div className="flex items-center gap-3 mb-5">
            <Lock size={16} className="text-[#22c55e]" />
            <h2 className="text-[#f0f0f0] font-semibold text-sm">Passwort ändern</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#888] mb-1.5">Aktuelles Passwort</label>
              <input type="password" placeholder="••••••••" className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-[#f0f0f0] text-sm placeholder-[#555] focus:outline-none focus:border-[#22c55e]/50" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#888] mb-1.5">Neues Passwort</label>
                <input type="password" placeholder="••••••••" className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-[#f0f0f0] text-sm placeholder-[#555] focus:outline-none focus:border-[#22c55e]/50" />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#888] mb-1.5">Passwort bestätigen</label>
                <input type="password" placeholder="••••••••" className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-[#f0f0f0] text-sm placeholder-[#555] focus:outline-none focus:border-[#22c55e]/50" />
              </div>
            </div>
            <button className="bg-[#1a1a1a] hover:bg-[#222] border border-[#2a2a2a] text-[#f0f0f0] font-medium text-sm rounded-lg px-4 py-2.5 transition-colors">
              Passwort aktualisieren
            </button>
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-6">
          <div className="flex items-center gap-3 mb-5">
            <Bell size={16} className="text-[#22c55e]" />
            <h2 className="text-[#f0f0f0] font-semibold text-sm">Benachrichtigungen</h2>
          </div>
          <div className="space-y-3">
            {[
              { label: "Neue Termine", sub: "Bei neuen oder geänderten Terminen" },
              { label: "Dokumente", sub: "Wenn neue Dokumente freigegeben werden" },
              { label: "Projektupdates", sub: "Bei Fortschrittsänderungen" },
              { label: "Ticket-Updates", sub: "Statusänderungen Ihrer Tickets" },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between py-2">
                <div>
                  <p className="text-[#f0f0f0] text-sm">{item.label}</p>
                  <p className="text-[#555] text-xs">{item.sub}</p>
                </div>
                <button className="w-10 h-6 rounded-full bg-[#22c55e] relative transition-colors">
                  <div className="w-4 h-4 rounded-full bg-white absolute right-1 top-1 transition-transform" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
