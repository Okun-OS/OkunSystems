import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { ladeStand, sitzungFuerKunde } from "@/lib/strategie/fuehrung";
import { ERSTE_ANSICHT } from "@/lib/strategie/katalog";
import { ladeStudio } from "@/lib/strategie/studio";
import { StudioMitsicht } from "@/components/studio/fuehrung-client";
import { formatiereBerlin } from "@/lib/zeit";

export const dynamic = "force-dynamic";

/**
 * Das Haus, wie der Kunde es sieht.
 *
 * Im Gespräch folgt diese Seite dem Berater — er geht, sie zeigt denselben
 * Raum. Danach bleibt sie stehen und gehört dem Kunden: Was er im Termin
 * gesehen hat, kann er hier so oft ansehen, wie er mag.
 *
 * Vor der Freigabe gibt es sie nicht. Der Leitfaden entsteht maschinell und
 * nennt Produkte beim Namen; ein Mensch muss das gelesen haben, bevor es
 * hier steht.
 */
export default async function PortalStudio() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userId = (session.user as { id: string }).id;
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { companyId: true },
  });
  if (!user?.companyId) redirect("/dashboard");

  const sitzungId = await sitzungFuerKunde(user.companyId);
  const stand = sitzungId ? await ladeStand(sitzungId) : null;
  if (!sitzungId || !stand) return <NochNicht />;

  const daten = await ladeStudio(sitzungId);
  if (!daten) return <NochNicht />;

  const sitzung = await db.strategieSitzung.findUnique({
    where: { id: sitzungId },
    select: {
      company: { select: { industry: true } },
      session: { select: { completedAt: true } },
    },
  });
  const fertig = sitzung?.session?.completedAt;

  /*
    Nach dem Gespräch fängt der Rundgang wieder vor dem Haus an.

    Im Termin steht der Kunde dort, wo der Berater ihn hingeführt hat — auch
    wenn der gerade nicht am Schirm ist. Ist das Gespräch vorbei, ist es ein
    neuer Besuch, und der beginnt draußen. Auf einem Schlussbild zu landen,
    das man Wochen später aufruft, erklärt niemandem mehr etwas.
  */
  const beginn = stand.abgeschlossen ? { ...stand, ansicht: ERSTE_ANSICHT } : stand;

  return (
    <StudioMitsicht
      sitzungId={sitzungId}
      daten={daten}
      untertitel={sitzung?.company.industry ?? null}
      fussnote={fertig ? `Blueprint vom ${formatiereBerlin(fertig).split(",")[0]}` : "Blueprint"}
      start={beginn}
    />
  );
}

/**
 * Was dasteht, wenn es noch nichts zu sehen gibt.
 *
 * Bewusst ohne Countdown und ohne „demnächst verfügbar": Der Kunde hat einen
 * Termin, und bis dahin ist hier nichts — das ist keine Störung, die erklärt
 * werden müsste.
 */
function NochNicht() {
  return (
    <div className="max-w-[640px] mx-auto py-16 px-4 text-center">
      <p className="font-mono text-[9px] uppercase tracking-[0.26em] text-[#3a4f68] font-semibold">
        OKUN Transformation Studio
      </p>
      <h1 className="mt-3 text-xl font-bold text-[#f0f0f0]">Noch nichts freigegeben</h1>
      <p className="mt-3 text-sm text-[#90a6c0] leading-relaxed">
        Ihr Haus entsteht aus dem Blueprint und wird im Strategiegespräch gemeinsam
        durchgegangen. Danach steht es hier — mit allem, was Sie im Termin gesehen haben.
      </p>
      <Link
        href="/portal"
        className="inline-block mt-7 px-5 py-2.5 rounded-full border border-[rgba(0,184,255,.3)]
          text-[#90a6c0] text-xs hover:text-[#eef3f9] transition-colors"
      >
        Zurück ins Portal
      </Link>
    </div>
  );
}
