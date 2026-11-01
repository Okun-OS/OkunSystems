"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  Check,
  Loader2,
  ShieldCheck,
  Undo2,
} from "lucide-react";
import {
  freigabeZuruecknehmen,
  sitzungAufsetzen,
  sitzungFreigeben,
  terminUndSitzungAnlegen,
} from "./actions";
import {
  type PostenArt,
  type PostenZustand,
} from "@/lib/strategie/katalog";
import {
  alsStunden,
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
  vorbereitetAm: string | null;
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
  sitzung,
}: {
  company: { id: string; name: string; contractPackage: string | null };
  termine: Termin[];
  blueprintFertigAm: string | null;
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
          pending={pending}
          fehler={fehler}
          onAufsetzen={(terminId) =>
            fuehreAus(() => sitzungAufsetzen(company.id, terminId))
          }
          onSofort={() => fuehreAus(() => terminUndSitzungAnlegen(company.id))}
        />
      </Rahmen>
    );
  }

  return (
    <Rahmen company={company} sitzungId={sitzung.id} vorbereitetAm={sitzung.vorbereitetAm}>
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
  vorbereitetAm,
  children,
}: {
  company: { id: string; name: string };
  sitzungId?: string | null;
  /** Gesetzt heißt: Die Vorbereitung ist durch, das Gespräch darf beginnen. */
  vorbereitetAm?: string | null;
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
              {/*
                Ohne Vorbereitung kein Gespräch.

                Das ist die teuerste Stunde, die wir verkaufen — und sie wird
                einmal gehalten. Wer unvorbereitet hineingeht, merkt im Termin,
                dass ein Posten nicht eingeordnet ist, und kann nichts mehr
                tun. Der Knopf bleibt deshalb zu, bis die Vorbereitung
                abgeschlossen ist; der Weg dorthin steht direkt darunter.
              */}
              {vorbereitetAm ? (
                <Link
                  href={`/admin/kunden/${company.id}/strategie/${sitzungId}/gespraech`}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#00b8ff]
                    text-[#041018] text-xs font-bold hover:bg-[#33c7ff] transition-colors"
                >
                  ▶ Gespräch führen
                </Link>
              ) : (
                <span
                  title="Erst die Vorbereitung abschließen — unten im Vorbereitungsgespräch."
                  className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#16283d]
                    text-[#4a5a70] text-xs font-bold cursor-not-allowed"
                >
                  ▶ Gespräch führen
                </span>
              )}
            </>
          )}

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
  pending,
  fehler,
  onAufsetzen,
  onSofort,
}: {
  company: { id: string };
  termine: Termin[];
  blueprintFertigAm: string | null;
  pending: boolean;
  fehler: string | null;
  onAufsetzen: (terminId: string) => void;
  /** Termin und Sitzung in einem Zug — für den Fall, dass beides fehlt. */
  onSofort: () => void;
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
          landete, sah nur zwei Stationen und hielt das
          Transformation Studio für verschwunden.
        */}
        <div className="mt-3 flex flex-wrap items-center gap-4">
          {termine.length === 0 && (
            <Link
              href={`/admin/kunden/${company.id}/termine`}
              className="text-[#5b6b7f] text-xs hover:text-[#c9d4e4] transition-colors"
            >
              Termin selbst anlegen →
            </Link>
          )}
        </div>
      </Karte>

      {/*
        Der kurze Weg.

        Ohne Strategietermin war hier Schluss: Das Haus hängt an einer
        Sitzung, die Sitzung an einem Termin, und der Termin wurde zwei
        Seiten weiter in einem Formular angelegt. Dreimal hintereinander
        sah es deshalb so aus, als gäbe es das Transformation Studio nicht
        mehr. Ein Knopf legt jetzt beides an.
      */}
      {termine.length === 0 && (
        <Karte titel="Gespräch aufsetzen">
          {!blueprintFertigAm ? (
            <p className="text-[#888] text-xs leading-relaxed">
              Erst der Blueprint. Ohne abgeschlossene Aufnahme gibt es keine Zahlen,
              aus denen das Haus entsteht.
            </p>
          ) : (
            <>
              <p className="text-[#888] text-xs leading-relaxed">
                Legt einen Strategietermin für die nächste volle Stunde an, erzeugt die
                Posten aus dem Blueprint und setzt die Sitzung auf. Danach steht das
                Haus — und der Termin lässt sich unter{" "}
                <Link
                  href={`/admin/kunden/${company.id}/termine`}
                  className="text-[#00b8ff] hover:underline"
                >
                  Termine
                </Link>{" "}
                auf den echten Zeitpunkt schieben.
              </p>
              <button
                onClick={onSofort}
                disabled={pending}
                className="mt-3 px-4 py-2.5 rounded-lg bg-[#00b8ff] text-[#041018] text-xs
                  font-bold disabled:bg-[#16283d] disabled:text-[#4a5a70] transition-colors"
              >
                {pending ? "Das Haus entsteht — das dauert ein paar Minuten …" : "Termin anlegen und Studio aufsetzen"}
              </button>
              {pending && (
                <p className="mt-2 text-[#5b6b7f] text-[11px] leading-relaxed">
                  Die Posten werden aus dem Blueprint erarbeitet und gegengeprüft.
                  Das Fenster darf dabei offen bleiben.
                </p>
              )}
            </>
          )}
        </Karte>
      )}

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
          ist, stehen oben <b className="text-[#c9d4e4]">⬡ Haus ansehen</b> für den
          Blick vorher und <b className="text-[#c9d4e4]">▶ Gespräch führen</b> für den
          Termin selbst — Haus, Gegenüber und Auswahl auf einer Fläche.
        </p>
      </Karte>

      {offen.length > 0 && (
        <Karte titel="Sitzung aufsetzen">
          <p className="text-[#888] text-xs leading-relaxed mb-3">
            Die Posten entstehen aus dem Blueprint und werden <b>abgeschrieben</b>: Was
            danach am Blueprint geändert wird, ändert nichts mehr an dem, was im Gespräch
            auf dem Tisch liegt. Beim ersten Mal dauert das ein paar Minuten.
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
                  disabled={pending}
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

/**
 * Die Vorbereitung ist ein Gespräch, keine Liste.
 *
 * Hier standen alle Posten als Karten untereinander, jede mit vier Knöpfen.
 * Das war eine Maske zum Abarbeiten und nichts, was beim Denken hilft: Man
 * klickt sich durch, ohne je zu besprechen, warum ein Posten passt.
 *
 * Geblieben ist eine Zeile mit dem Stand, darunter das Gespräch. Besprochen
 * wird dort, eingetragen wird von dort aus — der Chat kann Posten anlegen,
 * umschreiben, einordnen und die Grundlagen entscheiden. Die Zeile ist
 * seine Quittung: Was er gespeichert hat, steht oben.
 */
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
  const offen = stand.filter((p) => p.zustand === "kandidat").length;

  return (
    <div className="space-y-4">
      {fehler && <Fehlerzeile text={fehler} />}

      <div className="rounded-xl border border-[#1a2840] bg-[#0c1520] px-5 py-3.5">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
          {/* Der Stand in einer Zeile — mehr braucht es daneben nicht. */}
          <p className="text-[12.5px] text-[#8da3bd] leading-relaxed">
            <b className="text-[#f0f0f0]">{zusammen.gewaehlt}</b> gewählt
            <span className="text-[#33465e]"> · </span>
            <b className={pruefung.ok ? "text-[#f0f0f0]" : "text-[#f5a524]"}>
              {pruefung.gewaehlt} von {pruefung.grenze}
            </b>{" "}
            Automatisierungen
            <span className="text-[#33465e]"> · </span>
            {offen > 0 ? (
              <>
                <b className="text-[#f0f0f0]">{offen}</b> noch offen
              </>
            ) : (
              <span className="text-[#2ee6c5]">alles eingeordnet</span>
            )}
            <span className="text-[#33465e]"> · </span>
            {zusammen.aufwandGewaehltMinuten > 0 ? (
              <>
                <b className="text-[#f0f0f0]">
                  {alsStunden(zusammen.aufwandGewaehltMinuten)}
                </b>{" "}
                / Monat heute
              </>
            ) : (
              <span className="text-[#5b6b7f]">Aufwand noch nicht zugeordnet</span>
            )}
          </p>

          <div className="flex items-center gap-2 flex-shrink-0">
            {freigegeben ? (
              <>
                <span className="flex items-center gap-1.5 text-[#22c55e] text-xs font-semibold">
                  <ShieldCheck size={14} />
                  Freigegeben
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
                title={hindernisse.length > 0 ? hindernisse.join(" · ") : undefined}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#22c55e] text-[#041018] text-xs font-bold disabled:bg-[#16283d] disabled:text-[#4a5a70] disabled:cursor-not-allowed transition-colors"
              >
                {pending ? <Loader2 size={13} className="animate-spin" /> : <ShieldCheck size={13} />}
                Für den Kunden freigeben
              </button>
            )}
          </div>
        </div>

        {/*
          Was der Freigabe im Weg steht, gehört hierher — aber als Zeile,
          nicht als Kasten: Geklärt wird es unten im Gespräch.
        */}
        {!freigegeben && hindernisse.length > 0 && (
          <p className="mt-2 flex items-start gap-1.5 text-[#fbbf24]/90 text-[11px] leading-relaxed">
            <AlertTriangle size={12} className="flex-shrink-0 mt-[1px]" />
            <span>Vor der Freigabe: {hindernisse.join(" · ")}</span>
          </p>
        )}
        {pruefung.fehler.length > 0 && (
          <p className="mt-1.5 text-[#fca5a5] text-[11px] leading-relaxed">
            {pruefung.fehler.join(" · ")}
          </p>
        )}
      </div>
    </div>
  );
}


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

function Fehlerzeile({ text }: { text: string }) {
  return (
    <div className="px-4 py-3 rounded-lg bg-[rgba(239,68,68,0.1)] border border-[#ef4444]/25">
      <p className="text-[#fca5a5] text-xs">{text}</p>
    </div>
  );
}
