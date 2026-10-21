// Petites briques d'interface réutilisées partout (panneaux, badges, chiffres clés).

import type { ReactNode } from "react";

// Panneau sombre aux bords arrondis
export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-white/10 bg-white/[0.03] p-5 ${className}`}>
      {children}
    </div>
  );
}

// Couleur de chaque palier : D gris, C bronze, B argent, A or, S émeraude
const TIER_STYLES: Record<string, string> = {
  D: "bg-zinc-600 text-white",
  C: "bg-amber-700 text-amber-50",
  B: "bg-slate-300 text-slate-900",
  A: "bg-yellow-400 text-yellow-950",
  S: "bg-gradient-to-br from-emerald-300 to-cyan-400 text-emerald-950",
};

export function TierBadge({
  name,
  size = "md",
  dimmed = false,
}: {
  name: string | null;
  size?: "sm" | "md" | "lg";
  dimmed?: boolean;
}) {
  const sizes = { sm: "h-6 w-6 text-xs", md: "h-8 w-8 text-sm", lg: "h-12 w-12 text-xl" };
  const style = name ? (TIER_STYLES[name] ?? "bg-zinc-500 text-white") : "bg-white/5 text-zinc-500";
  return (
    <span
      className={`inline-grid shrink-0 place-items-center rounded-lg font-black ${sizes[size]} ${style} ${
        dimmed ? "opacity-30" : ""
      }`}
    >
      {name ?? "–"}
    </span>
  );
}

// Icône de jeton (dessin maison)
export function TokenIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="token-gradient" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fde68a" />
          <stop offset="1" stopColor="#d97706" />
        </linearGradient>
      </defs>
      <polygon points="10,1 18,5.5 18,14.5 10,19 2,14.5 2,5.5" fill="url(#token-gradient)" />
      <polygon points="10,5 14.5,7.5 14.5,12.5 10,15 5.5,12.5 5.5,7.5" fill="#92400e" opacity="0.35" />
    </svg>
  );
}

// Chiffre clé avec son libellé
export function Stat({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value: ReactNode;
  tone?: "good" | "bad" | "gold";
  icon?: ReactNode;
}) {
  const colors = {
    good: "text-emerald-400",
    bad: "text-red-400",
    gold: "text-amber-300",
  };
  return (
    <div className="rounded-xl border border-white/5 bg-black/30 px-3 py-2.5">
      <div className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">{label}</div>
      <div className={`mt-0.5 flex items-center gap-1.5 text-lg font-bold ${tone ? colors[tone] : ""}`}>
        {icon}
        {value}
      </div>
    </div>
  );
}

// Petite étiquette arrondie
export function Pill({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full bg-white/5 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-400 ${className}`}
    >
      {children}
    </span>
  );
}

// Barre de progression
export function ProgressBar({ value, max }: { value: number; max: number }) {
  const percent = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
      <div
        className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-300"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
