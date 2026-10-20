import { test } from "node:test";
import assert from "node:assert/strict";
import { parseClub } from "../lib/club.ts";
import { planAlbum } from "../lib/planner.ts";
import { config, player, rules, set } from "./fixtures.ts";

// Deux sets qui partagent des joueurs : un set club (Club A) et un set ligue (Ligue 1).
const a1 = player({ club: "Club A", rating: 80, price: 1000 });
const a2 = player({ club: "Club A", rating: 80, price: 1000 });
const b1 = player({ club: "Club B", rating: 80, price: 5000 });
const players = [a1, a2, b1];

const clubSet = set({
  id: "club-a",
  slots: 2,
  eligibility: { club: "Club A" },
  tiers: [{ name: "D", minScore: 1, tokens: 10 }],
});
const leagueSet = set({
  id: "ligue-1",
  type: "league",
  slots: 2,
  eligibility: { league: "Ligue 1" },
  tiers: [{ name: "D", minScore: 1, tokens: 10 }],
});
const ctx = { sets: [clubSet, leagueSet], players, config, rules };
const emptyClub = parseClub("", players);

test("sans aucune limite saisie, pas de plan", () => {
  assert.equal(planAlbum(emptyClub, {}, ctx), null);
});

test("une carte commune à deux sets n'est payée qu'une fois", () => {
  const plan = planAlbum(emptyClub, { budget: 2000 }, ctx)!;
  // a1 + a2 remplissent le set club ET le set ligue : 20 jetons pour 2 000 crédits
  assert.equal(plan.tokens, 20);
  assert.equal(plan.credits, 2000);
  assert.equal(plan.transfers, 2);
  assert.equal(plan.steps.length, 2);
  assert.equal(plan.taxLoss, 100);
});

test("le budget est respecté", () => {
  const plan = planAlbum(emptyClub, { budget: 1500 }, ctx)!;
  assert.equal(plan.tokens, 0);
  assert.equal(plan.credits, 0);
});

test("la perte de taxe max limite aussi les achats", () => {
  // 50 crédits de perte max = 1 000 crédits d'achats max : pas assez pour remplir un set
  const plan = planAlbum(emptyClub, { maxTaxLoss: 50 }, ctx)!;
  assert.equal(plan.tokens, 0);
});

test("objectif de jetons : atteint au moindre coût", () => {
  const plan = planAlbum(emptyClub, { tokenGoal: 10 }, ctx)!;
  assert.equal(plan.goalReached, true);
  assert.ok(plan.tokens >= 10);
  assert.equal(plan.credits, 2000);
});

test("sets max : un set amélioré grâce aux cartes partagées compte aussi", () => {
  const plan = planAlbum(emptyClub, { budget: 100000, maxSets: 1 }, ctx)!;
  assert.equal(plan.steps.length, 1);
  assert.equal(plan.tokens, 10);
});

test("nombre de sets max", () => {
  const separate = set({
    id: "club-b",
    slots: 1,
    eligibility: { club: "Club B" },
    tiers: [{ name: "D", minScore: 1, tokens: 3 }],
  });
  const plan = planAlbum(
    emptyClub,
    { budget: 100000, maxSets: 1 },
    { ...ctx, sets: [separate, clubSet] },
  )!;
  assert.equal(plan.steps.length, 1);
});
