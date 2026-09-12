import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { randomBytes } from "crypto";
import { extensionFor, isDisplayable, rejectionMessage } from "@/lib/closing/upload-formats";

function getR2Client() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error("R2 credentials missing");
  }
  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const userRecord = await db.user.findUnique({ where: { id: userId } });
  if (!userRecord || userRecord.role !== "ADMIN") {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });
  }

  const templateId = formData.get("templateId") as string | null;
  const file = formData.get("file") as File | null;

  if (!templateId || !file) {
    return NextResponse.json({ error: "templateId und file erforderlich" }, { status: 400 });
  }
  if (!isDisplayable(file.type)) {
    return NextResponse.json({ error: rejectionMessage(file.type) }, { status: 400 });
  }

  const template = await db.offerTemplate.findUnique({ where: { id: templateId } });
  if (!template) return NextResponse.json({ error: "Template nicht gefunden" }, { status: 404 });

  // Endung und Medientyp aus der Datei übernehmen, damit der Kunde sie später
  // richtig angezeigt bekommt — vorher wurde alles als PDF abgelegt.
  const key = `offer-templates/${templateId}/${randomBytes(8).toString("hex")}.${extensionFor(file.type)}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const client = getR2Client();
  await client.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
      Body: buffer,
      ContentType: file.type,
    })
  );

  await db.offerTemplate.update({
    where: { id: templateId },
    data: { r2Key: key },
  });

  revalidatePath("/admin/sales/angebote");
  return NextResponse.json({ key });
}
