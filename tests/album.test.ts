import { test } from "node:test";
import assert from "node:assert/strict";
import { analyzeSet } from "../lib/album.ts";
import { parseClub } from "../lib/club.ts";
import { config, player, rules, set } from "./fixtures.ts";

// Set de 3 emplacements : D dès qu'il est rempli, B à 2 000 points, S à 15 000.
const albumSet = set({
  slots: 3,
  tiers: [
    { name: "D", minScore: 1, tokens: 5 },
    { name: "B", minScore: 2000, tokens: 10 },
    { name: "S", minScore: 15000, tokens: 20 },
  ],
});

const cheap1 = player({ rating: 80, price: 200 }); // 180 pts
const cheap2 = player({ rating: 80, price: 300 }); // 180 pts
const good = player({ rating: 85, price: 3000 }); // 2 100 pts
const star = player({ rating: 90, price: 40000 }); // 14 000 pts
const otherClub = player({ rating: 90, club: "Club B", price: 10 });
const players = [cheap1, cheap2, good, star, otherClub];

test("club vide : il faut acheter de quoi remplir le set, au moins cher", () => {
  const a = analyzeSet(albumSet, parseClub("", players), players, config, rules);
  assert.equal(a.complete, false);
  assert.equal(a.currentTier, null);
  const d = a.tiers[0];
  assert.deepEqual(
    d.toBuy.map((p) => p.id).sort(),
    [cheap1.id, cheap2.id, good.id].sort(), // les 3 seuls joueurs du club, otherClub est exclu
  );
  assert.equal(d.credits, 3500);
  assert.equal(d.taxLoss, 175);
  // D + B atteints d'un coup (2 460 points) : jetons cumulés
  assert.equal(a.tiers[1].tokens, 15);
});

test("set déjà rempli : paliers atteints et achat du palier suivant", () => {
  const club = parseClub(`${cheap1.id} ${cheap2.id} ${good.id}`, players);
  const a = analyzeSet(albumSet, club, players, config, rules);
  assert.equal(a.currentTier?.name, "B");
  assert.ok(a.tiers[0].reached && a.tiers[1].reached);
  const s = a.tiers[2];
  assert.deepEqual(s.toBuy.map((p) => p.id), [star.id]);
  assert.equal(s.tokens, 20);
  assert.equal(s.taxLossPerToken, Math.round((40000 * 0.05) / 20));
});

test("palier impossible quand aucun joueur ne permet d'y arriver", () => {
  const hard = set({ ...albumSet, tiers: [{ name: "S", minScore: 1_000_000, tokens: 50 }] });
  const a = analyzeSet(hard, parseClub("", players), players, config, rules);
  assert.equal(a.tiers[0].impossible, true);
  assert.equal(a.best, null);
});
