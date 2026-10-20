// Calcul du score d'un set, selon les règles de data/scores.json.
//   score de base = somme des scores des cartes
//   bonus         = pour chaque tag rempli : score des cartes concernées × pourcentage
//   score total   = base + bonus  → c'est lui qui donne le palier (D à S)

import type { Player, ScoreConfig, TagMatch, TagRule } from "./types.ts";

// Une carte placée dans un set
export type Card = {
  player: Player;
  owned: boolean; // déjà dans ton club (sinon : à acheter)
  firstOwner: boolean; // obtenue toi-même (packs, objectifs, DCE...)
};

export type TagResult = {
  tag: TagRule;
  count: number; // nombre de cartes concernées
  rate: number; // pourcentage atteint (0.5 = +50 %)
  bonus: number; // points ajoutés
};

export type LineupScore = {
  base: number;
  bonus: number;
  total: number;
  tags: TagResult[]; // seulement les tags remplis
};

// Les scores déjà calculés, pour ne pas refaire le calcul à chaque fois
// (le planificateur évalue des milliers d'équipes, ça va beaucoup plus vite).
const scoreCache = new WeakMap<ScoreConfig, WeakMap<Player, number>>();

// Score d'une carte seule : barème de sa note × multiplicateur de sa version
export function itemScore(player: Player, config: ScoreConfig): number {
  let cache = scoreCache.get(config);
  if (!cache) {
    cache = new WeakMap();
    scoreCache.set(config, cache);
  }
  let score = cache.get(player);
  if (score === undefined) {
    const base = config.ratingScores.find((r) => player.rating >= r.min)?.score ?? 0;
    const multiplier = config.versionMultipliers[player.version] ?? 1;
    score = Math.round(base * multiplier);
    cache.set(player, score);
  }
  return score;
}

export function scoreLineup(cards: Card[], config: ScoreConfig): LineupScore {
  let base = 0;
  for (const card of cards) base += itemScore(card.player, config);

  const tags: TagResult[] = [];
  let bonus = 0;
  for (const tag of config.tags) {
    const { count, score } = matchingCards(cards, tag.match, config);
    // Le pourcentage du plus haut palier de tag atteint
    let rate = 0;
    for (const t of tag.tiers) {
      if (count >= t.min) rate = t.bonus;
    }
    if (rate === 0) continue;
    // Le bonus ne porte que sur les cartes concernées, arrondi à l'inférieur
    const tagBonus = Math.floor(score * rate);
    tags.push({ tag, count, rate, bonus: tagBonus });
    bonus += tagBonus;
  }

  return { base, bonus, total: base + bonus, tags };
}

// Nombre de cartes concernées par un tag, et la somme de leurs scores
function matchingCards(
  cards: Card[],
  match: TagMatch,
  config: ScoreConfig,
): { count: number; score: number } {
  switch (match.kind) {
    case "firstOwner":
      return countWhere(cards, config, (c) => c.firstOwner);
    case "rating":
      return countWhere(
        cards,
        config,
        (c) => c.player.rating >= match.min && c.player.rating <= match.max,
      );
    case "version":
      return countWhere(cards, config, (c) => c.player.version === match.value);
    case "sameClub":
      return largestGroup(cards, config, (c) => c.player.club);
    case "sameLeague":
      return largestGroup(cards, config, (c) => c.player.league);
    case "sameNation":
      return largestGroup(cards, config, (c) => c.player.nation);
  }
}

function countWhere(
  cards: Card[],
  config: ScoreConfig,
  test: (c: Card) => boolean,
): { count: number; score: number } {
  let count = 0;
  let score = 0;
  for (const card of cards) {
    if (test(card)) {
      count++;
      score += itemScore(card.player, config);
    }
  }
  return { count, score };
}

// Regroupe les cartes (par club, ligue...) et renvoie le groupe le plus nombreux
// (à égalité, celui qui a le plus gros score)
function largestGroup(
  cards: Card[],
  config: ScoreConfig,
  key: (c: Card) => string,
): { count: number; score: number } {
  const groups = new Map<string, { count: number; score: number }>();
  let largest = { count: 0, score: 0 };
  for (const card of cards) {
    const k = key(card);
    const group = groups.get(k) ?? { count: 0, score: 0 };
    group.count++;
    group.score += itemScore(card.player, config);
    groups.set(k, group);
  }
  for (const group of groups.values()) {
    if (
      group.count > largest.count ||
      (group.count === largest.count && group.score > largest.score)
    ) {
      largest = group;
    }
  }
  return largest;
}

export function sum(values: number[]): number {
  return values.reduce((total, v) => total + v, 0);
}
