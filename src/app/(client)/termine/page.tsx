import { auth } from "@/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { CalendarDays, Video, MapPin, Clock } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { requireBlueprintComplete } from "@/lib/require-blueprint";
import BookingCalendar from "@/components/BookingCalendar";

const TYPE_LABELS: Record<string, string> = {
  STRATEGY: "Strategiegespräch",
  REVIEW: "Review-Termin",
  SUPPORT: "Supporttermin",
  OTHER: "Sonstiger Termin",
};

export default async function TerminePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userId = (session.user as { id: string }).id;
  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      company: {
        include: {
          appointments: { orderBy: { startTime: "asc" } },
        },
      },
    },
  });

  if (!user) redirect("/login");
  if (!user.companyId) redirect("/dashboard");

  await requireBlueprintComplete(user.companyId);

  const now = new Date();
  const upcoming = user.company?.appointments.filter((a) => a.startTime >= now) ?? [];
  const past = user.company?.appointments.filter((a) => a.startTime < now) ?? [];

  const hasUpcoming = upcoming.length > 0;

  return (
    <div className="max-w-[800px] mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#f0f0f0]">Strategiegespräch buchen</h1>
        <p className="text-[#888] text-sm mt-1">
          Besprechen Sie Ihre Blueprint-Ergebnisse persönlich mit Ihrem OKUN-Berater.
        </p>
      </div>

      {/* Booking section */}
      {!hasUpcoming ? (
        <section className="mb-10">
          <div className="bg-[#00b8ff]/5 border border-[#00b8ff]/20 rounded-xl p-5 mb-6">
            <h2 className="text-[#f0f0f0] font-semibold text-sm mb-1">
              Auswertungsgespräch vereinbaren
            </h2>
            <p className="text-[#888] text-xs leading-relaxed">
              Wählen Sie einen Termin — frühestens 3 Werktage ab heute, damit wir ausreichend Zeit
              haben, Ihre Analyse detailliert vorzubereiten. Das Gespräch dauert ca. 45–60 Minuten.
            </p>
          </div>
          <BookingCalendar
            userName={user.name ?? "Kunde"}
            userEmail={user.email ?? ""}
            minDays={3}
          />
        </section>
      ) : (
        <section className="mb-10">
          <div className="bg-[#0c1520] border border-[#00b8ff]/20 rounded-xl p-5 mb-5">
            <div className="flex items-center gap-2 mb-1">
              <CalendarDays size={16} className="text-[#00b8ff]" />
              <p className="text-[#f0f0f0] font-semibold text-sm">Sie haben bereits einen Termin</p>
            </div>
            <p className="text-[#888] text-xs">
              Ihr nächstes Gespräch ist unten aufgeführt. Schreiben Sie uns, wenn Sie einen anderen
              Termin benötigen.
            </p>
          </div>
        </section>
      )}

      {/* Upcoming appointments */}
      {upcoming.length > 0 && (
        <section className="mb-8">
          <h2 className="text-[#888] text-xs font-medium uppercase tracking-wider mb-4">
            Bevorstehende Termine
          </h2>
          <div className="space-y-3">
            {upcoming.map((appt) => (
              <AppointmentCard key={appt.id} appointment={appt} />
            ))}
          </div>
        </section>
      )}

      {/* Past appointments */}
      {past.length > 0 && (
        <section>
          <h2 className="text-[#888] text-xs font-medium uppercase tracking-wider mb-4">
            Vergangene Termine
          </h2>
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
    id: string;
    title: string;
    type: string;
    description: string | null;
    startTime: Date;
    endTime: Date;
    location: string | null;
    meetingUrl: string | null;
    status: string;
  };
  isPast?: boolean;
}) {
  const typeLabel = TYPE_LABELS[appointment.type] ?? appointment.type;
  return (
    <div
      className={`bg-[#0c1520] border rounded-xl p-5 ${
        isPast ? "border-[#111e30]" : "border-[#1a2840] hover:border-[#00b8ff]/20"
      } transition-colors`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
              isPast ? "bg-[#101c2e]" : "bg-[#00b8ff]/10"
            }`}
          >
            <CalendarDays size={17} className={isPast ? "text-[#555]" : "text-[#00b8ff]"} />
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
                <div className="flex items-center gap-1.5 text-[#00b8ff] text-xs">
                  <Video size={12} />
                  <a
                    href={appointment.meetingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                  >
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
  if (isPast)
    return (
      <span className="text-xs text-[#555] px-2 py-0.5 rounded-full bg-[#101c2e]">
        Abgeschlossen
      </span>
    );
  const cfg: Record<string, { label: string; cls: string }> = {
    SCHEDULED: { label: "Geplant", cls: "bg-blue-500/10 text-blue-400" },
    COMPLETED: { label: "Fertig", cls: "bg-[#00b8ff]/10 text-[#00b8ff]" },
    CANCELLED: { label: "Abgesagt", cls: "bg-red-500/10 text-red-400" },
  };
  const c = cfg[status] ?? { label: status, cls: "bg-[#888]/10 text-[#888]" };
  return (
    <span className={`text-xs px-2.5 py-1 rounded-full font-medium flex-shrink-0 ${c.cls}`}>
      {c.label}
    </span>
  );
}
