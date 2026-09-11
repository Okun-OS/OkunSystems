import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getActor } from "@/lib/auth-guards";
import { canAccessAdminPath, homeFor } from "@/lib/closing/role-access";
import { AdminSidebar } from "@/components/layout/admin-sidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // getActor liest die Rolle aus der Datenbank und weist deaktivierte Konten
  // ab — ein bereits ausgestelltes JWT genügt hier nicht.
  const actor = await getActor();
  if (!actor) redirect("/login");
  if (actor.role !== "ADMIN" && actor.role !== "CLOSER") redirect("/dashboard");

  const pathname = (await headers()).get("x-okun-pathname") ?? "";
  if (pathname && !canAccessAdminPath(actor.role, pathname)) {
    redirect(homeFor(actor.role));
  }

  return (
    <div className="min-h-screen bg-[#080c14]">
      <AdminSidebar user={{ name: actor.name, email: actor.email, role: actor.role }} />
      <main className="ml-[240px] min-h-screen">
        <div className="p-6 md:p-8">{children}</div>
      </main>
    </div>
  );
}
