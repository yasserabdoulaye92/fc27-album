# Projet : planificateur d'album FC 27 (fait maison)

Site perso pour moi et quelques potes : on importe notre club EA FC 27 Ultimate Team,
et le site calcule quels sets de l'album (Galerie) compléter pour gagner le plus de
jetons de Galerie avec notre budget en crédits. Inspiré d'outils existants, mais
avec notre propre nom, notre propre design et sans images officielles EA.

Je débute en développement web : explique ce que tu fais, avance par petites étapes,
et fais-moi tester chaque étape avant de passer à la suivante. Réponds en français.

## Stack
- Next.js (App Router) + TypeScript + Tailwind CSS
- Supabase : base de données Postgres + connexion par lien magique (e-mail)
- Hébergement : Vercel
- Pas de scraping de FUTBIN / FUT.GG / EA pour l'instant : les données sont importées
  à la main (CSV ou JSON) ou saisies dans une page admin.

## Fonctionnalités, dans l'ordre

### Étape 1 — Prototype local, sans base de données
- Données en fichiers JSON dans `/data` :
  - `players.json` : id, nom, club, ligue, nation, note, version de carte, prix estimé
  - `sets.json` : id, nom, type (club / ligue / spécial), liste des ids de joueurs requis,
    paliers (D, C, B, A, S) avec le nombre de joueurs requis et les jetons gagnés par palier
- Une page où je colle mon club (liste d'ids ou CSV exporté) → affichage de chaque set :
  joueurs récupérés / total, joueurs manquants, crédits nécessaires, coût de la taxe (5 %),
  jetons gagnables, verdict (rentable ou pas, en crédits par jeton).

### Étape 2 — Planificateur
Entrées : budget en crédits, objectif de jetons (optionnel), perte de taxe max,
nombre de transferts max, nombre de sets max.
Sortie : la liste des sets / paliers à faire, jetons totaux, crédits dépensés, taxe,
nombre de transferts.
Algorithme : problème de sac à dos (knapsack) sur les paliers de chaque set
(un seul palier choisi par set, le coût d'un palier = prix des joueurs manquants
pour l'atteindre). Commencer par une version gloutonne (meilleur ratio jetons/crédits),
puis une version programmation dynamique avec le budget arrondi par tranches de 100 crédits.
Attention : un même joueur peut compter dans plusieurs sets (club + ligue),
ne pas compter son prix deux fois.

### Étape 3 — Comptes et base de données (Supabase)
- Tables : `profiles`, `players`, `sets`, `set_tiers`, `set_players`, `user_club`
  (joueurs possédés par chaque utilisateur), `prices` (prix + date de mise à jour)
- Row Level Security : chaque utilisateur ne voit et ne modifie que son propre club
- Page admin (réservée à moi) pour importer/mettre à jour joueurs, sets et prix en CSV

### Étape 4 — Mise en ligne
- Déploiement sur Vercel, variables d'environnement Supabase dans Vercel
- Accès limité à mes potes (liste d'e-mails autorisés)

### Plus tard (idées)
- Solutions de DCE (SBC) à partir du club
- Historique des prix
- Import du club plus simple

## Règles importantes
- Ne jamais demander ni stocker de mot de passe EA.
- Pas de logos, photos de cartes ou images officielles EA ; pas de copie du nom
  ou du design d'un autre site.
- Les règles exactes de l'album (paliers, jetons, bonus premier propriétaire)
  doivent rester configurables dans les données, pas codées en dur :
  je les compléterai au fur et à mesure.
- Code simple et commenté, pas de dépendances inutiles.
