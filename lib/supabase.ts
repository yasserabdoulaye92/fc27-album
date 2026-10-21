// Connexion à Supabase (base de données + comptes).
// La clé "publishable" est faite pour être publique : la sécurité est assurée par
// la Row Level Security de la base (voir supabase/migrations/).
// On peut la remplacer par des variables d'environnement (ex. pour un autre projet).

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://fpzwnyebehavpfchvdis.supabase.co";
const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "sb_publishable_wKTHgbKkAmB0iR0iC71Sng_Lc-2bsTl";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
