"use client";
// Planificateur : tu saisis tes limites, le plan se recalcule tout seul.

import { useDeferredValue, useMemo, useState } from "react";
import type { ParsedClub } from "@/lib/club";
import { hasAnyLimit, planAlbum, type Plan, type PlannerInput } from "@/lib/planner";
import type { AlbumSet, Player, Rules, ScoreConfig } from "@/lib/types";
import { formatCredits, formatNumber } from "./format";

type Props = {
  club: ParsedClub;
  players: Player[];
  sets: AlbumSet[];
  config: ScoreConfig;
  rules: Rules;
};

// Les 5 cases du formulaire
const FIELDS: { key: keyof PlannerInput; label: string; hint: string }[] = [
  { key: "budget", label: "Budget (crédits)", hint: "crédits que tu peux avancer" },
  { key: "tokenGoal", label: "Objectif de jetons", hint: "le moins cher pour y arriver" },
  { key: "maxTaxLoss", label: "Perte de taxe max", hint: "taxe payée en revendant" },
  { key: "maxTransfers", label: "Transferts max", hint: "nombre de cartes à acheter" },
  { key: "maxSets", label: "Sets max", hint: "nombre de sets à valider" },
];

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
    <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="text-xl font-bold">Planificateur</h2>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Remplis au moins une case : le site choisit les sets et paliers qui rapportent le plus
        de jetons dans tes limites. Une carte qui sert à plusieurs sets n&apos;est payée qu&apos;une
        fois.
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {FIELDS.map(({ key, label, hint }) => (
          <label key={key} className="flex flex-col gap-1 text-sm">
            <span className="font-medium">{label}</span>
            <input
              inputMode="numeric"
              value={form[key]}
              onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              placeholder="—"
              className="rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 dark:border-zinc-700 dark:bg-zinc-950"
            />
            <span className="text-xs text-zinc-500">{hint}</span>
          </label>
        ))}
      </div>

      {!hasAnyLimit(input) ? (
        <p className="mt-4 text-sm text-zinc-500">Saisis un nombre dans une des cases pour obtenir un plan.</p>
      ) : plan ? (
        <PlanResult plan={plan} rules={rules} goal={input.tokenGoal} />
      ) : null}
    </section>
  );
}

function PlanResult({ plan, rules, goal }: { plan: Plan; rules: Rules; goal?: number }) {
  if (plan.steps.length === 0) {
    return (
      <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
        Aucun set ne peut être amélioré dans ces limites.
      </p>
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
    <div className="mt-5 flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Jetons" value={`+${formatNumber(plan.tokens)}`} strong />
        <Stat label="Crédits nécessaires" value={formatCredits(plan.credits)} />
        <Stat label="Perte de taxe" value={formatCredits(plan.taxLoss)} />
        <Stat label="Transferts" value={formatNumber(plan.transfers)} />
        <Stat label="Sets" value={formatNumber(plan.steps.length)} />
        <Stat
          label="Verdict"
          value={`${formatNumber(lossPerToken)} cr / jeton`}
          tone={profitable ? "good" : "bad"}
        />
      </div>

      {goal !== undefined && (
        <p
          className={`text-sm font-medium ${
            plan.goalReached ? "text-emerald-700 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
          }`}
        >
          {plan.goalReached
            ? `Objectif de ${formatNumber(goal)} jetons atteint.`
            : `Objectif de ${formatNumber(goal)} jetons pas atteignable dans ces limites : voici le mieux possible.`}
        </p>
      )}

      <div>
        <h3 className="font-semibold">Sets à faire</h3>
        <ol className="mt-2 divide-y divide-zinc-100 text-sm dark:divide-zinc-800">
          {plan.steps.map((step) => (
            <li key={step.set.id} className="py-2">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span>
                  <strong>{step.set.name}</strong>{" "}
                  <span className="text-zinc-500">
                    {step.fromTier?.name ?? "—"} → <strong>{step.toTier.name}</strong>
                  </span>
                </span>
                <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                  +{step.tokens} jetons
                </span>
              </div>
              <p className="mt-0.5 text-zinc-600 dark:text-zinc-400">
                {step.toBuy.length === 0
                  ? "Rien à acheter : ton club suffit."
                  : step.toBuy
                      .map((p) => `${p.name} (${p.rating})${(usage.get(p.id) ?? 0) > 1 ? " ⇄" : ""}`)
                      .join(", ")}
              </p>
            </li>
          ))}
        </ol>
        {[...usage.values()].some((n) => n > 1) && (
          <p className="mt-1 text-xs text-zinc-500">⇄ = carte utilisée par plusieurs sets (payée une seule fois).</p>
        )}
      </div>

      {plan.shoppingList.length > 0 && (
        <div>
          <h3 className="font-semibold">Liste d&apos;achats ({plan.shoppingList.length})</h3>
          <ul className="mt-2 divide-y divide-zinc-100 text-sm dark:divide-zinc-800">
            {plan.shoppingList.map((p) => (
              <li key={p.id} className="flex justify-between gap-2 py-1">
                <span>
                  {p.name}{" "}
                  <span className="text-zinc-500">
                    · {p.rating} · {p.version} · {p.club} · #{p.id}
                  </span>
                </span>
                <span className="whitespace-nowrap">{formatCredits(p.price)}</span>
              </li>
            ))}
            <li className="flex justify-between gap-2 py-1 font-semibold">
              <span>Total</span>
              <span className="whitespace-nowrap">{formatCredits(plan.credits)}</span>
            </li>
          </ul>
        </div>
      )}

      <p className="text-xs text-zinc-500">
        Méthode retenue :{" "}
        {plan.method === "greedy"
          ? "gloutonne (meilleur ratio jetons / crédits à chaque étape)"
          : "programmation dynamique (sac à dos par tranches de 100 crédits)"}
        . Prix = estimations de data/players.json.
      </p>
    </div>
  );
}

function Stat({
  label,
  value,
  strong,
  tone,
}: {
  label: string;
  value: string;
  strong?: boolean;
  tone?: "good" | "bad";
}) {
  const color =
    tone === "good"
      ? "text-emerald-700 dark:text-emerald-400"
      : tone === "bad"
        ? "text-red-600 dark:text-red-400"
        : "";
  return (
    <div className="rounded-xl bg-zinc-50 p-3 dark:bg-zinc-950">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className={`mt-0.5 ${strong ? "text-xl font-bold" : "font-semibold"} ${color}`}>{value}</div>
    </div>
  );
}
