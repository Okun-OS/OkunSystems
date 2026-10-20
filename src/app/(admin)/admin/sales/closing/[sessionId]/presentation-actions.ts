"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { guarded, requireAdmin, requireSessionAccess } from "@/lib/auth-guards";
import { deleteFromR2 } from "@/lib/storage";
import type { SlideUpload } from "@/lib/closing/presentation-types";

/**
 * Präsentationen für das Closing-Gespräch.
 *
 * Ablauf: der Berater legt eine Präsentation an und lädt seine Folien hoch.
 * Solange sie im Entwurf steht, sieht sie niemand außer ihm. Nach dem
 * Einreichen gibt ein Administrator sie frei — erst dann lässt sie sich im
 * Gespräch starten und erst dann liefert der Server ihre Folien an den Kunden
 * aus.
 *
 * Der Berater steuert, welche Folie der Kunde sieht; die Kundenseite fragt den
 * Stand zyklisch ab.
 */

function pathFor(closingSessionId: string): string {
  return `/admin/sales/closing/${closingSessionId}`;
}

async function logEvent(input: {
  closingSessionId: string;
  companyId: string;
  actorId: string;
  eventType: string;
  metadata: Record<string, unknown>;
}) {
  await db.closingEvent.create({
    data: {
      closingSessionId: input.closingSessionId,
      companyId: input.companyId,
      actorId: input.actorId,
      eventType: input.eventType,
      metadata: JSON.stringify(input.metadata),
    },
  });
}

export async function createPresentation(closingSessionId: string, formData: FormData) {
  return guarded(async () => {
    const { actor, companyId } = await requireSessionAccess(closingSessionId);

    const title = (formData.get("title") as string)?.trim();
    if (!title) return { error: "Bitte geben Sie der Präsentation einen Titel." };

    const created = await db.closingPresentation.create({
      data: {
        title,
        description: (formData.get("description") as string)?.trim() || null,
        status: "draft",
        closingSessionId,
        companyId,
        createdById: actor.id,
      },
      select: { id: true },
    });

    revalidatePath(pathFor(closingSessionId));
    return { ok: true, id: created.id };
  });
}

/** Hängt hochgeladene Folien hinten an. Bestehende Folien bleiben unberührt. */
export async function addSlides(presentationId: string, slides: SlideUpload[]) {
  return guarded(async () => {
    const presentation = await db.closingPresentation.findUnique({
      where: { id: presentationId },
      select: { id: true, closingSessionId: true, status: true },
    });
    if (!presentation?.closingSessionId) {
      return { error: "Präsentation nicht gefunden." };
    }
    await requireSessionAccess(presentation.closingSessionId);
    if (presentation.status === "approved") {
      return {
        error:
          "Die Präsentation ist bereits freigegeben. Bitte legen Sie für Änderungen eine neue an.",
      };
    }
    if (slides.length === 0) return { error: "Keine Folien übergeben." };

    const last = await db.closingPresentationSlide.findFirst({
      where: { presentationId },
      orderBy: { position: "desc" },
      select: { position: true },
    });
    let position = (last?.position ?? 0) + 1;

    await db.$transaction(async (tx) => {
      for (const slide of slides) {
        await tx.closingPresentationSlide.create({
          data: {
            presentationId,
            position: position++,
            title: slide.title?.trim() || null,
            r2Key: slide.r2Key,
            fileName: slide.fileName,
            mimeType: slide.mimeType,
            fileSize: slide.fileSize,
            sha256: slide.sha256,
          },
        });
      }
      await tx.closingPresentation.update({
        where: { id: presentationId },
        data: { slideCount: position - 1 },
      });
    });

    revalidatePath(pathFor(presentation.closingSessionId));
    return { ok: true, added: slides.length };
  });
}

export async function deleteSlide(slideId: string) {
  return guarded(async () => {
    const slide = await db.closingPresentationSlide.findUnique({
      where: { id: slideId },
      select: {
        r2Key: true,
        presentationId: true,
        presentation: { select: { closingSessionId: true, status: true } },
      },
    });
    if (!slide?.presentation.closingSessionId) return { error: "Folie nicht gefunden." };
    await requireSessionAccess(slide.presentation.closingSessionId);
    if (slide.presentation.status === "approved") {
      return { error: "Freigegebene Präsentationen lassen sich nicht mehr ändern." };
    }

    await db.closingPresentationSlide.delete({ where: { id: slideId } });

    // Positionen wieder lückenlos machen, damit „Folie 3 von 5" stimmt.
    const remaining = await db.closingPresentationSlide.findMany({
      where: { presentationId: slide.presentationId },
      orderBy: { position: "asc" },
      select: { id: true },
    });
    await db.$transaction(async (tx) => {
      // Erst aus dem Weg schieben: die Kombination aus Präsentation und
      // Position ist eindeutig.
      for (const [index, row] of remaining.entries()) {
        await tx.closingPresentationSlide.update({
          where: { id: row.id },
          data: { position: -(index + 1) },
        });
      }
      for (const [index, row] of remaining.entries()) {
        await tx.closingPresentationSlide.update({
          where: { id: row.id },
          data: { position: index + 1 },
        });
      }
      await tx.closingPresentation.update({
        where: { id: slide.presentationId },
        data: { slideCount: remaining.length },
      });
    });

    try {
      await deleteFromR2(slide.r2Key);
    } catch (err) {
      // Die Folie ist aus der Anwendung verschwunden; ein verwaistes Objekt in
      // R2 ist unschön, aber kein Grund, die Aktion scheitern zu lassen.
      console.warn("[presentation] R2-Objekt konnte nicht gelöscht werden:", err);
    }

    revalidatePath(pathFor(slide.presentation.closingSessionId));
    return { ok: true };
  });
}

/** Reicht die Präsentation zur Freigabe ein. */
export async function submitPresentation(presentationId: string) {
  return guarded(async () => {
    const presentation = await db.closingPresentation.findUnique({
      where: { id: presentationId },
      select: { closingSessionId: true, companyId: true, slideCount: true, status: true },
    });
    if (!presentation?.closingSessionId) return { error: "Präsentation nicht gefunden." };
    const { actor } = await requireSessionAccess(presentation.closingSessionId);
    if (presentation.slideCount === 0) {
      return { error: "Bitte laden Sie zuerst mindestens eine Folie hoch." };
    }
    if (presentation.status === "approved") return { ok: true };

    await db.closingPresentation.update({
      where: { id: presentationId },
      data: { status: "submitted", reviewNote: null },
    });

    if (presentation.companyId) {
      await logEvent({
        closingSessionId: presentation.closingSessionId,
        companyId: presentation.companyId,
        actorId: actor.id,
        eventType: "presentation_submitted",
        metadata: { presentationId },
      });
    }

    revalidatePath(pathFor(presentation.closingSessionId));
    return { ok: true };
  });
}

/** Freigabe durch einen Administrator. */
export async function approvePresentation(presentationId: string) {
  return guarded(async () => {
    const actor = await requireAdmin();
    const presentation = await db.closingPresentation.findUnique({
      where: { id: presentationId },
      select: { closingSessionId: true, companyId: true, slideCount: true },
    });
    if (!presentation) return { error: "Präsentation nicht gefunden." };
    if (presentation.slideCount === 0) {
      return { error: "Eine Präsentation ohne Folien lässt sich nicht freigeben." };
    }

    await db.closingPresentation.update({
      where: { id: presentationId },
      data: {
        status: "approved",
        approvedAt: new Date(),
        approvedById: actor.id,
        reviewNote: null,
      },
    });

    if (presentation.closingSessionId && presentation.companyId) {
      await logEvent({
        closingSessionId: presentation.closingSessionId,
        companyId: presentation.companyId,
        actorId: actor.id,
        eventType: "presentation_approved",
        metadata: { presentationId },
      });
      revalidatePath(pathFor(presentation.closingSessionId));
    }
    revalidatePath("/admin/sales/praesentationen");
    return { ok: true };
  });
}

/** Zurückweisung mit Begründung. */
export async function rejectPresentation(presentationId: string, note: string) {
  return guarded(async () => {
    const actor = await requireAdmin();
    const presentation = await db.closingPresentation.findUnique({
      where: { id: presentationId },
      select: { closingSessionId: true, companyId: true },
    });
    if (!presentation) return { error: "Präsentation nicht gefunden." };

    await db.closingPresentation.update({
      where: { id: presentationId },
      data: { status: "draft", approvedAt: null, approvedById: null, reviewNote: note.trim() || null },
    });

    if (presentation.closingSessionId && presentation.companyId) {
      await logEvent({
        closingSessionId: presentation.closingSessionId,
        companyId: presentation.companyId,
        actorId: actor.id,
        eventType: "presentation_rejected",
        metadata: { presentationId, note: note.trim() || null },
      });
      revalidatePath(pathFor(presentation.closingSessionId));
    }
    revalidatePath("/admin/sales/praesentationen");
    return { ok: true };
  });
}

/** Startet die Präsentation im laufenden Gespräch. */
export async function startPresentation(closingSessionId: string, presentationId: string) {
  return guarded(async () => {
    const { actor, companyId } = await requireSessionAccess(closingSessionId);

    const presentation = await db.closingPresentation.findUnique({
      where: { id: presentationId },
      select: {
        status: true,
        closingSessionId: true,
        slides: { orderBy: { position: "asc" }, take: 1, select: { position: true } },
      },
    });
    if (!presentation || presentation.closingSessionId !== closingSessionId) {
      return { error: "Präsentation gehört nicht zu diesem Abschluss." };
    }
    if (presentation.status !== "approved") {
      return { error: "Die Präsentation ist noch nicht freigegeben." };
    }
    if (presentation.slides.length === 0) {
      return { error: "Die Präsentation enthält keine Folien." };
    }

    await db.closingSession.update({
      where: { id: closingSessionId },
      data: {
        livePresentationId: presentationId,
        liveSlidePosition: presentation.slides[0].position,
        liveSlidePage: 1,
      },
    });

    await logEvent({
      closingSessionId,
      companyId,
      actorId: actor.id,
      eventType: "presentation_started",
      metadata: { presentationId },
    });

    revalidatePath(pathFor(closingSessionId));
    return { ok: true };
  });
}

/**
 * Blättert zur angegebenen Folie — und innerhalb einer PDF-Folie zur
 * angegebenen Seite.
 */
export async function showSlide(closingSessionId: string, position: number, page = 1) {
  return guarded(async () => {
    await requireSessionAccess(closingSessionId);

    const session = await db.closingSession.findUnique({
      where: { id: closingSessionId },
      select: { livePresentationId: true },
    });
    if (!session?.livePresentationId) return { error: "Es läuft keine Präsentation." };

    const slide = await db.closingPresentationSlide.findFirst({
      where: { presentationId: session.livePresentationId, position },
      select: { position: true },
    });
    if (!slide) return { error: "Diese Folie gibt es nicht." };

    await db.closingSession.update({
      where: { id: closingSessionId },
      data: {
        liveSlidePosition: slide.position,
        liveSlidePage: Number.isFinite(page) && page > 0 ? Math.floor(page) : 1,
      },
    });

    revalidatePath(pathFor(closingSessionId));
    return { ok: true, position: slide.position };
  });
}

/** Beendet die Präsentation; der Kunde sieht wieder nur das Gespräch. */
export async function stopPresentation(closingSessionId: string) {
  return guarded(async () => {
    const { actor, companyId } = await requireSessionAccess(closingSessionId);

    const session = await db.closingSession.findUnique({
      where: { id: closingSessionId },
      select: { livePresentationId: true },
    });

    await db.closingSession.update({
      where: { id: closingSessionId },
      data: { livePresentationId: null, liveSlidePosition: null, liveSlidePage: null },
    });

    if (session?.livePresentationId) {
      await logEvent({
        closingSessionId,
        companyId,
        actorId: actor.id,
        eventType: "presentation_stopped",
        metadata: { presentationId: session.livePresentationId },
      });
    }

    revalidatePath(pathFor(closingSessionId));
    return { ok: true };
  });
}

/** Löscht eine noch nicht freigegebene Präsentation samt Folien. */
export async function deletePresentation(presentationId: string) {
  return guarded(async () => {
    const presentation = await db.closingPresentation.findUnique({
      where: { id: presentationId },
      select: {
        closingSessionId: true,
        status: true,
        slides: { select: { r2Key: true } },
      },
    });
    if (!presentation?.closingSessionId) return { error: "Präsentation nicht gefunden." };
    const { actor } = await requireSessionAccess(presentation.closingSessionId);
    if (presentation.status === "approved" && actor.role !== "ADMIN") {
      return { error: "Freigegebene Präsentationen kann nur ein Administrator entfernen." };
    }

    const live = await db.closingSession.findFirst({
      where: { livePresentationId: presentationId },
      select: { id: true },
    });
    if (live) {
      return { error: "Die Präsentation läuft gerade. Bitte zuerst beenden." };
    }

    await db.closingPresentation.delete({ where: { id: presentationId } });

    for (const slide of presentation.slides) {
      try {
        await deleteFromR2(slide.r2Key);
      } catch (err) {
        console.warn("[presentation] R2-Objekt konnte nicht gelöscht werden:", err);
      }
    }

    revalidatePath(pathFor(presentation.closingSessionId));
    return { ok: true };
  });
}
