"use client";
// Onglet "Accueil" : l'essentiel d'un coup d'œil.
// Tes jetons, ton objectif dans la boutique, et les meilleurs sets à faire maintenant.

import type { SetAnalysis } from "@/lib/album";
import type { RewardPlan } from "@/lib/rewards";
import type { Reward } from "@/lib/types";
import { formatCredits, formatNumber } from "./format";
import RewardCard from "./RewardCard";
import { BalanceInput, SectionTitle, TierBadge, TokenIcon } from "./ui";

type Props = {
  clubSize: number;
  balance: number;
  onBalanceChange: (value: number) => void;
  tokensLeft: number; // jetons encore à gagner dans tout l'album
  setsDone: number;
  setsTotal: number;
  goal: Reward | null;
  goalPlan: RewardPlan | null;
  analyses: SetAnalysis[];
  onNavigate: (tab: "rewards" | "album" | "club") => void;
};

export default function HomeTab(props: Props) {
  const { clubSize, balance, onBalanceChange, tokensLeft, setsDone, setsTotal, goal, goalPlan, analyses, onNavigate } =
    props;

  // Les 3 améliorations les plus rentables (le moins de crédits perdus par jeton)
  const todo = analyses
    .filter((a) => a.best?.profitable)
    .sort((a, b) => a.best!.taxLossPerToken! - b.best!.taxLossPerToken!)
    .slice(0, 3);
  const cheapest = goalPlan?.options[0]?.plan;

  return (
    <div className="flex flex-col gap-8">
      {clubSize === 0 && (
        <button
          type="button"
          onClick={() => onNavigate("club")}
          className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-5 py-4 text-left text-emerald-100 transition hover:bg-emerald-400/15"
        >
          <span className="font-display text-xl font-bold uppercase">Importe ton club pour commencer →</span>
          <span className="mt-0.5 block text-sm text-emerald-200/70">
            En un clic avec l&apos;extension, ou en collant la liste de tes joueurs.
          </span>
        </button>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        {/* Jetons */}
        <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-amber-400/15 via-zinc-900 to-zinc-950 p-6">
          <SectionTitle>Tes jetons</SectionTitle>
          <div className="mt-3 flex items-center gap-3">
            <TokenIcon className="h-12 w-12" />
            <span className="font-display text-7xl font-extrabold leading-none text-amber-300">
              {formatNumber(balance)}
            </span>
          </div>
          <div className="mt-4">
            <BalanceInput value={balance} onChange={onBalanceChange} label="Modifier" />
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="font-display text-2xl font-bold">+{formatNumber(tokensLeft)}</div>
              <div className="text-zinc-500">encore à gagner</div>
            </div>
            <div>
              <div className="font-display text-2xl font-bold">
                {setsDone}/{setsTotal}
              </div>
              <div className="text-zinc-500">sets terminés</div>
            </div>
          </div>
        </section>

        {/* Objectif */}
        <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-emerald-500/10 via-zinc-900 to-zinc-950 p-6">
          <SectionTitle>Ton objectif</SectionTitle>
          {goal && goalPlan ? (
            <div className="mt-4 flex flex-col gap-5 sm:flex-row sm:items-center">
              <RewardCard reward={goal} affordable={goalPlan.missing === 0} />
              <div className="flex-1">
                {goalPlan.missing === 0 ? (
                  <p className="font-display text-3xl font-bold uppercase text-emerald-300">
                    Disponible maintenant !
                  </p>
                ) : (
                  <>
                    <p className="font-display text-3xl font-bold uppercase leading-tight">
                      Encore <span className="text-amber-300">{formatNumber(goalPlan.missing)}</span> jetons
                    </p>
                    {cheapest?.goalReached ? (
                      <p className="mt-2 text-zinc-400">
                        Faisable avec <strong className="text-white">{cheapest.steps.length} sets</strong> pour{" "}
                        <strong className="text-white">{formatCredits(cheapest.taxLoss)}</strong> de perte.
                      </p>
                    ) : (
                      <p className="mt-2 text-zinc-400">Pas atteignable avec les sets actuels.</p>
                    )}
                  </>
                )}
                <button
                  type="button"
                  onClick={() => onNavigate("rewards")}
                  className="mt-5 rounded-xl bg-emerald-400 px-5 py-2.5 font-display text-lg font-bold uppercase tracking-wide text-emerald-950 transition hover:bg-emerald-300"
                >
                  Voir le plan
                </button>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-zinc-400">Choisis une récompense dans la boutique.</p>
          )}
        </section>
      </div>

      {/* À faire maintenant */}
      <section>
        <div className="flex items-baseline justify-between">
          <SectionTitle>À faire maintenant</SectionTitle>
          <button type="button" onClick={() => onNavigate("album")} className="text-sm text-zinc-400 hover:text-white">
            Tous les sets →
          </button>
        </div>
        {todo.length === 0 ? (
          <p className="mt-4 text-zinc-500">Rien de rentable pour l&apos;instant.</p>
        ) : (
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {todo.map((a) => (
              <button
                key={a.set.id}
                type="button"
                onClick={() => onNavigate("album")}
                className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left transition hover:border-white/25"
              >
                <div className="flex items-center gap-1">
                  <TierBadge name={a.currentTier?.name ?? null} size="sm" />
                  <span className="text-zinc-600">→</span>
                  <TierBadge name={a.best!.tier.name} size="sm" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{a.set.name}</div>
                  <div className="text-xs text-zinc-500">{formatCredits(a.best!.taxLoss)} de perte</div>
                </div>
                <span className="flex items-center gap-1 font-display text-xl font-bold text-amber-300">
                  <TokenIcon />+{a.best!.tokens}
                </span>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
