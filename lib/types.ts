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

// Quelles cartes un tag regarde
export type TagMatch =
  | { kind: "firstOwner" } // cartes premier propriétaire
  | { kind: "rating"; min: number; max: number } // note entre min et max (bronze, argent, or)
  | { kind: "version"; value: string } // version de carte (Héros, ICÔNE, TOTW...)
  | { kind: "sameClub" | "sameLeague" | "sameNation" }; // le plus grand groupe du même club/ligue/nation

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
