import { useEffect, useMemo, useState } from "react";
import type { Combat, Hero } from "../types";
import { HEROES } from "../data/heroes";
import { deleteCombat } from "../storage/combatStorage";
import { supabase } from "../storage/supabase";

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

export default function CombatHistory({
  open,
  combats,
  onClose,
  onBack,
}: CombatHistoryProps) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());

  const visibleCombats = useMemo(
    () => combats.filter((combat) => !combat.id || !deletedIds.has(combat.id)),
    [combats, deletedIds]
  );

  const creatorIds = useMemo(
    () =>
      Array.from(
        new Set(
          visibleCombats
            .map((combat) => combat.created_by)
            .filter((id): id is string => Boolean(id))
        )
      ),
    [visibleCombats]
  );

  useEffect(() => {
    let cancelled = false;

    async function loadProfiles() {
      if (creatorIds.length === 0) {
        setProfiles([]);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", creatorIds);

      if (error) {
        console.error("Erreur chargement des utilisateurs :", error);
        return;
      }

      if (!cancelled) {
        setProfiles((data ?? []) as Profile[]);
      }
    }

    loadProfiles();

    return () => {
      cancelled = true;
    };
  }, [creatorIds]);

  if (!open) return null;

  const totalCombats = visibleCombats.length;
  const victories = visibleCombats.filter((combat) => combat.won).length;

  function getHero(heroId: string): Hero | undefined {
    return HEROES.find((hero) => hero.id === heroId);
  }

  function getUserName(userId?: string | null): string {
    if (!userId) return "Utilisateur inconnu";

    return (
      profiles.find((profile) => profile.id === userId)?.display_name?.trim() ||
      "Utilisateur"
    );
  }

  async function handleDelete(combat: Combat) {
    if (!combat.id) return;

    const confirmed = window.confirm(
      "Supprimer définitivement ce combat de l'historique ?"
    );

    if (!confirmed) return;

    try {
      setDeletingId(combat.id);
      await deleteCombat(combat.id);
      setDeletedIds((current) => {
        const next = new Set(current);
        next.add(combat.id!);
        return next;
      });
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
        <span className="ui-text-soft rounded-lg border ui-divider px-2 py-1 text-[10px]">
          {heroId}
        </span>
      );
    }

    return (
      <div
        className="group flex min-w-[58px] flex-col items-center gap-1"
        title={hero.name}
      >
        <img
          src={hero.img}
          alt={hero.name}
          className="h-11 w-11 rounded-lg border ui-divider object-cover shadow-sm"
        />
        <span className="ui-text-secondary max-w-[68px] truncate text-center text-[9px] font-semibold leading-tight">
          {hero.name}
        </span>
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
        onClick={(event) => event.stopPropagation()}
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
              <div className="mt-3 inline-flex items-center gap-2 rounded-lg border ui-divider px-3 py-1.5">
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
          {visibleCombats.length === 0 ? (
            <p className="ui-text-soft py-12 text-center text-sm">
              Aucun combat enregistré.
            </p>
          ) : (
            <div className="space-y-3">
              {visibleCombats.map((combat, index) => (
                <div
                  key={combat.id ?? `${combat.created_at ?? "combat"}-${index}`}
                  className="ui-action rounded-xl border p-3 sm:p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="ui-text-primary text-xs font-bold">
                          Combat #{index + 1}
                        </span>
                        <span
                          className={
                            combat.won
                              ? "text-xs font-black text-emerald-400"
                              : "text-xs font-black text-red-400"
                          }
                        >
                          {combat.won ? "Victoire" : "Défaite"}
                        </span>
                      </div>

                      <div className="ui-text-soft mt-1 text-[10px]">
                        {combat.created_at
                          ? new Date(combat.created_at).toLocaleString("fr-FR", {
                              dateStyle: "short",
                              timeStyle: "short",
                            })
                          : "Date inconnue"}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDelete(combat)}
                      disabled={!combat.id || deletingId === combat.id}
                      className="rounded-lg border border-red-400/20 px-2.5 py-1.5 text-xs font-bold text-red-400 transition hover:bg-red-400/10 disabled:cursor-not-allowed disabled:opacity-40"
                      title="Supprimer ce combat"
                    >
                      {deletingId === combat.id ? "…" : "🗑️ Supprimer"}
                    </button>
                  </div>

                  <div className="mt-3 grid gap-3 lg:grid-cols-2">
                    <div className="rounded-lg border ui-divider p-2.5">
                      <div className="ui-text-soft mb-2 text-[10px] font-black uppercase tracking-wide">
                        Ennemis
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {combat.enemy_heroes.map((heroId, heroIndex) => (
                          <HeroPortrait
                            key={`${heroId}-${heroIndex}`}
                            heroId={heroId}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="rounded-lg border ui-divider p-2.5">
                      <div className="ui-text-soft mb-2 text-[10px] font-black uppercase tracking-wide">
                        Équipe
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {combat.my_heroes.map((heroId, heroIndex) => (
                          <HeroPortrait
                            key={`${heroId}-${heroIndex}`}
                            heroId={heroId}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="ui-text-secondary mt-3 flex items-center gap-2 border-t ui-divider pt-2 text-[10px]">
                    <span>👤</span>
                    <span>Enregistré par :</span>
                    <strong className="ui-text-primary">
                      {getUserName(combat.created_by)}
                    </strong>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <footer className="flex justify-end border-t ui-divider px-4 py-3 sm:px-5 sm:py-4">
          <button
            type="button"
            onClick={onBack}
            className="ui-action rounded-lg border px-4 py-2 text-xs font-bold transition"
          >
            Retour au Admin Panel
          </button>
        </footer>
      </section>
    </div>
  );
}
