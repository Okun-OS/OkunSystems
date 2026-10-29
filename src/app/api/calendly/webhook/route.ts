import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { sendBookingNotification } from "@/lib/email";

export const dynamic = "force-dynamic";

/**
 * Meldung von Calendly, wenn ein Termin gebucht oder abgesagt wurde.
 *
 * Die Adresse ist öffentlich erreichbar — jeder kann hier etwas hinschicken.
 * Deshalb wird jede Meldung gegen die Signatur geprüft, bevor auch nur
 * hineingeschaut wird: Ohne gültige Signatur landet nichts in einem Postfach,
 * und niemand kann uns über diese Adresse erfundene Termine unterschieben.
 *
 * Einrichtung: In Calendly ein Webhook-Abonnement auf diese Adresse anlegen
 * (Ereignisse „invitee.created" und „invitee.canceled"), den dort erzeugten
 * Signing Key als CALENDLY_WEBHOOK_SIGNING_KEY in Railway hinterlegen.
 */

/** Ältere Meldungen werden abgewiesen — so lässt sich keine abgefangene erneut einspielen. */
const TOLERANCE_SECONDS = 180;

type CalendlyPayload = {
  event?: string;
  payload?: {
    name?: string;
    email?: string;
    timezone?: string;
    cancel_url?: string;
    reschedule_url?: string;
    questions_and_answers?: Array<{ question?: string; answer?: string }>;
    cancellation?: { canceled_by?: string; reason?: string };
    scheduled_event?: {
      name?: string;
      start_time?: string;
      end_time?: string;
      location?: { type?: string; location?: string; join_url?: string };
    };
  };
};

/** Prüft Zeitstempel und Signatur. Gibt zurück, warum es nicht passt. */
function verify(rawBody: string, header: string | null, key: string): string | null {
  if (!header) return "Signatur fehlt";

  const parts = new Map(
    header.split(",").map((part) => {
      const [name, value] = part.split("=");
      return [name?.trim(), value?.trim()] as const;
    })
  );
  const timestamp = parts.get("t");
  const signature = parts.get("v1");
  if (!timestamp || !signature) return "Signatur unvollständig";

  const age = Math.floor(Date.now() / 1000) - Number(timestamp);
  if (!Number.isFinite(age) || Math.abs(age) > TOLERANCE_SECONDS) return "Signatur abgelaufen";

  const expected = createHmac("sha256", key).update(`${timestamp}.${rawBody}`).digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");
  // Gleiche Länge zuerst prüfen: timingSafeEqual wirft sonst, statt false zu liefern.
  if (a.length !== b.length || !timingSafeEqual(a, b)) return "Signatur stimmt nicht";

  return null;
}

export async function POST(request: NextRequest) {
  const key = process.env.CALENDLY_WEBHOOK_SIGNING_KEY?.trim();
  if (!key) {
    console.warn("[calendly] CALENDLY_WEBHOOK_SIGNING_KEY fehlt — Meldung verworfen");
    return NextResponse.json({ error: "Nicht konfiguriert" }, { status: 503 });
  }

  // Der unveränderte Text, nicht das geparste Objekt: Die Signatur gilt für
  // genau diese Zeichenfolge, und JSON.stringify liefert eine andere.
  const rawBody = await request.text();
  const problem = verify(rawBody, request.headers.get("calendly-webhook-signature"), key);
  if (problem) {
    console.warn(`[calendly] Meldung abgewiesen: ${problem}`);
    return NextResponse.json({ error: "Signatur ungültig" }, { status: 401 });
  }

  let body: CalendlyPayload;
  try {
    body = JSON.parse(rawBody) as CalendlyPayload;
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });
  }

  const canceled = body.event === "invitee.canceled";
  if (body.event !== "invitee.created" && !canceled) {
    // Andere Ereignisse nehmen wir entgegen, ohne etwas zu tun — sonst
    // versucht Calendly sie immer wieder zuzustellen.
    return NextResponse.json({ ok: true });
  }

  const invitee = body.payload;
  const event = invitee?.scheduled_event;

  const sent = await sendBookingNotification({
    canceled,
    eventName: event?.name ?? "Termin",
    startTime: event?.start_time ?? null,
    timezone: invitee?.timezone ?? null,
    name: invitee?.name ?? "Unbekannt",
    email: invitee?.email ?? "",
    location: event?.location?.join_url ?? event?.location?.location ?? null,
    answers: (invitee?.questions_and_answers ?? [])
      .filter((entry) => entry.question && entry.answer)
      .map((entry) => ({ question: entry.question!, answer: entry.answer! })),
    cancelReason: invitee?.cancellation?.reason ?? null,
    rescheduleUrl: invitee?.reschedule_url ?? null,
  });

  if (!sent.ok) {
    // Quittiert wird trotzdem, sonst stellt Calendly dieselbe Meldung immer
    // wieder zu. Damit der Termin nicht verloren geht, steht er im Protokoll.
    console.error(
      `[calendly] Benachrichtigung nicht zugestellt (${sent.error}) — ` +
        `${canceled ? "Absage" : "Buchung"}: ${invitee?.name ?? "?"} ` +
        `<${invitee?.email ?? "?"}> am ${event?.start_time ?? "?"}`
    );
  }

  return NextResponse.json({ ok: true });
}
