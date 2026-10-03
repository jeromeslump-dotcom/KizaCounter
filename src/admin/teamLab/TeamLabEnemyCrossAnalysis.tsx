import { useEffect, useMemo, useState } from "react";

import { HEROES, type Hero } from "../../data/heroes";
import { loadCombats } from "../../storage/combatStorage";
import type { Combat } from "../../types";
import { teamKey } from "../../engine/teamUtils";

interface TeamLabEnemyCrossAnalysisProps {
  selectedEnemyIds: string[];
}

type Variant = { hero: Hero; wins: number; losses: number };
type CoreGroup = { coreIds: string[]; variants: Map<string, Variant> };
type Candidate = {
  teamIds: string[];
  sourceCoreIds: string[];
  sourceHero: Hero;
  sourceWins: number;
  sourceLosses: number;
};

const TEAM_SIZE = 5;
const SHARED_CORE_HEROES = 3;
const MAX_CANDIDATES = 100;

function ratio(wins: number, losses: number) {
  return losses === 0 ? Infinity : wins / losses;
}

function getSharedCount(first: string[], second: string[]) {
  const set = new Set(second);
  return first.filter((id) => set.has(id)).length;
}

function buildGroups(combats: Combat[], heroesById: Map<string, Hero>): CoreGroup[] {
  const groups = new Map<string, CoreGroup>();

  for (const combat of combats) {
    if (combat.my_heroes.length !== TEAM_SIZE) continue;

    for (let removedIndex = 0; removedIndex < TEAM_SIZE; removedIndex++) {
      const coreIds = combat.my_heroes.filter((_, i) => i !== removedIndex).sort();
      const fifthId = combat.my_heroes[removedIndex];
      const hero = heroesById.get(fifthId);
      if (!hero) continue;

      const coreKey = coreIds.join("|");
      const group = groups.get(coreKey) ?? { coreIds, variants: new Map() };
      const variant = group.variants.get(fifthId) ?? { hero, wins: 0, losses: 0 };

      if (combat.won) variant.wins++;
      else variant.losses++;

      group.variants.set(fifthId, variant);
      groups.set(coreKey, group);
    }
  }

  return [...groups.values()];
}

function HeroStrip({ ids, heroesById }: { ids: string[]; heroesById: Map<string, Hero> }) {
  return (
    <div className="flex flex-wrap gap-2">
      {ids.map((id) => {
        const hero = heroesById.get(id);
        return hero ? (
          <div key={id} className="flex w-16 flex-col items-center gap-1">
            <img
              src={hero.img}
              alt={hero.name}
              className="h-11 w-11 rounded-lg border border-white/10 object-cover"
            />
            <span className="ui-text-primary text-center text-[10px] font-semibold leading-tight">
              {hero.name}
            </span>
          </div>
        ) : null;
      })}
    </div>
  );
}

export default function TeamLabEnemyCrossAnalysis({
  selectedEnemyIds,
}: TeamLabEnemyCrossAnalysisProps) {
  const [combats, setCombats] = useState<Combat[]>([]);
  const heroesById = useMemo(() => new Map(HEROES.map((hero) => [hero.id, hero])), []);

  useEffect(() => {
    let mounted = true;
    void loadCombats().then((history) => {
      if (mounted) setCombats(history);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const selectedKey = teamKey(selectedEnemyIds);
  const matchingCombats = useMemo(
    () =>
      selectedEnemyIds.length === TEAM_SIZE
        ? combats.filter((combat) => teamKey(combat.enemy_heroes) === selectedKey)
        : [],
    [combats, selectedEnemyIds, selectedKey],
  );

  const groups = buildGroups(matchingCombats, heroesById);
  const testedTeams = new Set(combats.map((combat) => teamKey(combat.my_heroes)));
  const candidates = new Map<string, Candidate>();

  for (const source of groups) {
    for (const variant of source.variants.values()) {
      const sourceRatio = ratio(variant.wins, variant.losses);

      for (const target of groups) {
        if (getSharedCount(source.coreIds, target.coreIds) !== SHARED_CORE_HEROES) continue;
        if (source.coreIds.join("|") === target.coreIds.join("|")) continue;
        if (target.coreIds.includes(variant.hero.id)) continue;

        const teamIds = [...target.coreIds, variant.hero.id];
        if (new Set(teamIds).size !== TEAM_SIZE) continue;

        const candidateKey = teamKey(teamIds);
        if (testedTeams.has(candidateKey)) continue;

        const existing = candidates.get(candidateKey);
        if (
          !existing ||
          sourceRatio > ratio(existing.sourceWins, existing.sourceLosses) ||
          (sourceRatio === ratio(existing.sourceWins, existing.sourceLosses) &&
            variant.wins + variant.losses > existing.sourceWins + existing.sourceLosses)
        ) {
          candidates.set(candidateKey, {
            teamIds,
            sourceCoreIds: source.coreIds,
            sourceHero: variant.hero,
            sourceWins: variant.wins,
            sourceLosses: variant.losses,
          });
        }
      }
    }
  }

  const sortedCandidates = [...candidates.values()]
    .sort((a, b) => {
      const totalA = a.sourceWins + a.sourceLosses;
      const totalB = b.sourceWins + b.sourceLosses;

      if (totalB !== totalA) return totalB - totalA;

      const ratioA = ratio(a.sourceWins, a.sourceLosses);
      const ratioB = ratio(b.sourceWins, b.sourceLosses);

      if (ratioB !== ratioA) return ratioB - ratioA;
      return 0;
    })
    .slice(0, MAX_CANDIDATES);

  return (
    <section className="ui-panel is-active rounded-xl border p-4 sm:p-5">
      <div className="mb-5">
        <h3 className="ui-text-primary text-base font-black">Étape D — Équipes à tester</h3>
        <p className="ui-text-secondary mt-1 max-w-4xl text-xs leading-relaxed">
          On conserve le contexte du héros : un 5e héros est repris d'un noyau où il a déjà montré un résultat,
          puis placé dans un autre noyau qui partage 3 héros sur 4. Seules les équipes absentes de tout l'historique sont proposées.
        </p>
      </div>

      {selectedEnemyIds.length !== TEAM_SIZE ? (
        <div className="ui-panel-empty rounded-lg border border-dashed p-6 text-center">
          <p className="ui-text-muted text-sm">Sélectionnez d'abord exactement 5 héros ennemis dans l'étape A.</p>
        </div>
      ) : matchingCombats.length === 0 ? (
        <div className="ui-panel-empty rounded-lg border border-dashed p-6 text-center">
          <p className="ui-text-muted text-sm">Aucun historique disponible pour construire des propositions.</p>
        </div>
      ) : sortedCandidates.length === 0 ? (
        <div className="ui-panel-empty rounded-lg border border-dashed p-6 text-center">
          <p className="ui-text-muted text-sm">Aucun nouveau croisement 3/4 n'a été trouvé dans les données actuelles.</p>
        </div>
      ) : (
        <>
          <div className="ui-panel-alt mb-5 rounded-lg border p-3">
            <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs">
              <span className="ui-text-primary font-bold">
                {sortedCandidates.length} proposition{sortedCandidates.length !== 1 ? "s" : ""}
              </span>
              <span className="ui-text-muted">Proximité : 3 héros communs sur 4</span>
              <span className="ui-text-muted">🆕 Jamais testée dans tout l'historique</span>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {sortedCandidates.map((candidate, index) => (
              <article key={teamKey(candidate.teamIds)} className="ui-card rounded-xl border p-4">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h4 className="ui-text-primary text-sm font-black">#{index + 1} — 🆕 JAMAIS TESTÉE</h4>
                  <span className="rounded-full border border-[var(--ui-theme-primary)] px-2 py-1 text-[10px] font-black text-[var(--ui-theme-primary)]">
                    3/4 communs
                  </span>
                </div>
                <div className="mb-4">
                  <p className="ui-text-muted mb-2 text-[10px] font-bold uppercase tracking-wide">Héros repris</p>
                  <div className="flex items-center gap-3">
                    <img
                      src={candidate.sourceHero.img}
                      alt={candidate.sourceHero.name}
                      className="h-12 w-12 rounded-lg border border-[var(--ui-theme-primary)] object-cover"
                    />
                    <div>
                      <p className="ui-text-primary text-sm font-black">{candidate.sourceHero.name}</p>
                      <p className="ui-text-muted text-xs">
                        {candidate.sourceWins} WIN · {candidate.sourceLosses} LOSS · W/L{" "}
                        {candidate.sourceLosses === 0
                          ? "∞"
                          : (candidate.sourceWins / candidate.sourceLosses).toFixed(2)}{" "}
                        · {candidate.sourceWins + candidate.sourceLosses} combats
                      </p>
                    </div>
                  </div>
                </div>
                <div className="mb-4 rounded-lg border border-white/10 p-3">
                  <p className="ui-text-muted mb-2 text-[10px] font-bold uppercase tracking-wide">Noyau d'origine</p>
                  <HeroStrip ids={candidate.sourceCoreIds} heroesById={heroesById} />
                </div>
                <div className="mb-4 text-center text-lg text-[var(--ui-theme-primary)]">↓</div>
                <div className="mb-3 rounded-lg border border-[var(--ui-theme-primary)]/30 p-3">
                  <p className="ui-text-muted mb-2 text-[10px] font-bold uppercase tracking-wide">Nouvelle équipe proposée</p>
                  <HeroStrip ids={candidate.teamIds} heroesById={heroesById} />
                </div>
                <p className="ui-text-muted text-[10px] leading-relaxed">
                  Le résultat WIN/LOSS du héros est conservé uniquement comme preuve de son contexte d'origine. Aucun taux de victoire n'est estimé pour cette nouvelle équipe.
                </p>
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
