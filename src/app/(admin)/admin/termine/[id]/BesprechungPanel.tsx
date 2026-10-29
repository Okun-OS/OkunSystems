"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Check, Copy, FileText, Loader2, Mail, Target, Video } from "lucide-react";
import {
  einladungSenden,
  gastLinkHolen,
  protokollErzeugen,
  protokollFreigeben,
  protokollSetzen,
  zielSetzen,
} from "./actions";

/**
 * Die Besprechung am Termin — davor und danach.
 *
 * Davor: das Ziel. Ohne es kann im Gespräch niemand mitdenken, und das
 * Protokoll hat hinterher keinen Maßstab.
 *
 * Danach: das Protokoll. Erzeugt, von Hand korrigierbar, und erst nach
 * einer Freigabe beim Kunden. Ein Protokoll ist das Dokument, auf das sich
 * später jemand beruft — es ohne menschliche Durchsicht zuzustellen, wäre
 * die schlechteste aller Abkürzungen.
 */
export function BesprechungPanel({
  terminId,
  ziel,
  vorbereitung,
  mitschrift,
  transkriptLaenge,
  protokoll,
  protokollAm,
  freigegebenAm,
  gastLink,
  eingeladenAn,
  eingeladenAm,
}: {
  terminId: string;
  ziel: string | null;
  vorbereitung: string | null;
  mitschrift: string;
  transkriptLaenge: number;
  protokoll: string | null;
  protokollAm: string | null;
  freigegebenAm: string | null;
  /** Der bereits ausgestellte Gastlink, falls es einen gibt. */
  gastLink: string | null;
  /** Wohin eine Einladung ginge — leer, wenn keine Adresse hinterlegt ist. */
  eingeladenAn: string | null;
  eingeladenAm: string | null;
}) {
  const [pending, start] = useTransition();
  const [fehler, setzeFehler] = useState<string | null>(null);
  const [zielText, setzeZielText] = useState(ziel ?? "");
  const [protokollText, setzeProtokollText] = useState(protokoll ?? "");
  const [bearbeitet, setzeBearbeitet] = useState(false);
  const [link, setzeLink] = useState<string | null>(gastLink);
  const [kopiert, setzeKopiert] = useState(false);
  const [versandt, setzeVersandt] = useState<string | null>(null);

  function fuehreAus(fn: () => Promise<unknown>) {
    setzeFehler(null);
    start(async () => {
      const ergebnis = (await fn()) as { error?: string } | undefined;
      if (ergebnis && "error" in ergebnis && ergebnis.error) setzeFehler(ergebnis.error);
    });
  }

  const hatQuelle = transkriptLaenge > 0 || mitschrift.trim().length > 0;

  return (
    <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-5 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[#f0f0f0] font-semibold text-sm">Besprechung</h2>
        <Link
          href={`/admin/termine/${terminId}/raum`}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#00b8ff]
            text-[#041018] text-xs font-bold hover:bg-[#33c7ff] transition-colors"
        >
          <Video size={13} /> Raum betreten
        </Link>
      </div>

      {fehler && (
        <p className="px-3 py-2 rounded-lg bg-[rgba(240,80,74,.1)] border border-[rgba(240,80,74,.3)] text-[#f0504a] text-xs">
          {fehler}
        </p>
      )}

      {/* Einladung */}
      <div className="pb-4 border-b border-[#111e30]">
        <p className="text-[#888] text-xs font-medium flex items-center gap-1.5 mb-2">
          <Mail size={12} className="text-[#00b8ff]" />
          Einladung
        </p>

        {link ? (
          <div className="flex items-center gap-2">
            <code className="flex-1 min-w-0 truncate px-3 py-2 rounded-lg bg-[#060a10] border border-[#1a2840] text-[#8899b4] text-[11px]">
              {link}
            </code>
            <button
              onClick={() => {
                void navigator.clipboard?.writeText(link);
                setzeKopiert(true);
                setTimeout(() => setzeKopiert(false), 2000);
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#1a2840]
                text-[#8899b4] text-xs hover:text-[#dce9f6] transition-colors flex-shrink-0"
            >
              {kopiert ? <Check size={12} /> : <Copy size={12} />}
              {kopiert ? "Kopiert" : "Kopieren"}
            </button>
          </div>
        ) : (
          <p className="text-[#555] text-xs">
            Noch kein Link ausgestellt.
          </p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            onClick={() =>
              fuehreAus(async () => {
                const r = await einladungSenden(terminId);
                if (r && "link" in r && r.link) setzeLink(r.link);
                if (r && "gesendetAn" in r && r.gesendetAn) setzeVersandt(r.gesendetAn);
                return r;
              })
            }
            disabled={pending}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#101c2e]
              border border-[#1a2840] text-[#c9d4e4] text-xs font-medium
              hover:border-[rgba(0,184,255,.4)] disabled:opacity-50 transition-colors"
          >
            {pending ? <Loader2 size={12} className="animate-spin" /> : <Mail size={12} />}
            {eingeladenAm ? "Einladung erneut senden" : "Einladung senden"}
          </button>

          {!link && (
            <button
              onClick={() =>
                fuehreAus(async () => {
                  const r = await gastLinkHolen(terminId);
                  if (r && "link" in r && r.link) setzeLink(r.link);
                  return r;
                })
              }
              disabled={pending}
              className="px-3.5 py-2 rounded-lg border border-[#1a2840] text-[#8899b4]
                text-xs hover:text-[#dce9f6] disabled:opacity-50 transition-colors"
            >
              Nur Link erzeugen
            </button>
          )}
        </div>

        <p className="mt-2 text-[#5b6b7f] text-[11px] leading-relaxed">
          {versandt
            ? `Gesendet an ${versandt}.`
            : eingeladenAm
              ? `Zuletzt verschickt am ${new Date(eingeladenAm).toLocaleString("de-DE")}${eingeladenAn ? ` an ${eingeladenAn}` : ""}.`
              : eingeladenAn
                ? `Geht an ${eingeladenAn}. Der Gast braucht kein Konto — der Link führt in unseren Raum, nicht zum Videoanbieter.`
                : "Keine E-Mail-Adresse hinterlegt — Link kopieren und selbst verschicken."}
        </p>
      </div>

      {/* Ziel */}
      <div>
        <p className="text-[#888] text-xs font-medium flex items-center gap-1.5 mb-2">
          <Target size={12} className="text-[#00b8ff]" />
          Was wollen Sie erreichen?
        </p>
        <textarea
          value={zielText}
          onChange={(e) => setzeZielText(e.target.value)}
          rows={3}
          placeholder="Ein, zwei Sätze. Daraus entsteht die Vorbereitung — und der Maßstab fürs Protokoll."
          className="w-full px-3 py-2.5 rounded-lg bg-[#060a10] border border-[#1a2840]
            text-[#f0f0f0] text-sm placeholder-[#444] resize-none
            focus:outline-none focus:border-[#00b8ff]/50"
        />
        <button
          onClick={() => fuehreAus(() => zielSetzen(terminId, zielText))}
          disabled={pending || zielText.trim() === (ziel ?? "")}
          className="mt-2 px-3.5 py-2 rounded-lg bg-[#101c2e] border border-[#1a2840]
            text-[#c9d4e4] text-xs font-medium hover:border-[rgba(0,184,255,.4)]
            disabled:opacity-40 transition-colors"
        >
          {pending ? "…" : ziel ? "Ziel ändern" : "Ziel festlegen und vorbereiten"}
        </button>

        {vorbereitung && (
          <div className="mt-3 px-4 py-3 rounded-lg bg-[#0a121c] border border-[#1a2840]">
            <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#3f5572] mb-1.5">
              Vorbereitung
            </p>
            <p className="text-[#c9d4e4] text-xs leading-relaxed whitespace-pre-wrap">
              {vorbereitung}
            </p>
          </div>
        )}
      </div>

      {/* Protokoll */}
      <div className="pt-4 border-t border-[#111e30]">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <p className="text-[#888] text-xs font-medium flex items-center gap-1.5">
            <FileText size={12} className="text-[#00b8ff]" />
            Protokoll
          </p>
          {freigegebenAm && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#2ee6c5]/10 border border-[#2ee6c5]/25 text-[#2ee6c5]">
              für den Kunden freigegeben
            </span>
          )}
        </div>

        <p className="text-[#555] text-[11px] leading-relaxed mb-3">
          {transkriptLaenge > 0
            ? `${transkriptLaenge} Zeichen mitgehört`
            : "Nichts mitgehört"}
          {mitschrift.trim() ? ` · ${mitschrift.trim().split("\n").length} Stichpunkte` : " · keine Stichpunkte"}
        </p>

        {protokoll && !bearbeitet ? (
          <div className="px-4 py-3 rounded-lg bg-[#0a121c] border border-[#1a2840]">
            <p className="text-[#dce9f6] text-[12.5px] leading-relaxed whitespace-pre-wrap">
              {protokoll}
            </p>
            {protokollAm && (
              <p className="mt-2 text-[#444] text-[10px]">
                Erzeugt am {new Date(protokollAm).toLocaleString("de-DE")}
              </p>
            )}
          </div>
        ) : bearbeitet ? (
          <textarea
            value={protokollText}
            onChange={(e) => setzeProtokollText(e.target.value)}
            rows={14}
            className="w-full px-3 py-2.5 rounded-lg bg-[#060a10] border border-[#1a2840]
              text-[#f0f0f0] text-[12.5px] leading-relaxed resize-y
              focus:outline-none focus:border-[#00b8ff]/50"
          />
        ) : (
          <p className="text-[#555] text-xs">
            {hatQuelle
              ? "Noch kein Protokoll erzeugt."
              : "Es liegt nichts vor, woraus sich eines schreiben ließe."}
          </p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            onClick={() => fuehreAus(() => protokollErzeugen(terminId))}
            disabled={pending || !hatQuelle}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#00b8ff]
              text-[#041018] text-xs font-bold disabled:bg-[#16283d] disabled:text-[#4a5a70]
              transition-colors"
          >
            {pending ? <Loader2 size={12} className="animate-spin" /> : <FileText size={12} />}
            {protokoll ? "Neu erzeugen" : "Protokoll erzeugen"}
          </button>

          {protokoll && !bearbeitet && (
            <button
              onClick={() => {
                setzeProtokollText(protokoll);
                setzeBearbeitet(true);
              }}
              disabled={pending}
              className="px-3.5 py-2 rounded-lg border border-[#1a2840] text-[#8899b4]
                text-xs hover:text-[#dce9f6] disabled:opacity-50 transition-colors"
            >
              Bearbeiten
            </button>
          )}

          {bearbeitet && (
            <button
              onClick={() =>
                fuehreAus(async () => {
                  const r = await protokollSetzen(terminId, protokollText);
                  setzeBearbeitet(false);
                  return r;
                })
              }
              disabled={pending}
              className="px-3.5 py-2 rounded-lg bg-[#101c2e] border border-[#1a2840]
                text-[#c9d4e4] text-xs disabled:opacity-50 transition-colors"
            >
              Speichern
            </button>
          )}

          {protokoll && (
            <button
              onClick={() => fuehreAus(() => protokollFreigeben(terminId, !freigegebenAm))}
              disabled={pending}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium
                disabled:opacity-50 transition-colors ${
                  freigegebenAm
                    ? "border border-[#1a2840] text-[#8899b4] hover:text-[#f0504a]"
                    : "bg-[rgba(46,230,197,.12)] border border-[rgba(46,230,197,.35)] text-[#2ee6c5]"
                }`}
            >
              <Check size={12} />
              {freigegebenAm ? "Freigabe zurücknehmen" : "Für den Kunden freigeben"}
            </button>
          )}
        </div>

        {protokoll && !freigegebenAm && (
          <p className="mt-2 text-[#5b6b7f] text-[11px] leading-relaxed">
            Der Kunde sieht nichts, bis Sie freigeben. In einem Protokoll steht, was
            vereinbart wurde — das liest besser ein Mensch gegen.
          </p>
        )}
      </div>
    </div>
  );
}
