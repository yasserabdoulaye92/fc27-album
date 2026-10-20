// Petites données de test, indépendantes de /data (qui changera avec les vraies données).

import type { AlbumSet, Player, Rules, ScoreConfig } from "../lib/types.ts";

let nextId = 1;

// Crée un joueur ; seuls les champs utiles au test sont à préciser.
export function player(fields: Partial<Player>): Player {
  return {
    id: nextId++,
    name: "Joueur",
    club: "Club A",
    league: "Ligue 1",
    nation: "France",
    rating: 80,
    version: "Or",
    price: 1000,
    ...fields,
  };
}

export const config: ScoreConfig = {
  ratingScores: [
    { min: 90, score: 14000 },
    { min: 85, score: 2100 },
    { min: 84, score: 830 },
    { min: 80, score: 180 },
    { min: 75, score: 90 },
    { min: 65, score: 35 },
    { min: 0, score: 20 },
  ],
  versionMultipliers: { Héros: 1.25 },
  tags: [
    {
      id: "first-owner",
      name: "Premier propriétaire",
      match: { kind: "firstOwner" },
      tiers: [
        { min: 5, bonus: 1.5 },
        { min: 10, bonus: 3 },
        { min: 20, bonus: 5 },
      ],
    },
  ],
};

export const rules: Rules = { taxRate: 0.05, cumulativeTiers: true, maxTaxLossPerToken: 300 };

export function set(fields: Partial<AlbumSet>): AlbumSet {
  return {
    id: "set",
    name: "Set",
    type: "club",
    slots: 3,
    eligibility: { club: "Club A" },
    tiers: [],
    ...fields,
  };
}
