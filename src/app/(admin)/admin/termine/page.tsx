import { auth } from "@/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { CalendarDays, Video, Clock, ArrowRight } from "lucide-react";
import { formatiereBerlin } from "@/lib/zeit";
import { terminartLabel } from "@/lib/termine/arten";
import { gegenueber } from "@/lib/termine/gegenueber";
import { NeuerTermin } from "./NeuerTermin";

function statusLabel(s: string) {
  switch (s) {
    case "SCHEDULED": return { label: "Geplant", cls: "text-blue-400 bg-blue-500/10 border-blue-500/20" };
    case "COMPLETED": return { label: "Durchgeführt", cls: "text-[#00b8ff] bg-[#00b8ff]/10 border-[#00b8ff]/20" };
    case "CANCELLED": return { label: "Abgesagt", cls: "text-red-400 bg-red-500/10 border-red-500/20" };
    default: return { label: s, cls: "text-[#888] bg-[#101c2e] border-[#1a2840]" };
  }
}

export default async function AdminTerminePage() {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") redirect("/login");

  const [appointments, kunden] = await Promise.all([
    db.appointment.findMany({
      include: {
        company: { select: { id: true, name: true } },
      },
      orderBy: { startTime: "desc" },
    }),
    db.company.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const upcoming = appointments.filter((a) => a.startTime >= new Date() && a.status !== "CANCELLED");
  const past = appointments.filter((a) => a.startTime < new Date() || a.status === "CANCELLED");

  return (
    <div className="max-w-[1100px] mx-auto">
      <div className="flex items-start justify-between gap-4 flex-wrap mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#f0f0f0]">Termine</h1>
          <p className="text-[#888] text-sm mt-1">
            Alle Termine im Überblick — mit Kunden und mit allen anderen
          </p>
        </div>
        <NeuerTermin kunden={kunden} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-5">
          <p className="text-[#888] text-xs mb-2">Bevorstehend</p>
          <p className="text-[#00b8ff] text-3xl font-bold">{upcoming.length}</p>
        </div>
        <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-5">
          <p className="text-[#888] text-xs mb-2">Durchgeführt</p>
          <p className="text-[#f0f0f0] text-3xl font-bold">
            {appointments.filter((a) => a.status === "COMPLETED").length}
          </p>
        </div>
        <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-5">
          <p className="text-[#888] text-xs mb-2">Gesamt</p>
          <p className="text-[#888] text-3xl font-bold">{appointments.length}</p>
        </div>
      </div>

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <div className="mb-8">
          <h2 className="text-[#f0f0f0] font-semibold text-sm mb-3 flex items-center gap-2">
            <Clock size={15} className="text-[#00b8ff]" />
            Bevorstehende Termine
          </h2>
          <div className="space-y-2">
            {upcoming.map((appt) => {
              const sc = statusLabel(appt.status);
              const mit = gegenueber(appt);
              return (
                <Link
                  key={appt.id}
                  href={`/admin/termine/${appt.id}`}
                  className="bg-[#0c1520] border border-[#1a2840] hover:border-[#00b8ff]/30 rounded-xl p-4 flex items-center justify-between gap-4 group transition-colors"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-[#00b8ff]/10 border border-[#00b8ff]/20 flex items-center justify-center flex-shrink-0">
                      <CalendarDays size={16} className="text-[#00b8ff]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[#f0f0f0] font-medium text-sm truncate">{appt.title}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-[#888] text-xs">{mit.name}</span>
                        {!mit.companyId && (
                          <span className="text-[10px] px-1.5 py-px rounded-full border border-[#1a2840] text-[#6b7f99]">
                            kein Kunde
                          </span>
                        )}
                        <span className="text-[#555] text-xs">·</span>
                        <span className="text-[#888] text-xs">{terminartLabel(appt.type)}</span>
                        <span className="text-[#555] text-xs">·</span>
                        {/*
                          Berliner Zeit, nicht Serverzeit — sonst steht hier
                          eine andere Stunde als im Portal des Kunden.
                        */}
                        <span className="text-[#888] text-xs">
                          {formatiereBerlin(appt.startTime, {
                            day: "2-digit", month: "long", year: "numeric",
                            hour: "2-digit", minute: "2-digit",
                          })} Uhr
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {appt.meetingUrl && (
                      <Video size={14} className="text-blue-400" />
                    )}
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${sc.cls}`}>
                      {sc.label}
                    </span>
                    <ArrowRight size={14} className="text-[#555] group-hover:text-[#00b8ff] transition-colors" />
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
              const mit = gegenueber(appt);
              return (
                <Link
                  key={appt.id}
                  href={`/admin/termine/${appt.id}`}
                  className="bg-[#0c1520] border border-[#1a2840] hover:border-[#3a3a3a] rounded-xl p-4 flex items-center justify-between gap-4 group transition-colors"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-[#101c2e] border border-[#1a2840] flex items-center justify-center flex-shrink-0">
                      <CalendarDays size={16} className="text-[#555]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[#888] font-medium text-sm truncate">{appt.title}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-[#555] text-xs">{mit.name}</span>
                        <span className="text-[#333] text-xs">·</span>
                        <span className="text-[#555] text-xs">{terminartLabel(appt.type)}</span>
                        <span className="text-[#333] text-xs">·</span>
                        <span className="text-[#555] text-xs">
                          {formatiereBerlin(appt.startTime, {
                            day: "2-digit", month: "long", year: "numeric",
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
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
        <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-16 text-center">
          <CalendarDays size={40} className="text-[#333] mx-auto mb-4" />
          <p className="text-[#888] text-sm">Noch keine Termine vorhanden.</p>
          <p className="text-[#555] text-xs mt-1">
            Oben rechts anlegen — mit einem Kunden oder mit jemandem, der noch keiner ist.
          </p>
        </div>
      )}
    </div>
  );
}
