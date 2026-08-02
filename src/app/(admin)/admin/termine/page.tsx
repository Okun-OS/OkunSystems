import { auth } from "@/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { CalendarDays, Video, Clock, ArrowRight, Plus } from "lucide-react";

function statusLabel(s: string) {
  switch (s) {
    case "SCHEDULED": return { label: "Geplant", cls: "text-blue-400 bg-blue-500/10 border-blue-500/20" };
    case "COMPLETED": return { label: "Durchgeführt", cls: "text-[#22c55e] bg-[#22c55e]/10 border-[#22c55e]/20" };
    case "CANCELLED": return { label: "Abgesagt", cls: "text-red-400 bg-red-500/10 border-red-500/20" };
    default: return { label: s, cls: "text-[#888] bg-[#1a1a1a] border-[#2a2a2a]" };
  }
}

export default async function AdminTerminePage() {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN") redirect("/login");

  const appointments = await db.appointment.findMany({
    include: {
      company: { select: { id: true, name: true } },
    },
    orderBy: { startTime: "desc" },
  });

  const upcoming = appointments.filter((a) => a.startTime >= new Date() && a.status !== "CANCELLED");
  const past = appointments.filter((a) => a.startTime < new Date() || a.status === "CANCELLED");

  return (
    <div className="max-w-[1100px] mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#f0f0f0]">Termine</h1>
          <p className="text-[#888] text-sm mt-1">Alle Kundentermine im Überblick</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-5">
          <p className="text-[#888] text-xs mb-2">Bevorstehend</p>
          <p className="text-[#22c55e] text-3xl font-bold">{upcoming.length}</p>
        </div>
        <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-5">
          <p className="text-[#888] text-xs mb-2">Durchgeführt</p>
          <p className="text-[#f0f0f0] text-3xl font-bold">
            {appointments.filter((a) => a.status === "COMPLETED").length}
          </p>
        </div>
        <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-5">
          <p className="text-[#888] text-xs mb-2">Gesamt</p>
          <p className="text-[#888] text-3xl font-bold">{appointments.length}</p>
        </div>
      </div>

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <div className="mb-8">
          <h2 className="text-[#f0f0f0] font-semibold text-sm mb-3 flex items-center gap-2">
            <Clock size={15} className="text-[#22c55e]" />
            Bevorstehende Termine
          </h2>
          <div className="space-y-2">
            {upcoming.map((appt) => {
              const sc = statusLabel(appt.status);
              return (
                <Link
                  key={appt.id}
                  href={`/admin/termine/${appt.id}`}
                  className="bg-[#141414] border border-[#2a2a2a] hover:border-[#22c55e]/30 rounded-xl p-4 flex items-center justify-between group transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-[#22c55e]/10 border border-[#22c55e]/20 flex items-center justify-center flex-shrink-0">
                      <CalendarDays size={16} className="text-[#22c55e]" />
                    </div>
                    <div>
                      <p className="text-[#f0f0f0] font-medium text-sm">{appt.title}</p>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-[#888] text-xs">{appt.company.name}</span>
                        <span className="text-[#555] text-xs">·</span>
                        <span className="text-[#888] text-xs">
                          {new Date(appt.startTime).toLocaleDateString("de-DE", {
                            day: "2-digit", month: "long", year: "numeric",
                          })}{" "}
                          {new Date(appt.startTime).toLocaleTimeString("de-DE", {
                            hour: "2-digit", minute: "2-digit",
                          })} Uhr
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {appt.meetingUrl && (
                      <Video size={14} className="text-blue-400" />
                    )}
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${sc.cls}`}>
                      {sc.label}
                    </span>
                    <ArrowRight size={14} className="text-[#555] group-hover:text-[#22c55e] transition-colors" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Past */}
      {past.length > 0 && (
        <div>
          <h2 className="text-[#888] font-semibold text-sm mb-3">
            Vergangene Termine
          </h2>
          <div className="space-y-2 opacity-70">
            {past.map((appt) => {
              const sc = statusLabel(appt.status);
              return (
                <Link
                  key={appt.id}
                  href={`/admin/termine/${appt.id}`}
                  className="bg-[#141414] border border-[#2a2a2a] hover:border-[#3a3a3a] rounded-xl p-4 flex items-center justify-between group transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center flex-shrink-0">
                      <CalendarDays size={16} className="text-[#555]" />
                    </div>
                    <div>
                      <p className="text-[#888] font-medium text-sm">{appt.title}</p>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-[#555] text-xs">{appt.company.name}</span>
                        <span className="text-[#333] text-xs">·</span>
                        <span className="text-[#555] text-xs">
                          {new Date(appt.startTime).toLocaleDateString("de-DE", {
                            day: "2-digit", month: "long", year: "numeric",
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${sc.cls}`}>
                      {sc.label}
                    </span>
                    <ArrowRight size={14} className="text-[#444]" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {appointments.length === 0 && (
        <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-16 text-center">
          <CalendarDays size={40} className="text-[#333] mx-auto mb-4" />
          <p className="text-[#888] text-sm">Noch keine Termine vorhanden.</p>
          <p className="text-[#555] text-xs mt-1">
            Termine werden über das Buchungsformular oder direkt im Kundenprofil angelegt.
          </p>
        </div>
      )}
    </div>
  );
}
