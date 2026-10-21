"use client";
// Bouton de compte en haut à droite : connexion par lien magique, état de la sauvegarde,
// et pour l'admin, la gestion des e-mails autorisés.

import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";
import type { Account } from "./useAccount";

export default function AccountButton({ account }: { account: Account }) {
  const [open, setOpen] = useState(false);

  if (account.status === "loading") return <span className="h-9 w-9" />;

  const syncLabel = {
    idle: "",
    saving: "Sauvegarde…",
    saved: "Sauvegardé",
    error: "Erreur de sauvegarde",
  }[account.sync];

  return (
    <>
      {account.status === "signed-in" ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          title={account.email ?? ""}
          className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white"
        >
          <span className="hidden sm:inline">{syncLabel}</span>
          <span className="grid h-9 w-9 place-items-center rounded-full bg-emerald-400 font-display text-lg font-bold uppercase text-emerald-950">
            {account.email?.[0] ?? "?"}
          </span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-xl border border-white/15 px-3 py-1.5 font-display text-base font-bold uppercase tracking-wide text-zinc-200 hover:border-emerald-400/60 hover:text-white"
        >
          Connexion
        </button>
      )}

      {open && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-3xl border border-white/10 bg-zinc-950 p-6"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-2xl font-bold uppercase">
                {account.status === "signed-in" ? "Mon compte" : "Connexion"}
              </h2>
              <button type="button" onClick={() => setOpen(false)} className="text-zinc-500 hover:text-white">
                ✕
              </button>
            </div>
            {account.status === "signed-in" ? <SignedIn account={account} /> : <SignInForm account={account} />}
          </div>
        </div>
      )}
    </>
  );
}

function SignInForm({ account }: { account: Account }) {
  const [email, setEmail] = useState("");
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [sending, setSending] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSending(true);
    setResult(await account.signIn(email));
    setSending(false);
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <p className="text-sm text-zinc-400">
        Pas de mot de passe : tu reçois un lien de connexion par e-mail. Ton club est ensuite
        sauvegardé et retrouvé sur tous tes appareils.
      </p>
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="ton@email.com"
        className="h-11 rounded-xl border border-white/10 bg-black/40 px-4 outline-none focus:border-emerald-400/60"
      />
      <button
        type="submit"
        disabled={sending}
        className="h-11 rounded-xl bg-emerald-400 font-display text-lg font-bold uppercase text-emerald-950 hover:bg-emerald-300 disabled:opacity-50"
      >
        {sending ? "Envoi…" : "Recevoir le lien"}
      </button>
      {result && (
        <p className={`text-sm ${result.ok ? "text-emerald-300" : "text-red-300"}`}>{result.message}</p>
      )}
    </form>
  );
}

function SignedIn({ account }: { account: Account }) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-zinc-400">
        Connecté avec <strong className="text-white">{account.email}</strong>
      </p>
      {account.allowed ? (
        <p className="rounded-xl bg-emerald-400/10 p-3 text-sm text-emerald-200">
          Ton club, tes jetons et ton objectif sont sauvegardés automatiquement.
        </p>
      ) : (
        <p className="rounded-xl bg-red-500/10 p-3 text-sm text-red-300">
          Cet e-mail n&apos;est pas autorisé : rien n&apos;est sauvegardé. Demande l&apos;accès à l&apos;admin.
        </p>
      )}
      {account.admin && <AccessManager />}
      <button
        type="button"
        onClick={account.signOut}
        className="h-10 rounded-xl border border-white/10 text-sm font-semibold text-zinc-300 hover:bg-white/5"
      >
        Se déconnecter
      </button>
    </div>
  );
}

// Réservé à l'admin : qui a le droit d'utiliser le site
function AccessManager() {
  const [emails, setEmails] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const { data } = await supabase.from("allowed_emails").select("email").order("email");
    setEmails((data ?? []).map((r) => r.email as string));
  }
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- chargement initial de la liste
    load();
  }, []);

  async function add(event: FormEvent) {
    event.preventDefault();
    const { error } = await supabase.from("allowed_emails").insert({ email: draft.trim().toLowerCase() });
    setError(error ? "Ajout impossible (déjà présent ?)" : null);
    if (!error) setDraft("");
    load();
  }
  async function remove(email: string) {
    await supabase.from("allowed_emails").delete().eq("email", email);
    load();
  }

  return (
    <div className="rounded-2xl border border-white/10 p-4">
      <h3 className="font-display text-lg font-bold uppercase">Accès autorisés</h3>
      <ul className="mt-2 flex flex-col gap-1 text-sm">
        {emails.map((email) => (
          <li key={email} className="flex items-center justify-between gap-2">
            <span className="truncate text-zinc-300">{email}</span>
            <button type="button" onClick={() => remove(email)} className="text-xs text-red-400 hover:text-red-300">
              Retirer
            </button>
          </li>
        ))}
      </ul>
      <form onSubmit={add} className="mt-3 flex gap-2">
        <input
          type="email"
          required
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="email d'un pote"
          className="h-9 min-w-0 flex-1 rounded-lg border border-white/10 bg-black/40 px-3 text-sm outline-none focus:border-emerald-400/60"
        />
        <button type="submit" className="rounded-lg bg-white/10 px-3 text-sm font-semibold hover:bg-white/15">
          Ajouter
        </button>
      </form>
      {error && <p className="mt-2 text-xs text-red-300">{error}</p>}
    </div>
  );
}
