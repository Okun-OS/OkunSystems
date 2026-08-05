import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { ClosingWorkspaceClient } from "./ClosingWorkspaceClient";

export default async function ClosingWorkspacePage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");
  const userId = (session.user as { id: string }).id;
  const userRecord = await db.user.findUnique({ where: { id: userId } });
  if (!userRecord || (userRecord.role !== "ADMIN" && userRecord.role !== "CLOSER")) {
    redirect("/dashboard");
  }

  const closingSession = await db.closingSession.findUnique({
    where: { id: sessionId },
    include: {
      company: {
        select: {
          id: true,
          name: true,
          industry: true,
          contactPerson: true,
          contractValue: true,
          contractPackage: true,
          closingNotes: true,
        },
      },
      closer: { select: { id: true, name: true } },
      appointment: {
        select: {
          startTime: true,
          endTime: true,
          title: true,
          bookedByName: true,
          bookedByEmail: true,
        },
      },
      offers: {
        include: { template: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      },
      events: {
        include: { actor: { select: { name: true } } },
        orderBy: { occurredAt: "desc" },
      },
    },
  });

  if (!closingSession) redirect("/admin/sales");
  if (userRecord.role === "CLOSER" && closingSession.closerId !== userId) {
    redirect("/admin/sales");
  }

  const [salesContent, offerTemplates] = await Promise.all([
    db.salesContent.findMany({
      where: { status: "published" },
      select: { id: true, type: true, category: true, title: true, content: true },
      orderBy: [{ type: "asc" }, { order: "asc" }],
    }),
    db.offerTemplate.findMany({
      where: { status: "published" },
      select: {
        id: true,
        name: true,
        packageType: true,
        priceNet: true,
        currency: true,
        description: true,
      },
      orderBy: { priceNet: "asc" },
    }),
  ]);

  return (
    <ClosingWorkspaceClient
      closingSession={closingSession}
      salesContent={salesContent}
      offerTemplates={offerTemplates}
      currentUserId={userId}
    />
  );
}
