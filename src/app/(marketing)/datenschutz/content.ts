/**
 * Der Text der Datenschutzerklärung.
 *
 * Bewusst getrennt von der Seite, die ihn zeigt: Er ist ein Rechtstext und
 * wird als Ganzes ausgetauscht, wenn sich etwas ändert. Wer ihn pflegt, soll
 * nicht durch Layout blättern müssen — und wer am Layout arbeitet, nicht
 * versehentlich am Text.
 */

export type PrivacyBlock =
  | { kind: "text"; text: string }
  | { kind: "list"; items: string[] }
  | { kind: "term"; title: string; text: string }
  | { kind: "address"; lines: string[] };

export type PrivacySection = { title: string; blocks: PrivacyBlock[] };

export const PRIVACY_UPDATED = "September 2026";

export const PRIVACY_SECTIONS: PrivacySection[] = [
  {
    title: "Allgemeine Hinweise",
    blocks: [
      { kind: "text", text: "Der Schutz Ihrer personenbezogenen Daten ist uns wichtig." },
      {
        kind: "text",
        text: "Mit dieser Datenschutzerklärung informieren wir Sie darüber, welche personenbezogenen Daten beim Besuch unserer Website, bei der Kontaktaufnahme mit uns sowie bei der Nutzung der über unsere Website angebotenen Funktionen verarbeitet werden.",
      },
      {
        kind: "text",
        text: "Personenbezogene Daten sind alle Informationen, die sich auf eine identifizierte oder identifizierbare natürliche Person beziehen. Hierzu gehören beispielsweise Name, E-Mail-Adresse, Telefonnummer, IP-Adresse und sonstige Informationen, die einer Person zugeordnet werden können.",
      },
      {
        kind: "text",
        text: "Wir verarbeiten personenbezogene Daten ausschließlich im Rahmen der geltenden datenschutzrechtlichen Vorschriften, insbesondere der Datenschutz-Grundverordnung (DSGVO), des Bundesdatenschutzgesetzes (BDSG) sowie, soweit einschlägig, des Telekommunikation-Digitale-Dienste-Datenschutz-Gesetzes (TDDDG).",
      },
    ],
  },
  {
    title: "Verantwortlicher",
    blocks: [
      { kind: "text", text: "Verantwortlicher im Sinne der Datenschutz-Grundverordnung ist:" },
      {
        kind: "address",
        lines: [
          "OKUN SYSTEMS UG (haftungsbeschränkt)",
          "Potsdamer Platz 1",
          "10785 Berlin",
          "Deutschland",
        ],
      },
      { kind: "text", text: "Geschäftsführer: Felix Okun" },
      { kind: "text", text: "Telefon: 030 13883330" },
      { kind: "text", text: "E-Mail: kontakt@okun-systems.com" },
      { kind: "text", text: "Website: https://okun-systems.com" },
    ],
  },
  {
    title: "Datenschutzbeauftragter",
    blocks: [
      {
        kind: "text",
        text: "Soweit für unser Unternehmen keine gesetzliche Verpflichtung zur Bestellung eines Datenschutzbeauftragten besteht, ist derzeit kein Datenschutzbeauftragter bestellt.",
      },
      {
        kind: "text",
        text: "Bei Fragen zum Datenschutz oder zur Verarbeitung Ihrer personenbezogenen Daten können Sie sich jederzeit über folgende Adresse an uns wenden:",
      },
      { kind: "text", text: "kontakt@okun-systems.com" },
    ],
  },
  {
    title: "Rechtsgrundlagen der Datenverarbeitung",
    blocks: [
      {
        kind: "text",
        text: "Wir verarbeiten personenbezogene Daten nur, soweit hierfür eine gesetzliche Rechtsgrundlage besteht.",
      },
      {
        kind: "text",
        text: "Je nach Verarbeitung kommen insbesondere folgende Rechtsgrundlagen in Betracht:",
      },
      {
        kind: "term",
        title: "Art. 6 Abs. 1 lit. a DSGVO – Einwilligung",
        text: "Die betroffene Person hat ihre Einwilligung in die Verarbeitung ihrer personenbezogenen Daten für einen oder mehrere bestimmte Zwecke erteilt.",
      },
      {
        kind: "term",
        title: "Art. 6 Abs. 1 lit. b DSGVO – Vertrag und vorvertragliche Maßnahmen",
        text: "Die Verarbeitung ist für die Erfüllung eines Vertrags erforderlich oder erfolgt zur Durchführung vorvertraglicher Maßnahmen auf Anfrage der betroffenen Person.",
      },
      {
        kind: "term",
        title: "Art. 6 Abs. 1 lit. c DSGVO – Rechtliche Verpflichtung",
        text: "Die Verarbeitung ist erforderlich, um einer rechtlichen Verpflichtung nachzukommen, der wir unterliegen.",
      },
      {
        kind: "term",
        title: "Art. 6 Abs. 1 lit. f DSGVO – Berechtigte Interessen",
        text: "Die Verarbeitung ist zur Wahrung unserer berechtigten Interessen oder der berechtigten Interessen eines Dritten erforderlich, sofern nicht die Interessen oder Grundrechte und Grundfreiheiten der betroffenen Person überwiegen.",
      },
      {
        kind: "text",
        text: "Soweit wir eine Verarbeitung auf Art. 6 Abs. 1 lit. f DSGVO stützen, besteht unser berechtigtes Interesse insbesondere im sicheren und wirtschaftlichen Betrieb unserer Website, der Bearbeitung geschäftlicher Anfragen, der Kommunikation mit Interessenten und Geschäftspartnern sowie der Gewährleistung der IT-Sicherheit.",
      },
    ],
  },
  {
    title: "Hosting der Website über Railway",
    blocks: [
      {
        kind: "text",
        text: "Unsere Website wird über die Hosting- und Deployment-Plattform Railway bereitgestellt.",
      },
      { kind: "text", text: "Anbieter ist:" },
      {
        kind: "address",
        lines: ["Railway Corporation", "548 Market St PMB 68956", "San Francisco, California 94104", "USA"],
      },
      {
        kind: "text",
        text: "Beim Aufruf unserer Website werden technisch erforderliche Daten verarbeitet, die notwendig sind, um die Website an Ihr Endgerät auszuliefern sowie einen sicheren, stabilen und leistungsfähigen Betrieb zu gewährleisten.",
      },
      { kind: "text", text: "Hierzu können insbesondere gehören:" },
      {
        kind: "list",
        items: [
          "IP-Adresse des zugreifenden Geräts,",
          "Datum und Uhrzeit des Zugriffs,",
          "aufgerufene Seite bzw. Datei,",
          "HTTP-Statuscode,",
          "übertragene Datenmenge,",
          "Referrer-URL,",
          "Browsertyp und Browserversion,",
          "Betriebssystem,",
          "Geräteinformationen,",
          "Verbindungsinformationen,",
          "technische Protokoll- und Fehlerdaten,",
          "sicherheitsrelevante Ereignisse.",
        ],
      },
      {
        kind: "text",
        text: "Die Verarbeitung dieser Daten erfolgt zur Bereitstellung unserer Website, zur Gewährleistung der technischen Funktionsfähigkeit, zur Fehleranalyse sowie zum Schutz unserer Systeme vor Angriffen und Missbrauch.",
      },
      { kind: "text", text: "Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO." },
      {
        kind: "text",
        text: "Unser berechtigtes Interesse besteht in der sicheren, stabilen, zuverlässigen und effizienten Bereitstellung unseres Internetauftritts sowie im Schutz unserer technischen Infrastruktur.",
      },
      {
        kind: "text",
        text: "Soweit Railway personenbezogene Daten in unserem Auftrag verarbeitet, erfolgt dies auf Grundlage einer Vereinbarung zur Auftragsverarbeitung gemäß Art. 28 DSGVO.",
      },
      {
        kind: "text",
        text: "Railway Corporation hat ihren Sitz in den Vereinigten Staaten. Eine Verarbeitung personenbezogener Daten in den USA und gegebenenfalls weiteren Ländern kann daher nicht ausgeschlossen werden.",
      },
      {
        kind: "text",
        text: "Drittlandübermittlungen erfolgen unter Beachtung der Art. 44 ff. DSGVO. Hierfür können insbesondere der Angemessenheitsbeschluss der Europäischen Kommission im Rahmen des EU-U.S. Data Privacy Framework sowie die von der Europäischen Kommission genehmigten Standardvertragsklauseln herangezogen werden.",
      },
      {
        kind: "text",
        text: "Weitere Informationen zur Datenverarbeitung durch Railway finden Sie in den Datenschutzinformationen von Railway.",
      },
    ],
  },
  {
    title: "GitHub und Bereitstellung des Quellcodes",
    blocks: [
      {
        kind: "text",
        text: "Für die Entwicklung und Verwaltung des Quellcodes unserer Website nutzen wir GitHub.",
      },
      {
        kind: "text",
        text: "Die Website wird technisch aus unserem Entwicklungs- und Deploymentprozess heraus über Railway bereitgestellt.",
      },
      {
        kind: "text",
        text: "GitHub dient dabei insbesondere der Versionsverwaltung und Verwaltung unseres Quellcodes.",
      },
      {
        kind: "text",
        text: "Der bloße Besuch unserer Website führt nach unserer technischen Konfiguration nicht allein deshalb zu einer direkten Verbindung zwischen Ihrem Endgerät und GitHub.",
      },
      { kind: "text", text: "GitHub ist daher nicht der öffentliche Hostinganbieter dieser Website." },
      {
        kind: "text",
        text: "Soweit GitHub ausschließlich im Rahmen unserer internen Softwareentwicklung eingesetzt wird und hierbei keine personenbezogenen Daten von Websitebesuchern verarbeitet werden, findet insoweit keine Verarbeitung Ihrer personenbezogenen Daten aufgrund Ihres Websitebesuchs statt.",
      },
    ],
  },
  {
    title: "Server-Logfiles",
    blocks: [
      {
        kind: "text",
        text: "Beim Besuch unserer Website können automatisch technische Protokolldaten verarbeitet werden.",
      },
      { kind: "text", text: "Hierzu können insbesondere gehören:" },
      {
        kind: "list",
        items: [
          "IP-Adresse,",
          "Datum und Uhrzeit des Zugriffs,",
          "angeforderte Ressource,",
          "Browserinformationen,",
          "Betriebssystem,",
          "Referrer,",
          "HTTP-Statuscode,",
          "technische Fehler,",
          "Verbindungsinformationen.",
        ],
      },
      { kind: "text", text: "Diese Verarbeitung dient insbesondere:" },
      {
        kind: "list",
        items: [
          "der technischen Bereitstellung unserer Website,",
          "der Gewährleistung der Systemsicherheit,",
          "der Erkennung und Abwehr von Angriffen,",
          "der Fehlerdiagnose,",
          "der Sicherstellung eines stabilen Betriebs.",
        ],
      },
      { kind: "text", text: "Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO." },
      {
        kind: "text",
        text: "Unser berechtigtes Interesse besteht im sicheren und störungsfreien Betrieb unserer Website und unserer technischen Infrastruktur.",
      },
      {
        kind: "text",
        text: "Protokolldaten werden nur so lange gespeichert, wie dies für die genannten Zwecke erforderlich ist. Eine längere Speicherung kann erfolgen, wenn konkrete Sicherheitsvorfälle untersucht werden müssen oder gesetzliche Verpflichtungen eine weitere Speicherung erforderlich machen.",
      },
    ],
  },
  {
    title: "SSL- bzw. TLS-Verschlüsselung",
    blocks: [
      {
        kind: "text",
        text: "Unsere Website nutzt aus Sicherheitsgründen und zum Schutz der Übertragung personenbezogener und sonstiger vertraulicher Daten eine SSL- bzw. TLS-Verschlüsselung.",
      },
      {
        kind: "text",
        text: "Eine verschlüsselte Verbindung erkennen Sie insbesondere daran, dass die Adresse unserer Website mit „https://“ beginnt.",
      },
      {
        kind: "text",
        text: "Die Verschlüsselung dient dazu, übertragene Daten vor einem unbefugten Zugriff durch Dritte zu schützen.",
      },
    ],
  },
  {
    title: "Kontaktformular",
    blocks: [
      { kind: "text", text: "Auf unserer Website stellen wir ein Kontaktformular zur Verfügung." },
      {
        kind: "text",
        text: "Wenn Sie dieses Kontaktformular nutzen, können insbesondere folgende personenbezogene Daten verarbeitet werden:",
      },
      {
        kind: "list",
        items: [
          "Name,",
          "E-Mail-Adresse,",
          "Unternehmen,",
          "Telefonnummer, sofern angegeben,",
          "ausgewählter Anfragegrund,",
          "Inhalt Ihrer Nachricht,",
          "Datum und Zeitpunkt der Anfrage,",
          "gegebenenfalls technisch erforderliche Verbindungsdaten.",
        ],
      },
      {
        kind: "text",
        text: "Wir verarbeiten diese Daten, um Ihre Anfrage entgegenzunehmen, zu bearbeiten und mit Ihnen zu kommunizieren.",
      },
      {
        kind: "text",
        text: "Soweit sich Ihre Anfrage auf die Anbahnung oder Durchführung eines Vertrags bezieht, erfolgt die Verarbeitung auf Grundlage von Art. 6 Abs. 1 lit. b DSGVO.",
      },
      {
        kind: "text",
        text: "Bei sonstigen geschäftlichen Anfragen erfolgt die Verarbeitung auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO. Unser berechtigtes Interesse besteht in der ordnungsgemäßen und effizienten Bearbeitung eingehender Anfragen sowie der Kommunikation mit Interessenten, Kunden und Geschäftspartnern.",
      },
      {
        kind: "text",
        text: "Soweit wir für eine bestimmte Verarbeitung ausdrücklich Ihre Einwilligung einholen, erfolgt die Verarbeitung auf Grundlage von Art. 6 Abs. 1 lit. a DSGVO.",
      },
      {
        kind: "text",
        text: "Eine erteilte Einwilligung kann jederzeit mit Wirkung für die Zukunft widerrufen werden. Die Rechtmäßigkeit der bis zum Widerruf erfolgten Verarbeitung bleibt hiervon unberührt.",
      },
    ],
  },
  {
    title: "Schutz des Kontaktformulars vor Missbrauch",
    blocks: [
      {
        kind: "text",
        text: "Zum Schutz unseres Kontaktformulars vor Spam, automatisierten Anfragen und sonstigem Missbrauch können technische Schutzmechanismen eingesetzt werden.",
      },
      {
        kind: "text",
        text: "Hierzu können beispielsweise sogenannte Honeypot-Felder, technische Formularinformationen, Zeitstempel oder serverseitige Validierungsmechanismen gehören.",
      },
      {
        kind: "text",
        text: "Soweit hierbei personenbezogene Daten verarbeitet werden, erfolgt dies auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO.",
      },
      {
        kind: "text",
        text: "Unser berechtigtes Interesse besteht im Schutz unserer Website, unserer technischen Infrastruktur und unserer Kommunikationssysteme vor Spam, automatisierten Angriffen und sonstigem Missbrauch.",
      },
    ],
  },
  {
    title: "Kontaktaufnahme per E-Mail",
    blocks: [
      {
        kind: "text",
        text: "Wenn Sie uns per E-Mail kontaktieren, verarbeiten wir die von Ihnen übermittelten personenbezogenen Daten.",
      },
      { kind: "text", text: "Hierzu können insbesondere gehören:" },
      {
        kind: "list",
        items: [
          "Name,",
          "E-Mail-Adresse,",
          "Unternehmen,",
          "Position bzw. Funktion,",
          "Inhalt Ihrer Nachricht,",
          "Anhänge,",
          "weitere freiwillig übermittelte Informationen,",
          "Kommunikations- und Metadaten.",
        ],
      },
      {
        kind: "text",
        text: "Die Verarbeitung erfolgt zum Zweck der Bearbeitung Ihrer Anfrage und der weiteren Kommunikation mit Ihnen.",
      },
      {
        kind: "text",
        text: "Soweit Ihre Kontaktaufnahme auf die Anbahnung oder Durchführung eines Vertrags gerichtet ist, erfolgt die Verarbeitung auf Grundlage von Art. 6 Abs. 1 lit. b DSGVO.",
      },
      {
        kind: "text",
        text: "In sonstigen Fällen erfolgt die Verarbeitung auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO. Unser berechtigtes Interesse besteht in der effizienten Bearbeitung geschäftlicher Kommunikation.",
      },
    ],
  },
  {
    title: "Kontaktaufnahme per Telefon",
    blocks: [
      {
        kind: "text",
        text: "Wenn Sie uns telefonisch kontaktieren, können personenbezogene Daten verarbeitet werden, soweit dies für die Bearbeitung Ihres Anliegens erforderlich ist.",
      },
      { kind: "text", text: "Hierzu können insbesondere gehören:" },
      {
        kind: "list",
        items: [
          "Name,",
          "Telefonnummer,",
          "Unternehmen,",
          "Funktion,",
          "Gesprächsinhalte,",
          "Informationen zu Ihrem Anliegen,",
          "gegebenenfalls Gesprächsnotizen.",
        ],
      },
      {
        kind: "text",
        text: "Eine Aufzeichnung von Telefongesprächen erfolgt nicht ohne eine hierfür erforderliche Rechtsgrundlage bzw. Einwilligung.",
      },
      {
        kind: "text",
        text: "Soweit die Kommunikation der Vertragsanbahnung oder Vertragsdurchführung dient, erfolgt die Verarbeitung auf Grundlage von Art. 6 Abs. 1 lit. b DSGVO.",
      },
      { kind: "text", text: "Im Übrigen erfolgt die Verarbeitung auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO." },
    ],
  },
  {
    title: "Terminbuchung über Calendly",
    blocks: [
      {
        kind: "text",
        text: "Auf unserer Website bieten wir die Möglichkeit, über einen externen Link einen Termin für ein Strategiegespräch zu vereinbaren.",
      },
      { kind: "text", text: "Hierfür nutzen wir Calendly." },
      { kind: "text", text: "Anbieter ist:" },
      { kind: "address", lines: ["Calendly LLC", "USA"] },
      {
        kind: "text",
        text: "Wenn Sie den entsprechenden Link zur Terminbuchung anklicken, verlassen Sie unsere Website und werden zum Angebot von Calendly weitergeleitet.",
      },
      {
        kind: "text",
        text: "Beim bloßen Besuch unserer Website wird Calendly durch diesen externen Link nicht automatisch aufgerufen.",
      },
      {
        kind: "text",
        text: "Erst wenn Sie den Link aktiv auswählen und Calendly aufrufen, erfolgt die weitere Datenverarbeitung über den Dienst von Calendly.",
      },
      {
        kind: "text",
        text: "Bei der Nutzung von Calendly können insbesondere folgende personenbezogene Daten verarbeitet werden:",
      },
      {
        kind: "list",
        items: [
          "Name,",
          "E-Mail-Adresse,",
          "Unternehmen, sofern abgefragt,",
          "Telefonnummer, sofern abgefragt,",
          "gewünschter Termin,",
          "Zeitzone,",
          "von Ihnen gemachte Angaben zum Gespräch,",
          "technische Verbindungs- und Gerätedaten,",
          "Kommunikations- und Termindaten.",
        ],
      },
      {
        kind: "text",
        text: "Die Verarbeitung erfolgt, um die von Ihnen gewünschte Terminvereinbarung, Terminverwaltung und Durchführung des Gesprächs zu ermöglichen.",
      },
      {
        kind: "text",
        text: "Soweit der Termin der Anbahnung eines Vertrags dient, erfolgt die Verarbeitung auf Grundlage von Art. 6 Abs. 1 lit. b DSGVO.",
      },
      {
        kind: "text",
        text: "Soweit die Verarbeitung darüber hinaus der Organisation unserer geschäftlichen Kommunikation dient, kann sie auf Art. 6 Abs. 1 lit. f DSGVO gestützt werden. Unser berechtigtes Interesse besteht in einer effizienten und nutzerfreundlichen Terminplanung.",
      },
      {
        kind: "text",
        text: "Calendly kann personenbezogene Daten in den Vereinigten Staaten und gegebenenfalls weiteren Ländern verarbeiten.",
      },
      {
        kind: "text",
        text: "Für entsprechende Drittlandübermittlungen gelten die Voraussetzungen der Art. 44 ff. DSGVO. Hierfür können insbesondere ein einschlägiger Angemessenheitsbeschluss, das EU-U.S. Data Privacy Framework und geeignete Garantien wie Standardvertragsklauseln relevant sein.",
      },
      {
        kind: "text",
        text: "Weitere Informationen zur Verarbeitung personenbezogener Daten finden Sie in den Datenschutzinformationen von Calendly.",
      },
    ],
  },
  {
    title: "Verlinkung auf externe Anwendungen und OKUN Blueprint",
    blocks: [
      {
        kind: "text",
        text: "Unsere Website kann Links zu von uns angebotenen oder betriebenen externen Anwendungen und Plattformen enthalten.",
      },
      { kind: "text", text: "Hierzu kann insbesondere OKUN Blueprint gehören." },
      {
        kind: "text",
        text: "Soweit eine Registrierung, Anmeldung oder Nutzung von OKUN Blueprint auf einer technisch getrennten Anwendung bzw. Plattform erfolgt, findet die hierfür erforderliche Verarbeitung personenbezogener Daten nicht im Rahmen des bloßen Besuchs dieser Website statt.",
      },
      {
        kind: "text",
        text: "Wenn Sie einen entsprechenden Link auswählen, verlassen Sie gegebenenfalls die Website von OKUN Systems und wechseln zu der jeweiligen Anwendung.",
      },
      {
        kind: "text",
        text: "Für die Verarbeitung personenbezogener Daten innerhalb einer solchen Anwendung gelten die dort bereitgestellten Datenschutzinformationen.",
      },
      {
        kind: "text",
        text: "Soweit zwischen unserer Website und einer externen Anwendung lediglich eine Verlinkung besteht, werden durch den bloßen Besuch unserer Website nicht allein aufgrund dieser Verlinkung personenbezogene Registrierungs- oder Kontodaten an die externe Anwendung übermittelt.",
      },
    ],
  },
  {
    title: "Sonstige externe Links",
    blocks: [
      {
        kind: "text",
        text: "Unsere Website kann Links zu Websites oder Diensten externer Anbieter enthalten.",
      },
      {
        kind: "text",
        text: "Wenn Sie einen solchen Link aktiv auswählen, verlassen Sie unsere Website und werden zur Website bzw. zum Dienst des jeweiligen Anbieters weitergeleitet.",
      },
      {
        kind: "text",
        text: "Ab diesem Zeitpunkt erfolgt die weitere Verarbeitung personenbezogener Daten grundsätzlich im Verantwortungsbereich des jeweiligen externen Anbieters.",
      },
      {
        kind: "text",
        text: "Wir haben keinen vollständigen Einfluss darauf, welche personenbezogenen Daten externe Anbieter nach dem Aufruf ihrer Websites oder Dienste verarbeiten.",
      },
      {
        kind: "text",
        text: "Bitte beachten Sie daher die jeweiligen Datenschutzinformationen der betreffenden Anbieter.",
      },
    ],
  },
  {
    title: "Instagram und Social-Media-Links",
    blocks: [
      {
        kind: "text",
        text: "Unsere Website kann Links zu unseren Auftritten in sozialen Netzwerken, insbesondere Instagram, enthalten.",
      },
      {
        kind: "text",
        text: "Soweit lediglich ein externer Link verwendet wird und keine Inhalte des sozialen Netzwerks unmittelbar in unsere Website eingebettet sind, wird durch den bloßen Besuch unserer Website aufgrund dieses Links keine direkte Verbindung zum jeweiligen sozialen Netzwerk hergestellt.",
      },
      {
        kind: "text",
        text: "Erst wenn Sie den entsprechenden Link aktiv auswählen, werden Sie zur jeweiligen Plattform weitergeleitet.",
      },
      { kind: "text", text: "Dort gelten die Datenschutzbestimmungen des jeweiligen Plattformbetreibers." },
      {
        kind: "text",
        text: "Beim Besuch einer Social-Media-Plattform können personenbezogene Daten durch den jeweiligen Plattformbetreiber verarbeitet werden. Dies kann auch eine Verarbeitung außerhalb des Europäischen Wirtschaftsraums umfassen.",
      },
    ],
  },
  {
    title: "Cookies und vergleichbare Technologien",
    blocks: [
      {
        kind: "text",
        text: "Unsere Website kann technisch notwendige Cookies oder vergleichbare Technologien verwenden, soweit diese für den technischen Betrieb und die Bereitstellung der von Ihnen gewünschten Funktionen erforderlich sind.",
      },
      { kind: "text", text: "Cookies sind kleine Informationen, die auf Ihrem Endgerät gespeichert werden können." },
      {
        kind: "text",
        text: "Soweit Informationen auf Ihrem Endgerät gespeichert oder aus Ihrem Endgerät ausgelesen werden, beachten wir die gesetzlichen Vorgaben, insbesondere § 25 TDDDG.",
      },
      {
        kind: "text",
        text: "Soweit die Speicherung oder der Zugriff unbedingt erforderlich ist, damit wir einen von Ihnen ausdrücklich gewünschten digitalen Dienst zur Verfügung stellen können, kann eine Einwilligung gesetzlich entbehrlich sein.",
      },
      {
        kind: "text",
        text: "Soweit nicht technisch erforderliche Cookies, Tracking-Technologien oder vergleichbare Technologien eingesetzt werden, erfolgt deren Nutzung grundsätzlich erst nach einer erforderlichen Einwilligung.",
      },
      {
        kind: "text",
        text: "Soweit personenbezogene Daten aufgrund Ihrer Einwilligung verarbeitet werden, erfolgt die Verarbeitung auf Grundlage von Art. 6 Abs. 1 lit. a DSGVO.",
      },
      { kind: "text", text: "Eine erteilte Einwilligung kann jederzeit mit Wirkung für die Zukunft widerrufen werden." },
    ],
  },
  {
    title: "Webanalyse, Tracking und Marketingtechnologien",
    blocks: [
      {
        kind: "text",
        text: "Nach unserem derzeit vorgesehenen Website-Setup setzen wir auf dieser Website keine Dienste wie Google Analytics, Meta Pixel oder vergleichbare personenbezogene Analyse- oder Marketing-Tracking-Technologien ein.",
      },
      {
        kind: "text",
        text: "Sollten zukünftig entsprechende Technologien eingesetzt werden, werden wir vor deren Einsatz prüfen, ob hierfür eine Einwilligung erforderlich ist, gegebenenfalls ein entsprechendes Einwilligungsmanagement implementieren und diese Datenschutzerklärung aktualisieren.",
      },
    ],
  },
  {
    title: "Schriftarten und externe Ressourcen",
    blocks: [
      {
        kind: "text",
        text: "Für die Darstellung unserer Website können Schriftarten, Icons, Skripte, Stylesheets, Bibliotheken und andere technische Ressourcen erforderlich sein.",
      },
      {
        kind: "text",
        text: "Soweit diese Ressourcen lokal bzw. über unsere eigene Hosting-Infrastruktur bereitgestellt werden, wird allein aufgrund ihres Ladens keine zusätzliche Verbindung zu einem externen Drittanbieter hergestellt.",
      },
      {
        kind: "text",
        text: "Soweit zukünftig externe Ressourcen unmittelbar von Servern eines Drittanbieters geladen werden und hierbei personenbezogene Daten, insbesondere die IP-Adresse, an diesen Anbieter übermittelt werden, werden wir die datenschutzrechtlichen Voraussetzungen hierfür prüfen und diese Datenschutzerklärung entsprechend ergänzen.",
      },
    ],
  },
  {
    title: "Empfänger und Kategorien von Empfängern",
    blocks: [
      {
        kind: "text",
        text: "Personenbezogene Daten werden grundsätzlich nur weitergegeben, wenn hierfür eine rechtliche Grundlage besteht.",
      },
      { kind: "text", text: "Empfänger bzw. Kategorien von Empfängern können insbesondere sein:" },
      {
        kind: "list",
        items: [
          "Hosting- und Infrastruktur-Dienstleister,",
          "IT- und technische Dienstleister,",
          "E-Mail- und Kommunikationsdienstleister,",
          "Terminbuchungsdienste,",
          "von uns eingesetzte Auftragsverarbeiter,",
          "Rechts- und Steuerberater,",
          "Behörden und öffentliche Stellen, soweit eine gesetzliche Verpflichtung besteht.",
        ],
      },
      {
        kind: "text",
        text: "Soweit Dienstleister personenbezogene Daten in unserem Auftrag verarbeiten, werden sie nach Maßgabe der gesetzlichen Anforderungen eingebunden.",
      },
    ],
  },
  {
    title: "Datenübermittlung in Drittländer",
    blocks: [
      {
        kind: "text",
        text: "Einige von uns eingesetzte Dienstleister können ihren Sitz außerhalb der Europäischen Union bzw. des Europäischen Wirtschaftsraums haben oder personenbezogene Daten außerhalb des Europäischen Wirtschaftsraums verarbeiten.",
      },
      {
        kind: "text",
        text: "Eine Übermittlung personenbezogener Daten in ein Drittland erfolgt ausschließlich unter Beachtung der gesetzlichen Voraussetzungen der Art. 44 ff. DSGVO.",
      },
      {
        kind: "text",
        text: "Je nach Empfänger und Drittland kann die Datenübermittlung insbesondere gestützt werden auf:",
      },
      {
        kind: "list",
        items: [
          "einen Angemessenheitsbeschluss der Europäischen Kommission,",
          "das EU-U.S. Data Privacy Framework bei entsprechend zertifizierten US-Unternehmen,",
          "Standardvertragsklauseln der Europäischen Kommission,",
          "oder eine andere nach der DSGVO zulässige Grundlage.",
        ],
      },
      {
        kind: "text",
        text: "Soweit erforderlich, berücksichtigen wir ergänzende technische und organisatorische Schutzmaßnahmen.",
      },
    ],
  },
  {
    title: "Speicherdauer",
    blocks: [
      {
        kind: "text",
        text: "Wir speichern personenbezogene Daten grundsätzlich nur so lange, wie dies für den jeweiligen Zweck erforderlich ist.",
      },
      {
        kind: "text",
        text: "Anschließend werden die Daten gelöscht oder anonymisiert, sofern keine gesetzlichen Aufbewahrungspflichten oder sonstigen zulässigen Gründe für eine weitere Speicherung bestehen.",
      },
      { kind: "text", text: "Die konkrete Speicherdauer richtet sich insbesondere nach:" },
      {
        kind: "list",
        items: [
          "dem Zweck der Verarbeitung,",
          "der Dauer einer Geschäftsbeziehung,",
          "gesetzlichen Verjährungsfristen,",
          "handels- und steuerrechtlichen Aufbewahrungspflichten,",
          "gesetzlichen Dokumentationspflichten,",
          "der Notwendigkeit zur Geltendmachung, Ausübung oder Verteidigung von Rechtsansprüchen.",
        ],
      },
      {
        kind: "text",
        text: "Geschäftliche Unterlagen können aufgrund gesetzlicher Vorgaben über mehrere Jahre aufzubewahren sein.",
      },
      {
        kind: "text",
        text: "Kontaktanfragen, aus denen keine Geschäftsbeziehung entsteht, werden gelöscht, sobald ihre weitere Speicherung für die Bearbeitung des Anliegens nicht mehr erforderlich ist und keine gesetzlichen oder berechtigten Gründe für eine weitere Speicherung bestehen.",
      },
    ],
  },
  {
    title: "Pflicht zur Bereitstellung personenbezogener Daten",
    blocks: [
      {
        kind: "text",
        text: "Beim bloßen Besuch unserer Website besteht grundsätzlich keine gesetzliche oder vertragliche Verpflichtung, uns aktiv personenbezogene Daten bereitzustellen.",
      },
      {
        kind: "text",
        text: "Bestimmte technische Informationen, insbesondere Verbindungsdaten, sind jedoch erforderlich, damit unsere Website technisch bereitgestellt werden kann.",
      },
      {
        kind: "text",
        text: "Wenn Sie uns kontaktieren, ein Kontaktformular verwenden oder einen Termin vereinbaren möchten, benötigen wir bestimmte Angaben, um Ihre Anfrage bearbeiten bzw. den gewünschten Termin organisieren zu können.",
      },
      { kind: "text", text: "Pflichtfelder werden entsprechend gekennzeichnet." },
      { kind: "text", text: "Darüber hinausgehende Angaben erfolgen grundsätzlich freiwillig." },
    ],
  },
  {
    title: "Automatisierte Entscheidungsfindung und Profiling",
    blocks: [
      {
        kind: "text",
        text: "Im Rahmen des Betriebs dieser Website findet nach unserem derzeitigen Website-Setup keine ausschließlich auf einer automatisierten Verarbeitung beruhende Entscheidungsfindung im Sinne von Art. 22 DSGVO statt, die Ihnen gegenüber rechtliche Wirkung entfaltet oder Sie in ähnlich erheblicher Weise beeinträchtigt.",
      },
      {
        kind: "text",
        text: "Ein entsprechendes Profiling findet im Rahmen des normalen Besuchs dieser Website ebenfalls nicht statt.",
      },
      {
        kind: "text",
        text: "Sollten wir zukünftig entsprechende Verfahren einsetzen, werden wir die hierfür erforderlichen Informationen und Schutzmaßnahmen bereitstellen und diese Datenschutzerklärung entsprechend aktualisieren.",
      },
    ],
  },
  {
    title: "Datensicherheit",
    blocks: [
      {
        kind: "text",
        text: "Wir treffen unter Berücksichtigung des Stands der Technik, der Implementierungskosten, der Art, des Umfangs, der Umstände und Zwecke der Verarbeitung sowie der unterschiedlichen Eintrittswahrscheinlichkeit und Schwere der Risiken angemessene technische und organisatorische Maßnahmen zum Schutz personenbezogener Daten.",
      },
      { kind: "text", text: "Diese Maßnahmen dienen insbesondere dem Schutz vor:" },
      {
        kind: "list",
        items: [
          "unbefugtem Zugriff,",
          "unbefugter Offenlegung,",
          "Verlust,",
          "Manipulation,",
          "Zerstörung,",
          "Missbrauch.",
        ],
      },
      {
        kind: "text",
        text: "Unsere Sicherheitsmaßnahmen werden entsprechend der technischen Entwicklung und der jeweiligen Risiken überprüft und weiterentwickelt.",
      },
    ],
  },
  {
    title: "Ihre Rechte als betroffene Person",
    blocks: [
      {
        kind: "text",
        text: "Sie haben nach Maßgabe der gesetzlichen Voraussetzungen insbesondere folgende Rechte:",
      },
      {
        kind: "term",
        title: "Recht auf Auskunft – Art. 15 DSGVO",
        text: "Sie haben das Recht, Auskunft darüber zu verlangen, ob wir personenbezogene Daten über Sie verarbeiten und, soweit dies der Fall ist, weitere Informationen über diese Verarbeitung sowie eine Kopie Ihrer personenbezogenen Daten zu erhalten.",
      },
      {
        kind: "term",
        title: "Recht auf Berichtigung – Art. 16 DSGVO",
        text: "Sie können die unverzügliche Berichtigung unrichtiger personenbezogener Daten sowie die Vervollständigung unvollständiger personenbezogener Daten verlangen.",
      },
      {
        kind: "term",
        title: "Recht auf Löschung – Art. 17 DSGVO",
        text: "Sie können unter den gesetzlichen Voraussetzungen die Löschung Ihrer personenbezogenen Daten verlangen.",
      },
      {
        kind: "term",
        title: "Recht auf Einschränkung der Verarbeitung – Art. 18 DSGVO",
        text: "Sie können unter den gesetzlichen Voraussetzungen verlangen, dass die Verarbeitung Ihrer personenbezogenen Daten eingeschränkt wird.",
      },
      {
        kind: "term",
        title: "Recht auf Datenübertragbarkeit – Art. 20 DSGVO",
        text: "Soweit die gesetzlichen Voraussetzungen vorliegen, können Sie personenbezogene Daten, die Sie uns bereitgestellt haben, in einem strukturierten, gängigen und maschinenlesbaren Format erhalten und die Übermittlung dieser Daten an einen anderen Verantwortlichen verlangen.",
      },
      {
        kind: "term",
        title: "Widerspruchsrecht – Art. 21 DSGVO",
        text: "Soweit wir personenbezogene Daten auf Grundlage von Art. 6 Abs. 1 lit. e oder lit. f DSGVO verarbeiten, haben Sie das Recht, aus Gründen, die sich aus Ihrer besonderen Situation ergeben, jederzeit Widerspruch gegen die Verarbeitung einzulegen.",
      },
      {
        kind: "text",
        text: "Wir verarbeiten die personenbezogenen Daten anschließend nicht mehr, es sei denn, wir können zwingende schutzwürdige Gründe für die Verarbeitung nachweisen, die Ihre Interessen, Rechte und Freiheiten überwiegen, oder die Verarbeitung dient der Geltendmachung, Ausübung oder Verteidigung von Rechtsansprüchen.",
      },
      {
        kind: "text",
        text: "Werden personenbezogene Daten für Zwecke der Direktwerbung verarbeitet, können Sie der Verarbeitung Ihrer personenbezogenen Daten für derartige Werbung jederzeit widersprechen.",
      },
      {
        kind: "term",
        title: "Widerruf einer Einwilligung – Art. 7 Abs. 3 DSGVO",
        text: "Eine erteilte Einwilligung können Sie jederzeit mit Wirkung für die Zukunft widerrufen.",
      },
      {
        kind: "text",
        text: "Durch den Widerruf wird die Rechtmäßigkeit der bis zum Widerruf auf Grundlage der Einwilligung erfolgten Verarbeitung nicht berührt.",
      },
    ],
  },
  {
    title: "Ausübung Ihrer Datenschutzrechte",
    blocks: [
      {
        kind: "text",
        text: "Zur Ausübung Ihrer Datenschutzrechte sowie bei Fragen zur Verarbeitung Ihrer personenbezogenen Daten können Sie sich an uns wenden:",
      },
      {
        kind: "address",
        lines: [
          "OKUN SYSTEMS UG (haftungsbeschränkt)",
          "Potsdamer Platz 1",
          "10785 Berlin",
          "Deutschland",
        ],
      },
      { kind: "text", text: "E-Mail: kontakt@okun-systems.com" },
      { kind: "text", text: "Telefon: 030 13883330" },
      {
        kind: "text",
        text: "Bei begründeten Zweifeln an der Identität einer anfragenden Person können wir zusätzliche Informationen verlangen, soweit dies erforderlich ist, um personenbezogene Daten vor einer unberechtigten Offenlegung zu schützen.",
      },
    ],
  },
  {
    title: "Beschwerderecht bei einer Datenschutzaufsichtsbehörde",
    blocks: [
      {
        kind: "text",
        text: "Sie haben gemäß Art. 77 DSGVO das Recht, sich bei einer Datenschutzaufsichtsbehörde zu beschweren, wenn Sie der Ansicht sind, dass die Verarbeitung Ihrer personenbezogenen Daten gegen datenschutzrechtliche Vorschriften verstößt.",
      },
      { kind: "text", text: "Für unser Unternehmen ist insbesondere folgende Aufsichtsbehörde zuständig:" },
      {
        kind: "address",
        lines: [
          "Berliner Beauftragte für Datenschutz und Informationsfreiheit",
          "Alt-Moabit 59–61",
          "10555 Berlin",
          "Deutschland",
        ],
      },
      { kind: "text", text: "Telefon: +49 30 13889-0" },
      { kind: "text", text: "E-Mail: mailbox@datenschutz-berlin.de" },
      {
        kind: "text",
        text: "Ihr Recht, sich an eine andere nach den gesetzlichen Vorschriften zuständige Datenschutzaufsichtsbehörde zu wenden, bleibt unberührt.",
      },
    ],
  },
  {
    title: "Änderungen dieser Datenschutzerklärung",
    blocks: [
      { kind: "text", text: "Wir behalten uns vor, diese Datenschutzerklärung anzupassen, wenn sich:" },
      {
        kind: "list",
        items: [
          "unsere Website,",
          "die von uns eingesetzten Technologien,",
          "unsere Datenverarbeitungen,",
          "unsere Dienstleister,",
          "unsere Unternehmensstruktur,",
          "oder die rechtlichen Anforderungen",
        ],
      },
      { kind: "text", text: "ändern." },
      { kind: "text", text: "Es gilt die jeweils auf dieser Website veröffentlichte aktuelle Fassung." },
    ],
  },
];
