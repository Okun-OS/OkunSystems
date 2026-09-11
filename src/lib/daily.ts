/**
 * Daily.co-Videoräume.
 *
 * Zwei Stolpersteine, die hier zentral abgefangen werden:
 *
 * 1. Daily lehnt Räume ab, deren Ablaufzeit (`exp`) in der Vergangenheit liegt.
 *    Wird ein Videoraum erst nach dem Termin angelegt — etwa um eine
 *    Aufzeichnung nachzuholen — schlug die Erstellung bisher fehl. Die
 *    Ablaufzeit wird deshalb auf mindestens `DAILY_ROOM_MIN_LIFETIME_HOURS`
 *    ab jetzt angehoben.
 * 2. Existiert bereits ein Raum mit demselben Namen, antwortet Daily mit einem
 *    Fehler. Statt abzubrechen wird der vorhandene Raum weiterverwendet und
 *    seine Ablaufzeit bei Bedarf verlängert.
 *
 * Fehlermeldungen von Daily werden unverändert durchgereicht, damit im Admin
 * sichtbar ist, woran es tatsächlich liegt.
 */

/** Erst beim Aufruf lesen, damit die Konfiguration zur Laufzeit greift. */
function dailyApiBase(): string {
  return process.env.DAILY_API_BASE || "https://api.daily.co/v1";
}
const MIN_LIFETIME_HOURS = Number(process.env.DAILY_ROOM_MIN_LIFETIME_HOURS ?? 4);
const BUFFER_AFTER_END_HOURS = 2;

export function dailyApiKey(): string | null {
  return process.env.DAILY_API_KEY?.trim() || null;
}

export function isDailyConfigured(): boolean {
  return Boolean(dailyApiKey());
}

/** Daily erlaubt Buchstaben, Ziffern, Bindestrich und Unterstrich. */
export function buildRoomName(prefix: string, id: string): string {
  const suffix = id.replace(/[^a-zA-Z0-9]/g, "").slice(-10);
  return `${prefix}-${suffix}`.toLowerCase();
}

/** Ablaufzeit, die sowohl den Termin abdeckt als auch nie in der Vergangenheit liegt. */
export function resolveExpiry(endsAt: Date | null | undefined): number {
  const now = Date.now();
  const afterEnd = endsAt ? endsAt.getTime() + BUFFER_AFTER_END_HOURS * 3600_000 : 0;
  const minimum = now + MIN_LIFETIME_HOURS * 3600_000;
  return Math.floor(Math.max(afterEnd, minimum) / 1000);
}

export type DailyRoomResult =
  | { ok: true; url: string; name: string; reused: boolean; extended: boolean }
  | { ok: false; error: string };

type DailyRoom = { name?: string; url?: string; config?: { exp?: number } };

async function readError(res: Response): Promise<string> {
  const text = await res.text();
  try {
    const parsed = JSON.parse(text) as { error?: string; info?: string };
    return [parsed.error, parsed.info].filter(Boolean).join(": ") || text;
  } catch {
    return text || `HTTP ${res.status}`;
  }
}

async function getRoom(name: string, key: string): Promise<DailyRoom | null> {
  const res = await fetch(`${dailyApiBase()}/rooms/${encodeURIComponent(name)}`, {
    headers: { Authorization: `Bearer ${key}` },
  });
  if (!res.ok) return null;
  return (await res.json()) as DailyRoom;
}

async function extendRoom(name: string, key: string, exp: number): Promise<DailyRoom | null> {
  const res = await fetch(`${dailyApiBase()}/rooms/${encodeURIComponent(name)}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ properties: { exp } }),
  });
  if (!res.ok) {
    console.warn(`[daily] Ablaufzeit von ${name} konnte nicht verlängert werden:`, await readError(res));
    return null;
  }
  return (await res.json()) as DailyRoom;
}

/**
 * Legt den Raum an oder verwendet einen vorhandenen weiter.
 * Liefert immer eine nutzbare URL oder eine aussagekräftige Fehlermeldung.
 */
export async function ensureDailyRoom(input: {
  name: string;
  endsAt?: Date | null;
}): Promise<DailyRoomResult> {
  const key = dailyApiKey();
  if (!key) {
    return {
      ok: false,
      error: "Daily.co ist nicht konfiguriert (DAILY_API_KEY fehlt).",
    };
  }

  const exp = resolveExpiry(input.endsAt);

  let res: Response;
  try {
    res = await fetch(`${dailyApiBase()}/rooms`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        name: input.name,
        properties: {
          exp,
          enable_screenshare: true,
          enable_chat: true,
          start_video_off: false,
          start_audio_off: false,
        },
      }),
    });
  } catch (err) {
    return {
      ok: false,
      error: `Daily.co ist nicht erreichbar: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  if (res.ok) {
    const room = (await res.json()) as DailyRoom;
    if (!room.url) return { ok: false, error: "Daily.co lieferte keine Raum-URL zurück." };
    return { ok: true, url: room.url, name: room.name ?? input.name, reused: false, extended: false };
  }

  // Fehlgeschlagen — prüfen, ob der Raum bereits existiert.
  const message = await readError(res);
  const existing = await getRoom(input.name, key);
  if (existing?.url) {
    let extended = false;
    if (!existing.config?.exp || existing.config.exp < Math.floor(Date.now() / 1000) + 300) {
      const updated = await extendRoom(input.name, key, exp);
      extended = Boolean(updated);
    }
    return { ok: true, url: existing.url, name: input.name, reused: true, extended };
  }

  console.error(`[daily] Raum ${input.name} konnte nicht erstellt werden:`, message);
  return { ok: false, error: `Daily.co meldete: ${message}` };
}
