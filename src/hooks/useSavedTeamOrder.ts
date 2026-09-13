import { useEffect, useState } from "react";

import type { Hero } from "../types";
import { getTeamOrder } from "../storage/teamOrderStorage";

function applySavedOrder(team: Hero[], savedOrder: string[] | null): Hero[] {
  if (!savedOrder || team.length !== 5) return team;

  const heroesById = new Map(team.map((hero) => [hero.id, hero]));

  const ordered = savedOrder
    .map((id) => heroesById.get(id))
    .filter((hero): hero is Hero => Boolean(hero));

  return ordered.length === team.length ? ordered : team;
}

interface UseSavedTeamOrderProps {
  recommendedTeam: Hero[];
  alternativeTeam: Hero[];
  recommendedIds: string[];
  alternativeIds: string[];
}

export default function useSavedTeamOrder({
  recommendedTeam,
  alternativeTeam,
  recommendedIds,
  alternativeIds,
}: UseSavedTeamOrderProps) {
  const [orderedRecommendedTeam, setOrderedRecommendedTeam] =
    useState<Hero[]>(recommendedTeam);

  const [orderedAlternativeTeam, setOrderedAlternativeTeam] =
    useState<Hero[]>(alternativeTeam);

  useEffect(() => {
    let cancelled = false;

    setOrderedRecommendedTeam(recommendedTeam);
    setOrderedAlternativeTeam(alternativeTeam);

    if (recommendedTeam.length !== 5 && alternativeTeam.length !== 5) {
      return () => {
        cancelled = true;
      };
    }

    Promise.all([
      recommendedTeam.length === 5
        ? getTeamOrder(recommendedIds).catch(() => null)
        : Promise.resolve(null),

      alternativeTeam.length === 5
        ? getTeamOrder(alternativeIds).catch(() => null)
        : Promise.resolve(null),
    ]).then(([recommendedOrder, alternativeOrder]) => {
      if (cancelled) return;

      setOrderedRecommendedTeam(
        applySavedOrder(recommendedTeam, recommendedOrder)
      );

      setOrderedAlternativeTeam(
        applySavedOrder(alternativeTeam, alternativeOrder)
      );
    });

    return () => {
      cancelled = true;
    };
  }, [recommendedTeam, alternativeTeam, recommendedIds, alternativeIds]);

  return {
    orderedRecommendedTeam,
    orderedAlternativeTeam,
  };
}
