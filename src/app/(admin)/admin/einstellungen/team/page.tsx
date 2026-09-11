import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getActor } from "@/lib/auth-guards";
import { TeamClient } from "./TeamClient";

export default async function TeamPage() {
  const actor = await getActor();
  if (!actor) redirect("/login");
  if (actor.role !== "ADMIN") redirect("/admin/dashboard");

  const members = await db.user.findMany({
    where: { role: { in: ["ADMIN", "CLOSER"] } },
    orderBy: [{ role: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      firstLogin: true,
      deactivatedAt: true,
      resetTokenExpiry: true,
      createdAt: true,
      _count: { select: { closerSessions: true, assignedLeads: true } },
    },
  });

  return (
    <TeamClient
      currentUserId={actor.id}
      members={members.map((m) => ({
        id: m.id,
        name: m.name,
        email: m.email,
        role: m.role,
        pendingSetup: m.firstLogin && Boolean(m.resetTokenExpiry),
        active: !m.deactivatedAt,
        deactivatedAt: m.deactivatedAt ? m.deactivatedAt.toISOString() : null,
        createdAt: m.createdAt.toISOString(),
        closingCount: m._count.closerSessions,
        leadCount: m._count.assignedLeads,
      }))}
    />
  );
}
