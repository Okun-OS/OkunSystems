import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { createDocumentUploadUrl } from "@/lib/documents/actions";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { companyId, fileName, mimeType } = body;

  if (!companyId || !fileName) {
    return NextResponse.json({ error: "companyId and fileName required" }, { status: 400 });
  }

  const result = await createDocumentUploadUrl({
    companyId,
    fileName,
    mimeType: mimeType ?? "application/octet-stream",
    uploadedById: (session.user as any).id,
  });

  return NextResponse.json(result);
}
