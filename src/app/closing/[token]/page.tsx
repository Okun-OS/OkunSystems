import { verifyClosingToken } from "@/lib/closing/token";
import { buildClientClosingState } from "@/lib/closing/client-view";
import { ClosingClientView } from "./ClosingClientView";
import { OkunLogo } from "@/components/layout/okun-logo";

const REASON_TEXT: Record<string, { title: string; body: string }> = {
  expired: {
    title: "Link abgelaufen",
    body: "Dieser Zugang ist nicht mehr gültig. Bitte kontaktieren Sie Ihren Berater, um einen neuen Link zu erhalten.",
  },
  revoked: {
    title: "Zugang widerrufen",
    body: "Dieser Zugang wurde widerrufen. Bitte kontaktieren Sie Ihren Berater.",
  },
  not_found: {
    title: "Link ungültig",
    body: "Dieser Link ist uns nicht bekannt. Bitte prüfen Sie, ob Sie die vollständige Adresse aus Ihrer Einladung verwendet haben.",
  },
};

export default async function ClosingClientPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const validation = await verifyClosingToken(token);

  if (!validation.ok) {
    const text = REASON_TEXT[validation.reason] ?? REASON_TEXT.not_found;
    return (
      <div className="min-h-screen bg-[#080c14] flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <div className="flex justify-center mb-8">
            <OkunLogo size="sm" />
          </div>
          <h1 className="text-xl font-bold text-[#eef2f7] mb-3">{text.title}</h1>
          <p className="text-[#8899b4] text-sm leading-relaxed">{text.body}</p>
          <p className="mt-6 text-xs text-[#4a5a70]">
            <a
              href="mailto:info@okun-systems.de"
              className="hover:text-[#8899b4] transition-colors"
            >
              info@okun-systems.de
            </a>
          </p>
        </div>
      </div>
    );
  }

  const state = await buildClientClosingState(validation.closingSessionId);
  if (!state) {
    return (
      <div className="min-h-screen bg-[#080c14] flex items-center justify-center p-6">
        <p className="text-[#8899b4] text-sm">Dieser Vorgang ist nicht mehr verfügbar.</p>
      </div>
    );
  }

  return <ClosingClientView initialState={state} token={token} />;
}
