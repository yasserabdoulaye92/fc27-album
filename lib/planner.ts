// Planificateur (étape 2) : quels sets / paliers faire pour gagner le plus de jetons
// avec un budget, ou pour atteindre un objectif de jetons en dépensant le moins possible.
//
// Deux méthodes, et on garde le meilleur résultat :
//
//  1. GLOUTONNE : à chaque tour, on recalcule tous les sets avec les cartes déjà achetées,
//     puis on prend l'amélioration qui rapporte le plus de jetons par crédit.
//     Comme on recalcule à chaque tour, une carte achetée pour un set club compte aussi
//     pour le set ligue : son prix n'est jamais compté deux fois.
//
//  2. PROGRAMMATION DYNAMIQUE ("sac à dos") : chaque set propose plusieurs options
//     (un palier = un coût + des jetons), on en choisit au plus une par set.
//     On arrondit les coûts par tranches de 100 crédits pour que le tableau reste petit.
//     Cette méthode suppose les sets indépendants : on recalcule ensuite le vrai coût
//     en dédoublonnant les cartes communes à plusieurs sets.

import { analyzeSet, isEligible, type SetAnalysis } from "./album.ts";
import type { ParsedClub } from "./club.ts";
import { sum } from "./score.ts";
import type { AlbumSet, GradeTier, Player, Rules, ScoreConfig } from "./types.ts";

// Les limites saisies par l'utilisateur (toutes facultatives)
export type PlannerInput = {
  budget?: number; // crédits max à avancer pour les achats
  tokenGoal?: number; // objectif de jetons
  maxTaxLoss?: number; // perte de taxe max (à la revente)
  maxTransfers?: number; // nombre max de cartes à acheter
  maxSets?: number; // nombre max de sets à améliorer
};

export type PlanStep = {
  set: AlbumSet;
  fromTier: GradeTier | null; // palier avant
  toTier: GradeTier; // palier après
  tokens: number; // jetons gagnés sur ce set
  toBuy: Player[]; // cartes achetées utiles à ce set (certaines servent aussi ailleurs)
};

export type Plan = {
  method: "greedy" | "dynamic";
  steps: PlanStep[];
  shoppingList: Player[]; // toutes les cartes à acheter, sans doublon
  tokens: number;
  credits: number;
  taxLoss: number;
  transfers: number;
  goalReached: boolean | null; // null s'il n'y a pas d'objectif
};

type Context = {
  sets: AlbumSet[];
  players: Player[];
  config: ScoreConfig;
  rules: Rules;
};

// Unité d'arrondi des coûts pour la programmation dynamique
const CREDIT_UNIT = 100;
// Au-delà, le tableau serait trop gros : on garde seulement la méthode gloutonne
const MAX_DP_SIZE = 200_000;

export function hasAnyLimit(input: PlannerInput): boolean {
  return Object.values(input).some((v) => v !== undefined);
}

export function planAlbum(club: ParsedClub, input: PlannerInput, ctx: Context): Plan | null {
  if (!hasAnyLimit(input)) return null;

  // Analyse de départ de chaque set, partagée par les deux méthodes
  const base = new Map(
    ctx.sets.map((set) => [set.id, analyzeSet(set, club, ctx.players, ctx.config, ctx.rules)]),
  );
  const greedy = greedyPlan(club, input, ctx, base);
  const dynamic = dynamicPlan(club, input, ctx, base);
  if (!dynamic) return greedy;

  return isBetter(dynamic, greedy, input) ? dynamic : greedy;
}

// Le plan a est-il meilleur que le plan b ?
function isBetter(a: Plan, b: Plan, input: PlannerInput): boolean {
  if (input.tokenGoal !== undefined) {
    // Avec un objectif : d'abord l'atteindre, ensuite dépenser le moins possible
    if (a.goalReached !== b.goalReached) return a.goalReached === true;
    if (a.goalReached) return a.credits < b.credits;
  }
  if (a.tokens !== b.tokens) return a.tokens > b.tokens;
  return a.credits < b.credits;
}

// ---------------------------------------------------------------------------
// 1. Méthode gloutonne
// ---------------------------------------------------------------------------

function greedyPlan(
  club: ParsedClub,
  input: PlannerInput,
  ctx: Context,
  base: Map<string, SetAnalysis>,
): Plan {
  const bought = new Map<number, Player>(); // cartes achetées jusqu'ici
  const touchedSets = new Set<string>(); // sets améliorés
  // Analyses à jour ; après un achat, on ne recalcule que les sets concernés
  const analyses = new Map(base);
  let tokens = 0;

  for (;;) {
    const current = withPurchases(club, bought);
    const credits = sum([...bought.values()].map((p) => p.price));

    let finisher: { analysis: SetAnalysis; tierIndex: number; cost: number } | null = null;
    let bestStep: { analysis: SetAnalysis; tierIndex: number; ratio: number } | null = null;

    for (const set of ctx.sets) {
      let analysis = analyses.get(set.id);
      if (!analysis) {
        analysis = analyzeSet(set, current, ctx.players, ctx.config, ctx.rules);
        analyses.set(set.id, analysis);
      }
      for (let tierIndex = 0; tierIndex < analysis.tiers.length; tierIndex++) {
        const t = analysis.tiers[tierIndex];
        if (t.reached || t.impossible || t.tokens <= 0) continue;

        const newCards = t.toBuy.filter((p) => !bought.has(p.id));
        const nextCredits = credits + sum(newCards.map((p) => p.price));
        const nextSets = touchedSets.size + (touchedSets.has(set.id) ? 0 : 1);
        if (!respectsLimits(input, ctx.rules, nextCredits, bought.size + newCards.length, nextSets)) {
          continue;
        }

        const cost = nextCredits - credits;
        if (input.tokenGoal !== undefined && tokens + t.tokens >= input.tokenGoal) {
          if (!finisher || cost < finisher.cost) finisher = { analysis, tierIndex, cost };
        } else {
          const ratio = t.tokens / Math.max(cost, 1);
          if (!bestStep || ratio > bestStep.ratio) bestStep = { analysis, tierIndex, ratio };
        }
      }
    }

    const chosen = finisher ?? bestStep;
    if (!chosen) break; // plus rien de faisable

    const tier = chosen.analysis.tiers[chosen.tierIndex];
    for (const p of tier.toBuy) bought.set(p.id, p);
    for (const set of ctx.sets) {
      if (tier.toBuy.some((p) => isEligible(p, set))) analyses.delete(set.id);
    }
    touchedSets.add(chosen.analysis.set.id);
    tokens += tier.tokens;

    if (input.tokenGoal !== undefined && tokens >= input.tokenGoal) break;
  }

  return buildPlan("greedy", club, bought, input, ctx, base);
}

// ---------------------------------------------------------------------------
// 2. Programmation dynamique (sac à dos, un palier au plus par set)
// ---------------------------------------------------------------------------

type Option = { units: number; credits: number; tokens: number; toBuy: Player[] };

function dynamicPlan(
  club: ParsedClub,
  input: PlannerInput,
  ctx: Context,
  base: Map<string, SetAnalysis>,
): Plan | null {
  // Les options de chaque set, calculées avec le club de départ
  const groups: Option[][] = [...base.values()]
    .map((analysis) =>
      analysis.tiers
        .filter((t) => !t.reached && !t.impossible && t.tokens > 0)
        .map((t) => ({
          units: Math.ceil(t.credits / CREDIT_UNIT),
          credits: t.credits,
          tokens: t.tokens,
          toBuy: t.toBuy,
        })),
    )
    .filter((options) => options.length > 0);

  const chosen =
    input.tokenGoal !== undefined
      ? cheapestForGoal(groups, input.tokenGoal)
      : mostTokensForBudget(groups, creditCap(input, ctx.rules));
  if (!chosen) return null;

  const bought = new Map<number, Player>();
  for (const option of chosen) for (const p of option.toBuy) bought.set(p.id, p);
  const plan = buildPlan("dynamic", club, bought, input, ctx, base);

  // Le sac à dos ne surveille que le budget : on vérifie les autres limites ici
  const ok = respectsLimits(input, ctx.rules, plan.credits, plan.transfers, plan.steps.length);
  return ok ? plan : null;
}

// Le plus de jetons possible sans dépasser "cap" crédits
function mostTokensForBudget(groups: Option[][], cap: number): Option[] | null {
  if (!Number.isFinite(cap)) return null; // pas de limite de crédits : le glouton suffit
  const size = Math.floor(cap / CREDIT_UNIT);
  if (size > MAX_DP_SIZE) return null;

  // best[b] = le plus de jetons avec au plus b unités de crédits
  let best = new Array<number>(size + 1).fill(0);
  const picks: Int16Array[] = []; // pour chaque set : quelle option a été prise pour chaque b

  for (const options of groups) {
    const next = best.slice();
    const pick = new Int16Array(size + 1).fill(-1);
    for (let b = 0; b <= size; b++) {
      options.forEach((option, k) => {
        if (option.units <= b && best[b - option.units] + option.tokens > next[b]) {
          next[b] = best[b - option.units] + option.tokens;
          pick[b] = k;
        }
      });
    }
    best = next;
    picks.push(pick);
  }

  // On remonte le tableau pour retrouver les options choisies
  let b = size;
  const chosen: Option[] = [];
  for (let g = groups.length - 1; g >= 0; g--) {
    const k = picks[g][b];
    if (k >= 0) {
      chosen.push(groups[g][k]);
      b -= groups[g][k].units;
    }
  }
  return chosen;
}

// Le moins de crédits possible pour atteindre "goal" jetons
function cheapestForGoal(groups: Option[][], goal: number): Option[] | null {
  // cost[t] = le moins de crédits pour gagner t jetons (t plafonné à goal)
  let cost = new Array<number>(goal + 1).fill(Infinity);
  cost[0] = 0;
  const picks: { option: Int16Array; from: Int32Array }[] = [];

  for (const options of groups) {
    const next = cost.slice();
    const option = new Int16Array(goal + 1).fill(-1);
    const from = new Int32Array(goal + 1).fill(-1);
    for (let t = 0; t <= goal; t++) {
      if (cost[t] === Infinity) continue;
      options.forEach((o, k) => {
        const nt = Math.min(goal, t + o.tokens);
        if (cost[t] + o.credits < next[nt]) {
          next[nt] = cost[t] + o.credits;
          option[nt] = k;
          from[nt] = t;
        }
      });
    }
    cost = next;
    picks.push({ option, from });
  }

  // Si l'objectif est inatteignable, on vise le plus de jetons possible
  let t = goal;
  while (t > 0 && cost[t] === Infinity) t--;
  if (t === 0) return null;

  const chosen: Option[] = [];
  for (let g = groups.length - 1; g >= 0; g--) {
    const k = picks[g].option[t];
    if (k >= 0) {
      chosen.push(groups[g][k]);
      t = picks[g].from[t];
    }
  }
  return chosen;
}

// ---------------------------------------------------------------------------
// Outils communs
// ---------------------------------------------------------------------------

// Crédits max autorisés : le budget, et la perte de taxe max convertie en crédits
function creditCap(input: PlannerInput, rules: Rules): number {
  let cap = input.budget ?? Infinity;
  if (input.maxTaxLoss !== undefined && rules.taxRate > 0) {
    cap = Math.min(cap, input.maxTaxLoss / rules.taxRate);
  }
  return cap;
}

function respectsLimits(
  input: PlannerInput,
  rules: Rules,
  credits: number,
  transfers: number,
  sets: number,
): boolean {
  return (
    credits <= creditCap(input, rules) &&
    (input.maxTransfers === undefined || transfers <= input.maxTransfers) &&
    (input.maxSets === undefined || sets <= input.maxSets)
  );
}

// Le club + les cartes achetées (une carte achetée n'est jamais premier propriétaire)
function withPurchases(club: ParsedClub, bought: Map<number, Player>): ParsedClub {
  return {
    ownedIds: new Set([...club.ownedIds, ...bought.keys()]),
    firstOwnerIds: club.firstOwnerIds,
    unknown: club.unknown,
  };
}

// Jetons déjà gagnés sur un set (paliers atteints)
export function earnedTokens(analysis: SetAnalysis, rules: Rules): number {
  const reached = analysis.tiers.filter((t) => t.reached);
  if (reached.length === 0) return 0;
  return rules.cumulativeTiers
    ? sum(reached.map((t) => t.tier.tokens))
    : reached[reached.length - 1].tier.tokens;
}

// Construit le plan final en recalculant tous les sets avec les achats :
// c'est ce recalcul qui donne les vrais chiffres (cartes partagées comptées une fois).
function buildPlan(
  method: Plan["method"],
  club: ParsedClub,
  bought: Map<number, Player>,
  input: PlannerInput,
  ctx: Context,
  base: Map<string, SetAnalysis>,
): Plan {
  const after = withPurchases(club, bought);
  let steps: PlanStep[] = [];

  for (const set of ctx.sets) {
    // Un set sans aucune carte achetée éligible ne change pas
    if (![...bought.values()].some((p) => isEligible(p, set))) continue;
    const before = base.get(set.id)!;
    const now = analyzeSet(set, after, ctx.players, ctx.config, ctx.rules);
    const gained = earnedTokens(now, ctx.rules) - earnedTokens(before, ctx.rules);
    if (gained <= 0 || !now.currentTier) continue;
    steps.push({
      set,
      fromTier: before.currentTier,
      toTier: now.currentTier,
      tokens: gained,
      toBuy: now.lineup.filter((c) => bought.has(c.player.id)).map((c) => c.player),
    });
  }

  // Les achats peuvent améliorer "gratuitement" d'autres sets (cartes partagées).
  // S'il y a une limite de sets, on garde ceux qui rapportent le plus de jetons.
  steps.sort((a, b) => b.tokens - a.tokens);
  if (input.maxSets !== undefined) steps = steps.slice(0, input.maxSets);
  const tokens = sum(steps.map((s) => s.tokens));

  // On ne garde que les cartes vraiment utilisées par au moins un set du plan
  const used = new Set(steps.flatMap((s) => s.toBuy.map((p) => p.id)));
  const shoppingList = [...bought.values()]
    .filter((p) => used.has(p.id))
    .sort((a, b) => b.price - a.price);
  const credits = sum(shoppingList.map((p) => p.price));

  return {
    method,
    steps,
    shoppingList,
    tokens,
    credits,
    taxLoss: Math.round(credits * ctx.rules.taxRate),
    transfers: shoppingList.length,
    goalReached: input.tokenGoal === undefined ? null : tokens >= input.tokenGoal,
  };
}
