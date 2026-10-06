import { useEffect, useMemo, useState } from "react";
import { HEROES, type Hero } from "../../data/heroes";
import type { Combat, HeroClassFilter, HeroSort } from "../../types";
import { calculateHeroUsage } from "../../engine/historicalScoring";
import { teamKey } from "../../engine/teamUtils";
import { addCombat } from "../../storage/combatStorage";
import { loadTeamOrders, type TeamOrder } from "../../storage/teamOrderStorage";
import HeroListItem from "../../components/HeroListItem";
import AnalysisHelpEnemySelection from "../AnalysisHelpEnemySelection";
import {
  analyzeTeamByPosition,
  applyKnownTeamOrders,
  buildNeverTestedTeamCandidates,
  type PositionHeroRanking,
} from "./teamByPositionAnalysis";

interface TeamByPositionProps {
  open: boolean;
  onClose: () => void;
  onBack: () => void;
  combats: Combat[];
}

const POSITION_LABELS = [
  "Position 1",
  "Position 2",
  "Position 3",
  "Position 4",
  "Position 5",
];

const STEP_LABELS = [
  "1 · Classement des héros",
  "2 · Équipe ennemie",
  "3 · Équipes jamais testées",
];

function formatScore(score: number): string {
  return score > 0 ? `+${score}` : String(score);
}

function HeroStrip({ ids }: { ids: string[] }) {
  const heroesById = new Map(HEROES.map((hero) => [hero.id, hero]));

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
      {ids.map((id) => {
        const hero = heroesById.get(id);
        return hero ? (
          <div key={id} className="ui-panel rounded-lg border p-2 text-center">
            <HeroListItem hero={hero} size="standard" />
          </div>
        ) : null;
      })}
    </div>
  );
}

export default function TeamByPosition({
  open,
  onClose,
  onBack,
  combats,
}: TeamByPositionProps) {
  const [step, setStep] = useState(1);
  const [position, setPosition] = useState(0);
  const [teamOrders, setTeamOrders] = useState<Map<string, string[]>>(new Map());
  const [teamOrdersLoading, setTeamOrdersLoading] = useState(true);
  const [enemyIds, setEnemyIds] = useState<string[]>([]);
  const [activeClass, setActiveClass] = useState<HeroClassFilter>("ALL");
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<HeroSort>("played");
  const [savingTeamKey, setSavingTeamKey] = useState<string | null>(null);
  const [recordedTeamKeys, setRecordedTeamKeys] = useState<Set<string>>(
    new Set()
  );

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    setStep(1);
    setEnemyIds([]);
    setActiveClass("ALL");
    setQuery("");
    setSortBy("played");
    setRecordedTeamKeys(new Set());
    setTeamOrdersLoading(true);
    setTeamOrders(new Map());

    async function loadOrders() {
      try {
        const orders = await loadTeamOrders();

        if (!cancelled) {
          setTeamOrders(
            new Map(
              orders.map((order: TeamOrder) => [
                order.team_key,
                order.ordered_hero_ids,
              ])
            )
          );
        }
      } catch (error) {
        console.error(
          "Impossible de charger les ordres connus pour Team par position :",
          error
        );

        if (!cancelled) setTeamOrders(new Map());
      } finally {
        if (!cancelled) setTeamOrdersLoading(false);
      }
    }

    void loadOrders();

    return () => {
      cancelled = true;
    };
  }, [open]);

  const orderedCombats = useMemo(
    () =>
      teamOrdersLoading ? [] : applyKnownTeamOrders(combats, teamOrders),
    [combats, teamOrders, teamOrdersLoading]
  );

  const analysis = useMemo(
    () => analyzeTeamByPosition(orderedCombats),
    [orderedCombats]
  );

  const heroUsage = useMemo(() => {
    const usage = calculateHeroUsage(combats, HEROES);
    const result: Record<string, number> = {};

    for (const [id, value] of Object.entries(usage)) {
      result[id] = value.total;
    }

    return result;
  }, [combats]);

  const selectedEnemies = useMemo(
    () =>
      enemyIds
        .map((id) => HEROES.find((hero) => hero.id === id))
        .filter((hero): hero is Hero => Boolean(hero)),
    [enemyIds]
  );

  const matchingOrderedCombats = useMemo(
    () =>
      enemyIds.length === 5
        ? orderedCombats.filter(
            (combat) => teamKey(combat.enemy_heroes) === teamKey(enemyIds)
          )
        : [],
    [enemyIds, orderedCombats]
  );

  const candidates = useMemo(
    () =>
      buildNeverTestedTeamCandidates(
        matchingOrderedCombats,
        analysis.rankings
      ).filter((candidate) => !recordedTeamKeys.has(teamKey(candidate.teamIds))),
    [analysis.rankings, matchingOrderedCombats, recordedTeamKeys]
  );

  const candidateGroups = useMemo(() => {
    const groups = new Map<
      string,
      {
        baseTeamIds: string[];
        position: number;
        lostHeroId: string;
        candidates: typeof candidates;
      }
    >();

    for (const candidate of candidates) {
      const baseTeamIds = [...candidate.teamIds];
      baseTeamIds[candidate.position] = candidate.lostHeroId;
      const key = `${baseTeamIds.join("|")}::${candidate.position}`;
      const group = groups.get(key);

      if (group) {
        group.candidates.push(candidate);
      } else {
        groups.set(key, {
          baseTeamIds,
          position: candidate.position,
          lostHeroId: candidate.lostHeroId,
          candidates: [candidate],
        });
      }
    }

    return [...groups.values()];
  }, [candidates]);

  const toggleEnemy = (hero: Hero) => {
    setEnemyIds((current) => {
      if (current.includes(hero.id)) {
        setStep(2);
        return current.filter((id) => id !== hero.id);
      }

      if (current.length >= 5) return current;

      const next = [...current, hero.id];
      if (next.length === 5) setStep(3);
      return next;
    });
  };

  const clearEnemies = () => {
    setEnemyIds([]);
    setStep(2);
  };

  async function recordResult(teamIds: string[], won: boolean) {
    const key = teamKey(teamIds);
    if (savingTeamKey === key) return;

    setSavingTeamKey(key);

    try {
      await addCombat({
        enemy_heroes: enemyIds,
        my_heroes: teamIds,
        won,
      });

      setRecordedTeamKeys((current) => {
        const next = new Set(current);
        next.add(key);
        return next;
      });
    } catch (error) {
      console.error("Erreur enregistrement résultat équipe proposée :", error);
    } finally {
      setSavingTeamKey(null);
    }
  }

  if (!open) return null;

  const rankings = analysis.rankings[position];

  const heroName = (heroId: string) =>
    HEROES.find((hero) => hero.id === heroId)?.name ?? heroId;

  const canOpenStep3 = enemyIds.length === 5;

  return (
    <div
      className="fixed inset-0 z-[75] flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm sm:p-4"
      onClick={onClose}
      role="presentation"
    >
      <section
        className="ui-modal flex h-full max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="team-by-position-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="ui-modal-header shrink-0 p-5 sm:p-6">
          <div className="ui-modal-header-inner">
            <div>
              <h2
                id="team-by-position-title"
                className="ui-text-primary text-xl font-black"
              >
                🧪 Team par position
              </h2>
              <p className="ui-text-secondary mt-1 text-xs sm:text-sm">
                Classement des héros par position puis recherche d'équipes
                jamais testées contre une équipe ennemie.
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

        <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">
          <div className="ui-card mb-5 rounded-2xl border p-2">
            <div className="grid gap-1 sm:grid-cols-3">
              {STEP_LABELS.map((label, index) => {
                const stepNumber = index + 1;
                const enabled = stepNumber !== 3 || canOpenStep3;

                return (
                  <button
                    key={label}
                    type="button"
                    disabled={!enabled}
                    onClick={() => setStep(stepNumber)}
                    className={
                      step === stepNumber
                        ? "ui-button-sm ui-button-primary"
                        : "ui-button-sm"
                    }
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {step === 1 ? (
            <>
              <div className="mb-4 grid gap-3 sm:grid-cols-3">
                <div className="ui-card rounded-2xl border p-4">
                  <div className="ui-text-muted text-[10px] font-black uppercase tracking-wide">
                    Combats analysés
                  </div>
                  <div className="ui-text-primary mt-1 text-xl font-black">
                    {orderedCombats.length}
                  </div>
                </div>
                <div className="ui-card rounded-2xl border p-4">
                  <div className="ui-text-muted text-[10px] font-black uppercase tracking-wide">
                    Formations ordonnées
                  </div>
                  <div className="ui-text-primary mt-1 text-xl font-black">
                    {analysis.formations}
                  </div>
                </div>
                <div className="ui-card rounded-2xl border p-4">
                  <div className="ui-text-muted text-[10px] font-black uppercase tracking-wide">
                    Comparaisons strictes
                  </div>
                  <div className="ui-text-primary mt-1 text-xl font-black">
                    {analysis.comparisons}
                  </div>
                </div>
              </div>

              {teamOrdersLoading ? (
                <div className="ui-text-muted mb-4 rounded-xl border border-dashed p-4 text-center text-xs">
                  ⏳ Vérification des combats avec « ✓ Ordre connu »…
                </div>
              ) : null}

              <div className="ui-card rounded-2xl border p-4">
                <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
                  <div>
                    <h3 className="ui-text-primary text-base font-black">
                      {POSITION_LABELS[position]}
                    </h3>
                    <p className="ui-text-secondary mt-1 text-xs">
                      Les quatre autres héros doivent être identiques et dans
                      les mêmes positions. Seuls les combats avec « ✓ Ordre
                      connu » sont analysés.
                    </p>
                  </div>
                  <span className="ui-text-muted text-[10px]">
                    Score : victoire +1 · défaite -1 · égalité 0
                  </span>
                </div>

                <div className="ui-card mb-4 rounded-2xl border p-2">
                  <div className="grid grid-cols-5 gap-1">
                    {POSITION_LABELS.map((label, index) => (
                      <button
                        key={label}
                        type="button"
                        onClick={() => setPosition(index)}
                        className={
                          position === index
                            ? "ui-button-sm ui-button-primary"
                            : "ui-button-sm"
                        }
                      >
                        {index + 1}
                      </button>
                    ))}
                  </div>
                </div>

                {!rankings.length ? (
                  <div className="ui-text-soft rounded-xl border border-dashed p-8 text-center text-sm">
                    Aucune comparaison stricte disponible pour cette position.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {rankings.map((ranking, index) => (
                      <div
                        key={ranking.heroId}
                        className="ui-card flex items-center gap-3 rounded-xl border p-3"
                      >
                        <div className="ui-text-muted w-7 text-center text-sm font-black">
                          #{index + 1}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="ui-text-primary truncate text-sm font-black">
                            {heroName(ranking.heroId)}
                          </div>
                          <div className="ui-text-muted mt-0.5 text-[10px]">
                            {ranking.comparisons} comparaison
                            {ranking.comparisons > 1 ? "s" : ""} ·{" "}
                            {ranking.wins} victoire
                            {ranking.wins > 1 ? "s" : ""} ·{" "}
                            {ranking.losses} défaite
                            {ranking.losses > 1 ? "s" : ""}
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="ui-text-primary text-lg font-black">
                            {formatScore(ranking.score)}
                          </div>
                          <div className="ui-text-muted text-[9px] uppercase">
                            score
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : null}

          {step === 2 ? (
            <div className="ui-card rounded-2xl border p-3 sm:p-4">
              <div className="mb-4">
                <h3 className="ui-text-primary text-base font-black">
                  Étape 2 — Sélection de l'équipe ennemie
                </h3>
                <p className="ui-text-secondary mt-1 text-xs">
                  Sélectionnez exactement les 5 héros ennemis contre lesquels
                  les équipes jamais testées seront recherchées.
                </p>
              </div>

              <AnalysisHelpEnemySelection
                heroes={HEROES}
                selectedEnemies={selectedEnemies}
                enemyIds={enemyIds}
                heroUsage={heroUsage}
                activeClass={activeClass}
                query={query}
                sortBy={sortBy}
                onQueryChange={setQuery}
                onClassChange={setActiveClass}
                onSortChange={setSortBy}
                onHeroClick={toggleEnemy}
                onClear={clearEnemies}
              />
            </div>
          ) : null}

          {step === 3 ? (
            <div className="ui-card rounded-2xl border p-4 sm:p-5">
              <div className="mb-5">
                <h3 className="ui-text-primary text-base font-black">
                  Étape 3 — Équipes jamais testées
                </h3>
                <p className="ui-text-secondary mt-1 max-w-4xl text-xs leading-relaxed">
                  À partir des équipes historiques avec ordre connu contre
                  l'équipe ennemie sélectionnée, gagnantes ou perdantes, on
                  remplace un héros par un héros mieux classé dans la même
                  position. Seules les équipes absentes de l'historique contre
                  cette composition ennemie sont proposées.
                </p>
              </div>

              <div className="ui-panel-alt mb-5 rounded-lg border p-3">
                <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs">
                  <span className="ui-text-primary font-bold">
                    {candidates.length} proposition
                    {candidates.length !== 1 ? "s" : ""}
                  </span>
                  <span className="ui-text-muted">
                    {matchingOrderedCombats.length} combat
                    {matchingOrderedCombats.length !== 1 ? "s" : ""} avec ordre
                    connu contre cette équipe
                  </span>
                  <span className="ui-text-muted">
                    🆕 Jamais testée contre cette équipe
                  </span>
                </div>
              </div>

              {matchingOrderedCombats.length === 0 ? (
                <div className="ui-panel-empty rounded-xl border border-dashed p-6 text-center">
                  <p className="ui-text-muted text-sm">
                    Aucun combat avec ordre connu contre cette équipe ennemie.
                  </p>
                </div>
              ) : candidateGroups.length === 0 ? (
                <div className="ui-panel-empty rounded-xl border border-dashed p-6 text-center">
                  <p className="ui-text-muted text-sm">
                    Aucune nouvelle équipe mieux classée n'a été trouvée dans
                    les données actuelles.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                  {candidates.map((candidate, index) => {
                    const candidateKey = teamKey(candidate.teamIds);
                    const saving = savingTeamKey === candidateKey;

                    return (
                      <article
                        key={candidate.teamIds.join("|")}
                        className="ui-card rounded-xl border p-4"
                      >
                        <div className="mb-4 flex items-center justify-between gap-3">
                          <h4 className="ui-text-primary text-sm font-black">
                            #{index + 1} — 🆕 JAMAIS TESTÉE
                          </h4>
                          <span className="rounded-full border border-[var(--ui-theme-primary)] px-2 py-1 text-[10px] font-black text-[var(--ui-theme-primary)]">
                            Position {candidate.position + 1}
                          </span>
                        </div>

                        <div
                          className={
                            candidate.baseWon
                              ? "ui-success mb-4 rounded-lg border p-3 text-xs"
                              : "ui-danger mb-4 rounded-lg border p-3 text-xs"
                          }
                        >
                          {candidate.baseWon ? "✅ Victoire" : "❌ Défaite"} avec{" "}
                          <strong>{heroName(candidate.baseHeroId)}</strong> en
                          position {candidate.position + 1}
                          <span className="ui-text-muted">
                            {" "}· variante potentiellement meilleure
                          </span>
                        </div>

                        <div className="ui-panel-alt mb-4 rounded-lg border p-3">
                          <p className="ui-text-muted mb-2 text-[10px] font-bold uppercase tracking-wide">
                            Héros proposé
                          </p>
                          <div className="ui-text-primary text-sm font-black">
                            #{candidate.candidateRank}{" "}
                            {heroName(candidate.candidateHeroId)}
                          </div>
                          <div className="ui-text-muted mt-1 text-[10px]">
                            classement Team par position · score{" "}
                            {formatScore(candidate.candidateScore)}
                          </div>
                        </div>

                        <div className="mb-3 rounded-lg border border-[var(--ui-theme-primary)]/30 p-3">
                          <p className="ui-text-muted mb-2 text-[10px] font-bold uppercase tracking-wide">
                            Nouvelle équipe proposée
                          </p>
                          <HeroStrip ids={candidate.teamIds} />

                          <div className="mt-4 grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              className="ui-button-success w-full"
                              disabled={saving}
                              onClick={() =>
                                void recordResult(candidate.teamIds, true)
                              }
                            >
                              {saving ? "Enregistrement..." : "✓ WIN"}
                            </button>
                            <button
                              type="button"
                              className="ui-button-danger w-full"
                              disabled={saving}
                              onClick={() =>
                                void recordResult(candidate.teamIds, false)
                              }
                            >
                              {saving ? "Enregistrement..." : "✗ LOSS"}
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          ) : null}
        </div>

        <footer className="ui-modal-footer flex shrink-0 justify-between gap-2 px-4 py-3 sm:px-5 sm:py-4">
          <button
            type="button"
            onClick={() => {
              if (step === 1) onBack();
              else setStep(step - 1);
            }}
            className="ui-button"
          >
            ← {step === 1 ? "Retour" : "Étape précédente"}
          </button>
          <button type="button" onClick={onClose} className="ui-button">
            Fermer
          </button>
        </footer>
      </section>
    </div>
  );
}
