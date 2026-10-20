"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronLeft, ChevronRight, Loader2, Plus, Trash2 } from "lucide-react";
import {
  completePillar3,
  saveFlow,
  saveSystems,
  saveTasks,
  type StationSelection,
} from "./actions";
import { QuestionHelp } from "@/components/blueprint/question-help";
import {
  CUSTOM_DURATION_KEY,
  CUSTOM_FREQUENCY_KEY,
  OTHER_PURPOSE_KEY,
  OTHER_SYSTEM_KEY,
  OTHER_SYSTEM_PREFIX,
  customTaskKey,
  splitFrequency,
} from "@/lib/blueprint/pillar3-catalog";

/**
 * Die dritte Säule aus Kundensicht: Programme, Aufgaben, Abläufe.
 *
 * Durchgehend Auswahllisten. Wer nichts anklickt, kommt nicht weiter — aber
 * niemand muss formulieren, und die Auswertung weiß hinterher genau, was
 * gemeint war.
 *
 * Wo eine Liste an ihre Grenze kommt, steht eine Ergänzung daneben: ein
 * „Sonstiges" zusätzlich zur Auswahl, eine eigene Aufgabe, eine eigene
 * Häufigkeit. Niemand soll gezwungen sein, das Nächstbeste anzuklicken —
 * eine falsche Antwort ist schlechter als eine ergänzte.
 */

type CatalogEntry = { key: string; label: string };
type SystemEntry = CatalogEntry & {
  category: string;
  needsName?: boolean;
  isNone?: boolean;
  isOther?: boolean;
};
type TaskEntry = CatalogEntry & { area: string };
type Band = CatalogEntry & { value: number; hint: string };
type Station = CatalogEntry & { hint: string };

type Props = {
  sessionId: string;
  catalog: {
    systemCategories: string[];
    systems: SystemEntry[];
    purposes: CatalogEntry[];
    taskAreas: string[];
    tasks: TaskEntry[];
    frequencyBands: Band[];
    durationBands: Band[];
    stations: Station[];
    stationModes: Array<{ key: string; label: string }>;
    nonSystemOptions: CatalogEntry[];
    maxTasks: number;
    maxCustomTasks: number;
    frequencyUnits: Array<{ key: string; label: string; perWeek: number }>;
  };
  saved: {
    systems: Array<{
      id: string;
      catalogKey: string | null;
      name: string;
      purposes: string[];
      isCustom: boolean;
      customPurpose: string;
    }>;
    tasks: Array<{
      catalogKey: string;
      frequencyBand: string;
      durationBand: string;
      systemIds: string[];
      isCustom: boolean;
      customLabel: string;
      customArea: string;
      frequencyPerWeek: number | null;
      durationMinutes: number | null;
    }>;
    flows: Array<{
      catalogKey: string;
      stations: Array<{ stationKey: string; role: string; system: string; mode: string }>;
    }>;
  };
  plannedFlows: Array<{ catalogKey: string; title: string; position: number }>;
};

type SystemState = {
  catalogKey: string;
  customName: string;
  purposes: string[];
  customPurpose: string;
};

type TaskState = {
  catalogKey: string;
  frequencyBand: string;
  durationBand: string;
  systemIds: string[];
  /** Nur bei selbst ergänzten Aufgaben gesetzt. */
  customLabel?: string;
  customArea?: string;
  /** Eigene Häufigkeit: Anzahl je Einheit. */
  frequencyCount?: number;
  frequencyUnit?: string;
  /** Eigene Dauer je Vorgang in Minuten. */
  durationMinutes?: number;
};

export default function Pillar3Client({ sessionId, catalog, saved, plannedFlows }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Der erste unvollständige Block ist der Startpunkt.
  const initialStep =
    saved.systems.length === 0 ? 0 : saved.tasks.length === 0 ? 1 : 2;
  const [step, setStep] = useState(initialStep);
  const [flowIndex, setFlowIndex] = useState(0);

  const [systems, setSystems] = useState<SystemState[]>(() =>
    saved.systems.map((system) => ({
      catalogKey: system.catalogKey ?? "",
      customName: system.isCustom ? system.name : "",
      purposes: system.purposes,
      customPurpose: system.customPurpose,
    }))
  );

  const [tasks, setTasks] = useState<TaskState[]>(() =>
    saved.tasks.map((task) => ({
      catalogKey: task.catalogKey,
      frequencyBand: task.frequencyPerWeek !== null ? CUSTOM_FREQUENCY_KEY : task.frequencyBand,
      durationBand: task.durationMinutes !== null ? CUSTOM_DURATION_KEY : task.durationBand,
      systemIds: task.systemIds,
      customLabel: task.customLabel || undefined,
      customArea: task.isCustom ? task.customArea : undefined,
      // Gespeichert sind Vorgänge pro Woche — zurück in die Eingabe geht die
      // Einheit, in der die Angabe ursprünglich gemeint war.
      frequencyCount:
        task.frequencyPerWeek !== null ? splitFrequency(task.frequencyPerWeek).count : undefined,
      frequencyUnit:
        task.frequencyPerWeek !== null ? splitFrequency(task.frequencyPerWeek).unit : undefined,
      durationMinutes: task.durationMinutes ?? undefined,
    }))
  );

  const [stations, setStations] = useState<Record<string, StationSelection[]>>(() => {
    const initial: Record<string, StationSelection[]> = {};
    for (const flow of saved.flows) {
      initial[flow.catalogKey] = flow.stations.map((station) => ({
        stationKey: station.stationKey,
        role: station.role,
        system: station.system,
        mode: station.mode,
      }));
    }
    return initial;
  });

  // Beim Blättern durch die Abläufe brauchen wir die gespeicherten IDs der
  // Programme, damit die Stationen darauf verweisen können.
  const systemChoices = useMemo(
    () => [
      ...saved.systems.map((system) => ({ key: system.id, label: system.name })),
      ...catalog.nonSystemOptions,
    ],
    [saved.systems, catalog.nonSystemOptions]
  );

  function run(fn: () => Promise<unknown>, after: () => void) {
    setError(null);
    startTransition(async () => {
      const result = (await fn()) as { error?: string } | undefined;
      if (result && "error" in result && result.error) {
        setError(result.error);
        return;
      }
      after();
      router.refresh();
    });
  }

  // ─── Block 1 ───────────────────────────────────────────────────────────────

  function toggleSystem(key: string) {
    setSystems((prev) =>
      prev.some((s) => s.catalogKey === key)
        ? prev.filter((s) => s.catalogKey !== key)
        : [...prev, { catalogKey: key, customName: "", purposes: [], customPurpose: "" }]
    );
  }

  function updateSystem(key: string, patch: Partial<SystemState>) {
    setSystems((prev) =>
      prev.map((system) => (system.catalogKey === key ? { ...system, ...patch } : system))
    );
  }

  function togglePurpose(systemKey: string, purposeKey: string) {
    setSystems((prev) =>
      prev.map((system) =>
        system.catalogKey === systemKey
          ? {
              ...system,
              purposes: system.purposes.includes(purposeKey)
                ? system.purposes.filter((p) => p !== purposeKey)
                : [...system.purposes, purposeKey],
            }
          : system
      )
    );
  }

  const realSystems = systems.filter(
    (system) => !catalog.systems.find((entry) => entry.key === system.catalogKey)?.isNone
  );

  // ─── Block 2 ───────────────────────────────────────────────────────────────

  function toggleTask(key: string) {
    setTasks((prev) => {
      if (prev.some((t) => t.catalogKey === key)) {
        return prev.filter((t) => t.catalogKey !== key);
      }
      if (prev.length >= catalog.maxTasks) return prev;
      return [
        ...prev,
        {
          catalogKey: key,
          frequencyBand: catalog.frequencyBands[1].key,
          durationBand: catalog.durationBands[1].key,
          systemIds: [],
        },
      ];
    });
  }

  function updateTask(key: string, patch: Partial<TaskState>) {
    setTasks((prev) =>
      prev.map((task) => (task.catalogKey === key ? { ...task, ...patch } : task))
    );
  }

  const customTasks = tasks.filter((task) => task.customLabel !== undefined);

  function addCustomTask() {
    if (tasks.length >= catalog.maxTasks) return;
    if (customTasks.length >= catalog.maxCustomTasks) return;
    // Ein freier Schlüssel — gelöschte Einträge geben ihren wieder her.
    const used = new Set(tasks.map((task) => task.catalogKey));
    let index = 0;
    while (used.has(customTaskKey(index))) index += 1;

    setTasks((prev) => [
      ...prev,
      {
        catalogKey: customTaskKey(index),
        frequencyBand: catalog.frequencyBands[1].key,
        durationBand: catalog.durationBands[1].key,
        systemIds: [],
        customLabel: "",
        customArea: catalog.taskAreas[0],
      },
    ]);
  }

  function removeTask(key: string) {
    setTasks((prev) => prev.filter((task) => task.catalogKey !== key));
  }

  // Eine eigene Angabe ist erst vollständig, wenn Zahl und Einheit stehen.
  const tasksIncomplete = tasks.some((task) => {
    if (task.customLabel !== undefined && !task.customLabel.trim()) return true;
    if (task.frequencyBand === CUSTOM_FREQUENCY_KEY) {
      if (!task.frequencyCount || task.frequencyCount <= 0 || !task.frequencyUnit) return true;
    }
    if (task.durationBand === CUSTOM_DURATION_KEY) {
      if (!task.durationMinutes || task.durationMinutes <= 0) return true;
    }
    return false;
  });

  // ─── Block 3 ───────────────────────────────────────────────────────────────

  const currentFlow = plannedFlows[flowIndex];

  function stationValue(flowKey: string, stationKey: string): StationSelection {
    return (
      stations[flowKey]?.find((s) => s.stationKey === stationKey) ?? {
        stationKey,
        role: "",
        system: "",
        mode: "manual",
      }
    );
  }

  function updateStation(flowKey: string, stationKey: string, patch: Partial<StationSelection>) {
    setStations((prev) => {
      const list = prev[flowKey] ?? [];
      const existing = list.find((s) => s.stationKey === stationKey);
      const next = existing
        ? list.map((s) => (s.stationKey === stationKey ? { ...s, ...patch } : s))
        : [...list, { stationKey, role: "", system: "", mode: "manual", ...patch }];
      return { ...prev, [flowKey]: next };
    });
  }

  return (
    <div className="pb-16">
      <Progress step={step} flowIndex={flowIndex} flowCount={plannedFlows.length} />

      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-[rgba(239,68,68,0.1)] border border-[#ef4444]/25 text-[#fca5a5] text-sm">
          {error}
        </div>
      )}

      {step === 0 && (
        <Panel
          title="Welche Programme nutzen Sie?"
          lede="Auch Papier, Excel und WhatsApp sind Werkzeuge — in der Praxis spielen sie genau diese Rolle. Wählen Sie anschließend aus, wofür Sie das jeweilige Programm einsetzen. Fehlt etwas, steht in jeder Gruppe „Sonstiges“ zum Ergänzen."
          help={
            <QuestionHelp
              sessionId={sessionId}
              hintEnabled={systems.length === 0}
              activityKey={systems.length}
              topic={{
                topicTitle: "Welche Programme nutzen Sie?",
                topicHint:
                  "Der Kunde wählt aus Kategorien wie Büro & E-Mail, Kundenverwaltung, Buchhaltung, Planung, Arbeitszeiten, Dokumente, Aufgaben und interne Kommunikation. Auch Papier und Excel zählen als Programm. In jeder Gruppe gibt es „Sonstiges“ zum Ergänzen.",
                topicOptions: catalog.systems.map((entry) => `${entry.category}: ${entry.label}`),
              }}
            />
          }
        >
          {catalog.systemCategories.map((category) => (
            <div key={category} className="mb-6">
              <h3 className="text-[#888] text-xs font-semibold uppercase tracking-wider mb-2.5">
                {category}
              </h3>
              <div className="space-y-1.5">
                {catalog.systems
                  .filter((entry) => entry.category === category)
                  .map((entry) => {
                    const selected = systems.find((s) => s.catalogKey === entry.key);
                    return (
                      <div key={entry.key}>
                        <Choice
                          label={entry.label}
                          checked={Boolean(selected)}
                          onClick={() => toggleSystem(entry.key)}
                        />
                        {selected && !entry.isNone && (
                          <div className="ml-7 mt-2 mb-3 space-y-2.5">
                            {entry.needsName && (
                              <input
                                value={selected.customName}
                                onChange={(e) =>
                                  setSystems((prev) =>
                                    prev.map((s) =>
                                      s.catalogKey === entry.key
                                        ? { ...s, customName: e.target.value }
                                        : s
                                    )
                                  )
                                }
                                placeholder="Name des Programms"
                                className="w-full px-3 py-2 rounded-lg bg-[#080d14] border border-[#1a2840] text-[#f0f0f0] text-sm focus:outline-none focus:border-[#00b8ff]/50"
                              />
                            )}
                            <p className="text-[#666] text-xs">Wofür nutzen Sie das?</p>
                            <div className="flex flex-wrap gap-1.5">
                              {catalog.purposes.map((purpose) => (
                                <Chip
                                  key={purpose.key}
                                  label={purpose.label}
                                  active={selected.purposes.includes(purpose.key)}
                                  onClick={() => togglePurpose(entry.key, purpose.key)}
                                />
                              ))}
                            </div>
                            {selected.purposes.includes(OTHER_PURPOSE_KEY) && (
                              <input
                                value={selected.customPurpose}
                                onChange={(e) =>
                                  updateSystem(entry.key, { customPurpose: e.target.value })
                                }
                                placeholder="Wofür sonst? In eigenen Worten"
                                className="w-full px-3 py-2 rounded-lg bg-[#080d14] border border-[#1a2840] text-[#f0f0f0] text-sm focus:outline-none focus:border-[#00b8ff]/50"
                              />
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          ))}

          <Footer
            hint={`${realSystems.length} Programm(e) gewählt`}
            nextDisabled={realSystems.length === 0 || pending}
            pending={pending}
            onNext={() =>
              run(
                () =>
                  saveSystems(
                    sessionId,
                    systems.map((system) => ({
                      catalogKey: system.catalogKey,
                      customName: system.customName,
                      purposes: system.purposes,
                      customPurpose: system.customPurpose,
                    }))
                  ),
                () => setStep(1)
              )
            }
          />
        </Panel>
      )}

      {step === 1 && (
        <Panel
          title="Welche Aufgaben wiederholen sich und laufen von Hand?"
          lede={`Bis zu ${catalog.maxTasks} Einträge. Geben Sie danach an, wie oft und wie lange — daraus rechnen wir, wie viel Zeit im Monat dafür draufgeht. Fehlt eine Aufgabe, tragen Sie sie unten selbst ein.`}
          help={
            <QuestionHelp
              sessionId={sessionId}
              hintEnabled={tasks.length === 0}
              activityKey={tasks.length}
              topic={{
                topicTitle: "Welche Aufgaben wiederholen sich und laufen von Hand?",
                topicHint:
                  "Gesucht sind wiederkehrende Handgriffe im Betrieb — nicht einmalige Projekte. Zu jeder Aufgabe wird angegeben, wie oft sie anfällt und wie lange sie jedes Mal dauert. Passt keine Häufigkeit, kann eine eigene Angabe gemacht werden (etwa einmal im Jahr).",
                topicOptions: catalog.tasks.map((entry) => `${entry.area}: ${entry.label}`),
              }}
            />
          }
        >
          {catalog.taskAreas.map((area) => (
            <div key={area} className="mb-6">
              <h3 className="text-[#888] text-xs font-semibold uppercase tracking-wider mb-2.5">
                {area}
              </h3>
              <div className="space-y-1.5">
                {catalog.tasks
                  .filter((entry) => entry.area === area)
                  .map((entry) => {
                    const selected = tasks.find((t) => t.catalogKey === entry.key);
                    const atLimit = !selected && tasks.length >= catalog.maxTasks;
                    return (
                      <div key={entry.key}>
                        <Choice
                          label={entry.label}
                          checked={Boolean(selected)}
                          disabled={atLimit}
                          onClick={() => toggleTask(entry.key)}
                        />
                        {selected && (
                          <div className="ml-7 mt-2 mb-3 grid sm:grid-cols-2 gap-2.5">
                            <BandFields
                              task={selected}
                              frequencyBands={catalog.frequencyBands}
                              durationBands={catalog.durationBands}
                              frequencyUnits={catalog.frequencyUnits}
                              onChange={(patch) => updateTask(entry.key, patch)}
                            />
                            {saved.systems.length > 0 && (
                              <div className="sm:col-span-2">
                                <p className="text-[#666] text-xs mb-1.5">
                                  Welche Programme brauchen Sie dafür?
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                  {saved.systems.map((system) => (
                                    <Chip
                                      key={system.id}
                                      label={system.name}
                                      active={selected.systemIds.includes(system.id)}
                                      onClick={() =>
                                        updateTask(entry.key, {
                                          systemIds: selected.systemIds.includes(system.id)
                                            ? selected.systemIds.filter((id) => id !== system.id)
                                            : [...selected.systemIds, system.id],
                                        })
                                      }
                                    />
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          ))}

          {/* Was im Katalog fehlt, trägt der Kunde selbst ein — sonst klickt er
              das Nächstbeste an, und die Rechnung stimmt nicht mehr. */}
          <div className="mb-6">
            <h3 className="text-[#888] text-xs font-semibold uppercase tracking-wider mb-2.5">
              Fehlt etwas?
            </h3>

            {customTasks.length > 0 && (
              <div className="space-y-3 mb-3">
                {customTasks.map((task) => (
                  <div
                    key={task.catalogKey}
                    className="rounded-xl border border-[#1a2840] bg-[#080d14] p-4"
                  >
                    <div className="flex items-start gap-2 mb-3">
                      <input
                        value={task.customLabel ?? ""}
                        onChange={(e) =>
                          updateTask(task.catalogKey, { customLabel: e.target.value })
                        }
                        placeholder="Welche Aufgabe? z. B. Wartungsprotokolle abtippen"
                        className="flex-1 px-3 py-2 rounded-lg bg-[#0c1520] border border-[#1a2840] text-[#f0f0f0] text-sm focus:outline-none focus:border-[#00b8ff]/50"
                      />
                      <button
                        type="button"
                        onClick={() => removeTask(task.catalogKey)}
                        title="Eintrag entfernen"
                        aria-label="Eintrag entfernen"
                        className="p-2 text-[#5b6b7f] hover:text-[#fca5a5] transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-2.5">
                      <Select
                        label="Welcher Bereich?"
                        value={task.customArea ?? catalog.taskAreas[0]}
                        options={catalog.taskAreas.map((area) => ({ key: area, label: area }))}
                        onChange={(value) => updateTask(task.catalogKey, { customArea: value })}
                      />
                      <div className="hidden sm:block" />
                      <BandFields
                        task={task}
                        frequencyBands={catalog.frequencyBands}
                        durationBands={catalog.durationBands}
                        frequencyUnits={catalog.frequencyUnits}
                        onChange={(patch) => updateTask(task.catalogKey, patch)}
                      />
                      {saved.systems.length > 0 && (
                        <div className="sm:col-span-2">
                          <p className="text-[#666] text-xs mb-1.5">
                            Welche Programme brauchen Sie dafür?
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {saved.systems.map((system) => (
                              <Chip
                                key={system.id}
                                label={system.name}
                                active={task.systemIds.includes(system.id)}
                                onClick={() =>
                                  updateTask(task.catalogKey, {
                                    systemIds: task.systemIds.includes(system.id)
                                      ? task.systemIds.filter((id) => id !== system.id)
                                      : [...task.systemIds, system.id],
                                  })
                                }
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={addCustomTask}
              disabled={
                customTasks.length >= catalog.maxCustomTasks || tasks.length >= catalog.maxTasks
              }
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[#1a2840] text-[#8899b4] text-sm hover:text-[#eef2f7] hover:border-[#2a3a55] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Plus size={14} />
              Eigene Aufgabe ergänzen
            </button>
            <p className="text-[#5b6b7f] text-xs mt-2">
              Bis zu {catalog.maxCustomTasks} eigene Einträge. Sie zählen genauso in die
              Zeitrechnung wie die Aufgaben aus der Liste.
            </p>
          </div>

          <Footer
            hint={
              tasksIncomplete
                ? "Bitte die eigenen Einträge noch vervollständigen"
                : `${tasks.length} von ${catalog.maxTasks} gewählt`
            }
            onBack={() => setStep(0)}
            nextDisabled={tasks.length === 0 || tasksIncomplete || pending}
            pending={pending}
            onNext={() => run(() => saveTasks(sessionId, tasks), () => setStep(2))}
          />
        </Panel>
      )}

      {step === 2 && currentFlow && (
        <Panel
          title={currentFlow.title}
          lede="Gehen wir diesen Ablauf einmal durch. Für jede Station: wer macht das, womit, und wie viel davon läuft von Hand. Was es bei Ihnen nicht gibt, setzen Sie auf „entfällt“."
          help={
            <QuestionHelp
              sessionId={sessionId}
              hintEnabled={(stations[currentFlow.catalogKey]?.length ?? 0) === 0}
              activityKey={`${currentFlow.catalogKey}:${stations[currentFlow.catalogKey]?.length ?? 0}`}
              topic={{
                topicTitle: `Ablauf: ${currentFlow.title}`,
                topicHint:
                  "Für jede Station im Ablauf wird angegeben, wer sie macht, mit welchem Programm, und wie weit sie von Hand läuft. Stationen, die es im Betrieb nicht gibt, werden auf „entfällt bei uns“ gesetzt. Kommt ein Programm zum Einsatz, das oben nicht genannt wurde, lässt es sich unter „anderes Programm“ eintragen.",
                topicOptions: catalog.stations.map((station) => `${station.label} — ${station.hint}`),
              }}
            />
          }
        >
          <div className="space-y-3">
            {catalog.stations.map((station) => {
              const value = stationValue(currentFlow.catalogKey, station.key);
              const disabled = value.mode === "none";
              return (
                <div
                  key={station.key}
                  className="rounded-xl border border-[#1a2840] bg-[#080d14] p-4"
                >
                  <p className="text-[#f0f0f0] text-sm font-medium">{station.label}</p>
                  <p className="text-[#666] text-xs mt-0.5 mb-3">{station.hint}</p>

                  <div className="grid sm:grid-cols-3 gap-2.5">
                    <div>
                      <p className="text-[#666] text-xs mb-1.5">Wer?</p>
                      <input
                        value={value.role ?? ""}
                        disabled={disabled}
                        onChange={(e) =>
                          updateStation(currentFlow.catalogKey, station.key, {
                            role: e.target.value,
                          })
                        }
                        placeholder="z. B. Büro"
                        className="w-full px-3 py-2 rounded-lg bg-[#0c1520] border border-[#1a2840] text-[#f0f0f0] text-sm disabled:opacity-40 focus:outline-none focus:border-[#00b8ff]/50"
                      />
                    </div>
                    <div>
                      <p className="text-[#666] text-xs mb-1.5">Womit?</p>
                      <select
                        value={
                          value.system?.startsWith(OTHER_SYSTEM_PREFIX)
                            ? OTHER_SYSTEM_KEY
                            : value.system ?? ""
                        }
                        disabled={disabled}
                        onChange={(e) =>
                          updateStation(currentFlow.catalogKey, station.key, {
                            system:
                              e.target.value === OTHER_SYSTEM_KEY
                                ? OTHER_SYSTEM_PREFIX
                                : e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 rounded-lg bg-[#0c1520] border border-[#1a2840] text-[#f0f0f0] text-sm disabled:opacity-40 focus:outline-none focus:border-[#00b8ff]/50"
                      >
                        <option value="">bitte wählen</option>
                        {systemChoices.map((choice) => (
                          <option key={choice.key} value={choice.key}>
                            {choice.label}
                          </option>
                        ))}
                        <option value={OTHER_SYSTEM_KEY}>anderes Programm — welches?</option>
                      </select>
                      {value.system?.startsWith(OTHER_SYSTEM_PREFIX) && (
                        <input
                          value={value.system.slice(OTHER_SYSTEM_PREFIX.length)}
                          disabled={disabled}
                          onChange={(e) =>
                            updateStation(currentFlow.catalogKey, station.key, {
                              system: `${OTHER_SYSTEM_PREFIX}${e.target.value}`,
                            })
                          }
                          placeholder="Name des Programms"
                          className="mt-2 w-full px-3 py-2 rounded-lg bg-[#080d14] border border-[#1a2840] text-[#f0f0f0] text-sm disabled:opacity-40 focus:outline-none focus:border-[#00b8ff]/50"
                        />
                      )}
                    </div>
                    <div>
                      <p className="text-[#666] text-xs mb-1.5">Wie?</p>
                      <select
                        value={value.mode}
                        onChange={(e) =>
                          updateStation(currentFlow.catalogKey, station.key, {
                            mode: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 rounded-lg bg-[#0c1520] border border-[#1a2840] text-[#f0f0f0] text-sm focus:outline-none focus:border-[#00b8ff]/50"
                      >
                        {catalog.stationModes.map((mode) => (
                          <option key={mode.key} value={mode.key}>
                            {mode.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <Footer
            hint={`Ablauf ${flowIndex + 1} von ${plannedFlows.length}`}
            onBack={() => (flowIndex > 0 ? setFlowIndex(flowIndex - 1) : setStep(1))}
            nextDisabled={pending}
            pending={pending}
            nextLabel={flowIndex + 1 < plannedFlows.length ? "Weiter" : "Abschließen"}
            onNext={() =>
              run(
                () =>
                  saveFlow(sessionId, {
                    catalogKey: currentFlow.catalogKey,
                    title: currentFlow.title,
                    position: currentFlow.position,
                    stations: catalog.stations.map((station) =>
                      stationValue(currentFlow.catalogKey, station.key)
                    ),
                  }),
                () => {
                  if (flowIndex + 1 < plannedFlows.length) {
                    setFlowIndex(flowIndex + 1);
                  } else {
                    void completePillar3(sessionId);
                  }
                }
              )
            }
          />
        </Panel>
      )}
    </div>
  );
}

// ─── Bausteine ───────────────────────────────────────────────────────────────

function Progress({
  step,
  flowIndex,
  flowCount,
}: {
  step: number;
  flowIndex: number;
  flowCount: number;
}) {
  const labels = ["Programme", "Aufgaben", "Abläufe"];
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-2">
        {labels.map((label, index) => (
          <div key={label} className="flex items-center gap-2 flex-1">
            <div
              className={`h-1 flex-1 rounded-full transition-colors ${
                index < step ? "bg-[#22c55e]" : index === step ? "bg-[#00b8ff]" : "bg-[#1a2840]"
              }`}
            />
          </div>
        ))}
      </div>
      <p className="text-[#888] text-xs">
        <span className="text-[#f0f0f0] font-medium">{labels[step]}</span>
        {step === 2 && flowCount > 1 && ` · ${flowIndex + 1} von ${flowCount}`}
      </p>
    </div>
  );
}

function Panel({
  title,
  lede,
  help,
  children,
}: {
  title: string;
  lede: string;
  help?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-[#0c1520] border border-[#1a2840] rounded-2xl p-6">
      <h2 className="text-[#f0f0f0] text-lg font-bold mb-1.5">{title}</h2>
      <p className="text-[#888] text-sm leading-relaxed mb-3">{lede}</p>
      {help && <div className="mb-5">{help}</div>}
      {children}
    </div>
  );
}

function Choice({
  label,
  checked,
  disabled,
  onClick,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg border text-left transition-colors ${
        checked
          ? "border-[#00b8ff]/40 bg-[rgba(0,184,255,0.08)]"
          : disabled
            ? "border-[#141f31] opacity-40 cursor-not-allowed"
            : "border-[#1a2840] hover:border-[#2a3a55]"
      }`}
    >
      <span
        className={`w-[18px] h-[18px] rounded flex-shrink-0 border flex items-center justify-center ${
          checked ? "bg-[#00b8ff] border-[#00b8ff]" : "border-[#2a3a55]"
        }`}
      >
        {checked && <Check size={12} className="text-[#041018]" strokeWidth={3} />}
      </span>
      <span className="text-[#c9d4e4] text-sm">{label}</span>
    </button>
  );
}

function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-2.5 py-1.5 rounded-lg border text-xs transition-colors ${
        active
          ? "border-[#00b8ff]/40 bg-[rgba(0,184,255,0.12)] text-[#00b8ff]"
          : "border-[#1a2840] text-[#888] hover:text-[#c9d4e4]"
      }`}
    >
      {label}
    </button>
  );
}

/**
 * Häufigkeit und Dauer — mit Ausweg.
 *
 * Die Bänder decken den Alltag ab, aber nicht alles: Manches fällt einmal im
 * Quartal an oder dauert genau 7 Minuten. Wer „Andere Angabe" wählt, nennt
 * eine Zahl mit Einheit; eingeordnet wird sie von uns.
 */
function BandFields({
  task,
  frequencyBands,
  durationBands,
  frequencyUnits,
  onChange,
}: {
  task: TaskState;
  frequencyBands: Band[];
  durationBands: Band[];
  frequencyUnits: Array<{ key: string; label: string; perWeek: number }>;
  onChange: (patch: Partial<TaskState>) => void;
}) {
  const customFrequency = task.frequencyBand === CUSTOM_FREQUENCY_KEY;
  const customDuration = task.durationBand === CUSTOM_DURATION_KEY;

  return (
    <>
      <div>
        <Select
          label="Wie oft?"
          value={task.frequencyBand}
          options={[
            ...frequencyBands,
            { key: CUSTOM_FREQUENCY_KEY, label: "Andere Angabe…" },
          ]}
          onChange={(value) =>
            onChange(
              value === CUSTOM_FREQUENCY_KEY
                ? {
                    frequencyBand: value,
                    frequencyUnit: task.frequencyUnit ?? "year",
                    frequencyCount: task.frequencyCount ?? 1,
                  }
                : { frequencyBand: value, frequencyCount: undefined, frequencyUnit: undefined }
            )
          }
        />
        {customFrequency && (
          <div className="mt-2 flex items-center gap-2">
            <input
              type="number"
              min={1}
              step="1"
              value={task.frequencyCount ?? ""}
              onChange={(e) => onChange({ frequencyCount: Number(e.target.value) })}
              placeholder="Anzahl"
              className="w-24 px-3 py-2 rounded-lg bg-[#0c1520] border border-[#1a2840] text-[#f0f0f0] text-sm focus:outline-none focus:border-[#00b8ff]/50"
            />
            <select
              value={task.frequencyUnit ?? "year"}
              onChange={(e) => onChange({ frequencyUnit: e.target.value })}
              className="flex-1 px-3 py-2 rounded-lg bg-[#0c1520] border border-[#1a2840] text-[#f0f0f0] text-sm focus:outline-none focus:border-[#00b8ff]/50"
            >
              {frequencyUnits.map((unit) => (
                <option key={unit.key} value={unit.key}>
                  {unit.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div>
        <Select
          label="Wie lange jedes Mal?"
          value={task.durationBand}
          options={[...durationBands, { key: CUSTOM_DURATION_KEY, label: "Andere Angabe…" }]}
          onChange={(value) =>
            onChange(
              value === CUSTOM_DURATION_KEY
                ? { durationBand: value, durationMinutes: task.durationMinutes ?? 20 }
                : { durationBand: value, durationMinutes: undefined }
            )
          }
        />
        {customDuration && (
          <div className="mt-2 flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={480}
              step="1"
              value={task.durationMinutes ?? ""}
              onChange={(e) => onChange({ durationMinutes: Number(e.target.value) })}
              placeholder="Minuten"
              className="w-24 px-3 py-2 rounded-lg bg-[#0c1520] border border-[#1a2840] text-[#f0f0f0] text-sm focus:outline-none focus:border-[#00b8ff]/50"
            />
            <span className="text-[#5b6b7f] text-xs">Minuten je Vorgang</span>
          </div>
        )}
      </div>
    </>
  );
}

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ key: string; label: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <p className="text-[#666] text-xs mb-1.5">{label}</p>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-lg bg-[#0c1520] border border-[#1a2840] text-[#f0f0f0] text-sm focus:outline-none focus:border-[#00b8ff]/50"
      >
        {options.map((option) => (
          <option key={option.key} value={option.key}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function Footer({
  hint,
  onBack,
  onNext,
  nextDisabled,
  nextLabel = "Weiter",
  pending,
}: {
  hint: string;
  onBack?: () => void;
  onNext: () => void;
  nextDisabled: boolean;
  nextLabel?: string;
  pending: boolean;
}) {
  return (
    <div className="mt-6 pt-5 border-t border-[#1a2840] flex flex-wrap items-center gap-3">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#1a2840] text-[#888] text-sm hover:text-[#f0f0f0] transition-colors"
        >
          <ChevronLeft size={14} /> Zurück
        </button>
      )}
      <span className="text-[#666] text-xs">{hint}</span>
      <span className="flex-1" />
      <button
        type="button"
        onClick={onNext}
        disabled={nextDisabled}
        className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-[#00b8ff] text-[#041018] text-sm font-bold disabled:bg-[#16283d] disabled:text-[#4a5a70] disabled:cursor-not-allowed hover:bg-[#0099d6] transition-colors"
      >
        {pending && <Loader2 size={14} className="animate-spin" />}
        {nextLabel} <ChevronRight size={14} />
      </button>
    </div>
  );
}
