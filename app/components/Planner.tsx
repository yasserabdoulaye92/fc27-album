"use client";
// Onglet "Planificateur" : tu saisis tes limites, le plan se recalcule tout seul.

import { useDeferredValue, useMemo, useState } from "react";
import type { ParsedClub } from "@/lib/club";
import { hasAnyLimit, planAlbum, type Plan, type PlannerInput } from "@/lib/planner";
import type { AlbumSet, Player, Rules, ScoreConfig } from "@/lib/types";
import { formatCredits, formatNumber } from "./format";
import PlayerCard, { PlayerGrid } from "./PlayerCard";
import { Panel, Stat, TierBadge, TokenIcon } from "./ui";

type Props = {
  club: ParsedClub;
  players: Player[];
  sets: AlbumSet[];
  config: ScoreConfig;
  rules: Rules;
};

// Les 5 cases du formulaire
const FIELDS: { key: keyof PlannerInput; label: string; hint: string }[] = [
  { key: "budget", label: "Budget", hint: "crédits que tu peux avancer" },
  { key: "tokenGoal", label: "Objectif de jetons", hint: "le moins cher pour y arriver" },
  { key: "maxTaxLoss", label: "Perte de taxe max", hint: "taxe payée en revendant" },
  { key: "maxTransfers", label: "Transferts max", hint: "cartes à acheter" },
  { key: "maxSets", label: "Sets max", hint: "sets à valider" },
];

// Raccourcis de budget
const PRESETS = [10_000, 50_000, 100_000, 500_000];

type FormValues = Record<keyof PlannerInput, string>;
const EMPTY_FORM: FormValues = {
  budget: "",
  tokenGoal: "",
  maxTaxLoss: "",
  maxTransfers: "",
  maxSets: "",
};

// "50 000" -> 50000 ; "" -> undefined
function toNumber(value: string): number | undefined {
  const n = Number(value.replace(/\s/g, ""));
  return value.trim() === "" || !Number.isFinite(n) || n < 0 ? undefined : n;
}

export default function Planner({ club, players, sets, config, rules }: Props) {
  const [form, setForm] = useState<FormValues>(EMPTY_FORM);

  const input = useMemo<PlannerInput>(() => {
    const result: PlannerInput = {};
    for (const { key } of FIELDS) {
      const value = toNumber(form[key]);
      if (value !== undefined) result[key] = value;
    }
    return result;
  }, [form]);

  // useDeferredValue : la saisie reste fluide même si le calcul prend un peu de temps
  const deferredInput = useDeferredValue(input);
  const plan = useMemo(
    () => planAlbum(club, deferredInput, { sets, players, config, rules }),
    [club, deferredInput, sets, players, config, rules],
  );

  return (
    <div className="flex flex-col gap-5">
      <Panel>
        <h2 className="text-lg font-bold">Tes limites</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Remplis au moins une case : le site choisit les sets et paliers qui rapportent le plus de
          jetons. Une carte utile à plusieurs sets n&apos;est payée qu&apos;une fois.
        </p>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {FIELDS.map(({ key, label, hint }) => (
            <label key={key} className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-zinc-300">{label}</span>
              <input
                inputMode="numeric"
                value={form[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                placeholder="—"
                className="h-10 rounded-xl border border-white/10 bg-black/40 px-3 outline-none placeholder:text-zinc-600 focus:border-emerald-400/60"
              />
              <span className="text-xs text-zinc-500">{hint}</span>
            </label>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-zinc-500">Budget rapide :</span>
          {PRESETS.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setForm({ ...form, budget: String(value) })}
              className="rounded-full border border-white/10 px-3 py-1 text-zinc-300 hover:border-emerald-400/50 hover:text-white"
            >
              {formatNumber(value)}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setForm(EMPTY_FORM)}
            className="ml-auto text-zinc-500 hover:text-zinc-300"
          >
            Tout effacer
          </button>
        </div>
      </Panel>

      {!hasAnyLimit(input) ? (
        <p className="py-6 text-center text-zinc-500">
          Saisis un nombre dans une des cases pour obtenir un plan.
        </p>
      ) : plan ? (
        <PlanResult plan={plan} rules={rules} goal={input.tokenGoal} />
      ) : null}
    </div>
  );
}

// Affichage d'un plan. "compact" : version courte (sans message d'objectif ni détails techniques)
export function PlanResult({
  plan,
  rules,
  goal,
  compact = false,
}: {
  plan: Plan;
  rules: Rules;
  goal?: number;
  compact?: boolean;
}) {
  if (plan.steps.length === 0) {
    return (
      <Panel className="text-center text-amber-200">
        Aucun set ne peut être amélioré dans ces limites.
      </Panel>
    );
  }

  const lossPerToken = plan.tokens > 0 ? Math.round(plan.taxLoss / plan.tokens) : 0;
  const profitable = lossPerToken <= rules.maxTaxLossPerToken;
  // Cartes utilisées par plusieurs sets du plan
  const usage = new Map<number, number>();
  for (const step of plan.steps) {
    for (const p of step.toBuy) usage.set(p.id, (usage.get(p.id) ?? 0) + 1);
  }

  return (
    <div className="flex flex-col gap-5">
      {goal !== undefined && !(compact && plan.goalReached) && (
        <p
          className={`rounded-xl px-4 py-3 text-sm font-medium ${
            plan.goalReached ? "bg-emerald-400/10 text-emerald-300" : "bg-red-500/10 text-red-300"
          }`}
        >
          {plan.goalReached
            ? `✓ Objectif de ${formatNumber(goal)} jetons atteint.`
            : `Objectif de ${formatNumber(goal)} jetons pas atteignable dans ces limites : voici le mieux possible.`}
        </p>
      )}

      {compact ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Perte de taxe" value={formatCredits(plan.taxLoss)} tone={profitable ? "good" : "bad"} />
          <Stat label="Crédits à avancer" value={formatCredits(plan.credits)} />
          <Stat label="Sets" value={formatNumber(plan.steps.length)} />
          <Stat label="Achats" value={formatNumber(plan.transfers)} />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Stat label="Jetons" value={`+${formatNumber(plan.tokens)}`} tone="gold" icon={<TokenIcon className="h-5 w-5" />} />
          <Stat label="Crédits à avancer" value={formatCredits(plan.credits)} />
          <Stat label="Perte de taxe" value={formatCredits(plan.taxLoss)} />
          <Stat label="Transferts" value={formatNumber(plan.transfers)} />
          <Stat label="Sets" value={formatNumber(plan.steps.length)} />
          <Stat
            label="Perte / jeton"
            value={`${formatNumber(lossPerToken)} cr`}
            tone={profitable ? "good" : "bad"}
          />
        </div>
      )}

      <div className={`grid gap-5 ${compact ? "xl:grid-cols-2" : "lg:grid-cols-2"}`}>
        <Panel>
          <h3 className="mb-3 font-bold">Sets à faire</h3>
          <ol className="flex flex-col gap-2">
            {plan.steps.map((step) => (
              <li
                key={step.set.id}
                className="flex items-center gap-3 rounded-xl border border-white/5 bg-black/30 p-3"
              >
                <div className="flex items-center gap-1">
                  <TierBadge name={step.fromTier?.name ?? null} size="sm" />
                  <span className="text-zinc-600">→</span>
                  <TierBadge name={step.toTier.name} size="sm" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{step.set.name}</div>
                  <div className="text-xs text-zinc-500">
                    {step.toBuy.length === 0
                      ? "rien à acheter"
                      : `${step.toBuy.length} carte${step.toBuy.length > 1 ? "s" : ""} achetée${
                          step.toBuy.length > 1 ? "s" : ""
                        }`}
                  </div>
                </div>
                <span className="flex items-center gap-1 font-bold text-amber-300">
                  <TokenIcon />+{step.tokens}
                </span>
              </li>
            ))}
          </ol>
        </Panel>

        <Panel>
          <div className="mb-3 flex items-baseline justify-between gap-2">
            <h3 className="font-bold">Liste d&apos;achats</h3>
            <span className="text-sm text-zinc-400">
              {plan.shoppingList.length} carte{plan.shoppingList.length > 1 ? "s" : ""} ·{" "}
              {formatCredits(plan.credits)}
            </span>
          </div>
          {plan.shoppingList.length === 0 ? (
            <p className="text-sm text-zinc-400">Rien à acheter : ton club suffit.</p>
          ) : (
            <PlayerGrid>
              {plan.shoppingList.map((p) => (
                <PlayerCard key={p.id} player={p} showPrice shared={(usage.get(p.id) ?? 0) > 1} />
              ))}
            </PlayerGrid>
          )}
          {[...usage.values()].some((n) => n > 1) && (
            <p className="mt-3 text-xs text-zinc-500">⇄ = carte utile à plusieurs sets, payée une seule fois.</p>
          )}
        </Panel>
      </div>

      <p className={`text-xs text-zinc-600 ${compact ? "hidden" : ""}`}>
        Méthode retenue :{" "}
        {plan.method === "greedy"
          ? "gloutonne (meilleur ratio jetons / crédits à chaque étape)"
          : "programmation dynamique (sac à dos par tranches de 100 crédits)"}
        . Prix = estimations de data/players.json.
      </p>
    </div>
  );
}
