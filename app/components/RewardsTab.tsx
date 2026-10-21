"use client";
// Onglet "Récompenses" : les joueurs Hall of FUT et maillots de la boutique de jetons,
// et les combinaisons de sets pour obtenir celui qu'on vise.

import { useState } from "react";
import type { ParsedClub } from "@/lib/club";
import type { RewardPlan } from "@/lib/rewards";
import type { AlbumSet, Player, Reward, Rules, ScoreConfig } from "@/lib/types";
import { formatNumber } from "./format";
import Planner, { PlanResult } from "./Planner";
import RewardCard from "./RewardCard";
import { BalanceInput, SectionTitle } from "./ui";

type Props = {
  rewards: Reward[];
  goal: Reward | null;
  goalPlan: RewardPlan | null;
  onGoalChange: (id: string) => void;
  balance: number;
  onBalanceChange: (value: number) => void;
  club: ParsedClub;
  players: Player[];
  sets: AlbumSet[];
  config: ScoreConfig;
  rules: Rules;
};

export default function RewardsTab(props: Props) {
  const { rewards, goal, goalPlan, onGoalChange, balance, onBalanceChange, rules } = props;
  const [optionId, setOptionId] = useState<string>("cheapest");

  const players = rewards.filter((r) => r.type === "hall-of-fut").sort((a, b) => a.cost - b.cost);
  const kits = rewards.filter((r) => r.type === "kit");
  const option = goalPlan?.options.find((o) => o.id === optionId) ?? goalPlan?.options[0] ?? null;

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <SectionTitle>Boutique de jetons</SectionTitle>
          <p className="mt-1 text-sm text-zinc-400">
            Choisis ton objectif : on te montre les sets à faire pour l&apos;obtenir.
          </p>
        </div>
        <BalanceInput value={balance} onChange={onBalanceChange} />
      </div>

      {/* Objectif choisi et combinaisons pour l'obtenir */}
      {goal && goalPlan && (
        <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent p-5 sm:p-6">
          <div className="flex flex-col gap-6 md:flex-row">
            <div className="shrink-0 self-center md:self-start">
              <RewardCard reward={goal} size="lg" affordable={goalPlan.missing === 0} />
            </div>
            <div className="min-w-0 flex-1">
              {goalPlan.missing === 0 ? (
                <p className="font-display text-3xl font-bold uppercase text-emerald-300">
                  Tu peux l&apos;obtenir maintenant !
                </p>
              ) : (
                <>
                  <p className="font-display text-3xl font-bold uppercase">
                    Il te manque <span className="text-amber-300">{formatNumber(goalPlan.missing)}</span>{" "}
                    jetons
                  </p>
                  {goalPlan.options.length > 1 && (
                    <div className="mt-4 inline-flex rounded-xl border border-white/10 bg-black/30 p-1 text-sm">
                      {goalPlan.options.map((o) => (
                        <button
                          key={o.id}
                          type="button"
                          onClick={() => setOptionId(o.id)}
                          className={`rounded-lg px-4 py-1.5 font-semibold transition ${
                            option?.id === o.id ? "bg-white/15 text-white" : "text-zinc-400 hover:text-white"
                          }`}
                        >
                          {o.label}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="mt-5">
                    {option ? (
                      <PlanResult plan={option.plan} rules={rules} goal={goalPlan.missing} compact />
                    ) : (
                      <p className="text-zinc-400">Aucun set ne permet de gagner ces jetons.</p>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </section>
      )}

      <section>
        <SectionTitle>Hall of FUT</SectionTitle>
        <div className="mt-4 flex flex-wrap gap-4">
          {players.map((reward) => (
            <RewardCard
              key={reward.id}
              reward={reward}
              selected={reward.id === goal?.id}
              affordable={balance >= reward.cost}
              onClick={() => {
                onGoalChange(reward.id);
                setOptionId("cheapest");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            />
          ))}
        </div>
      </section>

      <section>
        <SectionTitle>Maillots</SectionTitle>
        <div className="mt-4 flex flex-wrap gap-4">
          {kits.map((reward) => (
            <RewardCard
              key={reward.id}
              reward={reward}
              selected={reward.id === goal?.id}
              affordable={balance >= reward.cost}
              onClick={() => onGoalChange(reward.id)}
            />
          ))}
        </div>
      </section>

      <details className="group rounded-2xl border border-white/10 bg-white/[0.02]">
        <summary className="cursor-pointer list-none px-5 py-4 font-display text-lg font-bold uppercase tracking-wide text-zinc-300 hover:text-white">
          Plan sur mesure <span className="text-sm font-normal normal-case text-zinc-500">· budget, transferts, sets max</span>
        </summary>
        <div className="border-t border-white/10 p-5">
          <Planner
            club={props.club}
            players={props.players}
            sets={props.sets}
            config={props.config}
            rules={rules}
          />
        </div>
      </details>
    </div>
  );
}
