// Lecture du club collé par l'utilisateur.
// Formats acceptés :
//   1. une liste d'ids séparés par des virgules, espaces, points-virgules ou retours à la ligne.
//      Une étoile après l'id marque une carte "premier propriétaire" (obtenue en pack,
//      objectif, DCE...) : ex. "1, 2*, 3"
//   2. un CSV avec une ligne d'en-tête contenant une colonne "id" (ou à défaut "nom" / "name"),
//      et éventuellement une colonne "premier_proprietaire" (oui / non)
//      ex. "id;nom;premier_proprietaire\n1;Lucas Ferrand;oui"

import type { Player } from "./types";

export type ParsedClub = {
  ownedIds: Set<number>; // ids des joueurs reconnus
  firstOwnerIds: Set<number>; // parmi eux, ceux obtenus en premier propriétaire
  unknown: string[]; // entrées qu'on n'a pas su relier à un joueur
};

const FIRST_OWNER_COLUMNS = ["premier_proprietaire", "premier proprietaire", "first_owner", "po"];
const YES_VALUES = ["oui", "o", "yes", "y", "1", "true", "x", "vrai"];

export function parseClub(text: string, players: Player[]): ParsedClub {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== "");

  if (lines.length === 0) return emptyClub();

  // Si la première ligne contient des lettres, on considère que c'est un en-tête CSV.
  if (/[a-zA-Z]/.test(lines[0]) && lines.length > 1) {
    return parseCsv(lines, players);
  }
  return parseIdList(lines.join(" "), players);
}

function emptyClub(): ParsedClub {
  return { ownedIds: new Set(), firstOwnerIds: new Set(), unknown: [] };
}

function parseIdList(text: string, players: Player[]): ParsedClub {
  const knownIds = new Set(players.map((p) => p.id));
  const club = emptyClub();

  for (const entry of text.split(/[\s,;]+/)) {
    if (entry === "") continue;
    const firstOwner = entry.endsWith("*");
    const id = Number(firstOwner ? entry.slice(0, -1) : entry);
    if (Number.isInteger(id) && knownIds.has(id)) {
      club.ownedIds.add(id);
      if (firstOwner) club.firstOwnerIds.add(id);
    } else {
      club.unknown.push(entry);
    }
  }
  return club;
}

function parseCsv(lines: string[], players: Player[]): ParsedClub {
  // Le séparateur est ";" s'il y en a dans l'en-tête (Excel en français), sinon ","
  const separator = lines[0].includes(";") ? ";" : ",";
  const header = splitCsvLine(lines[0], separator).map((h) => h.toLowerCase());

  const idColumn = header.indexOf("id");
  const nameColumn = header.findIndex((h) => h === "nom" || h === "name");
  const firstOwnerColumn = header.findIndex((h) => FIRST_OWNER_COLUMNS.includes(h));

  if (idColumn === -1 && nameColumn === -1) {
    // Pas de colonne reconnue : on tente quand même la lecture comme liste d'ids
    return parseIdList(lines.slice(1).join(" "), players);
  }

  const knownIds = new Set(players.map((p) => p.id));
  // Pour retrouver un joueur par son nom sans tenir compte des majuscules
  const idByName = new Map(players.map((p) => [p.name.toLowerCase(), p.id]));
  const club = emptyClub();

  for (const line of lines.slice(1)) {
    const cells = splitCsvLine(line, separator);

    let id: number | undefined;
    if (idColumn !== -1) {
      const value = Number(cells[idColumn]);
      if (cells[idColumn] && Number.isInteger(value) && knownIds.has(value)) id = value;
    }
    if (id === undefined && nameColumn !== -1) {
      id = idByName.get((cells[nameColumn] ?? "").toLowerCase());
    }
    if (id === undefined) {
      club.unknown.push(line);
      continue;
    }

    club.ownedIds.add(id);
    const firstOwnerValue = (cells[firstOwnerColumn] ?? "").toLowerCase();
    if (firstOwnerColumn !== -1 && YES_VALUES.includes(firstOwnerValue)) {
      club.firstOwnerIds.add(id);
    }
  }
  return club;
}

// Découpe une ligne CSV et enlève les guillemets autour des valeurs.
function splitCsvLine(line: string, separator: string): string[] {
  return line.split(separator).map((cell) => cell.trim().replace(/^"(.*)"$/, "$1").trim());
}
