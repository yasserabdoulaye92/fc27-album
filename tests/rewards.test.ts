import { test } from "node:test";
import assert from "node:assert/strict";
import { parseClub } from "../lib/club.ts";
import { planForReward } from "../lib/rewards.ts";
import type { Reward } from "../lib/types.ts";
import { config, player, rules, set } from "./fixtures.ts";

// Trois petits sets bon marché (10 jetons chacun) et un gros set cher (30 jetons)
const cheap = [1, 2, 3].map((i) => player({ club: `Petit ${i}`, rating: 80, price: 100 }));
const big = player({ club: "Gros", rating: 80, price: 5000 });
const players = [...cheap, big];
const sets = [
  ...cheap.map((p, i) =>
    set({ id: `petit-${i}`, slots: 1, eligibility: { club: p.club }, tiers: [{ name: "D", minScore: 1, tokens: 10 }] }),
  ),
  set({ id: "gros", slots: 1, eligibility: { club: "Gros" }, tiers: [{ name: "D", minScore: 1, tokens: 30 }] }),
];
const ctx = { sets, players, config, rules };
const club = parseClub("", players);
const reward: Reward = { id: "r", name: "Récompense", type: "hall-of-fut", cost: 30 };

test("récompense déjà abordable : rien à faire", () => {
  const result = planForReward(club, reward, 30, ctx);
  assert.equal(result.missing, 0);
  assert.equal(result.options.length, 0);
});

test("deux combinaisons : la moins chère et celle avec le moins de sets", () => {
  const result = planForReward(club, reward, 0, ctx);
  assert.equal(result.missing, 30);
  const [cheapest, fewest] = result.options;
  // Le moins cher : les 3 petits sets (300 crédits)
  assert.equal(cheapest.id, "cheapest");
  assert.equal(cheapest.plan.steps.length, 3);
  assert.equal(cheapest.plan.credits, 300);
  // Le moins de sets : le gros set seul (5 000 crédits)
  assert.equal(fewest.id, "fewest-sets");
  assert.equal(fewest.plan.steps.length, 1);
  assert.equal(fewest.plan.credits, 5000);
});

test("le solde de jetons réduit ce qu'il manque", () => {
  const result = planForReward(club, reward, 20, ctx);
  assert.equal(result.missing, 10);
  assert.equal(result.options[0].plan.steps.length, 1);
  assert.equal(result.options.length, 1); // déjà un seul set : pas de 2e option
});
