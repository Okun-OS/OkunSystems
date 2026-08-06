import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getPresignedReadUrl } from "@/lib/storage";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const userRecord = await db.user.findUnique({ where: { id: userId } });
  if (!userRecord || (userRecord.role !== "ADMIN" && userRecord.role !== "CLOSER")) {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
  }

  const templateId = req.nextUrl.searchParams.get("templateId");
  if (!templateId) return NextResponse.json({ error: "templateId fehlt" }, { status: 400 });

  const template = await db.offerTemplate.findUnique({
    where: { id: templateId },
    select: { r2Key: true },
  });
  if (!template?.r2Key) return NextResponse.json({ error: "Kein PDF vorhanden" }, { status: 404 });

  const url = await getPresignedReadUrl(template.r2Key, 300);
  return NextResponse.redirect(url);
}
