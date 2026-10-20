"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { StudioDaten } from "@/lib/strategie/studio";
import type { AnsichtKey } from "@/lib/strategie/katalog";
import { Abschied, PlanSzene, WorkforceSzene } from "./raeume";
import { TaktGeber } from "./takt";
import { Aussen, RegalSzene, Schnitt, StudioMarke } from "./szenen";
import { WerkstattSzene } from "./werkstatt";
import { Flur, Foyer } from "./innenszenen";

/**
 * Der Rundgang durchs eigene Haus.
 *
 * Draußen → Tür → Schnitt → Halle → Räume. Die Eröffnung läuft **einmal**;
 * danach ist jeder Raum einen Klick entfernt. Das ist bewusst so: Ein
 * Rundgang, durch den man sich jedes Mal neu bewegen muss, kostet im Gespräch
 * genau die Zeit, die für das Gespräch gedacht war.
 *
 * Die Szenen selbst wissen nichts voneinander. Sie bekommen Daten und einen
 * Rückweg — damit später eine Szene gegen eine andere getauscht werden kann,
 * ohne dass der Rundgang sich ändert.
 */

/**
 * Wo man gerade steht.
 *
 * Bis auf `schnitt` sind das die Ansichten aus dem Katalog — denn genau die
 * stehen in der Datenbank, wenn beide Seiten am selben Ort stehen sollen.
 * Der Schnitt ist kein Ort, sondern der Weg hinein; er wird nicht
 * übertragen, sondern auf beiden Seiten gespielt.
 */
type Ort = AnsichtKey | "schnitt";

export function Rundgang({
  daten,
  untertitel,
  fussnote,
  ziel,
  gefuehrt = false,
  onOrt,
  stufe,
  onStufe,
  eingebettet = false,
}: {
  daten: StudioDaten;
  /** Die Branche, fürs Schild über dem Namen. */
  untertitel: string | null;
  /** Was im Schnitt unter dem Firmennamen steht. */
  fussnote: string;
  /**
   * Der Ort, an dem die Führung gerade steht.
   *
   * Ohne Angabe geht man allein durchs Haus. Mit Angabe folgt der Rundgang
   * ihr — aber nur, wenn `gefuehrt` gesetzt ist; sonst ist es bloß der
   * Startpunkt, etwa beim Wiedereinstieg nach einem Neuladen.
   */
  ziel?: AnsichtKey;
  /** Mitsehen statt gehen: Türen führen nirgendwohin. */
  gefuehrt?: boolean;
  /** Jeder eigene Schritt — die Führung gibt ihn weiter. */
  onOrt?: (ort: AnsichtKey) => void;
  /** Der Takt im Raum: 0 heute, 1 danach. Beim Mitsehen von außen gesetzt. */
  stufe?: number;
  /** Der eigene Knopfdruck — die Führung gibt ihn weiter. */
  onStufe?: (stufe: number) => void;
  /**
   * Im Gespräch steht der Rundgang in einer Fläche, nicht über allem.
   *
   * Als Vollbild deckt er Videobild und Gesprächsmaske zu — und genau die
   * braucht man daneben. Eingebettet füllt er seinen Platz und überlässt
   * dem Aufrufer die Anordnung.
   */
  eingebettet?: boolean;
}) {
  const [ort, setzeOrt] = useState<Ort>(ziel ?? "aussen");
  const [eigeneStufe, setzeEigeneStufe] = useState(0);

  /*
    Wer mitsieht, folgt — aber nicht ruckartig.

    Vom Vorplatz in die Halle führt der Weg durch den Schnitt. Käme der
    Kunde ohne ihn an, stünde er plötzlich in einem anderen Raum; mit ihm
    sieht er dasselbe wie der Berater. Alles andere ist ein Türwechsel und
    braucht keine Zwischenszene.

    Das steht hier im Rendern und nicht in einem Effekt: Der neue Ort kommt
    aus einer Eigenschaft, und React rechnet ihn so in demselben Durchgang
    fertig, statt den alten Raum erst zu zeigen und sofort zu ersetzen.
  */
  const [zuletzt, merke] = useState<AnsichtKey | undefined>(ziel);
  if (gefuehrt && ziel && ziel !== zuletzt) {
    merke(ziel);
    if (ort !== ziel && ort !== "schnitt") {
      setzeOrt(ort === "aussen" && ziel === "foyer" ? "schnitt" : ziel);
    }
  }

  /*
    Zwei Werte, die ein Timer braucht, ohne ihn neu zu starten.

    Der Schnitt läuft 2,6 Sekunden und beendet sich selbst. Käme sein
    Rückruf bei jedem Mitlesen frisch, würde die Uhr jedes Mal von vorn
    laufen und der Kunde käme nie in der Halle an.
  */
  const zielRef = useRef<AnsichtKey>(ziel ?? "aussen");
  const gefuehrtRef = useRef(gefuehrt);
  useEffect(() => {
    if (ziel) zielRef.current = ziel;
    gefuehrtRef.current = gefuehrt;
  }, [gefuehrt, ziel]);

  const schnittFertig = useCallback(
    () => setzeOrt(gefuehrtRef.current ? zielRef.current : "foyer"),
    []
  );

  /*
    Ein Schritt, den man selbst tut.

    Er wirkt sofort auf dem eigenen Bildschirm und wird weitergegeben. Wer
    mitsieht, tut gar keinen — dort führen die Türen bewusst nirgendwohin,
    damit nicht zwei Leute gleichzeitig durchs Haus laufen.
  */
  const gehe = useCallback(
    (wohin: AnsichtKey) => {
      if (gefuehrt) return;
      setzeOrt(wohin);
      setzeEigeneStufe(0);
      onOrt?.(wohin);
    },
    [gefuehrt, onOrt]
  );

  /*
    Der Takt im Raum.

    Wer mitsieht, bekommt ihn von außen; wer geht, setzt ihn selbst und gibt
    ihn weiter. Ein Ortswechsel stellt ihn zurück — jeder Raum fängt bei
    „heute" an, auch beim zweiten Besuch.
  */
  const takt = gefuehrt ? (stufe ?? 0) : eigeneStufe;
  const setzeTakt = useCallback(
    (wert: number) => {
      if (gefuehrt) return;
      setzeEigeneStufe(wert);
      onStufe?.(wert);
    },
    [gefuehrt, onStufe]
  );

  const zurHalle = useCallback(() => gehe("halle"), [gehe]);
  const inDenRaum = useCallback((key: string) => gehe(key as AnsichtKey), [gehe]);

  const ablauf = daten.ablaeufe[0] ?? null;
  const workforceRaum = daten.haus.raeume.find((r) => r.key === "workforce");
  const gewaehlt = daten.posten.filter((p) => p.zustand === "gewaehlt");

  return (
    /*
      Das Studio liegt über allem.

      Der Rundgang ist kein Bereich innerhalb einer Oberfläche, sondern ein
      Ort — wer darin steht, soll weder Seitenleiste noch Reiter sehen. Ohne
      die Schicht blitzt in der Vorschau der Admin-Rahmen durch und jeder
      Klick in der Halle landet womöglich in der Navigation dahinter.
    */
    <TaktGeber value={{ stufe: takt, setzeStufe: setzeTakt, gefuehrt }}>
    <div
      className={
        eingebettet
          ? "absolute inset-0 bg-[#02040a] text-[#eef3f9] overflow-hidden"
          : "fixed inset-0 z-[200] bg-[#02040a] text-[#eef3f9] overflow-hidden"
      }
    >
      {ort === "aussen" && (
        <Aussen
          haus={daten.haus}
          untertitel={untertitel}
          vorsatz={
            gefuehrt
              ? "Vier Wochen Blueprint. Gleich gehen Sie mit Ihrem Berater hinein."
              : "Vier Wochen Blueprint. Jetzt gehen wir gemeinsam hinein."
          }
          onEintreten={() => {
            if (gefuehrt) return;
            setzeOrt("schnitt");
            onOrt?.("foyer");
          }}
        />
      )}

      {ort === "schnitt" && (
        <Schnitt
          firma={daten.haus.firma}
          fussnote={fussnote}
          /*
            Der Schnitt landet dort, wo die Führung inzwischen steht. Zwei
            Sekunden Cutscene sind lang genug, dass der Berater in dieser
            Zeit schon eine Tür weiter sein kann.
          */
          onFertig={schnittFertig}
        />
      )}

      {ort === "foyer" && (
        <Foyer
          haus={daten.haus}
          zeitfresser={daten.zeitfresser}
          onWeiter={() => gehe("halle")}
        />
      )}

      {ort === "halle" && (
        <Flur
          raeume={daten.haus.raeume}
          onRaum={inDenRaum}
          onPlan={() => gehe("plan")}
          onZurueck={() => gehe("foyer")}
        />
      )}

      {ort === "ablaeufe" &&
        (ablauf ? (
          <WerkstattSzene
            raum={ablauf}
            aufwandMinuten={daten.aufwandGesamtMinuten}
            posten={daten.posten}
            onZurueck={zurHalle}
          />
        ) : (
          <LeererRaum
            titel="Hier ist noch nichts"
            text="Im Blueprint wurde kein Ablauf Station für Station durchgegangen."
            onZurueck={zurHalle}
          />
        ))}

      {ort === "grundlagen" && <RegalSzene regal={daten.regal} onZurueck={zurHalle} />}

      {ort === "automationen" && (
        <SockelSzene posten={daten.posten} onZurueck={zurHalle} />
      )}

      {ort === "workforce" &&
        (daten.workforce.length > 0 ? (
          <WorkforceSzene
            module={daten.workforce}
            gebucht={!workforceRaum?.verschlossen}
            onZurueck={zurHalle}
          />
        ) : (
          <LeererRaum
            titel="OKUN Workforce"
            text="Zum gebuchten Paket ist kein Leistungsumfang hinterlegt."
            onZurueck={zurHalle}
          />
        ))}

      {ort === "plan" &&
        (daten.plan.length > 0 ? (
          <PlanSzene
            plan={daten.plan}
            gewaehlt={gewaehlt}
            onZurueck={zurHalle}
            onHinaus={() => gehe("abschied")}
          />
        ) : (
          <LeererRaum
            titel="Ihr Plan"
            text="Zum gebuchten Paket ist kein Projektablauf hinterlegt."
            onZurueck={zurHalle}
          />
        ))}

      {ort === "abschied" && (
        <Abschied
          haus={daten.haus}
          untertitel={untertitel}
          gewaehlt={gewaehlt.length}
          onZurueck={zurHalle}
        />
      )}

      {ort !== "aussen" && ort !== "schnitt" && ort !== "abschied" && <StudioMarke />}
    </div>
    </TaktGeber>
  );
}

// ─── Der Automationsraum ─────────────────────────────────────────────────────

/**
 * Drei Sockel, von denen zwei besetzt sind.
 *
 * Dieselbe Auswahl wie in der Vorbereitung, nur als Raum. Was der Berater
 * ausgeblendet hat, steht hier gar nicht — und ein leerer Sockel sagt
 * deutlicher als jeder Satz, dass noch ein Platz frei ist.
 */
function SockelSzene({
  posten,
  onZurueck,
}: {
  posten: StudioDaten["posten"];
  onZurueck: () => void;
}) {
  const automationen = posten.filter((p) => p.art === "automatisierung");
  const gewaehlt = automationen.filter((p) => p.zustand === "gewaehlt");
  const offen = automationen.filter((p) => p.zustand !== "gewaehlt");
  const plaetze = [0, 1, 2];

  return (
    <div
      className="absolute inset-0 overflow-hidden"
      style={{ background: "radial-gradient(90% 80% at 50% 8%,#0a1f36,#040c18 58%,#02060e 100%)" }}
    >
      <button
        onClick={onZurueck}
        className="absolute left-6 top-6 z-20 flex items-center gap-2 px-4 py-2.5 rounded-full
          bg-[rgba(10,22,38,.8)] border border-[rgba(0,184,255,.2)] text-[#90a6c0] text-xs
          backdrop-blur hover:text-[#eef3f9] transition-colors"
      >
        ← Eingangshalle
      </button>

      <div
        className="absolute inset-x-0 top-[8%] text-center px-6"
        style={{ animation: "studio-auf .8s cubic-bezier(.2,.85,.25,1) both" }}
      >
        <p className="font-mono text-[9px] uppercase tracking-[0.26em] text-[#3a4f68] font-semibold">
          Bewährte Automationen
        </p>
        <h2 className="mt-2.5 text-[clamp(21px,2.5vw,34px)] font-bold tracking-[-0.02em]">
          Drei Sockel, drei Plätze
        </h2>
        <p className="mt-2.5 mx-auto max-w-[58ch] text-[#90a6c0] text-[12.5px]">
          Ihr Paket enthält bis zu drei. {gewaehlt.length} {gewaehlt.length === 1 ? "ist" : "sind"} vergeben.
        </p>
      </div>

      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[44%] flex gap-7 px-6">
        {plaetze.map((i) => {
          const p = gewaehlt[i];
          return (
            <div
              key={i}
              className={`w-[254px] rounded-2xl border p-5 min-h-[232px] flex flex-col ${
                p
                  ? "border-[rgba(0,184,255,.35)] bg-[linear-gradient(165deg,rgba(10,32,52,.9),rgba(5,14,26,.92))]"
                  : "border-dashed border-[#1f3a5c] bg-[rgba(255,255,255,.015)]"
              }`}
              style={{ animation: `studio-pop .8s cubic-bezier(.2,1.05,.3,1) ${0.25 + i * 0.12}s both` }}
            >
              <span className="font-mono text-[9px] tracking-[0.18em] text-[#4d93ba]">
                PLATZ {i + 1}
              </span>
              {p ? (
                <>
                  <b className="mt-3 text-[15px] font-semibold leading-snug">{p.titel}</b>
                  {p.befund && (
                    <p className="mt-2 text-[11.5px] text-[#90a6c0] leading-relaxed">{p.befund}</p>
                  )}
                  {p.womit && (
                    <p className="mt-auto pt-3 text-[11px] text-[#52687f]">
                      <span className="text-[#3a4f68]">Womit: </span>
                      {p.womit}
                    </p>
                  )}
                </>
              ) : (
                <p className="m-auto text-[12px] text-[#3a4f68]">frei</p>
              )}
            </div>
          );
        })}
      </div>

      {offen.length > 0 && (
        <div className="absolute inset-x-0 bottom-[9%] text-center px-6">
          <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#3a4f68] mb-3">
            Steht auch zur Wahl
          </p>
          <div className="flex gap-2.5 justify-center flex-wrap">
            {offen.map((p) => (
              <span
                key={p.id}
                className="px-3.5 py-2 rounded-xl border border-[#1f3a5c] bg-[rgba(255,255,255,.02)] text-[12px]"
              >
                {p.titel}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function LeererRaum({
  titel,
  text,
  onZurueck,
}: {
  titel: string;
  text: string;
  onZurueck: () => void;
}) {
  return (
    <div className="absolute inset-0 grid place-items-center bg-[#040c18] px-6 text-center">
      <div>
        <h2 className="text-2xl font-bold">{titel}</h2>
        <p className="mt-3 text-[#90a6c0] text-sm max-w-[44ch]">{text}</p>
        <button
          onClick={onZurueck}
          className="mt-7 px-5 py-2.5 rounded-full border border-[rgba(0,184,255,.3)] text-[#90a6c0]
            text-xs hover:text-[#eef3f9] transition-colors"
        >
          ← Eingangshalle
        </button>
      </div>
    </div>
  );
}
