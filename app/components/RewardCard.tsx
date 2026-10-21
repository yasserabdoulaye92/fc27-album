"use client";
// Carte d'une récompense de la boutique de jetons (joueur Hall of FUT ou maillot).

import type { Reward } from "@/lib/types";
import { formatNumber } from "./format";
import { usePhoto } from "./photos";
import { TokenIcon } from "./ui";

type Props = {
  reward: Reward;
  selected?: boolean;
  affordable?: boolean;
  size?: "md" | "lg";
  onClick?: () => void;
};

export default function RewardCard({ reward, selected, affordable, size = "md", onClick }: Props) {
  const photo = usePhoto(reward.name);
  const dimensions = size === "lg" ? "w-[180px] h-[250px]" : "w-[132px] h-[184px]";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`group flex flex-col items-center gap-2 ${onClick ? "cursor-pointer" : "cursor-default"}`}
    >
      <div
        className={`relative overflow-hidden rounded-2xl bg-zinc-800 transition ${dimensions} ${
          selected
            ? "ring-2 ring-emerald-400 shadow-[0_0_30px_-5px] shadow-emerald-400/50"
            : "ring-1 ring-white/10 group-enabled:group-hover:ring-white/30"
        }`}
      >
        {reward.type === "kit" ? (
          <KitArt />
        ) : photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo.url}
            alt={reward.name}
            loading="lazy"
            title={`Photo : ${photo.author} (${photo.license})`}
            className="absolute inset-0 h-full w-full object-cover object-[50%_15%] transition duration-500 group-enabled:group-hover:scale-105"
          />
        ) : null}

        <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/70 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/95 via-black/60 to-transparent" />
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-teal-300 via-emerald-400 to-teal-300" />

        <div className="absolute left-2.5 top-2.5 leading-none">
          {reward.rating && (
            <div className="font-display text-3xl font-extrabold text-white">{reward.rating}</div>
          )}
          <div className="mt-0.5 font-display text-[11px] font-bold uppercase tracking-widest text-emerald-300">
            {reward.type === "kit" ? "Maillot" : "Hall of FUT"}
          </div>
        </div>
        {affordable && (
          <span className="absolute right-2 top-2 rounded-full bg-emerald-400 px-2 py-0.5 text-[10px] font-bold text-emerald-950">
            DISPO
          </span>
        )}

        <div className="absolute inset-x-0 bottom-0 px-2.5 pb-2.5 text-left">
          <div
            className={`font-display font-bold uppercase leading-tight text-white ${
              size === "lg" ? "text-2xl" : "text-lg"
            } ${reward.type === "kit" ? "line-clamp-2 text-sm normal-case" : "truncate"}`}
          >
            {reward.type === "kit" ? reward.name.replace(/\s*\(.*\)/, "") : reward.name}
          </div>
        </div>
      </div>
      <span className="flex items-center gap-1 font-display text-lg font-bold text-amber-300">
        <TokenIcon className="h-4 w-4" />
        {formatNumber(reward.cost)}
      </span>
    </button>
  );
}

// Dessin simple d'un maillot (pas de logo de club)
function KitArt() {
  return (
    <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-zinc-700 to-zinc-900">
      <svg viewBox="0 0 64 64" className="h-20 w-20 text-zinc-300" aria-hidden="true">
        <path
          fill="currentColor"
          d="M22 6l-12 6-6 14 9 4 3-6v34h32V24l3 6 9-4-6-14-12-6c-1 4-5 7-10 7s-9-3-10-7z"
        />
      </svg>
    </div>
  );
}
