import { auth } from "@/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { CalendarDays, Video, MapPin, Clock, Plus } from "lucide-react";
import { formatDateTime } from "@/lib/utils";

const TYPE_LABELS: Record<string, string> = {
  STRATEGY: "Strategiegespräch",
  REVIEW: "Review-Termin",
  SUPPORT: "Supporttermin",
  OTHER: "Sonstiger Termin",
};

export default async function TerminePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = await db.user.findUnique({
    where: { id: (session.user as any).id },
    include: {
      company: {
        include: {
          appointments: { orderBy: { startTime: "asc" } },
        },
      },
    },
  });

  if (!user) redirect("/login");

  const now = new Date();
  const upcoming = user.company?.appointments.filter(a => a.startTime >= now) ?? [];
  const past = user.company?.appointments.filter(a => a.startTime < now) ?? [];

  return (
    <div className="max-w-[800px] mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#f0f0f0]">Termine</h1>
          <p className="text-[#888] text-sm mt-1">Ihre Gesprächstermine mit OKUN Systems</p>
        </div>
        <button className="flex items-center gap-2 bg-[#22c55e] hover:bg-[#16a34a] text-black font-semibold text-sm rounded-lg px-4 py-2.5 transition-colors">
          <Plus size={15} />
          Termin anfragen
        </button>
      </div>

      {/* Upcoming */}
      <section className="mb-8">
        <h2 className="text-[#888] text-xs font-medium uppercase tracking-wider mb-4">Bevorstehende Termine</h2>
        {upcoming.length === 0 ? (
          <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-8 text-center">
            <CalendarDays size={28} className="text-[#555] mx-auto mb-3" />
            <p className="text-[#888] text-sm">Keine bevorstehenden Termine.</p>
            <button className="mt-4 bg-[#22c55e] hover:bg-[#16a34a] text-black font-semibold text-sm rounded-lg px-4 py-2 transition-colors">
              Termin buchen
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {upcoming.map((appt) => (
              <AppointmentCard key={appt.id} appointment={appt} />
            ))}
          </div>
        )}
      </section>

      {/* Past */}
      {past.length > 0 && (
        <section>
          <h2 className="text-[#888] text-xs font-medium uppercase tracking-wider mb-4">Vergangene Termine</h2>
          <div className="space-y-3 opacity-60">
            {past.slice(0, 5).map((appt) => (
              <AppointmentCard key={appt.id} appointment={appt} isPast />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function AppointmentCard({
  appointment,
  isPast = false,
}: {
  appointment: {
    id: string; title: string; type: string; description: string | null;
    startTime: Date; endTime: Date; location: string | null; meetingUrl: string | null; status: string;
  };
  isPast?: boolean;
}) {
  const typeLabel = TYPE_LABELS[appointment.type] ?? appointment.type;
  return (
    <div className={`bg-[#141414] border rounded-xl p-5 ${isPast ? "border-[#1e1e1e]" : "border-[#2a2a2a] hover:border-[#22c55e]/20"} transition-colors`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isPast ? "bg-[#1a1a1a]" : "bg-[#22c55e]/10"}`}>
            <CalendarDays size={17} className={isPast ? "text-[#555]" : "text-[#22c55e]"} />
          </div>
          <div>
            <p className="text-[#f0f0f0] font-medium text-sm">{appointment.title}</p>
            <p className="text-[#888] text-xs mt-0.5">{typeLabel}</p>
            {appointment.description && (
              <p className="text-[#666] text-xs mt-1">{appointment.description}</p>
            )}
            <div className="flex flex-wrap gap-4 mt-3">
              <div className="flex items-center gap-1.5 text-[#888] text-xs">
                <Clock size={12} />
                <span>{formatDateTime(appointment.startTime)}</span>
              </div>
              {appointment.location && (
                <div className="flex items-center gap-1.5 text-[#888] text-xs">
                  <MapPin size={12} />
                  <span>{appointment.location}</span>
                </div>
              )}
              {appointment.meetingUrl && (
                <div className="flex items-center gap-1.5 text-[#22c55e] text-xs">
                  <Video size={12} />
                  <a href={appointment.meetingUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">
                    Online-Meeting beitreten
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
        <AppointmentStatusBadge status={appointment.status} isPast={isPast} />
      </div>
    </div>
  );
}

function AppointmentStatusBadge({ status, isPast }: { status: string; isPast: boolean }) {
  if (isPast) return <span className="text-xs text-[#555] px-2 py-0.5 rounded-full bg-[#1a1a1a]">Abgeschlossen</span>;
  const cfg: Record<string, { label: string; cls: string }> = {
    SCHEDULED: { label: "Geplant", cls: "bg-blue-500/10 text-blue-400" },
    COMPLETED: { label: "Fertig", cls: "bg-[#22c55e]/10 text-[#22c55e]" },
    CANCELLED: { label: "Abgesagt", cls: "bg-red-500/10 text-red-400" },
  };
  const c = cfg[status] ?? { label: status, cls: "bg-[#888]/10 text-[#888]" };
  return <span className={`text-xs px-2.5 py-1 rounded-full font-medium flex-shrink-0 ${c.cls}`}>{c.label}</span>;
}
