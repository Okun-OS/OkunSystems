import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getPresignedUploadUrl } from "@/lib/storage";
import { randomBytes } from "crypto";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const userRecord = await db.user.findUnique({ where: { id: userId } });
  if (!userRecord || userRecord.role !== "ADMIN") {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
  }

  const { templateId } = (await request.json()) as { templateId?: string };
  if (!templateId) return NextResponse.json({ error: "templateId fehlt" }, { status: 400 });

  const template = await db.offerTemplate.findUnique({ where: { id: templateId } });
  if (!template) return NextResponse.json({ error: "Template nicht gefunden" }, { status: 404 });

  const key = `offer-templates/${templateId}/${randomBytes(8).toString("hex")}.pdf`;
  const uploadUrl = await getPresignedUploadUrl(key, "application/pdf", 300);

  return NextResponse.json({ uploadUrl, key });
}
