import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
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
    <div className="min-h-screen bg-[#080c14]">
      <Sidebar
        user={{
          name: userRecord.name,
          email: userRecord.email,
          companyName: userRecord.company?.name,
          plan: userRecord.company?.plan,
        }}
      />
      <main className="ml-[240px] min-h-screen flex flex-col">
        <div className="flex-1 p-6 md:p-8">{children}</div>

        {/* Die Datenschutzerklärung deckt auch das Portal ab — dann muss sie
            von hier aus erreichbar sein, nicht nur von der Website. */}
        <footer className="border-t border-[#12203a] px-6 py-4 md:px-8">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <Link href="/impressum" className="text-xs text-[#5b6b7f] hover:text-[#c9d4e4] transition-colors">
              Impressum
            </Link>
            <Link href="/datenschutz" className="text-xs text-[#5b6b7f] hover:text-[#c9d4e4] transition-colors">
              Datenschutz
            </Link>
          </div>
        </footer>
      </main>
    </div>
  );
}
