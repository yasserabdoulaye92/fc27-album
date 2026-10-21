// Page d'accueil. C'est un "Server Component" : il s'exécute côté serveur,
// lit les fichiers JSON de /data et les transmet à l'application interactive.

import App from "@/app/components/App";
import playersData from "@/data/players.json";
import setsData from "@/data/sets.json";
import rulesData from "@/data/rules.json";
import scoresData from "@/data/scores.json";
import type { AlbumSet, Player, Rules, ScoreConfig } from "@/lib/types";

// On précise à TypeScript la forme des données lues dans les JSON.
const players = playersData as Player[];
const sets = setsData as AlbumSet[];
const config = scoresData as ScoreConfig;
const rules = rulesData as Rules;

export default function Home() {
  return <App players={players} sets={sets} config={config} rules={rules} />;
}
