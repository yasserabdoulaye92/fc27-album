// Récompenses de la boutique de jetons : combien de jetons il manque, et quelles
// combinaisons de sets permettent de les gagner.

import type { ParsedClub } from "./club.ts";
import { analyzeAll, fewestSetsPlan, planAlbum, type BaseAnalyses, type Plan } from "./planner.ts";
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

export function planForReward(
  club: ParsedClub,
  reward: Reward,
  balance: number,
  ctx: Context,
  base: BaseAnalyses = analyzeAll(club, ctx),
): RewardPlan {
  const missing = Math.max(0, reward.cost - balance);
  if (missing === 0) return { missing, options: [] };

  // 1. Le moins cher : le planificateur avec un objectif de jetons
  const cheapest = planAlbum(club, { tokenGoal: missing }, ctx, base);
  if (!cheapest) return { missing, options: [] };
  const options: RewardOption[] = [{ id: "cheapest", label: "Le moins cher", plan: cheapest }];

  // 2. Le moins de sets, si c'est vraiment plus court
  if (cheapest.goalReached) {
    const fewest = fewestSetsPlan(club, missing, ctx, base);
    if (fewest?.goalReached && fewest.steps.length < cheapest.steps.length) {
      options.push({ id: "fewest-sets", label: "Le moins de sets", plan: fewest });
    }
  }
  return { missing, options };
}
