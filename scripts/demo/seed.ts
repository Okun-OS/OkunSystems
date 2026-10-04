/**
 * Legt den Demo-Betrieb lokal an — über dieselbe Bibliothek wie der Knopf
 * im Admin-Bereich, plus ein Kundenkonto zum Anmelden.
 *
 * Vorher stand die ganze Firma hier ein zweites Mal im Code. Die beiden
 * Fassungen sind auseinandergelaufen, und eine Korrektur an der einen wirkte
 * nicht in der anderen — was beim Suchen nach einem vermeintlichen Fehler in
 * der Auswertung eine Stunde gekostet hat.
 */
import "./guard";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { seedNordlicht, DEMO_FIRMA } from "@/lib/demo/nordlicht";

async function main() {
  const r = await seedNordlicht();
  console.log(`${DEMO_FIRMA} angelegt`);
  console.log(`  ${r.beantwortet} Fragen beantwortet`);

  // Nur lokal: ein Kundenkonto zum Anmelden. Im Livesystem entsteht keines.
  const passwort = await bcrypt.hash("demo-nicht-produktiv", 12);
  await db.user.create({
    data: {
      email: "j.harms@nordlicht-gebaeudetechnik.example",
      name: "Jens Harms",
      password: passwort,
      role: "CLIENT",
      companyId: r.companyId,
      firstLogin: false,
      portalRole: "CLIENT_ADMIN",
    },
  });
  console.log("  Kundenkonto: j.harms@nordlicht-gebaeudetechnik.example / demo-nicht-produktiv");
  console.log(`  Unternehmen: ${r.companyId}`);
  console.log(`  Sitzung:     ${r.sessionId}`);

  await db.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
