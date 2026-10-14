"use client";

import { useCallback, useState } from "react";
import type { StudioDaten } from "@/lib/strategie/studio";
import { Abschied, PlanSzene, WorkforceSzene } from "./raeume";
import { AblaufSzene, Aussen, Halle, RegalSzene, Schnitt, StudioMarke } from "./szenen";

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

type Ort =
  | "aussen"
  | "schnitt"
  | "halle"
  | "ablaeufe"
  | "grundlagen"
  | "automationen"
  | "workforce"
  | "plan"
  | "abschied";

export function Rundgang({
  daten,
  untertitel,
  fussnote,
}: {
  daten: StudioDaten;
  /** Die Branche, fürs Schild über dem Namen. */
  untertitel: string | null;
  /** Was im Schnitt unter dem Firmennamen steht. */
  fussnote: string;
}) {
  const [ort, setzeOrt] = useState<Ort>("aussen");

  const zurHalle = useCallback(() => setzeOrt("halle"), []);
  const inDenRaum = useCallback((key: string) => setzeOrt(key as Ort), []);

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
    <div className="fixed inset-0 z-[200] bg-[#02040a] text-[#eef3f9] overflow-hidden">
      {ort === "aussen" && (
        <Aussen
          haus={daten.haus}
          untertitel={untertitel}
          vorsatz="Vier Wochen Blueprint. Jetzt gehen wir gemeinsam hinein."
          onEintreten={() => setzeOrt("schnitt")}
        />
      )}

      {ort === "schnitt" && (
        <Schnitt firma={daten.haus.firma} fussnote={fussnote} onFertig={zurHalle} />
      )}

      {ort === "halle" && (
        <Halle
          haus={daten.haus}
          zeitfresser={daten.zeitfresser}
          onRaum={inDenRaum}
          onPlan={() => setzeOrt("plan")}
        />
      )}

      {ort === "ablaeufe" &&
        (ablauf ? (
          <AblaufSzene
            raum={ablauf}
            aufwandMinuten={daten.aufwandGesamtMinuten}
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
            onHinaus={() => setzeOrt("abschied")}
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
      className="fixed inset-0 overflow-hidden"
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
    <div className="fixed inset-0 grid place-items-center bg-[#040c18] px-6 text-center">
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
