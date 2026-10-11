/**
 * Der Katalog gängiger Unternehmenssoftware.
 *
 * Wozu: Im Profil nennt der Interessent, womit er arbeitet. Tippt er „Outl",
 * soll „Microsoft Outlook" vorgeschlagen werden — nicht aus Spielerei, sondern
 * weil es in einer Sekunde zeigt, dass wir seine Welt kennen. Ein Berater, der
 * den Namen der Branchensoftware kennt, muss sich nicht mehr vorstellen.
 *
 * Was hier **nicht** steht: Bewertungen, Preise, Marktanteile, Empfehlungen.
 * Der Zweck ist eine knappe, nachprüfbare Einordnung, womit das Programm
 * üblicherweise benutzt wird — mehr behaupten wir nicht. Was ein Betrieb
 * tatsächlich damit macht, sagt er selbst.
 *
 * Vollständigkeit ist nicht erreichbar und auch nicht das Ziel. Was fehlt,
 * trägt der Interessent als freien Begriff ein; dann fragen wir nach, wofür er
 * es nutzt, und die Antwort wird eingeordnet (siehe `deutung.ts`).
 */

export type SoftwareKategorie =
  | "buero"
  | "buchhaltung"
  | "crm"
  | "erp"
  | "branche"
  | "personal"
  | "zeit"
  | "kommunikation"
  | "projekt"
  | "ablage"
  | "automatisierung"
  | "shop"
  | "technik";

export const KATEGORIE_LABEL: Record<SoftwareKategorie, string> = {
  buero: "Büro und Office",
  buchhaltung: "Buchhaltung und Steuern",
  crm: "Kunden und Vertrieb",
  erp: "Warenwirtschaft und ERP",
  branche: "Branchensoftware",
  personal: "Personal",
  zeit: "Zeiterfassung und Planung",
  kommunikation: "Kommunikation",
  projekt: "Projekte und Aufgaben",
  ablage: "Dateien und Dokumente",
  automatisierung: "Automatisierung",
  shop: "Shop und Versand",
  technik: "Technik und Konstruktion",
};

export type SoftwareEintrag = {
  key: string;
  name: string;
  kategorie: SoftwareKategorie;
  /** Wofür es üblicherweise eingesetzt wird. Ein Satzteil, keine Werbung. */
  zweck: string;
  /** Schreibweisen, unter denen Betriebe es nennen. */
  aliase?: string[];
  /** Wo es verbreitet ist. Leer heißt: branchenübergreifend. */
  branchen?: string[];
};

export const SOFTWARE: SoftwareEintrag[] = [
  // ── Büro und Office ──────────────────────────────────────────────────────
  { key: "sw_m365", name: "Microsoft 365", kategorie: "buero", zweck: "Office-Paket mit Mail, Dateiablage und Zusammenarbeit", aliase: ["office 365", "o365", "ms 365", "microsoft office"] },
  { key: "sw_outlook", name: "Microsoft Outlook", kategorie: "buero", zweck: "E-Mail, Kalender und Kontakte", aliase: ["outlook", "ms outlook"] },
  { key: "sw_excel", name: "Microsoft Excel", kategorie: "buero", zweck: "Tabellen, Listen und Auswertungen", aliase: ["excel", "exel", "tabellen"] },
  { key: "sw_word", name: "Microsoft Word", kategorie: "buero", zweck: "Schriftstücke und Vorlagen", aliase: ["word"] },
  { key: "sw_powerpoint", name: "Microsoft PowerPoint", kategorie: "buero", zweck: "Präsentationen", aliase: ["powerpoint", "ppt"] },
  { key: "sw_access", name: "Microsoft Access", kategorie: "buero", zweck: "Selbstgebaute Datenbanken im Büro", aliase: ["access"] },
  { key: "sw_gworkspace", name: "Google Workspace", kategorie: "buero", zweck: "Mail, Kalender und Dokumente im Browser", aliase: ["google workspace", "gsuite", "g suite", "google apps"] },
  { key: "sw_gmail", name: "Gmail", kategorie: "buero", zweck: "E-Mail", aliase: ["google mail", "googlemail"] },
  { key: "sw_gsheets", name: "Google Tabellen", kategorie: "buero", zweck: "Tabellen im Browser, gemeinsam bearbeitet", aliase: ["google sheets", "google tabellen", "sheets"] },
  { key: "sw_gdocs", name: "Google Docs", kategorie: "buero", zweck: "Schriftstücke im Browser", aliase: ["google docs", "google dokumente"] },
  { key: "sw_libreoffice", name: "LibreOffice", kategorie: "buero", zweck: "Freies Office-Paket", aliase: ["libre office", "openoffice", "open office"] },
  { key: "sw_thunderbird", name: "Mozilla Thunderbird", kategorie: "buero", zweck: "E-Mail-Programm", aliase: ["thunderbird"] },
  { key: "sw_apple_mail", name: "Apple Mail", kategorie: "buero", zweck: "E-Mail auf Mac und iPhone", aliase: ["apple mail", "mac mail"] },

  // ── Buchhaltung und Steuern ──────────────────────────────────────────────
  { key: "sw_datev", name: "DATEV", kategorie: "buchhaltung", zweck: "Buchhaltung und Lohn, meist gemeinsam mit dem Steuerberater", aliase: ["datev", "datev unternehmen online", "duo"] },
  { key: "sw_lexware", name: "Lexware", kategorie: "buchhaltung", zweck: "Buchhaltung, Lohn und Warenwirtschaft für kleinere Betriebe", aliase: ["lexware", "lex ware"] },
  { key: "sw_lexoffice", name: "Lexware Office", kategorie: "buchhaltung", zweck: "Buchhaltung und Rechnungen im Browser", aliase: ["lexoffice", "lex office", "lexware office"] },
  { key: "sw_sevdesk", name: "sevDesk", kategorie: "buchhaltung", zweck: "Rechnungen und Buchhaltung im Browser", aliase: ["sevdesk", "sev desk"] },
  { key: "sw_sage", name: "Sage", kategorie: "buchhaltung", zweck: "Buchhaltung und Warenwirtschaft", aliase: ["sage", "sage 50", "sage 100"] },
  { key: "sw_addison", name: "Addison", kategorie: "buchhaltung", zweck: "Kanzlei- und Betriebsbuchhaltung", aliase: ["addison", "wolters kluwer addison"] },
  { key: "sw_agenda", name: "Agenda", kategorie: "buchhaltung", zweck: "Buchhaltung und Lohn, verbreitet über Steuerkanzleien", aliase: ["agenda software"] },
  { key: "sw_fastbill", name: "FastBill", kategorie: "buchhaltung", zweck: "Rechnungen und Belege", aliase: ["fastbill"] },
  { key: "sw_billomat", name: "Billomat", kategorie: "buchhaltung", zweck: "Rechnungen im Browser", aliase: ["billomat"] },
  { key: "sw_easybill", name: "easybill", kategorie: "buchhaltung", zweck: "Rechnungen und Belege", aliase: ["easybill"] },
  { key: "sw_collmex", name: "Collmex", kategorie: "buchhaltung", zweck: "Buchhaltung und Warenwirtschaft", aliase: ["collmex"] },
  { key: "sw_scopevisio", name: "Scopevisio", kategorie: "buchhaltung", zweck: "Kaufmännische Software im Browser", aliase: ["scopevisio"] },
  { key: "sw_diamant", name: "Diamant", kategorie: "buchhaltung", zweck: "Rechnungswesen und Controlling", aliase: ["diamant software"] },
  { key: "sw_candis", name: "Candis", kategorie: "buchhaltung", zweck: "Rechnungseingang und Freigaben", aliase: ["candis"] },
  { key: "sw_getmyinvoices", name: "GetMyInvoices", kategorie: "buchhaltung", zweck: "Belege automatisch einsammeln", aliase: ["getmyinvoices"] },
  { key: "sw_elster", name: "ELSTER", kategorie: "buchhaltung", zweck: "Steuererklärungen und Voranmeldungen beim Finanzamt", aliase: ["elster"] },

  // ── Kunden und Vertrieb ──────────────────────────────────────────────────
  { key: "sw_salesforce", name: "Salesforce", kategorie: "crm", zweck: "Kundenverwaltung und Vertriebssteuerung", aliase: ["salesforce", "sales force", "sfdc"] },
  { key: "sw_hubspot", name: "HubSpot", kategorie: "crm", zweck: "Kunden, Marketing und Vertrieb", aliase: ["hubspot", "hub spot"] },
  { key: "sw_pipedrive", name: "Pipedrive", kategorie: "crm", zweck: "Vertriebspipeline und Nachfassen", aliase: ["pipedrive", "pipe drive"] },
  { key: "sw_zoho", name: "Zoho CRM", kategorie: "crm", zweck: "Kundenverwaltung", aliase: ["zoho", "zoho crm"] },
  { key: "sw_centralstation", name: "CentralStationCRM", kategorie: "crm", zweck: "Kundenverwaltung für kleine Betriebe", aliase: ["centralstation", "central station crm"] },
  { key: "sw_dynamics", name: "Microsoft Dynamics 365", kategorie: "crm", zweck: "Kunden, Vertrieb und Betriebsabläufe", aliase: ["dynamics", "dynamics 365", "ms dynamics", "navision", "business central"] },
  { key: "sw_sugar", name: "SugarCRM", kategorie: "crm", zweck: "Kundenverwaltung", aliase: ["sugarcrm", "suitecrm", "suite crm"] },
  { key: "sw_brevo", name: "Brevo", kategorie: "crm", zweck: "Newsletter und Kundenmails", aliase: ["brevo", "sendinblue"] },
  { key: "sw_mailchimp", name: "Mailchimp", kategorie: "crm", zweck: "Newsletter", aliase: ["mailchimp", "mail chimp"] },
  { key: "sw_cleverreach", name: "CleverReach", kategorie: "crm", zweck: "Newsletter", aliase: ["cleverreach"] },
  { key: "sw_calendly", name: "Calendly", kategorie: "crm", zweck: "Termine ohne Hin und Her vereinbaren", aliase: ["calendly"] },

  // ── Warenwirtschaft und ERP ──────────────────────────────────────────────
  { key: "sw_sap", name: "SAP", kategorie: "erp", zweck: "Unternehmenssoftware für Finanzen, Material und Vertrieb", aliase: ["sap", "s/4hana", "sap b1", "business one"] },
  { key: "sw_odoo", name: "Odoo", kategorie: "erp", zweck: "Modularer Baukasten für Warenwirtschaft und Verwaltung", aliase: ["odoo"] },
  { key: "sw_weclapp", name: "weclapp", kategorie: "erp", zweck: "Warenwirtschaft, CRM und Rechnungen im Browser", aliase: ["weclapp", "we clapp"] },
  { key: "sw_xentral", name: "Xentral", kategorie: "erp", zweck: "Warenwirtschaft für Handel und Versand", aliase: ["xentral"] },
  { key: "sw_microtech", name: "microtech büro+", kategorie: "erp", zweck: "Warenwirtschaft und Fakturierung", aliase: ["microtech", "buero+", "büro+"] },
  { key: "sw_jtl", name: "JTL-Wawi", kategorie: "erp", zweck: "Warenwirtschaft für Onlinehandel", aliase: ["jtl", "jtl wawi"] },
  { key: "sw_plentymarkets", name: "plentymarkets", kategorie: "erp", zweck: "Warenwirtschaft und Marktplätze", aliase: ["plentymarkets", "plenty"] },
  { key: "sw_abas", name: "abas ERP", kategorie: "erp", zweck: "ERP für Fertigung und Handel", aliase: ["abas"] },
  { key: "sw_proalpha", name: "proALPHA", kategorie: "erp", zweck: "ERP für den Mittelstand", aliase: ["proalpha", "pro alpha"] },
  { key: "sw_infor", name: "Infor", kategorie: "erp", zweck: "ERP für Fertigung und Logistik", aliase: ["infor", "infor ln"] },
  { key: "sw_haufe_x360", name: "Haufe X360", kategorie: "erp", zweck: "Kaufmännische Software im Browser", aliase: ["haufe x360", "x360"] },

  // ── Branchensoftware: Handwerk und Bau ───────────────────────────────────
  { key: "sw_pds", name: "pds", kategorie: "branche", zweck: "Handwerkssoftware von Angebot bis Rechnung", aliase: ["pds software"], branchen: ["handwerk"] },
  { key: "sw_streit", name: "Streit V.1", kategorie: "branche", zweck: "Handwerkssoftware mit Aufmaß und Nachkalkulation", aliase: ["streit", "streit v1"], branchen: ["handwerk"] },
  { key: "sw_taifun", name: "TAIFUN Software", kategorie: "branche", zweck: "Handwerkssoftware für Auftrag und Rechnung", aliase: ["taifun"], branchen: ["handwerk"] },
  { key: "sw_label", name: "Label Software", kategorie: "branche", zweck: "Handwerkssoftware mit Lager und Service", aliase: ["label software", "label win"], branchen: ["handwerk"] },
  { key: "sw_moser", name: "Moser Software", kategorie: "branche", zweck: "Bau- und Handwerkssoftware", aliase: ["moser"], branchen: ["handwerk", "bau"] },
  { key: "sw_kwp", name: "KWP", kategorie: "branche", zweck: "Handwerkssoftware für SHK und Elektro", aliase: ["kwp", "kwp bnwin"], branchen: ["handwerk"] },
  { key: "sw_sander", name: "Sander Software", kategorie: "branche", zweck: "Handwerkssoftware", aliase: ["sander"], branchen: ["handwerk"] },
  { key: "sw_topkontor", name: "TopKontor Handwerk", kategorie: "branche", zweck: "Auftragsabwicklung im Handwerk", aliase: ["topkontor", "top kontor", "blue:solution"], branchen: ["handwerk"] },
  { key: "sw_hero", name: "HERO Software", kategorie: "branche", zweck: "Handwerkssoftware im Browser", aliase: ["hero software", "hero"], branchen: ["handwerk"] },
  { key: "sw_craftnote", name: "Craftnote", kategorie: "branche", zweck: "Baustellen-Dokumentation auf dem Telefon", aliase: ["craftnote", "craft note"], branchen: ["handwerk", "bau"] },
  { key: "sw_plancraft", name: "Plancraft", kategorie: "branche", zweck: "Angebote, Aufmaß und Rechnungen im Handwerk", aliase: ["plancraft"], branchen: ["handwerk"] },
  { key: "sw_meisterwerk", name: "Meisterwerk", kategorie: "branche", zweck: "Auftragsverwaltung im Handwerk", aliase: ["meisterwerk"], branchen: ["handwerk"] },
  { key: "sw_tool_time", name: "ToolTime", kategorie: "branche", zweck: "Auftrags- und Zeiterfassung im Handwerk", aliase: ["tooltime", "tool time"], branchen: ["handwerk"] },
  { key: "sw_openhandwerk", name: "OpenHandwerk", kategorie: "branche", zweck: "Handwerkersoftware im Browser", aliase: ["openhandwerk"], branchen: ["handwerk"] },
  { key: "sw_nevaris", name: "NEVARIS", kategorie: "branche", zweck: "Bausoftware für Kalkulation und Abrechnung", aliase: ["nevaris"], branchen: ["bau"] },
  { key: "sw_brz", name: "BRZ", kategorie: "branche", zweck: "Bausoftware und Baulohn", aliase: ["brz", "brz deutschland"], branchen: ["bau"] },
  { key: "sw_bausu", name: "BAU-SU", kategorie: "branche", zweck: "Bausoftware für Kalkulation und Bauabrechnung", aliase: ["bau su", "bausu"], branchen: ["bau"] },
  { key: "sw_orca", name: "ORCA AVA", kategorie: "branche", zweck: "Ausschreibung, Vergabe und Abrechnung", aliase: ["orca", "orca ava"], branchen: ["bau", "planung"] },
  { key: "sw_capmo", name: "Capmo", kategorie: "branche", zweck: "Bauprojekte und Mängel dokumentieren", aliase: ["capmo"], branchen: ["bau"] },
  { key: "sw_123erfasst", name: "123erfasst", kategorie: "branche", zweck: "Zeiterfassung und Baustellenberichte", aliase: ["123erfasst", "123 erfasst"], branchen: ["bau", "handwerk"] },

  // ── Branchensoftware: Gesundheit und Pflege ──────────────────────────────
  { key: "sw_medifox", name: "MediFox DAN", kategorie: "branche", zweck: "Pflegesoftware für Dienstplan und Abrechnung", aliase: ["medifox", "medifox dan"], branchen: ["pflege"] },
  { key: "sw_vivendi", name: "Vivendi", kategorie: "branche", zweck: "Software für Pflege und Eingliederungshilfe", aliase: ["vivendi", "connext"], branchen: ["pflege"] },
  { key: "sw_snap", name: "Snap", kategorie: "branche", zweck: "Pflegedokumentation und Tourenplanung", aliase: ["snap ambulant"], branchen: ["pflege"] },
  { key: "sw_medatixx", name: "medatixx", kategorie: "branche", zweck: "Praxissoftware für Arztpraxen", aliase: ["medatixx", "x.concept"], branchen: ["gesundheit"] },
  { key: "sw_cgm", name: "CompuGroup Medical", kategorie: "branche", zweck: "Praxis- und Apothekensoftware", aliase: ["cgm", "compugroup", "turbomed", "albis"], branchen: ["gesundheit"] },
  { key: "sw_dampsoft", name: "Dampsoft", kategorie: "branche", zweck: "Zahnarztsoftware", aliase: ["dampsoft", "ds win"], branchen: ["gesundheit"] },
  { key: "sw_charly", name: "charly by solutio", kategorie: "branche", zweck: "Zahnarztsoftware", aliase: ["charly", "solutio"], branchen: ["gesundheit"] },
  { key: "sw_theorg", name: "THEORG", kategorie: "branche", zweck: "Software für Therapiepraxen", aliase: ["theorg"], branchen: ["gesundheit"] },
  { key: "sw_doctolib", name: "Doctolib", kategorie: "branche", zweck: "Terminbuchung für Praxen", aliase: ["doctolib"], branchen: ["gesundheit"] },

  // ── Branchensoftware: Gastronomie, Hotel, Handel ─────────────────────────
  { key: "sw_gastrofix", name: "Lightspeed K-Series", kategorie: "branche", zweck: "Kassensystem in der Gastronomie", aliase: ["gastrofix", "lightspeed", "k series"], branchen: ["gastronomie"] },
  { key: "sw_orderbird", name: "orderbird", kategorie: "branche", zweck: "Kassensystem für Gastronomie", aliase: ["orderbird", "order bird"], branchen: ["gastronomie"] },
  { key: "sw_vectron", name: "Vectron", kategorie: "branche", zweck: "Kassensystem für Gastronomie und Handel", aliase: ["vectron"], branchen: ["gastronomie", "handel"] },
  { key: "sw_protel", name: "protel", kategorie: "branche", zweck: "Hotelsoftware für Belegung und Abrechnung", aliase: ["protel"], branchen: ["hotel"] },
  { key: "sw_apaleo", name: "apaleo", kategorie: "branche", zweck: "Hotelsoftware im Browser", aliase: ["apaleo"], branchen: ["hotel"] },
  { key: "sw_fidelio", name: "Oracle Opera", kategorie: "branche", zweck: "Hotelsoftware", aliase: ["fidelio", "opera", "oracle opera"], branchen: ["hotel"] },
  { key: "sw_sumup", name: "SumUp", kategorie: "branche", zweck: "Kartenzahlung und kleine Kasse", aliase: ["sumup", "sum up"], branchen: ["handel", "gastronomie"] },
  { key: "sw_lexware_kasse", name: "Lexware Kasse", kategorie: "branche", zweck: "Kassensystem im Handel", aliase: ["lexware kasse"], branchen: ["handel"] },

  // ── Branchensoftware: Logistik, Werkstatt, Immobilien ────────────────────
  { key: "sw_timocom", name: "TIMOCOM", kategorie: "branche", zweck: "Frachtenbörse und Transportvergabe", aliase: ["timocom"], branchen: ["logistik"] },
  { key: "sw_transporeon", name: "Transporeon", kategorie: "branche", zweck: "Transportvergabe und Zeitfenster", aliase: ["transporeon"], branchen: ["logistik"] },
  { key: "sw_soloplan", name: "Soloplan CarLo", kategorie: "branche", zweck: "Speditionssoftware für Disposition und Abrechnung", aliase: ["soloplan", "carlo"], branchen: ["logistik"] },
  { key: "sw_wanko", name: "WANKO", kategorie: "branche", zweck: "Tourenplanung und Lager", aliase: ["wanko"], branchen: ["logistik"] },
  { key: "sw_werbas", name: "WERBAS", kategorie: "branche", zweck: "Werkstattsoftware für Aufträge und Teile", aliase: ["werbas"], branchen: ["kfz"] },
  { key: "sw_tecalliance", name: "TecAlliance", kategorie: "branche", zweck: "Teiledaten und Bestellung in der Kfz-Branche", aliase: ["tecalliance", "tecdoc"], branchen: ["kfz"] },
  { key: "sw_vaudis", name: "VAUDIS", kategorie: "branche", zweck: "Autohaussoftware", aliase: ["vaudis"], branchen: ["kfz"] },
  { key: "sw_haufe_powerhaus", name: "Haufe PowerHaus", kategorie: "branche", zweck: "Hausverwaltungssoftware", aliase: ["powerhaus", "haufe powerhaus"], branchen: ["immobilien"] },
  { key: "sw_domus", name: "DOMUS", kategorie: "branche", zweck: "Immobilienverwaltung", aliase: ["domus", "domus 4000"], branchen: ["immobilien"] },
  { key: "sw_onoffice", name: "onOffice", kategorie: "branche", zweck: "Maklersoftware", aliase: ["onoffice", "on office"], branchen: ["immobilien"] },
  { key: "sw_flowfact", name: "FLOWFACT", kategorie: "branche", zweck: "Maklersoftware", aliase: ["flowfact"], branchen: ["immobilien"] },
  { key: "sw_lexware_vereine", name: "Vereinssoftware", kategorie: "branche", zweck: "Mitglieder und Beiträge verwalten", aliase: ["vereinssoftware", "s-verein", "easyverein"] },

  // ── Personal ─────────────────────────────────────────────────────────────
  { key: "sw_personio", name: "Personio", kategorie: "personal", zweck: "Personalverwaltung, Bewerbungen und Abwesenheiten", aliase: ["personio"] },
  { key: "sw_haufe_hr", name: "Haufe HR", kategorie: "personal", zweck: "Personalsoftware und Lohnvorbereitung", aliase: ["haufe hr", "haufe zeugnis"] },
  { key: "sw_rexx", name: "rexx systems", kategorie: "personal", zweck: "Bewerbermanagement und Personalakte", aliase: ["rexx", "rexx systems"] },
  { key: "sw_softgarden", name: "softgarden", kategorie: "personal", zweck: "Stellenausschreibung und Bewerbungen", aliase: ["softgarden"] },
  { key: "sw_successfactors", name: "SAP SuccessFactors", kategorie: "personal", zweck: "Personalprozesse im Konzernmaßstab", aliase: ["successfactors", "success factors"] },
  { key: "sw_workday", name: "Workday", kategorie: "personal", zweck: "Personal- und Finanzprozesse", aliase: ["workday"] },
  { key: "sw_kenjo", name: "Kenjo", kategorie: "personal", zweck: "Personalverwaltung für kleinere Betriebe", aliase: ["kenjo"] },
  { key: "sw_lohnabrechnung_stb", name: "Lohnabrechnung über den Steuerberater", kategorie: "personal", zweck: "Lohn läuft außer Haus beim Steuerbüro", aliase: ["steuerberater lohn", "lohnbuero", "lohnbüro"] },

  // ── Zeiterfassung und Planung ────────────────────────────────────────────
  { key: "sw_clockodo", name: "clockodo", kategorie: "zeit", zweck: "Zeiterfassung und Projektzeiten", aliase: ["clockodo"] },
  { key: "sw_timetac", name: "TimeTac", kategorie: "zeit", zweck: "Zeiterfassung und Urlaubsplanung", aliase: ["timetac", "time tac"] },
  { key: "sw_zep", name: "ZEP", kategorie: "zeit", zweck: "Projektzeiterfassung", aliase: ["zep"] },
  { key: "sw_papershift", name: "Papershift", kategorie: "zeit", zweck: "Dienstplanung und Zeiterfassung", aliase: ["papershift", "paper shift"] },
  { key: "sw_crewmeister", name: "Crewmeister", kategorie: "zeit", zweck: "Zeiterfassung für kleine Betriebe", aliase: ["crewmeister"] },
  { key: "sw_shiftjuggler", name: "ShiftJuggler", kategorie: "zeit", zweck: "Dienstplanung", aliase: ["shiftjuggler"] },
  { key: "sw_planday", name: "Planday", kategorie: "zeit", zweck: "Dienstplanung im Schichtbetrieb", aliase: ["planday"] },
  { key: "sw_zeiterfassung_stempel", name: "Stempeluhr oder Terminal", kategorie: "zeit", zweck: "Zeiterfassung am Gerät statt in Software", aliase: ["stempeluhr", "zeiterfassungsterminal", "terminal"] },

  // ── Kommunikation ────────────────────────────────────────────────────────
  { key: "sw_teams", name: "Microsoft Teams", kategorie: "kommunikation", zweck: "Besprechungen, Chat und Dateien", aliase: ["teams", "ms teams"] },
  { key: "sw_slack", name: "Slack", kategorie: "kommunikation", zweck: "Chat in Kanälen", aliase: ["slack"] },
  { key: "sw_zoom", name: "Zoom", kategorie: "kommunikation", zweck: "Videobesprechungen", aliase: ["zoom"] },
  { key: "sw_webex", name: "Cisco Webex", kategorie: "kommunikation", zweck: "Videobesprechungen", aliase: ["webex"] },
  { key: "sw_gmeet", name: "Google Meet", kategorie: "kommunikation", zweck: "Videobesprechungen", aliase: ["google meet", "meet"] },
  { key: "sw_whatsapp", name: "WhatsApp Business", kategorie: "kommunikation", zweck: "Kundenkontakt über Nachrichten", aliase: ["whatsapp", "whats app"] },
  { key: "sw_3cx", name: "3CX", kategorie: "kommunikation", zweck: "Telefonanlage", aliase: ["3cx"] },
  { key: "sw_placetel", name: "Placetel", kategorie: "kommunikation", zweck: "Telefonanlage im Browser", aliase: ["placetel"] },
  { key: "sw_sipgate", name: "sipgate", kategorie: "kommunikation", zweck: "Telefonie über das Internet", aliase: ["sipgate"] },
  { key: "sw_telekom_cloudpbx", name: "Telekom CompanyFlex", kategorie: "kommunikation", zweck: "Telefonanlage des Anbieters", aliase: ["companyflex", "telekom cloud pbx"] },

  // ── Projekte und Aufgaben ────────────────────────────────────────────────
  { key: "sw_asana", name: "Asana", kategorie: "projekt", zweck: "Aufgaben und Projekte", aliase: ["asana"] },
  { key: "sw_trello", name: "Trello", kategorie: "projekt", zweck: "Aufgaben als Tafel", aliase: ["trello"] },
  { key: "sw_monday", name: "monday.com", kategorie: "projekt", zweck: "Projekte und Abläufe", aliase: ["monday", "monday.com"] },
  { key: "sw_jira", name: "Jira", kategorie: "projekt", zweck: "Aufgaben in der Softwareentwicklung", aliase: ["jira", "atlassian"] },
  { key: "sw_confluence", name: "Confluence", kategorie: "projekt", zweck: "Wissen und Dokumentation", aliase: ["confluence"] },
  { key: "sw_notion", name: "Notion", kategorie: "projekt", zweck: "Notizen, Wissen und leichte Datenbanken", aliase: ["notion"] },
  { key: "sw_clickup", name: "ClickUp", kategorie: "projekt", zweck: "Aufgaben und Projekte", aliase: ["clickup", "click up"] },
  { key: "sw_awork", name: "awork", kategorie: "projekt", zweck: "Projekte und Zeiten", aliase: ["awork"] },
  { key: "sw_factro", name: "factro", kategorie: "projekt", zweck: "Projekt- und Aufgabenverwaltung", aliase: ["factro"] },
  { key: "sw_msproject", name: "Microsoft Project", kategorie: "projekt", zweck: "Terminpläne und Ressourcen", aliase: ["ms project", "microsoft project"] },
  { key: "sw_smartsheet", name: "Smartsheet", kategorie: "projekt", zweck: "Projekte in Tabellenform", aliase: ["smartsheet"] },
  { key: "sw_planner", name: "Microsoft Planner", kategorie: "projekt", zweck: "Einfache Aufgabenlisten in Microsoft 365", aliase: ["planner", "ms planner"] },

  // ── Dateien und Dokumente ────────────────────────────────────────────────
  { key: "sw_sharepoint", name: "SharePoint", kategorie: "ablage", zweck: "Dateiablage und Intranet", aliase: ["sharepoint", "share point"] },
  { key: "sw_onedrive", name: "OneDrive", kategorie: "ablage", zweck: "Dateien in der Cloud", aliase: ["onedrive", "one drive"] },
  { key: "sw_gdrive", name: "Google Drive", kategorie: "ablage", zweck: "Dateien in der Cloud", aliase: ["google drive", "gdrive"] },
  { key: "sw_dropbox", name: "Dropbox", kategorie: "ablage", zweck: "Dateien in der Cloud", aliase: ["dropbox", "drop box"] },
  { key: "sw_nextcloud", name: "Nextcloud", kategorie: "ablage", zweck: "Eigene Dateiwolke auf eigenem Server", aliase: ["nextcloud", "owncloud"] },
  { key: "sw_netzlaufwerk", name: "Netzlaufwerk oder Server im Haus", kategorie: "ablage", zweck: "Dateien auf einem Laufwerk im Betrieb", aliase: ["netzlaufwerk", "fileserver", "server im haus", "nas"] },
  { key: "sw_docuware", name: "DocuWare", kategorie: "ablage", zweck: "Dokumentenverwaltung und Archiv", aliase: ["docuware", "docu ware"] },
  { key: "sw_elo", name: "ELO", kategorie: "ablage", zweck: "Dokumentenverwaltung", aliase: ["elo", "elo office"] },
  { key: "sw_dvelop", name: "d.velop", kategorie: "ablage", zweck: "Dokumentenverwaltung und Archivierung", aliase: ["d.velop", "dvelop", "d3"] },
  { key: "sw_dracoon", name: "DRACOON", kategorie: "ablage", zweck: "Dateiaustausch mit Schutzbedarf", aliase: ["dracoon"] },
  { key: "sw_papierablage", name: "Papierordner", kategorie: "ablage", zweck: "Unterlagen im Ordner statt in einem System", aliase: ["papier", "ordner", "aktenordner", "papierakte"] },

  // ── Automatisierung ──────────────────────────────────────────────────────
  { key: "sw_make", name: "Make", kategorie: "automatisierung", zweck: "Programme miteinander verbinden, ohne zu programmieren", aliase: ["make", "integromat"] },
  { key: "sw_zapier", name: "Zapier", kategorie: "automatisierung", zweck: "Programme miteinander verbinden", aliase: ["zapier"] },
  { key: "sw_n8n", name: "n8n", kategorie: "automatisierung", zweck: "Abläufe verbinden, auch auf eigenem Server", aliase: ["n8n"] },
  { key: "sw_powerautomate", name: "Power Automate", kategorie: "automatisierung", zweck: "Abläufe in Microsoft 365 automatisieren", aliase: ["power automate", "flow", "ms flow"] },
  { key: "sw_powerbi", name: "Power BI", kategorie: "automatisierung", zweck: "Zahlen aus mehreren Quellen auswerten", aliase: ["power bi", "powerbi"] },
  { key: "sw_chatgpt", name: "ChatGPT", kategorie: "automatisierung", zweck: "Texte und Entwürfe mit KI", aliase: ["chatgpt", "chat gpt", "openai"] },
  { key: "sw_copilot", name: "Microsoft Copilot", kategorie: "automatisierung", zweck: "KI-Assistent in Microsoft 365", aliase: ["copilot", "ms copilot"] },
  { key: "sw_claude", name: "Claude", kategorie: "automatisierung", zweck: "Texte, Auswertungen und Entwürfe mit KI", aliase: ["claude", "anthropic"] },

  // ── Shop und Versand ─────────────────────────────────────────────────────
  { key: "sw_shopify", name: "Shopify", kategorie: "shop", zweck: "Onlineshop", aliase: ["shopify"] },
  { key: "sw_shopware", name: "Shopware", kategorie: "shop", zweck: "Onlineshop", aliase: ["shopware", "shop ware"] },
  { key: "sw_woocommerce", name: "WooCommerce", kategorie: "shop", zweck: "Onlineshop auf WordPress", aliase: ["woocommerce", "woo"] },
  { key: "sw_magento", name: "Adobe Commerce", kategorie: "shop", zweck: "Onlineshop", aliase: ["magento", "adobe commerce"] },
  { key: "sw_amazon_seller", name: "Amazon Seller Central", kategorie: "shop", zweck: "Verkauf über den Marktplatz", aliase: ["amazon", "seller central", "fba"] },
  { key: "sw_ebay", name: "eBay", kategorie: "shop", zweck: "Verkauf über den Marktplatz", aliase: ["ebay", "ebay kleinanzeigen"] },
  { key: "sw_billbee", name: "Billbee", kategorie: "shop", zweck: "Bestellungen aus mehreren Kanälen bündeln", aliase: ["billbee"] },
  { key: "sw_afterbuy", name: "Afterbuy", kategorie: "shop", zweck: "Marktplatzverwaltung und Versand", aliase: ["afterbuy"] },
  { key: "sw_dhl", name: "DHL Geschäftskundenportal", kategorie: "shop", zweck: "Versandscheine und Sendungsverfolgung", aliase: ["dhl", "dhl portal"] },
  { key: "sw_dpd", name: "DPD", kategorie: "shop", zweck: "Versand und Sendungsverfolgung", aliase: ["dpd"] },
  { key: "sw_stripe", name: "Stripe", kategorie: "shop", zweck: "Zahlungen abwickeln", aliase: ["stripe"] },
  { key: "sw_paypal", name: "PayPal", kategorie: "shop", zweck: "Zahlungen abwickeln", aliase: ["paypal", "pay pal"] },
  { key: "sw_klarna", name: "Klarna", kategorie: "shop", zweck: "Zahlungen und Ratenkauf", aliase: ["klarna"] },

  // ── Technik und Konstruktion ─────────────────────────────────────────────
  { key: "sw_autocad", name: "AutoCAD", kategorie: "technik", zweck: "Technische Zeichnungen", aliase: ["autocad", "auto cad"] },
  { key: "sw_solidworks", name: "SOLIDWORKS", kategorie: "technik", zweck: "Konstruktion in 3D", aliase: ["solidworks", "solid works"] },
  { key: "sw_inventor", name: "Autodesk Inventor", kategorie: "technik", zweck: "Konstruktion in 3D", aliase: ["inventor"] },
  { key: "sw_allplan", name: "Allplan", kategorie: "technik", zweck: "Bauplanung und Konstruktion", aliase: ["allplan", "nemetschek"], branchen: ["bau", "planung"] },
  { key: "sw_archicad", name: "Archicad", kategorie: "technik", zweck: "Gebäudeplanung", aliase: ["archicad"], branchen: ["bau", "planung"] },
  { key: "sw_revit", name: "Autodesk Revit", kategorie: "technik", zweck: "Gebäudemodellierung", aliase: ["revit"], branchen: ["bau", "planung"] },
  { key: "sw_sketchup", name: "SketchUp", kategorie: "technik", zweck: "Entwürfe in 3D", aliase: ["sketchup", "sketch up"] },
  { key: "sw_adobe", name: "Adobe Creative Cloud", kategorie: "technik", zweck: "Gestaltung, Bild und Satz", aliase: ["adobe", "photoshop", "indesign", "illustrator"] },
  { key: "sw_canva", name: "Canva", kategorie: "technik", zweck: "Gestaltung ohne Vorkenntnisse", aliase: ["canva"] },
  { key: "sw_teamviewer", name: "TeamViewer", kategorie: "technik", zweck: "Fernwartung", aliase: ["teamviewer", "team viewer", "anydesk"] },
  { key: "sw_veeam", name: "Veeam", kategorie: "technik", zweck: "Datensicherung", aliase: ["veeam"] },
  { key: "sw_acronis", name: "Acronis", kategorie: "technik", zweck: "Datensicherung", aliase: ["acronis"] },
  { key: "sw_sophos", name: "Sophos", kategorie: "technik", zweck: "Virenschutz und Firewall", aliase: ["sophos"] },
  { key: "sw_eset", name: "ESET", kategorie: "technik", zweck: "Virenschutz", aliase: ["eset"] },
  { key: "sw_wordpress", name: "WordPress", kategorie: "technik", zweck: "Internetauftritt pflegen", aliase: ["wordpress", "word press"] },
  { key: "sw_typo3", name: "TYPO3", kategorie: "technik", zweck: "Internetauftritt pflegen", aliase: ["typo3", "typo 3"] },
];

/** Wie viele Einträge der Katalog kennt — für die Oberfläche und für Tests. */
export const SOFTWARE_ANZAHL = SOFTWARE.length;

/**
 * Vergleichsform eines Namens.
 *
 * Betriebe schreiben „MS-Office", „ms office" und „Microsoft Office" für
 * dasselbe. Punkte, Bindestriche und Leerzeichen fallen weg, damit das alles
 * zusammenfindet.
 */
export function normalisiere(name: string): string {
  return name
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9+]/g, "");
}

const NACH_FORM = new Map<string, SoftwareEintrag>();
for (const eintrag of SOFTWARE) {
  for (const schreibweise of [eintrag.name, ...(eintrag.aliase ?? [])]) {
    const form = normalisiere(schreibweise);
    if (!NACH_FORM.has(form)) NACH_FORM.set(form, eintrag);
  }
}

/** Findet den Katalogeintrag zu einer Eingabe — oder nichts. */
export function findeSoftware(eingabe: string): SoftwareEintrag | null {
  const form = normalisiere(eingabe);
  if (!form) return null;
  return NACH_FORM.get(form) ?? null;
}

export function softwareNachKey(key: string): SoftwareEintrag | null {
  return SOFTWARE.find((s) => s.key === key) ?? null;
}

/**
 * Vorschläge zu einer Eingabe.
 *
 * Zuerst, was vorn übereinstimmt („outl" → Outlook), danach, was die Eingabe
 * irgendwo enthält („mail" → Gmail, Apple Mail). Innerhalb beider Gruppen
 * alphabetisch, damit dieselbe Eingabe immer dieselbe Liste ergibt — eine
 * Reihenfolge, die sich bei jedem Tastendruck umsortiert, ist nicht zu treffen.
 */
export function schlageSoftwareVor(eingabe: string, grenze = 8): SoftwareEintrag[] {
  const form = normalisiere(eingabe);
  if (form.length < 2) return [];

  const vorn: SoftwareEintrag[] = [];
  const drin: SoftwareEintrag[] = [];

  for (const eintrag of SOFTWARE) {
    const formen = [eintrag.name, ...(eintrag.aliase ?? [])].map(normalisiere);
    if (formen.some((f) => f.startsWith(form))) vorn.push(eintrag);
    else if (formen.some((f) => f.includes(form))) drin.push(eintrag);
  }

  const sortiert = (liste: SoftwareEintrag[]) =>
    [...liste].sort((a, b) => a.name.localeCompare(b.name, "de"));

  return [...sortiert(vorn), ...sortiert(drin)].slice(0, grenze);
}
