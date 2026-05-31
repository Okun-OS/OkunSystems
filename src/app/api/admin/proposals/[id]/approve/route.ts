import { auth } from "@/auth";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as { role?: string }).role;
  if (role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const userId = (session.user as { id: string }).id;

  const proposal = await db.learningProposal.findUnique({ where: { id } });
  if (!proposal) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.learningProposal.update({
    where: { id },
    data: {
      status: "APPROVED",
      reviewedAt: new Date(),
      reviewedById: userId,
    },
  });

  // Add to library based on type
  const data = JSON.parse(proposal.proposedData);
  if (proposal.type === "NEW_PROCESS") {
    await db.processLibraryItem.create({
      data: {
        name: data.name ?? proposal.title,
        category: data.category ?? "Sonstige",
        description: proposal.description,
        isCustom: true,
      },
    });
  } else if (proposal.type === "NEW_PROBLEM") {
    await db.problemLibraryItem.create({
      data: {
        name: data.operativeProblem ?? proposal.title,
        symptomPatterns: JSON.stringify(data.evidence ?? []),
        operativeProblem: data.operativeProblem ?? "",
        rootCause: data.rootCause ?? "",
        category: data.category ?? "Sonstige",
        severity: data.severity ?? "MEDIUM",
        isCustom: true,
      },
    });
  }

  return NextResponse.redirect(new URL("/admin/methodik", _req.url));
}
