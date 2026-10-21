// Conversion entre le club tel qu'il est saisi sur le site (texte) et les lignes
// de la table user_club (une ligne par carte).

import type { ParsedClub } from "./club.ts";

export type ClubRow = { player_id: number; first_owner: boolean };

// Club -> lignes. On garde aussi les ids inconnus du site (ex. cartes EA pas encore
// dans data/players.json) pour ne rien perdre.
export function clubToRows(club: ParsedClub): ClubRow[] {
  const rows = new Map<number, boolean>();
  for (const id of club.ownedIds) rows.set(id, club.firstOwnerIds.has(id));
  for (const entry of club.unknown) {
    const match = /^(\d+)(\*?)$/.exec(entry.trim());
    if (match) rows.set(Number(match[1]), match[2] === "*");
  }
  return [...rows]
    .sort(([a], [b]) => a - b)
    .map(([player_id, first_owner]) => ({ player_id, first_owner }));
}

// Lignes -> texte du club ("12*, 34")
export function rowsToClubText(rows: ClubRow[]): string {
  return [...rows]
    .sort((a, b) => a.player_id - b.player_id)
    .map((r) => (r.first_owner ? `${r.player_id}*` : String(r.player_id)))
    .join(", ");
}
