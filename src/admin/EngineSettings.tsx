import { useState } from "react";

import {
  DEFAULT_ENGINE_SETTINGS,
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

interface AdvancedSettingRowProps {
  label: string;
  icon?: string;
  valueA?: number;
  valueB?: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChangeA?: (value: number) => void;
  onChangeB?: (value: number) => void;
  globalValue?: number;
  onChangeGlobal?: (value: number) => void;
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function AdvancedSettingRow({
  label,
  icon = "⚙️",
  valueA,
  valueB,
  min,
  max,
  step,
  unit,
  onChangeA,
  onChangeB,
  globalValue,
  onChangeGlobal,
}: AdvancedSettingRowProps) {
  const hasA = valueA !== undefined && onChangeA;
  const hasB = valueB !== undefined && onChangeB;
  const hasGlobal = globalValue !== undefined && onChangeGlobal;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_minmax(150px,190px)_minmax(0,1fr)] items-center gap-3 border-b ui-divider py-3 last:border-b-0">
      <div className="min-w-0">
        {hasA ? (
          <div className="flex items-center gap-2">
            <input
              aria-label={`${label} — Équipe A`}
              type="range"
              min={min}
              max={max}
              step={step}
              value={valueA}
              onChange={(event) => onChangeA?.(Number(event.target.value))}
              className="w-full accent-current"
            />
            <span className="ui-text-primary w-24 shrink-0 text-right text-[11px] font-black">
              {formatNumber(valueA)} {unit}
            </span>
          </div>
        ) : (
          <span className="ui-text-muted block text-center text-xs font-semibold">—</span>
        )}
      </div>

      <div className="min-w-0 text-center">
        <div className="ui-text-primary text-xs font-black sm:text-sm">
          {icon} {label}
        </div>

        {hasGlobal ? (
          <div className="mt-1 flex items-center justify-center gap-2">
            <input
              aria-label={label}
              type="range"
              min={min}
              max={max}
              step={step}
              value={globalValue}
              onChange={(event) => onChangeGlobal?.(Number(event.target.value))}
              className="w-full max-w-[120px] accent-current"
            />
            <span className="ui-text-primary w-24 shrink-0 text-right text-[11px] font-black">
              {formatNumber(globalValue)} {unit}
            </span>
          </div>
        ) : (
          <div className="ui-text-muted mt-0.5 text-[10px] font-semibold">
            {formatNumber(min)} {unit} → {formatNumber(max)} {unit}
          </div>
        )}
      </div>

      <div className="min-w-0">
        {hasB ? (
          <div className="flex items-center gap-2">
            <span className="ui-text-primary w-24 shrink-0 text-[11px] font-black">
              {formatNumber(valueB)} {unit}
            </span>
            <input
              aria-label={`${label} — Équipe B`}
              type="range"
              min={min}
              max={max}
              step={step}
              value={valueB}
              onChange={(event) => onChangeB?.(Number(event.target.value))}
              className="w-full accent-current"
            />
          </div>
        ) : (
          <span className="ui-text-muted block text-center text-xs font-semibold">—</span>
        )}
      </div>
    </div>
  );
}

export default function EngineSettings({
  open,
  onClose,
  onBack,
}: EngineSettingsProps) {
  const [settings, setSettings] = useState<EngineSettings>(() => getEngineSettings());
  const [showAdvanced, setShowAdvanced] = useState(false);

  if (!open) return null;

  function updateSetting(updater: (current: EngineSettings) => EngineSettings) {
    setSettings((current) => updater(current));
  }

  function updateAdvanced(key: keyof EngineSettings["advanced"], value: number) {
    updateSetting((current) => ({
      ...current,
      advanced: {
        ...current.advanced,
        [key]: value,
      },
    }));
  }

  function handleSave() {
    saveEngineSettings(settings);
  }

  function handleReset() {
    resetEngineSettings();
    setSettings(DEFAULT_ENGINE_SETTINGS);
  }

  const advanced = settings.advanced;

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
              <h2 id="engine-settings-title" className="ui-text-primary text-xl font-black">
                ⚙️ Réglages du moteur
              </h2>
              <p className="ui-text-secondary mt-1 text-xs sm:text-sm">
                Paramètres techniques réellement utilisés par le moteur
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
          <button
            type="button"
            onClick={() => setShowAdvanced((current) => !current)}
            className="ui-action flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition"
            aria-expanded={showAdvanced}
          >
            <span className="ui-text-primary text-sm font-black">
              {showAdvanced ? "▾" : "▸"} Réglages avancés
            </span>
            <span className="ui-text-muted text-[10px] font-semibold">
              Seuils et paramètres techniques
            </span>
          </button>

          {showAdvanced && (
            <div className="ui-panel-alt mt-3 rounded-2xl border px-4 sm:px-5">
              <AdvancedSettingRow
                icon="🛡️"
                label="Combats pour confiance maximale"
                valueA={advanced.historicalConfidenceBattles}
                min={1}
                max={20}
                step={1}
                unit="combats"
                onChangeA={(value) => updateAdvanced("historicalConfidenceBattles", value)}
              />

              <AdvancedSettingRow
                icon="🛡️"
                label="Base de fiabilité"
                valueA={advanced.historicalReliabilityBase}
                min={0}
                max={1}
                step={0.05}
                unit="×"
                onChangeA={(value) => updateAdvanced("historicalReliabilityBase", value)}
              />

              <AdvancedSettingRow
                icon="🛡️"
                label="Poids de la confiance"
                valueA={advanced.historicalReliabilityConfidenceWeight}
                min={0}
                max={1}
                step={0.05}
                unit="×"
                onChangeA={(value) =>
                  updateAdvanced("historicalReliabilityConfidenceWeight", value)
                }
              />

              <AdvancedSettingRow
                icon="🧩"
                label="Combats minimum pour valider un Core4"
                globalValue={advanced.core4MinBattles}
                min={1}
                max={20}
                step={1}
                unit="combats"
                onChangeGlobal={(value) => updateAdvanced("core4MinBattles", value)}
              />

              <AdvancedSettingRow
                icon="🧩"
                label="Combats minimum pour un remplacement"
                globalValue={advanced.core4MinReplacementBattles}
                min={1}
                max={20}
                step={1}
                unit="combats"
                onChangeGlobal={(value) =>
                  updateAdvanced("core4MinReplacementBattles", value)
                }
              />

              <AdvancedSettingRow
                icon="🧩"
                label="Combats pour confiance maximale du Core4"
                globalValue={advanced.core4ConfidenceBattles}
                min={1}
                max={20}
                step={1}
                unit="combats"
                onChangeGlobal={(value) => updateAdvanced("core4ConfidenceBattles", value)}
              />
            </div>
          )}

          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onBack}
              className="ui-action rounded-xl border px-4 py-2 text-sm font-black transition"
            >
              ← Retour
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="ui-action rounded-xl border px-4 py-2 text-sm font-black transition"
            >
              Réinitialiser
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="ui-primary rounded-xl px-4 py-2 text-sm font-black transition"
            >
              Enregistrer
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
