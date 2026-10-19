"use client";

import { ExternalLink, FileText } from "lucide-react";
import { OkunLogo } from "@/components/layout/okun-logo";
import { Gespraechsraum } from "@/components/radar/cockpit";
import type { ClientClosingState } from "@/lib/closing/client-view";

/**
 * Die Bühne für das Angebot.
 *
 * Vorher stand das Angebot als 390 Pixel schmale Karte rechts neben dem
 * Videobild — auf dem Laptop unterhalb der Kachel, auf dem Telefon unterhalb
 * der Falz. Der Berater sagte „ich habe Ihnen das Angebot aufgeschaltet", und
 * der Interessent suchte. Für den wichtigsten Moment des Gesprächs ist das
 * die falsche Reihenfolge.
 *
 * Jetzt bekommt das Angebot den Bildschirm, so wie das Radar ihn vorher
 * bekommt: Der Betrag steht als Hauptsache in der Mitte, das Gespräch läuft in
 * der rechten Leiste weiter, die Unterlagen stehen darunter. Niemand muss
 * etwas aufklappen, scrollen oder suchen, um zu wissen, was auf dem Tisch
 * liegt.
 *
 * Bewusst dieselbe Leiste wie im Cockpit (`Gespraechsraum`): Der Wechsel vom
 * Radar ins Angebot soll ein Wechsel der Ansicht sein, nicht ein Wechsel des
 * Hauses.
 */

type Angebot = NonNullable<ClientClosingState["offer"]>;

export function AngebotsBuehne({
  firma,
  beraterName,
  angebot,
  pdfVerfuegbar,
  pdfUrl,
  onPdfOeffnen,
  video,
  videoSteuerung,
  videoHinweis,
  teilnehmer,
  unterlagen,
  schritte,
}: {
  firma: string;
  beraterName: string | null;
  angebot: Angebot;
  pdfVerfuegbar: boolean;
  pdfUrl: string;
  onPdfOeffnen: () => void;
  video?: React.ReactNode;
  videoSteuerung?: React.ReactNode;
  videoHinweis?: React.ReactNode;
  teilnehmer?: number | null;
  /** Unterlagen und Erklärungen — steht nur an, wenn es sie gibt. */
  unterlagen?: React.ReactNode;
  /** Die Schrittanzeige aus der Gesprächsseite, damit die Orientierung bleibt. */
  schritte?: React.ReactNode;
}) {
  const gueltig = angebot.validUntil
    ? new Date(angebot.validUntil).toLocaleDateString("de-DE", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <div className="h-screen flex flex-col bg-[#04070d] overflow-hidden">
      {/* Dieselbe Materialschicht wie Cockpit und Gesprächsseite. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            "radial-gradient(1100px 620px at 16% -12%, rgba(0,160,255,0.09), transparent 60%)," +
            "radial-gradient(900px 540px at 88% 8%, rgba(46,230,197,0.05), transparent 58%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.035] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='220' height='220' filter='url(%23n)'/%3E%3C/svg%3E\")",
          backgroundRepeat: "repeat",
        }}
      />

      <div className="relative z-10 flex flex-col flex-1 min-h-0">
        <header className="flex-shrink-0 border-b border-[#101d31] bg-[#070d16]/80 backdrop-blur">
          <div className="px-4 sm:px-7 py-3 flex items-center gap-4">
            <div className="w-[104px] flex-shrink-0">
              <OkunLogo size="sm" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[#eef2f7] text-[13px] font-semibold">{firma}</p>
              {beraterName && (
                <p className="truncate text-[#44546b] text-[11px]">Ihr Berater: {beraterName}</p>
              )}
            </div>
            {/*
              Rechts steht, wo man im Ablauf ist.

              Auf dem schmalen Fenster weicht die Schrittanzeige der
              Angebotsnummer — die Nummer braucht man, wenn man anruft, die
              Schritte stehen dort ohnehin unter dem Angebot.
            */}
            {schritte && <div className="hidden md:block flex-shrink-0">{schritte}</div>}
            <span className="hidden sm:flex md:hidden items-center gap-2 font-mono text-[#3f5572] text-[9.5px] uppercase tracking-[0.2em] font-semibold flex-shrink-0">
              <span className="w-4 h-px bg-[#1d3b59]" />
              Ihr Angebot
              {angebot.offerNumber && (
                <span className="text-[#5b7390] tracking-normal normal-case">
                  · {angebot.offerNumber}
                </span>
              )}
            </span>
          </div>
        </header>

        <div className="flex-1 min-h-0 flex flex-col lg:flex-row">
          {/* ── Das Angebot ──────────────────────────────────────────── */}
          {/*
            Die Platte steht in der Mitte, nicht oben.

            Ein Angebot ist kurz — Paket, Betrag, zwei Bedingungen. Oben
            angeschlagen hängt darunter eine halbe Seite leeres Schwarz, und
            die Bühne sieht aus, als fehle etwas. `my-auto` zentriert, solange
            Platz da ist, und gibt ihn sonst sauber dem Bildlauf frei.
          */}
          <main className="order-2 lg:order-none flex-1 min-h-0 overflow-y-auto px-4 sm:px-8 py-4 sm:py-7 flex flex-col">
            <div className="my-auto mx-auto w-full max-w-[860px] rounded-[26px] border border-[#122339] bg-[linear-gradient(168deg,rgba(11,21,36,0.92),rgba(6,12,21,0.86))] shadow-[0_44px_100px_-56px_rgba(0,0,0,0.95),inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-[2px] px-5 sm:px-10 py-6 sm:py-9">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <p className="font-mono text-[#3f5572] text-[9.5px] uppercase tracking-[0.22em] font-semibold">
                  {angebot.packageName ?? "Ihr Paket"}
                </p>
                {/* Die Nummer steht auch hier — am Telefon ist sie im Kopf nicht zu sehen. */}
                {angebot.offerNumber && (
                  <p className="font-mono text-[#33495f] text-[10px] tabular-nums">
                    {angebot.offerNumber}
                  </p>
                )}
              </div>

              {/*
                Der Betrag ist die Hauptsache.

                Nicht aus Verkaufslogik, sondern weil es die eine Zahl ist, auf
                die im Gespräch alles zuläuft. Sie groß zu setzen heißt nicht,
                sie zu bewerben — es heißt, nichts zu verstecken.
              */}
              <div className="mt-4 flex flex-wrap items-end gap-x-6 gap-y-2">
                <div className="relative">
                  <span
                    aria-hidden
                    className="pointer-events-none absolute -inset-x-6 -inset-y-3 rounded-full opacity-60"
                    style={{
                      background:
                        "radial-gradient(60% 70% at 30% 50%, rgba(0,184,255,0.13), transparent 70%)",
                    }}
                  />
                  <span className="relative font-mono text-[#eef2f7] text-[40px] sm:text-[58px] font-bold leading-none tabular-nums">
                    {angebot.oneTimeGross}
                  </span>
                </div>
                <div className="pb-1">
                  <p className="text-[#8899b4] text-[12.5px] leading-snug">
                    einmalig, brutto
                  </p>
                  <p className="font-mono text-[#44546b] text-[11px] leading-snug tabular-nums">
                    {angebot.oneTimeNet} netto + {angebot.oneTimeVat} USt. (
                    {angebot.vatRateLabel})
                  </p>
                </div>
              </div>

              {(angebot.recurring || angebot.minimumTermMonths) && (
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  {angebot.recurring && (
                    <Kennzahl
                      label={`Laufend${angebot.recurringInterval ? ` · ${angebot.recurringInterval}` : ""}`}
                      wert={angebot.recurring}
                      fussnote="netto"
                    />
                  )}
                  {angebot.minimumTermMonths && (
                    <Kennzahl
                      label="Mindestlaufzeit"
                      wert={`${angebot.minimumTermMonths} Monate`}
                    />
                  )}
                </div>
              )}

              {angebot.extras.length > 0 && (
                <div className="mt-6 pt-5 border-t border-[#101b2c]">
                  <p className="font-mono text-[#3f5572] text-[9.5px] uppercase tracking-[0.2em] font-semibold mb-3">
                    Zusatzleistungen
                  </p>
                  <ul className="space-y-2">
                    {angebot.extras.map((extra, i) => (
                      <li
                        key={i}
                        className="flex items-baseline justify-between gap-4 text-[13px]"
                      >
                        <span className="text-[#c9d4e4] min-w-0">{extra.description}</span>
                        <span className="font-mono text-[#eef2f7] tabular-nums flex-shrink-0">
                          {extra.amount}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {(angebot.paymentTerms || gueltig) && (
                <div className="mt-6 pt-5 border-t border-[#101b2c] space-y-2">
                  {angebot.paymentTerms && (
                    <p className="text-[#8899b4] text-[12.5px] leading-relaxed">
                      <span className="text-[#5b6b7f]">Zahlungsbedingungen: </span>
                      {angebot.paymentTerms}
                    </p>
                  )}
                  {gueltig && (
                    <p className="text-[#8899b4] text-[12.5px] leading-relaxed">
                      <span className="text-[#5b6b7f]">Gültig bis: </span>
                      {gueltig}
                    </p>
                  )}
                </div>
              )}

              {/*
                Das vollständige Angebot ist ein Dokument, nicht diese Seite.

                Die Bühne zeigt, worum es geht; das PDF ist das, was der
                Interessent später seinem Steuerberater schickt. Beide Wege
                stehen hier, und keiner davon ist versteckt.
              */}
              {pdfVerfuegbar && (
                <div className="mt-7 flex flex-wrap gap-2.5">
                  <button
                    onClick={onPdfOeffnen}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#00b8ff] text-[#041018] text-[13px] font-bold hover:bg-[#0099d6] transition-colors"
                  >
                    <FileText size={14} /> Vollständiges Angebot ansehen
                  </button>
                  <a
                    href={pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#16283d] text-[#8899b4] text-[13px] hover:text-[#eef2f7] hover:border-[#2a3a55] transition-colors"
                  >
                    <ExternalLink size={14} /> In neuem Tab öffnen
                  </a>
                </div>
              )}
            </div>

            {/* Am Telefon stehen die Unterlagen unter dem Angebot, nicht über ihm. */}
            {unterlagen && (
              <div className="lg:hidden mx-auto w-full max-w-[860px] mt-5">{unterlagen}</div>
            )}
          </main>

          {/* ── Gespräch und Unterlagen ──────────────────────────────── */}
          {/*
            Ohne Unterlagen schmiegt sich die Leiste an das Bild.

            Vorher war sie immer so hoch wie die Bühne — und solange keine
            Erklärungen anstanden, war das ein mannshoher leerer Rahmen neben
            dem Angebot. Gibt es nichts darunter, endet sie unter dem Bild.
          */}
          <aside
            className={`order-1 lg:order-none flex-shrink-0 lg:w-[408px] lg:my-3 lg:mr-3 lg:rounded-[22px] border-b lg:border-b-0 lg:border border-[#122339] bg-[#060b14]/90 backdrop-blur-sm lg:shadow-[0_28px_70px_-32px_rgba(0,0,0,0.95),inset_0_1px_0_rgba(255,255,255,0.045)] overflow-hidden flex flex-col ${
              unterlagen ? "lg:min-h-0" : "lg:self-start"
            }`}
          >
            {/*
              Am Telefon bleibt das Bild schmal.

              In voller Breite füllt eine 16:10-Kachel dort den halben
              Bildschirm, und das Angebot beginnt wieder unterhalb der Falz —
              genau der Fehler, den diese Bühne behebt.
            */}
            <div className="mx-auto w-full max-w-[288px] lg:max-w-none">
              <Gespraechsraum
                video={video}
                steuerung={videoSteuerung}
                hinweis={videoHinweis}
                teilnehmer={teilnehmer}
                beraterName={beraterName}
              />
            </div>

            {unterlagen && (
              <div className="hidden lg:block flex-1 min-h-0 overflow-y-auto px-4 py-4">
                {unterlagen}
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}

function Kennzahl({
  label,
  wert,
  fussnote,
}: {
  label: string;
  wert: string;
  fussnote?: string;
}) {
  return (
    <div className="rounded-2xl border border-[#101f33] bg-[#070e19]/70 px-4 py-3.5">
      <p className="font-mono text-[#3f5572] text-[9px] uppercase tracking-[0.18em] font-semibold">
        {label}
      </p>
      <p className="mt-1.5 font-mono text-[#eef2f7] text-[19px] font-bold leading-none tabular-nums">
        {wert}
        {fussnote && (
          <span className="ml-1.5 text-[#44546b] text-[10.5px] font-medium tracking-normal">
            {fussnote}
          </span>
        )}
      </p>
    </div>
  );
}
