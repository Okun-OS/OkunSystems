import { db } from "@/lib/db";
import { createHash } from "crypto";
import { notFound } from "next/navigation";
import { ClosingClientView } from "./ClosingClientView";

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
      closer: { select: { name: true } },
      appointment: {
        select: { startTime: true, endTime: true, bookedByName: true },
      },
      consentRecords: {
        select: {
          id: true,
          legalDocumentId: true,
          consentType: true,
          agreementAt: true,
        },
        orderBy: { agreementAt: "asc" },
      },
    },
  });

  if (!closingSession) notFound();

  if (new Date() > closingSession.tokenExpiresAt) {
    return (
      <div className="min-h-screen bg-[#080d14] flex items-center justify-center p-6">
        <div className="max-w-md mx-auto text-center">
          <div className="text-5xl mb-6">⏱</div>
          <h1 className="text-xl font-bold text-[#f0f0f0] mb-3">Link abgelaufen</h1>
          <p className="text-[#666] text-sm leading-relaxed">
            Dieser Einladungslink ist nicht mehr gültig. Bitte kontaktieren Sie Ihren Berater,
            um einen neuen Link zu erhalten.
          </p>
          <p className="mt-4 text-xs text-[#444]">
            <a href="mailto:info@okun-systems.de" className="hover:text-[#666] transition-colors">
              info@okun-systems.de
            </a>
          </p>
        </div>
      </div>
    );
  }

  const [activeOffer, legalDocuments] = await Promise.all([
    closingSession.activeOfferId
      ? db.offer.findUnique({
          where: { id: closingSession.activeOfferId },
          select: {
            id: true,
            priceNet: true,
            currency: true,
            validUntil: true,
            status: true,
            acceptedAt: true,
            template: { select: { name: true, description: true } },
          },
        })
      : Promise.resolve(null),
    db.legalDocument.findMany({
      where: { isActive: true },
      select: { id: true, title: true, type: true, version: true, isRequired: true },
      orderBy: { isRequired: "desc" },
    }),
  ]);

  const sessionData = {
    id: closingSession.id,
    status: closingSession.status,
    company: closingSession.company,
    closer: closingSession.closer,
    appointment: closingSession.appointment,
    activeOffer: activeOffer ?? null,
    legalDocuments,
    consentRecords: closingSession.consentRecords,
  };

  return <ClosingClientView session={sessionData} token={token} />;
}
