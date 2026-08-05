import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { AdminSidebar } from "@/components/layout/admin-sidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userRecord = await db.user.findUnique({
    where: { id: (session.user as any).id },
  });

  if (!userRecord || (userRecord.role !== "ADMIN" && userRecord.role !== "CLOSER")) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-[#080c14]">
      <AdminSidebar user={{ name: userRecord.name, email: userRecord.email }} />
      <main className="ml-[240px] min-h-screen">
        <div className="p-6 md:p-8">{children}</div>
      </main>
    </div>
  );
}
