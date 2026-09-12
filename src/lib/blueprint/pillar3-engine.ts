import {
  DURATION_BANDS,
  FALLBACK_FLOW_KEY,
  FLOW_CATALOG,
  FREQUENCY_BANDS,
  MAX_FLOWS,
  MULTI_PURPOSE_THRESHOLD,
  PURPOSES,
  STATIONS,
  STATIONS_OKUN_TAKES,
  WEEKS_PER_MONTH,
  durationByKey,
  flowByKey,
  frequencyByKey,
  taskByKey,
} from "./pillar3-catalog";

/**
 * Auswertung der dritten Blueprint-Säule.
 *
 * Reine Funktionen ohne Datenbankzugriff — der Aufrufer lädt die Daten und
 * übergibt sie. Jede Kennzahl entsteht aus Zählen und Rechnen; nirgends wird
 * eingeschätzt oder formuliert. Damit liefert dieselbe Eingabe auch in einem
 * Jahr noch dasselbe Ergebnis, und der Bericht kann seine Zahlen nicht durch
 * eine Textgenerierung verlieren.
 */

// ─── Eingaben ────────────────────────────────────────────────────────────────

export type SystemRecord = {
  id: string;
  catalogKey: string | null;
  name: string;
  category: string;
  /** Zweck-Schlüssel. */
  purposes: string[];
  isCustom: boolean;
};

export type TaskRecord = {
  id: string;
  catalogKey: string;
  label: string;
  area: string;
  frequencyBand: string;
  durationBand: string;
  systemIds: string[];
  minutesPerMonth: number;
};

export type StationRecord = {
  stationKey: string;
  position: number;
  role: string | null;
  systemId: string | null;
  systemLabel: string | null;
  mode: string;
};

export type FlowRecord = {
  id: string;
  catalogKey: string;
  title: string;
  position: number;
  stations: StationRecord[];
};

// ─── Block 2: Stunden ────────────────────────────────────────────────────────

/**
 * Minuten pro Monat einer Aufgabe.
 *
 *   Häufigkeit (× / Woche) × Dauer (min) × 4,33 Wochen
 *
 * Unbekannte Bänder ergeben null — dann fehlt eine Angabe, und es wird nichts
 * geschätzt.
 */
export function minutesPerMonth(
  frequencyBand: string,
  durationBand: string
): number | null {
  const frequency = frequencyByKey(frequencyBand);
  const duration = durationByKey(durationBand);
  if (!frequency || !duration) return null;
  return Math.round(frequency.value * duration.value * WEEKS_PER_MONTH);
}

export type TaskHours = {
  task: TaskRecord;
  hoursPerMonth: number;
  /** Berührt mehr als ein Programm — fast immer eine Übergabe von Hand. */
  isHandoffCandidate: boolean;
};

export type TaskSummary = {
  entries: TaskHours[];
  totalHoursPerMonth: number;
  handoffCandidates: number;
};

export function summariseTasks(tasks: TaskRecord[]): TaskSummary {
  const entries = tasks
    .map((task) => ({
      task,
      hoursPerMonth: Math.round((task.minutesPerMonth / 60) * 10) / 10,
      isHandoffCandidate: task.systemIds.length > 1,
    }))
    .sort((a, b) => b.hoursPerMonth - a.hoursPerMonth);

  const totalMinutes = tasks.reduce((sum, task) => sum + task.minutesPerMonth, 0);

  return {
    entries,
    totalHoursPerMonth: Math.round((totalMinutes / 60) * 10) / 10,
    handoffCandidates: entries.filter((entry) => entry.isHandoffCandidate).length,
  };
}

// ─── Block 1: Systemmatrix ───────────────────────────────────────────────────

export type PurposeRow = {
  purposeKey: string;
  purposeLabel: string;
  systemNames: string[];
  /** Zwei oder mehr Programme für denselben Zweck. */
  isMediaBreak: boolean;
  /** Kein Programm für diesen Zweck. */
  isGap: boolean;
};

export type SystemFinding = {
  rows: PurposeRow[];
  mediaBreaks: PurposeRow[];
  gaps: PurposeRow[];
  /** Programme, die mehr Zwecke tragen, als ihnen zusteht. */
  overloaded: Array<{ name: string; purposeCount: number }>;
  systemCount: number;
};

export function analyseSystems(systems: SystemRecord[]): SystemFinding {
  const rows: PurposeRow[] = PURPOSES.map((purpose) => {
    const systemNames = systems
      .filter((system) => system.purposes.includes(purpose.key))
      .map((system) => system.name);
    return {
      purposeKey: purpose.key,
      purposeLabel: purpose.label,
      systemNames,
      isMediaBreak: systemNames.length > 1,
      isGap: systemNames.length === 0,
    };
  });

  const overloaded = systems
    .filter((system) => system.purposes.length > MULTI_PURPOSE_THRESHOLD)
    .map((system) => ({ name: system.name, purposeCount: system.purposes.length }))
    .sort((a, b) => b.purposeCount - a.purposeCount);

  return {
    rows,
    mediaBreaks: rows.filter((row) => row.isMediaBreak),
    gaps: rows.filter((row) => row.isGap),
    overloaded,
    systemCount: systems.length,
  };
}

// ─── Block 3: Abläufe ────────────────────────────────────────────────────────

export type FlowFinding = {
  flow: FlowRecord;
  /** Stationen, die es im Betrieb gibt — „entfällt" zählt nicht mit. */
  relevantStations: number;
  manualStations: number;
  /** Anteil 0–100, gerundet. */
  manualShare: number;
  /** Anzahl Programmwechsel über den Ablauf hinweg. */
  systemSwitches: number;
  /** Die Rolle, die an den meisten Stationen auftaucht. */
  carrier: { role: string; stations: number } | null;
  /** Stationen, die OKUN übernehmen würde, weil sie heute von Hand laufen. */
  takeoverStations: string[];
};

export function analyseFlow(flow: FlowRecord): FlowFinding {
  const relevant = flow.stations.filter((station) => station.mode !== "none");
  const manual = relevant.filter((station) => station.mode === "manual");

  // Programmwechsel: verschiedene Werkzeuge über den Ablauf hinweg, minus eins.
  // Stationen ohne Werkzeug zählen nicht als eigener Wechsel.
  const tools = new Set(
    relevant
      .map((station) => station.systemId ?? station.systemLabel)
      .filter((value): value is string => Boolean(value) && value !== "none")
  );

  const roleCounts = new Map<string, number>();
  for (const station of relevant) {
    const role = station.role?.trim();
    if (!role) continue;
    roleCounts.set(role, (roleCounts.get(role) ?? 0) + 1);
  }
  const carrierEntry = [...roleCounts.entries()].sort((a, b) => b[1] - a[1])[0];

  return {
    flow,
    relevantStations: relevant.length,
    manualStations: manual.length,
    manualShare:
      relevant.length > 0 ? Math.round((manual.length / relevant.length) * 100) : 0,
    systemSwitches: Math.max(tools.size - 1, 0),
    carrier: carrierEntry ? { role: carrierEntry[0], stations: carrierEntry[1] } : null,
    takeoverStations: manual
      .filter((station) => STATIONS_OKUN_TAKES.includes(station.stationKey))
      .map((station) => station.stationKey),
  };
}

export type FlowSummary = {
  findings: FlowFinding[];
  /** Handarbeitsquote über alle durchgegangenen Abläufe. */
  overallManualShare: number;
  totalManualStations: number;
  totalRelevantStations: number;
};

export function summariseFlows(flows: FlowRecord[]): FlowSummary {
  const findings = flows
    .slice()
    .sort((a, b) => a.position - b.position)
    .map(analyseFlow);

  const totalRelevant = findings.reduce((sum, f) => sum + f.relevantStations, 0);
  const totalManual = findings.reduce((sum, f) => sum + f.manualStations, 0);

  return {
    findings,
    overallManualShare:
      totalRelevant > 0 ? Math.round((totalManual / totalRelevant) * 100) : 0,
    totalManualStations: totalManual,
    totalRelevantStations: totalRelevant,
  };
}

// ─── Auswahl der Abläufe ─────────────────────────────────────────────────────

/**
 * Welche Abläufe durchgegangen werden.
 *
 * Die Aufgaben mit den meisten Stunden bestimmen es — nicht der Kunde und nicht
 * der Zufall. Fallen mehrere Aufgaben auf denselben Ablauf, wird er einmal
 * genommen. Bleiben weniger als zwei, füllt der Standardablauf der Branche auf.
 */
export function selectFlows(
  tasks: TaskRecord[],
  industryOptionId: string | null
): string[] {
  const byHours = tasks
    .slice()
    .sort((a, b) => b.minutesPerMonth - a.minutesPerMonth);

  const selected: string[] = [];
  for (const task of byHours) {
    const flowKey = taskByKey(task.catalogKey)?.flowKey;
    if (!flowKey || selected.includes(flowKey)) continue;
    selected.push(flowKey);
    if (selected.length >= MAX_FLOWS) break;
  }

  if (selected.length < 2) {
    const industryFlow = industryOptionId
      ? FLOW_CATALOG.find((flow) => flow.industryDefaults?.includes(industryOptionId))
      : undefined;
    // Aufgefüllt wird bis zwei, nicht bis zum Höchstwert: Ein Betrieb mit wenig
    // Handarbeit soll nicht künstlich durch drei Abläufe geschickt werden.
    for (const key of [industryFlow?.key, FALLBACK_FLOW_KEY]) {
      if (selected.length >= 2) break;
      if (key && !selected.includes(key)) selected.push(key);
    }
  }

  return selected;
}

// ─── Gesamtbild ──────────────────────────────────────────────────────────────

export type Pillar3Result = {
  systems: SystemFinding;
  tasks: TaskSummary;
  flows: FlowSummary;
  /**
   * Reifegrad der Abläufe, 0–100: der Anteil der Stationen, die nicht von Hand
   * laufen. Bewusst getrennt von den Stunden — verschiedene Einheiten gehören
   * nicht in dieselbe Zahl.
   */
  flowMaturity: number;
  hasData: boolean;
};

export function evaluatePillar3(input: {
  systems: SystemRecord[];
  tasks: TaskRecord[];
  flows: FlowRecord[];
}): Pillar3Result {
  const systems = analyseSystems(input.systems);
  const tasks = summariseTasks(input.tasks);
  const flows = summariseFlows(input.flows);

  return {
    systems,
    tasks,
    flows,
    flowMaturity: 100 - flows.overallManualShare,
    hasData:
      input.systems.length > 0 || input.tasks.length > 0 || input.flows.length > 0,
  };
}

// ─── Darstellungshilfen ──────────────────────────────────────────────────────

export function formatHours(hours: number): string {
  return hours.toLocaleString("de-DE", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

export function stationLabel(key: string): string {
  return STATIONS.find((station) => station.key === key)?.label ?? key;
}

export function flowTitle(key: string): string {
  return flowByKey(key)?.title ?? key;
}

export function bandLabel(kind: "frequency" | "duration", key: string): string {
  const bands = kind === "frequency" ? FREQUENCY_BANDS : DURATION_BANDS;
  return bands.find((band) => band.key === key)?.label ?? key;
}
