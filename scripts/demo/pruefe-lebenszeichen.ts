import { gzipSync } from "node:zlib";
import { lebenszeichen } from "@/lib/strom";

const eins = lebenszeichen();
const zwei = lebenszeichen();
const roh = Buffer.byteLength(eins + zwei);
const gepackt = gzipSync(Buffer.from(eins + zwei)).length;

let fehler = 0;
const pruefe = (was: string, ok: boolean, zusatz = "") => {
  console.log(`${ok ? "  ok  " : "FEHLT "} ${was}${zusatz ? ` — ${zusatz}` : ""}`);
  if (!ok) fehler++;
};
pruefe("roh gross genug", roh > 3000, `${roh} Byte`);
pruefe("ueberlebt die Kompression", gepackt > 2000, `${gepackt} Byte gepackt`);
pruefe("zweites Lebenszeichen ist nicht dasselbe", eins !== zwei);
pruefe("ist gueltiges JSON je Zeile",
  (eins + zwei).trim().split("\n").every((z) => JSON.parse(z).status === "laeuft"));

// Zum Vergleich: so waere es mit Leerzeichen ausgegangen.
const leer = JSON.stringify({ status: "laeuft", fuellung: " ".repeat(2048) }) + "\n";
console.log(`\n  zum Vergleich, Leerzeichen-Fuellung: ${Buffer.byteLength(leer + leer)} roh -> ${gzipSync(Buffer.from(leer + leer)).length} gepackt`);

console.log(fehler === 0 ? "\nAlles grün." : `\n${fehler} fehlgeschlagen.`);
process.exit(fehler === 0 ? 0 : 1);
