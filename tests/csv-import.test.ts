import { test } from "node:test";
import assert from "node:assert/strict";
import { importPlayers, importSets } from "../lib/csv-import.ts";

test("import de joueurs (séparateur ;, prix avec espace)", () => {
  const csv = [
    "id;nom;club;ligue;nation;note;version;prix",
    "1;Lucas Ferrand;Club Alpha;Ligue Démo;France;84;Or rare;1 500",
    "",
    "2;Marco;Club Alpha;Ligue Démo;Italie;abc;Or;900",
    "1;Doublon;Club Alpha;Ligue Démo;France;80;Or;100",
  ].join("\n");
  const { rows, errors } = importPlayers(csv);
  assert.equal(rows.length, 1);
  assert.deepEqual(rows[0], {
    id: 1,
    name: "Lucas Ferrand",
    club: "Club Alpha",
    league: "Ligue Démo",
    nation: "France",
    rating: 84,
    version: "Or rare",
    price: 1500,
  });
  assert.deepEqual(errors, ["Ligne 4 : note ou prix invalide", "Ligne 5 : id 1 en double"]);
});

test("import de joueurs : colonnes en anglais et séparateur ,", () => {
  const { rows } = importPlayers("id,name,club,league,nation,rating,rarity,price\n7,Ole,B,L,NO,86,TOTW,9000");
  assert.equal(rows[0].version, "TOTW");
  assert.equal(rows[0].price, 9000);
});

test("import de joueurs : colonne manquante", () => {
  const { rows, errors } = importPlayers("id;nom\n1;x");
  assert.equal(rows.length, 0);
  assert.match(errors[0], /Colonnes manquantes/);
});

test("import de sets avec paliers seuil/jetons", () => {
  const csv = [
    "id;nom;type;emplacements;club;ligue;nation;version;D;C;B;A;S",
    "club-alpha;Club Alpha;club;5;Club Alpha;;;;500/5;8 000/10;15000/15;;35000/40",
    "bad;Mauvais;equipe;5;;;;;1/1",
    "bad2;Mauvais 2;ligue;8;;Ligue X;;;10-5",
  ].join("\n");
  const { rows, errors } = importSets(csv);
  assert.equal(rows.length, 1);
  assert.deepEqual(rows[0], {
    id: "club-alpha",
    name: "Club Alpha",
    type: "club",
    slots: 5,
    eligibility: { club: "Club Alpha" },
    tiers: [
      { name: "D", minScore: 500, tokens: 5 },
      { name: "C", minScore: 8000, tokens: 10 },
      { name: "B", minScore: 15000, tokens: 15 },
      { name: "S", minScore: 35000, tokens: 40 },
    ],
  });
  assert.equal(errors.length, 2);
  assert.match(errors[1], /palier D invalide/);
});
