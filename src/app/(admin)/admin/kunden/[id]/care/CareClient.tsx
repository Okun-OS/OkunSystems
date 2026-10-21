"use client";

import { useState, useTransition } from "react";
import { Eye, EyeOff, Plus, Trash2, HeartHandshake } from "lucide-react";
import { CARE_ARTEN, careArtLabel, type CareStand } from "@/lib/care/katalog";
import { careStatusSetzen, leistungErfassen, leistungLoeschen, leistungSichtbarkeit } from "./actions";

/**
 * Das Protokoll führen.
 *
 * Eine Zeile soll in zwanzig Sekunden geschrieben sein, sonst wird sie nicht
 * geschrieben. Deshalb steht das Formular oben, hat einen vorbelegten Tag und
 * verlangt außer dem Titel nichts.
 */
export function CareClient({
  company,
  stand,
}: {
  company: { id: string; name: string };
  stand: CareStand;
}) {
  const [pending, start] = useTransition();
  const [fehler, setzeFehler] = useState<string | null>(null);

  function fuehreAus(fn: () => Promise<unknown>) {
    setzeFehler(null);
    start(async () => {
      const ergebnis = (await fn()) as { error?: string } | undefined;
      if (ergebnis && "error" in ergebnis && ergebnis.error) setzeFehler(ergebnis.error);
    });
  }

  const heute = new Date();
  const heuteFeld = `${heute.getFullYear()}-${String(heute.getMonth() + 1).padStart(2, "0")}-${String(
    heute.getDate()
  ).padStart(2, "0")}`;

  return (
    <div className="space-y-5">
      {fehler && (
        <p className="px-4 py-3 rounded-xl bg-[rgba(240,80,74,.1)] border border-[rgba(240,80,74,.3)] text-[#f0504a] text-xs">
          {fehler}
        </p>
      )}

      {/* Abo-Stand */}
      <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#00b8ff]/10 border border-[#00b8ff]/20 flex items-center justify-center flex-shrink-0">
              <HeartHandshake size={18} className="text-[#00b8ff]" />
            </div>
            <div>
              <p className="text-[#f0f0f0] font-semibold text-sm">OKUN Care</p>
              <p className="text-[#888] text-xs mt-0.5">
                {stand.aktiv
                  ? stand.seit
                    ? `Aktiv seit ${stand.seit.toLocaleDateString("de-DE")}`
                    : "Aktiv"
                  : stand.status === "cancelled"
                    ? "Gekündigt"
                    : "Nicht gebucht"}
                {stand.hatZahlungsdaten ? " · über Stripe" : " · ohne Stripe-Zahlung"}
              </p>
            </div>
          </div>
          <button
            onClick={() =>
              fuehreAus(() => careStatusSetzen(company.id, stand.aktiv ? "inactive" : "active"))
            }
            disabled={pending}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold disabled:opacity-50 transition-colors ${
              stand.aktiv
                ? "border border-[#1a2840] text-[#8899b4] hover:text-[#f0504a] hover:border-[rgba(240,80,74,.4)]"
                : "bg-[#00b8ff] text-[#041018] hover:bg-[#33c7ff]"
            }`}
          >
            {stand.aktiv ? "Care beenden" : "Care von Hand aktivieren"}
          </button>
        </div>
        {/*
          Von Hand gesetzt heißt: ohne Zahlung. Das muss dastehen, sonst
          wundert sich in drei Monaten jemand über eine Betreuung, zu der es
          keine Rechnung gibt.
        */}
        <p className="mt-3 text-[#555] text-[11px] leading-relaxed">
          Von Hand gesetzt wirkt nur im Portal — es löst keine Zahlung aus und ändert
          nichts bei Stripe. Für Betriebe, die auf Rechnung zahlen, und für Vorführungen.
        </p>
      </div>

      {/* Neue Zeile */}
      <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-5">
        <h2 className="text-[#f0f0f0] font-semibold text-sm mb-4 flex items-center gap-2">
          <Plus size={15} className="text-[#00b8ff]" />
          Leistung erfassen
        </h2>
        <form
          action={(formular) => fuehreAus(() => leistungErfassen(company.id, formular))}
          className="grid grid-cols-2 gap-3"
        >
          <div className="col-span-2">
            <label className="block text-xs font-medium text-[#888] mb-1.5">
              Was haben wir gemacht? *
            </label>
            <input
              name="titel"
              required
              placeholder="Angebots-PDF wird jetzt automatisch verschickt"
              className="w-full bg-[#060a10] border border-[#1a2840] rounded-lg px-3 py-2.5 text-[#f0f0f0] text-sm placeholder-[#444] focus:outline-none focus:border-[#00b8ff]/50"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#888] mb-1.5">Art</label>
            <select
              name="art"
              defaultValue="automatisierung"
              className="w-full bg-[#060a10] border border-[#1a2840] rounded-lg px-3 py-2.5 text-[#f0f0f0] text-sm focus:outline-none focus:border-[#00b8ff]/50"
            >
              {CARE_ARTEN.map((a) => (
                <option key={a.key} value={a.key}>
                  {a.label}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-[#888] mb-1.5">Am</label>
              <input
                name="erledigtAm"
                type="date"
                defaultValue={heuteFeld}
                className="w-full bg-[#060a10] border border-[#1a2840] rounded-lg px-3 py-2.5 text-[#f0f0f0] text-sm focus:outline-none focus:border-[#00b8ff]/50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#888] mb-1.5">
                Minuten
                <span className="text-[#444]"> (intern)</span>
              </label>
              <input
                name="minuten"
                type="number"
                min={0}
                placeholder="—"
                className="w-full bg-[#060a10] border border-[#1a2840] rounded-lg px-3 py-2.5 text-[#f0f0f0] text-sm placeholder-[#444] focus:outline-none focus:border-[#00b8ff]/50"
              />
            </div>
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-[#888] mb-1.5">
              Ein Satz dazu (optional)
            </label>
            <textarea
              name="beschreibung"
              rows={2}
              placeholder="Was der Kunde davon merkt — in seiner Sprache, nicht in unserer."
              className="w-full bg-[#060a10] border border-[#1a2840] rounded-lg px-3 py-2.5 text-[#f0f0f0] text-sm placeholder-[#444] focus:outline-none focus:border-[#00b8ff]/50 resize-none"
            />
          </div>
          <div className="col-span-2 flex items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-xs text-[#888] cursor-pointer">
              <input
                type="checkbox"
                name="kundeSieht"
                value="ja"
                defaultChecked
                className="accent-[#00b8ff]"
              />
              Der Kunde sieht diese Zeile
            </label>
            <button
              type="submit"
              disabled={pending}
              className="px-4 py-2.5 rounded-lg bg-[#00b8ff] text-[#041018] text-xs font-bold disabled:opacity-50 transition-opacity"
            >
              {pending ? "…" : "Eintragen"}
            </button>
          </div>
        </form>
      </div>

      {/* Protokoll */}
      <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-5">
        <h2 className="text-[#f0f0f0] font-semibold text-sm mb-4">
          Protokoll
          <span className="text-[#555] font-normal"> · {stand.leistungen.length} Zeilen</span>
        </h2>
        {stand.leistungen.length === 0 ? (
          <p className="text-[#555] text-xs">
            Noch nichts erfasst. Was hier steht, liest der Kunde auf seiner Care-Seite.
          </p>
        ) : (
          <ul className="space-y-2">
            {stand.leistungen.map((l) => (
              <li
                key={l.id}
                className={`flex items-start gap-3 px-4 py-3 rounded-lg border ${
                  l.kundeSieht
                    ? "border-[#1a2840] bg-[#0a121c]"
                    : "border-[#16263d] bg-transparent opacity-60"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#101c2e] border border-[#1a2840] text-[#8899b4]">
                      {careArtLabel(l.art)}
                    </span>
                    <span className="text-[#555] text-xs">
                      {l.erledigtAm.toLocaleDateString("de-DE")}
                    </span>
                    {l.minuten !== null && (
                      <span className="text-[#555] text-xs">{l.minuten} min</span>
                    )}
                    {l.erfasstVon && (
                      <span className="text-[#444] text-xs">· {l.erfasstVon}</span>
                    )}
                  </div>
                  <p className="text-[#f0f0f0] text-sm font-medium mt-1">{l.titel}</p>
                  {l.beschreibung && (
                    <p className="text-[#888] text-xs mt-0.5 leading-relaxed">
                      {l.beschreibung}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() =>
                      fuehreAus(() =>
                        leistungSichtbarkeit(company.id, l.id, !l.kundeSieht)
                      )
                    }
                    disabled={pending}
                    title={l.kundeSieht ? "Für den Kunden verbergen" : "Dem Kunden zeigen"}
                    className="p-1.5 rounded-md text-[#5b6b7f] hover:text-[#dce9f6] hover:bg-white/[0.05] disabled:opacity-50 transition-colors"
                  >
                    {l.kundeSieht ? <Eye size={14} /> : <EyeOff size={14} />}
                  </button>
                  <button
                    onClick={() => fuehreAus(() => leistungLoeschen(company.id, l.id))}
                    disabled={pending}
                    title="Zeile löschen"
                    className="p-1.5 rounded-md text-[#5b6b7f] hover:text-[#f0504a] hover:bg-white/[0.05] disabled:opacity-50 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
