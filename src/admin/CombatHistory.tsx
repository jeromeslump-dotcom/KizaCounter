import { useEffect, useMemo, useState } from "react";
import type { Combat, Hero } from "../types";
import { HEROES } from "../data/heroes";
import { deleteCombat } from "../storage/combatStorage";
import { loadTeamOrders, type TeamOrder } from "../storage/teamOrderStorage";
import { teamKey } from "../engine/teamUtils";
import { supabase } from "../storage/supabase";
import CombatOrderEditor from "./CombatOrderEditor";

interface CombatHistoryProps {
  open: boolean;
  combats: Combat[];
  onClose: () => void;
  onBack: () => void;
}

interface Profile {
  id: string;
  display_name: string | null;
}

interface OrderEditorState {
  teamIds: string[];
  title: string;
}

const COMBATS_PER_PAGE = 100;

export default function CombatHistory({
  open,
  combats,
  onClose,
  onBack,
}: CombatHistoryProps) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [teamOrders, setTeamOrders] = useState<Map<string, string[]>>(
    new Map()
  );
  const [teamOrdersLoading, setTeamOrdersLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const [orderEditor, setOrderEditor] = useState<OrderEditorState | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const visibleCombats = useMemo(
    () => combats.filter((combat) => !combat.id || !deletedIds.has(combat.id)),
    [combats, deletedIds]
  );

  const userIds = useMemo(
    () =>
      Array.from(
        new Set(
          visibleCombats
            .map((combat) => combat.user_id)
            .filter((id): id is string => Boolean(id))
        )
      ),
    [visibleCombats]
  );

  const totalPages = Math.max(
    1,
    Math.ceil(visibleCombats.length / COMBATS_PER_PAGE)
  );

  const paginatedCombats = useMemo(
    () =>
      visibleCombats.slice(
        (currentPage - 1) * COMBATS_PER_PAGE,
        currentPage * COMBATS_PER_PAGE
      ),
    [visibleCombats, currentPage]
  );

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    setTeamOrdersLoading(true);
    setTeamOrders(new Map());

    async function loadOrders() {
      try {
        const orders = await loadTeamOrders();

        if (!cancelled) {
          setTeamOrders(
            new Map(
              orders.map((o: TeamOrder) => [o.team_key, o.ordered_hero_ids])
            )
          );
        }
      } catch (error) {
        console.error("Erreur chargement des ordres d'équipes :", error);
      } finally {
        if (!cancelled) setTeamOrdersLoading(false);
      }
    }

    void loadOrders();

    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    let cancelled = false;

    async function loadProfiles() {
      if (!userIds.length) {
        setProfiles([]);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", userIds);

      if (error) {
        console.error("Erreur chargement des utilisateurs :", error);
        return;
      }

      if (!cancelled) {
        setProfiles((data ?? []) as Profile[]);
      }
    }

    void loadProfiles();

    return () => {
      cancelled = true;
    };
  }, [userIds]);

  if (!open) return null;

  const totalCombats = visibleCombats.length;
  const victories = visibleCombats.filter((combat) => combat.won).length;

  const getHero = (id: string) => HEROES.find((hero) => hero.id === id);

  const getUserName = (id?: string | null) =>
    !id
      ? "Utilisateur inconnu"
      : profiles.find((p) => p.id === id)?.display_name?.trim() ||
        "Utilisateur";

  const getTeamHeroes = (ids: string[]) =>
    ids.map(getHero).filter((hero): hero is Hero => Boolean(hero));

  const openOrderEditor = (teamIds: string[], title: string) =>
    setOrderEditor({ teamIds: [...teamIds], title });

  const handleOrderSaved = (orderedHeroIds: string[]) => {
    if (!orderEditor) return;

    setTeamOrders((current) =>
      new Map(current).set(teamKey(orderEditor.teamIds), orderedHeroIds)
    );

    setOrderEditor(null);
  };

  async function handleDelete(combat: Combat) {
    if (!combat.id) return;

    if (
      !window.confirm("Supprimer définitivement ce combat de l'historique ?")
    ) {
      return;
    }

    try {
      setDeletingId(combat.id);
      await deleteCombat(combat.id);
      setDeletedIds((current) => new Set(current).add(combat.id!));
    } catch (error) {
      console.error("Erreur suppression combat :", error);
      window.alert("Impossible de supprimer ce combat.");
    } finally {
      setDeletingId(null);
    }
  }

  function HeroPortrait({ heroId }: { heroId: string }) {
    const hero = getHero(heroId);

    if (!hero) {
      return (
        <div className="min-w-0 text-center">
          <span className="ui-text-soft block truncate text-[8px]">
            {heroId}
          </span>
        </div>
      );
    }

    return (
      <div
        className="flex min-w-0 flex-col items-center gap-0.5 sm:gap-1"
        title={hero.name}
      >
        <img
          src={hero.img}
          alt={hero.name}
          className="h-7 w-7 shrink-0 rounded-md border ui-divider object-cover shadow-sm sm:h-[72px] sm:w-[72px] sm:rounded-lg"
        />

        <span className="ui-text-secondary block w-full min-w-0 truncate text-center text-[8px] font-semibold leading-tight sm:max-w-[84px] sm:text-[10px]">
          {hero.name}
        </span>
      </div>
    );
  }

  if (orderEditor) {
    const editorHeroes = getTeamHeroes(orderEditor.teamIds);

    return (
      <div
        className="fixed inset-0 z-[90] flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm sm:p-4"
        onClick={onClose}
        role="presentation"
      >
        <section
          className="ui-modal flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border shadow-2xl"
          role="dialog"
          aria-modal="true"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="ui-text-soft border-b ui-divider px-5 py-2 text-center text-[10px] font-black uppercase tracking-wide">
            {orderEditor.title}
          </div>

          <CombatOrderEditor
            heroes={editorHeroes}
            initialOrder={teamOrders.get(teamKey(orderEditor.teamIds))}
            onBack={() => setOrderEditor(null)}
            onSaved={handleOrderSaved}
          />
        </section>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm sm:p-4"
      onClick={onClose}
      role="presentation"
    >
      <section
        className="ui-modal flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="combat-history-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="border-b ui-divider p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2
                id="combat-history-title"
                className="ui-text-primary text-xl font-black"
              >
                📜 Historique des combats
              </h2>

              <p className="ui-text-secondary mt-1 text-xs sm:text-sm">
                Historique commun des combats enregistrés.
              </p>

              <div className="mt-3 inline-flex items-center rounded-lg border ui-divider px-3 py-1.5">
                <span className="ui-text-primary text-xs font-bold">
                  {totalCombats} combats · {victories} victoires
                </span>
              </div>
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

        <div className="min-h-0 overflow-y-auto p-4 sm:p-6">
          {!visibleCombats.length ? (
            <p className="ui-text-soft py-12 text-center text-sm">
              Aucun combat enregistré.
            </p>
          ) : (
            <div className="space-y-3">
              {paginatedCombats.map((combat, index) => {
                const combatNumber =
                  (currentPage - 1) * COMBATS_PER_PAGE + index + 1;

                const enemyKnown = teamOrders.has(teamKey(combat.enemy_heroes));

                const teamKnown = teamOrders.has(teamKey(combat.my_heroes));

                const orderButton = (
                  ids: string[],
                  title: string,
                  known: boolean
                ) => (
                  <button
                    type="button"
                    onClick={() => openOrderEditor(ids, title)}
                    disabled={teamOrdersLoading}
                    className={`combat-history-order-button ${
                      teamOrdersLoading
                        ? "combat-history-order-button-loading"
                        : known
                          ? "combat-history-order-button-known"
                          : "combat-history-order-button-unknown"
                    }`}
                  >
                    {teamOrdersLoading
                      ? "⏳ Vérification..."
                      : known
                        ? "✓ Ordre connu"
                        : "✏️ Éditer l'ordre"}
                  </button>
                );

                return (
                  <div
                    key={
                      combat.id ?? `${combat.created_at ?? "combat"}-${index}`
                    }
                    className="combat-history-card"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="ui-text-primary text-xs font-bold">
                            Combat #{combatNumber}
                          </span>

                          <span
                            className={
                              combat.won
                                ? "combat-history-result-success"
                                : "combat-history-result-danger"
                            }
                          >
                            {combat.won ? "Victoire" : "Défaite"}
                          </span>
                        </div>

                        <div className="ui-text-soft mt-1 text-[10px]">
                          {combat.created_at
                            ? new Date(combat.created_at).toLocaleString(
                                "fr-FR",
                                {
                                  dateStyle: "short",
                                  timeStyle: "short",
                                }
                              )
                            : "Date inconnue"}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDelete(combat)}
                        disabled={!combat.id || deletingId === combat.id}
                        className="combat-history-delete"
                      >
                        {deletingId === combat.id ? "…" : "🗑️ Supprimer"}
                      </button>
                    </div>

                    <div className="mt-3 grid gap-3 lg:grid-cols-2">
                      <div className="combat-history-section">
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <div className="ui-text-soft text-[10px] font-black uppercase tracking-wide">
                            Ennemis
                          </div>

                          {orderButton(
                            combat.enemy_heroes,
                            "Ordre des ennemis",
                            enemyKnown
                          )}
                        </div>

                        <div className="grid grid-cols-5 gap-1 sm:gap-2">
                          {combat.enemy_heroes.map((id, i) => (
                            <HeroPortrait key={`${id}-${i}`} heroId={id} />
                          ))}
                        </div>
                      </div>

                      <div className="combat-history-section">
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <div className="ui-text-soft text-[10px] font-black uppercase tracking-wide">
                            Équipe
                          </div>

                          {orderButton(
                            combat.my_heroes,
                            "Ordre de mon équipe",
                            teamKnown
                          )}
                        </div>

                        <div className="grid grid-cols-5 gap-1 sm:gap-2">
                          {combat.my_heroes.map((id, i) => (
                            <HeroPortrait key={`${id}-${i}`} heroId={id} />
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="ui-text-secondary mt-3 flex items-center gap-2 border-t ui-divider pt-2 text-[10px]">
                      <span>👤</span>
                      <span>Enregistré par :</span>

                      <strong className="ui-text-primary">
                        {getUserName(combat.user_id)}
                      </strong>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {totalPages > 1 && (
          <nav
            className="flex flex-wrap items-center justify-between gap-2 border-t ui-divider px-4 py-3 sm:px-5 sm:py-4"
            aria-label="Pagination de l'historique"
          >
            <span className="ui-text-soft text-[10px] font-semibold">
              Page {currentPage} / {totalPages} · {COMBATS_PER_PAGE} combats max
            </span>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={currentPage === 1}
                className="ui-action rounded-lg border px-3 py-1.5 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-40"
              >
                ← Précédente
              </button>

              <button
                type="button"
                onClick={() =>
                  setCurrentPage((page) => Math.min(totalPages, page + 1))
                }
                disabled={currentPage === totalPages}
                className="ui-action rounded-lg border px-3 py-1.5 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-40"
              >
                Suivante →
              </button>
            </div>
          </nav>
        )}

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
