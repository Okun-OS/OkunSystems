import { NextRequest, NextResponse } from "next/server";
import { requireSessionAccess, AuthorizationError } from "@/lib/auth-guards";
import { uploadToR2 } from "@/lib/storage";
import { sha256Buffer, verifyR2Object } from "@/lib/documents/hash";
import { isDisplayable, rejectionMessage } from "@/lib/closing/upload-formats";

export const dynamic = "force-dynamic";

const MAX_BYTES = 25 * 1024 * 1024;

/**
 * Lädt eine Folie hoch. Der Hash wird über exakt die gespeicherten Bytes
 * gebildet.
 *
 * Angenommen wird, was ein Browser darstellen kann: Bilder werden im Gespräch
 * als einzelne Folie gezeigt, eine PDF seitenweise gerendert und Seite für
 * Seite weitergeblättert.
 */
export async function POST(request: NextRequest) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });
  }

  const closingSessionId = formData.get("closingSessionId");
  if (typeof closingSessionId !== "string" || !closingSessionId) {
    return NextResponse.json({ error: "closingSessionId fehlt" }, { status: 400 });
  }

  try {
    // Ein Closer darf nur Folien für seine eigenen Abschlüsse hochladen.
    await requireSessionAccess(closingSessionId);
  } catch (err) {
    const status = err instanceof AuthorizationError ? 403 : 500;
    return NextResponse.json({ error: "Keine Berechtigung" }, { status });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Keine Datei angegeben" }, { status: 400 });
  }
  if (!isDisplayable(file.type)) {
    return NextResponse.json({ error: rejectionMessage(file.type) }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Die Datei ist größer als 25 MB." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const sha256 = sha256Buffer(buffer);
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const key = `presentations/${closingSessionId}/${sha256.slice(0, 16)}_${Date.now()}_${safeName}`;

  try {
    await uploadToR2(buffer, key, file.type);
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
    mimeType: file.type,
  });
}
