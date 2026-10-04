import { useEffect, useState } from "react";
import HeroPortrait from "../../components/HeroPortrait";
import {
  generateTargetTeams,
  getTargetCandidateTotal,
  getTargetFormationTotal,
  getTargetMaxResults,
  type TargetGeneratorTeam,
} from "./teamLabTargetEngine";

interface TeamGeneratorProps {
  enabledHeroIds: Set<string>;
  requiredHeroIds: Set<string>;
}

function TeamCard({ team }: { team: TargetGeneratorTeam }) {
  return (
    <article className="ui-card rounded-2xl border p-3">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <span className="ui-text-primary text-sm font-black">
          {team.distance === 0
            ? "Signal robuste exact"
            : "Voisin direct du signal robuste"}
        </span>
        <span className="ui-text-muted text-[11px]">
          {team.distance === 0 ? "distance 0" : "distance 1"}
        </span>
      </div>

      <div className="grid grid-cols-5 gap-2">
        {team.heroes.map((hero) => (
          <div key={hero.id} className="min-w-0 text-center">
            <HeroPortrait
              hero={hero}
              showName={false}
              imageClassName="mx-auto max-w-20 rounded-xl"
            />
            <p className="ui-text-primary mt-1 truncate text-[11px] font-bold">
              {hero.name}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-5 gap-1 text-center text-[10px]">
        {[
          ["ATK", team.zones.atk],
          ["MATK", team.zones.matk],
          ["DEF", team.zones.def],
          ["MDEF", team.zones.mdef],
          ["PV", team.zones.hp],
        ].map(([key, zone]) => (
          <div key={key} className="ui-panel-alt rounded-lg border px-1 py-1">
            <div className="ui-text-muted">{key}</div>
            <div className="ui-text-primary font-black">Z{zone}</div>
          </div>
        ))}
      </div>

      <div className="ui-panel-alt mt-3 rounded-lg border p-2 text-[10px]">
        <div className="ui-text-muted">Signal historique de référence</div>
        <div className="ui-text-primary mt-0.5 font-black">
          {team.signalVector}
        </div>
        <div className="ui-text-secondary mt-0.5">
          {Math.round(team.signalWinRate * 100)} % historique · Wilson 95 %
          inférieur : {(team.signalWilsonLowerBound * 100).toFixed(1)} %
        </div>
      </div>
    </article>
  );
}

export default function TeamGenerator({
  enabledHeroIds,
  requiredHeroIds,
}: TeamGeneratorProps) {
  const [results, setResults] = useState<TargetGeneratorTeam[]>([]);
  const [searched, setSearched] = useState(false);
  const [page, setPage] = useState(1);

  const candidateTotal = getTargetCandidateTotal(
    enabledHeroIds,
    requiredHeroIds
  );
  const pageSize = getTargetMaxResults();
  const pageCount = Math.max(1, Math.ceil(results.length / pageSize));
  const pageStart = (page - 1) * pageSize;
  const visibleResults = results.slice(pageStart, pageStart + pageSize);

  useEffect(() => {
    setSearched(false);
    setResults([]);
    setPage(1);
  }, [enabledHeroIds, requiredHeroIds]);

  const handleGenerate = async () => {
    setSearched(true);
    setPage(1);
    setResults(await generateTargetTeams(enabledHeroIds, requiredHeroIds));
  };

  return (
    <div className="space-y-5">
      <section className="ui-panel rounded-2xl border p-4 sm:p-5">
        <div className="mb-4">
          <h3 className="ui-text-primary text-base font-black">
            Équipes à tester
          </h3>
          <p className="ui-text-secondary mt-1 text-xs leading-relaxed">
            Le Lab part des formations théoriques situées dans les zones cibles
            issues des signaux historiques robustes. Une seule métrique peut
            s&apos;écarter d&apos;une zone vers le voisin direct. Les formations
            déjà testées sont toujours exclues.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="ui-card rounded-xl border p-3">
            <div className="ui-text-muted text-xs">Pool initial</div>
            <div className="ui-text-primary mt-1 text-lg font-black">
              {getTargetFormationTotal().toLocaleString("fr-FR")}
            </div>
            <div className="ui-text-muted text-[11px]">
              formations théoriques
            </div>
          </div>

          <div className="ui-card rounded-xl border p-3">
            <div className="ui-text-muted text-xs">Après historique</div>
            <div className="ui-text-primary mt-1 text-lg font-black">
              {candidateTotal.toLocaleString("fr-FR")}
            </div>
            <div className="ui-text-muted text-[11px]">
              formations encore testables
            </div>
          </div>

          <div className="ui-card rounded-xl border p-3">
            <div className="ui-text-muted text-xs">Héros obligatoires</div>
            <div className="ui-text-primary mt-1 text-lg font-black">
              {requiredHeroIds.size} / 5
            </div>
            <div className="ui-text-muted text-[11px]">
              sélection cumulative
            </div>
          </div>
        </div>

        {requiredHeroIds.size === 0 ? (
          <p className="ui-warning mt-4 rounded-xl border p-3 text-xs">
            Sélectionnez au moins <strong>1 héros obligatoire</strong> à
            l&apos;étape précédente pour commencer la recherche.
          </p>
        ) : candidateTotal === 0 ? (
          <p className="ui-error mt-4 rounded-xl border p-3 text-xs">
            Aucune formation testable ne correspond aux héros activés et aux
            héros obligatoires sélectionnés.
          </p>
        ) : (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleGenerate}
              className="ui-button ui-button-success"
            >
              Afficher les formations à tester
            </button>
            <span className="ui-text-muted text-xs">
              {candidateTotal.toLocaleString("fr-FR")} résultat
              {candidateTotal > 1 ? "s" : ""} disponible
              {candidateTotal > 1 ? "s" : ""}
            </span>
          </div>
        )}
      </section>

      {searched && (
        <section className="space-y-4">
          {results.length === 0 ? (
            <div className="ui-panel rounded-2xl border p-5">
              <p className="ui-text-primary text-sm font-black">
                Aucune formation disponible.
              </p>
              <p className="ui-text-secondary mt-1 text-xs">
                Les formations historiques sont exclues systématiquement.
              </p>
            </div>
          ) : (
            <>
              <div className="ui-panel rounded-2xl border p-4">
                <p className="ui-text-primary text-sm font-black">
                  {results.length.toLocaleString("fr-FR")} formation
                  {results.length > 1 ? "s" : ""} à tester
                </p>
                <p className="ui-text-secondary mt-1 text-xs">
                  Les signaux robustes exacts sont prioritaires, puis leurs
                  voisins directs. Aucun classement de performance future
                  n&apos;est déduit pour ces équipes.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                {visibleResults.map((team) => (
                  <TeamCard
                    key={team.heroes.map((hero) => hero.id).join(",")}
                    team={team}
                  />
                ))}
              </div>

              {pageCount > 1 && (
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    disabled={page === 1}
                    className="ui-button"
                  >
                    ← Précédent
                  </button>
                  <span className="ui-text-muted px-2 text-xs">
                    Page {page} / {pageCount}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setPage((current) => Math.min(pageCount, current + 1))
                    }
                    disabled={page === pageCount}
                    className="ui-button"
                  >
                    Suivant →
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      )}
    </div>
  );
}
