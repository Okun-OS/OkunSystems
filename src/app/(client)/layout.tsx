import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Sidebar } from "@/components/layout/sidebar";

export default async function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userRecord = await db.user.findUnique({
    where: { id: (session.user as any).id },
    include: { company: true },
  });

  if (!userRecord) redirect("/login");
  if (userRecord.role === "ADMIN") redirect("/admin/dashboard");

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Sidebar
        user={{
          name: userRecord.name,
          email: userRecord.email,
          companyName: userRecord.company?.name,
        }}
      />
      <main className="ml-[240px] min-h-screen">
        <div className="p-6 md:p-8">{children}</div>
      </main>
    </div>
  );
}
