import { gastSicht } from "@/lib/termine/gastzugang";
import { ensureAppointmentRoom } from "@/lib/daily";
import { formatiereBerlin } from "@/lib/zeit";
import { OkunLogo } from "@/components/layout/okun-logo";
import { GastRaum } from "./GastRaum";

/**
 * Die Besprechung, von außen betreten.
 *
 * Ein Gast hat kein Konto bei uns. Trotzdem soll er nicht auf der
 * Oberfläche unseres Videoanbieters landen: Dort steht unser Name nirgends,
 * und das Gespräch sieht aus wie das Produkt einer fremden Firma. Hier steht
 * dasselbe Haus wie beim Kunden — nur ohne alles, was ihn nichts angeht.
 */
export default async function GastSeite({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const sicht = await gastSicht(token);

  if (!sicht) {
    return (
      <Hinweis
        titel="Dieser Link führt nirgendwo hin"
        text="Bitte prüfen Sie, ob Sie die vollständige Adresse aus Ihrer Einladung verwendet haben."
      />
    );
  }
  if (sicht.abgesagt) {
    return (
      <Hinweis
        titel="Der Termin wurde abgesagt"
        text="Wenn das ein Versehen ist, melden Sie sich gern — wir finden einen neuen."
      />
    );
  }
  if (sicht.vorbei) {
    return (
      <Hinweis
        titel="Dieses Gespräch ist vorbei"
        text="Der Zugang gilt bis kurz nach dem Termin. Für ein neues Gespräch bekommen Sie einen neuen Link."
      />
    );
  }

  const raum = await ensureAppointmentRoom(sicht.terminId);

  return (
    <div className="min-h-screen bg-[#04080f] flex items-center justify-center p-6">
      <div className="w-full max-w-[460px]">
        {/*
          Feste Breite um das Logo.

          Es skaliert auf 100 % seines Containers und wird oben beschnitten —
          ohne Begrenzung füllt es die ganze Kartenbreite und man sieht nur
          noch einen Streifen davon.
        */}
        <div className="flex justify-center mb-9">
          <div className="w-[176px]">
            <OkunLogo size="sm" />
          </div>
        </div>

        <div className="bg-[#0a121c] border border-[#16263d] rounded-2xl p-7">
          <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#3f5572]">
            Besprechung
          </p>
          <h1 className="text-[#f0f0f0] text-lg font-bold mt-1.5">{sicht.titel}</h1>
          <p className="text-[#8899b4] text-sm mt-2">
            {formatiereBerlin(sicht.beginn, {
              weekday: "long", day: "2-digit", month: "long",
              hour: "2-digit", minute: "2-digit",
            })}
            {" – "}
            {formatiereBerlin(sicht.ende, { hour: "2-digit", minute: "2-digit" })} Uhr
          </p>

          <div className="mt-6">
            {raum.ok ? (
              <GastRaum
                raumUrl={raum.url}
                titel={sicht.titel}
                vorschlag={sicht.gastName ?? ""}
              />
            ) : (
              <p className="text-[#5b6b7f] text-xs leading-relaxed">
                Der Raum steht noch nicht bereit. Versuchen Sie es kurz vor dem Termin
                noch einmal — er wird erst dann geöffnet.
              </p>
            )}
          </div>
        </div>

        <p className="mt-6 text-center text-[11px] text-[#3f5572] leading-relaxed">
          Sie brauchen kein Konto und keine Installation. Das Gespräch läuft im Browser.
          <br />
          Fragen? <a href="mailto:info@okun-systems.com" className="hover:text-[#8899b4] transition-colors">info@okun-systems.com</a>
        </p>
      </div>
    </div>
  );
}

function Hinweis({ titel, text }: { titel: string; text: string }) {
  return (
    <div className="min-h-screen bg-[#04080f] flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <div className="flex justify-center mb-8">
          <div className="w-[176px]">
            <OkunLogo size="sm" />
          </div>
        </div>
        <h1 className="text-xl font-bold text-[#eef2f7] mb-3">{titel}</h1>
        <p className="text-[#8899b4] text-sm leading-relaxed">{text}</p>
        <p className="mt-6 text-xs text-[#4a5a70]">
          <a href="mailto:info@okun-systems.com" className="hover:text-[#8899b4] transition-colors">
            info@okun-systems.com
          </a>
        </p>
      </div>
    </div>
  );
}
