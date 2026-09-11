/**
 * Standard-Dokumentvorlagen im OKUN-Briefbogendesign.
 *
 * Diese Vorlagen enthalten ausschließlich Layout und Platzhalter — sämtliche
 * Inhalte (Firmierung, Anschrift, Bankdaten, Fußzeilentexte) stammen aus den
 * Unternehmenseinstellungen bzw. den Vertragsdaten. Es sind keine erfundenen
 * Werte hinterlegt; nicht gepflegte Angaben erscheinen als „nicht konfiguriert".
 *
 * Der Admin kann jede Vorlage im Vorlagen-Editor anpassen; jede Änderung legt
 * eine neue Version an.
 */

const SHARED_CSS = `
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
    font-size: 10pt;
    line-height: 1.5;
    color: #0f1720;
    background: #ffffff;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .sheet { width: 210mm; min-height: 297mm; padding: 18mm 20mm 24mm; position: relative; }
  .letterhead { display: flex; align-items: flex-start; justify-content: space-between; gap: 12mm; }
  .letterhead__logo img { height: 13mm; display: block; }
  .letterhead__wordmark { font-size: 17pt; font-weight: 700; letter-spacing: .12em; color: #0f1720; }
  .letterhead__meta { text-align: right; font-size: 8pt; color: #5b6b7f; line-height: 1.45; }
  .rule { height: 2px; background: linear-gradient(90deg, #00b8ff 0%, #0284b8 38%, #d8e0ea 38%); margin: 6mm 0 10mm; }
  .addresses { display: flex; justify-content: space-between; gap: 14mm; }
  .address { width: 85mm; }
  .address__return { font-size: 7pt; color: #5b6b7f; border-bottom: .4pt solid #d8e0ea; padding-bottom: 1.5mm; margin-bottom: 3mm; }
  .address__line { display: block; }
  .address__name { font-weight: 600; }
  .factbox { width: 68mm; font-size: 9pt; }
  .factbox__row { display: flex; justify-content: space-between; gap: 6mm; padding: 1.1mm 0; border-bottom: .4pt solid #eef2f7; }
  .factbox__row:last-child { border-bottom: 0; }
  .factbox__key { color: #5b6b7f; }
  .factbox__value { font-weight: 600; text-align: right; }
  h1 { font-size: 15pt; font-weight: 700; margin: 12mm 0 2mm; letter-spacing: -.01em; }
  .subtitle { color: #5b6b7f; font-size: 9pt; margin: 0 0 6mm; }
  h2 { font-size: 10pt; font-weight: 700; margin: 8mm 0 2.5mm; text-transform: uppercase; letter-spacing: .08em; color: #0f1720; }
  p { margin: 0 0 3mm; }
  table { width: 100%; border-collapse: collapse; }
  .items thead th {
    font-size: 8pt; text-transform: uppercase; letter-spacing: .06em; color: #5b6b7f;
    text-align: left; padding: 2mm 2mm 2mm 0; border-bottom: 1pt solid #0f1720;
  }
  .items tbody td { padding: 2.4mm 2mm 2.4mm 0; border-bottom: .4pt solid #e6ecf3; vertical-align: top; }
  .items .num { text-align: right; white-space: nowrap; }
  .items .pos { width: 8mm; color: #5b6b7f; }
  .items .desc__note { display: block; color: #5b6b7f; font-size: 8.5pt; margin-top: .8mm; }
  .totals { margin-top: 6mm; display: flex; justify-content: flex-end; }
  .totals__inner { width: 82mm; }
  .totals__row { display: flex; justify-content: space-between; padding: 1.6mm 0; font-size: 9.5pt; }
  .totals__row--sum { border-top: .6pt solid #d8e0ea; }
  .totals__row--grand {
    border-top: 1.2pt solid #0f1720; margin-top: 1.5mm; padding-top: 2.5mm;
    font-size: 12pt; font-weight: 700;
  }
  .note { background: #f5f8fb; border-left: 2pt solid #00b8ff; padding: 3mm 4mm; font-size: 9pt; margin: 6mm 0 0; }
  .footer {
    position: absolute; left: 20mm; right: 20mm; bottom: 10mm;
    border-top: .4pt solid #d8e0ea; padding-top: 3mm;
    display: flex; gap: 8mm; font-size: 7.5pt; color: #5b6b7f; line-height: 1.45;
  }
  .footer__col { flex: 1; }
  .footer__title { font-weight: 700; color: #0f1720; margin-bottom: .8mm; }
  .muted { color: #5b6b7f; }
  .unset { color: #97a5b8; font-style: italic; }
  .kv { display: flex; gap: 4mm; padding: 1.4mm 0; border-bottom: .4pt solid #eef2f7; font-size: 9pt; }
  .kv__key { width: 52mm; color: #5b6b7f; flex-shrink: 0; }
  .kv__value { flex: 1; }
  .hash { font-family: "SFMono-Regular", Consolas, monospace; font-size: 7.5pt; word-break: break-all; }
  .consent { border: .4pt solid #d8e0ea; border-radius: 2mm; padding: 3mm 4mm; margin-bottom: 3mm; }
  .consent__text { font-size: 9pt; }
  .consent__meta { font-size: 8pt; color: #5b6b7f; margin-top: 1.5mm; }
  .badge { display: inline-block; font-size: 8pt; font-weight: 700; color: #0284b8; }
  .page-break { page-break-before: always; }
`;

const LETTERHEAD = `
  <div class="letterhead">
    <div class="letterhead__logo">
      {{#if company.logoDataUri}}<img src="{{company.logoDataUri}}" alt="">{{else}}<div class="letterhead__wordmark">OKUN</div>{{/if}}
    </div>
    <div class="letterhead__meta">
      {{#each company.headerLines}}<div>{{this}}</div>{{/each}}
    </div>
  </div>
  <div class="rule"></div>
`;

const FOOTER = `
  <div class="footer">
    <div class="footer__col">
      <div class="footer__title">{{company.name}}</div>
      {{#each company.addressLines}}<div>{{this}}</div>{{/each}}
    </div>
    <div class="footer__col">
      <div class="footer__title">Kontakt</div>
      <div>{{company.email}}</div>
      <div>{{company.phone}}</div>
      <div>{{company.website}}</div>
    </div>
    <div class="footer__col">
      <div class="footer__title">Register &amp; Steuern</div>
      <div>{{company.registerCourt}} {{company.registerNumber}}</div>
      <div>Steuernummer: {{company.taxNumber}}</div>
      <div>USt-IdNr.: {{company.vatId}}</div>
    </div>
    <div class="footer__col">
      <div class="footer__title">Bankverbindung</div>
      <div>{{company.bankName}}</div>
      <div>IBAN {{company.iban}}</div>
      <div>BIC {{company.bic}}</div>
    </div>
  </div>
`;

export const INVOICE_TEMPLATE_HTML = `<div class="sheet">
${LETTERHEAD}
  <div class="addresses">
    <div class="address">
      <div class="address__return">{{company.returnAddressLine}}</div>
      {{#each customer.addressLines}}<span class="address__line">{{this}}</span>{{/each}}
    </div>
    <div class="factbox">
      <div class="factbox__row"><span class="factbox__key">Rechnungsnummer</span><span class="factbox__value">{{invoice.number}}</span></div>
      <div class="factbox__row"><span class="factbox__key">Rechnungsdatum</span><span class="factbox__value">{{invoice.date}}</span></div>
      {{#if invoice.servicePeriod}}<div class="factbox__row"><span class="factbox__key">Leistungszeitraum</span><span class="factbox__value">{{invoice.servicePeriod}}</span></div>{{/if}}
      <div class="factbox__row"><span class="factbox__key">Fällig bis</span><span class="factbox__value">{{invoice.dueDate}}</span></div>
      {{#if customer.number}}<div class="factbox__row"><span class="factbox__key">Kundennummer</span><span class="factbox__value">{{customer.number}}</span></div>{{/if}}
      {{#if customer.vatId}}<div class="factbox__row"><span class="factbox__key">USt-IdNr. Kunde</span><span class="factbox__value">{{customer.vatId}}</span></div>{{/if}}
    </div>
  </div>

  <h1>Rechnung {{invoice.number}}</h1>
  <p class="subtitle">{{#if customer.contact}}{{customer.salutation}} {{customer.contact}}{{/if}}</p>
  {{#if invoice.introText}}<p>{{invoice.introText}}</p>{{/if}}

  <table class="items">
    <thead>
      <tr>
        <th class="pos">Pos.</th>
        <th>Beschreibung</th>
        <th class="num">Menge</th>
        <th class="num">Einzelpreis</th>
        <th class="num">USt.</th>
        <th class="num">Netto</th>
      </tr>
    </thead>
    <tbody>
      {{#each invoice.items}}
      <tr>
        <td class="pos">{{position}}</td>
        <td>{{description}}{{#if note}}<span class="desc__note">{{note}}</span>{{/if}}</td>
        <td class="num">{{quantity}}{{#if unit}} {{unit}}{{/if}}</td>
        <td class="num">{{unitPrice}}</td>
        <td class="num">{{vatRate}}</td>
        <td class="num">{{netAmount}}</td>
      </tr>
      {{/each}}
    </tbody>
  </table>

  <div class="totals">
    <div class="totals__inner">
      <div class="totals__row totals__row--sum"><span>Zwischensumme netto</span><span>{{invoice.netTotal}}</span></div>
      {{#each invoice.vatBreakdown}}
      <div class="totals__row"><span>zzgl. USt. {{rate}} auf {{net}}</span><span>{{vat}}</span></div>
      {{/each}}
      <div class="totals__row totals__row--grand"><span>Gesamtbetrag</span><span>{{invoice.grossTotal}}</span></div>
    </div>
  </div>

  {{#if invoice.vatNotice}}<div class="note">{{invoice.vatNotice}}</div>{{/if}}

  <h2>Zahlung</h2>
  <p>{{invoice.paymentTerms}}</p>
  {{#if company.paymentInfo}}<p class="muted">{{company.paymentInfo}}</p>{{/if}}

  {{#if invoice.notes}}<h2>Hinweise</h2><p>{{invoice.notes}}</p>{{/if}}
  {{#if invoice.footerNote}}<p class="muted">{{invoice.footerNote}}</p>{{/if}}
${FOOTER}
</div>`;

export const CLOSING_CERTIFICATE_TEMPLATE_HTML = `<div class="sheet">
${LETTERHEAD}
  <h1>Elektronisches Abschlussprotokoll</h1>
  <p class="subtitle">Protokoll-Nr. {{certificate.number}} · erstellt am {{certificate.generatedAt}} ({{certificate.timezone}})</p>

  <h2>Abschlussdaten</h2>
  <div class="kv"><span class="kv__key">Unternehmen</span><span class="kv__value">{{contract.organizationName}}{{#if contract.legalForm}} · {{contract.legalForm}}{{/if}}</span></div>
  <div class="kv"><span class="kv__key">Unternehmensanschrift</span><span class="kv__value">{{contract.addressLine}}</span></div>
  <div class="kv"><span class="kv__key">Handelnde Person</span><span class="kv__value">{{contract.actingPersonName}}</span></div>
  <div class="kv"><span class="kv__key">Rolle / Funktion</span><span class="kv__value">{{contract.actingPersonPosition}}</span></div>
  <div class="kv"><span class="kv__key">Datum / Uhrzeit</span><span class="kv__value">{{contract.closedAtDate}}, {{contract.closedAtTime}} ({{certificate.timezone}})</span></div>
  <div class="kv"><span class="kv__key">Closing-Session-ID</span><span class="kv__value hash">{{contract.closingSessionId}}</span></div>
  <div class="kv"><span class="kv__key">Contract-Snapshot-ID</span><span class="kv__value hash">{{contract.snapshotId}}</span></div>
  <div class="kv"><span class="kv__key">Closer</span><span class="kv__value">{{contract.closerName}}</span></div>

  <h2>Vertragsgrundlage</h2>
  <div class="kv"><span class="kv__key">Angebotsnummer</span><span class="kv__value">{{contract.offerNumber}}</span></div>
  <div class="kv"><span class="kv__key">Angebotsversion</span><span class="kv__value">{{contract.offerVersion}}</span></div>
  <div class="kv"><span class="kv__key">Paket</span><span class="kv__value">{{contract.packageName}}</span></div>
  <div class="kv"><span class="kv__key">Einmaliger Preis netto</span><span class="kv__value">{{contract.oneTimeNet}}</span></div>
  <div class="kv"><span class="kv__key">Umsatzsteuer</span><span class="kv__value">{{contract.vatRate}} · {{contract.oneTimeVat}}</span></div>
  <div class="kv"><span class="kv__key">Gesamtbetrag brutto</span><span class="kv__value">{{contract.oneTimeGross}}</span></div>
  {{#if contract.recurringNet}}<div class="kv"><span class="kv__key">Laufende Gebühren</span><span class="kv__value">{{contract.recurringNet}} {{contract.recurringInterval}}</span></div>{{/if}}
  {{#if contract.minimumTerm}}<div class="kv"><span class="kv__key">Mindestlaufzeit</span><span class="kv__value">{{contract.minimumTerm}} Monate</span></div>{{/if}}
  {{#if contract.hasExtras}}
  <div class="kv"><span class="kv__key">Zusatzleistungen</span><span class="kv__value">{{#each contract.extras}}{{description}} ({{netAmount}}){{#if @last}}{{else}}, {{/if}}{{/each}}</span></div>
  {{/if}}
  <div class="kv"><span class="kv__key">Zahlungsart</span><span class="kv__value">{{contract.paymentMethod}}</span></div>
  <div class="kv"><span class="kv__key">Zahlungsbedingungen</span><span class="kv__value">{{contract.paymentTerms}}</span></div>

  <h2>Elektronische Erklärungen</h2>
  {{#each consents}}
  <div class="consent">
    <div class="consent__text">„{{checkboxText}}"</div>
    <div class="consent__meta">
      <span class="badge">{{acceptedLabel}}</span> · protokolliert am {{timestamp}} ({{timezone}})
      {{#if documentName}} · zugeordnetes Dokument: {{documentName}} Version {{documentVersion}}{{/if}}
    </div>
  </div>
  {{/each}}

  <h2>Dokumentnachweise</h2>
  {{#each documents}}
  <div class="kv">
    <span class="kv__key">{{name}}<br><span class="muted">Version {{version}}</span></span>
    <span class="kv__value hash">SHA-256: {{sha256}}</span>
  </div>
  {{/each}}

  <h2>Vertragsaufzeichnung</h2>
  {{#if recording.present}}
  <div class="kv"><span class="kv__key">Recording-Referenz</span><span class="kv__value hash">{{recording.reference}}</span></div>
  <div class="kv"><span class="kv__key">Startzeit</span><span class="kv__value">{{recording.startedAt}}</span></div>
  <div class="kv"><span class="kv__key">Endzeit</span><span class="kv__value">{{recording.endedAt}}</span></div>
  <div class="kv"><span class="kv__key">Dauer</span><span class="kv__value">{{recording.duration}}</span></div>
  <div class="kv"><span class="kv__key">Archivierungsstatus</span><span class="kv__value">{{recording.statusLabel}}</span></div>
  {{#if recording.sha256}}<div class="kv"><span class="kv__key">SHA-256 der Aufzeichnung</span><span class="kv__value hash">{{recording.sha256}}</span></div>{{/if}}
  {{else}}
  <p class="muted">Für diesen Abschluss wurde keine Vertragsaufzeichnung erstellt.</p>
  {{/if}}

  <h2>Systemnachweis</h2>
  <div class="kv"><span class="kv__key">Zeitpunkt der Protokollerstellung</span><span class="kv__value">{{certificate.generatedAt}} ({{certificate.timezone}})</span></div>
  <div class="kv"><span class="kv__key">Protokoll-ID</span><span class="kv__value hash">{{certificate.number}}</span></div>
  <div class="kv"><span class="kv__key">Hash des Contract Snapshots</span><span class="kv__value hash">{{contract.snapshotHash}}</span></div>
  <div class="kv"><span class="kv__key">Hash dieses Protokolls</span><span class="kv__value hash">{{certificate.selfHashNotice}}</span></div>
${FOOTER}
</div>`;

export const DEFAULT_TEMPLATES = [
  {
    type: "invoice" as const,
    name: "OKUN Rechnung",
    description:
      "OKUN-Briefbogen für Rechnungen. Alle Firmen- und Bankdaten stammen aus den Unternehmenseinstellungen.",
    html: INVOICE_TEMPLATE_HTML,
    css: SHARED_CSS,
  },
  {
    type: "closing_certificate" as const,
    name: "OKUN Abschlussprotokoll",
    description:
      "Elektronisches Abschlussprotokoll mit Erklärungen, Dokument-Hashes und Aufzeichnungsnachweis.",
    html: CLOSING_CERTIFICATE_TEMPLATE_HTML,
    css: SHARED_CSS,
  },
];

export { SHARED_CSS as DEFAULT_TEMPLATE_CSS };
