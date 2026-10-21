import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

// parse.js est un script classique d'extension : on l'exécute dans un bac à sable
type Item = { itemId: number; cardId: number; rating: number; firstOwner: boolean; loan: boolean };
type Album27 = {
  isClubUrl: (url: string) => boolean;
  extractPlayers: (data: unknown) => Item[];
  toClubText: (items: Item[]) => string;
};
const sandbox: { Album27?: Album27; globalThis?: unknown } = {};
sandbox.globalThis = sandbox;
runInNewContext(readFileSync(new URL("../extension/parse.js", import.meta.url), "utf8"), sandbox);
const { isClubUrl, toClubText } = sandbox.Album27!;
// Les objets créés dans le bac à sable ont un autre prototype : on les recopie
const extractPlayers = (data: unknown): Item[] =>
  JSON.parse(JSON.stringify(sandbox.Album27!.extractPlayers(data)));

test("seules les réponses du club sont lues", () => {
  assert.equal(isClubUrl("https://utas.example.ea.com/ut/game/fc27/club?count=91"), true);
  assert.equal(isClubUrl("https://utas.example.ea.com/ut/game/fc27/purchased/items"), true);
  assert.equal(isClubUrl("https://utas.example.ea.com/ut/game/fc27/transfermarket?num=21"), false);
  assert.equal(isClubUrl("https://utas.example.ea.com/ut/game/fc27/watchlist"), false);
  assert.equal(isClubUrl(""), false);
});

test("extraction des cartes joueur, quelle que soit la forme de la réponse", () => {
  const response = {
    itemData: [
      { id: 1001, itemType: "player", definitionId: 50001, rating: 86, owners: 1 },
      { id: 1002, itemType: "player", resourceId: 50002, rating: 84, owners: 3 },
      { id: 1003, itemType: "player", definitionId: 50003, rating: 80, loans: 5 },
      { id: 1004, itemType: "kit", definitionId: 9, rating: 0 },
      { id: 1001, itemType: "player", definitionId: 50001, rating: 86, owners: 1 }, // doublon
    ],
    squad: { players: [{ itemData: { id: 1005, itemType: "player", definitionId: 50005, rating: 90 } }] },
  };
  const items = extractPlayers(response);
  assert.deepEqual(
    items.map((i) => [i.itemId, i.cardId, i.firstOwner, i.loan]),
    [
      [1001, 50001, true, false],
      [1002, 50002, false, false],
      [1003, 50003, false, true],
      [1005, 50005, false, false],
    ],
  );
});

test("texte du club : étoile pour le premier propriétaire, prêts exclus, une entrée par carte", () => {
  const items: Item[] = [
    { itemId: 1, cardId: 50001, rating: 86, firstOwner: false, loan: false },
    { itemId: 2, cardId: 50001, rating: 86, firstOwner: true, loan: false }, // 2e exemplaire
    { itemId: 3, cardId: 50002, rating: 84, firstOwner: false, loan: false },
    { itemId: 4, cardId: 50003, rating: 80, firstOwner: true, loan: true },
  ];
  assert.equal(toClubText(items), "50001*, 50002");
});
