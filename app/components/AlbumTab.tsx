"use client";
// Onglet "Album" : une tuile par set, et le détail d'un set quand on clique dessus.

import { useEffect, useMemo, useState } from "react";
import type { SetAnalysis, TierAnalysis } from "@/lib/album";
import type { Rules } from "@/lib/types";
import { formatCredits, formatNumber } from "./format";
import PlayerCard, { PlayerAvatar, PlayerGrid } from "./PlayerCard";
import { TierBadge, TokenIcon } from "./ui";

const TYPE_LABELS = { club: "Club", league: "Ligue", special: "Spécial" } as const;
type TypeFilter = "all" | keyof typeof TYPE_LABELS;
type Sort = "profit" | "progress" | "tokens";

// Jetons encore à gagner sur un set (paliers pas encore atteints)
export function remainingTokens(a: SetAnalysis, rules: Rules): number {
  const left = a.tiers.filter((t) => !t.reached);
  if (left.length === 0) return 0;
  if (rules.cumulativeTiers) return left.reduce((total, t) => total + t.tier.tokens, 0);
  return left[left.length - 1].tier.tokens;
}

export default function AlbumTab({ analyses, rules }: { analyses: SetAnalysis[]; rules: Rules }) {
  const [search, setSearch] = useState("");
  const [type, setType] = useState<TypeFilter>("all");
  const [sort, setSort] = useState<Sort>("profit");
  const [openId, setOpenId] = useState<string | null>(null);

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    const list = analyses.filter(
      (a) =>
        (type === "all" || a.set.type === type) &&
        (query === "" || a.set.name.toLowerCase().includes(query)),
    );
    const key = (a: SetAnalysis) => {
      if (sort === "progress") return -(a.lineup.length / a.set.slots);
      if (sort === "tokens") return -remainingTokens(a, rules);
      return a.best?.taxLossPerToken ?? Infinity;
    };
    return [...list].sort((a, b) => key(a) - key(b));
  }, [analyses, search, type, sort, rules]);

  const opened = analyses.find((a) => a.set.id === openId) ?? null;

  return (
    <div className="flex flex-col gap-5">
      {/* Barre d'outils : recherche, filtre par type, tri */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un set…"
          className="h-10 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-sm outline-none placeholder:text-zinc-500 focus:border-emerald-400/60 sm:w-auto sm:min-w-0 sm:max-w-xs sm:flex-1"
        />
        <div className="flex rounded-xl border border-white/10 bg-white/5 p-1 text-sm">
          {(["all", "club", "league", "special"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`rounded-lg px-3 py-1.5 font-medium transition ${
                type === t ? "bg-white/15 text-white" : "text-zinc-400 hover:text-white"
              }`}
            >
              {t === "all" ? "Tous" : TYPE_LABELS[t]}
            </button>
          ))}
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as Sort)}
          className="h-10 rounded-xl border border-white/10 bg-zinc-900 px-3 text-sm outline-none"
          aria-label="Trier"
        >
          <option value="profit">Plus rentables</option>
          <option value="progress">Plus avancés</option>
          <option value="tokens">Plus de jetons à gagner</option>
        </select>
      </div>

      {visible.length === 0 ? (
        <p className="py-10 text-center text-zinc-500">Aucun set ne correspond.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((a) => (
            <SetTile key={a.set.id} analysis={a} rules={rules} onOpen={() => setOpenId(a.set.id)} />
          ))}
        </div>
      )}

      {opened && (
        <SetDetail key={opened.set.id} analysis={opened} onClose={() => setOpenId(null)} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tuile d'un set
// ---------------------------------------------------------------------------

function SetTile({
  analysis,
  rules,
  onOpen,
}: {
  analysis: SetAnalysis;
  rules: Rules;
  onOpen: () => void;
}) {
  const { set, lineup, lineupScore, currentTier, tiers, best } = analysis;
  const next = tiers.find((t) => !t.reached);
  const done = !next;
  const left = remainingTokens(analysis, rules);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left transition hover:border-white/25 hover:bg-white/[0.05]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold">{set.name}</h3>
          <p className="text-xs text-zinc-500">
            {TYPE_LABELS[set.type]} · {set.slots} places
          </p>
        </div>
        <TierBadge name={currentTier?.name ?? null} size="md" />
      </div>

      {/* Ton équipe pour ce set, en photos */}
      <div className="flex items-center">
        <div className="flex -space-x-2">
          {lineup.slice(0, 6).map((c) => (
            <PlayerAvatar key={c.player.id} player={c.player} />
          ))}
          {Array.from({ length: Math.max(0, Math.min(6, set.slots) - lineup.length) }, (_, i) => (
            <span
              key={i}
              className="inline-block h-9 w-9 rounded-full border border-dashed border-white/15 bg-zinc-950"
            />
          ))}
        </div>
        <span className="ml-auto text-xs text-zinc-500">
          {analysis.complete
            ? `${formatNumber(lineupScore.total)}${next ? ` / ${formatNumber(next.tier.minScore)}` : ""} pts`
            : `${lineup.length}/${set.slots} joueurs`}
        </span>
      </div>

      <div className="mt-auto text-sm">
        {done ? (
          <span className="text-emerald-400">Set terminé</span>
        ) : best ? (
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-zinc-400">
              <TokenIcon />
              <strong className="text-amber-300">+{best.tokens}</strong> au palier {best.tier.name}
            </span>
            <span className={best.profitable ? "text-zinc-300" : "text-red-400"}>
              {formatCredits(best.taxLoss)} perdus
            </span>
          </div>
        ) : (
          <span className="text-zinc-500">Pas atteignable · {left} jetons</span>
        )}
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Détail d'un set (fenêtre)
// ---------------------------------------------------------------------------

function SetDetail({ analysis, onClose }: { analysis: SetAnalysis; onClose: () => void }) {
  const { set, lineup, lineupScore, complete, tiers, best } = analysis;
  const [selected, setSelected] = useState<string | null>(best?.tier.name ?? null);
  const chosen = tiers.find((t) => t.tier.name === selected && !t.reached && !t.impossible) ?? null;

  // Fermer avec la touche Échap
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const eligibility = Object.entries(set.eligibility)
    .map(([k, v]) => `${{ club: "Club", league: "Ligue", nation: "Nation", version: "Version" }[k] ?? k} : ${v}`)
    .join(" · ");

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={set.name}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-zinc-950 sm:rounded-3xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-white/10 p-5">
          <div>
            <h2 className="text-2xl font-bold">{set.name}</h2>
            <p className="text-sm text-zinc-500">
              {TYPE_LABELS[set.type]} · {set.slots} places
              {eligibility && !eligibility.endsWith(set.name) && ` · ${eligibility}`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-full bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white"
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-6 overflow-y-auto p-5">
          {/* Échelle des paliers : clique sur un palier pour voir ses achats */}
          <section>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">
              Paliers
            </h3>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {tiers.map((t) => (
                <TierStep
                  key={t.tier.name}
                  t={t}
                  isBest={t === best}
                  selected={t.tier.name === selected}
                  onSelect={() => setSelected(t.tier.name)}
                />
              ))}
            </div>
          </section>

          {chosen && (
            <section>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">
                Pour atteindre le palier {chosen.tier.name}
              </h3>
              <div className="mb-4 flex flex-wrap gap-x-6 gap-y-1 text-sm">
                <span>
                  <span className="text-zinc-500">Crédits </span>
                  <strong>{formatCredits(chosen.credits)}</strong>
                </span>
                <span>
                  <span className="text-zinc-500">Perte de taxe </span>
                  <strong>{formatCredits(chosen.taxLoss)}</strong>
                </span>
                <span className="flex items-center gap-1">
                  <TokenIcon />
                  <strong className="text-amber-300">+{chosen.tokens}</strong>
                </span>
                <span className={chosen.profitable ? "text-emerald-400" : "text-red-400"}>
                  {formatNumber(chosen.taxLossPerToken ?? 0)} cr / jeton
                </span>
              </div>
              {chosen.toBuy.length === 0 ? (
                <p className="text-sm text-zinc-400">Rien à acheter : réorganise simplement ton équipe.</p>
              ) : (
                <PlayerGrid>
                  {chosen.toBuy.map((p) => (
                    <PlayerCard key={p.id} player={p} showPrice />
                  ))}
                </PlayerGrid>
              )}
            </section>
          )}

          <section>
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
                Ton équipe {complete ? "" : `(${lineup.length}/${set.slots})`}
              </h3>
              <span className="text-sm text-zinc-400">
                Score <strong className="text-white">{formatNumber(lineupScore.total)}</strong> = base{" "}
                {formatNumber(lineupScore.base)} + bonus {formatNumber(lineupScore.bonus)}
              </span>
            </div>
            {lineupScore.tags.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-1.5">
                {lineupScore.tags.map((t) => (
                  <span
                    key={t.tag.id}
                    className="rounded-full bg-emerald-400/10 px-2.5 py-1 text-xs font-medium text-emerald-300"
                  >
                    {t.tag.name} +{Math.round(t.rate * 100)} % · {t.count} cartes
                  </span>
                ))}
              </div>
            )}
            {lineup.length === 0 ? (
              <p className="text-sm text-zinc-500">Aucun joueur de ton club n&apos;est éligible.</p>
            ) : (
              <PlayerGrid>
                {lineup.map((c) => (
                  <PlayerCard key={c.player.id} player={c.player} firstOwner={c.firstOwner} />
                ))}
              </PlayerGrid>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function TierStep({
  t,
  isBest,
  selected,
  onSelect,
}: {
  t: TierAnalysis;
  isBest: boolean;
  selected: boolean;
  onSelect: () => void;
}) {
  const clickable = !t.reached && !t.impossible;
  return (
    <button
      type="button"
      disabled={!clickable}
      onClick={onSelect}
      className={`relative flex flex-col items-center gap-1 rounded-xl border p-3 text-center transition ${
        selected && clickable
          ? "border-emerald-400/70 bg-emerald-400/10"
          : "border-white/10 bg-white/[0.03] enabled:hover:border-white/25"
      }`}
    >
      {isBest && (
        <span className="absolute -top-2 rounded-full bg-emerald-400 px-2 text-[10px] font-bold text-emerald-950">
          MEILLEUR
        </span>
      )}
      <TierBadge name={t.tier.name} dimmed={!t.reached && !selected} />
      <span className="text-xs text-zinc-500">{formatNumber(t.tier.minScore)} pts</span>
      <span className="flex items-center gap-1 text-sm font-semibold text-amber-300">
        <TokenIcon className="h-3.5 w-3.5" />
        {t.tier.tokens}
      </span>
      <span className="text-[11px] text-zinc-400">
        {t.reached
          ? "✓ atteint"
          : t.impossible
            ? "impossible"
            : `${t.toBuy.length} achat${t.toBuy.length > 1 ? "s" : ""} · ${formatCredits(t.credits)}`}
      </span>
    </button>
  );
}
