// Les "types" décrivent la forme des données (voir data/README.md).
// TypeScript s'en sert pour nous prévenir si on se trompe de champ.

// ---------- data/players.json ----------

export type Player = {
  id: number;
  name: string;
  club: string;
  league: string;
  nation: string;
  rating: number; // note générale
  version: string; // "Or rare", "TOTW", "Héros", "ICÔNE"...
  price: number; // prix estimé en crédits
  // Champs facultatifs, remplis par l'import FUT.GG (npm run futgg)
  score?: number; // vrai score de la carte dans la Galerie (sinon calculé avec le barème)
  clubId?: number; // identifiants EA
  leagueId?: number;
  rarityId?: number;
  nationId?: number;
  baseId?: number; // même valeur pour toutes les versions d'un même joueur
  positions?: string[];
  weakFoot?: number; // mauvais pied (1 à 5 étoiles)
  skillMoves?: number; // gestes techniques (1 à 5 étoiles)
  holographic?: boolean;
};

// ---------- data/photos.json ----------

// Photo libre de droits d'un joueur (Wikimedia Commons), avec ses crédits
export type PlayerPhoto = {
  url: string; // adresse de l'image
  author: string; // auteur à créditer
  license: string; // ex. "CC BY-SA 4.0"
  source: string; // page de la photo sur Commons
};

// ---------- data/sets.json ----------

export type GradeTier = {
  name: string; // "D", "C", "B", "A", "S"
  minScore: number; // score total à atteindre
  tokens: number; // jetons gagnés en atteignant ce palier
};

// Quels joueurs peuvent aller dans le set. Chaque champ est facultatif :
// un joueur est éligible s'il respecte tous les champs renseignés.
export type Eligibility = {
  club?: string;
  league?: string;
  nation?: string;
  version?: string;
  // Par identifiant EA (import FUT.GG)
  clubId?: number;
  leagueId?: number;
  rarityIds?: number[]; // une des raretés de la liste
};

export type AlbumSet = {
  id: string;
  name: string;
  type: "club" | "league" | "special";
  slots: number; // nombre d'emplacements à remplir
  eligibility: Eligibility;
  tiers: GradeTier[]; // du plus facile au plus dur
};

// ---------- data/scores.json ----------

// Score d'une carte selon sa note : on prend la première ligne dont "min" est atteint.
export type RatingScore = { min: number; score: number };

// Caractéristique comparée par les tags "même ..." / "différents ..."
export type GroupAttribute = "club" | "league" | "nation" | "player";

// Quelles cartes un tag regarde
export type TagMatch =
  | { kind: "firstOwner" } // cartes premier propriétaire
  | { kind: "rating"; min: number; max: number } // note entre min et max (bronze, argent, or)
  | { kind: "version"; value: string } // version de carte (nom)
  | { kind: "rarity"; ids: number[] } // rareté EA (ICÔNE, Héros, TOTW...)
  | { kind: "holographic" }
  | { kind: "positions"; values: string[] } // au moins un de ces postes
  | { kind: "minAttribute"; attribute: "weakFoot" | "skillMoves"; min: number }
  | { kind: "same"; attribute: GroupAttribute } // le plus grand groupe identique
  | { kind: "different"; attribute: GroupAttribute } // une carte par valeur différente
  | { kind: "sameClub" | "sameLeague" | "sameNation" }; // anciens noms de "same"

export type TagRule = {
  id: string;
  name: string;
  match: TagMatch;
  tiers: { min: number; bonus: number }[]; // à partir de "min" cartes : bonus (1.5 = +150 %)
};

export type ScoreConfig = {
  ratingScores: RatingScore[]; // de la note la plus haute à la plus basse
  versionMultipliers: Record<string, number>; // ex. "Héros": 1.25 ; 1 par défaut
  tags: TagRule[];
};

// ---------- data/rewards.json ----------

// Récompense de la boutique de jetons de l'album
export type Reward = {
  id: string;
  name: string;
  type: "hall-of-fut" | "kit";
  rating?: number; // note (joueurs Hall of FUT)
  cost: number; // prix en jetons
};

// ---------- data/rules.json ----------

export type Rules = {
  taxRate: number; // 0.05 = 5 % de taxe à la revente
  cumulativeTiers: boolean; // un palier rapporte aussi les jetons des paliers en dessous ?
  maxTaxLossPerToken: number; // seuil du verdict "rentable" (perte de taxe par jeton)
};
