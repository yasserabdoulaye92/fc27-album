// Calculs de l'album : pour un set et un club donnés, combien coûte chaque palier
// et combien de jetons il rapporte.

import type { AlbumSet, Player, Rules, Tier } from "./types";

// Résultat pour un palier d'un set
export type TierAnalysis = {
  tier: Tier;
  reached: boolean; // déjà atteint avec le club actuel ?
  impossible: boolean; // pas assez de joueurs connus dans le set pour l'atteindre
  toBuy: Player[]; // joueurs à acheter pour l'atteindre (les moins chers d'abord)
  credits: number; // prix total de ces joueurs
  tax: number; // taxe sur ces achats
  tokens: number; // jetons gagnés en plus en atteignant ce palier
  creditsPerToken: number | null; // (crédits + taxe) / jetons, null si 0 jeton
  profitable: boolean; // verdict
};

// Résultat pour un set entier
export type SetAnalysis = {
  set: AlbumSet;
  owned: Player[]; // joueurs du set déjà possédés
  missing: Player[]; // joueurs du set manquants, du moins cher au plus cher
  unknownIds: number[]; // ids présents dans le set mais absents de players.json
  currentTier: Tier | null; // meilleur palier déjà atteint
  tiers: TierAnalysis[];
  best: TierAnalysis | null; // palier non atteint le moins cher par jeton
};

export function analyzeSet(
  set: AlbumSet,
  ownedIds: Set<number>,
  playersById: Map<number, Player>,
  rules: Rules,
): SetAnalysis {
  const owned: Player[] = [];
  const missing: Player[] = [];
  const unknownIds: number[] = [];

  for (const id of set.playerIds) {
    const player = playersById.get(id);
    if (!player) unknownIds.push(id);
    else if (ownedIds.has(id)) owned.push(player);
    else missing.push(player);
  }

  // On complète toujours un palier avec les joueurs manquants les moins chers.
  missing.sort((a, b) => a.price - b.price);

  // Meilleur palier déjà atteint
  let currentTier: Tier | null = null;
  for (const tier of set.tiers) {
    if (owned.length >= tier.required) currentTier = tier;
  }

  const tiers = set.tiers.map((tier, index): TierAnalysis => {
    const reached = owned.length >= tier.required;
    const toBuy = reached ? [] : missing.slice(0, tier.required - owned.length);
    // Si le set n'a pas assez de joueurs connus, le palier est impossible à atteindre.
    const impossible = toBuy.length < tier.required - owned.length;

    const credits = sum(toBuy.map((p) => p.price));
    const tax = Math.round(credits * rules.taxRate);

    // Jetons gagnés : ce palier seul, ou ce palier + ceux en dessous pas encore atteints.
    let tokens = 0;
    if (!reached && !impossible) {
      if (rules.cumulativeTiers) {
        tokens = sum(
          set.tiers
            .slice(0, index + 1)
            .filter((t) => owned.length < t.required)
            .map((t) => t.tokens),
        );
      } else {
        tokens = tier.tokens;
      }
    }

    const creditsPerToken = tokens > 0 ? Math.round((credits + tax) / tokens) : null;
    const profitable = creditsPerToken !== null && creditsPerToken <= rules.maxCreditsPerToken;

    return { tier, reached, impossible, toBuy, credits, tax, tokens, creditsPerToken, profitable };
  });

  // Le "meilleur" palier = celui qui coûte le moins de crédits par jeton
  let best: TierAnalysis | null = null;
  for (const t of tiers) {
    if (t.creditsPerToken === null) continue;
    if (best === null || t.creditsPerToken < best.creditsPerToken!) best = t;
  }

  return { set, owned, missing, unknownIds, currentTier, tiers, best };
}

function sum(values: number[]): number {
  return values.reduce((total, v) => total + v, 0);
}
