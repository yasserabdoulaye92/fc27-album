import { test } from "node:test";
import assert from "node:assert/strict";
import { parseClub } from "../lib/club.ts";
import { player } from "./fixtures.ts";

const players = [
  player({ id: 1, name: "Lucas Ferrand" }),
  player({ id: 2, name: "Marco Bellini" }),
  player({ id: 3, name: "Tom Vasseur" }),
];

test("liste d'ids avec séparateurs variés et étoiles", () => {
  const club = parseClub("1, 2*\n3 ; 99 abc", players);
  assert.deepEqual([...club.ownedIds], [1, 2, 3]);
  assert.deepEqual([...club.firstOwnerIds], [2]);
  assert.deepEqual(club.unknown, ["99", "abc"]);
});

test("CSV avec id, nom et premier propriétaire", () => {
  const csv = 'id;nom;premier_proprietaire\n1;;oui\n;"Marco Bellini";non\n42;Inconnu;oui';
  const club = parseClub(csv, players);
  assert.deepEqual([...club.ownedIds], [1, 2]);
  assert.deepEqual([...club.firstOwnerIds], [1]);
  assert.deepEqual(club.unknown, ["42;Inconnu;oui"]);
});

test("CSV séparé par des virgules, retrouvé par le nom", () => {
  const club = parseClub("name,rating\ntom vasseur,79", players);
  assert.deepEqual([...club.ownedIds], [3]);
});

test("texte vide", () => {
  const club = parseClub("  \n ", players);
  assert.equal(club.ownedIds.size, 0);
  assert.equal(club.unknown.length, 0);
});
