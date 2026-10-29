import { createHash } from "crypto";
import { db } from "@/lib/db";
import { getPresignedReadUrl } from "@/lib/storage";
import {
  GetObjectCommand,
  HeadObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

export function sha256Buffer(buffer: Buffer | Uint8Array): string {
  return createHash("sha256").update(buffer).digest("hex");
}

export function sha256String(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

/**
 * Kanonisiert ein JSON-Objekt (Schlüssel rekursiv sortiert) und hasht es.
 * Damit ist der Hash unabhängig von der Feldreihenfolge reproduzierbar.
 */
export function sha256Canonical(value: unknown): string {
  return sha256String(canonicalize(value));
}

export function canonicalize(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
  if (value instanceof Date) return JSON.stringify(value.toISOString());
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalize(v)}`).join(",")}}`;
}

function r2Client(): S3Client {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "R2 nicht konfiguriert (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY)."
    );
  }
  return new S3Client({
    region: "auto",
    endpoint: process.env.R2_ENDPOINT || `https://${accountId}.r2.cloudflarestorage.com`,
    forcePathStyle: process.env.R2_FORCE_PATH_STYLE === "true",
    credentials: { accessKeyId, secretAccessKey },
  });
}

function bucket(): string {
  const name = process.env.R2_BUCKET_NAME;
  if (!name) throw new Error("R2_BUCKET_NAME ist nicht gesetzt.");
  return name;
}

/** Lädt ein R2-Objekt vollständig in den Speicher. */
export async function downloadFromR2(key: string): Promise<Buffer> {
  const res = await r2Client().send(
    new GetObjectCommand({ Bucket: bucket(), Key: key })
  );
  const body = res.Body as AsyncIterable<Uint8Array> | undefined;
  if (!body) throw new Error(`R2-Objekt ${key} hat keinen Inhalt`);
  const chunks: Uint8Array[] = [];
  for await (const chunk of body) chunks.push(chunk);
  return Buffer.concat(chunks);
}

export type R2VerifyResult = {
  ok: boolean;
  size?: number;
  error?: string;
};

/**
 * Verifiziert, dass ein Objekt tatsächlich in R2 liegt und – sofern
 * `expectedSize` übergeben wird – die erwartete Größe besitzt.
 */
export async function verifyR2Object(
  key: string,
  expectedSize?: number
): Promise<R2VerifyResult> {
  try {
    const head = await r2Client().send(
      new HeadObjectCommand({ Bucket: bucket(), Key: key })
    );
    const size = head.ContentLength ?? undefined;
    if (expectedSize !== undefined && size !== undefined && size !== expectedSize) {
      return { ok: false, size, error: `Größe weicht ab (${size} statt ${expectedSize})` };
    }
    return { ok: true, size };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Stellt sicher, dass für eine Dokumentversion ein SHA-256-Hash gespeichert ist.
 *
 * Der Hash wird über die exakt ausgelieferten Bytes gebildet: bei einer
 * PDF-Version über die R2-Datei, bei einer Inline-Version über den Textinhalt.
 * Weil Versionen unveränderlich sind, ist die Berechnung idempotent — ein
 * bereits gespeicherter Hash wird nie überschrieben.
 */
export async function ensureVersionHash(versionId: string): Promise<string | null> {
  const version = await db.legalDocument.findUnique({
    where: { id: versionId },
    select: { id: true, sha256: true, r2Key: true, content: true, fileSize: true },
  });
  if (!version) return null;
  if (version.sha256) return version.sha256;

  let hash: string | null = null;
  let size: number | null = version.fileSize ?? null;

  if (version.r2Key) {
    try {
      const buffer = await downloadFromR2(version.r2Key);
      hash = sha256Buffer(buffer);
      size = buffer.byteLength;
    } catch (err) {
      console.error(`[hash] R2-Download für Version ${versionId} fehlgeschlagen:`, err);
      return null;
    }
  } else if (version.content) {
    hash = sha256String(version.content);
    size = Buffer.byteLength(version.content, "utf8");
  }

  if (!hash) return null;

  await db.legalDocument.update({
    where: { id: versionId },
    data: { sha256: hash, fileSize: size ?? undefined },
  });
  return hash;
}

/** Kurzform für die Anzeige eines Hashes in der UI. */
export function shortHash(hash: string | null | undefined): string {
  if (!hash) return "—";
  return `${hash.slice(0, 12)}…${hash.slice(-8)}`;
}

export { getPresignedReadUrl };
