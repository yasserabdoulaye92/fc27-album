# Données de l'album

Ces fichiers contiennent **des joueurs réels et des sets d'exemple**, avec des notes,
des prix et des seuils **approximatifs** (à remplacer par les vraies données). Le barème des
scores et les tags (`scores.json`) viennent de nos recherches (voir
`docs/regles-album.md`) et sont à vérifier en jeu.
Le site relit ces fichiers à chaque rechargement de page quand `npm run dev` tourne.

## Comment l'album calcule un palier

1. Un set a un nombre d'**emplacements** à remplir avec des joueurs **éligibles**.
2. Chaque carte rapporte un **score** selon sa note (et sa version).
3. Les **tags** ajoutent un pourcentage du score des cartes concernées.
4. **Score total = base + bonus** → le plus haut palier dont le `minScore` est atteint.

## `players.json` — les cartes connues (avec leur prix)

| Champ     | Exemple           | Signification                              |
|-----------|-------------------|--------------------------------------------|
| `id`      | `1`               | Identifiant unique (nombre). Mets l'**identifiant EA** de la carte (`definitionId`) pour que l'extension reconnaisse ton club |
| `name`    | `"Lucas Ferrand"` | Nom affiché                                |
| `club`    | `"Club Alpha"`    | Club                                       |
| `league`  | `"Ligue Démo"`    | Ligue                                      |
| `nation`  | `"France"`        | Nationalité                                |
| `rating`  | `84`              | Note générale                              |
| `version` | `"Or rare"`       | Version de la carte (`TOTW`, `Héros`, `ICÔNE`…) |
| `price`   | `1500`            | Prix estimé sur le marché, en crédits      |

Deux versions d'un même joueur = deux cartes avec deux `id` différents.

## `sets.json` — les sets de l'album

| Champ         | Exemple                    | Signification                               |
|---------------|----------------------------|---------------------------------------------|
| `id`          | `"club-alpha"`             | Identifiant unique (texte, sans espace)     |
| `name`        | `"Club Alpha"`             | Nom affiché                                 |
| `type`        | `"club"`                   | `"club"`, `"league"` ou `"special"`         |
| `slots`       | `5`                        | Nombre d'emplacements à remplir             |
| `eligibility` | `{ "club": "Club Alpha" }` | Qui peut aller dans le set (voir ci-dessous) |
| `tiers`       | voir ci-dessous            | Les paliers, **du plus facile au plus dur** |

`eligibility` peut contenir `club`, `league`, `nation` et/ou `version`.
Un joueur est éligible s'il respecte **tous** les champs donnés.
Ex. `{ "league": "Ligue Démo", "version": "TOTW" }` = les TOTW de la Ligue Démo.

Chaque palier :

| Champ      | Exemple | Signification                          |
|------------|---------|----------------------------------------|
| `name`     | `"D"`   | Nom du palier                          |
| `minScore` | `8000`  | Score total à atteindre                |
| `tokens`   | `10`    | Jetons gagnés en atteignant ce palier  |

## Importer depuis un tableur (CSV)

Plus simple que d'écrire le JSON à la main : remplis un tableau dans Excel ou
Google Sheets, enregistre-le en CSV, puis lance :

```bash
npm run import -- joueurs mon-fichier.csv
npm run import -- sets mon-fichier.csv
```

Le fichier `data/players.json` (ou `data/sets.json`) est **remplacé**. Les lignes
invalides sont ignorées et signalées avec leur numéro.
Des modèles prêts à copier sont dans [`modeles/`](modeles/) :

- `joueurs.csv` : `id;nom;club;ligue;nation;note;version;prix`
- `sets.csv` : `id;nom;type;emplacements;club;ligue;nation;version;D;C;B;A;S`
  - `type` : `club`, `ligue` ou `special`
  - `club` / `ligue` / `nation` / `version` : conditions d'éligibilité (vide = pas de condition)
  - chaque palier : `seuil/jetons`, ex. `25000/5` (vide = pas de palier)

Le séparateur peut être `;` (Excel en français) ou `,`.

## `scores.json` — le barème des scores et les tags

- `ratingScores` : score d'une carte selon sa note. On prend la première ligne
  dont `min` est atteint (ex. une 84 → ligne `min: 84` → 830 points).
- `versionMultipliers` : multiplicateur selon la version (`"Héros": 1.25` = +25 %).
  Les versions absentes valent ×1.
- `tags` : les bonus. Chaque tag a :
  - `match` : quelles cartes il regarde :
    - `{ "kind": "firstOwner" }` : les cartes premier propriétaire ;
    - `{ "kind": "rating", "min": 65, "max": 74 }` : les notes dans cet intervalle ;
    - `{ "kind": "version", "value": "TOTW" }` : une version de carte ;
    - `{ "kind": "sameClub" }` / `"sameLeague"` / `"sameNation"` : le plus grand
      groupe de cartes du même club / de la même ligue / de la même nation ;
  - `tiers` : à partir de `min` cartes concernées, `bonus` (1.5 = +150 %) appliqué
    au score de ces cartes.

## `photos.json` — les photos des joueurs

Générées automatiquement par `npm run photos` : pour chaque joueur de `players.json`,
la commande cherche sur Wikidata un footballeur de ce nom et récupère sa photo sur
**Wikimedia Commons** (photos libres de droits), avec l'auteur et la licence.
Aucune image EA. Les crédits sont affichés sur le site (« Crédits photos » en bas de page).

Relance `npm run photos` après un import de joueurs (`-- --force` pour tout rechercher).
Si une photo est fausse (homonyme), corrige ou supprime l'entrée à la main.

## `rules.json` — les réglages généraux

| Champ                | Valeur | Signification |
|----------------------|--------|---------------|
| `taxRate`            | `0.05` | Taxe du marché (5 %), payée quand tu revends les cartes achetées. |
| `cumulativeTiers`    | `true` | Atteindre B rapporte aussi les jetons de D et C si tu ne les avais pas. |
| `maxTaxLossPerToken` | `300`  | Verdict : un palier est « rentable » si la perte de taxe par jeton est au plus ce nombre. |
