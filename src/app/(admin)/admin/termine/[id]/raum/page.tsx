import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { getActor } from "@/lib/auth-guards";
import { beraterTicket, ensureAppointmentRoom, raumName } from "@/lib/daily";
import { fuehrtZurBesprechung, terminartLabel } from "@/lib/termine/arten";
import { gegenueber } from "@/lib/termine/gegenueber";
import { BesprechungsRaum } from "./BesprechungsRaum";

/**
 * Der Besprechungsraum.
 *
 * Der Raum entsteht beim Betreten, nicht beim Anlegen des Termins: Ein
 * Daily-Raum läuft ab, und ein abgelaufener ist gelöscht. So steht er immer,
 * wenn jemand hineingeht — dieselbe Regel wie beim Closing und beim
 * Strategiegespräch.
 */
export default async function BesprechungsRaumSeite({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await getActor();
  if (!actor) redirect("/login");
  if (actor.role === "CLIENT") redirect("/termine");

  const { id } = await params;
  const termin = await db.appointment.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      type: true,
      company: { select: { id: true, name: true } },
      gastName: true,
      besprechung: {
        select: { ziel: true, vorbereitung: true, mitschrift: true, protokoll: true },
      },
    },
  });
  if (!termin) notFound();

  const zurueck = `/admin/termine/${id}`;

  if (!fuehrtZurBesprechung(termin.type)) {
    return (
      <Hinweis
        titel={`${terminartLabel(termin.type)} — hier nicht`}
        text="Diese Terminart hat ihren eigenen Arbeitsplatz oder gar keinen Videoraum."
        zurueck={zurueck}
      />
    );
  }

  const raum = await ensureAppointmentRoom(id);
  if (!raum.ok) {
    return (
      <Hinweis
        titel="Der Videoraum ließ sich nicht öffnen"
        text={raum.error}
        zurueck={zurueck}
      />
    );
  }

  /*
    Das Ticket entscheidet nur über das Mithören.

    Kommt keins zustande — kein Daily-Schlüssel, keine Berechtigung —, läuft
    das Gespräch trotzdem. Dann gibt es eben kein Transkript, und das
    Protokoll entsteht aus der Mitschrift.
  */
  const ticket = await beraterTicket(
    raumName(raum.url) ?? "",
    actor.name ?? "OKUN Systems"
  );

  return (
    <BesprechungsRaum
      terminId={id}
      titel={termin.title}
      firma={gegenueber(termin).name}
      raumUrl={raum.url}
      ticket={ticket}
      beraterName={actor.name ?? "OKUN Systems"}
      ziel={termin.besprechung?.ziel ?? null}
      vorbereitung={termin.besprechung?.vorbereitung ?? null}
      mitschrift={termin.besprechung?.mitschrift ?? ""}
      protokoll={termin.besprechung?.protokoll ?? null}
      zurueckLink={zurueck}
    />
  );
}

function Hinweis({
  titel,
  text,
  zurueck,
}: {
  titel: string;
  text: string;
  zurueck: string;
}) {
  return (
    <div className="max-w-[560px] mx-auto py-16 px-4 text-center">
      <h1 className="text-xl font-bold text-[#f0f0f0]">{titel}</h1>
      <p className="mt-3 text-sm text-[#90a6c0] leading-relaxed">{text}</p>
      <Link
        href={zurueck}
        className="inline-block mt-7 px-5 py-2.5 rounded-full border border-[rgba(0,184,255,.3)]
          text-[#90a6c0] text-xs hover:text-[#eef3f9] transition-colors"
      >
        Zurück zum Termin
      </Link>
    </div>
  );
}
