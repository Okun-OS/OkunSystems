"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import {
  completePillar3,
  saveFlow,
  saveSystems,
  saveTasks,
  type StationSelection,
} from "./actions";

/**
 * Die dritte Säule aus Kundensicht: Programme, Aufgaben, Abläufe.
 *
 * Durchgehend Auswahllisten. Wer nichts anklickt, kommt nicht weiter — aber
 * niemand muss formulieren, und die Auswertung weiß hinterher genau, was
 * gemeint war.
 */

type CatalogEntry = { key: string; label: string };
type SystemEntry = CatalogEntry & { category: string; needsName?: boolean; isNone?: boolean };
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
  };
  saved: {
    systems: Array<{
      id: string;
      catalogKey: string | null;
      name: string;
      purposes: string[];
      isCustom: boolean;
    }>;
    tasks: Array<{
      catalogKey: string;
      frequencyBand: string;
      durationBand: string;
      systemIds: string[];
    }>;
    flows: Array<{
      catalogKey: string;
      stations: Array<{ stationKey: string; role: string; system: string; mode: string }>;
    }>;
  };
  plannedFlows: Array<{ catalogKey: string; title: string; position: number }>;
};

type SystemState = { catalogKey: string; customName: string; purposes: string[] };
type TaskState = {
  catalogKey: string;
  frequencyBand: string;
  durationBand: string;
  systemIds: string[];
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
    }))
  );

  const [tasks, setTasks] = useState<TaskState[]>(() => saved.tasks);

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
        : [...prev, { catalogKey: key, customName: "", purposes: [] }]
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
          lede="Auch Papier, Excel und WhatsApp sind Werkzeuge — in der Praxis spielen sie genau diese Rolle. Wählen Sie anschließend aus, wofür Sie das jeweilige Programm einsetzen."
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
          lede={`Bis zu ${catalog.maxTasks} Einträge. Geben Sie danach an, wie oft und wie lange — daraus rechnen wir, wie viel Zeit im Monat dafür draufgeht.`}
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
                            <Select
                              label="Wie oft?"
                              value={selected.frequencyBand}
                              options={catalog.frequencyBands}
                              onChange={(value) =>
                                updateTask(entry.key, { frequencyBand: value })
                              }
                            />
                            <Select
                              label="Wie lange jedes Mal?"
                              value={selected.durationBand}
                              options={catalog.durationBands}
                              onChange={(value) =>
                                updateTask(entry.key, { durationBand: value })
                              }
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

          <Footer
            hint={`${tasks.length} von ${catalog.maxTasks} gewählt`}
            onBack={() => setStep(0)}
            nextDisabled={tasks.length === 0 || pending}
            pending={pending}
            onNext={() => run(() => saveTasks(sessionId, tasks), () => setStep(2))}
          />
        </Panel>
      )}

      {step === 2 && currentFlow && (
        <Panel
          title={currentFlow.title}
          lede="Gehen wir diesen Ablauf einmal durch. Für jede Station: wer macht das, womit, und wie viel davon läuft von Hand. Was es bei Ihnen nicht gibt, setzen Sie auf „entfällt“."
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
                        value={value.system ?? ""}
                        disabled={disabled}
                        onChange={(e) =>
                          updateStation(currentFlow.catalogKey, station.key, {
                            system: e.target.value,
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
                      </select>
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
  children,
}: {
  title: string;
  lede: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-[#0c1520] border border-[#1a2840] rounded-2xl p-6">
      <h2 className="text-[#f0f0f0] text-lg font-bold mb-1.5">{title}</h2>
      <p className="text-[#888] text-sm leading-relaxed mb-6">{lede}</p>
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
