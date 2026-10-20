# Album FC 27 · Planificateur

[![CI](https://github.com/yasserabdoulaye92/fc27-album/actions/workflows/ci.yml/badge.svg)](https://github.com/yasserabdoulaye92/fc27-album/actions/workflows/ci.yml)
![Licence MIT](https://img.shields.io/badge/licence-MIT-green)

Planificateur **open source** pour l'album (Galerie) d'EA FC 27 Ultimate Team :
quels sets compléter, et jusqu'à quel palier, pour gagner le plus de jetons avec
son budget en crédits.

> Projet indépendant, sans lien avec EA. Aucune image ni donnée officielle :
> les joueurs et les sets de `data/` sont des exemples inventés.

## Fonctionnalités

- **Import du club** : liste d'ids ou CSV, avec marquage des cartes
  **premier propriétaire** (`12*` ou colonne `premier_proprietaire`).
- **Score fidèle au jeu** : barème par note, multiplicateurs de version (Héros, TOTW,
  ICÔNE…) et **tags** en pourcentage (premier propriétaire jusqu'à +500 %, bronze,
  argent, même ligue…). Le détail du score de chaque set est affiché.
- **Analyse de chaque set** : ta meilleure équipe, ton palier actuel, et pour chaque
  palier les cartes à acheter, les crédits à avancer, la **perte de taxe** à la
  revente, les jetons gagnés et un verdict de rentabilité.
- **Planificateur** : budget, objectif de jetons, perte de taxe max, transferts max,
  sets max → la liste des sets à faire et une liste d'achats. Une carte utile à
  plusieurs sets (club + ligue) n'est **payée qu'une fois**.
- **Règles 100 % configurables** dans des fichiers JSON : rien n'est codé en dur,
  on peut corriger un barème ou un pourcentage sans toucher au code.
- **Rapide** : ~0,25 s pour analyser 111 sets et 3 000 joueurs, ~2 s pour un plan.
- **Transparent** : formules documentées, code commenté, tests automatiques.

## Comment ça calcule

1. **Score d'un set** = somme des scores des cartes + bonus des tags
   (chaque tag ajoute un pourcentage du score des cartes concernées).
   Le palier atteint est le plus haut dont le seuil est dépassé.
2. **Achats pour un palier** : on part de ta meilleure équipe, on complète les
   emplacements vides avec les cartes les moins chères, puis on remplace les cartes
   les moins utiles par l'achat qui rapporte le plus de points par crédit, jusqu'au
   seuil. Les cartes « dominées » (moins fortes et plus chères qu'assez d'autres)
   sont écartées pour aller vite.
3. **Planificateur** : deux méthodes, on garde la meilleure :
   - **gloutonne** : à chaque tour, l'amélioration qui rapporte le plus de jetons par
     crédit, en recalculant les sets touchés (cartes partagées comptées une fois) ;
   - **programmation dynamique** (sac à dos) : au plus un palier par set, budget
     arrondi par tranches de 100 crédits.

L'album ne consomme pas les cartes : on peut acheter, valider le set puis revendre.
La vraie perte est donc la **taxe de 5 %** à la revente. Les règles et leurs sources
sont détaillées dans [`docs/regles-album.md`](docs/regles-album.md).

## Lancer le projet

Prérequis : [Node.js](https://nodejs.org) 22 ou plus.

```bash
npm install
npm run dev
```

Puis ouvrir http://localhost:3000. Sous Windows, on peut aussi double-cliquer sur `lancer.bat`.

| Commande            | Rôle                                   |
|---------------------|----------------------------------------|
| `npm run dev`       | Lance le site en local                 |
| `npm test`          | Lance les tests automatiques           |
| `npm run typecheck` | Vérifie les types TypeScript           |
| `npm run lint`      | Vérifie le style du code               |
| `npm run build`     | Construit la version de production     |
| `npm run import -- joueurs fichier.csv` | Importe des joueurs depuis un tableur |

## Organisation du code

| Dossier / fichier       | Rôle |
|-------------------------|------|
| `data/`                 | Joueurs, sets, barème des scores et règles en JSON (format dans [`data/README.md`](data/README.md)) |
| `docs/regles-album.md`  | Notes de recherche sur les règles de l'album, avec sources |
| `lib/club.ts`           | Lecture du club collé (ids ou CSV, premier propriétaire) |
| `lib/score.ts`          | Score d'une équipe : barème par note + bonus des tags |
| `lib/album.ts`          | Meilleure équipe du club et achats pour chaque palier |
| `lib/planner.ts`        | Planificateur (glouton + sac à dos) |
| `lib/csv-import.ts`     | Conversion de tableurs CSV en données (`scripts/import-csv.ts`) |
| `app/`                  | Pages et composants (Next.js) |
| `tests/`                | Tests automatiques (`node --test`, sans dépendance) |

Stack : [Next.js](https://nextjs.org) (App Router), TypeScript, Tailwind CSS.

## Feuille de route

- [x] **Étape 1** — Import du club et analyse de chaque set
- [x] **Étape 2** — Planificateur (budget, objectif, limites)
- [x] Import de vraies données (joueurs, sets, prix) depuis un CSV (`npm run import`)
- [ ] **Étape 3** — Comptes et base de données (Supabase)
- [ ] **Étape 4** — Mise en ligne (Vercel)
- [ ] Tags de poste (Mur défensif, Attaque totale…) et Multiples

## Contribuer

Les contributions sont bienvenues : correction d'une règle de l'album, d'un barème,
amélioration de l'algorithme ou de l'interface.

1. Forke le dépôt et crée une branche.
2. Vérifie que tout passe : `npm run typecheck && npm run lint && npm test`.
3. Ouvre une pull request en expliquant le changement (et la source s'il s'agit
   d'une règle du jeu).

## Licence

[MIT](LICENSE). EA SPORTS FC et Ultimate Team sont des marques d'Electronic Arts ;
ce projet n'est ni affilié ni approuvé par EA.
