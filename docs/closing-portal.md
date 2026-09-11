# OKUN Closing Portal

Vertragsabschluss, Beweiskette, Vertragsaufzeichnung und Rechnungssystem —
aufgesetzt auf das bestehende Sales-/Closing-Modul.

---

## 1. Ablauf

```
Lead
 └─ Stammdaten vollständig (rechtsformabhängig geprüft)
     └─ Closing Meeting erstellen
         └─ Angebot auswählen und präsentieren
             └─ „Vertragsabschluss starten“  →  Contract Snapshot (eingefroren)
                 └─ Kunde bestätigt Erklärungen  →  Audit Events (append-only)
                     └─ Closing-Script gerendert  →  Aufzeichnung freigegeben
                         └─ Aufzeichnung starten / beenden
                             └─ Migration nach R2 + Verifizierung  →  archiviert
                                 └─ Vertrag abschließen  →  Abschlussprotokoll (PDF, gehasht)
                                     └─ Rechnung erstellen und finalisieren
                                         └─ Zahlung bestätigt (Stripe-Webhook oder Admin)
                                             └─ Kunde aktiviert  →  Portal/Blueprint frei
```

Der Status entsteht ausschließlich aus diesen Ereignissen. Ein freies Setzen
regulärer Status über ein Dropdown gibt es nicht mehr; `lost` und `cancelled`
sind administrativ setzbar und verlangen eine Begründung, die als Ereignis
protokolliert wird.

---

## 2. Geänderte und neue Dateien

### Bibliotheken (`src/lib/`)

| Datei | Zweck |
|---|---|
| `money.ts` | Geldarithmetik in Cent, Mengen in Milli-Einheiten, deutsche/englische Eingabeformate |
| `action-result.ts` | Einheitliche Fehlerauswertung von Server Actions im Client |
| `auth-guards.ts` | `requireAdmin` / `requireSales` / `requireSessionAccess` / `requireLeadAccess` |
| `company-settings.ts` | Unternehmensdaten für Dokumente; fehlende Werte bleiben „nicht konfiguriert" |
| `closing/state-machine.ts` | Statusmaschine inkl. Normalisierung alter Werte und `forwardPath` |
| `closing/master-data.ts` (+`master-data-catalog.ts`) | Feldkatalog und rechtsformabhängige Pflichtprüfung |
| `closing/snapshot.ts` | Contract Snapshot erzeugen, Integrität prüfen |
| `closing/consent-resolver.ts` (+`consent-types.ts`) | Erforderliche Erklärungen serverseitig auflösen |
| `closing/consent.ts` | Bestätigung validieren, Audit Events schreiben, Korrekturen anhängen |
| `closing/scripts.ts` (+`script-types.ts`), `closing/script-service.ts` | Script-Zusammenstellung, Platzhalter-Rendering, Einfrieren |
| `closing/recording.ts` | Freigabeprüfung, Daily.co Start/Stop, R2-Migration, Schutzfrist |
| `closing/certificate.ts` | Elektronisches Abschlussprotokoll |
| `closing/payments.ts`, `closing/activation.ts` | Zahlungsbestätigung und idempotente Kundenaktivierung |
| `closing/token.ts` | Kundentoken: 32 Byte Zufall, nur Hash in der DB, 72 h, widerrufbar |
| `closing/client-view.ts` | Aufbereiteter, gefilterter Datenstand für die Kundenseite |
| `closing/role-access.ts` | Bereichsschranke je Rolle (welche Adminpfade eine Rolle betreten darf) |
| `documents/template-engine.ts` | `{{pfad}}`, `{{#each}}`, `{{#if}}/{{else}}`, HTML-Escaping |
| `documents/render.ts` | Template → HTML → PDF → SHA-256 → R2 → Verifizierung |
| `documents/hash.ts` | SHA-256, kanonisches JSON-Hashing, R2-Download/Verify |
| `documents/default-templates.ts`, `documents/branding.ts` | OKUN-Briefbogen (nur Layout) |
| `invoicing/calc.ts` (+`vat-modes.ts`) | Serverseitiger Rechenkern |
| `invoicing/numbering.ts` | Concurrency-sichere Nummernkreise |
| `invoicing/invoice.ts`, `invoicing/context.ts` | Entwurf aus Closing, Finalisierung, Template-Kontext |

### Seiten und Aktionen

| Pfad | Inhalt |
|---|---|
| `/admin/einstellungen/team` | Interne Benutzer: Closer und Administratoren anlegen, Rolle ändern, deaktivieren |
| `/admin/einstellungen/unternehmen` | Unternehmensdaten |
| `/admin/einstellungen/vertragsdokumente` | Dokumente, unveränderliche Versionen, Prüfsummen **und** die zugehörigen Checkbox-Texte inkl. Aufzeichnungs-Einwilligung — auf einer Seite |
| `/admin/einstellungen/closing-scripts` | Teleprompter-Texte und Platzhalterkatalog |
| `/admin/einstellungen/vorlagen` | Vorlagen-Editor, Versionen, Custom Placeholder, Live-Vorschau |
| `/admin/sales/leads/[id]` | Stammdatenpanel; „Closing Meeting erstellen" erst bei Vollständigkeit |
| `/admin/sales/closing/[sessionId]` | Tab „Vertragsabschluss" mit Teleprompter und Recording-Steuerung |
| `/admin/sales/closing/[sessionId]/audit` | Read-only Abschlussnachweis |
| `/admin/sales/rechnungen/neu`, `/[id]` | Rechnungseditor mit dynamischen Positionen und Vorschau |
| `/closing/[token]` | Kundenseite: Angebot → Unterlagen → Bestätigen → Aufzeichnung → Zahlung → Abschluss |

### API-Routen

Neu: `/api/closing/state`, `/api/closing/confirm`, `/api/closing/document`,
`/api/admin/contract-documents/upload`, `/api/admin/contract-documents/download`,
`/api/admin/invoices/preview`, `/api/admin/invoices/pdf`, `/api/admin/template-preview`.

Entfernt, weil sie `accepted = true` ungeprüft aus dem Browser übernommen bzw.
die Einwilligungsprüfung umgangen haben:
`/api/closing/consent`, `/api/closing/batch-consent`, `/api/closing/set-pending-action`,
`/api/closing/legal-doc-pdf`, `/api/daily/start-recording`, `/api/daily/stop-recording`.

---

## 3. Datenmodell

**Neue Modelle:** `ContractDocument`, `ConsentDefinition`, `ConsentDefinitionRevision`,
`ConsentAuditEvent`, `ClosingScript`, `ClosingScriptRevision`, `ClosingRecording`,
`ClosingCertificate`, `DocumentTemplate`, `DocumentTemplateVersion`, `CustomPlaceholder`,
`InvoiceNumberSequence`, `InvoicePaymentEvent`, `StripeWebhookEvent`, `MasterDataRequirement`.

**Erweitert:** `Company` (Stammdaten), `LegalDocument` (jetzt unveränderliche Dokumentversion
mit `sha256`, `contractDocumentId`, `supersedesId`, Gültigkeiten), `ClosingSession`,
`ContractSnapshot` (native `Json`), `Offer`/`OfferTemplate`/`OfferLineItem` (Konditionen),
`Invoice`/`InvoiceItem` (Minor Units), `ClosingEvent` (`idempotencyKey`).

**Kompatibilität:** Alle neuen Spalten auf bestehenden Tabellen sind NULL-bar oder haben
einen Default — `prisma db push --accept-data-loss` (das Deploy-Kommando) verliert dadurch
keine Daten. Es wird keine Spalte entfernt.

**Migration:** `prisma/migrations/20260910_closing_portal/migration.sql` dokumentiert die
Änderung als SQL. Da das Deployment `db push` nutzt, laufen die Datenmigrationen zusätzlich
über `prisma/seed-closing.ts` (idempotent, im Start-Kommando ergänzt):

* bestehende `LegalDocument`-Zeilen werden als Versionen eines `ContractDocument` verknüpft,
* alte Statuswerte (`in_progress`, `consent_given`, `verloren`, …) werden normalisiert,
* bestehende Rechnungsbeträge werden in die Minor-Unit-Felder gespiegelt,
* der Stammdatenkatalog und die OKUN-Standardvorlagen werden angelegt.

Unveränderte Auslieferungsvorlagen werden bei einem Update als **neue Version**
nachgezogen; sobald ein Admin die Vorlage bearbeitet hat, bleibt seine Fassung maßgeblich.

---

## 4. Sicherheitsentscheidungen

* **Kein Vertrauen in den Browser.** `/api/closing/confirm` nimmt nur entgegen, *welche*
  Checkboxen gesetzt wurden. Welche erforderlich sind, ihr Wortlaut, die Dokumentversion und
  der Zeitstempel stammen ausschließlich aus dem Server bzw. dem eingefrorenen Snapshot.
  Fehlt eine Pflichterklärung, wird gar nichts protokolliert (HTTP 422).
* **Append-only Audit.** `ConsentAuditEvent` wird nie über das Admin-UI verändert oder
  gelöscht. Korrekturen entstehen als Folgeevent mit `supersedesEventId` und Begründung.
* **Unveränderliche Dokumentversionen.** Eine neue Version ist eine neue Zeile mit eigenem
  R2-Objekt. Kunde A bleibt dauerhaft mit AGB 1.2 und deren Hash verbunden, auch nachdem
  1.3 aktiviert wurde.
* **Aufzeichnung nur nach Einwilligung.** `checkRecordingRelease()` prüft Snapshot,
  Pflichterklärungen, RECORDING_CONSENT, gerendertes Script und Videoraum. Ohne echte
  Daily-Aufzeichnungs-ID wird der Vorgang nicht als „läuft" markiert.
* **Recording-Migration.** Die Daily-Kopie wird erst nach verifiziertem R2-Upload und
  abgelaufener Schutzfrist (Default 24 h, `RECORDING_DAILY_DELETE_AFTER_HOURS`) gelöscht.
  Scheitert die Migration, bleibt sie erhalten, der Status ist `migration_failed` und im
  Closing erscheint eine Warnung mit Retry.
* **Zahlungen.** Stripe wird ausschließlich über den signierten Webhook bestätigt; jede
  Event-ID wird genau einmal verarbeitet (`StripeWebhookEvent`). Die Bestätigung einer
  Rechnungszahlung durch den Admin erzeugt ein `InvoicePaymentEvent` mit Admin, Zeitpunkt,
  vorherigem und neuem Status.
* **Token.** 32 Byte Zufall, nur SHA-256 in der DB, 72 h Gültigkeit
  (`CLOSING_TOKEN_TTL_HOURS`), widerrufbar; eine Neuausstellung invalidiert das alte Token.
* **Downloads.** Private R2-Objekte werden nur über kurzlebige Signed URLs (300 s) oder
  autorisierte Endpunkte ausgeliefert. Die Kundenseite kann ausschließlich Dokumentversionen
  öffnen, die zu ihrem Abschluss gehören. Die Aufzeichnung wird dem Kunden **nicht**
  bereitgestellt.
* **Idempotenz.** Unique-Constraints statt Best-Effort-Prüfungen:
  `ContractSnapshot.closingSessionId`, `ConsentAuditEvent.idempotencyKey`,
  `ClosingCertificate(closingSessionId, version)`, `Invoice.idempotencyKey`,
  `InvoicePaymentEvent.idempotencyKey`, `ClosingEvent.idempotencyKey`,
  `StripeWebhookEvent.id`.

---

## 5. ENV-Variablen

Bestehend und weiterhin erforderlich: `DATABASE_URL`, `AUTH_SECRET`/`NEXTAUTH_SECRET`,
`NEXTAUTH_URL`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`,
`R2_BUCKET_NAME`, `R2_PUBLIC_URL`, `DAILY_API_KEY`, `STRIPE_SECRET_KEY`,
`STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`.

Neu (alle optional, mit sicheren Defaults):

| Variable | Default | Zweck |
|---|---|---|
| `CLOSING_TOKEN_TTL_HOURS` | `72` | Gültigkeit des Kundenlinks |
| `PORT` | `3000` | von Railway gesetzt |
| `RECORDING_DAILY_DELETE_AFTER_HOURS` | `24` | Schutzfrist vor Löschen der Daily-Kopie |
| `R2_ENDPOINT` | Cloudflare-Endpunkt | abweichender S3-kompatibler Endpunkt |
| `R2_FORCE_PATH_STYLE` | `false` | Path-Style-Adressierung |
| `DAILY_API_BASE` | `https://api.daily.co/v1` | abweichende Daily-Basis-URL |
| `DAILY_ROOM_MIN_LIFETIME_HOURS` | `4` | Mindestgültigkeit eines neu angelegten Videoraums |
| `PUPPETEER_EXECUTABLE_PATH` | automatisch gesucht | Chromium für die PDF-Erzeugung |

---

## 6. Rollen

| Rolle | Zugriff |
|---|---|
| `ADMIN` | Alles: Einstellungen, Vorlagen, Vertragsdokumente, Erklärungen, Scripts, Kunden, Rechnungen, Zahlungsbestätigung |
| `CLOSER` | Ausschließlich `/admin/sales/**`, und dort nur die ihm zugewiesenen Leads und Closings |
| `CLIENT` | Kein Adminbereich; ausschließlich Daten des eigenen Unternehmens |

Die Abgrenzung wirkt auf drei Ebenen:

1. **Bereichsschranke** (`role-access.ts`): `proxy.ts` leitet früh um, das Admin-Layout prüft
   denselben Pfad noch einmal gegen die **in der Datenbank** hinterlegte Rolle — ein altes JWT
   genügt also nicht.
2. **Zuweisungsprüfung** (`auth-guards.ts`): `requireSessionAccess`, `requireLeadAccess` und
   `requireInvoiceAccess` lassen einen Closer nur an eigene Vorgänge. Eine Rechnung ohne
   Closing-Bezug ist Adminsache.
3. **Vorbehaltene Aktionen**: Zahlungseingänge bestätigt nur ein Administrator (§ 19 B).

Deaktivierte Konten (`User.deactivatedAt`) können sich weder anmelden noch mit einer bereits
bestehenden Sitzung weiterarbeiten — `getActor()` prüft den Zustand bei jedem Zugriff.

Neue interne Benutzer bekommen kein Passwort, sondern einen Einrichtungslink (7 Tage).

---

## 7. Tests

```bash
npm run test:unit    # Rechenkerne, Template Engine, Statusmaschine, Stammdaten, Rollenpfade
npm run test:e2e     # vollständiger Durchlauf gegen echte PostgreSQL
npm run test:http    # Routing, Autorisierung, Idempotenz gegen laufenden Server
npm run test:roles   # echter Login als Closer: Bereichsschranke und Isolation
npm run test:daily   # Videoräume: vergangene Termine, Namenskollisionen, Fehlermeldungen
```

`test:e2e` startet lokale Test-Doubles für R2 und Daily.co (`tests/harness/`) und benötigt
nur `DATABASE_URL` und ein Chromium. `test:http` und `test:roles` erwarten einen laufenden
Server (`BASE_URL`, Default `http://localhost:3100`); `test:http` zusätzlich dasselbe
`STRIPE_WEBHOOK_SECRET`.

---

## 8. Admin-Anleitung

1. **Closer anlegen** — *Einstellungen → Closing Portal → Team & Closer → Benutzer anlegen*.
   Name, E-Mail, Rolle *Closer*. Der Closer erhält eine E-Mail mit Einrichtungslink und setzt
   sein Passwort selbst; ist kein Mailversand konfiguriert, wird der Link angezeigt und lässt
   sich kopieren. Danach im Lead unter *Zugewiesener Closer* auswählen.
2. **Unternehmensdaten hinterlegen** — *Einstellungen → Closing Portal → Unternehmensdaten*.
   Ohne Firmierung, Anschrift und E-Mail erscheint auf Rechnungen „nicht konfiguriert".
3. **Vertragsdokument hochladen** — *Vertragsdokumente → Dokument anlegen* (z. B. AGB),
   dann *Neue Version*: PDF hochladen, Versionsnummer setzen, „sofort aktivieren" aktiv
   lassen. Der SHA-256-Hash wird beim Upload über die gespeicherten Bytes gebildet.
4. **Version aktivieren** — jede Version lässt sich einzeln aktivieren. Die bisher aktive
   wird nur deaktiviert, niemals überschrieben. Bereits erteilte Zustimmungen bleiben mit
   ihrer Version verknüpft.
5. **Checkbox konfigurieren** — *Erklärungen*: Titel, Typ, exakter Checkbox-Text,
   Dokumentzuordnung, Pflicht/optional, Paketzuordnung, Reihenfolge. Für die Aufzeichnung
   eine Erklärung vom Typ *Einwilligung Vertragsaufzeichnung* anlegen; ohne sie lässt sich
   keine Aufzeichnung starten. Eine Textänderung erhöht die Version und wirkt nur auf neue
   Abschlüsse.
6. **Closing Script erstellen** — *Closing Scripts*: mindestens eine *Allgemeine Einleitung*
   und eine *Verbindliche Annahme*. Platzhalter wie `{{package_name}}` oder
   `{{one_time_price_net}}` stehen unten auf der Seite.
7. **Script einem Paket zuordnen** — Script vom Typ *Paket-Abschnitt* anlegen und das Paket
   wählen. Ohne Auswahl gilt es für alle Pakete, für die kein spezifisches Script existiert.
   *Add-on*-Blöcke greifen über den Add-on-Schlüssel (`recurring`, `workforce`, `care` oder
   die Bezeichnung einer Zusatzleistung).
8. **Rechnungsvorlage konfigurieren** — *Dokumentvorlagen*: HTML und CSS bearbeiten,
   *Vorschau aktualisieren*, dann *Als neue Version speichern*. Alte Versionen bleiben
   erhalten und lassen sich wiederherstellen.
9. **Custom Placeholder erstellen** — auf derselben Seite unter *Eigene Platzhalter*:
   Schlüssel (z. B. `project_reference`), Anzeigename, Typ. Im Template als
   `{{custom.project_reference}}` verwendbar; im Rechnungseditor erscheint dafür ein
   Eingabefeld. Systemfelder wie `invoice.gross_total` sind geschützt.
10. **Test-Closing durchführen** — Lead anlegen, Stammdaten vervollständigen, Closing Meeting
   erstellen, Angebot präsentieren, *Vertragsabschluss starten*, Kundenlink öffnen,
   Erklärungen bestätigen, Aufzeichnung starten und beenden, Vertrag abschließen, Rechnung
   erstellen und finalisieren, Zahlungseingang bestätigen.
11. **Audit-Protokoll prüfen** — im Closing über *Abschlussnachweis*
    (`/admin/sales/closing/<id>/audit`): Stammdaten-Snapshot, Contract Snapshot mit
    Integritätsprüfung, jede Erklärung mit Wortlaut, Zeitstempel und Dokument-Hash, das
    gerenderte Script, die Aufzeichnung, das Abschlussprotokoll, Zahlungs- und
    Aktivierungsstatus sowie das vollständige Ereignisprotokoll.

---

## 9. Deployment-Hinweise

**Healthcheck.** `railway.json` enthält bewusst keinen `healthcheckPath` mehr. Grund: `/`
liefert für einen nicht angemeldeten Aufrufer einen **307 auf `/login`** — je nach
Prüfverhalten wertet Railway das als Fehlschlag, obwohl die Anwendung läuft.

Wer den Check wieder aktivieren möchte, nimmt dafür `/api/health`. Der Endpunkt ist
anmeldefrei, weiterleitungsfrei und berührt weder Datenbank noch Drittsysteme — er belegt
genau das, was ein Healthcheck belegen soll: der Prozess beantwortet Anfragen.

```json
"deploy": { "healthcheckPath": "/api/health" }
```

**Videoräume.** Daily.co lehnt Räume ab, deren Ablaufzeit in der Vergangenheit liegt, und
ebenso einen bereits vergebenen Raumnamen. Beides fängt `src/lib/daily.ts` ab: die
Ablaufzeit wird auf mindestens `DAILY_ROOM_MIN_LIFETIME_HOURS` ab jetzt angehoben, ein
vorhandener Raum wird weiterverwendet und bei Bedarf verlängert. Fehlermeldungen von Daily
werden unverändert an die Oberfläche gereicht, statt hinter einem allgemeinen Text zu
verschwinden.

Scheitert die Raumerstellung beim Anlegen eines Closings, entsteht die Session trotzdem —
mit einem Hinweis. Der Raum lässt sich im Termin jederzeit nachträglich anlegen. Ohne
Videoraum gibt `checkRecordingRelease()` die Aufzeichnung allerdings nicht frei.

**Startkette.** Jeder Seed-Schritt ist in `( … || echo "WARNUNG …" )` gekapselt. Ein
scheiternder Seed schreibt damit eine Warnung ins Deploy-Log, verhindert aber nicht mehr,
dass `npm start` ausgeführt wird. Nur `prisma db push` bleibt eine harte Voraussetzung —
ohne passendes Schema wäre ein Start sinnlos.

Der Closing-Bootstrap (`seed-closing.ts`) beendet sich zusätzlich immer mit Code 0: er ist
idempotent und läuft beim nächsten Deploy erneut.

---

## 10. Bekannte offene Punkte

* **Aufzeichnungs-Zugriff für Kunden** ist bewusst nicht implementiert — Recordings liegen
  privat in R2 und erscheinen nicht in der Kundenablage. Eine spätere Freigabe braucht eine
  eigene Berechtigungslogik.
* **Retention Policies** sind vorbereitet (`ClosingRecording.retentionUntil`,
  `dailyDeleteAfter`), aber es läuft noch kein automatischer Job. `deleteDailyCopyIfDue()`
  wird derzeit manuell bzw. aus dem Closing heraus aufgerufen.
* **Briefbogen-Feinabgleich**: Die Vorlage ist am OKUN-Branding gebaut (Logo, Akzentfarbe,
  DIN-5008-naher Aufbau). Die exakte Word-Vorlage lag nicht vor; Abweichungen lassen sich im
  Vorlagen-Editor ohne Code-Änderung angleichen.
* **Auftragsbestätigung, Mahnung, Abnahme-/Strategieprotokoll** sind als Dokumenttypen in der
  Template Engine vorgesehen, aber noch ohne eigene Vorlage und UI.
* **Legacy-Bereich** *Einstellungen → Rechtliche Dokumente* bleibt für Altbestände bestehen.
  Für neue Abschlüsse ist ausschließlich *Vertragsdokumente* maßgeblich.
