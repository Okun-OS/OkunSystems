import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

function getR2Client(): S3Client {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "R2 credentials missing. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY."
    );
  }

  return new S3Client({
    region: "auto",
    // R2_ENDPOINT erlaubt einen abweichenden S3-kompatiblen Endpunkt
    // (Self-Hosting, lokale Tests). Ohne Angabe gilt der Cloudflare-Endpunkt.
    endpoint: process.env.R2_ENDPOINT || `https://${accountId}.r2.cloudflarestorage.com`,
    forcePathStyle: process.env.R2_FORCE_PATH_STYLE === "true",
    credentials: { accessKeyId, secretAccessKey },
  });
}

function getBucket(): string {
  const bucket = process.env.R2_BUCKET_NAME;
  if (!bucket) throw new Error("R2_BUCKET_NAME is not set.");
  return bucket;
}

/** Generate a presigned GET URL for reading an R2 object. */
export async function getPresignedReadUrl(
  key: string,
  expiresInSeconds = 3600
): Promise<string> {
  const client = getR2Client();
  return getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: getBucket(), Key: key }),
    { expiresIn: expiresInSeconds }
  );
}

/** Generate a presigned PUT URL for uploading directly to R2 from the client. */
export async function getPresignedUploadUrl(
  key: string,
  contentType: string,
  expiresInSeconds = 300
): Promise<string> {
  const client = getR2Client();
  return getSignedUrl(
    client,
    new PutObjectCommand({
      Bucket: getBucket(),
      Key: key,
      ContentType: contentType,
    }),
    { expiresIn: expiresInSeconds }
  );
}

/** Upload a buffer directly to R2 (used for server-side generated files). */
export async function uploadToR2(
  buffer: Buffer,
  key: string,
  contentType: string
): Promise<string> {
  const bucket = getBucket();
  const publicUrl = process.env.R2_PUBLIC_URL;
  if (!publicUrl) throw new Error("R2_PUBLIC_URL is not set.");

  const client = getR2Client();
  try {
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        CacheControl: "private, max-age=3600",
      })
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[R2 upload] FAILED key=${key} bucket=${bucket} accountId=${process.env.R2_ACCOUNT_ID?.slice(0, 8)}… error=${msg}`);
    throw new Error(`R2 Upload fehlgeschlagen: ${msg}`);
  }

  return `${publicUrl.replace(/\/$/, "")}/${key}`;
}

/** Delete an object from R2. */
export async function deleteFromR2(key: string): Promise<void> {
  const client = getR2Client();
  await client.send(
    new DeleteObjectCommand({ Bucket: getBucket(), Key: key })
  );
}

/** Build a namespaced R2 key for documents. */
export function buildDocumentKey(companyId: string, fileName: string): string {
  const sanitized = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `documents/${companyId}/${Date.now()}_${sanitized}`;
}

/** Build a namespaced R2 key for lesson content. */
export function buildLessonKey(lessonId: string, fileName: string): string {
  const sanitized = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `lessons/${lessonId}/${sanitized}`;
}

/** Build a namespaced R2 key for chapter thumbnails. */
export function buildThumbnailKey(chapterId: string): string {
  return `thumbnails/chapters/${chapterId}.jpg`;
}
