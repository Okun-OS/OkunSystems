"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Rundgang } from "./rundgang";
import type { StudioDaten } from "@/lib/strategie/studio";
import type { AnsichtKey } from "@/lib/strategie/katalog";
import type { Stand } from "@/lib/strategie/fuehrung";

/**
 * Die beiden Seiten desselben Rundgangs.
 *
 * Der Berater geht und meldet jeden Schritt; der Kunde fragt nach und folgt.
 * Mehr Draht ist dafür nicht nötig — es geht um einen Ort und einen Knopf,
 * nicht um einen Datenstrom. Fällt das Netz für zehn Sekunden aus, ist der
 * Kunde zehn Sekunden hinterher und danach wieder da, ohne dass jemand
 * etwas neu laden muss.
 */

const PULS_MS = 2500;
const LEBENSZEICHEN_MS = 45_000;

async function melde(sitzungId: string, was: Record<string, unknown>): Promise<void> {
  try {
    await fetch(`/api/strategie/${sitzungId}/stand`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(was),
    });
  } catch {
    /*
      Ein verlorener Schritt ist kein Grund, das Gespräch anzuhalten.

      Der Berater sieht seinen eigenen Bildschirm ohnehin richtig; der Kunde
      hängt dann einen Raum hinterher, bis der nächste Schritt ankommt. Eine
      Fehlermeldung mitten in der Vorführung wäre schlimmer als das.
    */
  }
}

// ─── Der Berater ─────────────────────────────────────────────────────────────

export function StudioFuehrung({
  sitzungId,
  daten,
  untertitel,
  fussnote,
  startOrt,
}: {
  sitzungId: string;
  daten: StudioDaten;
  untertitel: string | null;
  fussnote: string;
  startOrt?: AnsichtKey;
}) {
  // Solange der Berater im Studio steht, führt er — auch wenn er gerade
  // nichts anklickt, weil er redet.
  useEffect(() => {
    const id = setInterval(() => void melde(sitzungId, { da: true }), LEBENSZEICHEN_MS);
    void melde(sitzungId, { da: true });
    return () => clearInterval(id);
  }, [sitzungId]);

  return (
    <Rundgang
      daten={daten}
      untertitel={untertitel}
      fussnote={fussnote}
      ziel={startOrt}
      onOrt={(ort) => void melde(sitzungId, { ansicht: ort })}
      onStufe={(stufe) => void melde(sitzungId, { stufe })}
    />
  );
}

// ─── Der Kunde ───────────────────────────────────────────────────────────────

export function StudioMitsicht({
  sitzungId,
  daten,
  untertitel,
  fussnote,
  start,
}: {
  sitzungId: string;
  daten: StudioDaten;
  untertitel: string | null;
  fussnote: string;
  /** Der Stand beim Laden der Seite — damit der erste Blick schon stimmt. */
  start: Stand;
}) {
  const [stand, setzeStand] = useState<Stand>(start);
  const letzte = useRef(start.rev);

  const hole = useCallback(async () => {
    try {
      const antwort = await fetch(`/api/strategie/${sitzungId}/stand`, { cache: "no-store" });
      if (!antwort.ok) return;
      const daten: { stand: Stand | null } = await antwort.json();
      if (!daten.stand) return;
      // Nur wirkliche Änderungen anfassen: Ein unveränderter Stand soll den
      // Rundgang nicht in jedem Takt neu durchrechnen.
      if (daten.stand.rev === letzte.current && daten.stand.fuehrung === stand.fuehrung) return;
      letzte.current = daten.stand.rev;
      setzeStand(daten.stand);
    } catch {
      // Siehe oben: lieber einen Takt hinterher als eine Fehlermeldung.
    }
  }, [sitzungId, stand.fuehrung]);

  useEffect(() => {
    const id = setInterval(() => void hole(), PULS_MS);
    return () => clearInterval(id);
  }, [hole]);

  return (
    <Rundgang
      daten={daten}
      untertitel={untertitel}
      fussnote={fussnote}
      ziel={stand.ansicht}
      stufe={stand.stufe}
      /*
        Geführt wird nur, solange jemand führt. Ist der Berater weg oder das
        Gespräch vorbei, gehört das Haus dem Kunden — dann bekommt er seine
        Türen zurück, ohne dass sich sonst etwas ändert.
      */
      gefuehrt={stand.fuehrung === "folgt"}
    />
  );
}
