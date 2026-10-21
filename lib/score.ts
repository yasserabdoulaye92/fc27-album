// Calcul du score d'un set, selon les règles de data/scores.json.
//   score de base = somme des scores des cartes
//   bonus         = pour chaque tag rempli : score des cartes concernées × pourcentage
//   score total   = base + bonus  → c'est lui qui donne le palier (D à S)
//
// Le calcul passe par un "compteur" (LineupScorer) qui garde les totaux de l'équipe :
// pour tester un échange de carte, on ne met à jour que ce qui change au lieu de tout
// recalculer. C'est ce qui rend le planificateur rapide sur les sets de 30 cartes.

import type { GroupAttribute, Player, ScoreConfig, TagMatch, TagRule } from "./types.ts";

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
const scoreCache = new WeakMap<ScoreConfig, WeakMap<Player, number>>();

// Score d'une carte seule : vrai score s'il est connu, sinon barème de sa note × version
export function itemScore(player: Player, config: ScoreConfig): number {
  let cache = scoreCache.get(config);
  if (!cache) {
    cache = new WeakMap();
    scoreCache.set(config, cache);
  }
  let score = cache.get(player);
  if (score === undefined) {
    if (player.score !== undefined) {
      score = player.score; // vrai score (import FUT.GG)
    } else {
      const base = config.ratingScores.find((r) => player.rating >= r.min)?.score ?? 0;
      score = Math.round(base * (config.versionMultipliers[player.version] ?? 1));
    }
    cache.set(player, score);
  }
  return score;
}

export function scoreLineup(cards: Card[], config: ScoreConfig): LineupScore {
  return new LineupScorer(cards, config).details();
}

// ---------------------------------------------------------------------------
// Les trois façons dont un tag compte les cartes
// ---------------------------------------------------------------------------

type Group = { count: number; sum: number };

// Ce que chaque tag garde en mémoire pour l'équipe en cours
type TagState =
  | { type: "count"; rule: TagRule; test: (c: Card) => boolean; count: number; sum: number }
  | { type: "same"; rule: TagRule; key: (c: Card) => string; groups: Map<string, Group> }
  | {
      type: "different";
      rule: TagRule;
      key: (c: Card) => string;
      groups: Map<string, number[]>; // scores des cartes de chaque groupe
      sumOfBest: number; // somme de la meilleure carte de chaque groupe
    };

function createState(rule: TagRule): TagState {
  const match: TagMatch = rule.match;
  switch (match.kind) {
    case "same":
      return { type: "same", rule, key: (c) => groupKey(c, match.attribute), groups: new Map() };
    case "sameClub":
    case "sameLeague":
    case "sameNation": {
      const attribute = ({ sameClub: "club", sameLeague: "league", sameNation: "nation" } as const)[match.kind];
      return { type: "same", rule, key: (c) => groupKey(c, attribute), groups: new Map() };
    }
    case "different":
      return {
        type: "different",
        rule,
        key: (c) => groupKey(c, match.attribute),
        groups: new Map(),
        sumOfBest: 0,
      };
    default:
      return { type: "count", rule, test: countTest(match), count: 0, sum: 0 };
  }
}

// Pour les tags qui comptent simplement les cartes qui remplissent une condition
function countTest(match: TagMatch): (c: Card) => boolean {
  switch (match.kind) {
    case "firstOwner":
      return (c) => c.firstOwner;
    case "rating":
      return (c) => c.player.rating >= match.min && c.player.rating <= match.max;
    case "version":
      return (c) => c.player.version === match.value;
    case "rarity":
      return (c) => match.ids.includes(c.player.rarityId ?? -1);
    case "holographic":
      return (c) => c.player.holographic === true;
    case "positions":
      return (c) => (c.player.positions ?? []).some((p) => match.values.includes(p));
    case "minAttribute":
      return (c) => (c.player[match.attribute] ?? 0) >= match.min;
    default:
      return () => false;
  }
}

// Valeur comparée par les tags "même" / "différents" (identifiant EA s'il est connu)
function groupKey(card: Card, attribute: GroupAttribute): string {
  const p = card.player;
  switch (attribute) {
    case "club":
      return String(p.clubId ?? p.club);
    case "league":
      return String(p.leagueId ?? p.league);
    case "nation":
      return String(p.nationId ?? p.nation);
    case "player":
      return String(p.baseId ?? p.name);
  }
}

// Pourcentage du plus haut palier de tag atteint
function rateFor(rule: TagRule, count: number): number {
  let rate = 0;
  for (const t of rule.tiers) if (count >= t.min) rate = t.bonus;
  return rate;
}

// Nombre de cartes concernées et somme de leurs scores, pour l'équipe en cours
function measure(state: TagState): Group {
  if (state.type === "count") return { count: state.count, sum: state.sum };
  if (state.type === "same") {
    // Le plus grand groupe (à égalité, celui qui a le plus gros score)
    let best: Group = { count: 0, sum: 0 };
    for (const g of state.groups.values()) {
      if (g.count > best.count || (g.count === best.count && g.sum > best.sum)) best = g;
    }
    return best;
  }
  // "différents" : une carte par valeur, la meilleure de chaque groupe (tenu à jour par apply)
  return { count: state.groups.size, sum: state.sumOfBest };
}

// ---------------------------------------------------------------------------
// Le compteur
// ---------------------------------------------------------------------------

// Pour une carte : son score, les tags "comptage" qu'elle remplit, ses clés de groupe
type Features = { score: number; matches: boolean[]; keys: string[] };
// Les tags dépendent des règles (config) : un cache par config, puis par carte
const featureCache = new WeakMap<ScoreConfig, WeakMap<Card, Features>>();

export class LineupScorer {
  private base = 0;
  private cards: Card[];
  private config: ScoreConfig;
  private states: TagState[];

  constructor(cards: Card[], config: ScoreConfig) {
    this.cards = [...cards];
    this.config = config;
    this.states = config.tags.map(createState);
    for (const card of this.cards) this.apply(card, +1);
  }

  // Caractéristiques d'une carte pour chaque tag, calculées une seule fois par carte
  private features(card: Card): Features {
    let byCard = featureCache.get(this.config);
    if (!byCard) {
      byCard = new WeakMap();
      featureCache.set(this.config, byCard);
    }
    let features = byCard.get(card);
    if (!features) {
      features = {
        score: itemScore(card.player, this.config),
        matches: this.states.map((s) => (s.type === "count" ? s.test(card) : false)),
        keys: this.states.map((s) => (s.type === "count" ? "" : s.key(card))),
      };
      byCard.set(card, features);
    }
    return features;
  }

  // Ajoute (+1) ou retire (-1) une carte de tous les totaux
  private apply(card: Card, sign: 1 | -1) {
    const features = this.features(card);
    const score = features.score;
    this.base += sign * score;
    for (let i = 0; i < this.states.length; i++) {
      const state = this.states[i];
      if (state.type === "count") {
        if (features.matches[i]) {
          state.count += sign;
          state.sum += sign * score;
        }
      } else if (state.type === "same") {
        const key = features.keys[i];
        const group = state.groups.get(key) ?? { count: 0, sum: 0 };
        group.count += sign;
        group.sum += sign * score;
        if (group.count === 0) state.groups.delete(key);
        else state.groups.set(key, group);
      } else {
        const key = features.keys[i];
        const scores = state.groups.get(key) ?? [];
        const before = scores.length ? Math.max(...scores) : 0;
        if (sign === 1) scores.push(score);
        else scores.splice(scores.indexOf(score), 1);
        const after = scores.length ? Math.max(...scores) : 0;
        state.sumOfBest += after - before;
        if (scores.length === 0) state.groups.delete(key);
        else state.groups.set(key, scores);
      }
    }
  }

  total(): number {
    let total = this.base;
    for (const state of this.states) {
      const { count, sum } = measure(state);
      const rate = rateFor(state.rule, count);
      if (rate > 0) total += Math.floor(sum * rate);
    }
    return total;
  }

  // Score si on remplaçait la carte n° index par "card" (l'équipe ne change pas)
  totalIfSwapped(index: number, card: Card): number {
    const old = this.cards[index];
    this.apply(old, -1);
    this.apply(card, +1);
    const total = this.total();
    this.apply(card, -1);
    this.apply(old, +1);
    return total;
  }

  // Score si on retirait la carte n° index
  totalIfRemoved(index: number): number {
    const old = this.cards[index];
    this.apply(old, -1);
    const total = this.total();
    this.apply(old, +1);
    return total;
  }

  // Remplace vraiment la carte n° index
  swap(index: number, card: Card) {
    this.apply(this.cards[index], -1);
    this.apply(card, +1);
    this.cards[index] = card;
  }

  lineup(): Card[] {
    return [...this.cards];
  }

  // Détail complet (pour l'affichage)
  details(): LineupScore {
    const tags: TagResult[] = [];
    let bonus = 0;
    for (const state of this.states) {
      const { count, sum } = measure(state);
      const rate = rateFor(state.rule, count);
      if (rate === 0) continue;
      const tagBonus = Math.floor(sum * rate);
      tags.push({ tag: state.rule, count, rate, bonus: tagBonus });
      bonus += tagBonus;
    }
    return { base: this.base, bonus, total: this.base + bonus, tags };
  }
}

export function sum(values: number[]): number {
  return values.reduce((total, v) => total + v, 0);
}
