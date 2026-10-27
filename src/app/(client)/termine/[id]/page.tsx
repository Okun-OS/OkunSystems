import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { ensureAppointmentRoom } from "@/lib/daily";
import { fuehrtZurBesprechung, terminartLabel } from "@/lib/termine/arten";
import { formatiereBerlin } from "@/lib/zeit";
import { BeitretenKnopf } from "./BeitretenKnopf";

/**
 * Ein Termin, wie der Kunde ihn sieht.
 *
 * Beitreten und, wenn eines freigegeben wurde, das Protokoll nachlesen.
 * Mehr nicht: Ziel, Vorbereitung, Hinweise und Mitschrift sind unsere
 * Arbeitsunterlagen und bleiben es.
 */
export default async function KundenTermin({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userId = (session.user as { id: string }).id;
  const nutzer = await db.user.findUnique({
    where: { id: userId },
    select: { companyId: true, name: true },
  });
  if (!nutzer?.companyId) redirect("/dashboard");

  const { id } = await params;
  const termin = await db.appointment.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      type: true,
      startTime: true,
      endTime: true,
      status: true,
      companyId: true,
      besprechung: { select: { protokoll: true, freigegebenAm: true } },
    },
  });
  // Ein fremder Termin existiert für diesen Kunden nicht — gar nicht erst
  // „keine Berechtigung" sagen, das verrät schon, dass es ihn gibt.
  if (!termin || termin.companyId !== nutzer.companyId) notFound();

  const besprechung = fuehrtZurBesprechung(termin.type);
  const raum = besprechung ? await ensureAppointmentRoom(id) : null;
  const protokoll = termin.besprechung?.freigegebenAm ? termin.besprechung.protokoll : null;

  return (
    <div className="max-w-[760px] mx-auto pt-6 pb-16 px-4 space-y-5">
      <Link href="/termine" className="text-[#888] hover:text-[#f0f0f0] text-sm transition-colors">
        ← Alle Termine
      </Link>

      <div className="bg-[#0c1520] border border-[#1a2840] rounded-2xl p-6">
        <p className="text-[#888] text-xs tracking-wider uppercase">
          {terminartLabel(termin.type)}
        </p>
        <h1 className="text-xl font-bold text-[#f0f0f0] mt-1">{termin.title}</h1>
        <p className="text-[#888] text-sm mt-1.5">
          {formatiereBerlin(termin.startTime)} Uhr
        </p>

        {besprechung && (
          <div className="mt-5">
            {raum?.ok ? (
              <BeitretenKnopf
                raumUrl={raum.url}
                titel={termin.title}
                name={nutzer.name ?? "Gast"}
              />
            ) : (
              <p className="text-[#5b6b7f] text-xs leading-relaxed">
                Der Videoraum steht noch nicht bereit. Versuchen Sie es kurz vor dem
                Termin noch einmal.
              </p>
            )}
          </div>
        )}
      </div>

      {protokoll && (
        <div className="bg-[#0c1520] border border-[#1a2840] rounded-2xl p-6">
          <h2 className="text-[#f0f0f0] font-semibold text-sm">Protokoll</h2>
          <p className="mt-4 text-[#c9d4e4] text-[13px] leading-relaxed whitespace-pre-wrap">
            {protokoll}
          </p>
        </div>
      )}
    </div>
  );
}
