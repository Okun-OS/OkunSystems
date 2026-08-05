import { db } from "@/lib/db";
import { createHash } from "crypto";
import { notFound } from "next/navigation";

export default async function ClosingClientPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const tokenHash = createHash("sha256").update(token).digest("hex");
  const closingSession = await db.closingSession.findUnique({
    where: { clientTokenHash: tokenHash },
    include: {
      company: { select: { name: true } },
    },
  });

  if (!closingSession) notFound();

  if (new Date() > closingSession.tokenExpiresAt) {
    return (
      <div className="min-h-screen bg-[#080d14] flex items-center justify-center">
        <div className="max-w-md mx-auto text-center px-6">
          <div className="text-[#ef4444] text-4xl mb-4">⏱</div>
          <h1 className="text-xl font-bold text-[#f0f0f0] mb-2">Link abgelaufen</h1>
          <p className="text-[#888] text-sm">
            Dieser Einladungslink ist nicht mehr gültig. Bitte kontaktieren Sie uns.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080d14] flex items-center justify-center">
      <div className="max-w-md mx-auto text-center px-6">
        <div className="text-[#00b8ff] text-4xl mb-4">🤝</div>
        <h1 className="text-xl font-bold text-[#f0f0f0] mb-2">
          Willkommen, {closingSession.company.name}
        </h1>
        <p className="text-[#888] text-sm">
          Ihr Closing-Gespräch wird vorbereitet. Phase 2 implementiert die vollständige Kunden-Oberfläche.
        </p>
        <div className="mt-6 text-xs text-[#555] font-mono">
          Session: {closingSession.id.slice(0, 8)}… · Status: {closingSession.status}
        </div>
      </div>
    </div>
  );
}
