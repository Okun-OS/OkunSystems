import { db } from "@/lib/db";
import type { ContractSnapshotData } from "./snapshot";
import {
  buildScriptContext,
  renderScriptSections,
  selectScriptSections,
  type RenderedScript,
} from "./scripts";

/**
 * Rendert das Closing-Script mit den eingefrorenen Vertragsdaten und speichert
 * das Ergebnis im Contract Snapshot.
 *
 * Damit bleibt rekonstruierbar, welcher Text im konkreten Closing angezeigt
 * wurde — auch wenn der Admin die Vorlage später ändert. Ein bereits
 * gerendertes Script wird nicht erneut überschrieben.
 */
export async function renderAndFreezeScript(
  closingSessionId: string,
  options: { force?: boolean } = {}
): Promise<
  | { ok: true; script: RenderedScript; frozen: boolean; unresolved: string[] }
  | { ok: false; error: string }
> {
  const snapshot = await db.contractSnapshot.findUnique({
    where: { closingSessionId },
    select: { id: true, data: true, renderedScript: true, scriptRenderedAt: true },
  });
  if (!snapshot?.data) {
    return { ok: false, error: "Für diese Session existiert kein Contract Snapshot." };
  }

  if (snapshot.renderedScript && !options.force) {
    const script = snapshot.renderedScript as unknown as RenderedScript;
    return {
      ok: true,
      script,
      frozen: false,
      unresolved: script.sections.flatMap((s) => s.unresolvedPlaceholders),
    };
  }

  const data = snapshot.data as unknown as ContractSnapshotData;
  const addonKeys = [
    ...(data.offer?.extras ?? []).map((e) => e.description),
    ...(data.offer?.recurringNetCents ? ["recurring"] : []),
    ...(data.offer?.workforceIncluded ? ["workforce"] : []),
    ...(data.offer?.careIncluded ? ["care"] : []),
  ];

  const scripts = await selectScriptSections({
    packageType: data.offer?.packageType ?? null,
    packageName: data.offer?.packageName ?? null,
    addonKeys,
  });
  if (scripts.length === 0) {
    return {
      ok: false,
      error:
        "Es ist kein aktives Closing-Script hinterlegt. Bitte im Adminbereich unter Closing Scripts mindestens eine Einleitung und eine verbindliche Annahme anlegen.",
    };
  }

  const context = buildScriptContext({
    masterData: data.masterData,
    packageName: data.offer?.packageName ?? null,
    packageType: data.offer?.packageType ?? null,
    oneTimeNetCents: data.offer?.oneTimeNetCents ?? null,
    oneTimeGrossCents: data.offer?.oneTimeGrossCents ?? null,
    recurringNetCents: data.offer?.recurringNetCents ?? null,
    recurringInterval: data.offer?.recurringInterval ?? null,
    minimumTermMonths: data.offer?.minimumTermMonths ?? null,
    paymentMethod: data.payment?.method ?? null,
    paymentTerms: data.payment?.terms ?? null,
    offerNumber: data.offer?.offerNumber ?? null,
    offerVersion: data.offer?.version ?? null,
    contractDate: data.contractDate ?? null,
    vatRateBp: data.offer?.vatRateBp ?? null,
    closerName: data.closer?.name ?? null,
    addons: (data.offer?.extras ?? []).map((e) => e.description),
  });

  const rendered = renderScriptSections(scripts, context);

  await db.contractSnapshot.update({
    where: { id: snapshot.id },
    data: {
      renderedScript: rendered as unknown as object,
      scriptRenderedAt: new Date(),
    },
  });

  return {
    ok: true,
    script: rendered,
    frozen: true,
    unresolved: rendered.sections.flatMap((s) => s.unresolvedPlaceholders),
  };
}

export async function getFrozenScript(
  closingSessionId: string
): Promise<RenderedScript | null> {
  const snapshot = await db.contractSnapshot.findUnique({
    where: { closingSessionId },
    select: { renderedScript: true },
  });
  if (!snapshot?.renderedScript) return null;
  return snapshot.renderedScript as unknown as RenderedScript;
}
