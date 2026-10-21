"use client";
// Compte utilisateur (Supabase) : connexion par lien magique et synchronisation du club,
// des jetons en poche et de l'objectif entre tous tes appareils.

import type { Session } from "@supabase/supabase-js";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ParsedClub } from "@/lib/club";
import { supabase } from "@/lib/supabase";
import { clubToRows, rowsToClubText, type ClubRow } from "@/lib/sync";

export type SyncState = "idle" | "saving" | "saved" | "error";

export type Account = {
  status: "loading" | "signed-out" | "signed-in";
  email: string | null;
  allowed: boolean; // e-mail dans la liste autorisée
  admin: boolean;
  sync: SyncState;
  signIn: (email: string) => Promise<{ ok: boolean; message: string }>;
  signOut: () => Promise<void>;
};

type Local = {
  club: ParsedClub;
  balance: number;
  goalId: string;
};

type Remote = { clubText: string; balance: number; goalId: string | null };

// Délai avant d'enregistrer, pour ne pas écrire à chaque touche tapée
const SAVE_DELAY = 1000;

export function useAccount(local: Local, onRemoteLoaded: (remote: Remote) => void): Account {
  const [status, setStatus] = useState<Account["status"]>("loading");
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [allowed, setAllowed] = useState(false);
  const [admin, setAdmin] = useState(false);
  const [sync, setSync] = useState<SyncState>("idle");
  // Vrai une fois les données du compte chargées : avant, on n'enregistre rien
  const [ready, setReady] = useState(false);

  // Les valeurs les plus récentes, lisibles depuis les fonctions asynchrones
  const latest = useRef(local);
  const onLoaded = useRef(onRemoteLoaded);
  useEffect(() => {
    latest.current = local;
    onLoaded.current = onRemoteLoaded;
  });

  // 1. Suivre la connexion / déconnexion
  useEffect(() => {
    function apply(session: Session | null) {
      setUserId(session?.user.id ?? null);
      setEmail(session?.user.email ?? null);
      setStatus(session ? "signed-in" : "signed-out");
      if (!session) {
        // Déconnecté : on oublie les droits et on arrête la synchronisation
        setReady(false);
        setAllowed(false);
        setAdmin(false);
      }
    }
    supabase.auth.getSession().then(({ data }) => apply(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => apply(session));
    return () => data.subscription.unsubscribe();
  }, []);

  // 2. À la connexion : droits, puis chargement (ou premier envoi) des données
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      const [{ data: isAllowed }, { data: isAdmin }] = await Promise.all([
        supabase.rpc("is_allowed"),
        supabase.rpc("is_admin"),
      ]);
      if (cancelled) return;
      setAllowed(isAllowed === true);
      setAdmin(isAdmin === true);
      if (isAllowed !== true) return;

      const [{ data: rows }, { data: settings }] = await Promise.all([
        supabase.from("user_club").select("player_id, first_owner"),
        supabase.from("user_settings").select("balance, goal_id").maybeSingle(),
      ]);
      if (cancelled) return;

      if ((rows && rows.length > 0) || settings) {
        // Le compte a déjà des données : elles remplacent celles du navigateur
        onLoaded.current({
          clubText: rowsToClubText((rows ?? []) as ClubRow[]),
          balance: settings?.balance ?? 0,
          goalId: settings?.goal_id ?? null,
        });
      } else {
        // Compte tout neuf : on y envoie ce qui était dans le navigateur
        await save(userId, latest.current, setSync);
      }
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // 3. Ensuite : enregistrement automatique à chaque changement
  const rowsKey = JSON.stringify(clubToRows(local.club));
  useEffect(() => {
    if (!ready || !userId || !allowed) return;
    const timer = setTimeout(() => save(userId, latest.current, setSync), SAVE_DELAY);
    return () => clearTimeout(timer);
  }, [ready, userId, allowed, rowsKey, local.balance, local.goalId]);

  const signIn = useCallback(async (address: string) => {
    const clean = address.trim().toLowerCase();
    const { data: isAllowed, error } = await supabase.rpc("is_email_allowed", { candidate: clean });
    if (error) return { ok: false, message: "Impossible de vérifier l'e-mail, réessaie." };
    if (!isAllowed) {
      return { ok: false, message: "Cet e-mail n'est pas sur la liste. Demande l'accès à l'admin." };
    }
    const { error: sendError } = await supabase.auth.signInWithOtp({
      email: clean,
      options: { emailRedirectTo: window.location.origin },
    });
    if (sendError) return { ok: false, message: `Envoi impossible : ${sendError.message}` };
    return { ok: true, message: `Lien de connexion envoyé à ${clean}. Ouvre ta boîte mail !` };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setSync("idle");
  }, []);

  return { status, email, allowed, admin, sync, signIn, signOut };
}

// Enregistre le club (on remplace toutes les lignes) et les réglages
async function save(userId: string, local: Local, setSync: (s: SyncState) => void) {
  setSync("saving");
  const rows = clubToRows(local.club).map((r) => ({ ...r, user_id: userId }));
  const { error: deleteError } = await supabase.from("user_club").delete().eq("user_id", userId);
  const { error: insertError } = rows.length
    ? await supabase.from("user_club").insert(rows)
    : { error: null };
  const { error: settingsError } = await supabase.from("user_settings").upsert({
    user_id: userId,
    balance: local.balance,
    goal_id: local.goalId || null,
    updated_at: new Date().toISOString(),
  });
  setSync(deleteError || insertError || settingsError ? "error" : "saved");
}
