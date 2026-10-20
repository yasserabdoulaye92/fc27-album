"use client";
// "use client" : ce composant tourne dans le navigateur, car il réagit à ce que tu tapes.

import { useEffect, useMemo, useState } from "react";
import { analyzeSet } from "@/lib/album";
import { parseClub } from "@/lib/club";
import type { AlbumSet, Player, Rules } from "@/lib/types";
import SetCard from "./SetCard";
import { formatCredits } from "./format";

// Clé sous laquelle le texte collé est gardé dans le navigateur (localStorage),
// pour ne pas avoir à le recoller à chaque visite.
const STORAGE_KEY = "fc27-album:club";

const EXAMPLE_CLUB = "1, 2, 3, 7, 13";

type Props = {
  players: Player[];
  sets: AlbumSet[];
  rules: Rules;
};

export default function ClubAnalyzer({ players, sets, rules }: Props) {
  const [clubText, setClubText] = useState("");

  // Au chargement : on récupère le club enregistré la dernière fois.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- lecture unique au chargement
      if (saved) setClubText(saved);
    } catch {
      // localStorage peut être bloqué (navigation privée) : ce n'est pas grave.
    }
  }, []);

  function updateClubText(text: string) {
    setClubText(text);
    try {
      localStorage.setItem(STORAGE_KEY, text);
    } catch {
      // idem : on ignore si le navigateur refuse
    }
  }

  // useMemo : on ne refait les calculs que quand le club change.
  const club = useMemo(() => parseClub(clubText, players), [clubText, players]);

  const analyses = useMemo(() => {
    const playersById = new Map(players.map((p) => [p.id, p]));
    const results = sets.map((set) => analyzeSet(set, club.ownedIds, playersById, rules));
    // Les sets les plus rentables (moins de crédits par jeton) en premier
    return results.sort(
      (a, b) =>
        (a.best?.creditsPerToken ?? Infinity) - (b.best?.creditsPerToken ?? Infinity),
    );
  }, [club, players, sets, rules]);

  const profitableCount = analyses.filter((a) => a.best?.profitable).length;

  return (
    <div className="flex flex-col gap-8">
      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <label htmlFor="club" className="block font-semibold">
          Ton club
        </label>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Colle les ids de tes joueurs (séparés par des virgules, espaces ou retours à la ligne),
          ou un CSV avec une colonne <code className="font-mono">id</code> ou{" "}
          <code className="font-mono">nom</code>.
        </p>
        <textarea
          id="club"
          value={clubText}
          onChange={(e) => updateClubText(e.target.value)}
          rows={5}
          placeholder={"1, 2, 3\nou\nid;nom\n1;Lucas Ferrand"}
          className="mt-3 w-full rounded-lg border border-zinc-300 bg-zinc-50 p-3 font-mono text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 dark:border-zinc-700 dark:bg-zinc-950"
        />
        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
          <button
            type="button"
            onClick={() => updateClubText(EXAMPLE_CLUB)}
            className="rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-700"
          >
            Charger un exemple
          </button>
          <button
            type="button"
            onClick={() => updateClubText("")}
            className="rounded-lg border border-zinc-300 px-4 py-2 font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            Effacer
          </button>
          <span className="text-zinc-600 dark:text-zinc-400">
            {club.ownedIds.size} joueur{club.ownedIds.size > 1 ? "s" : ""} reconnu
            {club.ownedIds.size > 1 ? "s" : ""}
          </span>
        </div>
        {club.unknown.length > 0 && (
          <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
            Non reconnu{club.unknown.length > 1 ? "s" : ""} : {club.unknown.slice(0, 10).join(", ")}
            {club.unknown.length > 10 && ` … (+${club.unknown.length - 10})`}
          </p>
        )}
      </section>

      <section>
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-xl font-bold">Sets de l&apos;album</h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {profitableCount} set{profitableCount > 1 ? "s" : ""} rentable
            {profitableCount > 1 ? "s" : ""} sur {analyses.length} · seuil :{" "}
            {formatCredits(rules.maxCreditsPerToken)} / jeton · taxe{" "}
            {Math.round(rules.taxRate * 100)} %
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {analyses.map((analysis) => (
            <SetCard key={analysis.set.id} analysis={analysis} />
          ))}
        </div>
      </section>
    </div>
  );
}
