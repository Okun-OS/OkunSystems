/**
 * Der Text der Datenschutzerklärung.
 *
 * Bewusst getrennt von der Seite, die ihn zeigt: Er ist ein Rechtstext und
 * wird als Ganzes ausgetauscht, wenn sich etwas ändert. Wer ihn pflegt, soll
 * nicht durch Layout blättern müssen — und wer am Layout arbeitet, nicht
 * versehentlich am Text.
 *
 * Diese Fassung deckt Website und Kundenportal ab, seit beide als eine
 * Anwendung unter derselben Adresse laufen.
 */

export type PrivacyBlock =
  | { kind: "text"; text: string }
  | { kind: "list"; items: string[] }
  | { kind: "term"; title: string; text: string }
  | { kind: "address"; lines: string[] };

export type PrivacySection = { title: string; blocks: PrivacyBlock[] };

export const PRIVACY_UPDATED = "September 2026";

/** Die Adresse für Datenschutzanfragen — an mehreren Stellen genannt. */
export const PRIVACY_EMAIL = "datenschutz@okun-systems.com";

const t = (text: string): PrivacyBlock => ({ kind: "text", text });
const li = (...items: string[]): PrivacyBlock => ({ kind: "list", items });
const addr = (...lines: string[]): PrivacyBlock => ({ kind: "address", lines });
const term = (title: string, text: string): PrivacyBlock => ({ kind: "term", title, text });

const OKUN_ADDRESS = addr(
  "OKUN SYSTEMS UG (haftungsbeschränkt)",
  "Potsdamer Platz 1",
  "10785 Berlin",
  "Deutschland"
);

export const PRIVACY_SECTIONS: PrivacySection[] = [
  {
    title: "Allgemeine Hinweise",
    blocks: [
      t("Der Schutz Ihrer personenbezogenen Daten ist uns wichtig."),
      t("Mit dieser Datenschutzerklärung informieren wir Sie darüber, welche personenbezogenen Daten beim Besuch unserer Website, bei der Nutzung unseres Kundenportals und der dort angebotenen Funktionen, bei der Kontaktaufnahme mit uns sowie im Rahmen der Anbahnung, Durchführung und Abwicklung unserer Vertragsbeziehungen verarbeitet werden."),
      t("Unsere öffentlich zugängliche Website und unser Kundenportal werden als gemeinsame Anwendung unter okun-systems.com betrieben. Je nachdem, welche Bereiche und Funktionen Sie nutzen, werden unterschiedliche personenbezogene Daten verarbeitet."),
      t("Personenbezogene Daten sind alle Informationen, die sich auf eine identifizierte oder identifizierbare natürliche Person beziehen. Hierzu gehören beispielsweise Name, E-Mail-Adresse, Telefonnummer, IP-Adresse, Konto- und Nutzungsdaten, Vertrags- und Abrechnungsdaten sowie Inhalte, die einer Person zugeordnet werden können."),
      t("Wir verarbeiten personenbezogene Daten ausschließlich im Rahmen der geltenden datenschutzrechtlichen Vorschriften, insbesondere der Datenschutz-Grundverordnung (DSGVO), des Bundesdatenschutzgesetzes (BDSG) sowie, soweit einschlägig, des Telekommunikation-Digitale-Dienste-Datenschutz-Gesetzes (TDDDG)."),
    ],
  },
  {
    title: "Verantwortlicher",
    blocks: [
      t("Verantwortlicher im Sinne der Datenschutz-Grundverordnung ist:"),
      OKUN_ADDRESS,
      t("Geschäftsführer: Felix Okun"),
      t("Telefon: 030 13883330"),
      t("E-Mail: kontakt@okun-systems.com"),
      t("Website: https://okun-systems.com"),
      t("Für Datenschutzanfragen erreichen Sie uns unter:"),
      t(PRIVACY_EMAIL),
    ],
  },
  {
    title: "Datenschutzbeauftragter und Datenschutzkontakt",
    blocks: [
      t("Soweit für unser Unternehmen keine gesetzliche Verpflichtung zur Bestellung eines Datenschutzbeauftragten besteht, ist derzeit kein Datenschutzbeauftragter bestellt."),
      t("Bei Fragen zum Datenschutz, zur Verarbeitung Ihrer personenbezogenen Daten oder zur Ausübung Ihrer Datenschutzrechte können Sie sich jederzeit an uns wenden:"),
      t(PRIVACY_EMAIL),
    ],
  },
  {
    title: "Rechtsgrundlagen der Datenverarbeitung",
    blocks: [
      t("Wir verarbeiten personenbezogene Daten nur, soweit hierfür eine gesetzliche Rechtsgrundlage besteht."),
      t("Je nach Verarbeitung kommen insbesondere folgende Rechtsgrundlagen in Betracht:"),
      term("Art. 6 Abs. 1 lit. a DSGVO – Einwilligung", "Die betroffene Person hat ihre Einwilligung in die Verarbeitung ihrer personenbezogenen Daten für einen oder mehrere bestimmte Zwecke erteilt."),
      t("Dies betrifft insbesondere Verarbeitungen, die ausdrücklich nur nach vorheriger Einwilligung erfolgen, beispielsweise eine Aufzeichnung eines Vertragsabschlussgesprächs."),
      term("Art. 6 Abs. 1 lit. b DSGVO – Vertrag und vorvertragliche Maßnahmen", "Die Verarbeitung ist erforderlich, um einen Vertrag zu erfüllen oder auf Anfrage der betroffenen Person vorvertragliche Maßnahmen durchzuführen."),
      t("Dies betrifft insbesondere die Nutzung vertraglich vereinbarter Funktionen unseres Kundenportals, die Erstellung von Analysen und Berichten sowie die Vertrags- und Zahlungsabwicklung."),
      term("Art. 6 Abs. 1 lit. c DSGVO – Rechtliche Verpflichtung", "Die Verarbeitung ist erforderlich, um einer rechtlichen Verpflichtung nachzukommen, der wir unterliegen."),
      t("Dies betrifft insbesondere handels-, steuer- und buchführungsrechtliche Aufbewahrungs- und Dokumentationspflichten."),
      term("Art. 6 Abs. 1 lit. f DSGVO – Berechtigte Interessen", "Die Verarbeitung ist zur Wahrung unserer berechtigten Interessen oder der berechtigten Interessen eines Dritten erforderlich, sofern nicht die Interessen oder Grundrechte und Grundfreiheiten der betroffenen Person überwiegen."),
      t("Unsere berechtigten Interessen können insbesondere bestehen in:"),
      li(
        "dem sicheren, stabilen und wirtschaftlichen Betrieb unserer Website und unseres Kundenportals,",
        "der Gewährleistung der IT- und Anwendungssicherheit,",
        "der Bearbeitung geschäftlicher Anfragen,",
        "der Kommunikation mit Interessenten, Kunden und Geschäftspartnern,",
        "der Durchführung von Vertragsbeziehungen mit Unternehmen, soweit Ansprechpartner oder Beschäftigte eines Vertragspartners betroffen sind,",
        "der Verhinderung von Missbrauch und Betrug,",
        "der Dokumentation geschäftlicher Vorgänge,",
        "der Durchsetzung vertraglicher Ansprüche,",
        "sowie der Geltendmachung, Ausübung oder Verteidigung von Rechtsansprüchen."
      ),
    ],
  },
  {
    title: "Hosting und Bereitstellung über Railway",
    blocks: [
      t("Unsere Website und unser Kundenportal werden über die Hosting- und Deployment-Plattform Railway bereitgestellt."),
      t("Anbieter ist:"),
      addr("Railway Corporation", "548 Market St PMB 68956", "San Francisco, California 94104", "USA"),
      t("Beim Aufruf und bei der Nutzung unserer Anwendung werden technisch erforderliche Daten verarbeitet, die notwendig sind, um die Anwendung an Ihr Endgerät auszuliefern und einen sicheren, stabilen und leistungsfähigen Betrieb zu gewährleisten."),
      t("Hierzu können insbesondere gehören:"),
      li(
        "IP-Adresse,",
        "Datum und Uhrzeit des Zugriffs,",
        "aufgerufene Seiten, Funktionen bzw. Dateien,",
        "HTTP-Statuscodes,",
        "übertragene Datenmengen,",
        "Referrer-Informationen,",
        "Browsertyp und Browserversion,",
        "Betriebssystem,",
        "Geräteinformationen,",
        "Verbindungsinformationen,",
        "technische Protokoll- und Fehlerdaten,",
        "sicherheitsrelevante Ereignisse."
      ),
      t("Soweit Inhalte des Kundenportals auf unserer über Railway betriebenen Infrastruktur gespeichert oder verarbeitet werden, können über diese Infrastruktur außerdem die für die jeweiligen Portal-Funktionen erforderlichen personenbezogenen Daten verarbeitet werden."),
      t("Die Verarbeitung erfolgt zur Bereitstellung unserer Website und unseres Kundenportals, zur Gewährleistung der technischen Funktionsfähigkeit, zur Fehleranalyse sowie zum Schutz unserer Systeme vor Angriffen und Missbrauch."),
      t("Rechtsgrundlagen sind, abhängig von der jeweiligen Verarbeitung, Art. 6 Abs. 1 lit. b und Art. 6 Abs. 1 lit. f DSGVO."),
      t("Soweit Railway personenbezogene Daten in unserem Auftrag verarbeitet, erfolgt die Einbindung auf Grundlage einer Vereinbarung zur Auftragsverarbeitung gemäß Art. 28 DSGVO."),
      t("Railway Corporation hat ihren Sitz in den Vereinigten Staaten. Eine Verarbeitung personenbezogener Daten in den USA oder weiteren Drittländern kann daher nicht ausgeschlossen werden."),
      t("Drittlandübermittlungen erfolgen unter Beachtung der Art. 44 ff. DSGVO. Hierfür kann, soweit die Voraussetzungen vorliegen, insbesondere der Angemessenheitsbeschluss der Europäischen Kommission zum EU-U.S. Data Privacy Framework herangezogen werden. Ergänzend können geeignete Garantien wie die Standardvertragsklauseln der Europäischen Kommission Anwendung finden."),
      t("Weitere Informationen zur Verarbeitung personenbezogener Daten finden Sie in den Datenschutzinformationen von Railway."),
    ],
  },
  {
    title: "GitHub und Verwaltung des Quellcodes",
    blocks: [
      t("Für die Entwicklung und Verwaltung des Quellcodes unserer Anwendung nutzen wir GitHub."),
      t("GitHub dient insbesondere der Versionsverwaltung und Verwaltung unseres Quellcodes sowie unseres Entwicklungsprozesses."),
      t("Der bloße Besuch unserer Website oder unseres Kundenportals führt nach unserer technischen Konfiguration nicht allein deshalb zu einer direkten Verbindung zwischen Ihrem Endgerät und GitHub."),
      t("GitHub ist daher nicht der öffentliche Hostinganbieter unserer Anwendung."),
      t("Soweit GitHub ausschließlich im Rahmen unserer internen Softwareentwicklung eingesetzt wird und hierbei keine personenbezogenen Daten der Nutzer unserer Anwendung verarbeitet werden, findet insoweit keine Verarbeitung Ihrer personenbezogenen Daten aufgrund des Besuchs oder der Nutzung unserer Anwendung statt."),
    ],
  },
  {
    title: "Server- und Sicherheitsprotokolle",
    blocks: [
      t("Bei der Nutzung unserer Website und unseres Kundenportals können automatisch technische Protokolldaten verarbeitet werden."),
      t("Hierzu können insbesondere gehören:"),
      li(
        "IP-Adresse,",
        "Datum und Uhrzeit des Zugriffs,",
        "angeforderte Ressource oder Funktion,",
        "Browserinformationen,",
        "Betriebssystem,",
        "Referrer,",
        "HTTP-Statuscode,",
        "technische Fehler,",
        "Verbindungsinformationen,",
        "Login- und Authentifizierungsereignisse,",
        "sicherheitsrelevante Ereignisse."
      ),
      t("Diese Verarbeitung dient insbesondere:"),
      li(
        "der technischen Bereitstellung unserer Anwendung,",
        "der Gewährleistung der Systemsicherheit,",
        "der Erkennung und Abwehr von Angriffen,",
        "der Verhinderung von Missbrauch,",
        "der Fehlerdiagnose,",
        "sowie der Sicherstellung eines stabilen Betriebs."
      ),
      t("Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO."),
      t("Unser berechtigtes Interesse besteht im sicheren und störungsfreien Betrieb unserer Website, unseres Kundenportals und unserer technischen Infrastruktur."),
      t("Protokolldaten werden nur so lange gespeichert, wie dies für die genannten Zwecke erforderlich ist. Eine längere Speicherung kann erfolgen, wenn konkrete Sicherheitsvorfälle untersucht werden müssen, die Daten zur Geltendmachung oder Abwehr von Ansprüchen erforderlich sind oder gesetzliche Verpflichtungen eine weitere Speicherung erfordern."),
    ],
  },
  {
    title: "SSL- bzw. TLS-Verschlüsselung",
    blocks: [
      t("Unsere Anwendung nutzt aus Sicherheitsgründen und zum Schutz der Übertragung personenbezogener und sonstiger vertraulicher Daten eine SSL- bzw. TLS-Verschlüsselung."),
      t("Eine verschlüsselte Verbindung erkennen Sie insbesondere daran, dass die Adresse unserer Website mit „https://“ beginnt."),
      t("Die Verschlüsselung dient dazu, übertragene Daten vor einem unbefugten Zugriff durch Dritte zu schützen."),
    ],
  },
  {
    title: "Kundenkonto und Kundenportal",
    blocks: [
      t("Bestimmte Funktionen unserer Anwendung stehen nur angemeldeten Kunden oder Nutzern zur Verfügung."),
      t("Für die Einrichtung, Verwaltung und Nutzung eines Kundenkontos können insbesondere folgende personenbezogene Daten verarbeitet werden:"),
      li(
        "Name,",
        "E-Mail-Adresse,",
        "Unternehmen,",
        "Funktion bzw. Position,",
        "Kundennummer oder interne Zuordnungsmerkmale,",
        "Konto- und Benutzerkennung,",
        "Authentifizierungsdaten,",
        "Login- und Nutzungsinformationen,",
        "Zeitpunkte von Anmeldungen und Aktivitäten,",
        "technische Verbindungsdaten,",
        "dem Kundenkonto zugeordnete Vertrags-, Projekt- und Kommunikationsdaten."
      ),
      t("Die Verarbeitung erfolgt, um das Kundenkonto bereitzustellen, Nutzer zu authentifizieren, Zugriffsberechtigungen zu verwalten und die vertraglich vereinbarten Leistungen über das Kundenportal bereitzustellen."),
      t("Soweit die Nutzung des Kundenportals Bestandteil eines Vertrags mit Ihnen ist oder der Vertragsanbahnung dient, erfolgt die Verarbeitung auf Grundlage von Art. 6 Abs. 1 lit. b DSGVO."),
      t("Soweit ein Vertrag mit einem Unternehmen besteht und personenbezogene Daten von dessen Ansprechpartnern, Mitarbeitern oder sonstigen Nutzern verarbeitet werden, kann die Verarbeitung auf Art. 6 Abs. 1 lit. f DSGVO gestützt werden. Unser berechtigtes Interesse besteht in der ordnungsgemäßen Durchführung und Verwaltung der Geschäftsbeziehung und der Bereitstellung des Kundenportals."),
      t("Technische Sicherheits- und Protokolldaten werden auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO verarbeitet."),
    ],
  },
  {
    title: "Analyse- und Blueprint-Antworten",
    blocks: [
      t("Im Kundenportal können Nutzer Angaben machen und Fragen beantworten, die für unsere Analyse-, Strategie- und Blueprint-Leistungen erforderlich sind."),
      t("Hierbei können insbesondere verarbeitet werden:"),
      li(
        "Angaben zum Unternehmen,",
        "Angaben zu Geschäftsmodell, Produkten und Dienstleistungen,",
        "strategische Ziele,",
        "organisatorische Informationen,",
        "wirtschaftliche und betriebliche Angaben,",
        "Angaben zu Prozessen, Strukturen und Herausforderungen,",
        "Antworten auf Analyse- und Blueprint-Fragen,",
        "Freitexteingaben,",
        "projektbezogene Informationen,",
        "sowie gegebenenfalls personenbezogene Angaben, die Nutzer selbst innerhalb ihrer Antworten bereitstellen."
      ),
      t("Die Verarbeitung erfolgt zur Durchführung der vom Kunden gewünschten Analyse, zur Erbringung unserer Beratungs- und Strategie-Leistungen, zur Erstellung individueller Ergebnisse und zur Bereitstellung dieser Ergebnisse im Kundenportal."),
      t("Rechtsgrundlage ist grundsätzlich Art. 6 Abs. 1 lit. b DSGVO, soweit die Verarbeitung zur Durchführung eines Vertrags oder vorvertraglicher Maßnahmen erforderlich ist."),
      t("Soweit Daten von Ansprechpartnern, Mitarbeitern oder sonstigen Personen eines Unternehmenskunden verarbeitet werden, kann die Verarbeitung ergänzend auf Art. 6 Abs. 1 lit. f DSGVO beruhen. Unser berechtigtes Interesse besteht in der ordnungsgemäßen Durchführung der jeweiligen Kundenbeziehung und des Projekts."),
      t("Nutzer sollten in Freitextfeldern grundsätzlich nur solche personenbezogenen Daten über sich selbst oder Dritte angeben, die für den jeweiligen Zweck erforderlich sind und deren Verarbeitung zulässig ist."),
    ],
  },
  {
    title: "Erstellung und Speicherung von Berichten und Ergebnissen",
    blocks: [
      t("Auf Grundlage der im Kundenportal bereitgestellten Angaben können Analysen, Auswertungen, Blueprint-Ergebnisse, Strategieunterlagen, Empfehlungen, Zusammenfassungen und sonstige Berichte erstellt und im Kundenportal gespeichert oder bereitgestellt werden."),
      t("Dabei können insbesondere verarbeitet werden:"),
      li(
        "die vom Nutzer bereitgestellten Analyse- und Blueprint-Antworten,",
        "Unternehmens- und Projektdaten,",
        "Zwischenergebnisse,",
        "Auswertungen,",
        "individuell erstellte Berichte,",
        "Dokumente und Dateien,",
        "Statusinformationen,",
        "Kommentare und projektbezogene Kommunikation."
      ),
      t("Die Verarbeitung dient der Erbringung unserer vertraglich vereinbarten Leistungen sowie der Bereitstellung, Dokumentation und Nachvollziehbarkeit der Arbeitsergebnisse."),
      t("Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO."),
      t("Soweit personenbezogene Daten von Beschäftigten oder Ansprechpartnern eines Unternehmenskunden betroffen sind, kann die Verarbeitung auf Art. 6 Abs. 1 lit. f DSGVO gestützt werden."),
      t("Berichte und sonstige Ergebnisse werden grundsätzlich so lange gespeichert, wie dies für die Durchführung und Dokumentation der Kundenbeziehung erforderlich ist oder gesetzliche bzw. vertragliche Gründe eine weitere Speicherung rechtfertigen."),
    ],
  },
  {
    title: "Vertrags-, Angebots- und Kundendaten",
    blocks: [
      t("Im Kundenportal sowie im Rahmen unserer Geschäftsbeziehung können wir Daten zur Vertragsanbahnung und Vertragsdurchführung verarbeiten."),
      t("Hierzu können insbesondere gehören:"),
      li(
        "Name,",
        "Unternehmen,",
        "Anschrift,",
        "E-Mail-Adresse,",
        "Telefonnummer,",
        "Ansprechpartner und Funktionen,",
        "Angebotsdaten,",
        "Vertragsgegenstand,",
        "vereinbarte Leistungen,",
        "Preise und Konditionen,",
        "Vertragslaufzeiten,",
        "Vertragsstatus,",
        "Annahme- und Abschlussinformationen,",
        "Kommunikationsdaten,",
        "projektbezogene Informationen,",
        "sonstige zur Vertragsdurchführung erforderliche Angaben."
      ),
      t("Die Verarbeitung erfolgt zur Erstellung und Übermittlung von Angeboten, zur Durchführung vorvertraglicher Maßnahmen, zum Abschluss und zur Durchführung von Verträgen, zur Kundenverwaltung sowie zur Dokumentation der Geschäftsbeziehung."),
      t("Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO."),
      t("Soweit Ansprechpartner oder Beschäftigte eines Unternehmenskunden betroffen sind, erfolgt die Verarbeitung gegebenenfalls auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO. Unser berechtigtes Interesse besteht in der Durchführung und Verwaltung der jeweiligen Geschäftsbeziehung."),
      t("Soweit gesetzliche Aufbewahrungs- oder Dokumentationspflichten bestehen, erfolgt die weitere Speicherung auf Grundlage von Art. 6 Abs. 1 lit. c DSGVO."),
    ],
  },
  {
    title: "Rechnungs- und Buchhaltungsdaten",
    blocks: [
      t("Für die Rechnungsstellung, Buchhaltung und Abwicklung unserer Geschäftsbeziehungen verarbeiten wir insbesondere:"),
      li(
        "Name bzw. Firmenname,",
        "Rechnungsanschrift,",
        "E-Mail-Adresse,",
        "gegebenenfalls Umsatzsteuer-Identifikationsnummer,",
        "Rechnungsnummer,",
        "Vertrags- und Leistungsdaten,",
        "Rechnungsbetrag,",
        "Zahlungsstatus,",
        "Zahlungsdatum,",
        "Transaktions- und Referenzinformationen,",
        "sonstige steuerlich oder buchhalterisch erforderliche Angaben."
      ),
      t("Die Verarbeitung erfolgt zur Abrechnung unserer Leistungen, Verwaltung offener Forderungen, Zahlungszuordnung und Erfüllung handels- und steuerrechtlicher Verpflichtungen."),
      t("Rechtsgrundlagen sind Art. 6 Abs. 1 lit. b und Art. 6 Abs. 1 lit. c DSGVO."),
      t("Die Daten werden entsprechend der jeweils einschlägigen gesetzlichen Aufbewahrungspflichten gespeichert."),
    ],
  },
  {
    title: "Zahlungsabwicklung über Stripe",
    blocks: [
      t("Für die Abwicklung von Zahlungen nutzen wir den Zahlungsdienstleister Stripe."),
      t("Für Unternehmen im Europäischen Wirtschaftsraum erfolgt die vertragliche Einbindung von Stripe insbesondere über:"),
      addr("Stripe Payments Europe, Limited", "One Wilton Park", "Wilton Place", "Dublin 2, D02 FX04", "Irland"),
      t("Abhängig von der verwendeten Zahlungsart und den in Anspruch genommenen Stripe-Diensten können weitere Unternehmen der Stripe-Gruppe an der Verarbeitung beteiligt sein."),
      t("Bei einer Zahlung über Stripe können insbesondere folgende Daten verarbeitet werden:"),
      li(
        "Name,",
        "E-Mail-Adresse,",
        "Rechnungsanschrift,",
        "Zahlungsbetrag,",
        "Währung,",
        "Zahlungsart,",
        "Zahlungs- und Transaktionsdaten,",
        "Zeitpunkt der Zahlung,",
        "Zahlungsstatus,",
        "Bank- oder Karteninformationen, soweit für die gewählte Zahlungsart erforderlich,",
        "IP-Adresse,",
        "Geräte- und Browserinformationen,",
        "Informationen zur Betrugs- und Missbrauchsprävention,",
        "sonstige zur Zahlungsabwicklung erforderliche Angaben."
      ),
      t("Die Verarbeitung erfolgt zur Durchführung und Abwicklung von Zahlungen, zur Zahlungszuordnung, zur Betrugsprävention sowie zur Verwaltung von Rückerstattungen, Zahlungsstreitigkeiten und sonstigen zahlungsbezogenen Vorgängen."),
      t("Rechtsgrundlage für die von uns veranlasste Verarbeitung zum Zweck der Vertrags- und Zahlungsabwicklung ist Art. 6 Abs. 1 lit. b DSGVO."),
      t("Soweit Verarbeitung zur Erfüllung gesetzlicher Verpflichtungen erforderlich ist, gilt Art. 6 Abs. 1 lit. c DSGVO."),
      t("Soweit Daten zum Schutz vor Betrug, Missbrauch oder Zahlungsausfällen verarbeitet werden, kann Art. 6 Abs. 1 lit. f DSGVO einschlägig sein."),
      t("Stripe verarbeitet personenbezogene Daten abhängig von der jeweiligen Funktion teilweise als Auftragsverarbeiter für uns und teilweise in eigener datenschutzrechtlicher Verantwortlichkeit, beispielsweise soweit Stripe eigene gesetzliche, regulatorische, Sicherheits- oder Betrugspräventionszwecke verfolgt."),
      t("Soweit Zahlungsdaten unmittelbar von Stripe erhoben werden, erhalten wir diese gegebenenfalls nicht vollständig, sondern insbesondere die für uns erforderlichen Transaktions-, Abrechnungs- und Statusinformationen."),
      t("Bei der Nutzung der Stripe-Dienste können personenbezogene Daten auch an Unternehmen der Stripe-Gruppe und Dienstleister außerhalb des Europäischen Wirtschaftsraums, insbesondere in die Vereinigten Staaten, übermittelt werden."),
      t("Drittlandübermittlungen erfolgen nach Maßgabe der Art. 44 ff. DSGVO. Je nach Verarbeitung können hierfür insbesondere das EU-U.S. Data Privacy Framework sowie die Standardvertragsklauseln der Europäischen Kommission herangezogen werden."),
      t("Weitere Informationen zur Verarbeitung personenbezogener Daten finden Sie in den Datenschutzinformationen von Stripe."),
    ],
  },
  {
    title: "Videogespräche über Daily",
    blocks: [
      t("Für bestimmte Beratungs-, Strategie-, Service- und Vertragsgespräche können innerhalb unserer Anwendung Videogespräche durchgeführt werden."),
      t("Hierfür nutzen wir den Videokommunikationsdienst Daily."),
      t("Anbieter ist:"),
      addr("Daily, Co.", "548 Market St, Suite 39113", "San Francisco, CA 94104", "USA"),
      t("Bei der Nutzung eines Videogesprächs können insbesondere folgende personenbezogene Daten verarbeitet werden:"),
      li(
        "Name bzw. angezeigter Teilnehmername,",
        "Audio- und Videodaten,",
        "Gesprächsinhalte,",
        "IP-Adresse,",
        "Geräteinformationen,",
        "Browserinformationen,",
        "Verbindungs- und Qualitätsdaten,",
        "technische Nutzungs- und Protokolldaten,",
        "Datum, Uhrzeit und Dauer des Gesprächs,",
        "gegebenenfalls weitere während des Gesprächs freiwillig mitgeteilte Informationen."
      ),
      t("Die Verarbeitung erfolgt zur Durchführung des gewünschten Gesprächs und zur Erbringung unserer vertraglichen oder vorvertraglichen Leistungen."),
      t("Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO, soweit das Gespräch der Vertragsanbahnung oder Vertragsdurchführung dient."),
      t("Soweit Gespräche mit Ansprechpartnern oder Mitarbeitern eines Unternehmenskunden geführt werden, kann die Verarbeitung ergänzend auf Art. 6 Abs. 1 lit. f DSGVO gestützt werden. Unser berechtigtes Interesse besteht in einer effizienten digitalen Kommunikation und Durchführung unserer Geschäftsbeziehungen."),
      t("Soweit Daily personenbezogene Daten in unserem Auftrag verarbeitet, erfolgt die Einbindung auf Grundlage einer Vereinbarung zur Auftragsverarbeitung gemäß Art. 28 DSGVO."),
      t("Daily hat seinen Sitz in den Vereinigten Staaten. Eine Verarbeitung personenbezogener Daten in den USA kann daher stattfinden."),
      t("Drittlandübermittlungen erfolgen unter Beachtung der Art. 44 ff. DSGVO. Daily nimmt am EU-U.S. Data Privacy Framework teil. Soweit dieses für die jeweilige Übermittlung anwendbar ist, kann die Übermittlung auf den entsprechenden Angemessenheitsbeschluss der Europäischen Kommission gestützt werden. Für Fälle, in denen das Data Privacy Framework nicht anwendbar ist, sieht Daily insbesondere die Einbeziehung von Standardvertragsklauseln vor."),
      t("Weitere Informationen zur Verarbeitung personenbezogener Daten finden Sie in den Datenschutzinformationen von Daily."),
    ],
  },
  {
    title: "Aufzeichnung von Vertragsabschlussgesprächen",
    blocks: [
      t("Bestimmte Gespräche im Zusammenhang mit einem Vertragsabschluss können mit Bild und/oder Ton aufgezeichnet werden."),
      t("Eine solche Aufzeichnung erfolgt ausschließlich, wenn Sie zuvor ausdrücklich in die Aufzeichnung eingewilligt haben."),
      t("Ohne eine entsprechende Einwilligung erfolgt keine Aufzeichnung."),
      t("Im Rahmen einer Aufzeichnung können insbesondere verarbeitet werden:"),
      li(
        "Bild- und Videoaufnahmen,",
        "Stimme und Audioaufnahmen,",
        "Name und gegebenenfalls Funktion der Gesprächsteilnehmer,",
        "Gesprächsinhalte,",
        "Erklärungen zum Vertragsabschluss,",
        "Datum und Uhrzeit,",
        "Dauer der Aufzeichnung,",
        "technische Metadaten,",
        "gegebenenfalls im Gespräch sichtbare oder mitgeteilte weitere personenbezogene Daten."
      ),
      t("Zweck der Aufzeichnung ist die Dokumentation des Vertragsabschlusses und der im Zusammenhang damit abgegebenen Erklärungen."),
      t("Rechtsgrundlage für die Aufzeichnung ist Ihre ausdrückliche Einwilligung gemäß Art. 6 Abs. 1 lit. a DSGVO."),
      t("Die Erteilung der Einwilligung ist freiwillig. Eine Verweigerung der Einwilligung führt grundsätzlich nicht dazu, dass ein Vertrag nicht abgeschlossen werden kann, soweit eine Aufzeichnung für den jeweiligen Vertragsabschluss nicht gesetzlich erforderlich ist."),
      t("Eine erteilte Einwilligung kann jederzeit mit Wirkung für die Zukunft widerrufen werden. Durch den Widerruf wird die Rechtmäßigkeit der bis zum Widerruf erfolgten Verarbeitung nicht berührt."),
      t("Den Widerruf können Sie insbesondere an folgende Adresse richten:"),
      t(PRIVACY_EMAIL),
      t("Aufzeichnungen werden nur so lange gespeichert, wie dies für den angegebenen Zweck erforderlich ist und keine gesetzlichen oder sonstigen zulässigen Gründe einer Löschung entgegenstehen."),
      t("Soweit für die technische Durchführung oder Speicherung der Aufzeichnung Daily oder ein anderer von uns eingesetzter technischer Dienstleister eingesetzt wird, können die für die Aufzeichnung erforderlichen Daten durch diesen Dienstleister verarbeitet werden."),
    ],
  },
  {
    title: "Kontaktformular",
    blocks: [
      t("Auf unserer Website stellen wir gegebenenfalls ein Kontaktformular zur Verfügung."),
      t("Wenn Sie dieses Kontaktformular nutzen, können insbesondere folgende personenbezogene Daten verarbeitet werden:"),
      li(
        "Name,",
        "E-Mail-Adresse,",
        "Unternehmen,",
        "Telefonnummer, sofern angegeben,",
        "ausgewählter Anfragegrund,",
        "Inhalt Ihrer Nachricht,",
        "Datum und Zeitpunkt der Anfrage,",
        "gegebenenfalls technisch erforderliche Verbindungsdaten."
      ),
      t("Wir verarbeiten diese Daten, um Ihre Anfrage entgegenzunehmen, zu bearbeiten und mit Ihnen zu kommunizieren."),
      t("Soweit sich Ihre Anfrage auf die Anbahnung oder Durchführung eines Vertrags bezieht, erfolgt die Verarbeitung auf Grundlage von Art. 6 Abs. 1 lit. b DSGVO."),
      t("Bei sonstigen geschäftlichen Anfragen erfolgt die Verarbeitung auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO. Unser berechtigtes Interesse besteht in der ordnungsgemäßen und effizienten Bearbeitung eingehender Anfragen sowie der Kommunikation mit Interessenten, Kunden und Geschäftspartnern."),
      t("Soweit wir für eine bestimmte Verarbeitung ausdrücklich Ihre Einwilligung einholen, erfolgt die Verarbeitung auf Grundlage von Art. 6 Abs. 1 lit. a DSGVO."),
    ],
  },
  {
    title: "Schutz von Formularen und Anwendungen vor Missbrauch",
    blocks: [
      t("Zum Schutz unserer Website, unseres Kundenportals, unserer Formulare und unserer technischen Systeme vor Spam, automatisierten Zugriffen und sonstigem Missbrauch können technische Schutzmechanismen eingesetzt werden."),
      t("Hierzu können beispielsweise gehören:"),
      li(
        "Honeypot-Felder,",
        "technische Formularinformationen,",
        "Zeitstempel,",
        "serverseitige Validierungsmechanismen,",
        "IP- und Verbindungsinformationen,",
        "Sicherheitsprotokolle,",
        "technische Zugriffsbeschränkungen."
      ),
      t("Soweit hierbei personenbezogene Daten verarbeitet werden, erfolgt dies auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO."),
      t("Unser berechtigtes Interesse besteht im Schutz unserer Anwendung, unserer technischen Infrastruktur, unserer Nutzer und unserer Kommunikationssysteme vor Spam, automatisierten Angriffen, Betrug und sonstigem Missbrauch."),
    ],
  },
  {
    title: "Kontaktaufnahme per E-Mail",
    blocks: [
      t("Wenn Sie uns per E-Mail kontaktieren, verarbeiten wir die von Ihnen übermittelten personenbezogenen Daten."),
      t("Hierzu können insbesondere gehören:"),
      li(
        "Name,",
        "E-Mail-Adresse,",
        "Unternehmen,",
        "Position bzw. Funktion,",
        "Inhalt Ihrer Nachricht,",
        "Anhänge,",
        "weitere freiwillig übermittelte Informationen,",
        "Kommunikations- und Metadaten."
      ),
      t("Die Verarbeitung erfolgt zum Zweck der Bearbeitung Ihrer Anfrage und der weiteren Kommunikation mit Ihnen."),
      t("Soweit Ihre Kontaktaufnahme auf die Anbahnung oder Durchführung eines Vertrags gerichtet ist, erfolgt die Verarbeitung auf Grundlage von Art. 6 Abs. 1 lit. b DSGVO."),
      t("In sonstigen Fällen erfolgt die Verarbeitung auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO. Unser berechtigtes Interesse besteht in der effizienten Bearbeitung geschäftlicher Kommunikation."),
      t("Datenschutzanfragen richten Sie bitte an:"),
      t(PRIVACY_EMAIL),
    ],
  },
  {
    title: "Kontaktaufnahme per Telefon",
    blocks: [
      t("Wenn Sie uns telefonisch kontaktieren, können personenbezogene Daten verarbeitet werden, soweit dies für die Bearbeitung Ihres Anliegens erforderlich ist."),
      t("Hierzu können insbesondere gehören:"),
      li(
        "Name,",
        "Telefonnummer,",
        "Unternehmen,",
        "Funktion,",
        "Gesprächsinhalte,",
        "Informationen zu Ihrem Anliegen,",
        "gegebenenfalls Gesprächsnotizen."
      ),
      t("Eine Aufzeichnung von Telefongesprächen erfolgt nicht ohne eine hierfür erforderliche Rechtsgrundlage bzw. Einwilligung."),
      t("Soweit die Kommunikation der Vertragsanbahnung oder Vertragsdurchführung dient, erfolgt die Verarbeitung auf Grundlage von Art. 6 Abs. 1 lit. b DSGVO."),
      t("Im Übrigen erfolgt die Verarbeitung auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO."),
    ],
  },
  {
    title: "Terminbuchung über Calendly",
    blocks: [
      t("Auf unserer Website können wir die Möglichkeit anbieten, über einen externen Link einen Termin für ein Strategie- oder Beratungsgespräch zu vereinbaren."),
      t("Hierfür nutzen wir Calendly."),
      t("Anbieter ist:"),
      addr("Calendly LLC", "USA"),
      t("Wenn Sie den entsprechenden Link zur Terminbuchung auswählen, verlassen Sie unsere Anwendung gegebenenfalls und werden zum Angebot von Calendly weitergeleitet."),
      t("Beim bloßen Besuch unserer Website wird Calendly durch einen solchen externen Link nicht automatisch aufgerufen."),
      t("Erst wenn Sie den Link aktiv auswählen und Calendly aufrufen, erfolgt die weitere Datenverarbeitung über den Dienst von Calendly."),
      t("Bei der Nutzung von Calendly können insbesondere folgende personenbezogene Daten verarbeitet werden:"),
      li(
        "Name,",
        "E-Mail-Adresse,",
        "Unternehmen, sofern abgefragt,",
        "Telefonnummer, sofern abgefragt,",
        "gewünschter Termin,",
        "Zeitzone,",
        "von Ihnen gemachte Angaben zum Gespräch,",
        "technische Verbindungs- und Gerätedaten,",
        "Kommunikations- und Termindaten."
      ),
      t("Die Verarbeitung erfolgt, um die von Ihnen gewünschte Terminvereinbarung, Terminverwaltung und Durchführung des Gesprächs zu ermöglichen."),
      t("Soweit der Termin der Anbahnung oder Durchführung eines Vertrags dient, erfolgt die Verarbeitung auf Grundlage von Art. 6 Abs. 1 lit. b DSGVO."),
      t("Soweit die Verarbeitung darüber hinaus der Organisation unserer geschäftlichen Kommunikation dient, kann sie auf Art. 6 Abs. 1 lit. f DSGVO gestützt werden. Unser berechtigtes Interesse besteht in einer effizienten und nutzerfreundlichen Terminplanung."),
      t("Calendly kann personenbezogene Daten in den Vereinigten Staaten und gegebenenfalls weiteren Ländern verarbeiten."),
      t("Für entsprechende Drittlandübermittlungen gelten die Voraussetzungen der Art. 44 ff. DSGVO. Hierfür können insbesondere ein einschlägiger Angemessenheitsbeschluss sowie geeignete Garantien wie Standardvertragsklauseln relevant sein."),
      t("Weitere Informationen finden Sie in den Datenschutzinformationen von Calendly."),
    ],
  },
  {
    title: "Sonstige externe Links",
    blocks: [
      t("Unsere Website und unser Kundenportal können Links zu Websites oder Diensten externer Anbieter enthalten."),
      t("Wenn Sie einen solchen Link aktiv auswählen, verlassen Sie gegebenenfalls unsere Anwendung und werden zur Website bzw. zum Dienst des jeweiligen Anbieters weitergeleitet."),
      t("Ab diesem Zeitpunkt erfolgt die weitere Verarbeitung personenbezogener Daten grundsätzlich im Verantwortungsbereich des jeweiligen externen Anbieters."),
      t("Wir haben keinen vollständigen Einfluss darauf, welche personenbezogenen Daten externe Anbieter nach dem Aufruf ihrer Websites oder Dienste verarbeiten."),
      t("Bitte beachten Sie daher die jeweiligen Datenschutzinformationen der betreffenden Anbieter."),
    ],
  },
  {
    title: "Instagram und Social-Media-Links",
    blocks: [
      t("Unsere Website kann Links zu unseren Auftritten in sozialen Netzwerken, insbesondere Instagram, enthalten."),
      t("Soweit lediglich ein externer Link verwendet wird und keine Inhalte des sozialen Netzwerks unmittelbar in unsere Website eingebettet sind, wird durch den bloßen Besuch unserer Website aufgrund dieses Links keine direkte Verbindung zum jeweiligen sozialen Netzwerk hergestellt."),
      t("Erst wenn Sie den entsprechenden Link aktiv auswählen, werden Sie zur jeweiligen Plattform weitergeleitet."),
      t("Dort gelten die Datenschutzbestimmungen des jeweiligen Plattformbetreibers."),
      t("Beim Besuch einer Social-Media-Plattform können personenbezogene Daten durch den jeweiligen Plattformbetreiber verarbeitet werden. Dies kann auch eine Verarbeitung außerhalb des Europäischen Wirtschaftsraums umfassen."),
    ],
  },
  {
    title: "Cookies und vergleichbare Technologien",
    blocks: [
      t("Unsere Anwendung kann technisch notwendige Cookies oder vergleichbare Technologien verwenden, soweit diese für den technischen Betrieb, die Anmeldung, die Sicherheit oder die Bereitstellung der von Ihnen gewünschten Funktionen erforderlich sind."),
      t("Cookies sind kleine Informationen, die auf Ihrem Endgerät gespeichert werden können."),
      t("Technisch erforderliche Cookies oder vergleichbare Technologien können insbesondere eingesetzt werden für:"),
      li(
        "Sitzungsverwaltung,",
        "Authentifizierung,",
        "Aufrechterhaltung eines Login-Status,",
        "Sicherheitsfunktionen,",
        "technische Einstellungen,",
        "Schutz vor Missbrauch,",
        "Bereitstellung von Portal-Funktionen."
      ),
      t("Soweit Informationen auf Ihrem Endgerät gespeichert oder aus Ihrem Endgerät ausgelesen werden, beachten wir die gesetzlichen Vorgaben, insbesondere § 25 TDDDG."),
      t("Soweit eine Speicherung oder ein Zugriff unbedingt erforderlich ist, damit wir einen von Ihnen ausdrücklich gewünschten digitalen Dienst zur Verfügung stellen können, kann eine Einwilligung nach Maßgabe der gesetzlichen Voraussetzungen entbehrlich sein."),
      t("Soweit personenbezogene Daten im Anschluss verarbeitet werden, richtet sich deren Verarbeitung nach der jeweils einschlägigen Rechtsgrundlage der DSGVO, insbesondere Art. 6 Abs. 1 lit. b oder lit. f DSGVO."),
      t("Soweit nicht technisch erforderliche Cookies, Tracking-Technologien oder vergleichbare Technologien eingesetzt werden, erfolgt deren Nutzung grundsätzlich erst nach einer erforderlichen Einwilligung."),
      t("Soweit personenbezogene Daten aufgrund Ihrer Einwilligung verarbeitet werden, erfolgt die Verarbeitung auf Grundlage von Art. 6 Abs. 1 lit. a DSGVO."),
      t("Eine erteilte Einwilligung kann jederzeit mit Wirkung für die Zukunft widerrufen werden."),
    ],
  },
  {
    title: "Webanalyse, Tracking und Marketingtechnologien",
    blocks: [
      t("Nach unserem derzeitigen Website-Setup setzen wir auf unserer Website keine Dienste wie Google Analytics, Meta Pixel oder vergleichbare personenbezogene Analyse- oder Marketing-Tracking-Technologien ein."),
      t("Sollten zukünftig entsprechende Technologien eingesetzt werden, werden wir vor deren Einsatz prüfen, ob hierfür eine Einwilligung erforderlich ist, gegebenenfalls ein entsprechendes Einwilligungsmanagement implementieren und diese Datenschutzerklärung aktualisieren."),
    ],
  },
  {
    title: "Schriftarten und externe technische Ressourcen",
    blocks: [
      t("Für die Darstellung und technische Funktion unserer Anwendung können Schriftarten, Icons, Skripte, Stylesheets, Bibliotheken und andere technische Ressourcen erforderlich sein."),
      t("Soweit diese Ressourcen lokal bzw. über unsere eigene Hosting-Infrastruktur bereitgestellt werden, wird allein aufgrund ihres Ladens keine zusätzliche Verbindung zu einem externen Drittanbieter hergestellt."),
      t("Soweit externe Ressourcen unmittelbar von Servern eines Drittanbieters geladen werden und hierbei personenbezogene Daten, insbesondere die IP-Adresse, an diesen Anbieter übermittelt werden, beachten wir die hierfür geltenden datenschutzrechtlichen Voraussetzungen."),
      t("Soweit der Einsatz eines solchen Dienstes für die Transparenz gegenüber betroffenen Personen relevant ist, werden die entsprechenden Informationen in dieser Datenschutzerklärung ergänzt."),
    ],
  },
  {
    title: "Empfänger und Kategorien von Empfängern",
    blocks: [
      t("Personenbezogene Daten werden grundsätzlich nur weitergegeben oder anderen Stellen zugänglich gemacht, wenn hierfür eine rechtliche Grundlage besteht."),
      t("Empfänger bzw. Kategorien von Empfängern können insbesondere sein:"),
      li(
        "Hosting- und Infrastruktur-Dienstleister,",
        "Anbieter technischer Plattformen,",
        "IT- und Software-Dienstleister,",
        "E-Mail- und Kommunikationsdienstleister,",
        "Videokommunikationsdienste,",
        "Zahlungsdienstleister,",
        "Terminbuchungsdienste,",
        "Buchhaltungs- und Abrechnungsdienstleister,",
        "von uns eingesetzte Auftragsverarbeiter,",
        "Rechtsanwälte, Steuerberater und sonstige professionelle Berater,",
        "Banken und Zahlungsinstitute,",
        "Behörden, Gerichte und öffentliche Stellen, soweit eine gesetzliche Verpflichtung oder sonstige rechtliche Grundlage besteht."
      ),
      t("Soweit Dienstleister personenbezogene Daten in unserem Auftrag verarbeiten, werden sie nach Maßgabe von Art. 28 DSGVO eingebunden."),
      t("Soweit ein Empfänger personenbezogene Daten in eigener Verantwortlichkeit verarbeitet, richtet sich die weitere Verarbeitung nach den für diesen Empfänger geltenden gesetzlichen Bestimmungen."),
    ],
  },
  {
    title: "Datenübermittlung in Drittländer",
    blocks: [
      t("Einige von uns eingesetzte Dienstleister können ihren Sitz außerhalb der Europäischen Union bzw. des Europäischen Wirtschaftsraums haben oder personenbezogene Daten außerhalb des Europäischen Wirtschaftsraums verarbeiten."),
      t("Eine Übermittlung personenbezogener Daten in ein Drittland erfolgt ausschließlich unter Beachtung der gesetzlichen Voraussetzungen der Art. 44 ff. DSGVO."),
      t("Je nach Empfänger und Drittland kann die Datenübermittlung insbesondere gestützt werden auf:"),
      li(
        "einen Angemessenheitsbeschluss der Europäischen Kommission,",
        "das EU-U.S. Data Privacy Framework bei entsprechend zertifizierten US-Unternehmen und soweit dessen Voraussetzungen vorliegen,",
        "Standardvertragsklauseln der Europäischen Kommission,",
        "oder eine andere nach der DSGVO zulässige Grundlage."
      ),
      t("Soweit erforderlich, werden ergänzende technische, organisatorische oder vertragliche Schutzmaßnahmen berücksichtigt."),
    ],
  },
  {
    title: "Speicherdauer",
    blocks: [
      t("Wir speichern personenbezogene Daten grundsätzlich nur so lange, wie dies für den jeweiligen Verarbeitungszweck erforderlich ist."),
      t("Anschließend werden die Daten gelöscht oder anonymisiert, sofern keine gesetzlichen Aufbewahrungspflichten oder sonstigen zulässigen Gründe für eine weitere Speicherung bestehen."),
      t("Die konkrete Speicherdauer richtet sich insbesondere nach:"),
      li(
        "dem jeweiligen Zweck der Verarbeitung,",
        "der Art der Daten,",
        "der Dauer der Kunden- und Geschäftsbeziehung,",
        "der Laufzeit eines Kundenkontos,",
        "der Dauer eines Projekts,",
        "gesetzlichen Verjährungsfristen,",
        "handels- und steuerrechtlichen Aufbewahrungspflichten,",
        "gesetzlichen Dokumentationspflichten,",
        "der Notwendigkeit zur Geltendmachung, Ausübung oder Verteidigung von Rechtsansprüchen."
      ),
      t("Vertrags-, Rechnungs-, Zahlungs- und Geschäftsunterlagen können aufgrund gesetzlicher Vorgaben über mehrere Jahre aufzubewahren sein."),
      t("Daten eines Kundenkontos und Inhalte des Kundenportals werden grundsätzlich so lange verarbeitet, wie dies für die Durchführung und Verwaltung der Geschäftsbeziehung sowie die Bereitstellung der jeweiligen Leistungen erforderlich ist."),
      t("Nach Ende einer Geschäftsbeziehung können Daten weiter gespeichert werden, soweit dies zur Erfüllung gesetzlicher Pflichten, zur Dokumentation abgeschlossener Leistungen oder zur Geltendmachung bzw. Abwehr von Rechtsansprüchen erforderlich ist."),
      t("Kontaktanfragen, aus denen keine Geschäftsbeziehung entsteht, werden gelöscht, sobald ihre weitere Speicherung für die Bearbeitung des Anliegens nicht mehr erforderlich ist und keine gesetzlichen oder berechtigten Gründe für eine weitere Speicherung bestehen."),
      t("Für Aufzeichnungen von Vertragsabschlussgesprächen gelten ergänzend die Angaben in Abschnitt 16."),
    ],
  },
  {
    title: "Pflicht zur Bereitstellung personenbezogener Daten",
    blocks: [
      t("Beim bloßen Besuch unseres öffentlich zugänglichen Internetangebots besteht grundsätzlich keine gesetzliche oder vertragliche Verpflichtung, uns aktiv personenbezogene Daten bereitzustellen."),
      t("Bestimmte technische Informationen, insbesondere Verbindungsdaten, sind jedoch erforderlich, damit unsere Anwendung technisch bereitgestellt werden kann."),
      t("Für die Einrichtung und Nutzung eines Kundenkontos, die Durchführung einer Analyse, die Erstellung eines Blueprint oder Berichts, die Durchführung eines Vertrags, die Rechnungsstellung oder Zahlungsabwicklung benötigen wir bestimmte personenbezogene Daten."),
      t("Ohne die jeweils erforderlichen Angaben können die entsprechenden Funktionen oder Leistungen gegebenenfalls nicht oder nicht vollständig bereitgestellt werden."),
      t("Pflichtfelder werden, soweit erforderlich, entsprechend gekennzeichnet."),
      t("Darüber hinausgehende Angaben erfolgen grundsätzlich freiwillig."),
      t("Eine Einwilligung in die Aufzeichnung eines Vertragsabschlussgesprächs ist freiwillig."),
    ],
  },
  {
    title: "Automatisierte Entscheidungsfindung und Profiling",
    blocks: [
      t("Im Rahmen unserer Anwendung findet nach unserem derzeitigen Setup keine ausschließlich auf einer automatisierten Verarbeitung beruhende Entscheidungsfindung im Sinne von Art. 22 DSGVO statt, die Ihnen gegenüber rechtliche Wirkung entfaltet oder Sie in ähnlich erheblicher Weise beeinträchtigt."),
      t("Die Erstellung oder Bereitstellung von Analysen, Blueprint-Ergebnissen oder Berichten stellt nicht allein deshalb eine automatisierte Entscheidung im Sinne von Art. 22 DSGVO dar."),
      t("Ein Profiling mit entsprechender rechtlicher oder ähnlich erheblicher Wirkung findet nach unserem derzeitigen Setup ebenfalls nicht statt."),
      t("Sollten wir zukünftig entsprechende Verfahren einsetzen, werden wir die hierfür gesetzlich erforderlichen Informationen und Schutzmaßnahmen bereitstellen und diese Datenschutzerklärung entsprechend aktualisieren."),
    ],
  },
  {
    title: "Datensicherheit",
    blocks: [
      t("Wir treffen unter Berücksichtigung des Stands der Technik, der Implementierungskosten, der Art, des Umfangs, der Umstände und Zwecke der Verarbeitung sowie der unterschiedlichen Eintrittswahrscheinlichkeit und Schwere der Risiken angemessene technische und organisatorische Maßnahmen zum Schutz personenbezogener Daten."),
      t("Diese Maßnahmen dienen insbesondere dem Schutz vor:"),
      li(
        "unbefugtem Zugriff,",
        "unbefugter Offenlegung,",
        "Verlust,",
        "Manipulation,",
        "Zerstörung,",
        "Missbrauch,",
        "unberechtigter Veränderung,",
        "sowie sonstigen Sicherheitsverletzungen."
      ),
      t("Zu unseren Schutzmaßnahmen können insbesondere Verschlüsselung, Zugriffsbeschränkungen, Berechtigungskonzepte, Authentifizierungsmaßnahmen, Protokollierung, Datensicherungen und organisatorische Sicherheitsmaßnahmen gehören."),
      t("Unsere Sicherheitsmaßnahmen werden entsprechend der technischen Entwicklung und der jeweiligen Risiken überprüft und weiterentwickelt."),
    ],
  },
  {
    title: "Ihre Rechte als betroffene Person",
    blocks: [
      t("Sie haben nach Maßgabe der gesetzlichen Voraussetzungen insbesondere folgende Rechte:"),
      term("Recht auf Auskunft – Art. 15 DSGVO", "Sie haben das Recht, Auskunft darüber zu verlangen, ob wir personenbezogene Daten über Sie verarbeiten und, soweit dies der Fall ist, weitere Informationen über diese Verarbeitung sowie eine Kopie Ihrer personenbezogenen Daten zu erhalten."),
      term("Recht auf Berichtigung – Art. 16 DSGVO", "Sie können die unverzügliche Berichtigung unrichtiger personenbezogener Daten sowie die Vervollständigung unvollständiger personenbezogener Daten verlangen."),
      term("Recht auf Löschung – Art. 17 DSGVO", "Sie können unter den gesetzlichen Voraussetzungen die Löschung Ihrer personenbezogenen Daten verlangen."),
      term("Recht auf Einschränkung der Verarbeitung – Art. 18 DSGVO", "Sie können unter den gesetzlichen Voraussetzungen verlangen, dass die Verarbeitung Ihrer personenbezogenen Daten eingeschränkt wird."),
      term("Recht auf Datenübertragbarkeit – Art. 20 DSGVO", "Soweit die gesetzlichen Voraussetzungen vorliegen, können Sie personenbezogene Daten, die Sie uns bereitgestellt haben, in einem strukturierten, gängigen und maschinenlesbaren Format erhalten und die Übermittlung dieser Daten an einen anderen Verantwortlichen verlangen."),
      term("Widerspruchsrecht – Art. 21 DSGVO", "Soweit wir personenbezogene Daten auf Grundlage von Art. 6 Abs. 1 lit. e oder lit. f DSGVO verarbeiten, haben Sie das Recht, aus Gründen, die sich aus Ihrer besonderen Situation ergeben, jederzeit Widerspruch gegen die Verarbeitung einzulegen."),
      t("Wir verarbeiten die betreffenden personenbezogenen Daten anschließend nicht mehr, es sei denn, wir können zwingende schutzwürdige Gründe für die Verarbeitung nachweisen, die Ihre Interessen, Rechte und Freiheiten überwiegen, oder die Verarbeitung dient der Geltendmachung, Ausübung oder Verteidigung von Rechtsansprüchen."),
      t("Werden personenbezogene Daten für Zwecke der Direktwerbung verarbeitet, können Sie der Verarbeitung Ihrer personenbezogenen Daten für derartige Werbung jederzeit widersprechen."),
      term("Widerruf einer Einwilligung – Art. 7 Abs. 3 DSGVO", "Eine erteilte Einwilligung können Sie jederzeit mit Wirkung für die Zukunft widerrufen."),
      t("Durch den Widerruf wird die Rechtmäßigkeit der bis zum Widerruf auf Grundlage der Einwilligung erfolgten Verarbeitung nicht berührt."),
    ],
  },
  {
    title: "Ausübung Ihrer Datenschutzrechte",
    blocks: [
      t("Zur Ausübung Ihrer Datenschutzrechte sowie bei Fragen zur Verarbeitung Ihrer personenbezogenen Daten können Sie sich an uns wenden:"),
      OKUN_ADDRESS,
      t(`E-Mail: ${PRIVACY_EMAIL}`),
      t("Telefon: 030 13883330"),
      t("Bei begründeten Zweifeln an der Identität einer anfragenden Person können wir zusätzliche Informationen verlangen, soweit dies erforderlich ist, um personenbezogene Daten vor einer unberechtigten Offenlegung zu schützen."),
    ],
  },
  {
    title: "Beschwerderecht bei einer Datenschutzaufsichtsbehörde",
    blocks: [
      t("Sie haben gemäß Art. 77 DSGVO das Recht, sich bei einer Datenschutzaufsichtsbehörde zu beschweren, wenn Sie der Ansicht sind, dass die Verarbeitung Ihrer personenbezogenen Daten gegen datenschutzrechtliche Vorschriften verstößt."),
      t("Für unser Unternehmen ist insbesondere folgende Aufsichtsbehörde zuständig:"),
      addr("Berliner Beauftragte für Datenschutz und Informationsfreiheit", "Alt-Moabit 59–61", "10555 Berlin", "Deutschland"),
      t("Telefon: +49 30 13889-0"),
      t("E-Mail: mailbox@datenschutz-berlin.de"),
      t("Ihr Recht, sich an eine andere nach den gesetzlichen Vorschriften zuständige Datenschutzaufsichtsbehörde zu wenden, bleibt unberührt."),
    ],
  },
  {
    title: "Änderungen dieser Datenschutzerklärung",
    blocks: [
      t("Wir behalten uns vor, diese Datenschutzerklärung anzupassen, wenn sich insbesondere:"),
      li(
        "unsere Website oder unser Kundenportal,",
        "die von uns angebotenen Funktionen,",
        "die von uns eingesetzten Technologien,",
        "unsere Datenverarbeitungen,",
        "unsere Dienstleister,",
        "unsere Unternehmensstruktur,",
        "oder die rechtlichen Anforderungen"
      ),
      t("ändern."),
      t("Es gilt die jeweils auf unserer Website veröffentlichte aktuelle Fassung."),
    ],
  },
];
