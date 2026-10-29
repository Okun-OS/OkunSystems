import { auth } from "@/auth";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import {
  berlinStundeVon,
  berlinTagesgrenzen,
  berlinWochentagVon,
  berlinZeitpunkt,
  tagAusSchluessel,
} from "@/lib/zeit";

/**
 * Die freien Zeitfenster eines Tages.
 *
 * Alle Stunden sind **deutsche Ortszeit**. Vorher wurden sie mit `setHours`
 * gebaut, also in der Zeitzone des Servers — und der steht bei Railway in UTC.
 * Wer 13 Uhr wählte, buchte damit 13:00 UTC; im Portal stand anschließend
 * 15 Uhr. Die Beschriftung stimmte, der gespeicherte Zeitpunkt nicht.
 */

const SLOT_STUNDEN = [9, 10, 11, 13, 14, 15, 16, 17];

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dateParam = req.nextUrl.searchParams.get("date");
  if (!dateParam) return NextResponse.json({ error: "Missing date" }, { status: 400 });

  const tag = tagAusSchluessel(dateParam);
  if (!tag) return NextResponse.json({ error: "Invalid date" }, { status: 400 });

  // Wochenenden bleiben frei. Der Wochentag folgt aus den Kalenderzahlen,
  // nicht aus einem Zeitpunkt — sonst entscheidet wieder die Serverzone.
  const wochentag = berlinWochentagVon(tag.jahr, tag.monat, tag.tag);
  if (wochentag === 0 || wochentag === 6) {
    return NextResponse.json({ slots: [] });
  }

  const { von, bis } = berlinTagesgrenzen(tag.jahr, tag.monat, tag.tag);

  const belegt = await db.appointment.findMany({
    where: {
      startTime: { gte: von, lte: bis },
      status: { not: "CANCELLED" },
    },
    select: { startTime: true },
  });

  // Verglichen wird die Stunde, die in Berlin auf der Uhr steht.
  const belegteStunden = new Set(belegt.map((a) => berlinStundeVon(new Date(a.startTime))));

  const slots = SLOT_STUNDEN.filter((h) => !belegteStunden.has(h)).map((h) => ({
    time: berlinZeitpunkt(tag.jahr, tag.monat, tag.tag, h).toISOString(),
    label: `${h.toString().padStart(2, "0")}:00 Uhr`,
  }));

  return NextResponse.json({ slots });
}
