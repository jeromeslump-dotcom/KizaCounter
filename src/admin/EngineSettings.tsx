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
          <input aria-label={`${title} — Équipe A`} type="range" min={limits.min} max={limits.max} step={limits.step} value={valueA} onChange={(event) => onChangeA(Number(event.target.value))} className="w-full accent-current" />
          <span className="ui-text-primary w-14 text-right text-xs font-black">{formatWeight(valueA)}</span>
        </div>
      </div>

      <div className="min-w-0 text-center">
        <div className="ui-text-primary text-xs font-black sm:text-sm">{icon} {title}</div>
        <div className="ui-text-muted mt-0.5 text-[10px] font-semibold">Poids actuel du moteur</div>
      </div>

      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="ui-text-primary w-14 text-xs font-black">{formatWeight(valueB)}</span>
          <input aria-label={`${title} — Équipe B`} type="range" min={limits.min} max={limits.max} step={limits.step} value={valueB} onChange={(event) => onChangeB(Number(event.target.value))} className="w-full accent-current" />
        </div>
      </div>
    </div>
  );
}

interface PointBudgetRowProps {
  icon: string;
  title: string;
  valueA: number;
  valueB: number;
  onChangeA: (value: number) => void;
  onChangeB: (value: number) => void;
}

function PointBudgetRow({ icon, title, valueA, valueB, onChangeA, onChangeB }: PointBudgetRowProps) {
  const limits = ENGINE_SETTING_LIMITS.points;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_minmax(150px,190px)_minmax(0,1fr)] items-center gap-3 border-b ui-divider py-4 last:border-b-0">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <input aria-label={`${title} — Équipe A`} type="range" min={limits.min} max={limits.max} step={limits.step} value={valueA} onChange={(event) => onChangeA(Number(event.target.value))} className="w-full accent-current" />
          <span className="ui-text-primary w-16 shrink-0 text-right text-xs font-black">{valueA} / 100</span>
        </div>
      </div>

      <div className="min-w-0 text-center">
        <div className="ui-text-primary text-xs font-black sm:text-sm">{icon} {title}</div>
        <div className="ui-text-muted mt-0.5 text-[10px] font-semibold">Budget maximum du module</div>
      </div>

      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="ui-text-primary w-16 shrink-0 text-xs font-black">{valueB} / 100</span>
          <input aria-label={`${title} — Équipe B`} type="range" min={limits.min} max={limits.max} step={limits.step} value={valueB} onChange={(event) => onChangeB(Number(event.target.value))} className="w-full accent-current" />
        </div>
      </div>
    </div>
  );
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

function AdvancedSettingRow({ label, icon = "⚙️", valueA, valueB, min, max, step, unit, onChangeA, onChangeB, globalValue, onChangeGlobal }: AdvancedSettingRowProps) {
  const hasA = valueA !== undefined && onChangeA;
  const hasB = valueB !== undefined && onChangeB;
  const hasGlobal = globalValue !== undefined && onChangeGlobal;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_minmax(150px,190px)_minmax(0,1fr)] items-center gap-3 border-b ui-divider py-3 last:border-b-0">
      <div className="min-w-0">
        {hasA ? (
          <div className="flex items-center gap-2">
            <input aria-label={`${label} — Équipe A`} type="range" min={min} max={max} step={step} value={valueA} onChange={(event) => onChangeA?.(Number(event.target.value))} className="w-full accent-current" />
            <span className="ui-text-primary w-24 shrink-0 text-right text-[11px] font-black">{formatNumber(valueA)} {unit}</span>
          </div>
        ) : <span className="ui-text-muted block text-center text-xs font-semibold">—</span>}
      </div>

      <div className="min-w-0 text-center">
        <div className="ui-text-primary text-xs font-black sm:text-sm">{icon} {label}</div>
        {hasGlobal ? (
          <div className="mt-1 flex items-center justify-center gap-2">
            <input aria-label={label} type="range" min={min} max={max} step={step} value={globalValue} onChange={(event) => onChangeGlobal?.(Number(event.target.value))} className="w-full max-w-[120px] accent-current" />
            <span className="ui-text-primary w-24 shrink-0 text-right text-[11px] font-black">{formatNumber(globalValue)} {unit}</span>
          </div>
        ) : <div className="ui-text-muted mt-0.5 text-[10px] font-semibold">{formatNumber(min)} {unit} → {formatNumber(max)} {unit}</div>}
      </div>

      <div className="min-w-0">
        {hasB ? (
          <div className="flex items-center gap-2">
            <span className="ui-text-primary w-24 shrink-0 text-[11px] font-black">{formatNumber(valueB)} {unit}</span>
            <input aria-label={`${label} — Équipe B`} type="range" min={min} max={max} step={step} value={valueB} onChange={(event) => onChangeB?.(Number(event.target.value))} className="w-full accent-current" />
          </div>
        ) : <span className="ui-text-muted block text-center text-xs font-semibold">—</span>}
      </div>
    </div>
  );
}

export default function EngineSettings({ open, onClose, onBack }: EngineSettingsProps) {
  const [settings, setSettings] = useState<EngineSettings>(() => getEngineSettings());
  const [showAdvanced, setShowAdvanced] = useState(false);

  const importantRows = useMemo(() => [
    { icon: "🎯", title: "Historique spécifique", a: "specificHistoryWeight" as const, b: "specificHistoryWeight" as const },
    { icon: "🧩", title: "Core4 historique", a: "core4Weight" as const, b: "core4Weight" as const },
    { icon: "📊", title: "Winrate général", a: "generalWinRateWeight" as const, b: "generalWinRateWeight" as const },
  ], []);

  const pointRows = useMemo(() => [
    { icon: "🎯", title: "Historique spécifique", a: "specificHistoryPoints" as const, b: "specificHistoryPoints" as const },
    { icon: "🧩", title: "Core4 historique", a: "core4Points" as const, b: "core4Points" as const },
    { icon: "📊", title: "Winrate général", a: "generalWinRatePoints" as const, b: "generalWinRatePoints" as const },
  ], []);

  if (!open) return null;

  function updateSetting(updater: (current: EngineSettings) => EngineSettings) {
    setSettings((current) => updater(current));
  }

  function updateImportant(team: "A" | "B", key: keyof EngineSettings["teamA"], value: number) {
    updateSetting((current) => ({ ...current, [team === "A" ? "teamA" : "teamB"]: { ...(team === "A" ? current.teamA : current.teamB), [key]: value } }));
  }

  function updateAdvanced(key: keyof EngineSettings["advanced"], value: number) {
    updateSetting((current) => ({ ...current, advanced: { ...current.advanced, [key]: value } }));
  }

  function handleSave() {
    saveEngineSettings(settings);
  }

  function handleReset() {
    resetEngineSettings();
    setSettings(DEFAULT_ENGINE_SETTINGS);
  }

  const advanced = settings.advanced;
  const limits = ENGINE_SETTING_LIMITS;
  const totalPointsA = settings.teamA.specificHistoryPoints + settings.teamA.core4Points + settings.teamA.generalWinRatePoints;
  const totalPointsB = settings.teamB.specificHistoryPoints + settings.teamB.core4Points + settings.teamB.generalWinRatePoints;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm sm:p-4" onClick={onClose} role="presentation">
      <section className="ui-modal max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-3xl border shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="engine-settings-title" onClick={(event) => event.stopPropagation()}>
        <header className="border-b ui-divider p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 id="engine-settings-title" className="ui-text-primary text-xl font-black">⚙️ Réglages du moteur</h2>
              <p className="ui-text-secondary mt-1 text-xs sm:text-sm">Configuration du moteur de recommandation</p>
            </div>
            <button type="button" onClick={onClose} className="ui-action flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border text-lg transition" aria-label="Fermer">✕</button>
          </div>
        </header>

        <div className="max-h-[68vh] overflow-y-auto p-4 sm:p-6">
          <div className="mb-4 grid grid-cols-[minmax(0,1fr)_minmax(150px,190px)_minmax(0,1fr)] gap-3 px-0.5">
            <div className="ui-text-primary text-sm font-black">Équipe A — Meilleure contre</div>
            <div className="ui-text-muted text-center text-[10px] font-black uppercase tracking-wider">Réglage</div>
            <div className="ui-text-primary text-right text-sm font-black">Équipe B — Analyse alternative</div>
          </div>

          <div className="ui-panel-alt rounded-2xl border px-4">
            {pointRows.map((row) => (
              <PointBudgetRow key={`points-${row.title}`} icon={row.icon} title={row.title} valueA={settings.teamA[row.a]} valueB={settings.teamB[row.b]} onChangeA={(value) => updateImportant("A", row.a, value)} onChangeB={(value) => updateImportant("B", row.b, value)} />
            ))}
          </div>

          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div className={`rounded-xl border px-4 py-3 text-sm font-black ${totalPointsA === 100 ? "ui-panel-alt" : "ui-action"}`}>
              Équipe A : <span>{totalPointsA} / 100 pts</span>
              {totalPointsA !== 100 && <span className="ml-2 text-xs font-semibold">⚠️ Ajuster le total</span>}
            </div>
            <div className={`rounded-xl border px-4 py-3 text-sm font-black ${totalPointsB === 100 ? "ui-panel-alt" : "ui-action"}`}>
              Équipe B : <span>{totalPointsB} / 100 pts</span>
              {totalPointsB !== 100 && <span className="ml-2 text-xs font-semibold">⚠️ Ajuster le total</span>}
            </div>
          </div>

          <div className="mt-6 mb-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-current opacity-10" />
            <span className="ui-text-muted text-[10px] font-black uppercase tracking-wider">Ancienne pondération — conservée temporairement</span>
            <div className="h-px flex-1 bg-current opacity-10" />
          </div>

          <div className="ui-panel-alt rounded-2xl border px-4">
            {importantRows.map((row) => (
              <ImportantSettingRow key={row.title} icon={row.icon} title={row.title} valueA={settings.teamA[row.a]} valueB={settings.teamB[row.b]} onChangeA={(value) => updateImportant("A", row.a, value)} onChangeB={(value) => updateImportant("B", row.b, value)} />
            ))}
          </div>

          <button type="button" onClick={() => setShowAdvanced((current) => !current)} className="ui-action mt-5 flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition" aria-expanded={showAdvanced}>
            <span className="ui-text-primary text-sm font-black">{showAdvanced ? "▾" : "▸"} Réglages avancés</span>
            <span className="ui-text-muted text-[10px] font-semibold">Paramètres techniques actuellement utilisés par le moteur</span>
          </button>

          {showAdvanced && (
            <div className="ui-panel-alt mt-3 rounded-2xl border px-4 sm:px-5">
              <AdvancedSettingRow icon="🧠" label="Bonus expérience par combat" globalValue={advanced.heroUsageExperiencePerBattle} min={limits.experiencePerBattle.min} max={limits.experiencePerBattle.max} step={limits.experiencePerBattle.step} unit="pt/combat" onChangeGlobal={(value) => updateAdvanced("heroUsageExperiencePerBattle", value)} />
              <AdvancedSettingRow icon="🔒" label="Plafond du bonus expérience" globalValue={advanced.heroUsageExperienceCap} min={0} max={50} step={1} unit="pt" onChangeGlobal={(value) => updateAdvanced("heroUsageExperienceCap", value)} />
              <AdvancedSettingRow icon="📈" label="Plafond du score d'utilisation" globalValue={advanced.heroUsageScoreCap} min={0} max={200} step={5} unit="pt" onChangeGlobal={(value) => updateAdvanced("heroUsageScoreCap", value)} />
              <AdvancedSettingRow icon="🎯" label="Multiplicateur winrate" valueA={advanced.teamACounterWinRateMultiplier} valueB={advanced.teamBCounterWinRateMultiplier} min={0} max={3} step={0.1} unit="×" onChangeA={(value) => updateAdvanced("teamACounterWinRateMultiplier", value)} onChangeB={(value) => updateAdvanced("teamBCounterWinRateMultiplier", value)} />
              <AdvancedSettingRow icon="🎯" label="Bonus par combat" valueA={advanced.teamACounterExperiencePerBattle} valueB={advanced.teamBCounterExperiencePerBattle} min={0} max={5} step={0.5} unit="pt/combat" onChangeA={(value) => updateAdvanced("teamACounterExperiencePerBattle", value)} onChangeB={(value) => updateAdvanced("teamBCounterExperiencePerBattle", value)} />
              <AdvancedSettingRow icon="🎯" label="Plafond bonus" valueA={advanced.teamACounterExperienceCap} valueB={advanced.teamBCounterExperienceCap} min={0} max={50} step={1} unit="pt" onChangeA={(value) => updateAdvanced("teamACounterExperienceCap", value)} onChangeB={(value) => updateAdvanced("teamBCounterExperienceCap", value)} />
              <AdvancedSettingRow icon="🛡️" label="Seuil minimum de fiabilité" valueA={advanced.teamAHistoricalReliabilityMin} min={0} max={100} step={5} unit="%" onChangeA={(value) => updateAdvanced("teamAHistoricalReliabilityMin", value)} />
              <AdvancedSettingRow icon="🛡️" label="Combats pour confiance maximale" valueA={advanced.teamAHistoricalConfidenceBattles} min={1} max={20} step={1} unit="combats" onChangeA={(value) => updateAdvanced("teamAHistoricalConfidenceBattles", value)} />
              <AdvancedSettingRow icon="🛡️" label="Base de fiabilité" valueA={advanced.teamAHistoricalReliabilityBase} min={0} max={1} step={0.05} unit="×" onChangeA={(value) => updateAdvanced("teamAHistoricalReliabilityBase", value)} />
              <AdvancedSettingRow icon="🛡️" label="Poids de la confiance" valueA={advanced.teamAHistoricalReliabilityConfidenceWeight} min={0} max={1} step={0.05} unit="×" onChangeA={(value) => updateAdvanced("teamAHistoricalReliabilityConfidenceWeight", value)} />
              <AdvancedSettingRow icon="🧩" label="Combats minimum pour valider un Core4" globalValue={advanced.core4MinBattles} min={1} max={20} step={1} unit="combats" onChangeGlobal={(value) => updateAdvanced("core4MinBattles", value)} />
              <AdvancedSettingRow icon="🧩" label="Combats minimum pour un remplacement" globalValue={advanced.core4MinReplacementBattles} min={1} max={20} step={1} unit="combats" onChangeGlobal={(value) => updateAdvanced("core4MinReplacementBattles", value)} />
              <AdvancedSettingRow icon="🧩" label="Combats pour confiance maximale Core4" globalValue={advanced.core4ConfidenceBattles} min={1} max={20} step={1} unit="combats" onChangeGlobal={(value) => updateAdvanced("core4ConfidenceBattles", value)} />
            </div>
          )}

          <div className="mt-4 flex items-center justify-between gap-3">
            <p className="ui-text-muted text-[10px] leading-relaxed">Les valeurs sont modifiées localement jusqu'à la sauvegarde.</p>
            <div className="flex shrink-0 items-center gap-2">
              <button type="button" onClick={handleSave} className="ui-action rounded-lg border px-3 py-2 text-xs font-bold transition">💾 Sauvegarder</button>
              <button type="button" onClick={handleReset} className="ui-action rounded-lg border px-3 py-2 text-xs font-bold transition">Réinitialiser</button>
            </div>
          </div>
        </div>

        <footer className="flex justify-end border-t ui-divider px-4 py-3 sm:px-5 sm:py-4">
          <button type="button" onClick={onBack} className="ui-action rounded-lg border px-4 py-2 text-xs font-bold transition">← Retour au Admin Panel</button>
        </footer>
      </section>
    </div>
  );
}
