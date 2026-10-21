"use client";
// Carte de joueur au design maison (différent des cartes EA) :
// vraie photo libre de droits en plein cadre, note en haut, nom en bas,
// et un simple liseré de couleur pour la version de la carte.

import type { ReactNode } from "react";
import type { Player } from "@/lib/types";
import { formatCredits } from "./format";
import { usePhoto } from "./photos";

// Couleur du liseré et de la note selon la version / la note
function accent(player: Player): { line: string; text: string } {
  switch (player.version) {
    case "TOTW":
      return { line: "bg-amber-400", text: "text-amber-300" };
    case "Héros":
      return { line: "bg-violet-400", text: "text-violet-300" };
    case "ICÔNE":
      return { line: "bg-stone-100", text: "text-stone-100" };
  }
  if (player.rating < 65) return { line: "bg-orange-700", text: "text-orange-300" }; // bronze
  if (player.rating < 75) return { line: "bg-zinc-300", text: "text-zinc-200" }; // argent
  return { line: "bg-yellow-500", text: "text-white" }; // or
}

// "Ousmane Dembélé" -> "Dembélé" (le nom de famille, comme sur un maillot)
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
  const photo = usePhoto(player.name);
  const { line, text } = accent(player);

  return (
    <div className="flex w-[112px] flex-col items-center gap-1.5">
      <div
        className="relative h-[156px] w-full overflow-hidden rounded-xl bg-zinc-800 ring-1 ring-white/10"
        title={`${player.name} · ${player.rating} · ${player.version} · ${player.club}${
          photo ? `\nPhoto : ${photo.author} (${photo.license})` : ""
        }`}
      >
        {photo ? (
          // Image externe (Wikimedia) : balise <img> simple, chargée seulement quand elle est visible
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo.url}
            alt={player.name}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover object-[50%_15%]"
          />
        ) : (
          <Silhouette />
        )}

        {/* Dégradés pour que la note et le nom restent lisibles sur la photo */}
        <div className="absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-black/60 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/90 via-black/60 to-transparent" />
        <div className={`absolute inset-x-0 top-0 h-1 ${line}`} />

        <div className="absolute left-2 top-2 leading-none">
          <div className={`text-xl font-black ${text}`}>{player.rating}</div>
          {player.version !== "Or" && player.version !== "Or rare" && (
            <div className={`mt-0.5 text-[9px] font-bold uppercase tracking-wide ${text}`}>
              {player.version}
            </div>
          )}
        </div>
        <div className="absolute right-1.5 top-2 flex flex-col gap-1">
          {firstOwner && (
            <Marker className="bg-amber-400 text-amber-950" title="Premier propriétaire">
              ★
            </Marker>
          )}
          {shared && (
            <Marker className="bg-sky-400 text-sky-950" title="Sert à plusieurs sets (payée une fois)">
              ⇄
            </Marker>
          )}
        </div>

        <div className="absolute inset-x-0 bottom-0 px-2 pb-2">
          <div className="truncate text-sm font-semibold text-white">{shortName(player.name)}</div>
          <div className="truncate text-[10px] text-zinc-400">{player.club}</div>
        </div>
      </div>
      {showPrice && (
        <span className="text-xs font-medium text-zinc-400">{formatCredits(player.price)}</span>
      )}
    </div>
  );
}

function Marker({ children, className, title }: { children: ReactNode; className: string; title: string }) {
  return (
    <span title={title} className={`grid h-5 w-5 place-items-center rounded-full text-[11px] font-bold ${className}`}>
      {children}
    </span>
  );
}

// Silhouette neutre quand il n'y a pas de photo
function Silhouette() {
  return (
    <svg viewBox="0 0 100 140" className="absolute inset-0 h-full w-full text-zinc-700" aria-hidden="true">
      <circle cx="50" cy="52" r="20" fill="currentColor" />
      <path d="M14 140c0-26 16-44 36-44s36 18 36 44z" fill="currentColor" />
    </svg>
  );
}

// Petite photo ronde (pour les tuiles de sets)
export function PlayerAvatar({ player }: { player: Player }) {
  const photo = usePhoto(player.name);
  return (
    <span
      title={player.name}
      className="relative inline-block h-9 w-9 overflow-hidden rounded-full bg-zinc-800 ring-2 ring-zinc-950"
    >
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photo.url} alt={player.name} loading="lazy" className="h-full w-full object-cover object-[50%_15%]" />
      ) : (
        <Silhouette />
      )}
    </span>
  );
}

// Grille de cartes
export function PlayerGrid({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap gap-3">{children}</div>;
}
