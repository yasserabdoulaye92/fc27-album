import { test } from "node:test";
import assert from "node:assert/strict";
import { parseClub } from "../lib/club.ts";
import { clubToRows, rowsToClubText } from "../lib/sync.ts";
import { player } from "./fixtures.ts";

const players = [player({ id: 1 }), player({ id: 2 })];

test("club -> lignes : cartes connues et ids inconnus gardés, texte ignoré", () => {
  const club = parseClub("2*, 1, 50001*, 50002, abc", players);
  assert.deepEqual(clubToRows(club), [
    { player_id: 1, first_owner: false },
    { player_id: 2, first_owner: true },
    { player_id: 50001, first_owner: true },
    { player_id: 50002, first_owner: false },
  ]);
});

test("lignes -> texte, et aller-retour sans perte", () => {
  const text = rowsToClubText([
    { player_id: 50001, first_owner: true },
    { player_id: 2, first_owner: false },
  ]);
  assert.equal(text, "2, 50001*");
  assert.equal(rowsToClubText(clubToRows(parseClub(text, players))), text);
});
