import { auth } from "@/auth";
import { db } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Users, Mail, User, Shield } from "lucide-react";
import bcryptjs from "bcryptjs";

export default async function CustomerBenutzerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN") redirect("/login");

  const { id } = await params;

  const company = await db.company.findUnique({
    where: { id },
    include: {
      users: {
        where: { role: "CLIENT" },
        select: { id: true, name: true, email: true, createdAt: true, firstLogin: true, twoFactorEnabled: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!company) notFound();

  async function toggle2FA(formData: FormData) {
    "use server";
    const userId = formData.get("userId") as string;
    const current = formData.get("current") === "true";
    await db.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: !current,
        twoFactorCode: null,
        twoFactorExpiry: null,
        twoFactorSentAt: null,
      },
    });
    revalidatePath(`/admin/kunden/${id}/benutzer`);
  }

  async function addUser(formData: FormData) {
    "use server";
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    if (!name || !email || !password) return;

    const existing = await db.user.findUnique({ where: { email } });
    if (existing) return;

    const hashed = await bcryptjs.hash(password, 12);
    await db.user.create({
      data: {
        name,
        email,
        password: hashed,
        role: "CLIENT",
        firstLogin: true,
        companyId: id,
      },
    });
    revalidatePath(`/admin/kunden/${id}/benutzer`);
  }

  return (
    <div className="space-y-6">
      {/* User list */}
      <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#1a2840]">
          <h2 className="text-[#f0f0f0] font-semibold text-sm flex items-center gap-2">
            <Users size={15} className="text-[#00b8ff]" />
            Portal-Nutzer ({company.users.length})
          </h2>
        </div>

        {company.users.length === 0 ? (
          <div className="p-8 text-center">
            <Users size={32} className="text-[#333] mx-auto mb-3" />
            <p className="text-[#555] text-sm">Noch keine Nutzer für dieses Unternehmen.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#1a2840]">
            {company.users.map((u) => (
              <div key={u.id} className="flex items-center gap-4 px-5 py-3.5">
                <div className="w-8 h-8 rounded-full bg-[#00b8ff]/10 border border-[#00b8ff]/20 flex items-center justify-center flex-shrink-0">
                  <User size={14} className="text-[#00b8ff]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[#f0f0f0] text-sm font-medium">{u.name ?? "–"}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Mail size={11} className="text-[#555]" />
                    <p className="text-[#555] text-xs">{u.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {u.firstLogin && (
                    <span className="text-xs text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 px-2 py-0.5 rounded-full">
                      Noch nicht eingeloggt
                    </span>
                  )}
                  <form action={toggle2FA}>
                    <input type="hidden" name="userId" value={u.id} />
                    <input type="hidden" name="current" value={String(u.twoFactorEnabled)} />
                    <button
                      type="submit"
                      title={u.twoFactorEnabled ? "2FA deaktivieren" : "2FA aktivieren"}
                      className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border transition-colors ${
                        u.twoFactorEnabled
                          ? "text-[#00b8ff] bg-[#00b8ff]/10 border-[#00b8ff]/20 hover:bg-[#00b8ff]/20"
                          : "text-[#555] bg-[#101c2e] border-[#1a2840] hover:border-[#555]"
                      }`}
                    >
                      <Shield size={10} />
                      2FA
                    </button>
                  </form>
                  <span className="text-[#555] text-xs">
                    {new Date(u.createdAt).toLocaleDateString("de-DE")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add user */}
      <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-5">
        <h2 className="text-[#f0f0f0] font-semibold text-sm mb-4">Neuen Nutzer hinzufügen</h2>
        <form action={addUser} className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-[#888] mb-1.5">Name *</label>
            <input
              name="name"
              required
              placeholder="Max Mustermann"
              className="w-full bg-[#060a10] border border-[#1a2840] rounded-lg px-3 py-2.5 text-[#f0f0f0] text-sm placeholder-[#555] focus:outline-none focus:border-[#00b8ff]/50"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#888] mb-1.5">E-Mail *</label>
            <input
              name="email"
              type="email"
              required
              placeholder="max@firma.de"
              className="w-full bg-[#060a10] border border-[#1a2840] rounded-lg px-3 py-2.5 text-[#f0f0f0] text-sm placeholder-[#555] focus:outline-none focus:border-[#00b8ff]/50"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-[#888] mb-1.5">Initiales Passwort *</label>
            <input
              name="password"
              type="password"
              required
              minLength={8}
              placeholder="Mindestens 8 Zeichen"
              className="w-full bg-[#060a10] border border-[#1a2840] rounded-lg px-3 py-2.5 text-[#f0f0f0] text-sm placeholder-[#555] focus:outline-none focus:border-[#00b8ff]/50"
            />
          </div>
          <div className="col-span-2">
            <button
              type="submit"
              className="flex items-center gap-2 px-4 py-2 bg-[#00b8ff] hover:bg-[#0099d6] text-white font-semibold text-sm rounded-lg transition-colors"
            >
              Nutzer hinzufügen
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
