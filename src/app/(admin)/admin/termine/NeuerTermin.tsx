"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus, Loader2, Plus, X } from "lucide-react";
import { STANDARD_ART, waehlbareArten } from "@/lib/termine/arten";
import { darfOhneKunden } from "@/lib/termine/gegenueber";
import { terminAnlegen } from "./actions";

/**
 * Einen Termin anlegen, direkt in der Übersicht.
 *
 * Zugeklappt, bis jemand ihn braucht: Die Liste ist das, wofür man die Seite
 * öffnet. Aufgeklappt fragt er genau zwei Dinge mehr als vorher — welche Art,
 * und mit wem.
 */
export function NeuerTermin({
  kunden,
}: {
  kunden: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [offen, setzeOffen] = useState(false);
  const [pending, start] = useTransition();
  const [fehler, setzeFehler] = useState<string | null>(null);

  const arten = useMemo(() => waehlbareArten(), []);
  const [art, setzeArt] = useState(STANDARD_ART);
  const [mitKunde, setzeMitKunde] = useState(kunden.length > 0);
  const [companyId, setzeCompanyId] = useState(kunden[0]?.id ?? "");
  const [gastName, setzeGastName] = useState("");
  const [gastEmail, setzeGastEmail] = useState("");
  const [titel, setzeTitel] = useState("Besprechung");
  const [datum, setzeDatum] = useState("");
  const [von, setzeVon] = useState("10:00");
  const [bis, setzeBis] = useState("11:00");
  const [notizen, setzeNotizen] = useState("");

  const gewaehlt = arten.find((a) => a.key === art) ?? arten[0];
  const ohneKundenMoeglich = darfOhneKunden(art);

  /*
    Die Art kann die Wahl erzwingen.

    Wer „Strategiegespräch" wählt, während „noch kein Kunde" aktiv ist,
    bekommt den Hinweis sofort — nicht erst nach dem Absenden.
  */
  function waehleArt(key: string) {
    setzeArt(key);
    if (!darfOhneKunden(key) && kunden.length > 0) setzeMitKunde(true);
  }

  function anlegen() {
    setzeFehler(null);
    start(async () => {
      const ergebnis = await terminAnlegen({
        art,
        titel,
        companyId: mitKunde ? companyId : "",
        gastName: mitKunde ? "" : gastName,
        gastEmail: mitKunde ? "" : gastEmail,
        datum,
        von,
        bis,
        notizen,
      });
      if (ergebnis && "error" in ergebnis && ergebnis.error) {
        setzeFehler(ergebnis.error);
        return;
      }
      if (ergebnis && "terminId" in ergebnis && ergebnis.terminId) {
        // Direkt in den Termin: dort wird das Ziel gesetzt und der Raum betreten.
        router.push(`/admin/termine/${ergebnis.terminId}`);
      }
    });
  }

  if (!offen) {
    return (
      <button
        onClick={() => setzeOffen(true)}
        className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#00b8ff]
          text-[#041018] text-sm font-bold hover:bg-[#33c7ff] transition-colors"
      >
        <Plus size={15} /> Termin anlegen
      </button>
    );
  }

  const feld =
    "w-full bg-[#060a10] border border-[#1a2840] rounded-lg px-3 py-2.5 " +
    "text-[#f0f0f0] text-sm placeholder-[#555] focus:outline-none focus:border-[#00b8ff]/50";
  const beschriftung = "block text-xs font-medium text-[#888] mb-1.5";

  return (
    <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-5 mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[#f0f0f0] font-semibold text-sm flex items-center gap-2">
          <CalendarPlus size={15} className="text-[#00b8ff]" />
          Neuen Termin anlegen
        </h2>
        <button
          onClick={() => setzeOffen(false)}
          className="text-[#555] hover:text-[#f0f0f0] transition-colors"
          aria-label="Schließen"
        >
          <X size={16} />
        </button>
      </div>

      {fehler && (
        <p className="mb-4 px-3 py-2 rounded-lg bg-[rgba(240,80,74,.1)] border border-[rgba(240,80,74,.3)] text-[#f0504a] text-xs">
          {fehler}
        </p>
      )}

      <div className="grid md:grid-cols-2 gap-3">
        <div>
          <label className={beschriftung}>Art *</label>
          <select
            value={art}
            onChange={(e) => waehleArt(e.target.value)}
            className={feld}
          >
            {arten.map((a) => (
              <option key={a.key} value={a.key}>
                {a.label}
              </option>
            ))}
          </select>
          {gewaehlt && (
            <p className="text-[#555] text-[11px] mt-1.5 leading-relaxed">{gewaehlt.hinweis}</p>
          )}
        </div>

        <div>
          <label className={beschriftung}>Titel *</label>
          <input
            value={titel}
            onChange={(e) => setzeTitel(e.target.value)}
            placeholder="Worum geht es?"
            className={feld}
          />
          <p className="text-[#555] text-[11px] mt-1.5">
            Steht im Raum, im Protokoll und beim Kunden im Portal.
          </p>
        </div>

        {/* Mit wem */}
        <div className="md:col-span-2">
          <label className={beschriftung}>Mit wem? *</label>
          <div className="flex gap-2 mb-2">
            <Umschalter
              aktiv={mitKunde}
              aus={kunden.length === 0}
              onClick={() => setzeMitKunde(true)}
            >
              Kunde
            </Umschalter>
            <Umschalter
              aktiv={!mitKunde}
              aus={!ohneKundenMoeglich}
              onClick={() => setzeMitKunde(false)}
            >
              Noch kein Kunde
            </Umschalter>
          </div>

          {mitKunde ? (
            kunden.length > 0 ? (
              <select
                value={companyId}
                onChange={(e) => setzeCompanyId(e.target.value)}
                className={feld}
              >
                {kunden.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.name}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-[#555] text-xs">Es gibt noch keine Kunden.</p>
            )
          ) : (
            <div className="grid md:grid-cols-2 gap-3">
              <input
                value={gastName}
                onChange={(e) => setzeGastName(e.target.value)}
                placeholder="Name oder Betrieb, z. B. Feuerwehr Freiburg"
                className={feld}
              />
              <input
                value={gastEmail}
                onChange={(e) => setzeGastEmail(e.target.value)}
                type="email"
                placeholder="E-Mail (optional)"
                className={feld}
              />
            </div>
          )}

          {!ohneKundenMoeglich && (
            <p className="text-[#555] text-[11px] mt-1.5 leading-relaxed">
              {gewaehlt?.label} braucht einen Betrieb aus der Liste — dafür werden
              Blueprint und Stammdaten gelesen.
            </p>
          )}
        </div>

        <div>
          <label className={beschriftung}>Datum *</label>
          <input
            value={datum}
            onChange={(e) => setzeDatum(e.target.value)}
            type="date"
            className={feld}
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={beschriftung}>Von *</label>
            <input
              value={von}
              onChange={(e) => setzeVon(e.target.value)}
              type="time"
              className={feld}
            />
          </div>
          <div>
            <label className={beschriftung}>Bis *</label>
            <input
              value={bis}
              onChange={(e) => setzeBis(e.target.value)}
              type="time"
              className={feld}
            />
          </div>
        </div>

        <div className="md:col-span-2">
          <label className={beschriftung}>Notizen (optional)</label>
          <textarea
            value={notizen}
            onChange={(e) => setzeNotizen(e.target.value)}
            rows={2}
            placeholder="Interne Notizen zum Termin…"
            className={`${feld} resize-none`}
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          onClick={anlegen}
          disabled={pending}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#00b8ff]
            text-[#041018] text-sm font-bold disabled:bg-[#16283d] disabled:text-[#4a5a70]
            transition-colors"
        >
          {pending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
          Anlegen und öffnen
        </button>
        <p className="text-[#555] text-[11px]">
          Alle Zeiten in deutscher Ortszeit. Der Videoraum entsteht beim Betreten.
        </p>
      </div>
    </div>
  );
}

function Umschalter({
  aktiv,
  aus,
  onClick,
  children,
}: {
  aktiv: boolean;
  aus: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={aus}
      className={`px-3.5 py-2 rounded-lg text-xs font-medium border transition-colors ${
        aktiv
          ? "bg-[rgba(0,184,255,.12)] border-[rgba(0,184,255,.4)] text-[#00b8ff]"
          : "bg-[#060a10] border-[#1a2840] text-[#8899b4] hover:text-[#dce9f6]"
      } disabled:opacity-30 disabled:cursor-not-allowed`}
    >
      {children}
    </button>
  );
}
