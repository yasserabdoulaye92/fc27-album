import { test } from "node:test";
import assert from "node:assert/strict";
import { convertTags, type FutggTag } from "../lib/futgg.ts";
import { scoreLineup, type Card } from "../lib/score.ts";
import { player } from "./fixtures.ts";

const futggTags: FutggTag[] = [
  { id: 1, name: "First Owner", tiers: [{ minItems: 5, bonus: 150 }], rules: [{ type: "COUNT", attribute: "FIRST_OWNED", values: ["1"] }] },
  { id: 21, name: "Defensive Wall", tiers: [{ minItems: 2, bonus: 3 }], rules: [{ type: "COUNT_ANY", attribute: "POSSIBLE_POSITIONS", values: ["RB", "CB", "LB"] }] },
  { id: 17, name: "Different Nation", tiers: [{ minItems: 3, bonus: 1 }], rules: [{ type: "COUNT_DIFF", attribute: "NATION", values: ["0"] }] },
  { id: 15, name: "Multiples!", tiers: [{ minItems: 2, bonus: 10 }], rules: [{ type: "MAX_COUNT_ALL_SAME", attribute: "BASE_DEF_ID", values: ["0"] }] },
  { id: 99, name: "Inconnu", tiers: [{ minItems: 1, bonus: 1 }], rules: [{ type: "WEIRD", attribute: "X", values: [] }] },
  { id: 1, name: "First Owner", tiers: [{ minItems: 5, bonus: 150 }], rules: [{ type: "COUNT", attribute: "FIRST_OWNED", values: ["1"] }] },
];

test("conversion des tags FUT.GG : noms français, % -> taux, doublons et inconnus écartés", () => {
  const tags = convertTags(futggTags);
  assert.deepEqual(tags.map((t) => t.name), ["Premier propriétaire", "Mur défensif", "Nations différentes", "Multiples"]);
  assert.deepEqual(tags[0].tiers, [{ min: 5, bonus: 1.5 }]);
  assert.deepEqual(tags[1].match, { kind: "positions", values: ["RB", "CB", "LB"] });
});

test("tags de poste, nations différentes et multiples appliqués au score", () => {
  const config = { ratingScores: [], versionMultipliers: {}, tags: convertTags(futggTags) };
  const card = (fields: Parameters<typeof player>[0]): Card => ({ player: player(fields), owned: true, firstOwner: false });
  const cards = [
    card({ score: 1000, positions: ["CB"], nationId: 1, baseId: 7 }),
    card({ score: 500, positions: ["LB"], nationId: 2, baseId: 7 }), // autre version du même joueur
    card({ score: 100, positions: ["ST"], nationId: 3, baseId: 8 }),
  ];
  const result = scoreLineup(cards, config);
  const bonus = Object.fromEntries(result.tags.map((t) => [t.tag.name, t.bonus]));
  assert.equal(bonus["Mur défensif"], Math.floor(1500 * 0.03)); // CB + LB
  assert.equal(bonus["Nations différentes"], Math.floor(1600 * 0.01)); // 3 nations
  assert.equal(bonus["Multiples"], Math.floor(1500 * 0.1)); // 2 versions du joueur 7
  assert.equal(result.base, 1600);
});
