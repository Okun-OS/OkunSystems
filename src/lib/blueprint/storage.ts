import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

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
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
}

/**
 * uploadPdfToR2 stores a PDF buffer in the configured R2 bucket and returns
 * its public URL.
 *
 * Required env vars:
 *   R2_ACCOUNT_ID        – Cloudflare account ID
 *   R2_ACCESS_KEY_ID     – R2 API token access key
 *   R2_SECRET_ACCESS_KEY – R2 API token secret
 *   R2_BUCKET_NAME       – Target bucket name
 *   R2_PUBLIC_URL        – Public bucket base URL (without trailing slash)
 *                          e.g. https://pub-abc123.r2.dev
 */
export async function uploadPdfToR2(
  pdfBuffer: Buffer,
  key: string
): Promise<string> {
  const bucket = process.env.R2_BUCKET_NAME;
  const publicUrl = process.env.R2_PUBLIC_URL;

  if (!bucket) throw new Error("R2_BUCKET_NAME is not set.");
  if (!publicUrl) throw new Error("R2_PUBLIC_URL is not set.");

  const client = getR2Client();

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: pdfBuffer,
      ContentType: "application/pdf",
      CacheControl: "private, max-age=3600",
    })
  );

  return `${publicUrl.replace(/\/$/, "")}/${key}`;
}

/** Builds the R2 object key for a Blueprint session report. */
export function buildReportKey(sessionId: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `reports/blueprint2/${sessionId}/${timestamp}.pdf`;
}
