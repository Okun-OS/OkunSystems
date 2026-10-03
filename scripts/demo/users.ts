import "./guard";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

async function main() {
  const pw = await bcrypt.hash("demo-nicht-produktiv", 12);
  const leute: Array<[string, string, string, boolean]> = [
    ["felix@demo.local",   "Felix Okun",     "ADMIN",      true],
    ["clara@demo.local",   "Clara Weiss",    "CLOSER",     false],
    ["samuel@demo.local",  "Samuel Behr",    "STRATEGIST", true],
    ["mira@demo.local",    "Mira Dreyer",    "CLOSER",     true],
  ];
  for (const [email, name, role, canStrategy] of leute) {
    await db.user.upsert({
      where: { email },
      create: { email, name, password: pw, role, canStrategy, firstLogin: false },
      update: { name, role, canStrategy, password: pw, firstLogin: false },
    });
    console.log(`  ${name.padEnd(14)} ${role.padEnd(11)} Strategie: ${canStrategy ? "ja" : "nein"}`);
  }
  process.exit(0);
}
main();
