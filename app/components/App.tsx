"use client";
// Composant principal : garde le club en mémoire, calcule l'analyse des sets
// et affiche les trois onglets (Album, Mon club, Planificateur).

import { useEffect, useMemo, useState } from "react";
import { analyzeSet } from "@/lib/album";
import { parseClub } from "@/lib/club";
import { earnedTokens } from "@/lib/planner";
import type { AlbumSet, Player, Rules, ScoreConfig } from "@/lib/types";
import AlbumTab, { remainingTokens } from "./AlbumTab";
import ClubTab from "./ClubTab";
import { formatNumber } from "./format";
import Planner from "./Planner";
import { PhotosProvider, type Photos } from "./photos";
import PhotoCredits from "./PhotoCredits";
import { TokenIcon } from "./ui";

// Clés sous lesquelles on garde des préférences dans le navigateur (localStorage)
const CLUB_KEY = "fc27-album:club";
const TAB_KEY = "fc27-album:tab";

const TABS = [
  { id: "album", label: "Album" },
  { id: "club", label: "Mon club" },
  { id: "planner", label: "Planificateur" },
] as const;
type TabId = (typeof TABS)[number]["id"];

type Props = {
  players: Player[];
  sets: AlbumSet[];
  config: ScoreConfig;
  rules: Rules;
  photos: Photos;
};

function save(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // localStorage peut être bloqué (navigation privée) : ce n'est pas grave.
  }
}

export default function App({ players, sets, config, rules, photos }: Props) {
  const [clubText, setClubText] = useState("");
  const [tab, setTab] = useState<TabId>("club");

  // Au chargement : on récupère le club et l'onglet de la dernière visite.
  useEffect(() => {
    try {
      const savedClub = localStorage.getItem(CLUB_KEY);
      const savedTab = localStorage.getItem(TAB_KEY) as TabId | null;
      /* eslint-disable react-hooks/set-state-in-effect -- lecture unique au chargement */
      if (savedClub) setClubText(savedClub);
      if (savedTab && TABS.some((t) => t.id === savedTab)) setTab(savedTab);
      else if (savedClub) setTab("album");
      /* eslint-enable react-hooks/set-state-in-effect */
    } catch {
      // idem
    }
  }, []);

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
        setTab("album");
        save(TAB_KEY, "album");
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
  }

  // useMemo : on ne refait les calculs que quand le club change.
  const club = useMemo(() => parseClub(clubText, players), [clubText, players]);
  const analyses = useMemo(
    () => sets.map((set) => analyzeSet(set, club, players, config, rules)),
    [sets, club, players, config, rules],
  );

  const earned = analyses.reduce((total, a) => total + earnedTokens(a, rules), 0);
  const left = analyses.reduce((total, a) => total + remainingTokens(a, rules), 0);
  const finished = analyses.filter((a) => a.tiers.every((t) => t.reached)).length;

  return (
    <PhotosProvider photos={photos}>
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-zinc-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <div className="flex items-center gap-2">
            <TokenIcon className="h-7 w-7" />
            <span className="text-lg font-black tracking-tight">
              Album<span className="text-emerald-400">27</span>
            </span>
          </div>

          <nav className="order-3 flex w-full gap-1 sm:order-none sm:w-auto">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => changeTab(t.id)}
                className={`flex-1 rounded-xl px-4 py-2 text-sm font-semibold transition sm:flex-none ${
                  tab === t.id ? "bg-white/10 text-white" : "text-zinc-400 hover:text-white"
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>

          {/* Résumé, visible depuis tous les onglets */}
          <div className="ml-auto flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1.5" title="Jetons déjà gagnés avec ton club">
              <TokenIcon />
              <strong className="text-amber-300">{formatNumber(earned)}</strong>
              <span className="hidden text-zinc-500 md:inline">/ {formatNumber(earned + left)}</span>
            </span>
            <span className="text-zinc-400" title="Sets terminés">
              <strong className="text-white">{finished}</strong>/{sets.length} sets
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        {notice && (
          <div className="mb-5 flex items-center justify-between gap-3 rounded-xl bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">
            <span>✓ {notice}</span>
            <button type="button" onClick={() => setNotice(null)} className="text-emerald-300/70 hover:text-emerald-200">
              ✕
            </button>
          </div>
        )}
        {tab === "album" && club.ownedIds.size === 0 && (
          <button
            type="button"
            onClick={() => changeTab("club")}
            className="mb-5 w-full rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-left text-sm text-emerald-200 hover:bg-emerald-400/15"
          >
            Ton club est vide : les achats affichés partent de zéro.{" "}
            <strong>Importer mon club →</strong>
          </button>
        )}

        {tab === "album" && <AlbumTab analyses={analyses} rules={rules} />}
        {tab === "club" && (
          <ClubTab clubText={clubText} onChange={updateClub} club={club} players={players} />
        )}
        {tab === "planner" && (
          <Planner club={club} players={players} sets={sets} config={config} rules={rules} />
        )}
      </main>

      <footer className="border-t border-white/5 px-4 py-6 text-center text-xs text-zinc-600">
        Projet open source indépendant, sans lien avec EA. Notes et prix d&apos;exemple
        approximatifs. <PhotoCredits />
      </footer>
    </div>
    </PhotosProvider>
  );
}
