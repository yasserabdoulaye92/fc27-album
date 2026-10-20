import { test } from "node:test";
import assert from "node:assert/strict";
import { itemScore, scoreLineup, type Card } from "../lib/score.ts";
import { config, player } from "./fixtures.ts";

test("le score d'une carte suit le barème de sa note", () => {
  assert.equal(itemScore(player({ rating: 84 }), config), 830);
  assert.equal(itemScore(player({ rating: 87 }), config), 2100); // ligne "min: 85"
  assert.equal(itemScore(player({ rating: 70 }), config), 35);
});

test("la version de la carte multiplie son score", () => {
  assert.equal(itemScore(player({ rating: 90, version: "Héros" }), config), 17500);
});

test("exemple des recherches : 20 cartes 84 premier propriétaire = 99 600", () => {
  const p = player({ rating: 84 });
  const cards: Card[] = Array.from({ length: 20 }, () => ({ player: p, owned: true, firstOwner: true }));
  const result = scoreLineup(cards, config);
  assert.equal(result.base, 16600);
  assert.equal(result.bonus, 83000);
  assert.equal(result.total, 99600);
});

test("le bonus d'un tag ne porte que sur les cartes concernées", () => {
  const cards: Card[] = [
    ...Array.from({ length: 5 }, () => ({ player: player({ rating: 84 }), owned: true, firstOwner: true })),
    { player: player({ rating: 90 }), owned: true, firstOwner: false },
  ];
  const result = scoreLineup(cards, config);
  assert.equal(result.base, 5 * 830 + 14000);
  assert.equal(result.bonus, Math.floor(5 * 830 * 1.5)); // seulement les 5 cartes 84
});

test("pas de bonus sous le minimum du tag", () => {
  const cards: Card[] = Array.from({ length: 4 }, () => ({
    player: player({ rating: 84 }),
    owned: true,
    firstOwner: true,
  }));
  assert.equal(scoreLineup(cards, config).bonus, 0);
});
