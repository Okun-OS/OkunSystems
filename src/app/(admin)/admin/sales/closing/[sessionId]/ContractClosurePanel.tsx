"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  Check,
  FileCheck2,
  FileText,
  Loader2,
  Lock,
  Radio,
  RefreshCw,
  Receipt,
  ShieldCheck,
  Square,
} from "lucide-react";
import {
  finishContract,
  refreshRenderedScript,
  retryRecordingMigration,
  startContractClosure,
  startContractRecording,
  stopContractRecording,
} from "../portal-actions";
import { Teleprompter, type ScriptSection } from "./Teleprompter";

/**
 * Geführter Vertragsabschluss für den Closer.
 *
 * Jeder Schritt wird serverseitig freigegeben: der Snapshot friert die
 * Vertragsdaten ein, die Aufzeichnung wird erst nach protokollierter
 * Einwilligung freigegeben, das Abschlussprotokoll entsteht automatisch.
 */

export type ClosureConsent = {
  definitionId: string;
  title: string;
  checkboxText: string;
  consentType: string;
  isRequired: boolean;
  accepted: boolean;
  acceptedAt: string | null;
  documentName: string | null;
  documentVersion: string | null;
  documentSha256: string | null;
};

export type ClosureRecording = {
  id: string;
  status: string;
  statusLabel: string;
  startedAt: string | null;
  endedAt: string | null;
  duration: string;
  sha256: string | null;
  lastError: string | null;
  migrationAttempts: number;
};

export type ContractClosureData = {
  sessionId: string;
  companyId: string;
  status: string;
  statusLabel: string;
  masterDataComplete: boolean;
  masterDataMissing: Array<{ key: string; label: string }>;
  snapshotId: string | null;
  snapshotHash: string | null;
  offerSelected: boolean;
  consents: ClosureConsent[];
  allRequiredConfirmed: boolean;
  recordingConsentConfirmed: boolean;
  recordingRelease: { released: boolean; reasons: string[] };
  script: ScriptSection[];
  scriptUnresolved: string[];
  recording: ClosureRecording | null;
  certificate: { number: string; version: number; sha256: string; generatedAt: string } | null;
  invoice: { id: string; number: string; status: string; grossTotal: string } | null;
  clientUrlHint: string | null;
};

export function ContractClosurePanel({ data }: { data: ContractClosureData }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function run(fn: () => Promise<{ error?: string } | Record<string, unknown>>, success?: string) {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const result = (await fn()) as { error?: string } & Record<string, unknown>;
      if (result?.error) {
        setError(String(result.error));
        if (Array.isArray(result.reasons)) {
          setError(`${result.error} ${(result.reasons as string[]).join(" ")}`);
        }
        return;
      }
      if (typeof result?.certificateError === "string") {
        setNotice(`Vertrag abgeschlossen. Hinweis zum Protokoll: ${result.certificateError}`);
      } else if (typeof result?.migrationError === "string") {
        setNotice(
          `Aufzeichnung beendet. Die Archivierung ist fehlgeschlagen: ${result.migrationError}`
        );
      } else if (success) {
        setNotice(success);
      }
      router.refresh();
    });
  }

  const stage = deriveStage(data);

  return (
    <div className="space-y-5">
      {error && (
        <div className="px-4 py-3 rounded-lg bg-[rgba(239,68,68,0.1)] border border-[#ef4444]/25 text-[#fca5a5] text-sm">
          {error}
        </div>
      )}
      {notice && (
        <div className="px-4 py-3 rounded-lg bg-[rgba(245,158,11,0.1)] border border-[#f59e0b]/25 text-[#fbbf24] text-sm">
          {notice}
        </div>
      )}

      <ol className="flex flex-wrap gap-2">
        {STAGES.map((s, i) => (
          <li
            key={s.key}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${
              i < stage
                ? "border-[#22c55e]/30 bg-[rgba(34,197,94,0.1)] text-[#22c55e]"
                : i === stage
                  ? "border-[#00b8ff]/40 bg-[rgba(0,184,255,0.12)] text-[#00b8ff]"
                  : "border-[#1a2840] text-[#5b6b7f]"
            }`}
          >
            {i < stage ? <Check size={11} /> : <span className="font-mono">{i + 1}</span>}
            {s.label}
          </li>
        ))}
      </ol>

      {/* Schritt 1 — Stammdaten & Snapshot */}
      <Card
        title="1 · Vertragsdaten einfrieren"
        subtitle="Erzeugt den Contract Snapshot. Danach ändern spätere Anpassungen an Paket, Preis, Stammdaten oder Dokumenten diesen Abschluss nicht mehr."
      >
        {!data.masterDataComplete && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-[rgba(245,158,11,0.08)] border border-[#f59e0b]/25">
            <p className="text-[#fbbf24] text-sm font-semibold mb-1.5">
              Für den Vertragsabschluss fehlen noch folgende Angaben:
            </p>
            <ul className="text-[#fbbf24] text-xs list-disc list-inside space-y-0.5">
              {data.masterDataMissing.map((m) => (
                <li key={m.key}>{m.label}</li>
              ))}
            </ul>
            <Link
              href={`/admin/sales/leads/${data.companyId}#stammdaten`}
              className="inline-block mt-2.5 text-xs font-semibold text-[#00b8ff] hover:underline"
            >
              Stammdaten jetzt ergänzen →
            </Link>
          </div>
        )}

        {data.snapshotId ? (
          <div className="space-y-2">
            <KeyValue label="Snapshot" value={data.snapshotId} mono />
            <KeyValue label="Snapshot-Hash" value={data.snapshotHash ?? "—"} mono />
            <p className="text-[#22c55e] text-xs font-semibold flex items-center gap-1.5 pt-1">
              <Lock size={12} /> Vertragsdaten sind eingefroren.
            </p>
          </div>
        ) : (
          <button
            onClick={() => run(() => startContractClosure(data.sessionId), "Vertragsdaten eingefroren.")}
            disabled={pending || !data.masterDataComplete || !data.offerSelected}
            className="px-5 py-2.5 rounded-lg bg-[#00b8ff] text-[#041018] text-sm font-bold hover:bg-[#0099d6] disabled:bg-[#16283d] disabled:text-[#4a5a70] disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {pending && <Loader2 size={14} className="animate-spin" />}
            Vertragsabschluss starten
          </button>
        )}
        {!data.offerSelected && (
          <p className="mt-2 text-[#8899b4] text-xs">
            Bitte zuerst im Tab &bdquo;Angebot&ldquo; ein Paket auswählen und präsentieren.
          </p>
        )}
      </Card>

      {/* Schritt 2 — Erklärungen */}
      {data.snapshotId && (
        <Card
          title="2 · Elektronische Erklärungen"
          subtitle="Der Kunde bestätigt in seinem Portal. Jede Erklärung wird serverseitig mit Wortlaut, Zeitstempel und Dokument-Hash protokolliert."
        >
          <div className="space-y-2.5">
            {data.consents.map((consent) => (
              <div
                key={consent.definitionId}
                className="px-4 py-3 rounded-lg border border-[#1a2840] bg-[#0a1119]"
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`mt-0.5 w-4 h-4 rounded flex-shrink-0 flex items-center justify-center ${
                      consent.accepted ? "bg-[#22c55e]" : "border border-[#2a3a55]"
                    }`}
                  >
                    {consent.accepted && (
                      <Check size={10} className="text-[#041018]" strokeWidth={3} />
                    )}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[#c9d4e4] text-sm leading-relaxed">
                      {consent.checkboxText}
                    </p>
                    <p className="text-[#5b6b7f] text-xs mt-1">
                      {consent.documentName
                        ? `${consent.documentName} Version ${consent.documentVersion}`
                        : "ohne Dokumentbezug"}
                      {consent.isRequired ? " · erforderlich" : " · optional"}
                      {consent.acceptedAt &&
                        ` · bestätigt ${new Date(consent.acceptedAt).toLocaleString("de-DE")}`}
                    </p>
                  </div>
                </div>
              </div>
            ))}
            {data.consents.length === 0 && (
              <p className="text-[#8899b4] text-sm">
                Es ist keine Erklärung konfiguriert. Bitte unter{" "}
                <Link
                  href="/admin/einstellungen/erklaerungen"
                  className="text-[#00b8ff] hover:underline"
                >
                  Einstellungen → Erklärungen
                </Link>{" "}
                anlegen.
              </p>
            )}
          </div>

          {data.clientUrlHint && !data.allRequiredConfirmed && (
            <p className="mt-3 text-[#8899b4] text-xs">
              Der Kunde bestätigt über seinen Closing-Link. Der Stand aktualisiert sich
              automatisch.
            </p>
          )}
        </Card>
      )}

      {/* Schritt 3 — Script & Aufzeichnung */}
      {data.snapshotId && data.allRequiredConfirmed && (
        <Card
          title="3 · Vertragsaufzeichnung"
          subtitle="Das Script ist mit den eingefrorenen Vertragsdaten gerendert und im Snapshot gespeichert."
          action={
            <button
              onClick={() =>
                run(() => refreshRenderedScript(data.sessionId), "Script neu gerendert.")
              }
              disabled={pending || data.recording?.status === "recording"}
              className="flex items-center gap-1.5 text-xs text-[#8899b4] hover:text-[#eef2f7] disabled:opacity-40 transition-colors"
              title="Script neu rendern (nur vor Beginn der Aufzeichnung sinnvoll)"
            >
              <RefreshCw size={12} />
              Script neu rendern
            </button>
          }
        >
          {!data.recordingRelease.released && data.recording?.status !== "recording" && (
            <div className="mb-4 px-4 py-3 rounded-lg bg-[rgba(245,158,11,0.08)] border border-[#f59e0b]/25">
              <p className="text-[#fbbf24] text-sm font-semibold mb-1">
                Die Aufzeichnung ist noch nicht freigegeben:
              </p>
              <ul className="text-[#fbbf24] text-xs list-disc list-inside space-y-0.5">
                {data.recordingRelease.reasons.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="mb-5">
            <Teleprompter sections={data.script} />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {data.recording?.status === "recording" ? (
              <>
                <span className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[rgba(239,68,68,0.12)] border border-[#ef4444]/30 text-[#fca5a5] text-sm font-semibold">
                  <Radio size={14} className="animate-pulse-accent" />
                  Aufzeichnung läuft
                </span>
                <button
                  onClick={() =>
                    run(() => stopContractRecording(data.sessionId), "Aufzeichnung beendet.")
                  }
                  disabled={pending}
                  className="px-5 py-2.5 rounded-lg bg-[#ef4444] text-white text-sm font-bold hover:bg-[#dc2626] disabled:opacity-50 transition-colors flex items-center gap-2"
                >
                  {pending ? <Loader2 size={14} className="animate-spin" /> : <Square size={13} />}
                  Aufzeichnung beenden
                </button>
              </>
            ) : (
              <button
                onClick={() =>
                  run(() => startContractRecording(data.sessionId), "Aufzeichnung gestartet.")
                }
                disabled={pending || !data.recordingRelease.released}
                className="px-5 py-2.5 rounded-lg bg-[#00b8ff] text-[#041018] text-sm font-bold hover:bg-[#0099d6] disabled:bg-[#16283d] disabled:text-[#4a5a70] disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {pending ? <Loader2 size={14} className="animate-spin" /> : <Radio size={13} />}
                Vertragsaufzeichnung starten
              </button>
            )}
          </div>

          {data.recording && (
            <div className="mt-4 space-y-2 pt-4 border-t border-[#141f31]">
              <KeyValue label="Status" value={data.recording.statusLabel} />
              <KeyValue label="Dauer" value={data.recording.duration} />
              {data.recording.sha256 && (
                <KeyValue label="SHA-256" value={data.recording.sha256} mono />
              )}
              {data.recording.status === "migration_failed" && (
                <div className="mt-3 px-4 py-3 rounded-lg bg-[rgba(239,68,68,0.1)] border border-[#ef4444]/25">
                  <p className="text-[#fca5a5] text-sm font-semibold flex items-center gap-1.5">
                    <AlertTriangle size={13} /> Archivierung fehlgeschlagen
                  </p>
                  <p className="text-[#fca5a5] text-xs mt-1">{data.recording.lastError}</p>
                  <p className="text-[#fca5a5] text-xs mt-1">
                    Die Aufzeichnung bei Daily.co wurde nicht gelöscht. Versuche:{" "}
                    {data.recording.migrationAttempts}
                  </p>
                  <button
                    onClick={() =>
                      run(
                        () => retryRecordingMigration(data.recording!.id),
                        "Archivierung erfolgreich."
                      )
                    }
                    disabled={pending}
                    className="mt-2.5 px-3 py-1.5 rounded-lg bg-[#ef4444] text-white text-xs font-bold hover:bg-[#dc2626] disabled:opacity-50"
                  >
                    Archivierung erneut versuchen
                  </button>
                </div>
              )}
            </div>
          )}
        </Card>
      )}

      {/* Schritt 4 — Abschluss & Protokoll */}
      {data.snapshotId && data.allRequiredConfirmed && (
        <Card
          title="4 · Abschluss & Protokoll"
          subtitle="Schließt den Vertrag ab und erzeugt das elektronische Abschlussprotokoll."
        >
          {data.certificate ? (
            <div className="space-y-2">
              <p className="text-[#22c55e] text-sm font-semibold flex items-center gap-1.5">
                <FileCheck2 size={14} /> Abschlussprotokoll {data.certificate.number}
                {data.certificate.version > 1 && ` (Version ${data.certificate.version})`}
              </p>
              <KeyValue label="Erstellt" value={data.certificate.generatedAt} />
              <KeyValue label="PDF-Hash" value={data.certificate.sha256} mono />
            </div>
          ) : (
            <button
              onClick={() => run(() => finishContract(data.sessionId))}
              disabled={pending || data.recording?.status === "recording"}
              className="px-5 py-2.5 rounded-lg bg-[#22c55e] text-[#041018] text-sm font-bold hover:bg-[#16a34a] disabled:bg-[#16283d] disabled:text-[#4a5a70] disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {pending ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
              Vertrag abschließen &amp; Protokoll erzeugen
            </button>
          )}
        </Card>
      )}

      {/* Schritt 5 — Rechnung */}
      {data.certificate && (
        <Card
          title="5 · Rechnung"
          subtitle="Die Rechnung übernimmt Kunde, Rechnungsanschrift, Paket und Zusatzleistungen aus dem eingefrorenen Vertragsstand."
        >
          {data.invoice ? (
            <div className="flex flex-wrap items-center gap-4">
              <div>
                <p className="text-[#eef2f7] text-sm font-bold">{data.invoice.number}</p>
                <p className="text-[#8899b4] text-xs">
                  {data.invoice.grossTotal} · {data.invoice.status}
                </p>
              </div>
              <Link
                href={`/admin/sales/rechnungen/${data.invoice.id}`}
                className="px-4 py-2 rounded-lg border border-[#1a2840] text-[#8899b4] text-sm hover:text-[#eef2f7] hover:border-[#2a3a55] transition-colors flex items-center gap-2"
              >
                <FileText size={13} /> Rechnung öffnen
              </Link>
            </div>
          ) : (
            <Link
              href={`/admin/sales/rechnungen/neu?closingSessionId=${data.sessionId}`}
              className="inline-flex px-5 py-2.5 rounded-lg bg-[#00b8ff] text-[#041018] text-sm font-bold hover:bg-[#0099d6] transition-colors items-center gap-2"
            >
              <Receipt size={14} /> Rechnung erstellen
            </Link>
          )}
        </Card>
      )}
    </div>
  );
}

const STAGES = [
  { key: "freeze", label: "Vertragsdaten einfrieren" },
  { key: "consent", label: "Erklärungen" },
  { key: "recording", label: "Aufzeichnung" },
  { key: "certificate", label: "Protokoll" },
  { key: "invoice", label: "Rechnung" },
] as const;

function deriveStage(data: ContractClosureData): number {
  if (data.invoice) return 5;
  if (data.certificate) return 4;
  if (data.recording?.status === "archived" || data.recording?.status === "stopped") return 3;
  if (data.allRequiredConfirmed) return 2;
  if (data.snapshotId) return 1;
  return 0;
}

function Card({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-[#1a2840] bg-[#0c1520] overflow-hidden">
      <div className="px-5 py-4 border-b border-[#1a2840] flex items-start justify-between gap-4">
        <div>
          <h3 className="text-[#eef2f7] text-sm font-bold">{title}</h3>
          {subtitle && <p className="text-[#8899b4] text-xs mt-1 max-w-2xl">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="px-5 py-5">{children}</div>
    </section>
  );
}

function KeyValue({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-[#8899b4] text-xs">{label}</span>
      <span
        className={`text-[#c9d4e4] text-xs text-right break-all ${mono ? "font-mono" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}
