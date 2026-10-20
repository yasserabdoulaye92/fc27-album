// Carte qui affiche l'analyse d'un set : progression, paliers et joueurs manquants.

import type { SetAnalysis, TierAnalysis } from "@/lib/album";
import { formatCredits } from "./format";

const TYPE_LABELS = { club: "Club", league: "Ligue", special: "Spécial" } as const;

export default function SetCard({ analysis }: { analysis: SetAnalysis }) {
  const { set, owned, missing, unknownIds, currentTier, tiers, best } = analysis;
  const total = set.playerIds.length;
  const progress = total > 0 ? Math.round((owned.length / total) * 100) : 0;

  return (
    <article className="flex flex-col rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            {TYPE_LABELS[set.type]}
          </span>
          <h3 className="text-lg font-bold">{set.name}</h3>
        </div>
        <Verdict best={best} />
      </div>

      {/* Progression : joueurs récupérés / total */}
      <div className="mt-3">
        <div className="flex justify-between text-sm">
          <span>
            {owned.length} / {total} joueurs
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
      <table className="mt-4 w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-zinc-500">
            <th className="py-1 font-medium">Palier</th>
            <th className="py-1 text-right font-medium">À acheter</th>
            <th className="py-1 text-right font-medium">Crédits</th>
            <th className="py-1 text-right font-medium">Taxe</th>
            <th className="py-1 text-right font-medium">Jetons</th>
            <th className="py-1 text-right font-medium">Cr / jeton</th>
          </tr>
        </thead>
        <tbody>
          {tiers.map((t) => (
            <TierRow key={t.tier.name} t={t} isBest={t === best} />
          ))}
        </tbody>
      </table>

      {/* Joueurs manquants, du moins cher au plus cher */}
      {missing.length > 0 && (
        <details className="mt-4 text-sm">
          <summary className="cursor-pointer font-medium text-zinc-700 dark:text-zinc-300">
            {missing.length} joueur{missing.length > 1 ? "s" : ""} manquant
            {missing.length > 1 ? "s" : ""}
          </summary>
          <ul className="mt-2 divide-y divide-zinc-100 dark:divide-zinc-800">
            {missing.map((p) => (
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

      {unknownIds.length > 0 && (
        <p className="mt-3 text-xs text-amber-700 dark:text-amber-300">
          Ids absents de players.json : {unknownIds.join(", ")}
        </p>
      )}
    </article>
  );
}

function TierRow({ t, isBest }: { t: TierAnalysis; isBest: boolean }) {
  if (t.reached) {
    return (
      <tr className="border-t border-zinc-100 text-zinc-400 dark:border-zinc-800">
        <td className="py-1.5 font-semibold">{t.tier.name}</td>
        <td colSpan={5} className="py-1.5 text-right">
          ✓ atteint
        </td>
      </tr>
    );
  }
  if (t.impossible) {
    return (
      <tr className="border-t border-zinc-100 text-zinc-400 dark:border-zinc-800">
        <td className="py-1.5 font-semibold">{t.tier.name}</td>
        <td colSpan={5} className="py-1.5 text-right">
          pas assez de joueurs connus
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
      <td className="py-1.5 font-semibold">{t.tier.name}</td>
      <td className="py-1.5 text-right">{t.toBuy.length}</td>
      <td className="py-1.5 text-right whitespace-nowrap">{formatCredits(t.credits)}</td>
      <td className="py-1.5 text-right whitespace-nowrap text-zinc-500">
        {formatCredits(t.tax)}
      </td>
      <td className="py-1.5 text-right">+{t.tokens}</td>
      <td
        className={`py-1.5 text-right whitespace-nowrap font-medium ${
          t.profitable ? "text-emerald-700 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
        }`}
      >
        {t.creditsPerToken?.toLocaleString("fr-FR")}
      </td>
    </tr>
  );
}

// Badge en haut à droite : le verdict du meilleur palier du set
function Verdict({ best }: { best: TierAnalysis | null }) {
  if (!best) {
    return (
      <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
        Terminé
      </span>
    );
  }
  return best.profitable ? (
    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300">
      Rentable · palier {best.tier.name}
    </span>
  ) : (
    <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-800 dark:bg-red-900/40 dark:text-red-300">
      Pas rentable
    </span>
  );
}
