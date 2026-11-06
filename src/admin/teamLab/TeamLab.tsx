import { lazy, Suspense, useEffect, useState } from "react";
import TeamLabTabs from "./TeamLabTabs";
import type { TeamLabMode } from "./teamLabData";

const TeamLabZonesView = lazy(() => import("./TeamLabZonesView"));
const TeamLabTheoreticalView = lazy(() => import("./TeamLabTheoreticalView"));
const TeamGenerator = lazy(() => import("./TeamGenerator"));
const TeamGeneratorCustomization = lazy(() => import("./TeamGeneratorCustomization"));
const CounterGenerator = lazy(() => import("./CounterGenerator"));

interface TeamLabProps {
  open: boolean;
  onClose: () => void;
  onBack: () => void;
  enabledHeroIds: Set<string>;
}

export default function TeamLab({
  open,
  onClose,
  onBack,
  enabledHeroIds,
}: TeamLabProps) {
  const [mode, setMode] = useState<TeamLabMode>("combats");
  const [requiredHeroIds, setRequiredHeroIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    setRequiredHeroIds((current) => {
      const next = new Set([...current].filter((heroId) => enabledHeroIds.has(heroId)));
      return next.size === current.size ? current : next;
    });
  }, [enabledHeroIds]);

  if (!open) return null;

  const stepLabel =
    mode === "combats" ? "1" :
    mode === "formations" ? "2" :
    mode === "theoretical" ? "3" :
    mode === "customization" ? "4" :
    mode === "generator" ? "5" : "6";

  const description =
    mode === "combats" ? "Répartition réelle des combats enregistrés dans les 20 zones" :
    mode === "formations" ? "Répartition réelle des formations enregistrées dans les 20 zones" :
    mode === "theoretical" ? "Distribution théorique des 5 461 512 formations possibles dans les 20 zones" :
    mode === "customization" ? "Sélection cumulative des héros obligatoires pour réduire le pool expérimental" :
    mode === "generator" ? "Génération d'équipes à partir de zones cibles et de relaxations progressives" :
    "Recherche d'un contre à partir des combats réels et génération d'une formation jamais testée";

  return (
    <div
      className="fixed inset-0 z-[75] flex items-center justify-center bg-black/75 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <section
        className="ui-modal flex h-screen w-screen flex-col overflow-hidden border shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="team-lab-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="ui-modal-header shrink-0 p-5 sm:p-6">
          <div className="ui-modal-header-inner">
            <div>
              <h2 id="team-lab-title" className="ui-text-primary text-xl font-black">
                🧪 Team Lab — Étape {stepLabel}
              </h2>
              <p className="ui-text-secondary mt-1 text-xs sm:text-sm">{description}</p>
            </div>
            <button type="button" onClick={onClose} className="ui-button-icon" aria-label="Fermer">✕</button>
          </div>
        </header>

        <div className="shrink-0 px-4 pt-4 sm:px-6 sm:pt-6">
          <TeamLabTabs mode={mode} onChange={setMode} />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
          <Suspense fallback={<div className="ui-text-muted py-12 text-center text-sm">Chargement de cette étape…</div>}>
            {mode === "generator" ? (
              <TeamGenerator enabledHeroIds={enabledHeroIds} requiredHeroIds={requiredHeroIds} />
            ) : mode === "counter" ? (
              <CounterGenerator enabledHeroIds={enabledHeroIds} requiredHeroIds={requiredHeroIds} />
            ) : mode === "customization" ? (
              <TeamGeneratorCustomization
                enabledHeroIds={enabledHeroIds}
                requiredHeroIds={requiredHeroIds}
                onRequiredChange={setRequiredHeroIds}
              />
            ) : mode === "theoretical" ? (
              <TeamLabTheoreticalView />
            ) : (
              <TeamLabZonesView mode={mode} />
            )}
          </Suspense>
        </div>

        <footer className="ui-modal-footer flex shrink-0 justify-between gap-2 px-4 py-3 sm:px-5 sm:py-4">
          <button type="button" onClick={onBack} className="ui-button">← Retour</button>
          <button type="button" onClick={onClose} className="ui-button">Fermer</button>
        </footer>
      </section>
    </div>
  );
}
