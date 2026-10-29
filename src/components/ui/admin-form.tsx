"use client";

import type { ReactNode } from "react";

/** Kleine Formular-Bausteine im OKUN-Adminstil. */

export function Field({
  label,
  hint,
  children,
  required,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="block text-[#8899b4] text-xs font-semibold mb-1.5">
        {label}
        {required && <span className="text-[#00b8ff] ml-1">*</span>}
      </span>
      {children}
      {hint && <span className="block text-[#5b6b7f] text-xs mt-1">{hint}</span>}
    </label>
  );
}

export const inputClass =
  "w-full px-3 py-2 rounded-lg bg-[#0a1119] border border-[#1a2840] text-[#eef2f7] text-sm placeholder:text-[#4a5a70] focus:outline-none focus:border-[#00b8ff]/50 transition-colors";

export const textareaClass = `${inputClass} font-mono leading-relaxed resize-y`;

export function Panel({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-[#1a2840] bg-[#0c1520] overflow-hidden">
      <div className="px-5 py-4 border-b border-[#1a2840] flex items-start justify-between gap-4">
        <div>
          <h2 className="text-[#eef2f7] text-sm font-bold">{title}</h2>
          {subtitle && <p className="text-[#8899b4] text-xs mt-1 max-w-2xl">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="px-5 py-5">{children}</div>
    </section>
  );
}

export function PrimaryButton({
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`px-4 py-2 rounded-lg bg-[#00b8ff] text-[#041018] text-sm font-bold hover:bg-[#0099d6] disabled:bg-[#16283d] disabled:text-[#4a5a70] disabled:cursor-not-allowed transition-colors ${props.className ?? ""}`}
    >
      {children}
    </button>
  );
}

export function GhostButton({
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`px-3 py-2 rounded-lg border border-[#1a2840] text-[#8899b4] text-sm hover:text-[#eef2f7] hover:border-[#2a3a55] disabled:opacity-40 transition-colors ${props.className ?? ""}`}
    >
      {children}
    </button>
  );
}

export function Banner({ kind, children }: { kind: "error" | "success" | "info"; children: ReactNode }) {
  const styles = {
    error: "bg-[rgba(239,68,68,0.1)] border-[#ef4444]/25 text-[#fca5a5]",
    success: "bg-[rgba(34,197,94,0.1)] border-[#22c55e]/25 text-[#86efac]",
    info: "bg-[rgba(0,184,255,0.08)] border-[#00b8ff]/25 text-[#7dd3fc]",
  }[kind];
  return <div className={`px-4 py-3 rounded-lg border text-sm ${styles}`}>{children}</div>;
}

export function Pill({ tone, children }: { tone: "on" | "off" | "muted"; children: ReactNode }) {
  const styles = {
    on: "bg-[rgba(34,197,94,0.12)] text-[#22c55e] border-[#22c55e]/25",
    off: "bg-[rgba(239,68,68,0.1)] text-[#f87171] border-[#ef4444]/25",
    muted: "bg-[#101c2e] text-[#8899b4] border-[#1a2840]",
  }[tone];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${styles}`}>
      {children}
    </span>
  );
}
