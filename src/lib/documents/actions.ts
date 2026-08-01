"use server";

import { db } from "@/lib/db";
import {
  getPresignedUploadUrl,
  getPresignedReadUrl,
  deleteFromR2,
  buildDocumentKey,
} from "@/lib/storage";
import { logActivity } from "@/lib/activity/log";

export async function createDocumentUploadUrl(params: {
  companyId: string;
  fileName: string;
  mimeType: string;
  uploadedById: string;
}): Promise<{ uploadUrl: string; r2Key: string }> {
  const { companyId, fileName, mimeType, uploadedById: _ } = params;
  const r2Key = buildDocumentKey(companyId, fileName);
  const uploadUrl = await getPresignedUploadUrl(r2Key, mimeType, 300);
  return { uploadUrl, r2Key };
}

export async function saveDocument(params: {
  companyId: string;
  title: string;
  description?: string;
  category?: string;
  r2Key: string;
  fileName: string;
  fileSize?: number;
  mimeType?: string;
  visibility: "internal" | "customer";
  uploadedById: string;
}) {
  const doc = await db.document.create({
    data: {
      companyId: params.companyId,
      title: params.title,
      description: params.description ?? null,
      category: params.category ?? "OTHER",
      r2Key: params.r2Key,
      fileName: params.fileName,
      fileSize: params.fileSize ?? null,
      mimeType: params.mimeType ?? null,
      visibility: params.visibility,
      isInternal: params.visibility === "internal",
      isPublished: params.visibility === "customer",
      uploadedById: params.uploadedById,
    },
  });

  await logActivity({
    companyId: params.companyId,
    userId: params.uploadedById,
    action: "document.uploaded",
    entityType: "Document",
    entityId: doc.id,
    metadata: { title: params.title, visibility: params.visibility },
  });

  return doc;
}

export async function setDocumentVisibility(
  documentId: string,
  visibility: "internal" | "customer",
  userId: string
) {
  const doc = await db.document.update({
    where: { id: documentId },
    data: {
      visibility,
      isInternal: visibility === "internal",
      isPublished: visibility === "customer",
    },
  });

  await logActivity({
    companyId: doc.companyId,
    userId,
    action: "document.visibility_changed",
    entityType: "Document",
    entityId: documentId,
    metadata: { visibility },
  });

  return doc;
}

export async function deleteDocument(
  documentId: string,
  userId: string
) {
  const doc = await db.document.findUniqueOrThrow({ where: { id: documentId } });

  if (doc.r2Key) {
    await deleteFromR2(doc.r2Key).catch(() => {});
  }

  await db.document.delete({ where: { id: documentId } });

  await logActivity({
    companyId: doc.companyId,
    userId,
    action: "document.deleted",
    entityType: "Document",
    entityId: documentId,
    metadata: { title: doc.title },
  });
}

export async function getDocumentReadUrl(documentId: string): Promise<string> {
  const doc = await db.document.findUniqueOrThrow({
    where: { id: documentId },
    select: { r2Key: true, fileUrl: true },
  });

  if (doc.r2Key) {
    return getPresignedReadUrl(doc.r2Key, 3600);
  }

  if (doc.fileUrl) return doc.fileUrl;

  throw new Error("Dokument hat keine Datei.");
}
