// Conversion de tableurs CSV (Excel, Google Sheets...) en données du site.
// Utilisé par scripts/import-csv.ts. Chaque ligne invalide est signalée avec son numéro.
//
// Joueurs : id;nom;club;ligue;nation;note;version;prix
// Sets    : id;nom;type;emplacements;club;ligue;nation;version;D;C;B;A;S
//           chaque colonne de palier contient "seuil/jetons", ex. "25000/5" (vide = pas de palier)

import type { AlbumSet, GradeTier, Player } from "./types.ts";

export type ImportResult<T> = { rows: T[]; errors: string[] };

const TIER_NAMES = ["D", "C", "B", "A", "S"];
const SET_TYPES = { club: "club", ligue: "league", league: "league", special: "special", spécial: "special" } as const;

// Découpe le texte en lignes de cellules, en devinant le séparateur (; ou ,)
function readTable(text: string): { header: string[]; lines: { cells: string[]; number: number }[] } {
  const raw = text.split(/\r?\n/);
  const firstIndex = raw.findIndex((l) => l.trim() !== "");
  if (firstIndex === -1) return { header: [], lines: [] };
  const separator = raw[firstIndex].includes(";") ? ";" : ",";
  const split = (line: string) =>
    line.split(separator).map((c) => c.trim().replace(/^"(.*)"$/, "$1").trim());

  const header = split(raw[firstIndex]).map((h) => h.toLowerCase());
  const lines = raw
    .map((line, i) => ({ cells: split(line), number: i + 1, empty: line.trim() === "" }))
    .slice(firstIndex + 1)
    .filter((l) => !l.empty)
    .map(({ cells, number }) => ({ cells, number }));
  return { header, lines };
}

// Trouve une colonne parmi plusieurs noms possibles (français ou anglais)
function column(header: string[], names: string[]): number {
  return header.findIndex((h) => names.includes(h));
}

// "1 500" ou "1500" -> 1500
function toNumber(value: string | undefined): number | null {
  if (value === undefined || value.trim() === "") return null;
  const n = Number(value.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export function importPlayers(text: string): ImportResult<Player> {
  const { header, lines } = readTable(text);
  const errors: string[] = [];
  const col = {
    id: column(header, ["id"]),
    name: column(header, ["nom", "name"]),
    club: column(header, ["club"]),
    league: column(header, ["ligue", "league"]),
    nation: column(header, ["nation", "nationalité", "nationalite"]),
    rating: column(header, ["note", "rating", "ovr"]),
    version: column(header, ["version", "rareté", "rarete", "rarity"]),
    price: column(header, ["prix", "price"]),
  };
  const missing = Object.entries(col).filter(([, i]) => i === -1).map(([k]) => k);
  if (missing.length > 0) {
    return { rows: [], errors: [`Colonnes manquantes : ${missing.join(", ")}`] };
  }

  const rows: Player[] = [];
  const seen = new Set<number>();
  for (const { cells, number } of lines) {
    const id = toNumber(cells[col.id]);
    const rating = toNumber(cells[col.rating]);
    const price = toNumber(cells[col.price]);
    if (id === null || !Number.isInteger(id)) {
      errors.push(`Ligne ${number} : id invalide`);
      continue;
    }
    if (seen.has(id)) {
      errors.push(`Ligne ${number} : id ${id} en double`);
      continue;
    }
    if (rating === null || price === null) {
      errors.push(`Ligne ${number} : note ou prix invalide`);
      continue;
    }
    seen.add(id);
    rows.push({
      id,
      name: cells[col.name],
      club: cells[col.club],
      league: cells[col.league],
      nation: cells[col.nation],
      rating,
      version: cells[col.version],
      price,
    });
  }
  return { rows, errors };
}

export function importSets(text: string): ImportResult<AlbumSet> {
  const { header, lines } = readTable(text);
  const errors: string[] = [];
  const col = {
    id: column(header, ["id"]),
    name: column(header, ["nom", "name"]),
    type: column(header, ["type"]),
    slots: column(header, ["emplacements", "slots"]),
    club: column(header, ["club"]),
    league: column(header, ["ligue", "league"]),
    nation: column(header, ["nation"]),
    version: column(header, ["version"]),
  };
  const required = ["id", "name", "type", "slots"] as const;
  const missing = required.filter((k) => col[k] === -1);
  if (missing.length > 0) {
    return { rows: [], errors: [`Colonnes manquantes : ${missing.join(", ")}`] };
  }
  const tierColumns = TIER_NAMES.map((name) => ({ name, index: column(header, [name.toLowerCase()]) }))
    .filter((t) => t.index !== -1);

  const rows: AlbumSet[] = [];
  for (const { cells, number } of lines) {
    const type = SET_TYPES[cells[col.type]?.toLowerCase() as keyof typeof SET_TYPES];
    const slots = toNumber(cells[col.slots]);
    if (!cells[col.id] || !type || slots === null || slots < 1) {
      errors.push(`Ligne ${number} : id, type (club / ligue / special) ou emplacements invalide`);
      continue;
    }

    const tiers: GradeTier[] = [];
    let tierError = false;
    for (const t of tierColumns) {
      const value = cells[t.index];
      if (!value) continue;
      const [minScore, tokens] = value.split("/").map((v) => toNumber(v));
      if (minScore === null || minScore === undefined || tokens === null || tokens === undefined) {
        errors.push(`Ligne ${number} : palier ${t.name} invalide ("${value}", attendu "seuil/jetons")`);
        tierError = true;
        break;
      }
      tiers.push({ name: t.name, minScore, tokens });
    }
    if (tierError) continue;
    if (tiers.length === 0) {
      errors.push(`Ligne ${number} : aucun palier`);
      continue;
    }

    // Les champs d'éligibilité vides sont ignorés
    const optional = (index: number) => (index !== -1 && cells[index] ? cells[index] : undefined);
    const eligibility = Object.fromEntries(
      Object.entries({
        club: optional(col.club),
        league: optional(col.league),
        nation: optional(col.nation),
        version: optional(col.version),
      }).filter(([, v]) => v !== undefined),
    );

    rows.push({ id: cells[col.id], name: cells[col.name], type, slots, eligibility, tiers });
  }
  return { rows, errors };
}
