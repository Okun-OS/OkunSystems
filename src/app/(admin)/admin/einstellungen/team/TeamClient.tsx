"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Copy, KeyRound, Plus, ShieldCheck, UserPlus } from "lucide-react";
import { isFailure } from "@/lib/action-result";
import {
  Banner,
  Field,
  GhostButton,
  Panel,
  Pill,
  PrimaryButton,
  inputClass,
} from "@/components/ui/admin-form";
import {
  createTeamMember,
  resendTeamSetupLink,
  setTeamMemberActive,
  updateTeamMember,
} from "./actions";

/**
 * Interne Benutzer.
 *
 * ADMIN sieht und verwaltet alles. CLOSER arbeitet ausschließlich im
 * Sales-/Closing-Bereich und dort nur an den ihm zugewiesenen Leads und
 * Closings — die Einschränkung wird serverseitig geprüft, nicht nur im Menü.
 */

export type TeamMember = {
  id: string;
  name: string | null;
  email: string;
  role: string;
  pendingSetup: boolean;
  active: boolean;
  deactivatedAt: string | null;
  createdAt: string;
  closingCount: number;
  leadCount: number;
};

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrator",
  CLOSER: "Closer",
};

const ROLE_HINTS: Record<string, string> = {
  ADMIN: "Voller Zugriff inklusive Einstellungen, Vorlagen, Rechnungen und Kundenverwaltung.",
  CLOSER:
    "Nur Sales & Closing: eigene Leads, eigene Closings, Vertragsabschluss, Aufzeichnung, Abschlussnachweis und Rechnungen daraus.",
};

export function TeamClient({
  members,
  currentUserId,
}: {
  members: TeamMember[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ kind: "error" | "success" | "info"; text: string } | null>(null);
  const [setupLink, setSetupLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);

  function run(fn: () => Promise<unknown>, success: string) {
    setMessage(null);
    setSetupLink(null);
    startTransition(async () => {
      const result = await fn();
      if (isFailure(result as object)) {
        setMessage({ kind: "error", text: (result as { error: string }).error });
        return;
      }
      const r = result as { setupUrl?: string; emailed?: boolean };
      if (r.setupUrl) {
        setSetupLink(r.setupUrl);
        setMessage({
          kind: r.emailed ? "success" : "info",
          text: r.emailed
            ? `${success} Eine E-Mail zur Passwortvergabe wurde versendet.`
            : `${success} Die E-Mail konnte nicht versendet werden — bitte den Link unten weitergeben.`,
        });
      } else {
        setMessage({ kind: "success", text: success });
      }
      setShowNew(false);
      setEditing(null);
      router.refresh();
    });
  }

  const closers = members.filter((m) => m.role === "CLOSER");
  const admins = members.filter((m) => m.role === "ADMIN");

  return (
    <div className="max-w-[960px]">
      <Link
        href="/admin/einstellungen"
        className="flex items-center gap-2 text-[#8899b4] hover:text-[#eef2f7] text-sm transition-colors mb-4"
      >
        <ArrowLeft size={14} /> Zurück zu den Einstellungen
      </Link>

      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#eef2f7] mb-1">Team &amp; Closer</h1>
          <p className="text-[#8899b4] text-sm max-w-2xl">
            Interne Zugänge. Ein Closer sieht ausschließlich den Sales- und Closing-Bereich und
            dort nur die ihm zugewiesenen Leads und Closings.
          </p>
        </div>
        <PrimaryButton
          onClick={() => setShowNew((v) => !v)}
          className="flex items-center gap-2 flex-shrink-0"
        >
          <UserPlus size={14} /> Benutzer anlegen
        </PrimaryButton>
      </div>

      {message && (
        <div className="mb-4">
          <Banner kind={message.kind}>{message.text}</Banner>
        </div>
      )}

      {setupLink && (
        <div className="mb-5 px-4 py-3 rounded-lg border border-[#00b8ff]/25 bg-[rgba(0,184,255,0.06)]">
          <p className="text-[#7dd3fc] text-xs font-semibold uppercase tracking-wider mb-2">
            Einrichtungslink (7 Tage gültig)
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs font-mono text-[#eef2f7] truncate bg-[#080d14] px-2 py-1.5 rounded">
              {setupLink}
            </code>
            <GhostButton
              onClick={() => {
                void navigator.clipboard.writeText(setupLink);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="!px-3 !py-1.5 !text-xs flex-shrink-0"
            >
              <span className="flex items-center gap-1.5">
                <Copy size={11} /> {copied ? "Kopiert" : "Kopieren"}
              </span>
            </GhostButton>
          </div>
        </div>
      )}

      {showNew && (
        <div className="mb-5">
          <Panel title="Neuen internen Benutzer anlegen">
            <form
              action={(fd) => run(() => createTeamMember(fd), "Benutzer angelegt.")}
              className="space-y-4"
            >
              <div className="grid sm:grid-cols-3 gap-4">
                <Field label="Name" required>
                  <input name="name" required className={inputClass} placeholder="Vor- und Nachname" />
                </Field>
                <Field label="E-Mail" required>
                  <input name="email" type="email" required className={inputClass} />
                </Field>
                <Field label="Rolle" required>
                  <select name="role" defaultValue="CLOSER" className={inputClass}>
                    <option value="CLOSER">Closer</option>
                    <option value="ADMIN">Administrator</option>
                  </select>
                </Field>
              </div>
              <p className="text-[#5b6b7f] text-xs">
                Es wird kein Passwort vergeben. Der Benutzer erhält einen Einrichtungslink und
                setzt sein Passwort selbst.
              </p>
              <div className="flex gap-2">
                <PrimaryButton type="submit" disabled={pending} className="flex items-center gap-2">
                  <Plus size={13} /> Anlegen und einladen
                </PrimaryButton>
                <GhostButton type="button" onClick={() => setShowNew(false)}>
                  Abbrechen
                </GhostButton>
              </div>
            </form>
          </Panel>
        </div>
      )}

      <div className="space-y-6">
        {[
          { label: "Closer", list: closers },
          { label: "Administratoren", list: admins },
        ].map(({ label, list }) => (
          <div key={label}>
            <h2 className="text-[#5b6b7f] text-xs font-bold uppercase tracking-widest mb-2.5">
              {label} ({list.length})
            </h2>
            {list.length === 0 ? (
              <p className="text-[#5b6b7f] text-sm px-4 py-3 rounded-lg border border-dashed border-[#1a2840]">
                {label === "Closer"
                  ? "Noch kein Closer angelegt. Closer können Leads betreuen und Vertragsabschlüsse durchführen."
                  : "Kein Administrator vorhanden."}
              </p>
            ) : (
              <div className="space-y-2">
                {list.map((member) => (
                  <div
                    key={member.id}
                    className="rounded-lg border border-[#1a2840] bg-[#0c1520] overflow-hidden"
                  >
                    <div className="flex flex-wrap items-center gap-3 px-4 py-3">
                      <div className="w-9 h-9 rounded-full bg-[rgba(0,184,255,0.12)] border border-[#00b8ff]/25 flex items-center justify-center flex-shrink-0">
                        <span className="text-[#00b8ff] text-xs font-bold">
                          {(member.name ?? member.email).charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-[200px] flex-1">
                        <p className="text-[#eef2f7] text-sm font-semibold">
                          {member.name ?? "—"}
                          {member.id === currentUserId && (
                            <span className="ml-2 text-[#5b6b7f] text-xs font-normal">(Sie)</span>
                          )}
                        </p>
                        <p className="text-[#8899b4] text-xs">{member.email}</p>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <Pill tone="muted">{ROLE_LABELS[member.role] ?? member.role}</Pill>
                        <Pill tone={member.active ? "on" : "off"}>
                          {member.active ? "aktiv" : "deaktiviert"}
                        </Pill>
                        {member.pendingSetup && member.active && (
                          <Pill tone="muted">Passwort ausstehend</Pill>
                        )}
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <GhostButton
                          onClick={() => setEditing(editing === member.id ? null : member.id)}
                          className="!px-3 !py-1.5 !text-xs"
                        >
                          {editing === member.id ? "Schließen" : "Bearbeiten"}
                        </GhostButton>
                        {member.active && (
                          <GhostButton
                            onClick={() =>
                              run(
                                () => resendTeamSetupLink(member.id),
                                "Neuer Einrichtungslink erzeugt."
                              )
                            }
                            disabled={pending}
                            className="!px-3 !py-1.5 !text-xs"
                            title="Erzeugt einen neuen Link; der bisherige wird ungültig."
                          >
                            <span className="flex items-center gap-1.5">
                              <KeyRound size={11} /> Passwortlink
                            </span>
                          </GhostButton>
                        )}
                        <GhostButton
                          onClick={() =>
                            run(
                              () => setTeamMemberActive(member.id, !member.active),
                              member.active ? "Benutzer deaktiviert." : "Benutzer aktiviert."
                            )
                          }
                          disabled={pending || member.id === currentUserId}
                          className="!px-3 !py-1.5 !text-xs"
                          title={
                            member.id === currentUserId
                              ? "Das eigene Konto lässt sich nicht deaktivieren."
                              : undefined
                          }
                        >
                          {member.active ? "Deaktivieren" : "Aktivieren"}
                        </GhostButton>
                      </div>
                    </div>

                    <div className="px-4 pb-3 flex flex-wrap gap-x-5 gap-y-1">
                      <span className="text-[#5b6b7f] text-xs">
                        {member.closingCount} Closing{member.closingCount === 1 ? "" : "s"}
                      </span>
                      <span className="text-[#5b6b7f] text-xs">
                        {member.leadCount} zugewiesene{member.leadCount === 1 ? "r" : ""} Lead
                        {member.leadCount === 1 ? "" : "s"}
                      </span>
                      <span className="text-[#5b6b7f] text-xs">
                        angelegt {new Date(member.createdAt).toLocaleDateString("de-DE")}
                      </span>
                      {!member.active && member.deactivatedAt && (
                        <span className="text-[#f87171] text-xs">
                          deaktiviert {new Date(member.deactivatedAt).toLocaleDateString("de-DE")}
                        </span>
                      )}
                    </div>

                    {editing === member.id && (
                      <form
                        action={(fd) =>
                          run(() => updateTeamMember(member.id, fd), "Benutzer gespeichert.")
                        }
                        className="px-4 py-4 border-t border-[#1a2840] bg-[#0a1119] grid sm:grid-cols-3 gap-4 items-end"
                      >
                        <Field label="Name" required>
                          <input
                            name="name"
                            required
                            defaultValue={member.name ?? ""}
                            className={inputClass}
                          />
                        </Field>
                        <Field label="Rolle">
                          <select name="role" defaultValue={member.role} className={inputClass}>
                            <option value="CLOSER">Closer</option>
                            <option value="ADMIN">Administrator</option>
                          </select>
                        </Field>
                        <PrimaryButton type="submit" disabled={pending}>
                          Speichern
                        </PrimaryButton>
                      </form>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-8">
        <Panel title="Was darf welche Rolle?">
          <div className="space-y-3">
            {(["ADMIN", "CLOSER"] as const).map((role) => (
              <div key={role} className="flex items-start gap-3">
                <ShieldCheck size={14} className="text-[#00b8ff] mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-[#eef2f7] text-sm font-semibold">{ROLE_LABELS[role]}</p>
                  <p className="text-[#8899b4] text-xs mt-0.5">{ROLE_HINTS[role]}</p>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
