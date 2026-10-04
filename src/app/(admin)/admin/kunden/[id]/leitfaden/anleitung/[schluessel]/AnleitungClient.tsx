"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Sparkles, AlertTriangle, CheckCircle2 } from "lucide-react";
import type { Anleitung, Umsetzungsposten } from "@/lib/strategy-guide/types";

export default function AnleitungClient({
  companyId,
  companyName,
  sessionId,
  schluessel,
  posten,
  anleitung,
  erstelltAm,
  erstelltVon,
}: {
  companyId: string;
  companyName: string;
  sessionId: string;
  schluessel: string;
  posten: Umsetzungsposten;
  anleitung: Anleitung | null;
  erstelltAm: string | null;
  erstelltVon: string | null;
}) {
  const router = useRouter();
  const [laeuft, setLaeuft] = useState(false);
  const [wartet, setWartet] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);

  async function erzeugen() {
    setLaeuft(true);
    setWartet(false);
    setFehler(null);
    try {
      const res = await fetch("/api/admin/strategy-guide/anleitung", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, schluessel }),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(d.error ?? "Unbekannter Fehler");
      }
      if (!res.body) throw new Error("Keine Antwort vom Server");

      const leser = res.body.getReader();
      const dekoder = new TextDecoder();
      let rest = "";
      let fertig = false;
      for (;;) {
        const { done, value } = await leser.read();
        if (done) break;
        rest += dekoder.decode(value, { stream: true });
        const zeilen = rest.split("\n");
        rest = zeilen.pop() ?? "";
        for (const z of zeilen) {
          if (!z.trim()) continue;
          let e: { status?: string; error?: string };
          try {
            e = JSON.parse(z) as { status?: string; error?: string };
          } catch {
            continue;
          }
          if (e.status === "laeuft") setWartet(true);
          if (e.status === "fehler") throw new Error(e.error ?? "Fehlgeschlagen");
          if (e.status === "fertig") fertig = true;
        }
      }
      if (!fertig) throw new Error("Der Strom endete vorzeitig");
      router.refresh();
    } catch (e) {
      setFehler(e instanceof Error ? e.message : "Unbekannter Fehler");
    } finally {
      setLaeuft(false);
      setWartet(false);
    }
  }

  return (
    <div className="max-w-[900px] mx-auto space-y-5">
      <Link
        href={`/admin/kunden/${companyId}/leitfaden`}
        className="inline-flex items-center gap-2 text-[#8899b4] text-sm hover:text-[#c9d4e4] transition-colors"
      >
        <ArrowLeft size={14} /> Zurück zum Leitfaden
      </Link>

      <div>
        <p className="text-[#8899b4] text-xs font-semibold uppercase tracking-wider">
          {posten.block}
        </p>
        <h1 className="text-2xl font-bold text-[#f0f0f0] mt-1">{posten.titel}</h1>
        <p className="text-[#8899b4] text-sm mt-1">
          {companyName}
          {erstelltAm &&
            ` · Anleitung vom ${new Date(erstelltAm).toLocaleDateString("de-DE")}${erstelltVon ? `, ${erstelltVon}` : ""}`}
        </p>
        <p className="text-[#5b6b7f] text-xs mt-2 leading-relaxed">
          Anleitung für die Umsetzung. Nicht für das Kundengespräch — hier steht, in
          welcher Reihenfolge gearbeitet wird und woran es scheitert.
        </p>
      </div>

      <div className="bg-[#0a1119] border border-[#152031] rounded-xl p-5 space-y-2.5">
        <div>
          <p className="text-[#44546b] text-[10px] uppercase tracking-wider font-semibold">
            Befund
          </p>
          <p className="text-[#00b8ff] text-sm">{posten.befund}</p>
        </div>
        <div>
          <p className="text-[#44546b] text-[10px] uppercase tracking-wider font-semibold">
            Womit
          </p>
          <p className="text-[#c9d4e4] text-sm leading-relaxed">{posten.womit}</p>
        </div>
        <div>
          <p className="text-[#44546b] text-[10px] uppercase tracking-wider font-semibold">
            Einordnung
          </p>
          <p className="text-[#8899b4] text-sm leading-relaxed">{posten.einordnung}</p>
        </div>
      </div>

      {fehler && (
        <div className="bg-[#1a0b0b] border border-[#3d1414] rounded-xl p-4">
          <p className="text-[#f87171] text-sm">{fehler}</p>
        </div>
      )}

      <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-[#f0f0f0] font-semibold text-sm">
            {anleitung ? "Anleitung neu erzeugen" : "Anleitung erzeugen"}
          </p>
          <p className="text-[#8899b4] text-xs mt-1 leading-relaxed">
            Die Analyse liest denselben Fall wie der Leitfaden und schreibt die
            Schritte für die Umsetzung. Das dauert ein bis zwei Minuten.
          </p>
        </div>
        <button
          onClick={erzeugen}
          disabled={laeuft}
          className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#00b8ff]/10 border border-[#00b8ff]/25 text-[#00b8ff] text-sm hover:bg-[#00b8ff]/15 disabled:opacity-50 transition-colors"
        >
          {laeuft ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
          {wartet ? "Wird geschrieben…" : laeuft ? "Startet…" : anleitung ? "Neu erzeugen" : "Erzeugen"}
        </button>
      </div>

      {anleitung && (
        <div className="space-y-4">
          <section className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-6">
            <h2 className="text-[#f0f0f0] font-semibold text-sm mb-3">Ziel</h2>
            <p className="text-[#c9d4e4] text-sm leading-relaxed whitespace-pre-line">
              {anleitung.ziel}
            </p>
          </section>

          {anleitung.voraussetzungen.length > 0 && (
            <section className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-6">
              <h2 className="text-[#f0f0f0] font-semibold text-sm mb-3">
                Vorher geklärt sein muss
              </h2>
              <ul className="space-y-2">
                {anleitung.voraussetzungen.map((v, i) => (
                  <li key={i} className="text-[#c9d4e4] text-sm leading-relaxed flex gap-2.5">
                    <span className="text-[#44546b] flex-shrink-0">·</span>
                    {v}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-6">
            <h2 className="text-[#f0f0f0] font-semibold text-sm mb-4">Schritt für Schritt</h2>
            <div className="space-y-4">
              {anleitung.schritte.map((s, i) => (
                <div key={i} className="flex gap-3.5">
                  <span className="flex-shrink-0 w-6 h-6 rounded-md bg-[#00b8ff]/10 border border-[#00b8ff]/20 text-[#00b8ff] text-xs font-bold flex items-center justify-center mt-0.5">
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[#f0f0f0] text-sm font-semibold">{s.titel}</p>
                    <p className="text-[#c9d4e4] text-sm mt-1 leading-relaxed">{s.was}</p>
                    <div className="flex flex-wrap gap-x-5 gap-y-1 mt-2">
                      <p className="text-[#8899b4] text-xs">
                        <span className="text-[#44546b]">Wer: </span>
                        {s.wer}
                      </p>
                      <p className="text-[#8899b4] text-xs">
                        <span className="text-[#44546b]">Fertig, wenn: </span>
                        {s.ergebnis}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {anleitung.fallstricke.length > 0 && (
            <section className="bg-[#1a1407] border border-[#3d2f0b] rounded-xl p-6">
              <h2 className="text-[#d6c48a] font-semibold text-sm mb-3 flex items-center gap-2">
                <AlertTriangle size={15} className="text-[#f59e0b]" />
                Worauf es ankommt
              </h2>
              <ul className="space-y-2">
                {anleitung.fallstricke.map((f, i) => (
                  <li key={i} className="text-[#d6c48a] text-sm leading-relaxed flex gap-2.5">
                    <span className="text-[#8a7a3a] flex-shrink-0">·</span>
                    {f}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="bg-[#07160d] border border-[#0d3b1f] rounded-xl p-6">
            <h2 className="text-[#4ade80] font-semibold text-sm mb-3 flex items-center gap-2">
              <CheckCircle2 size={15} />
              Erledigt, wenn
            </h2>
            <p className="text-[#a7e8c0] text-sm leading-relaxed whitespace-pre-line">
              {anleitung.fertigWenn}
            </p>
          </section>
        </div>
      )}
    </div>
  );
}
