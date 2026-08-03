import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { InvitationForm } from "./InvitationForm";
import { XCircle, Clock } from "lucide-react";

export default async function InvitationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const invitation = await db.invitation.findUnique({
    where: { token },
    include: { company: { select: { name: true } } },
  });

  if (!invitation) notFound();

  const expired = invitation.expiresAt < new Date();
  const used = !!invitation.usedAt;

  if (used) {
    return (
      <InvitationStatus
        icon={<XCircle size={32} className="text-[#888]" />}
        title="Einladung bereits verwendet"
        message="Diese Einladung wurde bereits angenommen. Bitte melden Sie sich mit Ihren Zugangsdaten an."
        linkHref="/login"
        linkLabel="Zum Login"
      />
    );
  }

  if (expired) {
    return (
      <InvitationStatus
        icon={<Clock size={32} className="text-red-400" />}
        title="Einladung abgelaufen"
        message="Diese Einladung ist abgelaufen. Bitte wenden Sie sich an Ihren Ansprechpartner bei OKUN Systems."
        linkHref="/login"
        linkLabel="Zum Login"
      />
    );
  }

  return (
    <div className="w-full max-w-md">
      <div className="flex flex-col items-center mb-8">
        <div className="w-14 h-14 rounded-xl bg-[#00b8ff]/10 border border-[#00b8ff]/20 flex items-center justify-center mb-4">
          <span className="text-[#00b8ff] text-xl font-bold">
            {invitation.company.name.charAt(0)}
          </span>
        </div>
        <h1 className="text-xl font-bold text-[#f0f0f0] text-center">
          Willkommen bei {invitation.company.name}
        </h1>
        <p className="text-[#888] text-sm text-center mt-2">
          Erstellen Sie Ihr Konto, um auf das OKUN Kundenportal zuzugreifen.
        </p>
        <p className="text-[#555] text-xs mt-1 text-center">
          Eingeladene E-Mail: <span className="text-[#888]">{invitation.email}</span>
        </p>
      </div>

      <InvitationForm token={token} email={invitation.email} />
    </div>
  );
}

function InvitationStatus({
  icon,
  title,
  message,
  linkHref,
  linkLabel,
}: {
  icon: React.ReactNode;
  title: string;
  message: string;
  linkHref: string;
  linkLabel: string;
}) {
  return (
    <div className="w-full max-w-md">
      <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-8 flex flex-col items-center text-center">
        <div className="mb-4">{icon}</div>
        <h1 className="text-lg font-bold text-[#f0f0f0] mb-2">{title}</h1>
        <p className="text-[#888] text-sm leading-relaxed mb-6">{message}</p>
        <a
          href={linkHref}
          className="px-6 py-2.5 bg-[#00b8ff] hover:bg-[#0099d6] text-white font-semibold text-sm rounded-lg transition-colors"
        >
          {linkLabel}
        </a>
      </div>
    </div>
  );
}
