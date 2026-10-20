import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, AuthorizationError } from "@/lib/auth-guards";
import { uploadToR2 } from "@/lib/storage";
import { sha256Buffer, verifyR2Object } from "@/lib/documents/hash";

export const dynamic = "force-dynamic";

const MAX_BYTES = 25 * 1024 * 1024;
const ALLOWED = ["application/pdf"];

/**
 * Lädt eine neue Dokumentversion hoch. Der SHA-256-Hash wird serverseitig über
 * exakt die gespeicherten Bytes gebildet, der Upload anschließend verifiziert.
 * Ein bestehender Schlüssel wird nie überschrieben — jede Version bekommt einen
 * eigenen Objektnamen.
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
  } catch (err) {
    const status = err instanceof AuthorizationError ? 403 : 500;
    return NextResponse.json({ error: "Keine Berechtigung" }, { status });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Keine Datei angegeben" }, { status: 400 });
  }
  if (!ALLOWED.includes(file.type)) {
    return NextResponse.json({ error: "Nur PDF-Dateien sind zulässig." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Die Datei ist größer als 25 MB." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const sha256 = sha256Buffer(buffer);
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const key = `contract-documents/${sha256.slice(0, 16)}_${Date.now()}_${safeName}`;

  try {
    await uploadToR2(buffer, key, "application/pdf");
    const verified = await verifyR2Object(key, buffer.byteLength);
    if (!verified.ok) {
      return NextResponse.json(
        { error: `Upload konnte nicht verifiziert werden: ${verified.error ?? ""}` },
        { status: 502 }
      );
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upload fehlgeschlagen" },
      { status: 502 }
    );
  }

  return NextResponse.json({
    r2Key: key,
    sha256,
    fileSize: buffer.byteLength,
    fileName: file.name,
  });
}
