import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Check, FileText, Lock, X } from "lucide-react";
import { db } from "@/lib/db";
import { getActor } from "@/lib/auth-guards";
import { evaluateConsentState } from "@/lib/closing/consent";
import { verifySnapshotIntegrity, type ContractSnapshotData } from "@/lib/closing/snapshot";
import { getFrozenScript } from "@/lib/closing/script-service";
import { RECORDING_STATUS_LABELS, formatDuration } from "@/lib/closing/recording";
import { normalizeStatus, STATUS_LABELS } from "@/lib/closing/state-machine";
import { formatCents } from "@/lib/money";

/**
 * Audit-Ansicht eines Abschlusses.
 *
 * Read-only: Audit Events lassen sich hier weder bearbeiten noch löschen.
 * Korrekturen entstehen ausschließlich als Folgeevents.
 */
export default async function ClosingAuditPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const actor = await getActor();
  if (!actor) redirect("/login");
  if (actor.role !== "ADMIN" && actor.role !== "CLOSER") redirect("/dashboard");

  const session = await db.closingSession.findUnique({
    where: { id: sessionId },
    include: {
      company: true,
      closer: { select: { name: true, email: true } },
      contractSnapshot: true,
      recordings: { orderBy: { createdAt: "desc" } },
      certificates: { orderBy: { version: "desc" } },
      invoices: { orderBy: { createdAt: "desc" }, include: { paymentEvents: true } },
      events: { orderBy: { occurredAt: "desc" }, include: { actor: { select: { name: true } } } },
    },
  });
  if (!session) redirect("/admin/sales");
  if (actor.role === "CLOSER" && session.closerId !== actor.id) redirect("/admin/sales");

  const auditEvents = await db.consentAuditEvent.findMany({
    where: { closingSessionId: sessionId },
    orderBy: { serverTimestamp: "asc" },
  });
  const consentState = session.contractSnapshot
    ? await evaluateConsentState(sessionId)
    : null;
  const script = await getFrozenScript(sessionId);

  const data = session.contractSnapshot?.data as unknown as ContractSnapshotData | null;
  const integrityOk = data
    ? verifySnapshotIntegrity(data, session.contractSnapshot?.snapshotHash ?? null)
    : false;
  const status = normalizeStatus(session.status);
  const currency = data?.offer?.currency ?? "EUR";

  return (
    <div className="max-w-[1000px]">
      <Link
        href={`/admin/sales/closing/${sessionId}`}
        className="flex items-center gap-2 text-[#8899b4] hover:text-[#eef2f7] text-sm transition-colors mb-4"
      >
        <ArrowLeft size={14} /> Zurück zum Closing
      </Link>

      <div className="flex items-center gap-3 mb-1">
        <h1 className="text-2xl font-bold text-[#eef2f7]">Abschlussnachweis</h1>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-semibold bg-[#101c2e] text-[#8899b4] border border-[#1a2840]">
          <Lock size={10} /> read-only
        </span>
      </div>
      <p className="text-[#8899b4] text-sm mb-6">
        {session.company.name} · Status {STATUS_LABELS[status]} · Closer{" "}
        {session.closer.name ?? session.closer.email}
      </p>

      <div className="space-y-5">
        <Section title="Closing Session">
          <KV label="Session-ID" value={session.id} mono />
          <KV label="Status" value={STATUS_LABELS[status]} />
          {session.statusReason && <KV label="Begründung" value={session.statusReason} />}
          <KV label="Erstellt" value={session.createdAt.toLocaleString("de-DE")} />
          <KV
            label="Erklärungen bestätigt"
            value={session.consentsConfirmedAt?.toLocaleString("de-DE") ?? "—"}
          />
          <KV
            label="Vertrag abgeschlossen"
            value={session.contractClosedAt?.toLocaleString("de-DE") ?? "—"}
          />
          <KV
            label="Kunde aktiviert"
            value={session.activatedAt?.toLocaleString("de-DE") ?? "—"}
          />
          <KV
            label="Kundenzugang"
            value={
              session.tokenRevokedAt
                ? `widerrufen am ${session.tokenRevokedAt.toLocaleString("de-DE")}`
                : `gültig bis ${session.tokenExpiresAt.toLocaleString("de-DE")}`
            }
          />
        </Section>

        <Section title="Stammdaten-Snapshot">
          {data?.masterData ? (
            <>
              <KV label="Unternehmen" value={data.masterData.organizationName ?? "—"} />
              <KV label="Rechtsform" value={data.masterData.legalFormLabel ?? "—"} />
              <KV
                label="Anschrift"
                value={[
                  [data.masterData.address?.street, data.masterData.address?.houseNumber]
                    .filter(Boolean)
                    .join(" "),
                  [data.masterData.address?.postalCode, data.masterData.address?.city]
                    .filter(Boolean)
                    .join(" "),
                  data.masterData.address?.country,
                ]
                  .filter(Boolean)
                  .join(", ") || "—"}
              />
              <KV label="Handelnde Person" value={data.masterData.actingPerson?.fullName ?? "—"} />
              <KV label="Position" value={data.masterData.actingPerson?.position ?? "—"} />
              <KV label="E-Mail" value={data.masterData.actingPerson?.email ?? "—"} />
              <KV
                label="Register"
                value={
                  [data.masterData.registry?.registerCourt, data.masterData.registry?.registerNumber]
                    .filter(Boolean)
                    .join(" ") || "—"
                }
              />
              <KV label="USt-IdNr." value={data.masterData.registry?.vatId ?? "—"} />
            </>
          ) : (
            <p className="text-[#8899b4] text-sm">Noch kein Snapshot erzeugt.</p>
          )}
        </Section>

        <Section title="Contract Snapshot">
          {session.contractSnapshot ? (
            <>
              <KV label="Snapshot-ID" value={session.contractSnapshot.id} mono />
              <KV label="Eingefroren" value={session.contractSnapshot.frozenAt.toLocaleString("de-DE")} />
              <KV label="Hash" value={session.contractSnapshot.snapshotHash ?? "—"} mono />
              <div className="flex items-center gap-2 py-1.5">
                <span className="text-[#8899b4] text-xs w-[200px]">Integrität</span>
                <span
                  className={`text-xs font-semibold ${integrityOk ? "text-[#22c55e]" : "text-[#f87171]"}`}
                >
                  {integrityOk
                    ? "Daten stimmen mit dem gespeicherten Hash überein"
                    : "Hash stimmt nicht mit den gespeicherten Daten überein"}
                </span>
              </div>
              <KV label="Angebotsnummer" value={data?.offer?.offerNumber ?? "—"} />
              <KV label="Paket" value={data?.offer?.packageName ?? data?.offer?.packageType ?? "—"} />
              <KV
                label="Einmalig netto"
                value={formatCents(data?.offer?.oneTimeNetCents ?? 0, currency)}
              />
              <KV
                label="Brutto"
                value={formatCents(data?.offer?.oneTimeGrossCents ?? 0, currency)}
              />
              {data?.offer?.recurringNetCents ? (
                <KV
                  label="Laufend netto"
                  value={formatCents(data.offer.recurringNetCents, currency)}
                />
              ) : null}
              <KV label="Zahlungsart" value={data?.payment?.method ?? "—"} />
              <KV label="Zahlungsbedingungen" value={data?.payment?.terms ?? "—"} />
            </>
          ) : (
            <p className="text-[#8899b4] text-sm">Noch kein Snapshot erzeugt.</p>
          )}
        </Section>

        <Section title={`Elektronische Erklärungen (${auditEvents.length})`}>
          {auditEvents.length === 0 ? (
            <p className="text-[#8899b4] text-sm">Noch keine Erklärung protokolliert.</p>
          ) : (
            <div className="space-y-2.5">
              {auditEvents.map((event) => (
                <div
                  key={event.id}
                  className="px-4 py-3 rounded-lg border border-[#1a2840] bg-[#0a1119]"
                >
                  <div className="flex items-start gap-2.5">
                    {event.accepted ? (
                      <Check size={14} className="text-[#22c55e] mt-0.5 flex-shrink-0" />
                    ) : (
                      <X size={14} className="text-[#f87171] mt-0.5 flex-shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-[#c9d4e4] text-sm leading-relaxed">{event.checkboxText}</p>
                      <div className="mt-1.5 space-y-0.5">
                        <p className="text-[#5b6b7f] text-xs">
                          {event.consentType} · serverseitig{" "}
                          {event.serverTimestamp.toLocaleString("de-DE")} ({event.timezone})
                        </p>
                        {event.documentName && (
                          <p className="text-[#5b6b7f] text-xs">
                            {event.documentName} Version {event.documentVersionLabel}
                          </p>
                        )}
                        {event.documentSha256 && (
                          <p className="text-[#5b6b7f] text-xs font-mono break-all">
                            SHA-256 {event.documentSha256}
                          </p>
                        )}
                        <p className="text-[#5b6b7f] text-xs">
                          {event.organizationName} · {event.actingPersonName ?? "—"}
                          {event.actingPersonEmail && ` · ${event.actingPersonEmail}`}
                        </p>
                        {(event.ipAddress || event.userAgent) && (
                          <p className="text-[#4a5a70] text-xs truncate">
                            {event.ipAddress ?? ""}
                            {event.userAgent ? ` · ${event.userAgent}` : ""}
                          </p>
                        )}
                        {event.supersedesEventId && (
                          <p className="text-[#fbbf24] text-xs">
                            Korrektur zu {event.supersedesEventId}
                            {event.correctionReason && ` — ${event.correctionReason}`}
                          </p>
                        )}
                        <p className="text-[#4a5a70] text-xs font-mono break-all">
                          Event {event.id}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {consentState && !consentState.allRequiredConfirmed && (
            <p className="mt-3 text-[#fbbf24] text-xs">
              Noch offen:{" "}
              {consentState.consents
                .filter((c) => c.isRequired && !c.accepted)
                .map((c) => c.title)
                .join(", ")}
            </p>
          )}
        </Section>

        <Section title="Dokumentnachweise">
          {(data?.documents ?? []).length === 0 ? (
            <p className="text-[#8899b4] text-sm">Keine Dokumente im Snapshot.</p>
          ) : (
            <div className="space-y-2">
              {(data?.documents ?? []).map((doc) => (
                <div
                  key={doc.versionId}
                  className="flex flex-wrap items-center gap-3 px-4 py-3 rounded-lg border border-[#1a2840] bg-[#0a1119]"
                >
                  <FileText size={13} className="text-[#5b6b7f]" />
                  <span className="text-[#eef2f7] text-sm font-semibold">
                    {doc.name} — Version {doc.versionLabel}
                  </span>
                  <span className="text-[#5b6b7f] text-xs font-mono flex-1 break-all">
                    SHA-256 {doc.sha256 ?? "—"}
                  </span>
                  <a
                    href={`/api/admin/contract-documents/download?versionId=${doc.versionId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-lg border border-[#1a2840] text-[#8899b4] text-xs hover:text-[#eef2f7] transition-colors"
                  >
                    Öffnen
                  </a>
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section title="Gerendertes Closing-Script">
          {!script ? (
            <p className="text-[#8899b4] text-sm">Noch kein Script gerendert.</p>
          ) : (
            <div className="space-y-3">
              <p className="text-[#5b6b7f] text-xs">
                Gerendert am {new Date(script.renderedAt).toLocaleString("de-DE")} — exakt dieser
                Text wurde im Closing angezeigt.
              </p>
              {script.sections.map((section) => (
                <div
                  key={section.step}
                  className="px-4 py-3 rounded-lg border border-[#1a2840] bg-[#0a1119]"
                >
                  <p className="text-[#00b8ff] text-xs font-bold uppercase tracking-wider mb-1">
                    Schritt {section.step} · {section.kind} · {section.scriptKey} v
                    {section.scriptVersion}
                  </p>
                  <p className="text-[#c9d4e4] text-sm whitespace-pre-wrap leading-relaxed">
                    {section.text}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section title="Vertragsaufzeichnung">
          {session.recordings.length === 0 ? (
            <p className="text-[#8899b4] text-sm">Keine Aufzeichnung vorhanden.</p>
          ) : (
            session.recordings.map((recording) => (
              <div key={recording.id} className="mb-3 last:mb-0">
                <KV label="Recording-ID" value={recording.dailyRecordingId ?? recording.id} mono />
                <KV
                  label="Status"
                  value={RECORDING_STATUS_LABELS[recording.status] ?? recording.status}
                />
                <KV label="Start" value={recording.startedAt?.toLocaleString("de-DE") ?? "—"} />
                <KV label="Ende" value={recording.endedAt?.toLocaleString("de-DE") ?? "—"} />
                <KV label="Dauer" value={formatDuration(recording.durationSeconds)} />
                <KV label="Archiv-Referenz" value={recording.r2Key ? "privat archiviert" : "—"} />
                <KV label="SHA-256" value={recording.sha256 ?? "—"} mono />
                <KV
                  label="Verifiziert"
                  value={recording.verifiedAt?.toLocaleString("de-DE") ?? "—"}
                />
                <KV
                  label="Daily-Kopie"
                  value={
                    recording.dailyDeletedAt
                      ? `gelöscht am ${recording.dailyDeletedAt.toLocaleString("de-DE")}`
                      : recording.dailyDeleteAfter
                        ? `Schutzfrist bis ${recording.dailyDeleteAfter.toLocaleString("de-DE")}`
                        : "vorhanden"
                  }
                />
                {recording.lastError && (
                  <KV label="Letzter Fehler" value={recording.lastError} />
                )}
              </div>
            ))
          )}
        </Section>

        <Section title="Abschlussprotokoll">
          {session.certificates.length === 0 ? (
            <p className="text-[#8899b4] text-sm">Noch kein Protokoll erzeugt.</p>
          ) : (
            session.certificates.map((certificate) => (
              <div key={certificate.id} className="mb-3 last:mb-0">
                <KV label="Protokollnummer" value={certificate.certificateNumber} />
                <KV label="Version" value={String(certificate.version)} />
                <KV label="Erstellt" value={certificate.generatedAt.toLocaleString("de-DE")} />
                <KV label="PDF-Hash" value={certificate.sha256} mono />
                {certificate.documentId && (
                  <div className="pt-2">
                    <a
                      href={`/api/documents/read-url?documentId=${certificate.documentId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block px-3 py-1.5 rounded-lg border border-[#1a2840] text-[#8899b4] text-xs hover:text-[#eef2f7] transition-colors"
                    >
                      Protokoll öffnen
                    </a>
                  </div>
                )}
              </div>
            ))
          )}
        </Section>

        <Section title="Zahlung & Aktivierung">
          {session.invoices.length === 0 ? (
            <p className="text-[#8899b4] text-sm">Keine Rechnung vorhanden.</p>
          ) : (
            session.invoices.map((invoice) => (
              <div key={invoice.id} className="mb-4 last:mb-0">
                <KV label="Rechnungsnummer" value={invoice.invoiceNumber} />
                <KV label="Status" value={invoice.status} />
                <KV
                  label="Betrag brutto"
                  value={formatCents(
                    invoice.grossTotalCents ?? invoice.grossAmount,
                    invoice.currency
                  )}
                />
                <KV label="PDF-Hash" value={invoice.pdfSha256 ?? "—"} mono />
                {invoice.paymentEvents.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {invoice.paymentEvents.map((event) => (
                      <p key={event.id} className="text-[#5b6b7f] text-xs">
                        {event.occurredAt.toLocaleString("de-DE")} · {event.previousStatus} →{" "}
                        {event.newStatus} · Quelle {event.source}
                        {event.note && ` · ${event.note}`}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
          <KV
            label="Kundenaktivierung"
            value={
              session.company.activatedAt
                ? session.company.activatedAt.toLocaleString("de-DE")
                : "noch nicht aktiviert"
            }
          />
        </Section>

        <Section title={`Ereignisprotokoll (${session.events.length})`}>
          <div className="space-y-1.5">
            {session.events.map((event) => (
              <div
                key={event.id}
                className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 px-3 py-2 rounded-lg border border-[#1a2840] bg-[#0a1119]"
              >
                <span className="text-[#5b6b7f] text-xs font-mono w-[135px] flex-shrink-0">
                  {event.occurredAt.toLocaleString("de-DE")}
                </span>
                <span className="text-[#c9d4e4] text-xs font-semibold">{event.eventType}</span>
                {event.actor?.name && (
                  <span className="text-[#5b6b7f] text-xs">von {event.actor.name}</span>
                )}
                {event.reason && (
                  <span className="text-[#fbbf24] text-xs">Grund: {event.reason}</span>
                )}
              </div>
            ))}
          </div>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-[#1a2840] bg-[#0c1520] overflow-hidden">
      <div className="px-5 py-3.5 border-b border-[#1a2840]">
        <h2 className="text-[#eef2f7] text-sm font-bold">{title}</h2>
      </div>
      <div className="px-5 py-4">{children}</div>
    </section>
  );
}

function KV({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-4 gap-y-0.5 py-1.5 border-b border-[#141f31] last:border-0">
      <span className="text-[#8899b4] text-xs w-[200px] flex-shrink-0">{label}</span>
      <span className={`text-[#c9d4e4] text-xs flex-1 break-all ${mono ? "font-mono" : ""}`}>
        {value}
      </span>
    </div>
  );
}
