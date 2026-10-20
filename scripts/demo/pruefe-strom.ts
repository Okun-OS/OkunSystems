/**
 * Prueft den Mechanismus der Route: Kommt das Lebenszeichen waehrend der
 * Arbeit an, oder erst am Ende zusammen mit dem Ergebnis?
 */
const encoder = new TextEncoder();

function bauen(dauerMs: number) {
  return new ReadableStream({
    async start(controller) {
      let offen = true;
      const schreibe = (o: unknown) => {
        if (!offen) return;
        controller.enqueue(encoder.encode(JSON.stringify(o) + "\n"));
      };
      schreibe({ status: "gestartet" });
      const puls = setInterval(() => schreibe({ status: "laeuft" }), 10_000);
      try {
        await new Promise((r) => setTimeout(r, dauerMs));
        schreibe({ status: "fertig", version: 4 });
      } finally {
        clearInterval(puls);
        offen = false;
        controller.close();
      }
    },
  });
}

async function main() {
  const start = Date.now();
  const leser = bauen(25_000).getReader();
  const dekoder = new TextDecoder();
  const ankunft: Array<{ s: number; status: string }> = [];
  let rest = "";
  for (;;) {
    const { done, value } = await leser.read();
    if (done) break;
    rest += dekoder.decode(value, { stream: true });
    const zeilen = rest.split("\n");
    rest = zeilen.pop() ?? "";
    for (const z of zeilen) {
      if (!z.trim()) continue;
      const o = JSON.parse(z) as { status: string };
      const s = Math.round((Date.now() - start) / 100) / 10;
      ankunft.push({ s, status: o.status });
      console.log(`  ${s}s  ${o.status}`);
    }
  }

  let fehler = 0;
  const pruefe = (was: string, ok: boolean) => {
    console.log(`${ok ? "  ok  " : "FEHLT "} ${was}`);
    if (!ok) fehler++;
  };
  pruefe("Lebenszeichen sofort", ankunft[0]?.status === "gestartet" && ankunft[0].s < 1);
  pruefe("waehrend der Arbeit zwei weitere", ankunft.filter((a) => a.status === "laeuft").length === 2);
  pruefe("nie laenger als 11s Stille",
    ankunft.every((a, i) => i === 0 || a.s - ankunft[i - 1].s <= 11));
  pruefe("Ergebnis am Ende", ankunft[ankunft.length - 1]?.status === "fertig");
  console.log(fehler === 0 ? "\nAlles grün." : `\n${fehler} fehlgeschlagen.`);
  process.exit(fehler === 0 ? 0 : 1);
}
main();
