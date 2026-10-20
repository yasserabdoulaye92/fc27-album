// Carte qui affiche l'analyse d'un set : équipe actuelle, score, paliers et achats conseillés.

import type { SetAnalysis, TierAnalysis } from "@/lib/album";
import type { Card } from "@/lib/score";
import type { Eligibility } from "@/lib/types";
import { formatCredits, formatNumber } from "./format";

const TYPE_LABELS = { club: "Club", league: "Ligue", special: "Spécial" } as const;

export default function SetCard({ analysis }: { analysis: SetAnalysis }) {
  const { set, lineup, lineupScore, complete, currentTier, tiers, best } = analysis;
  const progress = Math.round((lineup.length / set.slots) * 100);

  return (
    <article className="flex flex-col rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            {TYPE_LABELS[set.type]} · {set.slots} emplacements
          </span>
          <h3 className="text-lg font-bold">{set.name}</h3>
          <p className="text-xs text-zinc-500">{describeEligibility(set.eligibility)}</p>
        </div>
        <Verdict analysis={analysis} />
      </div>

      {/* Progression : emplacements remplis avec le club */}
      <div className="mt-3">
        <div className="flex flex-wrap justify-between gap-x-3 text-sm">
          <span>
            {lineup.length} / {set.slots} avec ton club
            {complete && (
              <>
                {" "}
                · score <strong>{formatNumber(lineupScore.total)}</strong>
              </>
            )}
          </span>
          <span className="text-zinc-600 dark:text-zinc-400">
            Palier actuel : <strong>{currentTier?.name ?? "aucun"}</strong>
          </span>
        </div>
        <div className="mt-1 h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
          <div className="h-full rounded-full bg-emerald-500" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Tableau des paliers */}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-zinc-500">
              <th className="py-1 font-medium">Palier</th>
              <th className="py-1 text-right font-medium">Score</th>
              <th className="py-1 text-right font-medium">Achats</th>
              <th className="py-1 text-right font-medium">Crédits</th>
              <th className="py-1 text-right font-medium">Perte</th>
              <th className="py-1 text-right font-medium">Jetons</th>
              <th className="py-1 text-right font-medium">Perte / jeton</th>
            </tr>
          </thead>
          <tbody>
            {tiers.map((t) => (
              <TierRow key={t.tier.name} t={t} isBest={t === best} />
            ))}
          </tbody>
        </table>
      </div>

      {/* Achats conseillés pour le meilleur palier */}
      {best && best.toBuy.length > 0 && (
        <details className="mt-4 text-sm">
          <summary className="cursor-pointer font-medium text-zinc-700 dark:text-zinc-300">
            À acheter pour le palier {best.tier.name} ({best.toBuy.length})
          </summary>
          <ul className="mt-2 divide-y divide-zinc-100 dark:divide-zinc-800">
            {best.toBuy.map((p) => (
              <li key={p.id} className="flex justify-between gap-2 py-1">
                <span>
                  {p.name}{" "}
                  <span className="text-zinc-500">
                    · {p.rating} · {p.version} · #{p.id}
                  </span>
                </span>
                <span className="whitespace-nowrap">{formatCredits(p.price)}</span>
              </li>
            ))}
          </ul>
        </details>
      )}

      {/* Équipe actuelle avec le club et bonus de tags */}
      {lineup.length > 0 && (
        <details className="mt-2 text-sm">
          <summary className="cursor-pointer font-medium text-zinc-700 dark:text-zinc-300">
            Ton équipe actuelle ({lineup.length})
          </summary>
          <ul className="mt-2 divide-y divide-zinc-100 dark:divide-zinc-800">
            {lineup.map((card) => (
              <LineupItem key={card.player.id} card={card} />
            ))}
          </ul>
          <p className="mt-2 text-xs text-zinc-500">
            Base {formatNumber(lineupScore.base)} + bonus {formatNumber(lineupScore.bonus)}
            {lineupScore.tags.length > 0 &&
              ` (${lineupScore.tags
                .map((t) => `${t.tag.name} +${Math.round(t.rate * 100)} %`)
                .join(", ")})`}
          </p>
        </details>
      )}
    </article>
  );
}

function LineupItem({ card }: { card: Card }) {
  const p = card.player;
  return (
    <li className="flex justify-between gap-2 py-1">
      <span>
        {p.name}{" "}
        <span className="text-zinc-500">
          · {p.rating} · {p.version}
        </span>
      </span>
      {card.firstOwner && (
        <span className="whitespace-nowrap text-xs font-semibold text-amber-600 dark:text-amber-400">
          ★ 1er proprio
        </span>
      )}
    </li>
  );
}

function TierRow({ t, isBest }: { t: TierAnalysis; isBest: boolean }) {
  const name = <td className="py-1.5 font-semibold">{t.tier.name}</td>;
  const target = (
    <td className="py-1.5 text-right text-zinc-500">{formatNumber(t.tier.minScore)}</td>
  );

  if (t.reached || t.impossible) {
    return (
      <tr className="border-t border-zinc-100 text-zinc-400 dark:border-zinc-800">
        {name}
        {target}
        <td colSpan={5} className="py-1.5 text-right">
          {t.reached ? "✓ atteint" : "impossible avec les joueurs connus"}
        </td>
      </tr>
    );
  }
  return (
    <tr
      className={`border-t border-zinc-100 dark:border-zinc-800 ${
        isBest ? "bg-emerald-50 dark:bg-emerald-950/40" : ""
      }`}
    >
      {name}
      {target}
      <td className="py-1.5 text-right">{t.toBuy.length}</td>
      <td className="py-1.5 text-right whitespace-nowrap">{formatCredits(t.credits)}</td>
      <td className="py-1.5 text-right whitespace-nowrap text-zinc-500">
        {formatCredits(t.taxLoss)}
      </td>
      <td className="py-1.5 text-right">+{t.tokens}</td>
      <td
        className={`py-1.5 text-right whitespace-nowrap font-medium ${
          t.profitable ? "text-emerald-700 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
        }`}
      >
        {t.taxLossPerToken !== null && formatNumber(t.taxLossPerToken)}
      </td>
    </tr>
  );
}

// Badge en haut à droite : le verdict du meilleur palier du set
function Verdict({ analysis }: { analysis: SetAnalysis }) {
  const { best, tiers } = analysis;
  const base = "whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold";

  if (!best) {
    const done = tiers.every((t) => t.reached);
    return (
      <span className={`${base} bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400`}>
        {done ? "Terminé" : "Impossible"}
      </span>
    );
  }
  return best.profitable ? (
    <span className={`${base} bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300`}>
      Rentable · palier {best.tier.name}
    </span>
  ) : (
    <span className={`${base} bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300`}>
      Pas rentable
    </span>
  );
}

// { club: "Club Alpha" } -> "Club : Club Alpha"
function describeEligibility(e: Eligibility): string {
  const parts = [
    e.club && `Club : ${e.club}`,
    e.league && `Ligue : ${e.league}`,
    e.nation && `Nation : ${e.nation}`,
    e.version && `Version : ${e.version}`,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : "Tous les joueurs";
}
