import { umfangAlsText, umfangFuer } from "@/lib/packages/umfang";
let fehler = 0;
const pruefe = (was: string, ok: boolean, zusatz = "") => {
  console.log(`${ok ? "  ok  " : "FEHLT "} ${was}${zusatz ? ` — ${zusatz}` : ""}`);
  if (!ok) fehler++;
};
for (const k of ["foundation", "operations", "custom"]) {
  const u = umfangFuer(k);
  pruefe(`${k}: hinterlegt`, u !== null);
  pruefe(`${k}: Ablauf vollstaendig`, (u?.phasen.length ?? 0) >= 6, `${u?.phasen.length} Phasen`);
  const t = umfangAlsText(k);
  pruefe(`${k}: Grenze steht im Text`, t.includes("Höchstens drei"));
  pruefe(`${k}: Grundlagen genannt`, t.includes("Digitale Grundlagen"));
}
const ops = umfangFuer("operations");
const found = umfangFuer("foundation");
const cust = umfangFuer("custom");
pruefe("Foundation ohne Workforce", !found?.bloecke.some((b) => b.titel === "OKUN Workforce"));
pruefe("Operations mit Workforce", !!ops?.bloecke.some((b) => b.titel === "OKUN Workforce"));
pruefe("Custom enthält alles aus Operations",
  ops!.bloecke.every((b) => cust!.bloecke.some((c) => c.titel === b.titel)));
pruefe("Custom hat die Entwicklung dazu",
  !!cust?.bloecke.some((b) => b.titel === "Individuelle Entwicklung"));
pruefe("unbekanntes Paket sagt das auch",
  umfangAlsText("gibtesnicht").includes("nicht hinterlegt"));
console.log(fehler === 0 ? "\nAlles grün." : `\n${fehler} fehlgeschlagen.`);
process.exit(fehler === 0 ? 0 : 1);
