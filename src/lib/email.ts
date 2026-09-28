import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM_ADDRESS = process.env.EMAIL_FROM ?? "OKUN Systems <noreply@okun-systems.com>";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "info@okun-systems.com";

export async function sendAppointmentConfirmation({
  toEmail,
  toName,
  appointmentTitle,
  startTime,
  meetingUrl,
}: {
  toEmail: string;
  toName: string;
  appointmentTitle: string;
  startTime: Date;
  meetingUrl?: string | null;
}) {
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not set — skipping email");
    return;
  }

  const formattedDate = startTime.toLocaleDateString("de-DE", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const formattedTime = startTime.toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const meetingLine = meetingUrl
    ? `<p style="margin:12px 0;color:#888;">Meeting-Link: <a href="${meetingUrl}" style="color:#00b8ff;">${meetingUrl}</a></p>`
    : "";

  await resend.emails.send({
    from: FROM_ADDRESS,
    to: toEmail,
    subject: `Terminbestätigung: ${appointmentTitle}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#080c14;color:#f0f0f0;padding:32px;border-radius:12px;">
        <h1 style="font-size:20px;font-weight:700;color:#f0f0f0;margin:0 0 8px;">Ihr Termin ist bestätigt</h1>
        <p style="color:#888;font-size:14px;margin:0 0 24px;">Hallo ${toName}, wir freuen uns auf das Gespräch mit Ihnen.</p>
        <div style="background:#0c1520;border:1px solid #1a2840;border-radius:8px;padding:20px;margin-bottom:24px;">
          <p style="margin:0 0 8px;font-weight:600;color:#f0f0f0;">${appointmentTitle}</p>
          <p style="margin:4px 0;color:#888;font-size:14px;">📅 ${formattedDate}</p>
          <p style="margin:4px 0;color:#888;font-size:14px;">🕐 ${formattedTime} Uhr</p>
          ${meetingLine}
        </div>
        <p style="color:#555;font-size:12px;line-height:1.6;">
          Bei Fragen oder falls Sie den Termin verschieben möchten, antworten Sie einfach auf diese E-Mail.
          <br>Wir melden uns spätestens 24 Stunden vor dem Termin mit weiteren Details.
        </p>
        <div style="margin-top:24px;padding-top:16px;border-top:1px solid #111e30;">
          <p style="color:#444;font-size:11px;margin:0;">OKUN Systems · <a href="https://okun-systems.com" style="color:#444;">okun-systems.com</a></p>
        </div>
      </div>
    `,
  });
}

export async function sendBlueprintReportReady({
  toEmail,
  toName,
  companyName,
  reportUrl,
}: {
  toEmail: string;
  toName: string;
  companyName: string;
  reportUrl: string;
}) {
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not set — skipping email");
    return;
  }

  await resend.emails.send({
    from: FROM_ADDRESS,
    to: toEmail,
    subject: `Ihr OKUN Blueprint™ Bericht ist fertig`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#080c14;color:#f0f0f0;padding:32px;border-radius:12px;">
        <h1 style="font-size:20px;font-weight:700;color:#f0f0f0;margin:0 0 8px;">Ihr Blueprint-Bericht ist fertig</h1>
        <p style="color:#888;font-size:14px;margin:0 0 24px;">Hallo ${toName}, Ihr persönlicher OKUN Blueprint™ Bericht für <strong style="color:#f0f0f0;">${companyName}</strong> wurde erstellt.</p>
        <div style="background:#0c1520;border:1px solid #1a2840;border-radius:8px;padding:20px;margin-bottom:24px;">
          <p style="margin:0 0 12px;color:#888;font-size:14px;line-height:1.6;">
            Der Bericht enthält eine detaillierte Analyse Ihrer Automatisierungspotenziale, individuelle Lösungsempfehlungen und eine priorisierte Roadmap für Ihr Unternehmen.
          </p>
          <a href="${reportUrl}" style="display:inline-block;background:#00b8ff;color:#000;font-weight:700;font-size:14px;text-decoration:none;padding:12px 24px;border-radius:8px;">
            Bericht herunterladen (PDF)
          </a>
        </div>
        <p style="color:#555;font-size:12px;line-height:1.6;">
          Für Fragen oder zur Besprechung der Ergebnisse können Sie jederzeit einen Strategietermin vereinbaren.
        </p>
        <div style="margin-top:24px;padding-top:16px;border-top:1px solid #111e30;">
          <p style="color:#444;font-size:11px;margin:0;">OKUN Systems · <a href="https://okun-systems.com" style="color:#444;">okun-systems.com</a></p>
        </div>
      </div>
    `,
  });
}

export async function sendAppointmentNotificationToAdmin({
  clientName,
  clientEmail,
  appointmentTitle,
  startTime,
  companyName,
}: {
  clientName: string;
  clientEmail: string;
  appointmentTitle: string;
  startTime: Date;
  companyName: string;
}) {
  if (!resend) return;

  const formattedDate = startTime.toLocaleDateString("de-DE", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const formattedTime = startTime.toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  });

  await resend.emails.send({
    from: FROM_ADDRESS,
    to: ADMIN_EMAIL,
    subject: `Neuer Termin: ${companyName} — ${formattedDate}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#080c14;color:#f0f0f0;padding:32px;border-radius:12px;">
        <h1 style="font-size:18px;font-weight:700;color:#00b8ff;margin:0 0 16px;">Neuer Termin gebucht</h1>
        <div style="background:#0c1520;border:1px solid #1a2840;border-radius:8px;padding:20px;">
          <p style="margin:4px 0;color:#f0f0f0;font-weight:600;">${appointmentTitle}</p>
          <p style="margin:4px 0;color:#888;font-size:14px;">Unternehmen: ${companyName}</p>
          <p style="margin:4px 0;color:#888;font-size:14px;">Ansprechpartner: ${clientName} (${clientEmail})</p>
          <p style="margin:8px 0 4px;color:#888;font-size:14px;">📅 ${formattedDate}, ${formattedTime} Uhr</p>
        </div>
      </div>
    `,
  });
}

export async function sendInvitationEmail({
  toEmail,
  companyName,
  inviteUrl,
  expiryHours,
}: {
  toEmail: string;
  companyName: string;
  inviteUrl: string;
  expiryHours: number;
}) {
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not set — skipping invitation email");
    return;
  }

  await resend.emails.send({
    from: FROM_ADDRESS,
    to: toEmail,
    subject: `Einladung zum ${companyName} Kundenportal`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#080c14;color:#f0f0f0;padding:32px;border-radius:12px;">
        <h1 style="font-size:20px;font-weight:700;color:#f0f0f0;margin:0 0 8px;">Sie wurden eingeladen</h1>
        <p style="color:#888;font-size:14px;margin:0 0 24px;">
          OKUN Systems hat Ihnen Zugang zum Kundenportal für <strong style="color:#f0f0f0;">${companyName}</strong> gewährt.
        </p>
        <div style="background:#0c1520;border:1px solid #1a2840;border-radius:8px;padding:20px;margin-bottom:24px;">
          <p style="color:#888;font-size:14px;margin:0 0 16px;line-height:1.6;">
            Klicken Sie auf den Button, um Ihr Konto zu erstellen und das Portal zu nutzen.<br>
            Die Einladung ist <strong style="color:#f0f0f0;">${expiryHours} Stunden</strong> gültig.
          </p>
          <a href="${inviteUrl}" style="display:inline-block;background:#00b8ff;color:#000;font-weight:700;font-size:14px;text-decoration:none;padding:12px 24px;border-radius:8px;">
            Konto erstellen
          </a>
        </div>
        <p style="color:#555;font-size:12px;line-height:1.6;">
          Falls Sie diese Einladung nicht erwartet haben, können Sie diese E-Mail ignorieren.
        </p>
        <div style="margin-top:24px;padding-top:16px;border-top:1px solid #111e30;">
          <p style="color:#444;font-size:11px;margin:0;">OKUN Systems · <a href="https://okun-systems.com" style="color:#444;">okun-systems.com</a></p>
        </div>
      </div>
    `,
  });
}

export async function sendLearningAssignmentEmail({
  toEmail,
  toName,
  companyName,
  chapterTitle,
}: {
  toEmail: string;
  toName: string;
  companyName: string;
  chapterTitle: string;
}) {
  if (!resend) return;

  const portalUrl = process.env.NEXTAUTH_URL ?? process.env.APP_URL ?? "https://okun-systems.com";

  await resend.emails.send({
    from: FROM_ADDRESS,
    to: toEmail,
    subject: `Neuer Lerninhalt verfügbar: ${chapterTitle}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#080c14;color:#f0f0f0;padding:32px;border-radius:12px;">
        <h1 style="font-size:20px;font-weight:700;color:#f0f0f0;margin:0 0 8px;">Neuer Lerninhalt verfügbar</h1>
        <p style="color:#888;font-size:14px;margin:0 0 24px;">
          Hallo ${toName}, für <strong style="color:#f0f0f0;">${companyName}</strong> wurde ein neues Lernkapitel freigeschaltet.
        </p>
        <div style="background:#0c1520;border:1px solid #1a2840;border-radius:8px;padding:20px;margin-bottom:24px;">
          <p style="margin:0 0 4px;font-weight:600;color:#f0f0f0;">${chapterTitle}</p>
          <p style="margin:4px 0 16px;color:#888;font-size:13px;">Jetzt im Lernbereich Ihres Portals verfügbar.</p>
          <a href="${portalUrl}/portal/lernen" style="display:inline-block;background:#00b8ff;color:#000;font-weight:700;font-size:14px;text-decoration:none;padding:12px 24px;border-radius:8px;">
            Zum Lernbereich
          </a>
        </div>
        <div style="margin-top:24px;padding-top:16px;border-top:1px solid #111e30;">
          <p style="color:#444;font-size:11px;margin:0;">OKUN Systems · <a href="https://okun-systems.com" style="color:#444;">okun-systems.com</a></p>
        </div>
      </div>
    `,
  });
}

export async function sendDocumentReleasedEmail({
  toEmail,
  toName,
  companyName,
  documentTitle,
}: {
  toEmail: string;
  toName: string;
  companyName: string;
  documentTitle: string;
}) {
  if (!resend) return;
  const portalUrl = process.env.NEXTAUTH_URL ?? process.env.APP_URL ?? "https://okun-systems.com";
  await resend.emails.send({
    from: FROM_ADDRESS,
    to: toEmail,
    subject: `Neues Dokument verfügbar: ${documentTitle}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#080c14;color:#f0f0f0;padding:32px;border-radius:12px;">
        <h1 style="font-size:20px;font-weight:700;color:#f0f0f0;margin:0 0 8px;">Neues Dokument verfügbar</h1>
        <p style="color:#888;font-size:14px;margin:0 0 24px;">Hallo ${toName}, für <strong style="color:#f0f0f0;">${companyName}</strong> wurde ein neues Dokument freigegeben.</p>
        <div style="background:#0c1520;border:1px solid #1a2840;border-radius:8px;padding:20px;margin-bottom:24px;">
          <p style="margin:0 0 4px;font-weight:600;color:#f0f0f0;">${documentTitle}</p>
          <p style="margin:4px 0 16px;color:#888;font-size:13px;">Jetzt im Dokumentenbereich Ihres Portals abrufbar.</p>
          <a href="${portalUrl}/portal/dokumente" style="display:inline-block;background:#00b8ff;color:#000;font-weight:700;font-size:14px;text-decoration:none;padding:12px 24px;border-radius:8px;">Zum Dokumentenbereich</a>
        </div>
        <div style="margin-top:24px;padding-top:16px;border-top:1px solid #111e30;">
          <p style="color:#444;font-size:11px;margin:0;">OKUN Systems · <a href="https://okun-systems.com" style="color:#444;">okun-systems.com</a></p>
        </div>
      </div>
    `,
  });
}

export async function sendClosingInvitationEmail({
  toEmail,
  toName,
  companyName,
  closingUrl,
  scheduledAt,
  closerName,
}: {
  toEmail: string;
  toName: string;
  companyName: string;
  closingUrl: string;
  scheduledAt: Date;
  closerName: string;
}) {
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not set — skipping closing invitation email");
    return;
  }

  const formattedDate = scheduledAt.toLocaleDateString("de-DE", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const formattedTime = scheduledAt.toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  });

  await resend.emails.send({
    from: FROM_ADDRESS,
    to: toEmail,
    subject: `Ihre Einladung zum Strategiegespräch – OKUN Systems`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#080c14;color:#f0f0f0;padding:32px;border-radius:12px;">
        <h1 style="font-size:20px;font-weight:700;color:#f0f0f0;margin:0 0 8px;">Strategiegespräch-Einladung</h1>
        <p style="color:#888;font-size:14px;margin:0 0 24px;">
          Hallo ${toName}, wir freuen uns auf Ihr Gespräch mit <strong style="color:#f0f0f0;">${closerName}</strong>.
        </p>
        <div style="background:#0c1520;border:1px solid #1a2840;border-radius:8px;padding:20px;margin-bottom:24px;">
          <p style="margin:0 0 8px;font-weight:600;color:#f0f0f0;">${companyName} · Strategiegespräch</p>
          <p style="margin:4px 0;color:#888;font-size:14px;">📅 ${formattedDate}</p>
          <p style="margin:4px 0 16px;color:#888;font-size:14px;">🕐 ${formattedTime} Uhr</p>
          <a href="${closingUrl}" style="display:inline-block;background:#00b8ff;color:#000;font-weight:700;font-size:14px;text-decoration:none;padding:12px 24px;border-radius:8px;">
            Zum Gespräch beitreten
          </a>
        </div>
        <p style="color:#555;font-size:12px;line-height:1.6;">
          Über diesen Link gelangen Sie direkt in Ihr persönliches Gesprächsportal.
          Der Link ist 7 Tage gültig. Bei Fragen antworten Sie einfach auf diese E-Mail.
        </p>
        <div style="margin-top:24px;padding-top:16px;border-top:1px solid #111e30;">
          <p style="color:#444;font-size:11px;margin:0;">OKUN Systems · <a href="https://okun-systems.com" style="color:#444;">okun-systems.com</a></p>
        </div>
      </div>
    `,
  });
}

/**
 * Das Angebot als PDF an den Kunden — auf Knopfdruck aus dem Closing heraus.
 *
 * Gedacht für den Moment im Gespräch, in dem jemand sagt: „Schicken Sie mir
 * das bitte nochmal." Der Anhang ist dasselbe Dokument, das im Gespräch auf
 * dem Schirm lag.
 */
export async function sendOfferEmail({
  toEmail,
  toName,
  companyName,
  offerNumber,
  closerName,
  portalUrl,
  attachment,
}: {
  toEmail: string;
  toName: string;
  companyName: string;
  offerNumber: string | null;
  closerName: string | null;
  portalUrl: string | null;
  attachment: { filename: string; content: Buffer };
}) {
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not set — skipping sendOfferEmail");
    return { ok: false as const, error: "E-Mail-Versand ist nicht konfiguriert (RESEND_API_KEY fehlt)." };
  }

  const result = await resend.emails.send({
    from: FROM_ADDRESS,
    to: toEmail,
    subject: offerNumber ? `Ihr Angebot ${offerNumber} – OKUN Systems` : "Ihr Angebot – OKUN Systems",
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#080c14;color:#f0f0f0;padding:32px;border-radius:12px;">
        <h1 style="font-size:20px;font-weight:700;color:#f0f0f0;margin:0 0 8px;">Ihr Angebot</h1>
        <p style="color:#888;font-size:14px;margin:0 0 24px;">
          Hallo ${toName}, wie besprochen${closerName ? ` mit <strong style="color:#f0f0f0;">${closerName}</strong>` : ""} erhalten Sie Ihr Angebot im Anhang.
        </p>
        <div style="background:#0c1520;border:1px solid #1a2840;border-radius:8px;padding:20px;margin-bottom:24px;">
          <p style="margin:0 0 8px;font-weight:600;color:#f0f0f0;">${companyName}</p>
          ${offerNumber ? `<p style="margin:4px 0;color:#888;font-size:14px;">Angebotsnummer: <span style="color:#f0f0f0;">${offerNumber}</span></p>` : ""}
          <p style="margin:4px 0;color:#888;font-size:14px;">📎 ${attachment.filename}</p>
          ${portalUrl ? `<a href="${portalUrl}" style="display:inline-block;margin-top:12px;background:#00b8ff;color:#000;font-weight:700;font-size:14px;text-decoration:none;padding:12px 24px;border-radius:8px;">Zum Gesprächsportal</a>` : ""}
        </div>
        <p style="color:#555;font-size:12px;line-height:1.6;">
          Bei Fragen zum Angebot antworten Sie einfach auf diese E-Mail.
        </p>
        <div style="margin-top:24px;padding-top:16px;border-top:1px solid #111e30;">
          <p style="color:#444;font-size:11px;margin:0;">OKUN Systems · <a href="https://okun-systems.com" style="color:#444;">okun-systems.com</a></p>
        </div>
      </div>
    `,
    attachments: [{ filename: attachment.filename, content: attachment.content }],
  });

  if (result.error) {
    console.error("[email] sendOfferEmail fehlgeschlagen:", result.error);
    return { ok: false as const, error: result.error.message ?? "Der Versand wurde abgelehnt." };
  }
  return { ok: true as const };
}

/**
 * Eine Anfrage über das Kontaktformular der Website.
 *
 * Geht ausschließlich an das eigene Postfach. `replyTo` steht auf der Adresse
 * des Absenders, damit eine Antwort direkt beim Interessenten landet — der
 * Absender der Mail bleibt aber unsere eigene, verifizierte Adresse.
 */
export async function sendContactRequest({
  name,
  company,
  email,
  phone,
  topic,
  message,
}: {
  name: string;
  company: string;
  email: string;
  phone: string;
  topic: string;
  message: string;
}) {
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not set — skipping sendContactRequest");
    return { ok: false as const, error: "Der Nachrichtenversand ist gerade nicht verfügbar." };
  }

  const escape = (value: string) =>
    value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const rows: Array<[string, string]> = [
    ["Name", name],
    ["Unternehmen", company],
    ["E-Mail", email],
    ["Telefon", phone || "—"],
    ["Anfragegrund", topic || "—"],
  ];

  const result = await resend.emails.send({
    from: FROM_ADDRESS,
    to: ADMIN_EMAIL,
    replyTo: email,
    subject: `Kontaktanfrage von ${name} (${company})`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#080c14;color:#f0f0f0;padding:32px;border-radius:12px;">
        <h1 style="font-size:18px;font-weight:700;margin:0 0 20px;">Neue Kontaktanfrage</h1>
        <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
          ${rows
            .map(
              ([label, value]) =>
                `<tr><td style="color:#888;font-size:13px;padding:6px 12px 6px 0;">${label}</td><td style="color:#f0f0f0;font-size:14px;">${escape(value)}</td></tr>`
            )
            .join("")}
        </table>
        ${
          message
            ? `<div style="background:#0c1520;border:1px solid #1a2840;border-radius:8px;padding:16px;"><p style="color:#888;font-size:12px;margin:0 0 8px;">Nachricht</p><p style="color:#f0f0f0;font-size:14px;line-height:1.6;margin:0;white-space:pre-wrap;">${escape(message)}</p></div>`
            : `<p style="color:#666;font-size:13px;">Keine Nachricht hinterlassen.</p>`
        }
      </div>
    `,
  });

  if (result.error) {
    console.error("[email] sendContactRequest fehlgeschlagen:", result.error);
    return { ok: false as const, error: "Die Nachricht konnte nicht gesendet werden." };
  }
  return { ok: true as const };
}

/**
 * Meldung an uns, wenn über Calendly ein Termin gebucht oder abgesagt wurde.
 *
 * Calendly schickt selbst eine Bestätigung an den Kalenderinhaber. Diese
 * Nachricht geht zusätzlich an die allgemeine Adresse — damit ein Termin
 * nicht nur in einem persönlichen Postfach landet, sondern dort, wo das Team
 * hinschaut.
 */
export async function sendBookingNotification({
  canceled,
  eventName,
  startTime,
  timezone,
  name,
  email,
  location,
  answers,
  cancelReason,
  rescheduleUrl,
}: {
  canceled: boolean;
  eventName: string;
  startTime: string | null;
  timezone: string | null;
  name: string;
  email: string;
  location: string | null;
  answers: Array<{ question: string; answer: string }>;
  cancelReason: string | null;
  rescheduleUrl: string | null;
}) {
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not set — skipping sendBookingNotification");
    return { ok: false as const, error: "E-Mail-Versand ist nicht konfiguriert." };
  }

  const escape = (value: string) =>
    value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  // Die Zeit wird in der Zeitzone des Gastes gezeigt, nicht in der des
  // Servers — der steht irgendwo und weiß nichts von Berlin.
  let when = "—";
  if (startTime) {
    const date = new Date(startTime);
    if (!Number.isNaN(date.getTime())) {
      when = date.toLocaleString("de-DE", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: timezone ?? "Europe/Berlin",
      });
      when += ` Uhr (${timezone ?? "Europe/Berlin"})`;
    }
  }

  const rows: Array<[string, string]> = [
    ["Gespräch", eventName],
    ["Termin", when],
    ["Name", name],
    ["E-Mail", email || "—"],
  ];
  if (location) rows.push(["Ort bzw. Link", location]);
  if (cancelReason) rows.push(["Grund der Absage", cancelReason]);

  const result = await resend.emails.send({
    from: FROM_ADDRESS,
    to: ADMIN_EMAIL,
    replyTo: email || undefined,
    subject: canceled
      ? `Termin abgesagt: ${name} — ${when}`
      : `Neuer Termin: ${name} — ${when}`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#080c14;color:#f0f0f0;padding:32px;border-radius:12px;">
        <h1 style="font-size:18px;font-weight:700;margin:0 0 6px;">
          ${canceled ? "Termin abgesagt" : "Neuer Termin gebucht"}
        </h1>
        <p style="color:#888;font-size:13px;margin:0 0 20px;">Über Calendly</p>
        <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
          ${rows
            .map(
              ([label, value]) =>
                `<tr><td style="color:#888;font-size:13px;padding:6px 12px 6px 0;vertical-align:top;">${label}</td><td style="color:#f0f0f0;font-size:14px;">${escape(value)}</td></tr>`
            )
            .join("")}
        </table>
        ${
          answers.length > 0
            ? `<div style="background:#0c1520;border:1px solid #1a2840;border-radius:8px;padding:16px;margin-bottom:20px;">${answers
                .map(
                  (entry) =>
                    `<p style="color:#888;font-size:12px;margin:0 0 4px;">${escape(entry.question)}</p><p style="color:#f0f0f0;font-size:14px;line-height:1.6;margin:0 0 14px;white-space:pre-wrap;">${escape(entry.answer)}</p>`
                )
                .join("")}</div>`
            : ""
        }
        ${
          rescheduleUrl && !canceled
            ? `<p style="margin:0;"><a href="${rescheduleUrl}" style="color:#00b8ff;font-size:13px;">Termin verschieben</a></p>`
            : ""
        }
      </div>
    `,
  });

  if (result.error) {
    console.error("[email] sendBookingNotification fehlgeschlagen:", result.error);
    return { ok: false as const, error: "Die Benachrichtigung konnte nicht gesendet werden." };
  }
  return { ok: true as const };
}

export async function sendPasswordResetEmail({
  toEmail,
  resetUrl,
}: {
  toEmail: string;
  resetUrl: string;
}) {
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not set — skipping password reset email");
    return;
  }
  await resend.emails.send({
    from: FROM_ADDRESS,
    to: toEmail,
    subject: "Passwort zurücksetzen – OKUN Systems",
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#080c14;color:#f0f0f0;padding:32px;border-radius:12px;">
        <h1 style="font-size:20px;font-weight:700;color:#f0f0f0;margin:0 0 8px;">Passwort zurücksetzen</h1>
        <p style="color:#888;font-size:14px;margin:0 0 24px;">Sie haben eine Anfrage zum Zurücksetzen Ihres Passworts gestellt.</p>
        <div style="background:#0c1520;border:1px solid #1a2840;border-radius:8px;padding:20px;margin-bottom:24px;">
          <p style="color:#888;font-size:14px;margin:0 0 16px;line-height:1.6;">
            Klicken Sie auf den Button, um ein neues Passwort zu vergeben.<br>
            Der Link ist <strong style="color:#f0f0f0;">2 Stunden</strong> gültig.
          </p>
          <a href="${resetUrl}" style="display:inline-block;background:#00b8ff;color:#000;font-weight:700;font-size:14px;text-decoration:none;padding:12px 24px;border-radius:8px;">Neues Passwort vergeben</a>
        </div>
        <p style="color:#555;font-size:12px;">Falls Sie keine Zurücksetzung beantragt haben, ignorieren Sie diese E-Mail.</p>
        <div style="margin-top:24px;padding-top:16px;border-top:1px solid #111e30;">
          <p style="color:#444;font-size:11px;margin:0;">OKUN Systems · <a href="https://okun-systems.com" style="color:#444;">okun-systems.com</a></p>
        </div>
      </div>
    `,
  });
}

export async function sendContractClosedEmail({
  toEmail,
  toName,
  companyName,
  passwordSetUrl,
  closerName,
}: {
  toEmail: string;
  toName: string;
  companyName: string;
  passwordSetUrl: string;
  closerName: string;
}) {
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not set — skipping sendContractClosedEmail");
    return;
  }

  await resend.emails.send({
    from: FROM_ADDRESS,
    to: toEmail,
    subject: `Willkommen bei OKUN Systems – Ihr Zugang wird eingerichtet`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#080c14;color:#f0f0f0;padding:32px;border-radius:12px;">
        <h1 style="font-size:20px;font-weight:700;color:#f0f0f0;margin:0 0 8px;">Herzlich Willkommen, ${toName}!</h1>
        <p style="color:#888;font-size:14px;margin:0 0 24px;">
          Ihr Vertrag für <strong style="color:#f0f0f0;">${companyName}</strong> wurde erfolgreich abgeschlossen.
          Wir richten gerade Ihren persönlichen Bereich ein.
        </p>
        <div style="background:#0c1520;border:1px solid #1a2840;border-radius:8px;padding:20px;margin-bottom:24px;">
          <p style="margin:0 0 12px;font-size:14px;color:#aaa;">Bitte setzen Sie jetzt Ihr Passwort, um sich in Ihr Kunden-Portal einzuloggen:</p>
          <a href="${passwordSetUrl}" style="display:inline-block;background:#00b8ff;color:#000;font-weight:700;font-size:14px;text-decoration:none;padding:12px 24px;border-radius:8px;">
            Passwort festlegen
          </a>
          <p style="margin:12px 0 0;font-size:11px;color:#444;">Der Link ist 7 Tage gültig.</p>
        </div>
        <p style="color:#888;font-size:13px;margin:0 0 8px;">
          Bei Fragen steht Ihnen ${closerName} gerne zur Verfügung.
        </p>
        <div style="margin-top:24px;padding-top:16px;border-top:1px solid #111e30;">
          <p style="color:#444;font-size:11px;margin:0;">OKUN Systems · <a href="https://okun-systems.com" style="color:#444;">okun-systems.com</a></p>
        </div>
      </div>
    `,
  });
}

export async function sendInvoiceEmail({
  toEmail,
  toName,
  companyName,
  invoiceNumber,
  grossAmount,
  dueDate,
  portalUrl,
}: {
  toEmail: string;
  toName: string;
  companyName: string;
  invoiceNumber: string;
  grossAmount: number;
  dueDate: Date;
  portalUrl: string;
}) {
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not set — skipping sendInvoiceEmail");
    return;
  }

  const fmtDate = (d: Date) =>
    d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
  const fmtEur = (cents: number) =>
    new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(cents / 100);

  await resend.emails.send({
    from: FROM_ADDRESS,
    to: toEmail,
    subject: `Rechnung ${invoiceNumber} – OKUN Systems`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#080c14;color:#f0f0f0;padding:32px;border-radius:12px;">
        <h1 style="font-size:20px;font-weight:700;color:#f0f0f0;margin:0 0 8px;">Ihre Rechnung</h1>
        <p style="color:#888;font-size:14px;margin:0 0 24px;">Hallo ${toName},</p>
        <div style="background:#0c1520;border:1px solid #1a2840;border-radius:8px;padding:20px;margin-bottom:24px;">
          <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
            <span style="color:#888;font-size:13px;">Rechnungsnummer</span>
            <span style="color:#f0f0f0;font-weight:600;">${invoiceNumber}</span>
          </div>
          <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
            <span style="color:#888;font-size:13px;">Unternehmen</span>
            <span style="color:#f0f0f0;">${companyName}</span>
          </div>
          <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
            <span style="color:#888;font-size:13px;">Betrag (inkl. MwSt.)</span>
            <span style="color:#f0f0f0;font-weight:700;font-size:16px;">${fmtEur(grossAmount)}</span>
          </div>
          <div style="display:flex;justify-content:space-between;padding-top:12px;border-top:1px solid #1a2840;">
            <span style="color:#888;font-size:13px;">Fällig bis</span>
            <span style="color:#f59e0b;font-weight:600;">${fmtDate(dueDate)}</span>
          </div>
        </div>
        <p style="color:#888;font-size:13px;margin:0 0 8px;">
          Die vollständige Rechnung finden Sie in Ihrem Kunden-Portal.
        </p>
        <a href="${portalUrl}" style="display:inline-block;background:#1a2840;color:#f0f0f0;font-size:14px;text-decoration:none;padding:10px 20px;border-radius:8px;">
          Zum Portal
        </a>
        <div style="margin-top:24px;padding-top:16px;border-top:1px solid #111e30;">
          <p style="color:#444;font-size:11px;margin:0;">OKUN Systems · <a href="https://okun-systems.com" style="color:#444;">okun-systems.com</a></p>
        </div>
      </div>
    `,
  });
}
