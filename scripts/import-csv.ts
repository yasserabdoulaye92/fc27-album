// Importe un tableur CSV dans data/ :
//   npm run import -- joueurs mon-fichier.csv   -> data/players.json
//   npm run import -- sets mon-fichier.csv      -> data/sets.json
// Le format des colonnes est décrit dans data/README.md.

import { readFileSync, writeFileSync } from "node:fs";
import { importPlayers, importSets } from "../lib/csv-import.ts";

const [kind, file] = process.argv.slice(2);
const targets = {
  joueurs: { output: "data/players.json", run: importPlayers },
  sets: { output: "data/sets.json", run: importSets },
} as const;

const target = targets[kind as keyof typeof targets];
if (!target || !file) {
  console.error("Utilisation : npm run import -- joueurs|sets <fichier.csv>");
  process.exit(1);
}

const { rows, errors } = target.run(readFileSync(file, "utf8"));
for (const error of errors) console.warn(`⚠ ${error}`);

if (rows.length === 0) {
  console.error("Aucune ligne valide : rien n'a été écrit.");
  process.exit(1);
}

// Une ligne par élément : fichier lisible et facile à comparer dans git
const json = `[\n${rows.map((r) => "  " + JSON.stringify(r)).join(",\n")}\n]\n`;
writeFileSync(target.output, json);
console.log(`✓ ${rows.length} ligne(s) écrite(s) dans ${target.output} (${errors.length} ignorée(s))`);
