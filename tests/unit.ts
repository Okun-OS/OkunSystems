/**
 * Unit-Tests der Rechen- und Template-Kerne.
 * Ausführen mit: npx tsx tests/unit.ts
 */
import assert from "node:assert/strict";
import {
  roundCents,
  multiplyQuantity,
  applyDiscountBp,
  vatFromNet,
  parseAmountToCents,
  parseQuantityToMilli,
  parseVatRateToBp,
} from "../src/lib/money";
import {
  renderTemplate,
  extractPlaceholders,
  escapeHtml,
} from "../src/lib/documents/template-engine";
import { renderPlaceholders } from "../src/lib/closing/scripts";
import {
  normalizeStatus,
  canTransition,
  forwardPath,
  allowedTransitions,
} from "../src/lib/closing/state-machine";
import {
  validateMasterData,
  MASTER_DATA_FIELDS,
  REGISTERED_LEGAL_FORMS,
  type ResolvedRequirement,
} from "../src/lib/closing/master-data";
import { calculateInvoiceTotals } from "../src/lib/invoicing/calc";
import {
  berlinStundeVon,
  berlinTagesgrenzen,
  berlinWochentagVon,
  berlinZeitpunkt,
  formatiereBerlin,
} from "../src/lib/zeit";
import { canAccessAdminPath, homeFor } from "../src/lib/closing/role-access";
import {
  angebotAufDerBuehne,
  kannGezeigtWerden,
  knopfBeschriftung,
} from "../src/lib/closing/angebot-sicht";
import { sha256Canonical } from "../src/lib/documents/hash";
import {
  aggregateSignals,
  aggregateSolutionRefs,
  matchSolutions,
} from "../src/lib/blueprint/recommendation-engine";
import type {
  EvaluatedQuestion,
  SolutionInput,
} from "../src/lib/blueprint/types";
import {
  analyseFlow,
  analyseSystems,
  evaluatePillar3,
  minutesPerMonth,
  selectFlows,
  summariseFlows,
  summariseTasks,
  type FlowRecord,
  type SystemRecord,
  type TaskRecord,
} from "../src/lib/blueprint/pillar3-engine";
import {
  DURATION_BANDS,
  FREQUENCY_BANDS,
  MAX_TASKS,
  PURPOSES,
  STATIONS,
  TASK_CATALOG,
  flowByKey,
} from "../src/lib/blueprint/pillar3-catalog";
import { careKontakt, mailtoLink, whatsappLink } from "../src/lib/care/kontakt";
import { careArtLabel, istCareArt } from "../src/lib/care/katalog";
import {
  leseKosten,
  istBindung,
  istZufriedenheit,
  MAX_KOSTEN_PRO_MONAT,
} from "../src/lib/blueprint/pillar3-catalog";
import { summiereKosten } from "../src/lib/blueprint/pillar3-engine";
import { anweisung, lage, type Kontext } from "../src/lib/vorbereitung/kontext";
import { WERKZEUGE } from "../src/lib/vorbereitung/werkzeuge";
import {
  legeSchabloneAn,
  ersparnis,
  workforceImPaket,
  WORKFORCE_ZWECKE,
  type Programm,
} from "../src/lib/grundlagen/schablone";
import {
  auftragsPosten,
  istMeilensteinZustand,
  projektFortschritt,
  projektStatus,
  zustandLabel,
  type AuftragsPosten,
} from "../src/lib/projekt/auftrag";
import {
  baueCheckliste,
  fortschritt,
  naechsterSchritt,
  ONBOARDING_SCHRITTE,
  type OnboardingStand,
} from "../src/lib/onboarding/checkliste";

let passed = 0;
function test(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
}

console.log("\nmoney");
test("roundCents rundet kaufmännisch, auch negativ", () => {
  assert.equal(roundCents(0.5), 1);
  assert.equal(roundCents(1.4999), 1);
  assert.equal(roundCents(-0.5), -1);
  assert.equal(roundCents(2.5), 3);
});
test("multiplyQuantity ist frei von Floating-Point-Drift", () => {
  // 0,1 × 3 × 1000 Cent → klassischer Float-Fehlerfall
  assert.equal(multiplyQuantity(1000, 300), 300);
  assert.equal(multiplyQuantity(3333, 3000), 9999);
  assert.equal(multiplyQuantity(12345, 1500), 18518); // 123,45 × 1,5 = 185,175 → 185,18
});
test("vatFromNet rechnet in Basispunkten", () => {
  assert.equal(vatFromNet(100000, 1900), 19000);
  assert.equal(vatFromNet(999, 1900), 190); // 1,8981 → 1,90
  assert.equal(vatFromNet(100000, 700), 7000);
});
test("applyDiscountBp", () => {
  assert.equal(applyDiscountBp(100000, 1000), 90000);
  assert.equal(applyDiscountBp(999, 1000), 899);
  assert.throws(() => applyDiscountBp(1000, 20000));
});
test("parseAmountToCents akzeptiert deutsche und englische Schreibweise", () => {
  assert.equal(parseAmountToCents("1.234,56"), 123456);
  assert.equal(parseAmountToCents("1234.56"), 123456);
  assert.equal(parseAmountToCents("1234"), 123400);
  assert.equal(parseAmountToCents("12,5"), 1250);
  assert.equal(parseAmountToCents("0,005"), 1); // aufrunden auf 1 Cent
  assert.equal(parseAmountToCents("-49,99"), -4999);
  assert.equal(parseAmountToCents("abc"), null);
  assert.equal(parseAmountToCents(""), null);
});
test("parseQuantityToMilli", () => {
  assert.equal(parseQuantityToMilli("1,5"), 1500);
  assert.equal(parseQuantityToMilli("2"), 2000);
  assert.equal(parseQuantityToMilli("0,125"), 125);
  assert.equal(parseQuantityToMilli("x"), null);
});
test("parseVatRateToBp", () => {
  assert.equal(parseVatRateToBp("19"), 1900);
  assert.equal(parseVatRateToBp("7,5"), 750);
  assert.equal(parseVatRateToBp("0"), 0);
  assert.equal(parseVatRateToBp("120"), null);
});

console.log("\ninvoice calculation");
test("Summen werden serverseitig exakt berechnet", () => {
  const result = calculateInvoiceTotals({
    vatMode: "standard",
    defaultVatRateBp: 1900,
    items: [
      { description: "Paket", quantityMilli: 1000, unitPriceCents: 1250000, vatRateBp: 1900, discountBp: 0 },
      { description: "Workshop", quantityMilli: 2500, unitPriceCents: 48000, vatRateBp: 1900, discountBp: 0 },
      { description: "Care", quantityMilli: 12000, unitPriceCents: 29900, vatRateBp: 700, discountBp: 0 },
    ],
  });
  assert.equal(result.items[0].netAmountCents, 1250000);
  assert.equal(result.items[1].netAmountCents, 120000); // 480,00 × 2,5
  assert.equal(result.items[2].netAmountCents, 358800); // 299,00 × 12
  assert.equal(result.netTotalCents, 1250000 + 120000 + 358800);
  assert.equal(result.items[0].vatAmountCents, 237500);
  assert.equal(result.items[2].vatAmountCents, 25116);
  assert.equal(
    result.vatTotalCents,
    result.items.reduce((sum, i) => sum + i.vatAmountCents, 0)
  );
  assert.equal(result.grossTotalCents, result.netTotalCents + result.vatTotalCents);
  assert.equal(result.vatBreakdown.length, 2);
});
test("beliebig viele Positionen – genau eine bleibt genau eine", () => {
  const one = calculateInvoiceTotals({
    vatMode: "standard",
    defaultVatRateBp: 1900,
    items: [{ description: "A", quantityMilli: 1000, unitPriceCents: 100, vatRateBp: 1900, discountBp: 0 }],
  });
  assert.equal(one.items.length, 1);
  const ten = calculateInvoiceTotals({
    vatMode: "standard",
    defaultVatRateBp: 1900,
    items: Array.from({ length: 10 }, (_, i) => ({
      description: `Pos ${i + 1}`,
      quantityMilli: 1000,
      unitPriceCents: 1000,
      vatRateBp: 1900,
      discountBp: 0,
    })),
  });
  assert.equal(ten.items.length, 10);
  assert.equal(ten.netTotalCents, 10000);
  assert.equal(ten.items[9].position, 10);
});
test("reverse_charge erzeugt keinen Steuerbetrag", () => {
  const result = calculateInvoiceTotals({
    vatMode: "reverse_charge",
    defaultVatRateBp: 1900,
    items: [{ description: "A", quantityMilli: 1000, unitPriceCents: 100000, vatRateBp: 1900, discountBp: 0 }],
  });
  assert.equal(result.vatTotalCents, 0);
  assert.equal(result.grossTotalCents, 100000);
});
test("leere Positionen werden abgewiesen", () => {
  assert.throws(() =>
    calculateInvoiceTotals({ vatMode: "standard", defaultVatRateBp: 1900, items: [] })
  );
});

console.log("\ntemplate engine");
test("einfache Platzhalter werden escaped", () => {
  const out = renderTemplate("Hallo {{customer.name}}", {
    customer: { name: '<script>alert("x")</script>' },
  });
  assert.equal(out, "Hallo &lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;");
});
test("{{#each}} erzeugt echte Wiederholung", () => {
  const out = renderTemplate(
    "{{#each invoice.items}}<tr><td>{{@number}}</td><td>{{description}}</td><td>{{net}}</td></tr>{{/each}}",
    { invoice: { items: [{ description: "A", net: "1,00" }, { description: "B", net: "2,00" }] } }
  );
  assert.equal(
    out,
    "<tr><td>1</td><td>A</td><td>1,00</td></tr><tr><td>2</td><td>B</td><td>2,00</td></tr>"
  );
});
test("{{#each}} sieht den äußeren Kontext", () => {
  const out = renderTemplate("{{#each items}}{{currency}}{{amount}} {{/each}}", {
    currency: "€",
    items: [{ amount: "1" }, { amount: "2" }],
  });
  assert.equal(out, "€1 €2 ");
});
test("{{#if}}/{{else}}", () => {
  const tpl = "{{#if customer.vatId}}USt-IdNr.: {{customer.vatId}}{{else}}—{{/if}}";
  assert.equal(renderTemplate(tpl, { customer: { vatId: "DE123" } }), "USt-IdNr.: DE123");
  assert.equal(renderTemplate(tpl, { customer: { vatId: null } }), "—");
});
test("dreifache Klammern rendern rohes HTML", () => {
  assert.equal(renderTemplate("{{{block}}}", { block: "<b>x</b>" }), "<b>x</b>");
});
test("fehlende Platzhalter werden gemeldet, nicht geraten", () => {
  const missing: string[] = [];
  const out = renderTemplate("{{a}}|{{b.c}}", { a: "x" }, { collectMissing: missing, missingValue: "—" });
  assert.equal(out, "x|—");
  assert.deepEqual(missing, ["b.c"]);
});
test("extractPlaceholders findet alle Pfade", () => {
  const found = extractPlaceholders(
    "{{invoice.number}}{{#each invoice.items}}{{description}}{{/each}}{{#if x}}{{y}}{{/if}}"
  );
  assert.ok(found.includes("invoice.number"));
  assert.ok(found.includes("invoice.items"));
  assert.ok(found.includes("y"));
});
test("escapeHtml", () => {
  assert.equal(escapeHtml("a&b<c>"), "a&amp;b&lt;c&gt;");
});

console.log("\nclosing scripts");
test("Script-Platzhalter werden mit echten Vertragsdaten gefüllt", () => {
  const { text, unresolved } = renderPlaceholders(
    "Sie haben sich für {{package_name}} zu einer einmaligen Investition von {{one_time_price_net}} € netto entschieden.",
    { package_name: "OKUN Foundation", one_time_price_net: "12.500,00" }
  );
  assert.equal(
    text,
    "Sie haben sich für OKUN Foundation zu einer einmaligen Investition von 12.500,00 € netto entschieden."
  );
  assert.deepEqual(unresolved, []);
});
test("fehlende Script-Platzhalter bleiben sichtbar stehen", () => {
  const { text, unresolved } = renderPlaceholders("{{package_name}} / {{minimum_term}}", {
    package_name: "OKUN Operations",
  });
  assert.equal(text, "OKUN Operations / {{minimum_term}}");
  assert.deepEqual(unresolved, ["minimum_term"]);
});

console.log("\nstate machine");
test("Legacy-Status werden normalisiert", () => {
  assert.equal(normalizeStatus("in_progress"), "closing_in_progress");
  assert.equal(normalizeStatus("consent_given"), "consents_confirmed");
  assert.equal(normalizeStatus("verloren"), "lost");
  assert.equal(normalizeStatus(null), "lead");
});
test("nur erlaubte Übergänge", () => {
  assert.ok(canTransition("consent_pending", "consents_confirmed"));
  assert.ok(!canTransition("lead", "paid"));
  assert.ok(!canTransition("consents_confirmed", "customer_activated"));
  assert.ok(canTransition("payment_pending", "paid"));
  assert.ok(canTransition("paid", "customer_activated"));
});
test("lost/cancelled sind aus laufenden Status erreichbar", () => {
  assert.ok(allowedTransitions("offer_presented").includes("lost"));
  assert.ok(allowedTransitions("offer_presented").includes("cancelled"));
  assert.ok(!allowedTransitions("customer_activated").includes("lost"));
});
test("forwardPath findet mehrstufige Wege", () => {
  assert.deepEqual(forwardPath("offer_presented", "consent_pending"), [
    "agreement_reached",
    "consent_pending",
  ]);
  assert.deepEqual(forwardPath("paid", "paid"), []);
  assert.equal(forwardPath("customer_activated", "lead"), null);
});

console.log("\nmaster data");
const requirements: ResolvedRequirement[] = MASTER_DATA_FIELDS.map((f, i) => ({
  ...f,
  isRequired: f.defaultRequired,
  legalForms: f.defaultLegalForms,
  isActive: true,
  displayOrder: i,
}));
test("GmbH benötigt Registerangaben", () => {
  const result = validateMasterData(
    {
      name: "Muster GmbH",
      legalForm: "gmbh",
      street: "Hauptstr.",
      houseNumber: "1",
      postalCode: "10115",
      city: "Berlin",
      country: "Deutschland",
      contactFirstName: "Max",
      contactLastName: "Muster",
      contactPosition: "Geschäftsführer",
      contactEmail: "max@muster.de",
    },
    requirements
  );
  assert.equal(result.complete, false);
  assert.deepEqual(
    result.missing.map((m) => m.key).sort(),
    ["registerCourt", "registerNumber"]
  );
});
test("eine Rechtsform als Etikett statt als Schlüssel fällt auf", () => {
  /*
    Im Katalog steht `gmbh`, angezeigt wird „GmbH". Landet das Etikett im
    Feld, greift keine rechtsformabhängige Regel mehr: Registergericht und
    -nummer werden stillschweigend nicht verlangt, und der Vertrag entsteht
    ohne sie. Dieser Test hält fest, dass das kein Zufall sein darf.
  */
  const basis = {
    name: "Muster GmbH",
    street: "Hauptstr.",
    houseNumber: "1",
    postalCode: "10115",
    city: "Berlin",
    country: "Deutschland",
    contactFirstName: "Max",
    contactLastName: "Muster",
    contactPosition: "Geschäftsführer",
    contactEmail: "max@muster.de",
  };

  const mitSchluessel = validateMasterData({ ...basis, legalForm: "gmbh" }, requirements);
  assert.deepEqual(mitSchluessel.missing.map((m) => m.key).sort(), [
    "registerCourt",
    "registerNumber",
  ]);

  const mitEtikett = validateMasterData({ ...basis, legalForm: "GmbH" }, requirements);
  assert.equal(
    mitEtikett.missing.length,
    0,
    "ein Etikett im Feld lässt die Registerangaben durchrutschen"
  );
  assert.ok(
    !REGISTERED_LEGAL_FORMS.includes("GmbH"),
    "der Katalog kennt nur Schlüssel in Kleinschreibung"
  );
});

test("Einzelunternehmen benötigt keine Registerangaben", () => {
  const result = validateMasterData(
    {
      name: "Max Muster",
      legalForm: "einzelunternehmen",
      street: "Hauptstr.",
      houseNumber: "1",
      postalCode: "10115",
      city: "Berlin",
      country: "Deutschland",
      contactFirstName: "Max",
      contactLastName: "Muster",
      contactPosition: "Inhaber",
      contactEmail: "max@muster.de",
    },
    requirements
  );
  assert.equal(result.complete, true, JSON.stringify(result.missing));
});
test("abweichende Rechnungsanschrift wird nur dann eingefordert", () => {
  const base = {
    name: "Muster GmbH",
    legalForm: "gmbh",
    street: "Hauptstr.",
    houseNumber: "1",
    postalCode: "10115",
    city: "Berlin",
    country: "Deutschland",
    registerCourt: "AG Berlin",
    registerNumber: "HRB 1",
    contactFirstName: "Max",
    contactLastName: "Muster",
    contactPosition: "GF",
    contactEmail: "max@muster.de",
  };
  assert.equal(validateMasterData(base, requirements).complete, true);
  const withBilling = validateMasterData({ ...base, billingDiffers: true }, requirements);
  assert.equal(withBilling.complete, false);
  assert.ok(withBilling.missing.some((m) => m.key === "billingStreet"));
});
test("USt-IdNr. ist nicht pauschal Pflicht", () => {
  assert.ok(REGISTERED_LEGAL_FORMS.includes("gmbh"));
  assert.ok(!REGISTERED_LEGAL_FORMS.includes("gbr"));
  const vatField = MASTER_DATA_FIELDS.find((f) => f.key === "vatId");
  assert.equal(vatField?.defaultRequired, false);
});

console.log("\nRollen-Zugriff");
test("CLOSER erreicht ausschließlich den Sales-Bereich", () => {
  assert.ok(canAccessAdminPath("CLOSER", "/admin/sales"));
  assert.ok(canAccessAdminPath("CLOSER", "/admin/sales/leads/abc"));
  assert.ok(canAccessAdminPath("CLOSER", "/admin/sales/closing/abc/audit"));
  assert.ok(canAccessAdminPath("CLOSER", "/admin/sales/rechnungen/abc"));
  for (const path of [
    "/admin/dashboard",
    "/admin/kunden",
    "/admin/kunden/abc/dokumente",
    "/admin/lernen",
    "/admin/methodik",
    "/admin/strategy",
    "/admin/dokumente",
    "/admin/termine",
    "/admin/einstellungen",
    "/admin/einstellungen/team",
    "/admin/einstellungen/vertragsdokumente",
  ]) {
    assert.equal(canAccessAdminPath("CLOSER", path), false, `CLOSER darf ${path} nicht sehen`);
  }
});
test("Präfix-Prüfung lässt sich nicht durch ähnliche Pfade umgehen", () => {
  assert.equal(canAccessAdminPath("CLOSER", "/admin/sales-intern"), false);
  assert.equal(canAccessAdminPath("CLOSER", "/admin/salesx/leads"), false);
});
test("ADMIN erreicht alles, CLIENT nichts im Adminbereich", () => {
  assert.ok(canAccessAdminPath("ADMIN", "/admin/einstellungen/team"));
  assert.equal(canAccessAdminPath("CLIENT", "/admin/sales"), false);
  assert.equal(canAccessAdminPath("", "/admin/sales"), false);
});
test("Startseite je Rolle", () => {
  assert.equal(homeFor("ADMIN"), "/admin/dashboard");
  assert.equal(homeFor("CLOSER"), "/admin/sales");
  assert.equal(homeFor("CLIENT"), "/dashboard");
  assert.equal(homeFor("unbekannt"), "/dashboard");
});

console.log("\nsnapshot integrity");
test("kanonischer Hash ist unabhängig von der Feldreihenfolge", () => {
  const a = sha256Canonical({ b: 1, a: { d: 2, c: [1, 2] } });
  const b = sha256Canonical({ a: { c: [1, 2], d: 2 }, b: 1 });
  assert.equal(a, b);
  assert.notEqual(a, sha256Canonical({ b: 1, a: { d: 3, c: [1, 2] } }));
});

console.log("\nBlueprint-Empfehlungen");

/** Antwort mit Signal und konkreten Lösungsverweisen. */
function answered(
  externalId: string,
  signals: Array<{ category: string; value: number; solutionRefs: string[] }>
): EvaluatedQuestion {
  return {
    questionId: externalId,
    externalId,
    moduleNumber: 5,
    groupCode: null,
    questionType: "A",
    isGating: false,
    isFollowUp: true,
    internalWeight: null,
    order: 1,
    isActive: true,
    status: "ANSWERED",
    selectedOptionExternalIds: [],
    computedScore: null,
    signals,
  };
}

function solution(externalId: string, category: string, tiers: string[]): SolutionInput {
  return {
    id: `db_${externalId}`,
    externalId,
    name: externalId,
    category,
    description: "",
    packageTypes: JSON.stringify(tiers),
    isActive: true,
  };
}

const SOLUTIONS: SolutionInput[] = [
  solution("SOL-B-001", "BEWAEHRTE_LOESUNG", ["foundation", "operations", "custom"]),
  solution("SOL-B-006", "BEWAEHRTE_LOESUNG", ["foundation", "operations", "custom"]),
  solution("SOL-C-004", "CUSTOM_DEVELOPMENT", ["operations", "custom"]),
  solution("SOL-W-001", "WORKFORCE", ["operations", "custom"]),
];

test("nur die Lösungen, auf die eine Antwort tatsächlich verweist", () => {
  const evaluated = [
    answered("5.7.1-a", [
      { category: "BEWAEHRTE_LOESUNG", value: 10, solutionRefs: ["SOL-C-004", "SOL-B-001"] },
    ]),
  ];
  const result = matchSolutions(
    aggregateSignals(evaluated),
    SOLUTIONS,
    "operations",
    aggregateSolutionRefs(evaluated)
  );
  assert.deepEqual(
    result.map((r) => r.externalId).sort(),
    ["SOL-B-001", "SOL-C-004"],
    "das Wiki aus derselben Kategorie darf nicht mitkommen"
  );
  assert.ok(result.every((r) => r.fromAnswers));
});

test("mehrfach ausgelöste Lösungen stehen oben", () => {
  const evaluated = [
    answered("5.5.2-a", [
      { category: "BEWAEHRTE_LOESUNG", value: 10, solutionRefs: ["SOL-B-001"] },
    ]),
    answered("5.7.1-a", [
      { category: "BEWAEHRTE_LOESUNG", value: 10, solutionRefs: ["SOL-B-001", "SOL-C-004"] },
    ]),
  ];
  const result = matchSolutions(
    aggregateSignals(evaluated),
    SOLUTIONS,
    "operations",
    aggregateSolutionRefs(evaluated)
  );
  assert.equal(result[0].externalId, "SOL-B-001");
  assert.equal(result[0].signalScore, 20);
  assert.equal(result[1].externalId, "SOL-C-004");
});

test("Lösungen außerhalb des gebuchten Pakets bleiben draußen", () => {
  const evaluated = [
    answered("5.7.1-a", [
      { category: "CUSTOM_DEVELOPMENT", value: 15, solutionRefs: ["SOL-C-004"] },
    ]),
  ];
  const result = matchSolutions(
    aggregateSignals(evaluated),
    SOLUTIONS,
    "foundation",
    aggregateSolutionRefs(evaluated)
  );
  /*
    Seit „Paket an die Blueprint-Sitzung hängen" (b231052) filtert die
    Auswertung nicht mehr, sondern markiert: Eine Lösung jenseits des
    gebuchten Pakets verschwindet nicht, sie trägt `beyondPackage`. Der
    Bericht setzt sie sichtbar ab. Dieser Test hing seitdem an der alten
    Erwartung fest.
  */
  assert.equal(result.length, 1, "SOL-C-004 bleibt sichtbar");
  assert.equal(result[0].externalId, "SOL-C-004");
  assert.equal(result[0].beyondPackage, true, "aber als außerhalb des Pakets markiert");
});

test("unbeantwortete und inaktive Fragen lösen nichts aus", () => {
  const pending = answered("5.7.1-a", [
    { category: "BEWAEHRTE_LOESUNG", value: 10, solutionRefs: ["SOL-B-001"] },
  ]);
  pending.status = "PENDING";
  const inactive = answered("5.5.2-a", [
    { category: "WORKFORCE", value: 10, solutionRefs: ["SOL-W-001"] },
  ]);
  inactive.isActive = false;
  const refs = aggregateSolutionRefs([pending, inactive]);
  assert.equal(refs.size, 0);
});

test("ohne Verweise greift die Kategorie weiter — alte Sitzungen gehen nicht leer aus", () => {
  const evaluated = [
    answered("5.7.1-a", [
      { category: "BEWAEHRTE_LOESUNG", value: 10, solutionRefs: [] },
    ]),
  ];
  const result = matchSolutions(
    aggregateSignals(evaluated),
    SOLUTIONS,
    "operations",
    aggregateSolutionRefs(evaluated)
  );
  assert.deepEqual(result.map((r) => r.externalId).sort(), ["SOL-B-001", "SOL-B-006"]);
  assert.ok(result.every((r) => !r.fromAnswers));
});

console.log("\nBlueprint, dritte Säule");

function system(
  id: string,
  name: string,
  purposes: string[],
  category = "Kundenverwaltung"
): SystemRecord {
  return { id, catalogKey: id, name, category, purposes, isCustom: false };
}

function task(
  key: string,
  frequencyBand: string,
  durationBand: string,
  systemIds: string[] = []
): TaskRecord {
  const entry = TASK_CATALOG.find((t) => t.key === key)!;
  return {
    id: `db_${key}`,
    catalogKey: key,
    label: entry.label,
    area: entry.area,
    frequencyBand,
    durationBand,
    systemIds,
    minutesPerMonth: minutesPerMonth(frequencyBand, durationBand) ?? 0,
  };
}

test("Katalog ist in sich schlüssig", () => {
  assert.equal(TASK_CATALOG.length, 40);
  // Seit 96e9d7b gibt es „Sonstiges" als eigenen Zweck.
  assert.equal(PURPOSES.length, 12);
  assert.equal(STATIONS.length, 9);
  assert.equal(MAX_TASKS, 10);
  // Jede Aufgabe zeigt auf einen Ablauf, den es gibt.
  for (const entry of TASK_CATALOG) {
    assert.ok(flowByKey(entry.flowKey), `unbekannter Ablauf: ${entry.flowKey}`);
  }
  // Schlüssel sind eindeutig.
  assert.equal(new Set(TASK_CATALOG.map((t) => t.key)).size, TASK_CATALOG.length);
  assert.equal(new Set(STATIONS.map((s) => s.key)).size, STATIONS.length);
  assert.equal(new Set(FREQUENCY_BANDS.map((b) => b.key)).size, FREQUENCY_BANDS.length);
  assert.equal(new Set(DURATION_BANDS.map((b) => b.key)).size, DURATION_BANDS.length);
});

test("Stunden pro Monat rechnen sich aus den Bändern", () => {
  // täglich (5 / Woche) × 10 Minuten × 4,33 Wochen = 216,5 → 217 Minuten
  assert.equal(minutesPerMonth("freq_daily", "dur_5_15"), 217);
  assert.equal(minutesPerMonth("freq_monthly", "dur_under5"), 3);
  assert.equal(minutesPerMonth("unbekannt", "dur_5_15"), null, "kein Band, keine Schätzung");
});

test("Aufgabensumme und Übergabekandidaten", () => {
  const summary = summariseTasks([
    task("t02", "freq_daily", "dur_5_15", ["a", "b"]),
    task("t12", "freq_weekly", "dur_30_60", ["a"]),
    task("t17", "freq_weekly_multi", "dur_15_30", ["a", "b", "c"]),
  ]);
  // Einsatzpläne (3 × / Woche à 22 min) kosten mehr als Kundendaten übertragen
  // (5 × / Woche à 10 min) — 286 gegen 217 Minuten im Monat.
  assert.equal(summary.entries[0].task.catalogKey, "t17", "die teuerste Aufgabe steht oben");
  assert.equal(summary.entries[0].hoursPerMonth, 4.8);
  assert.equal(summary.entries[2].task.catalogKey, "t12", "die günstigste steht unten");
  assert.equal(summary.handoffCandidates, 2, "zwei Aufgaben berühren mehr als ein Programm");
  // 217 + 195 + 286 = 698 Minuten = 11,6 Stunden
  assert.equal(summary.totalHoursPerMonth, 11.6);
});

test("Medienbruch, Lücke und Behelfslösung fallen aus der Matrix", () => {
  const finding = analyseSystems([
    system("s1", "Excel", [
      "pur_customers",
      "pur_offers",
      "pur_orders",
      "pur_scheduling",
      "pur_time",
      "pur_reports",
    ]),
    system("s2", "HubSpot", ["pur_customers"]),
    system("s3", "Lexoffice", ["pur_invoices"]),
  ]);

  const customers = finding.rows.find((r) => r.purposeKey === "pur_customers")!;
  assert.equal(customers.isMediaBreak, true, "Excel und HubSpot pflegen beide Kundendaten");
  assert.deepEqual(customers.systemNames.sort(), ["Excel", "HubSpot"]);

  const documents = finding.rows.find((r) => r.purposeKey === "pur_documents")!;
  assert.equal(documents.isGap, true, "für Dokumente gibt es nichts");

  assert.equal(finding.overloaded.length, 1);
  assert.equal(finding.overloaded[0].name, "Excel");
  assert.equal(finding.overloaded[0].purposeCount, 6);
});

test("Handarbeitsquote, Programmwechsel und Trägerperson", () => {
  const flow: FlowRecord = {
    id: "f1",
    catalogKey: "flow_inquiry",
    title: "Eine Kundenanfrage kommt herein",
    position: 0,
    stations: [
      { stationKey: "st_receive", position: 0, role: "Büro", systemId: "s1", systemLabel: null, mode: "manual" },
      { stationKey: "st_route", position: 1, role: "Büro", systemId: null, systemLabel: "none", mode: "manual" },
      { stationKey: "st_transfer", position: 2, role: "Büro", systemId: "s2", systemLabel: null, mode: "manual" },
      { stationKey: "st_create", position: 3, role: "Büro", systemId: "s2", systemLabel: null, mode: "manual" },
      { stationKey: "st_document", position: 4, role: "Meister", systemId: "s3", systemLabel: null, mode: "manual" },
      { stationKey: "st_reply", position: 5, role: "Büro", systemId: "s1", systemLabel: null, mode: "manual" },
      { stationKey: "st_inform", position: 6, role: "Büro", systemId: null, systemLabel: "paper", mode: "partial" },
      { stationKey: "st_followup", position: 7, role: "Büro", systemId: null, systemLabel: "none", mode: "manual" },
      { stationKey: "st_archive", position: 8, role: null, systemId: null, systemLabel: null, mode: "none" },
    ],
  };

  const finding = analyseFlow(flow);
  assert.equal(finding.relevantStations, 8, "die entfallende Station zählt nicht mit");
  assert.equal(finding.manualStations, 7);
  assert.equal(finding.manualShare, 88);
  // s1, s2, s3 und Papier = vier Werkzeuge → drei Wechsel
  assert.equal(finding.systemSwitches, 3);
  assert.equal(finding.carrier?.role, "Büro");
  assert.equal(finding.carrier?.stations, 7);
  assert.ok(
    !finding.takeoverStations.includes("st_route"),
    "die Entscheidung über die Zuständigkeit bleibt beim Menschen"
  );
  assert.ok(!finding.takeoverStations.includes("st_reply"), "der Inhalt der Antwort auch");
  assert.ok(finding.takeoverStations.includes("st_transfer"));
});

test("ein vollständig automatisierter Ablauf ergibt Quote null", () => {
  const flow: FlowRecord = {
    id: "f2",
    catalogKey: "flow_invoice",
    title: "Eine Rechnung muss geschrieben werden",
    position: 0,
    stations: STATIONS.map((station, index) => ({
      stationKey: station.key,
      position: index,
      role: "System",
      systemId: "s1",
      systemLabel: null,
      mode: "automatic",
    })),
  };
  const summary = summariseFlows([flow]);
  assert.equal(summary.overallManualShare, 0);
  assert.equal(summary.findings[0].takeoverStations.length, 0);
});

test("Abläufe folgen den teuersten Aufgaben, nicht der Reihenfolge im Katalog", () => {
  const selected = selectFlows(
    [
      task("t38", "freq_monthly", "dur_under5"),      // Einkauf, sehr wenig
      task("t12", "freq_daily", "dur_30_60"),          // Rechnungen, viel
      task("t17", "freq_weekly_multi", "dur_over60"),  // Planung, am meisten
    ],
    null
  );
  assert.deepEqual(selected, ["flow_scheduling", "flow_invoice", "flow_purchase"]);
});

test("ohne genug Aufgaben füllt der Branchenstandard auf", () => {
  // M1.1-OPT-3 ist Gebäudereinigung → flow_sickness
  const selected = selectFlows([task("t12", "freq_weekly", "dur_5_15")], "M1.1-OPT-3");
  assert.deepEqual(selected, ["flow_invoice", "flow_sickness"]);

  const empty = selectFlows([], null);
  assert.deepEqual(empty, ["flow_inquiry"], "ohne alles bleibt der Standardablauf");
});

test("Gesamtbild trennt Reifegrad und Stunden", () => {
  const result = evaluatePillar3({
    systems: [system("s1", "Excel", ["pur_customers"])],
    tasks: [task("t02", "freq_daily", "dur_5_15", ["s1", "s2"])],
    flows: [
      {
        id: "f1",
        catalogKey: "flow_inquiry",
        title: "Eine Kundenanfrage kommt herein",
        position: 0,
        stations: [
          { stationKey: "st_receive", position: 0, role: "Büro", systemId: "s1", systemLabel: null, mode: "manual" },
          { stationKey: "st_reply", position: 1, role: "Büro", systemId: "s1", systemLabel: null, mode: "automatic" },
        ],
      },
    ],
  });
  assert.equal(result.hasData, true);
  assert.equal(result.flows.overallManualShare, 50);
  assert.equal(result.flowMaturity, 50);
  assert.equal(result.tasks.totalHoursPerMonth, 3.6);
  assert.equal(result.systems.gaps.length, 11, "elf Zwecke ohne Programm");
});

test("ohne Eingaben bleibt alles bei null statt zu raten", () => {
  const result = evaluatePillar3({ systems: [], tasks: [], flows: [] });
  assert.equal(result.hasData, false);
  assert.equal(result.tasks.totalHoursPerMonth, 0);
  assert.equal(result.flows.overallManualShare, 0);
  assert.equal(result.flowMaturity, 100);
});

// ─── Zeitzone ────────────────────────────────────────────────────────────────

/*
  Der Fehler, den diese Tests festhalten: Ein Terminfenster wurde mit
  `setHours` gebaut, also in der Zone des Servers. Auf Railway ist das UTC —
  aus 13 Uhr wurde 15 Uhr im Portal.
*/

test("13 Uhr im Sommer ist 11:00 UTC", () => {
  const t = berlinZeitpunkt(2026, 7, 15, 13);
  assert.equal(t.toISOString(), "2026-07-15T11:00:00.000Z");
  assert.equal(berlinStundeVon(t), 13);
});

test("13 Uhr im Winter ist 12:00 UTC", () => {
  const t = berlinZeitpunkt(2026, 1, 15, 13);
  assert.equal(t.toISOString(), "2026-01-15T12:00:00.000Z");
  assert.equal(berlinStundeVon(t), 13);
});

test("die Umstellungsnacht verschiebt den Termin nicht", () => {
  // Am 29. März 2026 wird um 2 Uhr auf 3 Uhr vorgestellt.
  const vorher = berlinZeitpunkt(2026, 3, 29, 1);
  const nachher = berlinZeitpunkt(2026, 3, 29, 13);
  assert.equal(vorher.toISOString(), "2026-03-29T00:00:00.000Z");
  assert.equal(nachher.toISOString(), "2026-03-29T11:00:00.000Z");
  assert.equal(berlinStundeVon(nachher), 13);
});

test("der Tag läuft von Mitternacht bis Mitternacht in Berlin", () => {
  const { von, bis } = berlinTagesgrenzen(2026, 7, 15);
  assert.equal(von.toISOString(), "2026-07-14T22:00:00.000Z");
  assert.equal(bis.toISOString(), "2026-07-15T21:59:59.999Z");
});

test("der Wochentag kommt aus dem Kalender, nicht aus der Zone", () => {
  assert.equal(berlinWochentagVon(2026, 10, 10), 6, "Samstag");
  assert.equal(berlinWochentagVon(2026, 10, 12), 1, "Montag");
});

test("ein gebuchter Termin wird in Berliner Zeit angezeigt", () => {
  // Was der Kunde ausgewählt hat, muss er im Portal wiederfinden.
  const gebucht = berlinZeitpunkt(2026, 7, 15, 13);
  assert.ok(formatiereBerlin(gebucht).includes("13:00"));
});

// ─── Angebot: wer sieht es wann ─────────────────────────────────────────────

/*
  Der teuerste Fehler bisher: Ein frisch angelegtes Angebot ist sofort das
  aktive, und der Knopf zum Zeigen hing daran, dass es das *nicht* sei. Der
  Berater konnte das erste Angebot also nie aufschalten.
*/
test("ein neu angelegtes, aktives Angebot lässt sich zeigen", () => {
  const angebot = { id: "a1", presentedAt: null, status: "draft" };
  assert.equal(kannGezeigtWerden(angebot, "a1"), true);
  assert.equal(knopfBeschriftung(angebot), "Dem Kunden zeigen");
});

test("ein gezeigtes, aktives Angebot braucht keinen Knopf mehr", () => {
  const angebot = { id: "a1", presentedAt: new Date(), status: "presented" };
  assert.equal(kannGezeigtWerden(angebot, "a1"), false);
});

test("ein gezeigtes Angebot lässt sich erneut aufrufen, wenn ein anderes läuft", () => {
  const angebot = { id: "a1", presentedAt: new Date(), status: "presented" };
  assert.equal(kannGezeigtWerden(angebot, "a2"), true);
  assert.equal(knopfBeschriftung(angebot), "Erneut zeigen");
});

test("ein angenommenes Angebot wird nicht noch einmal vorgestellt", () => {
  assert.equal(
    kannGezeigtWerden({ id: "a1", presentedAt: new Date(), status: "accepted" }, "a2"),
    false
  );
});

test("das vorgestellte Angebot bekommt die Bühne des Interessenten", () => {
  assert.equal(
    angebotAufDerBuehne({
      isActivated: false,
      radarActive: false,
      radarVorrang: false,
      offerPresented: true,
    }),
    true
  );
});

test("ein laufendes Radar mit Vorrang behält die Bühne", () => {
  assert.equal(
    angebotAufDerBuehne({
      isActivated: false,
      radarActive: true,
      radarVorrang: true,
      offerPresented: true,
    }),
    false
  );
});

test("nach dem Radar gewinnt das zuletzt aufgeschaltete Angebot", () => {
  assert.equal(
    angebotAufDerBuehne({
      isActivated: false,
      radarActive: true,
      radarVorrang: false,
      offerPresented: true,
    }),
    true
  );
});

test("nach der Freischaltung steht der Zugang, nicht mehr das Angebot", () => {
  assert.equal(
    angebotAufDerBuehne({
      isActivated: true,
      radarActive: false,
      radarVorrang: false,
      offerPresented: true,
    }),
    false
  );
});

console.log("\nOKUN Care");
test("ohne gesetzte Nummer gibt es keinen WhatsApp-Kanal", () => {
  delete process.env.OKUN_WHATSAPP;
  assert.equal(careKontakt().whatsappNummer, null);
});

test("eine zu kurze Nummer gilt nicht als Kanal", () => {
  process.env.OKUN_WHATSAPP = "0170";
  assert.equal(careKontakt().whatsappNummer, null);
});

test("Schreibweise mit Plus und Leerzeichen wird zu reinen Ziffern", () => {
  process.env.OKUN_WHATSAPP = "+49 170 1234567";
  assert.equal(careKontakt().whatsappNummer, "491701234567");
  delete process.env.OKUN_WHATSAPP;
});

test("der WhatsApp-Link nennt den Betrieb im vorbereiteten Text", () => {
  const link = whatsappLink("491701234567", "Arwed Spanehl GmbH");
  assert.ok(link.startsWith("https://wa.me/491701234567?text="));
  assert.ok(decodeURIComponent(link).includes("Arwed Spanehl GmbH"));
});

test("der mailto-Betreff nennt Care und den Betrieb", () => {
  const link = mailtoLink("care@okun-systems.com", "Arwed Spanehl GmbH");
  assert.ok(decodeURIComponent(link).includes("OKUN Care — Arwed Spanehl GmbH"));
});

test("Care deckt ausdruecklich auch Automationen ab, nicht nur Support", () => {
  assert.ok(istCareArt("automatisierung"));
  assert.equal(careArtLabel("automatisierung"), "Automation");
});

test("eine unbekannte Art kippt die Anzeige nicht", () => {
  assert.equal(istCareArt("quatsch"), false);
  assert.equal(careArtLabel("quatsch"), "Sonstiges");
});

console.log("\nOnboarding-Checkliste");

const LEER: OnboardingStand = {
  zugangEingerichtet: false,
  blueprintFertig: false,
  strategieterminVorhanden: false,
  studioFreigegeben: false,
  lernenBegonnen: false,
  selbstErledigt: [],
};

test("ein frischer Betrieb hat nichts erledigt", () => {
  const schritte = baueCheckliste(LEER);
  assert.equal(schritte.length, ONBOARDING_SCHRITTE.length);
  assert.equal(fortschritt(schritte).erledigt, 0);
  assert.equal(fortschritt(schritte).prozent, 0);
});

test("der Stand des Betriebs hakt von selbst ab", () => {
  const schritte = baueCheckliste({
    ...LEER,
    zugangEingerichtet: true,
    blueprintFertig: true,
  });
  assert.equal(schritte.find((s) => s.schluessel === "zugang")?.erledigt, true);
  assert.equal(schritte.find((s) => s.schluessel === "blueprint")?.erledigt, true);
  assert.equal(schritte.find((s) => s.schluessel === "termin")?.erledigt, false);
});

test("abgeleitete Schritte lassen sich nicht von Hand setzen", () => {
  const schritte = baueCheckliste({ ...LEER, selbstErledigt: ["blueprint"] });
  assert.equal(schritte.find((s) => s.schluessel === "blueprint")?.erledigt, false);
  assert.equal(schritte.find((s) => s.schluessel === "blueprint")?.abhakbar, false);
});

test("selbst gesetzte Haken zaehlen und bleiben loesbar", () => {
  const schritte = baueCheckliste({ ...LEER, selbstErledigt: ["video", "stammdaten"] });
  const video = schritte.find((s) => s.schluessel === "video");
  assert.equal(video?.erledigt, true);
  assert.equal(video?.abhakbar, true);
  assert.equal(fortschritt(schritte).erledigt, 2);
});

test("ein freigegebenes Studio laesst den Termin-Haken nicht zurueckfallen", () => {
  const schritte = baueCheckliste({ ...LEER, studioFreigegeben: true });
  assert.equal(schritte.find((s) => s.schluessel === "termin")?.erledigt, true);
});

test("der naechste Schritt ist nie einer, auf den der Kunde nur warten kann", () => {
  const schritte = baueCheckliste({
    ...LEER,
    zugangEingerichtet: true,
    blueprintFertig: true,
    strategieterminVorhanden: true,
    selbstErledigt: ["video", "stammdaten"],
  });
  // Offen sind jetzt „studio" (macht OKUN) und „lernen" (macht der Kunde).
  assert.equal(naechsterSchritt(schritte)?.schluessel, "lernen");
});

test("ist alles erledigt, gibt es keinen naechsten Schritt mehr", () => {
  const schritte = baueCheckliste({
    zugangEingerichtet: true,
    blueprintFertig: true,
    strategieterminVorhanden: true,
    studioFreigegeben: true,
    lernenBegonnen: true,
    selbstErledigt: ["video", "stammdaten"],
  });
  assert.equal(fortschritt(schritte).prozent, 100);
  assert.equal(naechsterSchritt(schritte), null);
});

console.log("\nArbeitsauftrag und Projektstatus");

const POSTEN: AuftragsPosten[] = [
  { id: "c", titel: "Angebote automatisch verschicken", warum: null, art: "automatisierung", zustand: "gewaehlt", kundeSieht: true, position: 2 },
  { id: "a", titel: "Termine ohne Rueckfragen", warum: "Weniger Telefonate", art: "automatisierung", zustand: "gewaehlt", kundeSieht: true, position: 0 },
  { id: "b", titel: "Spaeter mal: Lager", warum: null, art: "automatisierung", zustand: "spaeter", kundeSieht: true, position: 1 },
  { id: "d", titel: "Intern vorsortiert", warum: null, art: "automatisierung", zustand: "gewaehlt", kundeSieht: false, position: 3 },
  { id: "e", titel: "Abgelehnt", warum: null, art: "automatisierung", zustand: "verworfen", kundeSieht: true, position: 4 },
];

test("in die Umsetzung geht nur Gewaehltes, in der Reihenfolge des Gespraechs", () => {
  const auftrag = auftragsPosten(POSTEN);
  assert.deepEqual(auftrag.map((p) => p.id), ["a", "c"]);
});

test("was der Kunde nie zur Wahl hatte, erscheint nicht in seinem Projekt", () => {
  assert.equal(auftragsPosten(POSTEN).some((p) => p.id === "d"), false);
});

test("ein Posten auf spaeter ist kein Auftrag", () => {
  assert.equal(auftragsPosten(POSTEN).some((p) => p.id === "b"), false);
});

test("Fortschritt: in Umsetzung zaehlt halb, live ganz", () => {
  assert.equal(projektFortschritt([]), 0);
  assert.equal(projektFortschritt(["geplant", "geplant"]), 0);
  assert.equal(projektFortschritt(["umsetzung", "geplant"]), 25);
  assert.equal(projektFortschritt(["live", "umsetzung"]), 75);
  assert.equal(projektFortschritt(["live", "live"]), 100);
});

test("Status folgt den Meilensteinen, nicht der Hand", () => {
  assert.equal(projektStatus([]), "PLANNING");
  assert.equal(projektStatus(["geplant", "geplant"]), "PLANNING");
  assert.equal(projektStatus(["geplant", "umsetzung"]), "ACTIVE");
  assert.equal(projektStatus(["live", "geplant"]), "ACTIVE");
  assert.equal(projektStatus(["live", "live"]), "COMPLETED");
});

test("ein unbekannter Zustand wird nicht gesetzt und faellt auf Geplant zurueck", () => {
  assert.equal(istMeilensteinZustand("live"), true);
  assert.equal(istMeilensteinZustand("fertig"), false);
  assert.equal(zustandLabel("fertig"), "Geplant");
});

console.log("\nKosten der Programme");
test("eine glatte Zahl bleibt, was sie ist", () => {
  assert.equal(leseKosten("49"), 49);
  assert.equal(leseKosten(49), 49);
});

test("deutsche Schreibweise wird gelesen, Cent kaufmaennisch gerundet", () => {
  assert.equal(leseKosten("49,90 €"), 50);
  assert.equal(leseKosten("49,40"), 49);
  assert.equal(leseKosten("1.200"), 1200);
  assert.equal(leseKosten("1.299,50 €"), 1300);
});

test("Beiwerk im Feld haelt die Eingabe nicht auf", () => {
  assert.equal(leseKosten("ca. 50 € pro Nutzer"), 50);
  assert.equal(leseKosten("  80  "), 80);
});

test("ohne lesbare Zahl ist es nicht angegeben, nicht null Euro", () => {
  assert.equal(leseKosten(""), null);
  assert.equal(leseKosten("keine Ahnung"), null);
  assert.equal(leseKosten(null), null);
  assert.equal(leseKosten(undefined), null);
  assert.equal(leseKosten("-20"), 20); // Das Minus gehoert nicht zur Zahl.
});

test("eine absurde Zahl wird gedeckelt statt uebernommen", () => {
  assert.equal(leseKosten("99999999"), MAX_KOSTEN_PRO_MONAT);
});

test("nur Bekanntes wird summiert — die Summe ist eine Untergrenze", () => {
  const ergebnis = summiereKosten([
    { kostenProMonat: 49 },
    { kostenProMonat: null },
    { kostenProMonat: 131 },
  ]);
  assert.equal(ergebnis.summe, 180);
  assert.equal(ergebnis.bekannt, 2);
});

test("ohne jede Angabe bleibt die Summe null und gilt als unbekannt", () => {
  const ergebnis = summiereKosten([{ kostenProMonat: null }, { kostenProMonat: null }]);
  assert.equal(ergebnis.summe, 0);
  assert.equal(ergebnis.bekannt, 0);
});

test("nur bekannte Schluessel werden gespeichert", () => {
  assert.equal(istBindung("jahresvertrag"), true);
  assert.equal(istBindung("quartalsweise"), false);
  assert.equal(istZufriedenheit("laeuft"), true);
  assert.equal(istZufriedenheit("super"), false);
});

console.log("\nSchablone fuer die digitalen Grundlagen");

function prog(teil: Partial<Programm> & { name: string; zwecke: string[] }): Programm {
  return {
    kostenProMonat: null,
    bindung: null,
    zufriedenheit: null,
    ...teil,
  };
}

test("Workforce steckt nur in Operations und Custom", () => {
  assert.equal(workforceImPaket("operations"), true);
  assert.equal(workforceImPaket("custom"), true);
  assert.equal(workforceImPaket("foundation"), false);
  assert.equal(workforceImPaket(null), false);
});

test("die Zuordnung behauptet nur drei Zwecke, nicht sechs Module", () => {
  // Auswertungen und Lohnabrechnung sind bewusst nicht dabei.
  assert.deepEqual([...WORKFORCE_ZWECKE], ["pur_scheduling", "pur_time", "pur_hr"]);
  assert.equal(WORKFORCE_ZWECKE.includes("pur_reports"), false);
});

test("ein abgedecktes Programm faellt weg und nennt die Ersparnis", () => {
  const v = legeSchabloneAn({
    paket: "operations",
    zweckeMitAufwand: [],
    programme: [
      prog({ name: "Papershift", zwecke: ["pur_scheduling"], kostenProMonat: 89, zufriedenheit: "aergert" }),
    ],
  });
  const weg = v.filter((x) => x.bewegung === "faellt_weg");
  assert.equal(weg.length, 1);
  assert.equal(weg[0].sparenProMonat, 89);
  assert.equal(weg[0].pruefen, true);
});

test("wer zufrieden ist, behaelt sein Programm", () => {
  const v = legeSchabloneAn({
    paket: "operations",
    zweckeMitAufwand: [],
    programme: [
      prog({ name: "Papershift", zwecke: ["pur_scheduling"], kostenProMonat: 89, zufriedenheit: "laeuft" }),
    ],
  });
  assert.equal(v.filter((x) => x.bewegung === "faellt_weg").length, 0);
  assert.equal(v.filter((x) => x.bewegung === "bleibt").length, 1);
});

test("ein Programm, das mehr kann als Workforce, faellt nicht weg", () => {
  const v = legeSchabloneAn({
    paket: "operations",
    zweckeMitAufwand: [],
    programme: [
      prog({
        name: "Branchensoftware",
        zwecke: ["pur_scheduling", "pur_invoices"],
        kostenProMonat: 300,
        zufriedenheit: "gehtso",
      }),
    ],
  });
  assert.equal(v.filter((x) => x.bewegung === "faellt_weg").length, 0);
});

test("ohne Workforce im Paket wird nichts gestrichen", () => {
  const v = legeSchabloneAn({
    paket: "foundation",
    zweckeMitAufwand: [],
    programme: [
      prog({ name: "Papershift", zwecke: ["pur_scheduling"], kostenProMonat: 89, zufriedenheit: "aergert" }),
    ],
  });
  assert.equal(v.filter((x) => x.bewegung === "faellt_weg").length, 0);
});

test("zwei Programme fuer denselben Zweck gehen zusammen", () => {
  const v = legeSchabloneAn({
    paket: "foundation",
    zweckeMitAufwand: [],
    programme: [
      prog({ name: "Lexoffice", zwecke: ["pur_invoices"] }),
      prog({ name: "Excel", zwecke: ["pur_invoices"] }),
    ],
  });
  const zus = v.filter((x) => x.bewegung === "geht_zusammen");
  assert.equal(zus.length, 1);
  assert.deepEqual(zus[0].programme, ["Lexoffice", "Excel"]);
});

test("was ohnehin abgeloest wird, bekommt keine zweite Empfehlung", () => {
  const v = legeSchabloneAn({
    paket: "operations",
    zweckeMitAufwand: [],
    programme: [
      prog({ name: "Papershift", zwecke: ["pur_scheduling"], zufriedenheit: "aergert" }),
      prog({ name: "Excel", zwecke: ["pur_scheduling"], zufriedenheit: "aergert" }),
    ],
  });
  assert.equal(v.filter((x) => x.bewegung === "geht_zusammen").length, 0);
  assert.equal(v.filter((x) => x.bewegung === "faellt_weg").length, 2);
});

test("eine Luecke zaehlt nur, wo auch Zeit anfaellt", () => {
  const ohne = legeSchabloneAn({ paket: "foundation", zweckeMitAufwand: [], programme: [] });
  assert.equal(ohne.filter((x) => x.bewegung === "fehlt").length, 0);

  const mit = legeSchabloneAn({
    paket: "foundation",
    zweckeMitAufwand: ["pur_customers"],
    programme: [],
  });
  assert.equal(mit.filter((x) => x.bewegung === "fehlt").length, 1);
});

test("Ersparnis trennt sofort von zum Vertragsende und zaehlt Unbekanntes", () => {
  const v = legeSchabloneAn({
    paket: "operations",
    zweckeMitAufwand: [],
    programme: [
      prog({ name: "A", zwecke: ["pur_time"], kostenProMonat: 40, bindung: "monatlich", zufriedenheit: "aergert" }),
      prog({ name: "B", zwecke: ["pur_hr"], kostenProMonat: 60, bindung: "jahresvertrag", zufriedenheit: "gehtso" }),
      prog({ name: "C", zwecke: ["pur_scheduling"], kostenProMonat: null, zufriedenheit: "aergert" }),
    ],
  });
  const e = ersparnis(v);
  assert.equal(e.sofort, 40);
  assert.equal(e.zumVertragsende, 60);
  assert.equal(e.unbekannt, 1);
});

console.log("\nVorbereitungsgespraech");

const KONTEXT: Kontext = {
  firma: "Nordlicht Gebaeudetechnik GmbH",
  branche: "Handwerk",
  paket: "operations",
  beraterName: "Felix",
  bericht: null,
  dossier: null,
  posten: [
    { id: "p1", titel: "Serviceberichte ohne Abtippen", art: "automatisierung", zustand: "kandidat", warum: "Spart das Abtippen.", kundeSieht: true },
  ],
  programme: [
    { name: "Papershift", zwecke: ["pur_scheduling"], kostenProMonat: 89, bindung: "jahresvertrag", zufriedenheit: "laeuft" },
    { name: "Excel", zwecke: ["pur_time"], kostenProMonat: null, bindung: null, zufriedenheit: null },
  ],
  vorschlaege: [
    { id: "v1", bewegung: "faellt_weg", titel: "Excel wird nicht mehr gebraucht", zustand: "offen", sparenProMonat: null },
  ],
};

test("die Anweisung nennt Betrieb, Paket und die Paketgrenze", () => {
  const text = anweisung(KONTEXT);
  assert.ok(text.includes("Nordlicht Gebaeudetechnik GmbH"));
  assert.ok(text.includes("operations"));
  assert.ok(/h.chstens 3 Automatisierungen/.test(text));
});

test("die Anweisung verbietet ausdruecklich das Erfinden von Zahlen", () => {
  const text = anweisung(KONTEXT);
  assert.ok(text.includes("Keine Zahl erfinden"));
  // Der Satz laeuft ueber einen Zeilenumbruch, deshalb nur das Ende pruefen.
  assert.ok(text.includes("nicht null."));
});

test("die Lage markiert ein zufriedenes Programm als tabu", () => {
  const text = lage(KONTEXT);
  assert.ok(text.includes("Papershift"));
  assert.ok(text.includes("läuft gut — nicht ablösen"));
});

test("die Lage sagt, bei wie vielen Programmen der Preis fehlt", () => {
  const text = lage(KONTEXT);
  assert.ok(text.includes("Bei 1 von 2 Programmen fehlt der Preis"));
});

test("Posten und Vorschlaege stehen mit ihrer ID da, damit Werkzeuge sie treffen", () => {
  const text = lage(KONTEXT);
  assert.ok(text.includes("[p1]"));
  assert.ok(text.includes("[v1]"));
});

test("ohne Daten bleibt die Lage leer statt erfunden", () => {
  const text = lage({ ...KONTEXT, programme: [], posten: [], vorschlaege: [] });
  assert.equal(text.includes("Programme im Einsatz"), false);
  assert.equal(text.includes("Posten aus dem Leitfaden"), false);
});

test("jedes Werkzeug hat einen Namen, eine Beschreibung und ein Schema", () => {
  assert.ok(WERKZEUGE.length >= 8);
  for (const w of WERKZEUGE) {
    assert.ok(w.name.length > 0, `Name fehlt: ${JSON.stringify(w)}`);
    assert.ok((w.description ?? "").length > 20, `Beschreibung zu knapp: ${w.name}`);
    assert.equal(w.input_schema.type, "object");
  }
});

test("der Abschluss fragt nach dem Probedurchlauf", () => {
  const w = WERKZEUGE.find((x) => x.name === "vorbereitung_abschliessen");
  assert.ok(w);
  const eigenschaften = w!.input_schema.properties as Record<string, unknown>;
  assert.ok("probeGelaufen" in eigenschaften);
});

console.log(`\n${passed} Tests bestanden.\n`);
