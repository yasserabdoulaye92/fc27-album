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

// Score d'une carte seule : barème de sa note × multiplicateur de sa version
export function itemScore(player: Player, config: ScoreConfig): number {
  const base = config.ratingScores.find((r) => player.rating >= r.min)?.score ?? 0;
  const multiplier = config.versionMultipliers[player.version] ?? 1;
  return Math.round(base * multiplier);
}

export function scoreLineup(cards: Card[], config: ScoreConfig): LineupScore {
  const base = sum(cards.map((c) => itemScore(c.player, config)));

  const tags: TagResult[] = [];
  for (const tag of config.tags) {
    const matching = matchingCards(cards, tag.match);
    // Le pourcentage du plus haut palier de tag atteint
    let rate = 0;
    for (const t of tag.tiers) {
      if (matching.length >= t.min) rate = t.bonus;
    }
    if (rate === 0) continue;
    // Le bonus ne porte que sur les cartes concernées, arrondi à l'inférieur
    const bonus = Math.floor(sum(matching.map((c) => itemScore(c.player, config))) * rate);
    tags.push({ tag, count: matching.length, rate, bonus });
  }

  const bonus = sum(tags.map((t) => t.bonus));
  return { base, bonus, total: base + bonus, tags };
}

// Les cartes d'une équipe concernées par un tag
function matchingCards(cards: Card[], match: TagMatch): Card[] {
  switch (match.kind) {
    case "firstOwner":
      return cards.filter((c) => c.firstOwner);
    case "rating":
      return cards.filter((c) => c.player.rating >= match.min && c.player.rating <= match.max);
    case "version":
      return cards.filter((c) => c.player.version === match.value);
    case "sameClub":
      return largestGroup(cards, (c) => c.player.club);
    case "sameLeague":
      return largestGroup(cards, (c) => c.player.league);
    case "sameNation":
      return largestGroup(cards, (c) => c.player.nation);
  }
}

// Regroupe les cartes (par club, ligue...) et renvoie le groupe le plus nombreux
function largestGroup(cards: Card[], key: (c: Card) => string): Card[] {
  const groups = new Map<string, Card[]>();
  for (const card of cards) {
    const k = key(card);
    groups.set(k, [...(groups.get(k) ?? []), card]);
  }
  let largest: Card[] = [];
  for (const group of groups.values()) {
    if (group.length > largest.length) largest = group;
  }
  return largest;
}

export function sum(values: number[]): number {
  return values.reduce((total, v) => total + v, 0);
}
