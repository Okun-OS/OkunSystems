import { auth } from "@/auth";
import { db } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { createInvitation, revokeInvitation } from "@/lib/invitations/actions";
import { UserPlus, Mail, Clock, CheckCircle, XCircle, Trash2, Crown } from "lucide-react";

export default async function PortalManagementPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;
  const sp = await searchParams;

  const [company, invitations, portalUsers] = await Promise.all([
    db.company.findUnique({
      where: { id },
      select: { id: true, name: true },
    }),
    db.invitation.findMany({
      where: { companyId: id },
      include: { createdBy: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    db.user.findMany({
      where: { companyId: id, role: { in: ["CLIENT", "CLIENT_ADMIN"] } },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  if (!company) notFound();

  async function handleInvite(formData: FormData) {
    "use server";
    const email = formData.get("email") as string;
    const role = formData.get("role") as "CLIENT" | "CLIENT_ADMIN";
    const adminId = (session!.user as any).id as string;
    await createInvitation({ companyId: id, email, role, createdById: adminId });
    redirect(`/admin/kunden/${id}/portal?success=invited`);
  }

  async function handleRevoke(formData: FormData) {
    "use server";
    const invitationId = formData.get("invitationId") as string;
    await revokeInvitation(invitationId);
    redirect(`/admin/kunden/${id}/portal`);
  }

  const now = new Date();

  return (
    <div className="space-y-6">
      {sp.success === "invited" && (
        <div className="flex items-center gap-3 p-4 bg-[#22c55e]/10 border border-[#22c55e]/20 rounded-xl text-[#22c55e] text-sm">
          <CheckCircle size={16} />
          Einladung erfolgreich versendet.
        </div>
      )}
      {sp.error && (
        <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
          <XCircle size={16} />
          {sp.error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Portal Users */}
        <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-5">
          <h2 className="text-[#f0f0f0] font-semibold text-sm mb-4 flex items-center gap-2">
            <UserPlus size={15} className="text-[#22c55e]" />
            Portal-Benutzer ({portalUsers.length})
          </h2>

          {portalUsers.length === 0 ? (
            <p className="text-[#555] text-sm">Noch keine Portal-Benutzer.</p>
          ) : (
            <div className="space-y-2">
              {portalUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-3 bg-[#0d0d0d] rounded-lg"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-[#f0f0f0] text-sm font-medium">
                        {user.name ?? user.email}
                      </p>
                      {user.portalRole === "CLIENT_ADMIN" && (
                        <Crown size={12} className="text-yellow-400" />
                      )}
                    </div>
                    <p className="text-[#888] text-xs">{user.email}</p>
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full border ${
                      user.portalRole === "CLIENT_ADMIN"
                        ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                        : "bg-[#22c55e]/10 text-[#22c55e] border-[#22c55e]/20"
                    }`}
                  >
                    {user.portalRole === "CLIENT_ADMIN" ? "Admin" : "Benutzer"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Invite Form */}
        <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-5">
          <h2 className="text-[#f0f0f0] font-semibold text-sm mb-4 flex items-center gap-2">
            <Mail size={15} className="text-[#22c55e]" />
            Benutzer einladen
          </h2>

          <form action={handleInvite} className="space-y-3">
            <div>
              <label className="text-[#888] text-xs block mb-1.5">E-Mail-Adresse</label>
              <input
                type="email"
                name="email"
                required
                placeholder="max.muster@unternehmen.de"
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-[#f0f0f0] text-sm placeholder-[#555] focus:outline-none focus:border-[#22c55e]/50"
              />
            </div>

            <div>
              <label className="text-[#888] text-xs block mb-1.5">Rolle</label>
              <select
                name="role"
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-sm text-[#f0f0f0] focus:outline-none focus:border-[#22c55e]/50"
              >
                <option value="CLIENT">Benutzer</option>
                <option value="CLIENT_ADMIN">Portal-Admin</option>
              </select>
            </div>

            <button
              type="submit"
              className="w-full bg-[#22c55e] hover:bg-[#16a34a] text-black font-semibold text-sm rounded-lg py-2.5 transition-colors"
            >
              Einladung versenden
            </button>
          </form>

          <p className="text-[#555] text-xs mt-3 leading-relaxed">
            Der eingeladene Benutzer erhält eine E-Mail mit einem Einladungslink (gültig 24 Stunden).
          </p>
        </div>
      </div>

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-5">
          <h2 className="text-[#f0f0f0] font-semibold text-sm mb-4 flex items-center gap-2">
            <Clock size={15} className="text-[#22c55e]" />
            Offene Einladungen
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#2a2a2a]">
                  {["E-Mail", "Rolle", "Eingeladen von", "Läuft ab", "Status", ""].map((h) => (
                    <th key={h} className="text-left text-xs text-[#888] font-medium px-3 py-2">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e1e1e]">
                {invitations.map((inv) => {
                  const expired = inv.expiresAt < now;
                  const used = !!inv.usedAt;

                  return (
                    <tr key={inv.id} className="hover:bg-[#1a1a1a] transition-colors">
                      <td className="px-3 py-3 text-sm text-[#f0f0f0]">{inv.email}</td>
                      <td className="px-3 py-3 text-sm text-[#888]">
                        {inv.role === "CLIENT_ADMIN" ? "Portal-Admin" : "Benutzer"}
                      </td>
                      <td className="px-3 py-3 text-sm text-[#888]">
                        {inv.createdBy.name ?? "—"}
                      </td>
                      <td className="px-3 py-3 text-sm text-[#888]">
                        {inv.expiresAt.toLocaleDateString("de-DE")}
                      </td>
                      <td className="px-3 py-3">
                        {used ? (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/20">
                            Akzeptiert
                          </span>
                        ) : expired ? (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
                            Abgelaufen
                          </span>
                        ) : (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                            Ausstehend
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        {!used && (
                          <form action={handleRevoke}>
                            <input type="hidden" name="invitationId" value={inv.id} />
                            <button
                              type="submit"
                              className="w-7 h-7 rounded-md flex items-center justify-center text-[#555] hover:text-red-400 hover:bg-red-500/10 transition-colors"
                            >
                              <Trash2 size={13} />
                            </button>
                          </form>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
