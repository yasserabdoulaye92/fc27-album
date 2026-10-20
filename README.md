# Album FC 27 · Planificateur

Site perso pour décider quels sets de l'album (Galerie) d'EA FC 27 Ultimate Team
compléter pour gagner le plus de jetons avec un budget en crédits.

On colle son club (liste d'ids ou CSV, en marquant les cartes « premier propriétaire »),
et le site calcule pour chaque set le score actuel (barème par note + bonus des tags),
puis les cartes à acheter pour atteindre chaque palier, les crédits à avancer,
la perte de taxe à la revente, les jetons gagnables et un verdict de rentabilité.

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
| `data/` | Joueurs, sets, barème des scores et règles en JSON (format décrit dans `data/README.md`) |
| `docs/regles-album.md` | Notes de recherche sur les vraies règles de l'album |
| `lib/club.ts` | Lecture du club collé (ids ou CSV, premier propriétaire) |
| `lib/score.ts` | Score d'une équipe : barème par note + bonus des tags |
| `lib/album.ts` | Meilleure équipe du club et achats pour atteindre chaque palier |
| `app/page.tsx` | Page d'accueil (charge les données) |
| `app/components/` | Composants d'affichage (zone d'import, carte d'un set) |

## Feuille de route

- [x] **Étape 1** — Prototype local : import du club et analyse de chaque set
- [ ] **Étape 2** — Planificateur : meilleurs paliers à faire pour un budget (sac à dos)
- [ ] **Étape 3** — Comptes et base de données (Supabase)
- [ ] **Étape 4** — Mise en ligne sur Vercel
