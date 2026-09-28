"use client";

import { useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import Link from "next/link";

/**
 * Das Kontaktformular.
 *
 * Bewusst schlank: Name, Unternehmen und E-Mail sind Pflicht, alles andere
 * freiwillig. Wer schreiben will, soll schreiben können — nicht erst ein
 * Formular ausfüllen.
 */
export function ContactForm() {
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    const form = event.currentTarget;
    const data = new FormData(form);

    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/kontakt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: String(data.get("name") ?? ""),
          company: String(data.get("company") ?? ""),
          email: String(data.get("email") ?? ""),
          phone: String(data.get("phone") ?? ""),
          message: String(data.get("message") ?? ""),
          // Für Menschen unsichtbar; nur automatische Einsender füllen es aus.
          website: String(data.get("website") ?? ""),
        }),
      });
      const result = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !result.ok) {
        setError(result.error ?? "Die Nachricht konnte nicht gesendet werden.");
        return;
      }
      setSent(true);
      form.reset();
    } catch {
      setError("Keine Verbindung. Bitte später erneut versuchen.");
    } finally {
      setPending(false);
    }
  }

  if (sent) {
    return (
      <div className="flex flex-col items-start gap-3 py-8">
        <CheckCircle2 size={26} className="text-[#38a9f5]" />
        <p className="text-[#f4f8fd] text-base font-semibold">Nachricht ist angekommen.</p>
        <p className="text-[#9fb2c9] text-sm leading-relaxed">
          Vielen Dank — wir melden uns schnellstmöglich bei Ihnen.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate={false}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" name="name" required placeholder="Ihr Name" />
        <Field label="Unternehmen" name="company" required placeholder="Ihr Unternehmen" />
        <Field
          label="E-Mail"
          name="email"
          type="email"
          required
          placeholder="ihre@emailadresse.de"
        />
        <Field label="Telefonnummer" name="phone" placeholder="Ihre Telefonnummer" />
      </div>

      <div>
        <label htmlFor="message" className="block text-[#c2d0e2] text-sm mb-1.5">
          Nachricht (optional)
        </label>
        <textarea
          id="message"
          name="message"
          rows={4}
          placeholder="Ihre Nachricht an uns …"
          className="w-full rounded-lg border border-[#1a3050] bg-[#091426] px-3.5 py-2.5 text-[#f4f8fd] text-sm placeholder-[#4e627c] focus:border-[#2f7fd4] focus:outline-none resize-y"
        />
      </div>

      {/* Honigtopf: Menschen sehen dieses Feld nicht. */}
      <div className="hidden" aria-hidden>
        <label htmlFor="website">Website</label>
        <input id="website" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      {error && <p className="text-[#fca5a5] text-sm">{error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[#2f7fd4]/60 bg-[linear-gradient(180deg,#1668c4_0%,#0d4f9e_100%)] px-5 py-3 text-sm font-semibold text-white transition-colors hover:border-[#4aa3ef] disabled:opacity-50"
      >
        {pending && <Loader2 size={15} className="animate-spin" />}
        {pending ? "Wird gesendet …" : "Nachricht senden"}
        {!pending && <span aria-hidden>→</span>}
      </button>

      <p className="text-[#6f8299] text-xs leading-relaxed">
        Mit dem Absenden der Nachricht erklären Sie sich mit unserer{" "}
        <Link href="/datenschutz" className="text-[#38a9f5] hover:underline">
          Datenschutzerklärung
        </Link>{" "}
        einverstanden.
      </p>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="block text-[#c2d0e2] text-sm mb-1.5">
        {label} {required && <span className="text-[#fca5a5]">*</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        autoComplete={
          name === "email" ? "email" : name === "phone" ? "tel" : name === "name" ? "name" : "organization"
        }
        className="w-full rounded-lg border border-[#1a3050] bg-[#091426] px-3.5 py-2.5 text-[#f4f8fd] text-sm placeholder-[#4e627c] focus:border-[#2f7fd4] focus:outline-none"
      />
    </div>
  );
}
