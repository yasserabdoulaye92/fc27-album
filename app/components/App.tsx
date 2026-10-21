"use client";
// Composant principal : garde le club, les jetons en poche et l'objectif en mémoire,
// calcule l'analyse des sets et affiche les onglets.

import { useEffect, useMemo, useState } from "react";
import { analyzeSet } from "@/lib/album";
import { parseClub } from "@/lib/club";
import { planForReward } from "@/lib/rewards";
import type { AlbumSet, Player, Reward, Rules, ScoreConfig } from "@/lib/types";
import AlbumTab, { remainingTokens } from "./AlbumTab";
import AccountButton from "./AccountButton";
import ClubTab from "./ClubTab";
import HomeTab from "./HomeTab";
import { PhotosProvider, type Photos } from "./photos";
import PhotoCredits from "./PhotoCredits";
import RewardsTab from "./RewardsTab";
import { TokenIcon } from "./ui";
import { useAccount } from "./useAccount";

// Clés sous lesquelles on garde des préférences dans le navigateur (localStorage)
const CLUB_KEY = "fc27-album:club";
const TAB_KEY = "fc27-album:tab";
const BALANCE_KEY = "fc27-album:balance";
const GOAL_KEY = "fc27-album:goal";

const TABS = [
  { id: "home", label: "Accueil" },
  { id: "rewards", label: "Récompenses" },
  { id: "album", label: "Sets" },
  { id: "club", label: "Mon club" },
] as const;
type TabId = (typeof TABS)[number]["id"];

type Props = {
  players: Player[];
  sets: AlbumSet[];
  config: ScoreConfig;
  rules: Rules;
  photos: Photos;
  rewards: Reward[];
};

function save(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // localStorage peut être bloqué (navigation privée) : ce n'est pas grave.
  }
}

export default function App({ players, sets, config, rules, photos, rewards }: Props) {
  const [clubText, setClubText] = useState("");
  const [tab, setTab] = useState<TabId>("home");
  const [balance, setBalance] = useState(0);
  // Objectif par défaut : le joueur Hall of FUT le moins cher
  const [goalId, setGoalId] = useState(
    () => [...rewards].filter((r) => r.type === "hall-of-fut").sort((a, b) => a.cost - b.cost)[0]?.id ?? "",
  );

  // Au chargement : on récupère ce qui a été enregistré lors de la dernière visite.
  useEffect(() => {
    try {
      const savedClub = localStorage.getItem(CLUB_KEY);
      const savedTab = localStorage.getItem(TAB_KEY) as TabId | null;
      const savedBalance = Number(localStorage.getItem(BALANCE_KEY));
      const savedGoal = localStorage.getItem(GOAL_KEY);
      /* eslint-disable react-hooks/set-state-in-effect -- lecture unique au chargement */
      if (savedClub) setClubText(savedClub);
      if (savedTab && TABS.some((t) => t.id === savedTab)) setTab(savedTab);
      if (savedBalance > 0) setBalance(savedBalance);
      if (savedGoal && rewards.some((r) => r.id === savedGoal)) setGoalId(savedGoal);
      /* eslint-enable react-hooks/set-state-in-effect */
    } catch {
      // idem
    }
  }, [rewards]);

  // Club envoyé par l'extension navigateur (voir extension/site.js)
  const [notice, setNotice] = useState<string | null>(null);
  useEffect(() => {
    const origin = window.location.origin;
    const ready = () => window.postMessage({ source: "album27-site", type: "ready" }, origin);

    function onMessage(event: MessageEvent) {
      const message = event.data;
      if (event.source !== window || event.origin !== origin) return;
      if (!message || message.source !== "album27-extension") return;
      if (message.type === "hello") ready();
      if (message.type === "club" && typeof message.text === "string") {
        setClubText(message.text);
        save(CLUB_KEY, message.text);
        setTab("home");
        save(TAB_KEY, "home");
        const count = message.text.split(",").filter((s: string) => s.trim() !== "").length;
        setNotice(`Club importé depuis l'extension : ${count} carte${count > 1 ? "s" : ""}.`);
      }
    }

    window.addEventListener("message", onMessage);
    ready();
    return () => window.removeEventListener("message", onMessage);
  }, []);

  function updateClub(text: string) {
    setClubText(text);
    save(CLUB_KEY, text);
  }
  function changeTab(id: TabId) {
    setTab(id);
    save(TAB_KEY, id);
    window.scrollTo({ top: 0 });
  }
  function updateBalance(value: number) {
    setBalance(value);
    save(BALANCE_KEY, String(value));
  }
  function updateGoal(id: string) {
    setGoalId(id);
    save(GOAL_KEY, id);
  }

  // useMemo : on ne refait les calculs que quand ce dont ils dépendent change.
  const club = useMemo(() => parseClub(clubText, players), [clubText, players]);
  const analyses = useMemo(
    () => sets.map((set) => analyzeSet(set, club, players, config, rules)),
    [sets, club, players, config, rules],
  );
  const goal = rewards.find((r) => r.id === goalId) ?? null;
  const goalPlan = useMemo(
    () => (goal ? planForReward(club, goal, balance, { sets, players, config, rules }) : null),
    [goal, club, balance, sets, players, config, rules],
  );

  // Compte Supabase : à la connexion, les données du compte remplacent celles du navigateur
  const account = useAccount({ club, balance, goalId }, (remote) => {
    updateClub(remote.clubText);
    updateBalance(remote.balance);
    if (remote.goalId && rewards.some((r) => r.id === remote.goalId)) updateGoal(remote.goalId);
  });

  const tokensLeft = analyses.reduce((total, a) => total + remainingTokens(a, rules), 0);
  const setsDone = analyses.filter((a) => a.tiers.every((t) => t.reached)).length;

  return (
    <PhotosProvider photos={photos}>
      <div className="flex min-h-full flex-col">
        <header className="sticky top-0 z-40 border-b border-white/10 bg-zinc-950/80 backdrop-blur">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-8 gap-y-2 px-4 py-3">
            <button type="button" onClick={() => changeTab("home")} className="flex items-center gap-2">
              <TokenIcon className="h-7 w-7" />
              <span className="font-display text-2xl font-extrabold uppercase tracking-tight">
                Album<span className="text-emerald-400">27</span>
              </span>
            </button>

            <nav className="order-3 flex w-full gap-1 sm:order-none sm:w-auto">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => changeTab(t.id)}
                  className={`relative flex-1 whitespace-nowrap px-2 py-1.5 font-display text-base font-bold uppercase tracking-wide transition sm:flex-none sm:px-3 sm:text-lg ${
                    tab === t.id ? "text-white" : "text-zinc-500 hover:text-zinc-200"
                  }`}
                >
                  {t.label}
                  {tab === t.id && (
                    <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-emerald-400 sm:inset-x-3" />
                  )}
                </button>
              ))}
            </nav>

            <div className="ml-auto flex items-center gap-4">
              <span className="flex items-center gap-1.5 font-display text-xl font-bold text-amber-300" title="Jetons en poche">
                <TokenIcon />
                {balance}
              </span>
              <AccountButton account={account} />
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
          {notice && (
            <div className="mb-6 flex items-center justify-between gap-3 rounded-xl bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">
              <span>✓ {notice}</span>
              <button type="button" onClick={() => setNotice(null)} className="text-emerald-300/70 hover:text-emerald-200">
                ✕
              </button>
            </div>
          )}

          {tab === "home" && (
            <HomeTab
              clubSize={club.ownedIds.size}
              balance={balance}
              onBalanceChange={updateBalance}
              tokensLeft={tokensLeft}
              setsDone={setsDone}
              setsTotal={sets.length}
              goal={goal}
              goalPlan={goalPlan}
              analyses={analyses}
              onNavigate={changeTab}
            />
          )}
          {tab === "rewards" && (
            <RewardsTab
              rewards={rewards}
              goal={goal}
              goalPlan={goalPlan}
              onGoalChange={updateGoal}
              balance={balance}
              onBalanceChange={updateBalance}
              club={club}
              players={players}
              sets={sets}
              config={config}
              rules={rules}
            />
          )}
          {tab === "album" && <AlbumTab analyses={analyses} rules={rules} />}
          {tab === "club" && (
            <ClubTab clubText={clubText} onChange={updateClub} club={club} players={players} />
          )}
        </main>

        <footer className="border-t border-white/5 px-4 py-6 text-center text-xs text-zinc-600">
          Projet open source indépendant, sans lien avec EA. Notes et prix d&apos;exemple approximatifs.{" "}
          <PhotoCredits />
        </footer>
      </div>
    </PhotosProvider>
  );
}
