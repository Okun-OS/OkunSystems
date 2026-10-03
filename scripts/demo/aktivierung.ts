/** Prüft die automatische Freigabe der Lernkapitel bei der Aktivierung. */
import "./guard";
import { db } from "@/lib/db";
import { activateCustomer } from "@/lib/closing/activation";

async function main() {
  const admin = await db.user.findFirst({ where: { role: "ADMIN" }, select: { id: true } });
  const kat = await db.learningCategory.upsert({
    where: { id: "kat-demo" },
    create: { id: "kat-demo", title: "Grundlagen", order: 0 },
    update: {},
  });

  const kapitel: Array<[string, string, string | null]> = [
    ["kap-1", "Digitalisierung verstehen", null],
    ["kap-2", "Prozesse sauber aufschreiben", "foundation"],
    ["kap-3", "Abläufe automatisieren", "operations"],
    ["kap-4", "Eigene Systeme planen", "custom"],
  ];
  for (const [id, titel, min] of kapitel) {
    await db.learningChapter.upsert({
      where: { id },
      create: { id, title: titel, categoryId: kat.id, status: "PUBLISHED", minPackage: min },
      update: { minPackage: min, status: "PUBLISHED" },
    });
  }

  const firma = await db.company.findFirst({
    where: { name: { contains: "Nordlicht" } },
    select: { id: true, name: true, plan: true },
  });

  // Zurücksetzen, damit die Aktivierung wirklich läuft.
  await db.customerLearningAssignment.deleteMany({ where: { companyId: firma!.id } });
  await db.company.update({ where: { id: firma!.id }, data: { activatedAt: null } });

  console.log(`Aktiviere ${firma!.name} (Paket: ${firma!.plan}) …`);
  const res = await activateCustomer({ companyId: firma!.id, actorId: admin!.id, source: "admin" });
  console.log(`  Aktivierung: ok=${res.ok} bereitsAktiv=${res.alreadyActive}`);

  const frei = await db.customerLearningAssignment.findMany({
    where: { companyId: firma!.id },
    include: { chapter: { select: { title: true, minPackage: true } } },
  });
  console.log(`\nFreigeschaltet: ${frei.length} Kapitel`);
  for (const a of frei) {
    console.log(`  ✓ ${a.chapter.title}  (${a.chapter.minPackage ?? "alle Pakete"})`);
  }
  const alle = await db.learningChapter.findMany({ select: { title: true, minPackage: true } });
  const gesperrt = alle.filter((k) => !frei.some((f) => f.chapter.title === k.title));
  for (const k of gesperrt) console.log(`  ✗ ${k.title}  (${k.minPackage}) — gesperrt`);

  const erwartet = ["Digitalisierung verstehen", "Prozesse sauber aufschreiben", "Abläufe automatisieren"];
  const ok = frei.length === 3 && erwartet.every((t) => frei.some((f) => f.chapter.title === t));
  console.log(ok ? "\nOK: genau die Kapitel bis Operations sind frei, Custom bleibt gesperrt."
                 : "\nFEHLER: falsche Auswahl.");

  // Zweite Aktivierung darf nichts doppeln.
  const zweite = await activateCustomer({ companyId: firma!.id, actorId: admin!.id, source: "admin" });
  const nachher = await db.customerLearningAssignment.count({ where: { companyId: firma!.id } });
  console.log(`Zweite Aktivierung: bereitsAktiv=${zweite.alreadyActive}, Kapitel weiterhin ${nachher}`);
  process.exit(ok && zweite.alreadyActive && nachher === 3 ? 0 : 1);
}
main();
