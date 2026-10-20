// Les "types" décrivent la forme des données (voir data/README.md).
// TypeScript s'en sert pour nous prévenir si on se trompe de champ.

export type Player = {
  id: number;
  name: string;
  club: string;
  league: string;
  nation: string;
  rating: number;
  version: string;
  price: number; // prix estimé en crédits
};

export type Tier = {
  name: string; // "D", "C", "B", "A", "S"...
  required: number; // nombre de joueurs du set à posséder
  tokens: number; // jetons gagnés en atteignant ce palier
};

export type AlbumSet = {
  id: string;
  name: string;
  type: "club" | "league" | "special";
  playerIds: number[];
  tiers: Tier[]; // du plus facile au plus dur
};

export type Rules = {
  taxRate: number; // 0.05 = 5 %
  cumulativeTiers: boolean; // un palier rapporte aussi les jetons des paliers en dessous ?
  maxCreditsPerToken: number; // seuil pour le verdict "rentable"
};
