"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  Clock,
  Eye,
  EyeOff,
  Loader2,
  ShieldCheck,
  Undo2,
} from "lucide-react";
import {
  freigabeZuruecknehmen,
  postenArtSetzen,
  postenAufgabenSetzen,
  postenAufwandSetzen,
  postenSichtbarkeitSetzen,
  postenZustandSetzen,
  sitzungAufsetzen,
  sitzungFreigeben,
} from "./actions";
import {
  POSTEN_ARTEN,
  POSTEN_ZUSTAENDE,
  type PostenArt,
  type PostenZustand,
} from "@/lib/strategie/katalog";
import {
  alsStunden,
  darfWaehlen,
  freigabeHindernisse,
  fasseZusammen,
  pruefeAuswahl,
} from "@/lib/strategie/engine";

/**
 * Die Vorbereitung — alles, was vor dem Gespräch entschieden wird.
 *
 * Bewusst eine lange Liste statt eines Assistenten: Wer ein Gespräch
 * vorbereitet, springt zwischen den Posten hin und her und will alles
 * gleichzeitig sehen. Ein Assistent, der ihn durch sieben Schritte führt,
 * verlängert genau das, was kurz sein soll.
 */

type Posten = {
  id: string;
  schluessel: string;
  art: PostenArt;
  block: string;
  titel: string;
  befund: string | null;
  womit: string | null;
  warum: string | null;
  wieWirEsMachen: string | null;
  einordnung: string | null;
  zustand: PostenZustand;
  kundeSieht: boolean;
  aufgabenKeys: string[];
  aufwandHeuteMinuten: number;
  internerAufwand: string | null;
  position: number;
};

type Sitzung = {
  id: string;
  status: string;
  ansicht: string;
  paket: string | null;
  rev: number;
  beraterPresenceAt: string | null;
  sessionId: string;
  appointmentId: string;
  meetingUrl: string | null;
  beraterId: string;
  beraterName: string | null;
  companyName: string;
  interneNotiz: string | null;
  freigegebenAm: string | null;
  freigegebenVon: string | null;
  abgeschlossenAm: string | null;
  terminStart: string | null;
  companyId: string;
  posten: Posten[];
  aufgaben: Array<{ catalogKey: string; label: string; minutesPerMonth: number }>;
};

type Termin = {
  id: string;
  title: string;
  startTime: string;
  hatRaum: boolean;
  sitzungId: string | null;
  sitzungStatus: string | null;
};

export default function StrategieClient({
  company,
  termine,
  blueprintFertigAm,
  leitfadenVorhanden,
  sitzung,
}: {
  company: { id: string; name: string; contractPackage: string | null };
  termine: Termin[];
  blueprintFertigAm: string | null;
  leitfadenVorhanden: boolean;
  sitzung: Sitzung | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [fehler, setFehler] = useState<string | null>(null);

  function fuehreAus(fn: () => Promise<unknown>) {
    setFehler(null);
    start(async () => {
      const ergebnis = (await fn()) as { error?: string } | undefined;
      if (ergebnis && "error" in ergebnis && ergebnis.error) setFehler(ergebnis.error);
      else router.refresh();
    });
  }

  if (!sitzung) {
    return (
      <Rahmen company={company}>
        <Aufsetzen
          company={company}
          termine={termine}
          blueprintFertigAm={blueprintFertigAm}
          leitfadenVorhanden={leitfadenVorhanden}
          pending={pending}
          fehler={fehler}
          onAufsetzen={(terminId) =>
            fuehreAus(() => sitzungAufsetzen(company.id, terminId))
          }
        />
      </Rahmen>
    );
  }

  return (
    <Rahmen company={company} sitzungId={sitzung.id}>
      <Vorbereitung
        sitzung={sitzung}
        pending={pending}
        fehler={fehler}
        onAktion={fuehreAus}
      />
    </Rahmen>
  );
}

function Rahmen({
  company,
  sitzungId,
  children,
}: {
  company: { id: string; name: string };
  sitzungId?: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[#3f5572] text-[9.5px] uppercase tracking-[0.2em] font-semibold">
            Schritt 3 · Strategiegespräch
          </p>
          <h1 className="text-[#f0f0f0] text-xl font-bold mt-1">{company.name}</h1>
          <p className="text-[#666] text-xs mt-0.5">
            Ergebnispräsentation, Roadmap und Auswahl der Lösungen — so steht es im Angebot.
          </p>
        </div>
        <div className="flex items-center gap-4">
          {sitzungId && (
            <>
              <Link
                href={`/admin/kunden/${company.id}/strategie/${sitzungId}/studio`}
                target="_blank"
                className="flex items-center gap-2 px-3.5 py-2 rounded-lg
                  border border-[#1a2840] text-[#8899b4] text-xs
                  hover:text-[#dce9f6] hover:border-[rgba(0,184,255,.4)] transition-colors"
              >
                ⬡ Haus ansehen
              </Link>
              {/*
                Der Weg ins Gespräch selbst: Haus, Gegenüber und Auswahl auf
                einer Fläche. Die Vorschau daneben bleibt, was sie ist — ein
                Blick vorher, ohne Kunden und ohne Video.
              */}
              <Link
                href={`/admin/kunden/${company.id}/strategie/${sitzungId}/gespraech`}
                className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#00b8ff]
                  text-[#041018] text-xs font-bold hover:bg-[#33c7ff] transition-colors"
              >
                ▶ Gespräch führen
              </Link>
            </>
          )}
          <Link
            href={`/admin/kunden/${company.id}/leitfaden`}
            className="text-[#00b8ff] text-xs hover:underline"
          >
            → Leitfaden
          </Link>
        </div>
      </div>
      {children}
    </div>
  );
}

// ─── Aufsetzen ───────────────────────────────────────────────────────────────

function Aufsetzen({
  company,
  termine,
  blueprintFertigAm,
  leitfadenVorhanden,
  pending,
  fehler,
  onAufsetzen,
}: {
  company: { id: string };
  termine: Termin[];
  blueprintFertigAm: string | null;
  leitfadenVorhanden: boolean;
  pending: boolean;
  fehler: string | null;
  onAufsetzen: (terminId: string) => void;
}) {
  const offen = termine.filter((t) => !t.sitzungId);

  return (
    <div className="space-y-4">
      {fehler && <Fehlerzeile text={fehler} />}

      <Karte titel="Voraussetzungen">
        <ul className="space-y-2 text-xs">
          <Haken
            erfuellt={Boolean(blueprintFertigAm)}
            text={
              blueprintFertigAm
                ? `Blueprint abgeschlossen am ${new Date(blueprintFertigAm).toLocaleDateString("de-DE")}`
                : "Es gibt noch keinen abgeschlossenen Blueprint."
            }
          />
          <Haken
            erfuellt={leitfadenVorhanden}
            text={
              leitfadenVorhanden
                ? "Ein Leitfaden liegt vor — daraus entstehen die Posten."
                : "Noch kein Leitfaden. Ohne ihn hat das Gespräch nichts zur Wahl."
            }
          />
          <Haken
            erfuellt={termine.length > 0}
            text={
              termine.length > 0
                ? `${termine.length} Strategietermin${termine.length === 1 ? "" : "e"} angelegt`
                : "Es ist kein Strategietermin angelegt."
            }
          />
        </ul>
        {/*
          Fehlt eine Voraussetzung, steht hier der Weg dorthin.

          Vorher war das eine Sackgasse: „Es ist kein Strategietermin
          angelegt." — und kein Wort dazu, wo man einen anlegt. Wer hier
          landete, sah nur Vorbereitung und Leitfaden und hielt das
          Transformation Studio für verschwunden.
        */}
        <div className="mt-3 flex flex-wrap items-center gap-4">
          {!leitfadenVorhanden && (
            <Link
              href={`/admin/kunden/${company.id}/leitfaden`}
              className="text-[#00b8ff] text-xs hover:underline"
            >
              Leitfaden erzeugen →
            </Link>
          )}
          {termine.length === 0 && (
            <Link
              href={`/admin/kunden/${company.id}/termine`}
              className="text-[#00b8ff] text-xs hover:underline"
            >
              Strategietermin anlegen →
            </Link>
          )}
        </div>
      </Karte>

      {/*
        Was am Ende dieses Wegs steht.

        Das Haus ist der Grund, warum man hier überhaupt vorbereitet. Es
        gehört deshalb auf diese Seite — auch solange es noch nicht steht,
        damit niemand es für abgeschafft hält.
      */}
      <Karte titel="OKUN Transformation Studio">
        <p className="text-[#888] text-xs leading-relaxed">
          Aus dem Blueprint entsteht das Haus des Betriebs: ein Rundgang vom Vorplatz
          bis in die Räume, durch den Sie im Termin führen. Sobald die Sitzung aufgesetzt
          ist, stehen hier oben <b className="text-[#c9d4e4]">⬡ Haus ansehen</b> für den
          Blick vorher und <b className="text-[#c9d4e4]">▶ Gespräch führen</b> für den
          Termin selbst — Haus, Gegenüber und Auswahl auf einer Fläche.
        </p>
      </Karte>

      {offen.length > 0 && (
        <Karte titel="Sitzung aufsetzen">
          <p className="text-[#888] text-xs leading-relaxed mb-3">
            Die Posten der neuesten Leitfaden-Fassung werden <b>abgeschrieben</b>. Wer den
            Leitfaden danach nachschärft, ändert nichts mehr an dem, was im Gespräch auf dem
            Tisch liegt.
          </p>
          <div className="space-y-2">
            {offen.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between gap-3 px-4 py-3 rounded-lg bg-[#0a121c] border border-[#1a2840]"
              >
                <div className="min-w-0">
                  <p className="text-[#f0f0f0] text-sm font-medium truncate">{t.title}</p>
                  <p className="text-[#666] text-xs">
                    {new Date(t.startTime).toLocaleString("de-DE", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                    Uhr{t.hatRaum ? " · Videoraum steht" : " · noch kein Videoraum"}
                  </p>
                </div>
                <button
                  onClick={() => onAufsetzen(t.id)}
                  disabled={pending || !leitfadenVorhanden}
                  className="flex-shrink-0 px-3.5 py-2 rounded-lg bg-[#00b8ff] text-[#041018] text-xs font-bold disabled:bg-[#16283d] disabled:text-[#4a5a70] transition-colors"
                >
                  {pending ? "…" : "Aufsetzen"}
                </button>
              </div>
            ))}
          </div>
        </Karte>
      )}
    </div>
  );
}

// ─── Vorbereitung ────────────────────────────────────────────────────────────

function Vorbereitung({
  sitzung,
  pending,
  fehler,
  onAktion,
}: {
  sitzung: Sitzung;
  pending: boolean;
  fehler: string | null;
  onAktion: (fn: () => Promise<unknown>) => void;
}) {
  const stand = useMemo(
    () =>
      sitzung.posten.map((p) => ({
        id: p.id,
        art: p.art,
        zustand: p.zustand,
        titel: p.titel,
        kundeSieht: p.kundeSieht,
        aufwandHeuteMinuten: p.aufwandHeuteMinuten,
      })),
    [sitzung.posten]
  );
  const pruefung = useMemo(() => pruefeAuswahl(stand), [stand]);
  const zusammen = useMemo(() => fasseZusammen(stand), [stand]);
  const hindernisse = useMemo(() => freigabeHindernisse(stand), [stand]);
  const freigegeben = Boolean(sitzung.freigegebenAm);

  return (
    <div className="space-y-4">
      {fehler && <Fehlerzeile text={fehler} />}

      {/* Kopf: Stand der Auswahl und die Freigabe */}
      <div className="rounded-xl border border-[#1a2840] bg-[#0c1520] p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-wrap gap-6">
            <Kennzahl
              label="Automatisierungen"
              wert={`${pruefung.gewaehlt} von ${pruefung.grenze}`}
              warnung={!pruefung.ok}
            />
            <Kennzahl label="Gewählt insgesamt" wert={String(zusammen.gewaehlt)} />
            <Kennzahl
              label="Heutiger Aufwand der Auswahl"
              wert={
                zusammen.aufwandGewaehltMinuten > 0
                  ? `${alsStunden(zusammen.aufwandGewaehltMinuten)} / Monat`
                  : "noch nicht zugeordnet"
              }
            />
            {zusammen.ueberDemPaket > 0 && (
              <Kennzahl
                label="Über dem Paket"
                wert={String(zusammen.ueberDemPaket)}
                warnung
              />
            )}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {freigegeben ? (
              <>
                <span className="flex items-center gap-1.5 text-[#22c55e] text-xs font-semibold">
                  <ShieldCheck size={14} />
                  Freigegeben
                  {sitzung.freigegebenVon ? ` von ${sitzung.freigegebenVon}` : ""}
                </span>
                <button
                  onClick={() => onAktion(() => freigabeZuruecknehmen(sitzung.id))}
                  disabled={pending || Boolean(sitzung.abgeschlossenAm)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#1a2840] text-[#888] text-xs hover:text-[#f0f0f0] disabled:opacity-40 transition-colors"
                >
                  <Undo2 size={12} /> Zurücknehmen
                </button>
              </>
            ) : (
              <button
                onClick={() => onAktion(() => sitzungFreigeben(sitzung.id))}
                disabled={pending || hindernisse.length > 0}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#22c55e] text-[#041018] text-xs font-bold disabled:bg-[#16283d] disabled:text-[#4a5a70] disabled:cursor-not-allowed transition-colors"
              >
                {pending ? <Loader2 size={13} className="animate-spin" /> : <ShieldCheck size={13} />}
                Für den Kunden freigeben
              </button>
            )}
          </div>
        </div>

        {!freigegeben && hindernisse.length > 0 && (
          <div className="mt-4 pt-4 border-t border-[#1a2840]">
            <p className="flex items-center gap-1.5 text-[#fbbf24] text-xs font-semibold mb-1.5">
              <AlertTriangle size={13} /> Vor der Freigabe zu klären
            </p>
            <ul className="text-[#fbbf24]/85 text-xs list-disc list-inside space-y-1">
              {hindernisse.map((h) => (
                <li key={h}>{h}</li>
              ))}
            </ul>
          </div>
        )}

        {pruefung.fehler.length > 0 && (
          <div className="mt-4 pt-4 border-t border-[#1a2840]">
            <ul className="text-[#fca5a5] text-xs list-disc list-inside space-y-1">
              {pruefung.fehler.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </div>
        )}

        <p className="text-[#44546b] text-[11px] leading-relaxed mt-4">
          Vor der Freigabe sieht der Kunde nichts. Die Posten stammen aus dem Leitfaden und
          nennen Produkte beim Namen — zwischen „der Leitfaden schlägt vor&ldquo; und „der Kunde
          liest es&ldquo; gehört ein Mensch.
        </p>
      </div>

      {/* Die Posten */}
      <div className="space-y-3">
        {sitzung.posten.map((p) => (
          <PostenZeile
            key={p.id}
            posten={p}
            alle={stand}
            aufgaben={sitzung.aufgaben}
            sitzungId={sitzung.id}
            pending={pending}
            onAktion={onAktion}
          />
        ))}
      </div>
    </div>
  );
}

function PostenZeile({
  posten,
  alle,
  aufgaben,
  sitzungId,
  pending,
  onAktion,
}: {
  posten: Posten;
  alle: Array<{ id: string; art: PostenArt; zustand: PostenZustand; titel: string; kundeSieht: boolean }>;
  aufgaben: Array<{ catalogKey: string; label: string; minutesPerMonth: number }>;
  sitzungId: string;
  pending: boolean;
  onAktion: (fn: () => Promise<unknown>) => void;
}) {
  const [offen, setOffen] = useState(false);
  const [aufwand, setAufwand] = useState(posten.internerAufwand ?? "");

  const dieser = alle.find((a) => a.id === posten.id)!;
  const wahl = darfWaehlen(dieser, alle);
  const gewaehlt = posten.zustand === "gewaehlt";

  function toggleAufgabe(key: string) {
    const naechste = posten.aufgabenKeys.includes(key)
      ? posten.aufgabenKeys.filter((k) => k !== key)
      : [...posten.aufgabenKeys, key];
    onAktion(() => postenAufgabenSetzen(sitzungId, posten.id, naechste));
  }

  return (
    <div
      className={`rounded-xl border bg-[#0c1520] overflow-hidden ${
        gewaehlt ? "border-[rgba(0,184,255,0.35)]" : "border-[#1a2840]"
      }`}
    >
      <div className="p-4 flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="font-mono text-[#3f5572] text-[9px] uppercase tracking-[0.15em]">
              {posten.block}
            </span>
            {posten.art === "offen" && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[rgba(245,158,11,0.12)] text-[#fbbf24]">
                nicht eingeordnet
              </span>
            )}
            {posten.art === "custom" && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[rgba(168,85,247,0.12)] text-[#c084fc]">
                über dem Paket
              </span>
            )}
          </div>
          <p className="text-[#f0f0f0] text-sm font-semibold">{posten.titel}</p>
          {posten.befund && (
            <p className="text-[#8899b4] text-xs mt-1 leading-relaxed">{posten.befund}</p>
          )}
          {posten.aufwandHeuteMinuten > 0 && (
            <p className="flex items-center gap-1.5 font-mono text-[#00b8ff] text-[11px] mt-1.5 tabular-nums">
              <Clock size={11} />
              {alsStunden(posten.aufwandHeuteMinuten)} im Monat — so viel kostet das heute
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
          <select
            value={posten.art}
            disabled={pending}
            onChange={(e) =>
              onAktion(() => postenArtSetzen(sitzungId, posten.id, e.target.value as PostenArt))
            }
            className="px-2.5 py-1.5 rounded-lg bg-[#0a121c] border border-[#1a2840] text-[#c9d4e4] text-xs outline-none focus:border-[#00b8ff]/60"
          >
            {POSTEN_ARTEN.map((a) => (
              <option key={a.key} value={a.key}>
                {a.label}
              </option>
            ))}
          </select>

          <button
            onClick={() =>
              onAktion(() =>
                postenSichtbarkeitSetzen(sitzungId, posten.id, !posten.kundeSieht)
              )
            }
            disabled={pending}
            title={
              posten.kundeSieht
                ? "Steht dem Kunden zur Wahl"
                : "Für den Kunden ausgeblendet"
            }
            className={`p-2 rounded-lg border transition-colors ${
              posten.kundeSieht
                ? "border-[#1a2840] text-[#00b8ff]"
                : "border-[#1a2840] text-[#44546b]"
            }`}
          >
            {posten.kundeSieht ? <Eye size={13} /> : <EyeOff size={13} />}
          </button>

          <button
            onClick={() => setOffen((v) => !v)}
            className="p-2 rounded-lg border border-[#1a2840] text-[#888] hover:text-[#f0f0f0] transition-colors"
            aria-label="Aufklappen"
          >
            <ChevronDown
              size={13}
              className={`transition-transform ${offen ? "rotate-180" : ""}`}
            />
          </button>
        </div>
      </div>

      {/* Zustand */}
      <div className="px-4 pb-4 flex flex-wrap gap-1.5">
        {POSTEN_ZUSTAENDE.map((z) => {
          const aktiv = posten.zustand === z.key;
          const gesperrt = z.key === "gewaehlt" && !aktiv && !wahl.erlaubt;
          return (
            <button
              key={z.key}
              onClick={() =>
                onAktion(() => postenZustandSetzen(sitzungId, posten.id, z.key))
              }
              disabled={pending || gesperrt}
              title={gesperrt ? wahl.grund : undefined}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                aktiv
                  ? "bg-[#00b8ff] text-[#041018]"
                  : gesperrt
                    ? "bg-[#0a121c] text-[#33495f] cursor-not-allowed"
                    : "bg-[#0a121c] text-[#8899b4] hover:text-[#f0f0f0] border border-[#1a2840]"
              }`}
            >
              {z.label}
            </button>
          );
        })}
        {!wahl.erlaubt && wahl.grund && posten.zustand !== "gewaehlt" && (
          <span className="self-center text-[#5b6b7f] text-[11px] ml-1">{wahl.grund}</span>
        )}
      </div>

      {offen && (
        <div className="px-4 pb-4 pt-1 border-t border-[#101b2c] space-y-4">
          {posten.womit && <Feld label="Womit" text={posten.womit} />}
          {posten.warum && <Feld label="Warum gerade das" text={posten.warum} />}
          {posten.wieWirEsMachen && <Feld label="Wie wir vorgehen" text={posten.wieWirEsMachen} />}
          {posten.einordnung && <Feld label="Einordnung" text={posten.einordnung} />}

          {/* Zuordnung zu Aufgaben — die einzige Quelle der Zahl */}
          <div>
            <p className="font-mono text-[#3f5572] text-[9px] uppercase tracking-[0.15em] mb-2">
              Welche Aufgaben entlastet das?
            </p>
            {aufgaben.length === 0 ? (
              <p className="text-[#5b6b7f] text-xs">
                Im Blueprint wurden keine Aufgaben mit Zeiten erhoben.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {aufgaben.map((a) => {
                  const an = posten.aufgabenKeys.includes(a.catalogKey);
                  return (
                    <button
                      key={a.catalogKey}
                      onClick={() => toggleAufgabe(a.catalogKey)}
                      disabled={pending}
                      className={`px-2.5 py-1.5 rounded-lg text-[11px] border transition-colors text-left ${
                        an
                          ? "bg-[rgba(0,184,255,0.12)] border-[#00b8ff]/40 text-[#cfe0f2]"
                          : "bg-[#0a121c] border-[#1a2840] text-[#8899b4] hover:text-[#f0f0f0]"
                      }`}
                    >
                      {a.label}
                      <span className="ml-1.5 font-mono text-[#5b7390] tabular-nums">
                        {Math.round(a.minutesPerMonth / 60)} h
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Interner Aufwand — erscheint nie beim Kunden */}
          <div>
            <p className="font-mono text-[#3f5572] text-[9px] uppercase tracking-[0.15em] mb-2">
              Was uns das kostet (nur intern)
            </p>
            <div className="flex gap-2">
              <input
                value={aufwand}
                onChange={(e) => setAufwand(e.target.value)}
                placeholder="z. B. 1,5 Tage Einrichtung, Schnittstelle offen"
                className="flex-1 px-3 py-2 rounded-lg bg-[#0a121c] border border-[#1a2840] text-[#f0f0f0] text-xs outline-none focus:border-[#00b8ff]/60"
              />
              <button
                onClick={() =>
                  onAktion(() => postenAufwandSetzen(sitzungId, posten.id, aufwand))
                }
                disabled={pending || aufwand === (posten.internerAufwand ?? "")}
                className="px-3 py-2 rounded-lg border border-[#1a2840] text-[#8899b4] text-xs hover:text-[#f0f0f0] disabled:opacity-40 transition-colors"
              >
                Merken
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Kleinteile ──────────────────────────────────────────────────────────────

function Karte({ titel, children }: { titel: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[#1a2840] bg-[#0c1520] p-5">
      <h2 className="text-[#f0f0f0] text-sm font-bold mb-3">{titel}</h2>
      {children}
    </div>
  );
}

function Haken({ erfuellt, text }: { erfuellt: boolean; text: string }) {
  return (
    <li className="flex items-start gap-2">
      <span
        className={`mt-0.5 w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center ${
          erfuellt ? "bg-[rgba(34,197,94,0.15)] text-[#22c55e]" : "bg-[#16283d] text-[#4a5a70]"
        }`}
      >
        {erfuellt ? <Check size={10} strokeWidth={3} /> : <span className="text-[9px]">!</span>}
      </span>
      <span className={erfuellt ? "text-[#c9d4e4]" : "text-[#8899b4]"}>{text}</span>
    </li>
  );
}

function Kennzahl({
  label,
  wert,
  warnung,
}: {
  label: string;
  wert: string;
  warnung?: boolean;
}) {
  return (
    <div>
      <p className="font-mono text-[#3f5572] text-[9px] uppercase tracking-[0.15em]">{label}</p>
      <p
        className={`font-mono text-base font-bold mt-0.5 tabular-nums ${
          warnung ? "text-[#fbbf24]" : "text-[#f0f0f0]"
        }`}
      >
        {wert}
      </p>
    </div>
  );
}

function Feld({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <p className="font-mono text-[#3f5572] text-[9px] uppercase tracking-[0.15em] mb-1">
        {label}
      </p>
      <p className="text-[#c9d4e4] text-xs leading-relaxed">{text}</p>
    </div>
  );
}

function Fehlerzeile({ text }: { text: string }) {
  return (
    <div className="px-4 py-3 rounded-lg bg-[rgba(239,68,68,0.1)] border border-[#ef4444]/25">
      <p className="text-[#fca5a5] text-xs">{text}</p>
    </div>
  );
}
