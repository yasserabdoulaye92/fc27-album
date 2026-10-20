// Analyse d'un set de l'album pour un club donné :
//   1. on prend les meilleures cartes du club éligibles au set ;
//   2. pour chaque palier pas encore atteint, on cherche les cartes à acheter
//      qui font monter le score jusqu'au seuil, en dépensant le moins possible.
//
// Rappel des règles (voir docs/regles-album.md) : l'album ne consomme pas les cartes,
// on peut donc acheter, valider le set puis revendre. La vraie perte = la taxe de revente.
//
// L'étape 2 se fait avec une méthode "gloutonne" (on prend à chaque fois le meilleur
// achat du moment) : rapide et simple, mais pas toujours la solution la moins chère.

import { itemScore, scoreLineup, sum, type Card, type LineupScore } from "./score.ts";
import type { AlbumSet, GradeTier, Player, Rules, ScoreConfig } from "./types.ts";
import type { ParsedClub } from "./club.ts";

export type TierAnalysis = {
  tier: GradeTier;
  reached: boolean; // déjà atteint avec ton club ?
  impossible: boolean; // pas atteignable avec les joueurs connus
  toBuy: Player[]; // cartes à acheter pour l'atteindre
  credits: number; // crédits à avancer pour ces achats
  taxLoss: number; // perte si tu revends tout ensuite (taxe)
  tokens: number; // jetons gagnés en plus
  taxLossPerToken: number | null;
  profitable: boolean; // verdict
  score: number; // score total de l'équipe proposée
};

export type SetAnalysis = {
  set: AlbumSet;
  eligibleOwned: Card[]; // cartes du club éligibles au set
  lineup: Card[]; // meilleure équipe avec ton club seul
  lineupScore: LineupScore;
  complete: boolean; // ton club suffit-il à remplir tous les emplacements ?
  currentTier: GradeTier | null;
  tiers: TierAnalysis[];
  best: TierAnalysis | null; // palier le moins cher par jeton
};

// Un joueur peut-il aller dans ce set ?
export function isEligible(player: Player, set: AlbumSet): boolean {
  const e = set.eligibility;
  return (
    (e.club === undefined || player.club === e.club) &&
    (e.league === undefined || player.league === e.league) &&
    (e.nation === undefined || player.nation === e.nation) &&
    (e.version === undefined || player.version === e.version)
  );
}

export function analyzeSet(
  set: AlbumSet,
  club: ParsedClub,
  players: Player[],
  config: ScoreConfig,
  rules: Rules,
): SetAnalysis {
  const eligible = players.filter((p) => isEligible(p, set));
  const eligibleOwned: Card[] = eligible
    .filter((p) => club.ownedIds.has(p.id))
    .map((p) => ({ player: p, owned: true, firstOwner: club.firstOwnerIds.has(p.id) }));
  // Les cartes achetées sur le marché ne sont jamais "premier propriétaire"
  const market: Card[] = eligible
    .filter((p) => !club.ownedIds.has(p.id))
    .map((p) => ({ player: p, owned: false, firstOwner: false }));

  const lineup = bestOwnedLineup(eligibleOwned, set.slots, config);
  const lineupScore = scoreLineup(lineup, config);
  const complete = lineup.length === set.slots;

  // Meilleur palier atteint (il faut que tous les emplacements soient remplis)
  let currentTier: GradeTier | null = null;
  if (complete) {
    for (const tier of set.tiers) {
      if (lineupScore.total >= tier.minScore) currentTier = tier;
    }
  }

  // On part de l'équipe du club, complétée si besoin par les cartes les moins chères.
  // Ensuite chaque palier repart de la solution du palier précédent.
  let working = fillEmptySlots(lineup, market, set.slots);

  const tiers = set.tiers.map((tier, index): TierAnalysis => {
    const reached = complete && lineupScore.total >= tier.minScore;
    if (reached) {
      return emptyTier(tier, true, lineupScore.total);
    }
    // Candidats : les cartes du marché, et aussi celles de ton club (gratuites)
    const solution = working
      ? improveUntil(working, [...eligibleOwned, ...market], tier.minScore, config)
      : null;
    if (!solution) return emptyTier(tier, false, 0, true);
    working = solution;

    const toBuy = solution.filter((c) => !c.owned).map((c) => c.player);
    const credits = sum(toBuy.map((p) => p.price));
    const taxLoss = Math.round(credits * rules.taxRate);

    // Jetons : ce palier seul, ou ce palier + ceux en dessous pas encore atteints
    const tokens = rules.cumulativeTiers
      ? sum(
          set.tiers
            .slice(0, index + 1)
            .filter((t) => !(complete && lineupScore.total >= t.minScore))
            .map((t) => t.tokens),
        )
      : tier.tokens;

    const taxLossPerToken = tokens > 0 ? Math.round(taxLoss / tokens) : null;
    return {
      tier,
      reached: false,
      impossible: false,
      toBuy,
      credits,
      taxLoss,
      tokens,
      taxLossPerToken,
      profitable: taxLossPerToken !== null && taxLossPerToken <= rules.maxTaxLossPerToken,
      score: scoreLineup(solution, config).total,
    };
  });

  // Le "meilleur" palier = celui qui fait perdre le moins de crédits par jeton
  let best: TierAnalysis | null = null;
  for (const t of tiers) {
    if (t.taxLossPerToken === null) continue;
    if (best === null || t.taxLossPerToken < best.taxLossPerToken!) best = t;
  }

  return { set, eligibleOwned, lineup, lineupScore, complete, currentTier, tiers, best };
}

function emptyTier(tier: GradeTier, reached: boolean, score: number, impossible = false): TierAnalysis {
  return {
    tier,
    reached,
    impossible,
    toBuy: [],
    credits: 0,
    taxLoss: 0,
    tokens: 0,
    taxLossPerToken: null,
    profitable: false,
    score,
  };
}

// Meilleure équipe avec les cartes du club. On essaie deux façons de choisir
// (les plus gros scores d'abord, ou les "premier propriétaire" d'abord pour leur bonus)
// et on garde celle qui donne le meilleur score total.
function bestOwnedLineup(owned: Card[], slots: number, config: ScoreConfig): Card[] {
  const byScore = [...owned].sort(
    (a, b) => itemScore(b.player, config) - itemScore(a.player, config),
  );
  const firstOwnerFirst = [...byScore].sort(
    (a, b) => Number(b.firstOwner) - Number(a.firstOwner),
  );
  const a = byScore.slice(0, slots);
  const b = firstOwnerFirst.slice(0, slots);
  const start = scoreLineup(b, config).total > scoreLineup(a, config).total ? b : a;
  return improveBySwaps(start, owned, config);
}

// Améliore une équipe en échangeant ses cartes avec d'autres cartes du club,
// tant qu'un échange fait monter le score total (utile à cause des bonus de tags).
function improveBySwaps(lineup: Card[], owned: Card[], config: ScoreConfig): Card[] {
  let best = lineup;
  let bestScore = scoreLineup(best, config).total;
  let improved = true;
  while (improved) {
    improved = false;
    const unused = owned.filter((c) => !best.includes(c));
    for (let i = 0; i < best.length && !improved; i++) {
      for (const candidate of unused) {
        const next = best.map((c, j) => (j === i ? candidate : c));
        const nextScore = scoreLineup(next, config).total;
        if (nextScore > bestScore) {
          best = next;
          bestScore = nextScore;
          improved = true;
          break;
        }
      }
    }
  }
  return best;
}

// Complète les emplacements vides avec les cartes du marché les moins chères.
// Renvoie null s'il n'y a pas assez de joueurs éligibles.
function fillEmptySlots(lineup: Card[], market: Card[], slots: number): Card[] | null {
  const missing = slots - lineup.length;
  if (missing <= 0) return lineup;
  const cheapest = [...market].sort((a, b) => a.player.price - b.player.price).slice(0, missing);
  if (cheapest.length < missing) return null;
  return [...lineup, ...cheapest];
}

// Remplace des cartes (du marché ou de ton club) jusqu'à atteindre le score visé.
// À chaque tour, on remplace la carte la plus faible :
//   - si un seul achat suffit à atteindre le seuil, on prend le moins cher ;
//   - sinon on prend celui qui rapporte le plus de points par crédit.
function improveUntil(
  start: Card[],
  candidates: Card[],
  target: number,
  config: ScoreConfig,
): Card[] | null {
  let lineup = start;
  let score = scoreLineup(lineup, config).total;

  while (score < target) {
    let bestFinisher: { lineup: Card[]; cost: number } | null = null;
    let bestStep: { lineup: Card[]; ratio: number } | null = null;

    // On essaie de remplacer chacune des cartes les moins utiles de l'équipe
    for (const slot of leastUsefulSlots(lineup, config, SLOTS_TO_TRY)) {
      // Si la carte remplacée était un achat, on n'a plus besoin de l'acheter
      const replaced = lineup[slot];
      const refund = replaced.owned ? 0 : replaced.player.price;

      for (const candidate of candidates) {
        if (lineup.some((c) => c.player.id === candidate.player.id)) continue;
        const next = lineup.map((c, i) => (i === slot ? candidate : c));
        const nextScore = scoreLineup(next, config).total;
        const gain = nextScore - score;
        if (gain <= 0) continue;
        const cost = (candidate.owned ? 0 : candidate.player.price) - refund;

        if (nextScore >= target) {
          if (!bestFinisher || cost < bestFinisher.cost) bestFinisher = { lineup: next, cost };
        } else {
          const ratio = gain / Math.max(cost, 1);
          if (!bestStep || ratio > bestStep.ratio) bestStep = { lineup: next, ratio };
        }
      }
    }

    const chosen = bestFinisher?.lineup ?? bestStep?.lineup;
    if (!chosen) return null; // plus aucun achat ne fait monter le score
    lineup = chosen;
    score = scoreLineup(lineup, config).total;
  }
  return lineup;
}

// Nombre de cartes de l'équipe qu'on essaie de remplacer à chaque tour
// (plus c'est grand, meilleur est le résultat, mais plus le calcul est long)
const SLOTS_TO_TRY = 3;

// Les emplacements dont la carte rapporte le moins : on mesure combien de points
// l'équipe perd si on retire la carte (son score + sa part dans les bonus de tags).
function leastUsefulSlots(lineup: Card[], config: ScoreConfig, count: number): number[] {
  const total = scoreLineup(lineup, config).total;
  return lineup
    .map((_, i) => ({
      index: i,
      usefulness: total - scoreLineup(lineup.filter((_, j) => j !== i), config).total,
    }))
    .sort((a, b) => a.usefulness - b.usefulness)
    .slice(0, count)
    .map((s) => s.index);
}
