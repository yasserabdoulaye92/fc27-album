// Lecture du club collé par l'utilisateur.
// Formats acceptés :
//   1. une liste d'ids séparés par des virgules, espaces, points-virgules ou retours à la ligne
//      ex. "1, 2, 3"
//   2. un CSV avec une ligne d'en-tête contenant une colonne "id" (ou à défaut "nom" / "name")
//      ex. "id;nom\n1;Lucas Ferrand\n2;Marco Bellini"

import type { Player } from "./types";

export type ParsedClub = {
  ownedIds: Set<number>; // ids des joueurs reconnus
  unknown: string[]; // entrées qu'on n'a pas su relier à un joueur
};

export function parseClub(text: string, players: Player[]): ParsedClub {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== "");

  if (lines.length === 0) return { ownedIds: new Set(), unknown: [] };

  // Si la première ligne contient des lettres, on considère que c'est un en-tête CSV.
  if (/[a-zA-Z]/.test(lines[0]) && lines.length > 1) {
    return parseCsv(lines, players);
  }
  return parseIdList(lines.join(" "), players);
}

function parseIdList(text: string, players: Player[]): ParsedClub {
  const knownIds = new Set(players.map((p) => p.id));
  const ownedIds = new Set<number>();
  const unknown: string[] = [];

  for (const entry of text.split(/[\s,;]+/)) {
    if (entry === "") continue;
    const id = Number(entry);
    if (Number.isInteger(id) && knownIds.has(id)) ownedIds.add(id);
    else unknown.push(entry);
  }
  return { ownedIds, unknown };
}

function parseCsv(lines: string[], players: Player[]): ParsedClub {
  // Le séparateur est ";" s'il y en a dans l'en-tête (Excel en français), sinon ","
  const separator = lines[0].includes(";") ? ";" : ",";
  const header = splitCsvLine(lines[0], separator).map((h) => h.toLowerCase());

  const idColumn = header.indexOf("id");
  const nameColumn = header.findIndex((h) => h === "nom" || h === "name");

  if (idColumn === -1 && nameColumn === -1) {
    // Pas de colonne reconnue : on tente quand même la lecture comme liste d'ids
    return parseIdList(lines.slice(1).join(" "), players);
  }

  const knownIds = new Set(players.map((p) => p.id));
  // Pour retrouver un joueur par son nom sans tenir compte des majuscules
  const idByName = new Map(players.map((p) => [p.name.toLowerCase(), p.id]));

  const ownedIds = new Set<number>();
  const unknown: string[] = [];

  for (const line of lines.slice(1)) {
    const cells = splitCsvLine(line, separator);
    if (idColumn !== -1) {
      const id = Number(cells[idColumn]);
      if (Number.isInteger(id) && knownIds.has(id)) {
        ownedIds.add(id);
        continue;
      }
    }
    if (nameColumn !== -1) {
      const id = idByName.get((cells[nameColumn] ?? "").toLowerCase());
      if (id !== undefined) {
        ownedIds.add(id);
        continue;
      }
    }
    unknown.push(line);
  }
  return { ownedIds, unknown };
}

// Découpe une ligne CSV et enlève les guillemets autour des valeurs.
function splitCsvLine(line: string, separator: string): string[] {
  return line.split(separator).map((cell) => cell.trim().replace(/^"(.*)"$/, "$1").trim());
}
