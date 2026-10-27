import { auth } from "@/auth";
import { berlinZeitpunkt, formatiereBerlin } from "@/lib/zeit";
import { STANDARD_ART, terminart, waehlbareArten } from "@/lib/termine/arten";
import { db } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { CalendarDays, Video, Plus, ArrowRight } from "lucide-react";

function statusLabel(s: string) {
  switch (s) {
    case "SCHEDULED": return { label: "Geplant", cls: "text-blue-400 bg-blue-500/10 border-blue-500/20" };
    case "COMPLETED": return { label: "Durchgeführt", cls: "text-[#00b8ff] bg-[#00b8ff]/10 border-[#00b8ff]/20" };
    case "CANCELLED": return { label: "Abgesagt", cls: "text-red-400 bg-red-500/10 border-red-500/20" };
    default: return { label: s, cls: "text-[#888] bg-[#101c2e] border-[#1a2840]" };
  }
}

export default async function CustomerTerminePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") redirect("/login");

  const { id } = await params;

  const company = await db.company.findUnique({
    where: { id },
    select: { id: true, name: true },
  });
  if (!company) notFound();

  const appointments = await db.appointment.findMany({
    where: { companyId: id },
    orderBy: { startTime: "desc" },
  });

  const adminId = (session.user as { id: string }).id;

  async function createAppointment(formData: FormData) {
    "use server";
    const title = formData.get("title") as string;
    const artRoh = String(formData.get("art") ?? STANDARD_ART);
    const art = terminart(artRoh) ? artRoh : STANDARD_ART;
    const startDate = formData.get("startDate") as string;
    const startTime = formData.get("startTime") as string;
    const endTime = formData.get("endTime") as string;
    const notes = formData.get("notes") as string;

    if (!title || !startDate || !startTime || !endTime) return;

    /*
      Die Eingabe meint Berliner Zeit, nicht Serverzeit.

      `new Date("2026-11-05T10:00")` liest die Zeit in der Zone des
      Prozesses — bei Railway ist das UTC. Angelegt wurde 10 Uhr, im Portal
      des Kunden stand 11. Dasselbe Problem wie seinerzeit bei der
      Terminbuchung, nur an einer zweiten Stelle.
    */
    const startDt = berlinAus(startDate, startTime);
    const endDt = berlinAus(startDate, endTime);
    if (!startDt || !endDt) return;

    await db.appointment.create({
      data: {
        title,
        /*
          Die Art wird gewählt, nicht angenommen.

          Vorher wurde jeder hier angelegte Termin ein Strategiegespräch —
          auch die Rückfrage von zwanzig Minuten. Der Videoraum hieß dann
          „strategiegespraech-…", und im Portal des Kunden stand es auch so.
        */
        type: art,
        startTime: startDt,
        endTime: endDt,
        notes: notes || null,
        status: "SCHEDULED",
        companyId: id,
      },
    });
    revalidatePath(`/admin/kunden/${id}/termine`);
  }

  return (
    <div className="space-y-6">
      {/* New appointment form */}
      <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-5">
        <h2 className="text-[#f0f0f0] font-semibold text-sm mb-4 flex items-center gap-2">
          <Plus size={15} className="text-[#00b8ff]" />
          Neuen Termin anlegen
        </h2>
        <form action={createAppointment} className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-[#888] mb-1.5">Art *</label>
            <select
              name="art"
              defaultValue={STANDARD_ART}
              className="w-full bg-[#060a10] border border-[#1a2840] rounded-lg px-3 py-2.5 text-[#f0f0f0] text-sm focus:outline-none focus:border-[#00b8ff]/50"
            >
              {waehlbareArten().map((a) => (
                <option key={a.key} value={a.key}>
                  {a.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[#888] mb-1.5">Titel *</label>
            <input
              name="title"
              required
              defaultValue="Besprechung"
              placeholder="Worum geht es?"
              className="w-full bg-[#060a10] border border-[#1a2840] rounded-lg px-3 py-2.5 text-[#f0f0f0] text-sm placeholder-[#555] focus:outline-none focus:border-[#00b8ff]/50"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#888] mb-1.5">Datum *</label>
            <input
              name="startDate"
              type="date"
              required
              className="w-full bg-[#060a10] border border-[#1a2840] rounded-lg px-3 py-2.5 text-[#f0f0f0] text-sm focus:outline-none focus:border-[#00b8ff]/50"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-[#888] mb-1.5">Von *</label>
              <input
                name="startTime"
                type="time"
                required
                defaultValue="10:00"
                className="w-full bg-[#060a10] border border-[#1a2840] rounded-lg px-3 py-2.5 text-[#f0f0f0] text-sm focus:outline-none focus:border-[#00b8ff]/50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#888] mb-1.5">Bis *</label>
              <input
                name="endTime"
                type="time"
                required
                defaultValue="11:00"
                className="w-full bg-[#060a10] border border-[#1a2840] rounded-lg px-3 py-2.5 text-[#f0f0f0] text-sm focus:outline-none focus:border-[#00b8ff]/50"
              />
            </div>
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-[#888] mb-1.5">Notizen (optional)</label>
            <textarea
              name="notes"
              rows={2}
              placeholder="Interne Notizen zum Termin…"
              className="w-full bg-[#060a10] border border-[#1a2840] rounded-lg px-3 py-2.5 text-[#f0f0f0] text-sm placeholder-[#555] focus:outline-none focus:border-[#00b8ff]/50 resize-none"
            />
          </div>
          <div className="col-span-2">
            <button
              type="submit"
              className="flex items-center gap-2 px-4 py-2 bg-[#00b8ff] hover:bg-[#0099d6] text-white font-semibold text-sm rounded-lg transition-colors"
            >
              <Plus size={14} />
              Termin anlegen
            </button>
          </div>
        </form>
      </div>

      {/* Appointment list */}
      <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#1a2840]">
          <h2 className="text-[#f0f0f0] font-semibold text-sm flex items-center gap-2">
            <CalendarDays size={15} className="text-[#00b8ff]" />
            Termine ({appointments.length})
          </h2>
        </div>

        {appointments.length === 0 ? (
          <div className="p-8 text-center">
            <CalendarDays size={32} className="text-[#333] mx-auto mb-3" />
            <p className="text-[#555] text-sm">Noch keine Termine für diesen Kunden.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#1a2840]">
            {appointments.map((appt) => {
              const sc = statusLabel(appt.status);
              return (
                <Link
                  key={appt.id}
                  href={`/admin/termine/${appt.id}`}
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-[#101c2e] transition-colors"
                >
                  <CalendarDays size={14} className="text-[#555] flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[#f0f0f0] text-sm font-medium">{appt.title}</p>
                    {/*
                      In Berliner Zeit, nicht in Serverzeit.

                      Ohne Zone formatiert der Server in UTC — der Kunde las
                      im Portal 10 Uhr, hier stand 9. Dieselbe Zahl auf
                      beiden Seiten ist das Mindeste bei einem Termin.
                    */}
                    <p className="text-[#555] text-xs mt-0.5">
                      {formatiereBerlin(appt.startTime)} Uhr
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {appt.meetingUrl && (
                      <Video size={13} className="text-blue-400" />
                    )}
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${sc.cls}`}>
                      {sc.label}
                    </span>
                    <ArrowRight size={13} className="text-[#555]" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/** „2026-11-05" und „10:00" als der Moment, in dem es in Berlin so spät ist. */
function berlinAus(datum: string, zeit: string): Date | null {
  const tag = /^(\d{4})-(\d{2})-(\d{2})$/.exec(datum);
  const uhr = /^(\d{2}):(\d{2})$/.exec(zeit);
  if (!tag || !uhr) return null;
  return berlinZeitpunkt(
    Number(tag[1]),
    Number(tag[2]),
    Number(tag[3]),
    Number(uhr[1]),
    Number(uhr[2])
  );
}
