import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getDocumentReadUrl } from "@/lib/documents/actions";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const documentId = searchParams.get("id");
  if (!documentId) return NextResponse.json({ error: "id required" }, { status: 400 });

  const doc = await db.document.findUnique({
    where: { id: documentId },
    select: { companyId: true, visibility: true },
  });

  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const user = session.user as any;

  // Admins can access any document
  if (user.role !== "ADMIN") {
    // Portal users can only access documents from their own company
    if (doc.companyId !== user.companyId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    // Portal users can only access customer-visible documents
    if (doc.visibility !== "customer") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const url = await getDocumentReadUrl(documentId);
  return NextResponse.json({ url });
}
