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
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (value: number) => void;
}

type EngineSettingsTab = "team" | "history" | "core4";

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function AdvancedSettingRow({
  label,
  icon = "⚙️",
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: AdvancedSettingRowProps) {
  return (
    <div className="border-b ui-divider py-4 last:border-b-0">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-6">
        <div className="ui-text-primary flex min-w-0 items-center gap-2 text-xs font-black sm:w-[320px] sm:shrink-0 sm:text-sm">
          <span>{icon}</span>
          <span>{label}</span>
        </div>

        <div className="flex min-w-0 flex-1 items-center gap-3">
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
          <span className="ui-text-primary w-24 shrink-0 text-right text-[11px] font-black">
            {formatNumber(value)} {unit}
          </span>
        </div>
      </div>

      <div className="ui-text-muted mt-1 text-[10px] font-semibold sm:ml-[344px]">
        {formatNumber(min)} {unit} → {formatNumber(max)} {unit}
      </div>
    </div>
  );
}

interface SettingsTabProps {
  icon: string;
  title: string;
  description: string;
  active: boolean;
  onClick: () => void;
}

function SettingsTab({
  icon,
  title,
  description,
  active,
  onClick,
}: SettingsTabProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-selected={active}
      className={`ui-card ${active ? "is-active" : ""} w-full rounded-xl p-4 text-left transition hover:scale-[1.01]`}
    >
      <span className="flex items-start gap-3">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ui-divider text-lg"
          aria-hidden="true"
        >
          {icon}
        </span>
        <span className="min-w-0">
          <span className="ui-text-primary block text-sm font-black">
            {title}
          </span>
          <span className="ui-text-secondary mt-1 block text-xs leading-relaxed">
            {description}
          </span>
        </span>
      </span>
    </button>
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
  const [activeTab, setActiveTab] = useState<EngineSettingsTab>("team");

  if (!open) return null;

  function updateSetting(updater: (current: EngineSettings) => EngineSettings) {
    setSettings((current) => updater(current));
  }

  function updateAdvanced(
    key: keyof EngineSettings["advanced"],
    value: number
  ) {
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
      className="ui-modal-overlay fixed inset-0 z-[70] flex items-center justify-center p-3 backdrop-blur-sm sm:p-4"
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
        <header className="ui-modal-header p-5 sm:p-6">
          <div className="ui-modal-header-inner">
            <div>
              <h2
                id="engine-settings-title"
                className="ui-text-primary text-xl font-black"
              >
                ⚙️ Réglages du moteur
              </h2>
              <p className="ui-text-secondary mt-1 text-xs sm:text-sm">
                Paramètres techniques réellement utilisés par le moteur
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="ui-button-icon"
              aria-label="Fermer"
            >
              ✕
            </button>
          </div>
        </header>

        <div className="max-h-[68vh] overflow-y-auto p-4 sm:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start">
            <nav
              className="flex w-full shrink-0 flex-col gap-2 md:w-56"
              aria-label="Catégories des réglages du moteur"
            >
              <SettingsTab
                icon="🎯"
                title="Team historique"
                description="Seuils d'éligibilité"
                active={activeTab === "team"}
                onClick={() => setActiveTab("team")}
              />
              <SettingsTab
                icon="🛡️"
                title="Historique"
                description="Confiance et fiabilité"
                active={activeTab === "history"}
                onClick={() => setActiveTab("history")}
              />
              <SettingsTab
                icon="🧩"
                title="Core4"
                description="Paramètres spécifiques"
                active={activeTab === "core4"}
                onClick={() => setActiveTab("core4")}
              />
            </nav>

            <div className="ui-panel-alt min-w-0 flex-1 rounded-2xl border px-4 sm:px-5">
              {activeTab === "team" && (
                <>
                  <AdvancedSettingRow
                    icon="🎯"
                    label="Combats minimum requis pour une team historique"
                    value={advanced.historicalTeamMinBattles}
                    min={1}
                    max={100}
                    step={1}
                    unit="combats"
                    onChange={(value) =>
                      updateAdvanced("historicalTeamMinBattles", value)
                    }
                  />

                  <AdvancedSettingRow
                    icon="🎯"
                    label="Taux de victoire minimum d’une team historique"
                    value={advanced.historicalTeamMinWinRate}
                    min={0}
                    max={100}
                    step={1}
                    unit="%"
                    onChange={(value) =>
                      updateAdvanced("historicalTeamMinWinRate", value)
                    }
                  />
                </>
              )}

              {activeTab === "history" && (
                <>
                  <AdvancedSettingRow
                    icon="🛡️"
                    label="Combats pour confiance maximale"
                    value={advanced.historicalConfidenceBattles}
                    min={1}
                    max={20}
                    step={1}
                    unit="combats"
                    onChange={(value) =>
                      updateAdvanced("historicalConfidenceBattles", value)
                    }
                  />

                  <AdvancedSettingRow
                    icon="🛡️"
                    label="Base de fiabilité"
                    value={advanced.historicalReliabilityBase}
                    min={0}
                    max={1}
                    step={0.05}
                    unit="×"
                    onChange={(value) =>
                      updateAdvanced("historicalReliabilityBase", value)
                    }
                  />

                  <AdvancedSettingRow
                    icon="🛡️"
                    label="Poids de la confiance"
                    value={advanced.historicalReliabilityConfidenceWeight}
                    min={0}
                    max={1}
                    step={0.05}
                    unit="×"
                    onChange={(value) =>
                      updateAdvanced(
                        "historicalReliabilityConfidenceWeight",
                        value
                      )
                    }
                  />
                </>
              )}

              {activeTab === "core4" && (
                <>
                  <AdvancedSettingRow
                    icon="🧩"
                    label="Combats pour confiance maximale du Core4"
                    value={advanced.core4ConfidenceBattles}
                    min={1}
                    max={20}
                    step={1}
                    unit="combats"
                    onChange={(value) =>
                      updateAdvanced("core4ConfidenceBattles", value)
                    }
                  />
                </>
              )}
            </div>
          </div>

          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={onBack} className="ui-button">
              ← Retour au Admin Panel
            </button>
            <button type="button" onClick={handleReset} className="ui-button">
              Réinitialiser
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="ui-button ui-button-success"
            >
              Enregistrer
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
