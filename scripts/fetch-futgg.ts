// Importe les vrais sets de la Galerie et leurs joueurs depuis les pages publiques de FUT.GG.
//
//   npm run futgg
//
// - Page Galerie : les 128 sets, leurs seuils de score et leur catégorie.
// - Page de chaque set : jetons de chaque palier et cartes de la solution la moins chère
//   (identifiant EA, nom, note, vrai score, prix, club, ligue, rareté, postes).
// Écrit data/sets.json et data/players.json. Aucune image n'est reprise.
//
// Politesse : une page toutes les 1,5 seconde, uniquement des pages autorisées par
// le robots.txt de FUT.GG (pas leur API). Données affichées avec un lien vers FUT.GG.

import { readFileSync, writeFileSync } from "node:fs";
import { convertTags, type FutggTag } from "../lib/futgg.ts";
import { findObjects, largestScript } from "../lib/seroval.ts";
import type { AlbumSet, GradeTier, Player } from "../lib/types.ts";

const BASE = "https://www.fut.gg";
const USER_AGENT = "Album27/0.1 (+https://github.com/yasserabdoulaye92/fc27-album)";
const DELAY = 1500;

// ---------- Forme des données de FUT.GG (seulement les champs utilisés) ----------

type FutggSet = {
  id: number;
  categoryId: number;
  name: string;
  slug: string;
  requiredCards: number;
  grades: { name: string; threshold: number }[];
  clubEaId: number | null;
};
type FutggCategory = { id: number; name: string; slug: string };
type FutggGrade = { name: string; threshold: number; rewards: { type: string; value: number }[] };
type FutggCard = {
  eaId: number;
  playerEaId: number;
  weakFoot?: number;
  skillMoves?: number;
  holographic?: boolean;
  score: number;
  overall: number;
  clubEaId: number;
  leagueEaId?: number;
  nationEaId: number;
  rarityEaId: number;
  price?: number;
  positions?: string[];
  commonName?: string;
  cardName?: string;
  rarityName?: string;
};

const LEAGUES_CATEGORY = 6;

async function getPage(path: string): Promise<string> {
  const response = await fetch(BASE + path, { headers: { "User-Agent": USER_AGENT } });
  if (!response.ok) throw new Error(`HTTP ${response.status} sur ${path}`);
  return response.text();
}
const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// ---------- 1. La liste des sets ----------

console.log("Lecture de la Galerie…");
const gallery = largestScript(await getPage("/fut-gallery/"));
const futggSets = findObjects(gallery, /\{id:\d+,categoryId:\d+,name:/) as FutggSet[];
const categories = new Map(
  (findObjects(gallery, /\{id:\d+,name:"[^"]*",slug:"[^"]*"/) as FutggCategory[]).map((c) => [c.id, c]),
);
console.log(`${futggSets.length} sets, ${categories.size} catégories`);

// ---------- 2. Le détail de chaque set ----------

type Detail = { set: FutggSet; grades: FutggGrade[]; cards: FutggCard[] };
const details: Detail[] = [];
let futggTags: FutggTag[] = []; // définition des tags (identique sur chaque page de set)

for (const [index, set] of futggSets.entries()) {
  const category = categories.get(set.categoryId);
  const path = `/fut-gallery/${category?.slug}/${set.slug}/`;
  try {
    const page = largestScript(await getPage(path));
    const grades = findObjects(page, /\{name:"[DCBAS]",threshold:\d+,level:/) as FutggGrade[];
    // Cartes détaillées (avec nom) et cartes de la solution (avec prix) : on fusionne par eaId
    const detailed = findObjects(page, /\{eaId:\d+,playerEaId:\d+,score:\d+,overall:\d+,gender:\d+,clubEaId:\d+,leagueEaId/) as FutggCard[];
    const priced = findObjects(page, /\{eaId:\d+,playerEaId:\d+,score:\d+,overall:\d+,gender:\d+,clubEaId:\d+,nationEaId/) as FutggCard[];
    const prices = new Map(priced.map((c) => [c.eaId, c.price]));
    const cards = detailed.map((c) => ({ ...c, price: c.price ?? prices.get(c.eaId) }));
    details.push({ set, grades, cards });
    if (futggTags.length === 0) {
      futggTags = findObjects(page, /\{id:\d+,name:"[^"]*",description:"[^"]*",priority:\d+,color:/) as FutggTag[];
    }
    console.log(`✓ ${index + 1}/${futggSets.length} ${set.name} (${cards.length} cartes)`);
  } catch (error) {
    console.warn(`⚠ ${set.name} : ${(error as Error).message}`);
  }
  await pause(DELAY);
}

// ---------- 3. Noms des clubs et des ligues (d'après les sets) ----------

const clubNames = new Map<number, string>();
const leagueNames = new Map<number, string>();
for (const { set, cards } of details) {
  if (set.clubEaId !== null) clubNames.set(set.clubEaId, set.name);
  if (set.categoryId === LEAGUES_CATEGORY) {
    const leagueId = mostCommon(cards.map((c) => c.leagueEaId));
    if (leagueId !== undefined) leagueNames.set(leagueId, set.name);
  }
}

function mostCommon(values: (number | undefined)[]): number | undefined {
  const counts = new Map<number, number>();
  for (const v of values) if (v !== undefined) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts].sort((a, b) => b[1] - a[1])[0]?.[0];
}

// ---------- 4. Conversion vers nos formats ----------

const players = new Map<number, Player>();
for (const { cards } of details) {
  for (const c of cards) {
    if (players.has(c.eaId) || c.price === undefined) continue;
    players.set(c.eaId, {
      id: c.eaId,
      name: c.commonName || c.cardName || `Joueur ${c.eaId}`,
      club: clubNames.get(c.clubEaId) ?? `Club ${c.clubEaId}`,
      league: (c.leagueEaId !== undefined && leagueNames.get(c.leagueEaId)) || `Ligue ${c.leagueEaId}`,
      nation: `Nation ${c.nationEaId}`,
      rating: c.overall,
      version: c.rarityName ?? "Or",
      price: c.price,
      score: c.score,
      clubId: c.clubEaId,
      leagueId: c.leagueEaId,
      rarityId: c.rarityEaId,
      nationId: c.nationEaId,
      baseId: c.playerEaId,
      positions: c.positions,
      weakFoot: c.weakFoot,
      skillMoves: c.skillMoves,
      holographic: c.holographic,
    });
  }
}

const sets: AlbumSet[] = details.map(({ set, grades, cards }) => {
  // Jetons de chaque palier (les autres récompenses : blason, maillot... sont ignorées)
  const tokensByGrade = new Map(
    grades.map((g) => [
      g.name,
      g.rewards.filter((r) => r.type.startsWith("event_token")).reduce((t, r) => t + r.value, 0),
    ]),
  );
  const tiers: GradeTier[] = set.grades.map((g) => ({
    name: g.name,
    minScore: g.threshold,
    tokens: tokensByGrade.get(g.name) ?? 0,
  }));

  if (set.clubEaId !== null) {
    return { id: set.slug, name: set.name, type: "club", slots: set.requiredCards, eligibility: { clubId: set.clubEaId }, tiers };
  }
  if (set.categoryId === LEAGUES_CATEGORY) {
    const leagueId = mostCommon(cards.map((c) => c.leagueEaId));
    return { id: set.slug, name: set.name, type: "league", slots: set.requiredCards, eligibility: { leagueId }, tiers };
  }
  // Sets de raretés : les raretés des cartes de la solution
  const rarityIds = [...new Set(cards.map((c) => c.rarityEaId))];
  return { id: set.slug, name: set.name, type: "special", slots: set.requiredCards, eligibility: { rarityIds }, tiers };
});

// Une ligne par élément : fichiers lisibles et faciles à comparer dans git
const write = (file: string, rows: unknown[]) =>
  writeFileSync(file, `[\n${rows.map((r) => "  " + JSON.stringify(r)).join(",\n")}\n]\n`);
write("data/sets.json", sets);
write("data/players.json", [...players.values()].sort((a, b) => a.id - b.id));

// Vrais tags de bonus : remplacent ceux de data/scores.json (le barème par note est gardé
// pour les cartes sans score connu)
const tags = convertTags(futggTags);
if (tags.length > 0) {
  const scores = JSON.parse(readFileSync("data/scores.json", "utf8"));
  scores.tags = tags;
  writeFileSync("data/scores.json", JSON.stringify(scores, null, 2) + "\n");
}
console.log(`✓ ${sets.length} sets, ${players.size} joueurs et ${tags.length} tags écrits dans data/`);
