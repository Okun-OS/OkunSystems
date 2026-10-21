"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Check, ChevronRight, Loader2 } from "lucide-react";
import { fortschritt, naechsterSchritt, type Schritt } from "@/lib/onboarding/checkliste";
import { schrittAbhaken } from "./actions";

/**
 * Der Weg, als Liste.
 *
 * Sie steht oben auf dem Dashboard, solange noch etwas offen ist, und
 * verschwindet, wenn alles erledigt ist — eine vollständig abgehakte Liste
 * ist kein Inhalt, sondern Platzverschwendung auf der Seite, die der Kunde
 * täglich sieht.
 */
export function OnboardingCheckliste({ schritte }: { schritte: Schritt[] }) {
  const [pending, start] = useTransition();
  const [fehler, setzeFehler] = useState<string | null>(null);

  const stand = fortschritt(schritte);
  if (stand.erledigt === stand.gesamt) return null;

  const naechster = naechsterSchritt(schritte);

  function umschalten(schritt: Schritt) {
    if (!schritt.abhakbar) return;
    setzeFehler(null);
    start(async () => {
      const ergebnis = (await schrittAbhaken(schritt.schluessel, !schritt.erledigt)) as
        | { error?: string }
        | undefined;
      if (ergebnis && "error" in ergebnis && ergebnis.error) setzeFehler(ergebnis.error);
    });
  }

  return (
    <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-5 mb-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
        <h2 className="text-[#f0f0f0] font-semibold text-sm">Ihre ersten Schritte</h2>
        <span className="font-mono text-xs text-[#8899b4]">
          {stand.erledigt} / {stand.gesamt}
        </span>
      </div>
      {naechster && (
        <p className="text-[#888] text-xs leading-relaxed">
          Als Nächstes: <span className="text-[#c9d4e4]">{naechster.titel}</span>
        </p>
      )}

      <div className="mt-3 h-1 bg-[#111e30] rounded-full overflow-hidden">
        <div
          className="h-full bg-[#00b8ff] rounded-full transition-[width] duration-500"
          style={{ width: `${stand.prozent}%` }}
        />
      </div>

      {fehler && <p className="mt-3 text-[#f0504a] text-xs">{fehler}</p>}

      <ul className="mt-4 space-y-1">
        {schritte.map((s) => (
          <li
            key={s.schluessel}
            className={`flex items-start gap-3 px-2 py-2 rounded-lg transition-colors ${
              s.erledigt ? "opacity-55" : "hover:bg-white/[0.02]"
            }`}
          >
            {/*
              Nur die selbst gesetzten Haken sind Knöpfe. Ein Kreis, der
              aussieht wie ein Knopf und auf Klick nichts tut, ist
              schlimmer als ein Kreis, der keiner ist.
            */}
            {s.abhakbar ? (
              <button
                onClick={() => umschalten(s)}
                disabled={pending}
                aria-pressed={s.erledigt}
                aria-label={s.erledigt ? `${s.titel} wieder öffnen` : `${s.titel} abhaken`}
                className={`mt-0.5 w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0
                  disabled:opacity-50 transition-colors ${
                    s.erledigt
                      ? "bg-[#00b8ff] border-[#00b8ff]"
                      : "border-[#2a3f5c] hover:border-[#00b8ff]"
                  }`}
              >
                {pending ? (
                  <Loader2 size={11} className="animate-spin text-[#8899b4]" />
                ) : s.erledigt ? (
                  <Check size={11} className="text-[#041018]" strokeWidth={3} />
                ) : null}
              </button>
            ) : (
              <span
                /*
                  Gestrichelt, wo der Haken nicht in der Hand des Kunden
                  liegt: Der Kreis sieht dann nicht aus wie ein Knopf, der
                  klemmt.
                */
                className={`mt-0.5 w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 ${
                  s.erledigt
                    ? "bg-[#00b8ff]/15 border-[#00b8ff]/40"
                    : "border-dashed border-[#32486a] bg-[#060a10]"
                }`}
              >
                {s.erledigt && <Check size={11} className="text-[#00b8ff]" strokeWidth={3} />}
              </span>
            )}

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p
                  className={`text-sm ${
                    s.erledigt
                      ? "text-[#8899b4] line-through decoration-[#2a3f5c]"
                      : "text-[#f0f0f0] font-medium"
                  }`}
                >
                  {s.titel}
                </p>
                {s.werTut === "okun" && !s.erledigt && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#101c2e] border border-[#1a2840] text-[#5b6b7f]">
                    macht OKUN
                  </span>
                )}
              </div>
              {!s.erledigt && (
                <p className="text-[#888] text-xs mt-0.5 leading-relaxed">{s.text}</p>
              )}
            </div>

            {!s.erledigt && s.werTut === "kunde" && (
              <Link
                href={s.href}
                className="flex-shrink-0 mt-0.5 flex items-center gap-1 text-[#00b8ff] text-xs hover:underline whitespace-nowrap"
              >
                {s.linkText}
                <ChevronRight size={12} />
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
