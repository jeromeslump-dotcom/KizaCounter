import { useMemo, useState } from "react";

import {
  DEFAULT_ENGINE_SETTINGS,
  ENGINE_SETTING_LIMITS,
  getEngineSettings,
  resetEngineSettings,
  saveEngineSettings,
  type EngineSettings,
} from "../engine/engineSettings";

interface EngineSettingsProps {
  open: boolean;
  onClose: () => void;
  onBack: () => void;
}

interface ImportantSettingRowProps {
  icon: string;
  title: string;
  valueA: number;
  valueB: number;
  onChangeA: (value: number) => void;
  onChangeB: (value: number) => void;
}

function formatWeight(value: number): string {
  return `${Math.round(value * 100)} %`;
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function ImportantSettingRow({
  icon,
  title,
  valueA,
  valueB,
  onChangeA,
  onChangeB,
}: ImportantSettingRowProps) {
  const limits = ENGINE_SETTING_LIMITS.weight;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_minmax(150px,190px)_minmax(0,1fr)] items-center gap-3 border-b ui-divider py-4 last:border-b-0">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <input
            aria-label={`${title} — Équipe A`}
            type="range"
            min={limits.min}
            max={limits.max}
            step={limits.step}
            value={valueA}
            onChange={(event) => onChangeA(Number(event.target.value))}
            className="w-full accent-current"
          />
          <span className="ui-text-primary w-14 text-right text-xs font-black">
            {formatWeight(valueA)}
          </span>
        </div>
      </div>

      <div className="min-w-0 text-center">
        <div className="ui-text-primary text-xs font-black sm:text-sm">
          {icon} {title}
        </div>
        <div className="ui-text-muted mt-0.5 text-[10px] font-semibold">
          0 % → {formatWeight(limits.max)}
        </div>
      </div>

      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="ui-text-primary w-14 text-xs font-black">
            {formatWeight(valueB)}
          </span>
          <input
            aria-label={`${title} — Équipe B`}
            type="range"
            min={limits.min}
            max={limits.max}
            step={limits.step}
            value={valueB}
            onChange={(event) => onChangeB(Number(event.target.value))}
            className="w-full accent-current"
          />
        </div>
      </div>
    </div>
  );
}

interface AdvancedSettingRowProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (value: number) => void;
}

function AdvancedSettingRow({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: AdvancedSettingRowProps) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_minmax(120px,150px)_auto] items-center gap-3 py-2">
      <label className="ui-text-secondary text-xs font-semibold">{label}</label>
      <input
        aria-label={label}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full accent-current"
      />
      <span className="ui-text-primary w-28 text-right text-xs font-black">
        {formatNumber(value)} {unit} <span className="ui-text-muted font-normal">/ {formatNumber(max)}</span>
      </span>
    </div>
  );
}

export default function EngineSettings({
  open,
  onClose,
  onBack,
}: EngineSettingsProps) {
  const [settings, setSettings] = useState<EngineSettings>(() =>
    getEngineSettings()
  );
  const [showAdvanced, setShowAdvanced] = useState(false);

  const importantRows = useMemo(
    () => [
      {
        icon: "🎯",
        title: "Historique spécifique",
        a: "specificHistoryWeight" as const,
        b: "specificHistoryWeight" as const,
      },
      {
        icon: "🧩",
        title: "Core4 historique",
        a: "core4Weight" as const,
        b: "core4Weight" as const,
      },
      {
        icon: "📊",
        title: "Winrate général",
        a: "generalWinRateWeight" as const,
        b: "generalWinRateWeight" as const,
      },
      {
        icon: "📈",
        title: "Stats",
        a: "statsWeight" as const,
        b: "statsWeight" as const,
      },
    ],
    []
  );

  if (!open) return null;

  function updateSetting(
    updater: (current: EngineSettings) => EngineSettings
  ) {
    setSettings((current) => {
      const next = updater(current);
      saveEngineSettings(next);
      return next;
    });
  }

  function updateImportant(
    team: "A" | "B",
    key: keyof EngineSettings["teamA"],
    value: number
  ) {
    updateSetting((current) => ({
      ...current,
      [team === "A" ? "teamA" : "teamB"]: {
        ...(team === "A" ? current.teamA : current.teamB),
        [key]: value,
      },
    }));
  }

  function handleReset() {
    resetEngineSettings();
    setSettings(DEFAULT_ENGINE_SETTINGS);
  }

  const advanced = settings.advanced;
  const limits = ENGINE_SETTING_LIMITS;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm sm:p-4"
      onClick={onClose}
      role="presentation"
    >
      <section
        className="ui-modal max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-3xl border shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="engine-settings-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="border-b ui-divider p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2
                id="engine-settings-title"
                className="ui-text-primary text-xl font-black"
              >
                ⚙️ Réglages du moteur
              </h2>
              <p className="ui-text-secondary mt-1 text-xs sm:text-sm">
                Configuration du moteur de recommandation
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="ui-action flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border text-lg transition"
              aria-label="Fermer"
            >
              ✕
            </button>
          </div>
        </header>

        <div className="max-h-[68vh] overflow-y-auto p-4 sm:p-6">
          <div className="mb-4 grid grid-cols-[minmax(0,1fr)_minmax(150px,190px)_minmax(0,1fr)] gap-3 px-0.5">
            <div className="ui-text-primary text-sm font-black">
              Équipe A — Meilleure contre
            </div>
            <div className="ui-text-muted text-center text-[10px] font-black uppercase tracking-wider">
              Réglage
            </div>
            <div className="ui-text-primary text-right text-sm font-black">
              Équipe B — Analyse alternative
            </div>
          </div>

          <div className="ui-panel-alt rounded-2xl border px-4">
            {importantRows.map((row) => (
              <ImportantSettingRow
                key={row.title}
                icon={row.icon}
                title={row.title}
                valueA={settings.teamA[row.a]}
                valueB={settings.teamB[row.b]}
                onChangeA={(value) => updateImportant("A", row.a, value)}
                onChangeB={(value) => updateImportant("B", row.b, value)}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() => setShowAdvanced((current) => !current)}
            className="ui-action mt-5 flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition"
            aria-expanded={showAdvanced}
          >
            <span className="ui-text-primary text-sm font-black">
              {showAdvanced ? "▾" : "▸"} Réglages avancés
            </span>
            <span className="ui-text-muted text-[10px] font-semibold">
              Paramètres techniques actuellement utilisés par le moteur
            </span>
          </button>

          {showAdvanced && (
            <div className="ui-panel-alt mt-3 rounded-2xl border p-4 sm:p-5">
              <h3 className="ui-text-primary mb-3 text-sm font-black">
                Utilisation générale
              </h3>
              <AdvancedSettingRow
                label="Bonus expérience par combat"
                value={advanced.heroUsageExperiencePerBattle}
                min={limits.experiencePerBattle.min}
                max={limits.experiencePerBattle.max}
                step={limits.experiencePerBattle.step}
                unit="pt/combat"
                onChange={(value) =>
                  updateSetting((current) => ({
                    ...current,
                    advanced: {
                      ...current.advanced,
                      heroUsageExperiencePerBattle: value,
                    },
                  }))
                }
              />
              <AdvancedSettingRow
                label="Plafond du bonus expérience"
                value={advanced.heroUsageExperienceCap}
                min={0}
                max={50}
                step={1}
                unit="pt"
                onChange={(value) =>
                  updateSetting((current) => ({
                    ...current,
                    advanced: {
                      ...current.advanced,
                      heroUsageExperienceCap: value,
                    },
                  }))
                }
              />
              <AdvancedSettingRow
                label="Plafond du score d'utilisation"
                value={advanced.heroUsageScoreCap}
                min={0}
                max={200}
                step={5}
                unit="pt"
                onChange={(value) =>
                  updateSetting((current) => ({
                    ...current,
                    advanced: {
                      ...current.advanced,
                      heroUsageScoreCap: value,
                    },
                  }))
                }
              />

              <h3 className="ui-text-primary mb-3 mt-6 text-sm font-black">
                Historique spécifique — Équipe A
              </h3>
              <AdvancedSettingRow
                label="Multiplicateur winrate spécifique"
                value={advanced.teamACounterWinRateMultiplier}
                min={0}
                max={3}
                step={0.1}
                unit="×"
                onChange={(value) =>
                  updateSetting((current) => ({
                    ...current,
                    advanced: {
                      ...current.advanced,
                      teamACounterWinRateMultiplier: value,
                    },
                  }))
                }
              />
              <AdvancedSettingRow
                label="Bonus par combat spécifique"
                value={advanced.teamACounterExperiencePerBattle}
                min={0}
                max={5}
                step={0.5}
                unit="pt/combat"
                onChange={(value) =>
                  updateSetting((current) => ({
                    ...current,
                    advanced: {
                      ...current.advanced,
                      teamACounterExperiencePerBattle: value,
                    },
                  }))
                }
              />
              <AdvancedSettingRow
                label="Plafond bonus spécifique"
                value={advanced.teamACounterExperienceCap}
                min={0}
                max={50}
                step={1}
                unit="pt"
                onChange={(value) =>
                  updateSetting((current) => ({
                    ...current,
                    advanced: {
                      ...current.advanced,
                      teamACounterExperienceCap: value,
                    },
                  }))
                }
              />

              <h3 className="ui-text-primary mb-3 mt-6 text-sm font-black">
                Historique spécifique — Équipe B
              </h3>
              <AdvancedSettingRow
                label="Multiplicateur winrate spécifique"
                value={advanced.teamBCounterWinRateMultiplier}
                min={0}
                max={3}
                step={0.1}
                unit="×"
                onChange={(value) =>
                  updateSetting((current) => ({
                    ...current,
                    advanced: {
                      ...current.advanced,
                      teamBCounterWinRateMultiplier: value,
                    },
                  }))
                }
              />
              <AdvancedSettingRow
                label="Bonus par combat spécifique"
                value={advanced.teamBCounterExperiencePerBattle}
                min={0}
                max={5}
                step={0.5}
                unit="pt/combat"
                onChange={(value) =>
                  updateSetting((current) => ({
                    ...current,
                    advanced: {
                      ...current.advanced,
                      teamBCounterExperiencePerBattle: value,
                    },
                  }))
                }
              />
              <AdvancedSettingRow
                label="Plafond bonus spécifique"
                value={advanced.teamBCounterExperienceCap}
                min={0}
                max={50}
                step={1}
                unit="pt"
                onChange={(value) =>
                  updateSetting((current) => ({
                    ...current,
                    advanced: {
                      ...current.advanced,
                      teamBCounterExperienceCap: value,
                    },
                  }))
                }
              />

              <h3 className="ui-text-primary mb-3 mt-6 text-sm font-black">
                Fiabilité historique — Équipe A
              </h3>
              <AdvancedSettingRow
                label="Seuil minimum de fiabilité"
                value={advanced.teamAHistoricalReliabilityMin}
                min={0}
                max={100}
                step={5}
                unit="%"
                onChange={(value) =>
                  updateSetting((current) => ({
                    ...current,
                    advanced: {
                      ...current.advanced,
                      teamAHistoricalReliabilityMin: value,
                    },
                  }))
                }
              />
              <AdvancedSettingRow
                label="Combats pour confiance maximale"
                value={advanced.teamAHistoricalConfidenceBattles}
                min={1}
                max={20}
                step={1}
                unit="combats"
                onChange={(value) =>
                  updateSetting((current) => ({
                    ...current,
                    advanced: {
                      ...current.advanced,
                      teamAHistoricalConfidenceBattles: value,
                    },
                  }))
                }
              />
              <AdvancedSettingRow
                label="Base de fiabilité"
                value={advanced.teamAHistoricalReliabilityBase}
                min={0}
                max={1}
                step={0.05}
                unit="×"
                onChange={(value) =>
                  updateSetting((current) => ({
                    ...current,
                    advanced: {
                      ...current.advanced,
                      teamAHistoricalReliabilityBase: value,
                    },
                  }))
                }
              />
              <AdvancedSettingRow
                label="Poids de la confiance"
                value={advanced.teamAHistoricalReliabilityConfidenceWeight}
                min={0}
                max={1}
                step={0.05}
                unit="×"
                onChange={(value) =>
                  updateSetting((current) => ({
                    ...current,
                    advanced: {
                      ...current.advanced,
                      teamAHistoricalReliabilityConfidenceWeight: value,
                    },
                  }))
                }
              />

              <h3 className="ui-text-primary mb-3 mt-6 text-sm font-black">
                Core4 historique
              </h3>
              <AdvancedSettingRow
                label="Combats minimum pour valider un Core4"
                value={advanced.core4MinBattles}
                min={1}
                max={20}
                step={1}
                unit="combats"
                onChange={(value) =>
                  updateSetting((current) => ({
                    ...current,
                    advanced: {
                      ...current.advanced,
                      core4MinBattles: value,
                    },
                  }))
                }
              />
              <AdvancedSettingRow
                label="Combats minimum pour un remplacement"
                value={advanced.core4MinReplacementBattles}
                min={1}
                max={20}
                step={1}
                unit="combats"
                onChange={(value) =>
                  updateSetting((current) => ({
                    ...current,
                    advanced: {
                      ...current.advanced,
                      core4MinReplacementBattles: value,
                    },
                  }))
                }
              />
              <AdvancedSettingRow
                label="Combats pour confiance maximale Core4"
                value={advanced.core4ConfidenceBattles}
                min={1}
                max={20}
                step={1}
                unit="combats"
                onChange={(value) =>
                  updateSetting((current) => ({
                    ...current,
                    advanced: {
                      ...current.advanced,
                      core4ConfidenceBattles: value,
                    },
                  }))
                }
              />

              <h3 className="ui-text-primary mb-3 mt-6 text-sm font-black">
                Pénalités de classe — Équipe A
              </h3>
              <AdvancedSettingRow
                label="1er héros supplémentaire de même classe"
                value={advanced.teamAClassPenaltyFirst}
                min={0}
                max={100}
                step={1}
                unit="pt"
                onChange={(value) =>
                  updateSetting((current) => ({
                    ...current,
                    advanced: {
                      ...current.advanced,
                      teamAClassPenaltyFirst: value,
                    },
                  }))
                }
              />
              <AdvancedSettingRow
                label="À partir du 3e héros de même classe"
                value={advanced.teamAClassPenaltySecond}
                min={0}
                max={100}
                step={1}
                unit="pt"
                onChange={(value) =>
                  updateSetting((current) => ({
                    ...current,
                    advanced: {
                      ...current.advanced,
                      teamAClassPenaltySecond: value,
                    },
                  }))
                }
              />
              <AdvancedSettingRow
                label="À partir du 4e héros de même classe"
                value={advanced.teamAClassPenaltyThird}
                min={0}
                max={100}
                step={1}
                unit="pt"
                onChange={(value) =>
                  updateSetting((current) => ({
                    ...current,
                    advanced: {
                      ...current.advanced,
                      teamAClassPenaltyThird: value,
                    },
                  }))
                }
              />
            </div>
          )}

          <div className="mt-4 flex items-center justify-between gap-3">
            <p className="ui-text-muted text-[10px] leading-relaxed">
              Les valeurs initiales reprennent les coefficients actuellement utilisés par le moteur.
            </p>
            <button
              type="button"
              onClick={handleReset}
              className="ui-action shrink-0 rounded-lg border px-3 py-2 text-xs font-bold transition"
            >
              Réinitialiser
            </button>
          </div>
        </div>

        <footer className="flex justify-end border-t ui-divider px-4 py-3 sm:px-5 sm:py-4">
          <button
            type="button"
            onClick={onBack}
            className="ui-action rounded-lg border px-4 py-2 text-xs font-bold transition"
          >
            ← Retour au Admin Panel
          </button>
        </footer>
      </section>
    </div>
  );
}
