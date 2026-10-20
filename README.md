# Album FC 27 · Planificateur

Site perso pour décider quels sets de l'album (Galerie) d'EA FC 27 Ultimate Team
compléter pour gagner le plus de jetons avec un budget en crédits.

On colle son club (liste d'ids ou CSV), et le site affiche pour chaque set :
joueurs récupérés / total, joueurs manquants, crédits nécessaires par palier,
taxe de 5 %, jetons gagnables et un verdict de rentabilité (crédits par jeton).

> Projet indépendant, sans lien avec EA. Aucune image ni donnée officielle :
> les données de `data/` sont des exemples inventés.

## Stack

- [Next.js](https://nextjs.org) (App Router) + TypeScript
- Tailwind CSS
- À venir : Supabase (base de données + connexion par e-mail), hébergement Vercel

## Lancer le projet

Prérequis : [Node.js](https://nodejs.org) 20 ou plus.

```bash
npm install
npm run dev
```

Puis ouvrir http://localhost:3000. Sous Windows, on peut aussi double-cliquer sur `lancer.bat`.

## Organisation du code

| Dossier / fichier | Rôle |
|---|---|
| `data/` | Joueurs, sets et règles de l'album en JSON (format décrit dans `data/README.md`) |
| `lib/club.ts` | Lecture du club collé (ids ou CSV) |
| `lib/album.ts` | Calcul du coût, de la taxe et des jetons de chaque palier |
| `app/page.tsx` | Page d'accueil (charge les données) |
| `app/components/` | Composants d'affichage (zone d'import, carte d'un set) |

## Feuille de route

- [x] **Étape 1** — Prototype local : import du club et analyse de chaque set
- [ ] **Étape 2** — Planificateur : meilleurs paliers à faire pour un budget (sac à dos)
- [ ] **Étape 3** — Comptes et base de données (Supabase)
- [ ] **Étape 4** — Mise en ligne sur Vercel
