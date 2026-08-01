import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { saveDocument } from "@/lib/documents/actions";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { companyId, title, category, visibility, r2Key, fileName, fileSize, mimeType } = body;

  if (!companyId || !title || !r2Key) {
    return NextResponse.json({ error: "companyId, title, r2Key required" }, { status: 400 });
  }

  const doc = await saveDocument({
    companyId,
    title,
    description: body.description,
    category: category ?? "OTHER",
    r2Key,
    fileName: fileName ?? title,
    fileSize,
    mimeType,
    visibility: visibility ?? "internal",
    uploadedById: (session.user as any).id,
  });

  return NextResponse.json(doc);
}
