"use server";

import { db } from "@/lib/db";
import {
  getPresignedUploadUrl,
  getPresignedReadUrl,
  buildLessonKey,
  buildThumbnailKey,
} from "@/lib/storage";
import { logActivity } from "@/lib/activity/log";
import { sendLearningAssignmentEmail } from "@/lib/email";
import { SIGNAL_TAG_MAP } from "./constants";

// ─── Categories ──────────────────────────────────────────────────────────────

export async function createLearningCategory(params: {
  title: string;
  description?: string;
  order?: number;
}) {
  return db.learningCategory.create({
    data: {
      title: params.title,
      description: params.description ?? null,
      order: params.order ?? 0,
    },
  });
}

export async function updateLearningCategory(
  id: string,
  params: { title?: string; description?: string; order?: number; isActive?: boolean }
) {
  return db.learningCategory.update({ where: { id }, data: params });
}

// ─── Chapters ─────────────────────────────────────────────────────────────────

export async function createLearningChapter(params: {
  categoryId: string;
  title: string;
  description?: string;
  contentType?: string;
  estimatedMinutes?: number;
  order?: number;
}) {
  return db.learningChapter.create({
    data: {
      categoryId: params.categoryId,
      title: params.title,
      description: params.description ?? null,
      contentType: params.contentType ?? "mixed",
      estimatedMinutes: params.estimatedMinutes ?? null,
      order: params.order ?? 0,
      status: "DRAFT",
    },
  });
}

export async function updateLearningChapter(
  id: string,
  params: {
    title?: string;
    description?: string;
    contentType?: string;
    estimatedMinutes?: number;
    order?: number;
    status?: string;
    isActive?: boolean;
  }
) {
  return db.learningChapter.update({ where: { id }, data: params });
}

export async function publishChapter(id: string) {
  return db.learningChapter.update({
    where: { id },
    data: { status: "PUBLISHED" },
  });
}

export async function archiveChapter(id: string) {
  return db.learningChapter.update({
    where: { id },
    data: { status: "ARCHIVED" },
  });
}

export async function getThumbnailUploadUrl(chapterId: string): Promise<string> {
  const key = buildThumbnailKey(chapterId);
  const url = await getPresignedUploadUrl(key, "image/jpeg", 300);
  await db.learningChapter.update({ where: { id: chapterId }, data: { thumbnailR2Key: key } });
  return url;
}

// ─── Lessons ──────────────────────────────────────────────────────────────────

export async function createLearningLesson(params: {
  chapterId: string;
  title: string;
  description?: string;
  contentType?: string;
  externalUrl?: string;
  estimatedMinutes?: number;
  order?: number;
}) {
  return db.learningLesson.create({
    data: {
      chapterId: params.chapterId,
      title: params.title,
      description: params.description ?? null,
      contentType: params.contentType ?? "video",
      externalUrl: params.externalUrl ?? null,
      estimatedMinutes: params.estimatedMinutes ?? null,
      order: params.order ?? 0,
      status: "DRAFT",
    },
  });
}

export async function updateLearningLesson(
  id: string,
  params: {
    title?: string;
    description?: string;
    contentType?: string;
    externalUrl?: string;
    estimatedMinutes?: number;
    order?: number;
    status?: string;
  }
) {
  return db.learningLesson.update({ where: { id }, data: params });
}

export async function getLessonUploadUrl(
  lessonId: string,
  fileName: string,
  mimeType: string
): Promise<{ uploadUrl: string; r2Key: string }> {
  const r2Key = buildLessonKey(lessonId, fileName);
  const uploadUrl = await getPresignedUploadUrl(r2Key, mimeType, 300);
  await db.learningLesson.update({ where: { id: lessonId }, data: { r2Key } });
  return { uploadUrl, r2Key };
}

export async function getLessonReadUrl(lessonId: string): Promise<string> {
  const lesson = await db.learningLesson.findUniqueOrThrow({
    where: { id: lessonId },
    select: { r2Key: true, externalUrl: true },
  });
  if (lesson.r2Key) return getPresignedReadUrl(lesson.r2Key, 14400);
  if (lesson.externalUrl) return lesson.externalUrl;
  throw new Error("Lektion hat noch keinen Inhalt.");
}

// ─── Tags ─────────────────────────────────────────────────────────────────────

export async function setChapterTags(chapterId: string, tagNames: string[]) {
  const tags = await Promise.all(
    tagNames.map((name) =>
      db.learningTag.upsert({ where: { name }, create: { name }, update: {} })
    )
  );

  await db.learningChapterTag.deleteMany({ where: { chapterId } });
  if (tags.length > 0) {
    await db.learningChapterTag.createMany({
      data: tags.map((t) => ({ chapterId, tagId: t.id })),
    });
  }
}

// ─── Assignments ──────────────────────────────────────────────────────────────

export async function suggestAssignment(params: {
  companyId: string;
  chapterId: string;
  assignedById: string;
  sessionId?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const existing = await db.customerLearningAssignment.findUnique({
    where: { companyId_chapterId: { companyId: params.companyId, chapterId: params.chapterId } },
  });
  if (existing) return { ok: false, error: "Dieses Kapitel ist bereits zugewiesen." };

  await db.customerLearningAssignment.create({
    data: {
      companyId: params.companyId,
      chapterId: params.chapterId,
      assignedById: params.assignedById,
      sessionId: params.sessionId ?? null,
      status: "suggested",
    },
  });

  await logActivity({
    companyId: params.companyId,
    userId: params.assignedById,
    action: "assignment.suggested",
    entityType: "LearningChapter",
    entityId: params.chapterId,
  });

  return { ok: true };
}

export async function activateAssignment(params: {
  assignmentId: string;
  adminUserId: string;
}) {
  const assignment = await db.customerLearningAssignment.update({
    where: { id: params.assignmentId },
    data: { status: "active", activatedAt: new Date() },
    include: {
      company: { include: { users: { where: { role: "CLIENT" }, take: 1 } } },
      chapter: { select: { title: true } },
    },
  });

  await logActivity({
    companyId: assignment.companyId,
    userId: params.adminUserId,
    action: "assignment.activated",
    entityType: "CustomerLearningAssignment",
    entityId: params.assignmentId,
    metadata: { chapterTitle: assignment.chapter.title },
  });

  const primaryUser = assignment.company.users[0];
  if (primaryUser) {
    await sendLearningAssignmentEmail({
      toEmail: primaryUser.email,
      toName: primaryUser.name ?? primaryUser.email,
      companyName: assignment.company.name,
      chapterTitle: assignment.chapter.title,
    });
  }

  return assignment;
}

export async function rejectAssignment(params: {
  assignmentId: string;
  adminUserId: string;
  note?: string;
}) {
  const assignment = await db.customerLearningAssignment.update({
    where: { id: params.assignmentId },
    data: {
      status: "rejected",
      rejectedAt: new Date(),
      rejectionNote: params.note ?? null,
    },
  });

  await logActivity({
    companyId: assignment.companyId,
    userId: params.adminUserId,
    action: "assignment.rejected",
    entityType: "CustomerLearningAssignment",
    entityId: params.assignmentId,
  });

  return assignment;
}

// ─── Progress ─────────────────────────────────────────────────────────────────

export async function updateLessonProgress(params: {
  userId: string;
  lessonId: string;
  progressPct: number;
}) {
  const { userId, lessonId, progressPct } = params;
  const clampedPct = Math.min(100, Math.max(0, progressPct));
  const status =
    clampedPct === 0
      ? "not_started"
      : clampedPct >= 100
      ? "completed"
      : "in_progress";

  const existing = await db.lessonProgress.findUnique({
    where: { userId_lessonId: { userId, lessonId } },
  });

  if (!existing) {
    return db.lessonProgress.create({
      data: {
        userId,
        lessonId,
        status,
        progressPct: clampedPct,
        startedAt: clampedPct > 0 ? new Date() : null,
        completedAt: clampedPct >= 100 ? new Date() : null,
      },
    });
  }

  return db.lessonProgress.update({
    where: { userId_lessonId: { userId, lessonId } },
    data: {
      status,
      progressPct: clampedPct,
      startedAt: existing.startedAt ?? (clampedPct > 0 ? new Date() : null),
      completedAt: clampedPct >= 100 ? (existing.completedAt ?? new Date()) : null,
    },
  });
}

// ─── Blueprint → Learning suggestions ────────────────────────────────────────

export async function getSuggestedChaptersForSession(
  sessionId: string,
  companyId: string
): Promise<string[]> {
  const signals = await db.scoringEvidence.findMany({
    where: { sessionId },
    select: { category: true },
    distinct: ["category"],
  });

  const tagNames = signals.flatMap((s) => SIGNAL_TAG_MAP[s.category] ?? []);
  if (tagNames.length === 0) return [];

  const tags = await db.learningTag.findMany({
    where: { name: { in: tagNames } },
    select: { id: true },
  });

  const chapterTags = await db.learningChapterTag.findMany({
    where: { tagId: { in: tags.map((t) => t.id) } },
    select: { chapterId: true },
    distinct: ["chapterId"],
  });

  const alreadyAssigned = await db.customerLearningAssignment.findMany({
    where: { companyId },
    select: { chapterId: true },
  });
  const assignedIds = new Set(alreadyAssigned.map((a) => a.chapterId));

  return chapterTags
    .map((ct) => ct.chapterId)
    .filter((id) => !assignedIds.has(id));
}
