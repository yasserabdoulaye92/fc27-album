// Carte de joueur dessinée par nos soins (aucune image EA) :
// la couleur dépend de la version, les initiales remplacent la photo.

import type { ReactNode } from "react";
import type { Player } from "@/lib/types";
import { formatCredits } from "./format";

// Dégradé et couleur du texte selon la version / la note
function cardStyle(player: Player): string {
  switch (player.version) {
    case "Héros":
      return "from-violet-500 to-fuchsia-800 text-white";
    case "ICÔNE":
      return "from-stone-50 to-amber-200 text-stone-900";
    case "TOTW":
      return "from-zinc-700 to-zinc-950 text-amber-300 ring-1 ring-amber-400/40";
  }
  if (player.rating < 65) return "from-amber-600 to-orange-900 text-amber-50"; // bronze
  if (player.rating < 75) return "from-zinc-200 to-zinc-400 text-zinc-900"; // argent
  if (player.version === "Or rare") return "from-amber-200 to-yellow-500 text-yellow-950";
  return "from-yellow-100 to-amber-300 text-amber-950"; // or
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

// "Lucas Ferrand" -> "Ferrand" (le nom de famille, comme sur une carte)
function shortName(name: string): string {
  const parts = name.split(/\s+/);
  return parts.length > 1 ? parts.slice(1).join(" ") : name;
}

type Props = {
  player: Player;
  firstOwner?: boolean;
  showPrice?: boolean;
  shared?: boolean; // carte utile à plusieurs sets du plan
};

export default function PlayerCard({ player, firstOwner, showPrice, shared }: Props) {
  return (
    <div className="flex w-[104px] flex-col items-center gap-1.5">
      <div
        className={`relative w-full rounded-xl bg-gradient-to-b p-2 shadow-lg shadow-black/40 ${cardStyle(player)}`}
        title={`${player.name} · ${player.rating} · ${player.version} · ${player.club} · ${player.nation}`}
      >
        <div className="flex items-start justify-between">
          <span className="text-2xl font-black leading-none">{player.rating}</span>
          <span className="max-w-[50px] truncate text-right text-[9px] font-bold uppercase leading-tight opacity-80">
            {player.version}
          </span>
        </div>
        <div className="mx-auto my-1.5 grid h-11 w-11 place-items-center rounded-full bg-black/15 text-base font-bold">
          {initials(player.name)}
        </div>
        <div className="truncate text-center text-xs font-bold">{shortName(player.name)}</div>
        <div className="truncate text-center text-[10px] opacity-70">{player.club}</div>

        {firstOwner && (
          <span
            className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-amber-400 text-[11px] text-amber-950 shadow"
            title="Premier propriétaire"
          >
            ★
          </span>
        )}
        {shared && (
          <span
            className="absolute -left-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-sky-400 text-[11px] font-bold text-sky-950 shadow"
            title="Sert à plusieurs sets du plan (payée une seule fois)"
          >
            ⇄
          </span>
        )}
      </div>
      {showPrice && (
        <span className="text-xs font-semibold text-zinc-300">{formatCredits(player.price)}</span>
      )}
    </div>
  );
}

// Grille de cartes
export function PlayerGrid({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap gap-3">{children}</div>;
}
