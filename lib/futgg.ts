// Conversion des tags de la Galerie (format FUT.GG) vers notre format (data/scores.json).

import type { GroupAttribute, TagMatch, TagRule } from "./types.ts";

export type FutggTag = {
  id: number;
  name: string;
  tiers: { minItems: number; bonus: number }[]; // bonus en % (150 = +150 %)
  rules: { type: string; attribute: string; values: string[] }[];
};

// Noms des tags en français
const FRENCH_NAMES: Record<string, string> = {
  "Same Nation": "Même nation",
  "Different Nation": "Nations différentes",
  "Same Club": "Même club",
  "Different Club": "Clubs différents",
  "Same League": "Même ligue",
  "Different League": "Ligues différentes",
  Bronze: "Bronze",
  Silver: "Argent",
  Golden: "Or",
  Holographic: "Holographique",
  Iconic: "ICÔNES",
  Heroic: "Héros",
  TOTW: "TOTW",
  "First Owner": "Premier propriétaire",
  "Hands Only": "Gardiens",
  "Multiples!": "Multiples",
  Ambidextrous: "Ambidextre",
  Skilled: "Technique",
  "Defensive Wall": "Mur défensif",
  "Midfield Control": "Contrôle du milieu",
  "All out Attack": "Attaque totale",
};

const GROUPS: Record<string, GroupAttribute> = {
  NATION: "nation",
  CLUB: "club",
  LEAGUEID: "league",
  BASE_DEF_ID: "player",
};

const LEVELS: Record<string, { min: number; max: number }> = {
  bronze: { min: 0, max: 64 },
  silver: { min: 65, max: 74 },
  gold: { min: 75, max: 99 },
};

// Règle FUT.GG -> notre règle ; null si on ne sait pas la traduire (le tag est alors ignoré)
export function convertRule(rule: FutggTag["rules"][number]): TagMatch | null {
  const { type, attribute, values } = rule;
  if (type === "MAX_COUNT_ALL_SAME" && GROUPS[attribute]) return { kind: "same", attribute: GROUPS[attribute] };
  if (type === "COUNT_DIFF" && GROUPS[attribute]) return { kind: "different", attribute: GROUPS[attribute] };
  if (attribute === "LEVEL" && LEVELS[values[0]]) return { kind: "rating", ...LEVELS[values[0]] };
  if (attribute === "HYPER_COSMETIC_TYPE") return { kind: "holographic" };
  if (attribute === "RARE") return { kind: "rarity", ids: values.map(Number) };
  if (attribute === "FIRST_OWNED") return { kind: "firstOwner" };
  if (attribute === "POSSIBLE_POSITIONS") return { kind: "positions", values };
  if (type === "MIN_COUNT" && attribute === "WEAK_FOOT") {
    return { kind: "minAttribute", attribute: "weakFoot", min: Number(values[0]) };
  }
  if (type === "MIN_COUNT" && attribute === "SKILL_MOVES") {
    return { kind: "minAttribute", attribute: "skillMoves", min: Number(values[0]) };
  }
  return null;
}

export function convertTags(tags: FutggTag[]): TagRule[] {
  const result: TagRule[] = [];
  const seen = new Set<number>();
  for (const tag of tags) {
    if (seen.has(tag.id) || tag.rules.length === 0) continue;
    seen.add(tag.id);
    const match = convertRule(tag.rules[0]);
    if (!match) continue;
    result.push({
      id: `futgg-${tag.id}`,
      name: FRENCH_NAMES[tag.name] ?? tag.name,
      match,
      tiers: tag.tiers.map((t) => ({ min: t.minItems, bonus: t.bonus / 100 })),
    });
  }
  return result;
}
