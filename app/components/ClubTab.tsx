"use client";
// Onglet "Mon club" : coller son club, et voir ses joueurs reconnus.

import { useMemo, useState, type ReactNode } from "react";
import type { ParsedClub } from "@/lib/club";
import type { Player } from "@/lib/types";
import PlayerCard, { PlayerGrid } from "./PlayerCard";
import { Panel } from "./ui";

// Exemple : une étoile = carte premier propriétaire
const EXAMPLE_CLUB = "1*, 2*, 3*, 5*, 19*, 7, 13";
// Au-delà, on n'affiche pas toutes les cartes d'un coup (club de plusieurs centaines de joueurs)
const PAGE_SIZE = 60;

type Props = {
  clubText: string;
  onChange: (text: string) => void;
  club: ParsedClub;
  players: Player[];
};

export default function ClubTab({ clubText, onChange, club, players }: Props) {
  const [showAll, setShowAll] = useState(false);

  const owned = useMemo(
    () =>
      players
        .filter((p) => club.ownedIds.has(p.id))
        .sort((a, b) => b.rating - a.rating || a.name.localeCompare(b.name)),
    [players, club],
  );
  const shown = showAll ? owned : owned.slice(0, PAGE_SIZE);

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <Panel className="flex flex-col gap-3 self-start">
        <label htmlFor="club" className="text-lg font-bold">
          Importer mon club
        </label>
        <p className="text-sm text-zinc-400">
          Colle les <strong className="text-zinc-200">ids</strong> de tes joueurs, séparés par des
          virgules ou des retours à la ligne, ou un CSV avec une colonne <Code>id</Code> ou{" "}
          <Code>nom</Code>.
        </p>
        <p className="rounded-xl bg-amber-400/10 p-3 text-sm text-amber-200">
          <strong>★ Premier propriétaire</strong> : ajoute une étoile après l&apos;id (<Code>12*</Code>)
          pour une carte obtenue en pack, objectif ou DCE. Ça donne jusqu&apos;à +500 % de score.
          En CSV : colonne <Code>premier_proprietaire</Code> = oui.
        </p>
        <textarea
          id="club"
          value={clubText}
          onChange={(e) => onChange(e.target.value)}
          rows={8}
          placeholder={"1, 2*, 3\nou\nid;nom;premier_proprietaire\n1;Lucas Ferrand;oui"}
          className="w-full rounded-xl border border-white/10 bg-black/40 p-3 font-mono text-sm outline-none placeholder:text-zinc-600 focus:border-emerald-400/60"
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onChange(EXAMPLE_CLUB)}
            className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 hover:bg-emerald-400"
          >
            Charger un exemple
          </button>
          <button
            type="button"
            onClick={() => onChange("")}
            className="rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-zinc-300 hover:bg-white/5"
          >
            Effacer
          </button>
        </div>
        {club.unknown.length > 0 && (
          <p className="rounded-xl bg-red-500/10 p-3 text-sm text-red-300">
            Non reconnu{club.unknown.length > 1 ? "s" : ""} : {club.unknown.slice(0, 10).join(", ")}
            {club.unknown.length > 10 && ` … (+${club.unknown.length - 10})`}
          </p>
        )}
      </Panel>

      <Panel>
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-bold">Mes joueurs</h2>
          <span className="text-sm text-zinc-400">
            {owned.length} reconnu{owned.length > 1 ? "s" : ""}
            {club.firstOwnerIds.size > 0 && ` · ${club.firstOwnerIds.size} ★`}
          </span>
        </div>
        {owned.length === 0 ? (
          <p className="py-10 text-center text-sm text-zinc-500">
            Colle ton club à gauche, ou clique sur « Charger un exemple ».
          </p>
        ) : (
          <>
            <PlayerGrid>
              {shown.map((p) => (
                <PlayerCard key={p.id} player={p} firstOwner={club.firstOwnerIds.has(p.id)} />
              ))}
            </PlayerGrid>
            {owned.length > shown.length && (
              <button
                type="button"
                onClick={() => setShowAll(true)}
                className="mt-4 text-sm font-semibold text-emerald-400 hover:text-emerald-300"
              >
                Voir les {owned.length - shown.length} autres
              </button>
            )}
          </>
        )}
      </Panel>
    </div>
  );
}

function Code({ children }: { children: ReactNode }) {
  return <code className="rounded bg-white/10 px-1 font-mono text-[0.9em]">{children}</code>;
}
