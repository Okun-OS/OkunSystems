import { NextRequest, NextResponse } from "next/server";
import { verifyClosingToken } from "@/lib/closing/token";
import { frage as frageAusKatalog } from "@/lib/radar/catalog";
import { aktiveFragen } from "@/lib/radar/engine";
import { ladeLaufendesRadar, setzeAntwort, setzeProfil, type RadarProfil } from "@/lib/radar/service";
import { kundenAnsicht } from "@/lib/radar/views";

export const dynamic = "force-dynamic";

/**
 * Die Kundenseite des Radar.
 *
 * Derselbe Zugang wie für alles andere im Closing-Portal: das Token des
 * Einladungslinks, mehr braucht und bekommt der Interessent nicht. Aus dem
 * Token folgt genau eine Closing Session, aus dieser genau die Analyse, die
 * der Berater aufgeschaltet hat — eine fremde Analyse-ID in der Anfrage führt
 * nirgendwohin, weil keine entgegengenommen wird.
 *
 * Was der Interessent darf: antworten, eine Antwort korrigieren, sein Profil
 * ergänzen. Was er nicht darf: weiterblättern, überspringen, auswerten,
 * freigeben, abschließen. Das Gespräch führt der Berater; das Radar auch.
 */

async function laden(token: string) {
  const validation = await verifyClosingToken(token);
  if (!validation.ok) return { fehler: "Zugang ungültig", status: 401 as const, reason: validation.reason };
  const radar = await ladeLaufendesRadar(validation.closingSessionId);
  return { radar, closingSessionId: validation.closingSessionId };
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "Token fehlt" }, { status: 400 });

  const ergebnis = await laden(token);
  if ("fehler" in ergebnis && ergebnis.fehler) {
    return NextResponse.json({ error: ergebnis.fehler, reason: ergebnis.reason }, { status: 401 });
  }

  return NextResponse.json(
    { radar: ergebnis.radar ? kundenAnsicht(ergebnis.radar) : null },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function POST(request: NextRequest) {
  let body: {
    token?: string;
    aktion?: "antwort" | "profil";
    frageKey?: string;
    optionKeys?: unknown;
    profil?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });
  }

  if (!body.token) return NextResponse.json({ error: "Token fehlt" }, { status: 400 });

  const ergebnis = await laden(body.token);
  if ("fehler" in ergebnis && ergebnis.fehler) {
    return NextResponse.json({ error: ergebnis.fehler, reason: ergebnis.reason }, { status: 401 });
  }
  const radar = ergebnis.radar;
  if (!radar) {
    return NextResponse.json({ error: "Zurzeit läuft keine Analyse." }, { status: 409 });
  }
  // Eine abgeschlossene Analyse nimmt nichts mehr entgegen. Sonst könnte ein
  // offener Browsertab das Ergebnis nachträglich verändern, das im Gespräch
  // schon besprochen wurde.
  if (radar.abgeschlossenAm) {
    return NextResponse.json({ error: "Diese Analyse ist abgeschlossen." }, { status: 409 });
  }

  if (body.aktion === "profil") {
    const profil = body.profil;
    if (!profil || typeof profil !== "object" || Array.isArray(profil)) {
      return NextResponse.json({ error: "Ungültige Angaben" }, { status: 400 });
    }
    // Welche Felder überhaupt existieren, entscheidet der Katalog — nicht der
    // Browser. `setzeProfil` verwirft alles Unbekannte.
    await setzeProfil(radar.id, profil as RadarProfil);
    const neu = await ladeLaufendesRadar(ergebnis.closingSessionId!);
    return NextResponse.json({ radar: neu ? kundenAnsicht(neu) : null });
  }

  if (body.aktion === "antwort") {
    const frageKey = typeof body.frageKey === "string" ? body.frageKey : "";
    const f = frageAusKatalog(frageKey);
    if (!f) return NextResponse.json({ error: "Diese Frage gibt es nicht." }, { status: 400 });

    // Nur Fragen, die in dieser Analyse tatsächlich gestellt werden. Eine
    // Frage, deren Bedingung nicht erfüllt ist, lässt sich nicht beantworten —
    // auch nicht mit einer handgeschriebenen Anfrage.
    const bereiche = Array.isArray(radar.profil.bereiche) ? radar.profil.bereiche : [];
    const aktiv = aktiveFragen({
      antworten: radar.antworten,
      spotlightKey: radar.spotlightKey,
      bereiche,
    });
    if (!aktiv.some((x) => x.key === frageKey)) {
      return NextResponse.json({ error: "Diese Frage steht hier nicht zur Auswahl." }, { status: 409 });
    }

    const roh = Array.isArray(body.optionKeys) ? body.optionKeys : [];
    const optionKeys = roh
      .filter((k): k is string => typeof k === "string")
      .filter((k) => f.optionen.some((o) => o.key === k))
      .slice(0, f.modus === "einfach" ? 1 : f.optionen.length);

    await setzeAntwort({ radarSessionId: radar.id, frageKey, optionKeys, quelle: "client" });
    const neu = await ladeLaufendesRadar(ergebnis.closingSessionId!);
    return NextResponse.json({ radar: neu ? kundenAnsicht(neu) : null });
  }

  return NextResponse.json({ error: "Unbekannte Aktion" }, { status: 400 });
}
