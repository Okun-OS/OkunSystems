import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM_ADDRESS = process.env.EMAIL_FROM ?? "OKUN Systems <noreply@okun-systems.de>";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "info@okun-systems.de";

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
    ? `<p style="margin:12px 0;color:#888;">Meeting-Link: <a href="${meetingUrl}" style="color:#22c55e;">${meetingUrl}</a></p>`
    : "";

  await resend.emails.send({
    from: FROM_ADDRESS,
    to: toEmail,
    subject: `Terminbestätigung: ${appointmentTitle}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#0a0a0a;color:#f0f0f0;padding:32px;border-radius:12px;">
        <h1 style="font-size:20px;font-weight:700;color:#f0f0f0;margin:0 0 8px;">Ihr Termin ist bestätigt</h1>
        <p style="color:#888;font-size:14px;margin:0 0 24px;">Hallo ${toName}, wir freuen uns auf das Gespräch mit Ihnen.</p>
        <div style="background:#141414;border:1px solid #2a2a2a;border-radius:8px;padding:20px;margin-bottom:24px;">
          <p style="margin:0 0 8px;font-weight:600;color:#f0f0f0;">${appointmentTitle}</p>
          <p style="margin:4px 0;color:#888;font-size:14px;">📅 ${formattedDate}</p>
          <p style="margin:4px 0;color:#888;font-size:14px;">🕐 ${formattedTime} Uhr</p>
          ${meetingLine}
        </div>
        <p style="color:#555;font-size:12px;line-height:1.6;">
          Bei Fragen oder falls Sie den Termin verschieben möchten, antworten Sie einfach auf diese E-Mail.
          <br>Wir melden uns spätestens 24 Stunden vor dem Termin mit weiteren Details.
        </p>
        <div style="margin-top:24px;padding-top:16px;border-top:1px solid #1e1e1e;">
          <p style="color:#444;font-size:11px;margin:0;">OKUN Systems · <a href="https://okun-systems.de" style="color:#444;">okun-systems.de</a></p>
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
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#0a0a0a;color:#f0f0f0;padding:32px;border-radius:12px;">
        <h1 style="font-size:20px;font-weight:700;color:#f0f0f0;margin:0 0 8px;">Ihr Blueprint-Bericht ist fertig</h1>
        <p style="color:#888;font-size:14px;margin:0 0 24px;">Hallo ${toName}, Ihr persönlicher OKUN Blueprint™ Bericht für <strong style="color:#f0f0f0;">${companyName}</strong> wurde erstellt.</p>
        <div style="background:#141414;border:1px solid #2a2a2a;border-radius:8px;padding:20px;margin-bottom:24px;">
          <p style="margin:0 0 12px;color:#888;font-size:14px;line-height:1.6;">
            Der Bericht enthält eine detaillierte Analyse Ihrer Automatisierungspotenziale, individuelle Lösungsempfehlungen und eine priorisierte Roadmap für Ihr Unternehmen.
          </p>
          <a href="${reportUrl}" style="display:inline-block;background:#22c55e;color:#000;font-weight:700;font-size:14px;text-decoration:none;padding:12px 24px;border-radius:8px;">
            Bericht herunterladen (PDF)
          </a>
        </div>
        <p style="color:#555;font-size:12px;line-height:1.6;">
          Für Fragen oder zur Besprechung der Ergebnisse können Sie jederzeit einen Strategietermin vereinbaren.
        </p>
        <div style="margin-top:24px;padding-top:16px;border-top:1px solid #1e1e1e;">
          <p style="color:#444;font-size:11px;margin:0;">OKUN Systems · <a href="https://okun-systems.de" style="color:#444;">okun-systems.de</a></p>
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
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#0a0a0a;color:#f0f0f0;padding:32px;border-radius:12px;">
        <h1 style="font-size:18px;font-weight:700;color:#22c55e;margin:0 0 16px;">Neuer Termin gebucht</h1>
        <div style="background:#141414;border:1px solid #2a2a2a;border-radius:8px;padding:20px;">
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
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#0a0a0a;color:#f0f0f0;padding:32px;border-radius:12px;">
        <h1 style="font-size:20px;font-weight:700;color:#f0f0f0;margin:0 0 8px;">Sie wurden eingeladen</h1>
        <p style="color:#888;font-size:14px;margin:0 0 24px;">
          OKUN Systems hat Ihnen Zugang zum Kundenportal für <strong style="color:#f0f0f0;">${companyName}</strong> gewährt.
        </p>
        <div style="background:#141414;border:1px solid #2a2a2a;border-radius:8px;padding:20px;margin-bottom:24px;">
          <p style="color:#888;font-size:14px;margin:0 0 16px;line-height:1.6;">
            Klicken Sie auf den Button, um Ihr Konto zu erstellen und das Portal zu nutzen.<br>
            Die Einladung ist <strong style="color:#f0f0f0;">${expiryHours} Stunden</strong> gültig.
          </p>
          <a href="${inviteUrl}" style="display:inline-block;background:#22c55e;color:#000;font-weight:700;font-size:14px;text-decoration:none;padding:12px 24px;border-radius:8px;">
            Konto erstellen
          </a>
        </div>
        <p style="color:#555;font-size:12px;line-height:1.6;">
          Falls Sie diese Einladung nicht erwartet haben, können Sie diese E-Mail ignorieren.
        </p>
        <div style="margin-top:24px;padding-top:16px;border-top:1px solid #1e1e1e;">
          <p style="color:#444;font-size:11px;margin:0;">OKUN Systems · <a href="https://okun-systems.de" style="color:#444;">okun-systems.de</a></p>
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

  const portalUrl = process.env.NEXTAUTH_URL ?? process.env.APP_URL ?? "https://okun-systems.de";

  await resend.emails.send({
    from: FROM_ADDRESS,
    to: toEmail,
    subject: `Neuer Lerninhalt verfügbar: ${chapterTitle}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#0a0a0a;color:#f0f0f0;padding:32px;border-radius:12px;">
        <h1 style="font-size:20px;font-weight:700;color:#f0f0f0;margin:0 0 8px;">Neuer Lerninhalt verfügbar</h1>
        <p style="color:#888;font-size:14px;margin:0 0 24px;">
          Hallo ${toName}, für <strong style="color:#f0f0f0;">${companyName}</strong> wurde ein neues Lernkapitel freigeschaltet.
        </p>
        <div style="background:#141414;border:1px solid #2a2a2a;border-radius:8px;padding:20px;margin-bottom:24px;">
          <p style="margin:0 0 4px;font-weight:600;color:#f0f0f0;">${chapterTitle}</p>
          <p style="margin:4px 0 16px;color:#888;font-size:13px;">Jetzt im Lernbereich Ihres Portals verfügbar.</p>
          <a href="${portalUrl}/portal/lernen" style="display:inline-block;background:#22c55e;color:#000;font-weight:700;font-size:14px;text-decoration:none;padding:12px 24px;border-radius:8px;">
            Zum Lernbereich
          </a>
        </div>
        <div style="margin-top:24px;padding-top:16px;border-top:1px solid #1e1e1e;">
          <p style="color:#444;font-size:11px;margin:0;">OKUN Systems · <a href="https://okun-systems.de" style="color:#444;">okun-systems.de</a></p>
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
  const portalUrl = process.env.NEXTAUTH_URL ?? process.env.APP_URL ?? "https://okun-systems.de";
  await resend.emails.send({
    from: FROM_ADDRESS,
    to: toEmail,
    subject: `Neues Dokument verfügbar: ${documentTitle}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#0a0a0a;color:#f0f0f0;padding:32px;border-radius:12px;">
        <h1 style="font-size:20px;font-weight:700;color:#f0f0f0;margin:0 0 8px;">Neues Dokument verfügbar</h1>
        <p style="color:#888;font-size:14px;margin:0 0 24px;">Hallo ${toName}, für <strong style="color:#f0f0f0;">${companyName}</strong> wurde ein neues Dokument freigegeben.</p>
        <div style="background:#141414;border:1px solid #2a2a2a;border-radius:8px;padding:20px;margin-bottom:24px;">
          <p style="margin:0 0 4px;font-weight:600;color:#f0f0f0;">${documentTitle}</p>
          <p style="margin:4px 0 16px;color:#888;font-size:13px;">Jetzt im Dokumentenbereich Ihres Portals abrufbar.</p>
          <a href="${portalUrl}/portal/dokumente" style="display:inline-block;background:#22c55e;color:#000;font-weight:700;font-size:14px;text-decoration:none;padding:12px 24px;border-radius:8px;">Zum Dokumentenbereich</a>
        </div>
        <div style="margin-top:24px;padding-top:16px;border-top:1px solid #1e1e1e;">
          <p style="color:#444;font-size:11px;margin:0;">OKUN Systems · <a href="https://okun-systems.de" style="color:#444;">okun-systems.de</a></p>
        </div>
      </div>
    `,
  });
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
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#0a0a0a;color:#f0f0f0;padding:32px;border-radius:12px;">
        <h1 style="font-size:20px;font-weight:700;color:#f0f0f0;margin:0 0 8px;">Passwort zurücksetzen</h1>
        <p style="color:#888;font-size:14px;margin:0 0 24px;">Sie haben eine Anfrage zum Zurücksetzen Ihres Passworts gestellt.</p>
        <div style="background:#141414;border:1px solid #2a2a2a;border-radius:8px;padding:20px;margin-bottom:24px;">
          <p style="color:#888;font-size:14px;margin:0 0 16px;line-height:1.6;">
            Klicken Sie auf den Button, um ein neues Passwort zu vergeben.<br>
            Der Link ist <strong style="color:#f0f0f0;">2 Stunden</strong> gültig.
          </p>
          <a href="${resetUrl}" style="display:inline-block;background:#22c55e;color:#000;font-weight:700;font-size:14px;text-decoration:none;padding:12px 24px;border-radius:8px;">Neues Passwort vergeben</a>
        </div>
        <p style="color:#555;font-size:12px;">Falls Sie keine Zurücksetzung beantragt haben, ignorieren Sie diese E-Mail.</p>
        <div style="margin-top:24px;padding-top:16px;border-top:1px solid #1e1e1e;">
          <p style="color:#444;font-size:11px;margin:0;">OKUN Systems · <a href="https://okun-systems.de" style="color:#444;">okun-systems.de</a></p>
        </div>
      </div>
    `,
  });
}
