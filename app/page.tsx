// Page d'accueil. C'est un "Server Component" : il s'exécute côté serveur,
// lit les fichiers JSON de /data et les transmet au composant interactif.

import ClubAnalyzer from "@/app/components/ClubAnalyzer";
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
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:py-12">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Album FC 27 · Planificateur</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Colle ton club, et vois pour chaque set de l&apos;album ton score, les cartes à
          acheter pour monter de palier, ce que ça coûte et combien de jetons tu peux gagner.
        </p>
      </header>

      <ClubAnalyzer players={players} sets={sets} config={config} rules={rules} />
    </main>
  );
}
