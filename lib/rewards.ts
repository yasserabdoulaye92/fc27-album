// Récompenses de la boutique de jetons : combien de jetons il manque, et quelles
// combinaisons de sets permettent de les gagner.

import type { ParsedClub } from "./club.ts";
import { planAlbum, type Plan } from "./planner.ts";
import type { AlbumSet, Player, Reward, Rules, ScoreConfig } from "./types.ts";

type Context = { sets: AlbumSet[]; players: Player[]; config: ScoreConfig; rules: Rules };

export type RewardOption = {
  id: "cheapest" | "fewest-sets";
  label: string;
  plan: Plan;
};

export type RewardPlan = {
  missing: number; // jetons qui manquent (0 si la récompense est déjà abordable)
  options: RewardOption[]; // vide si rien ne manque
};

// Au-delà, chercher "le moins de sets" prendrait trop de calculs
const MAX_SETS_TRIED = 6;

export function planForReward(
  club: ParsedClub,
  reward: Reward,
  balance: number,
  ctx: Context,
): RewardPlan {
  const missing = Math.max(0, reward.cost - balance);
  if (missing === 0) return { missing, options: [] };

  // 1. Le moins cher : le planificateur avec un objectif de jetons
  const cheapest = planAlbum(club, { tokenGoal: missing }, ctx);
  if (!cheapest) return { missing, options: [] };
  const options: RewardOption[] = [{ id: "cheapest", label: "Le moins cher", plan: cheapest }];

  // 2. Le moins de sets : on essaie avec 1 set, puis 2, etc., tant que c'est plus court
  if (cheapest.goalReached) {
    const limit = Math.min(cheapest.steps.length - 1, MAX_SETS_TRIED);
    for (let maxSets = 1; maxSets <= limit; maxSets++) {
      const plan = planAlbum(club, { tokenGoal: missing, maxSets }, ctx);
      if (plan?.goalReached) {
        options.push({ id: "fewest-sets", label: "Le moins de sets", plan });
        break;
      }
    }
  }
  return { missing, options };
}
