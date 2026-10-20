# Données de l'album

Ces fichiers contiennent **des données d'exemple inventées** (joueurs, clubs, prix).
Remplace-les par les vraies données au fur et à mesure. Le site les relit à chaque
rechargement de page quand `npm run dev` tourne.

## `players.json` — la liste des joueurs

| Champ     | Exemple        | Signification                                  |
|-----------|----------------|------------------------------------------------|
| `id`      | `1`            | Identifiant unique (nombre). Utilisé partout.  |
| `name`    | `"Lucas Ferrand"` | Nom affiché                                 |
| `club`    | `"Club Alpha"` | Club                                           |
| `league`  | `"Ligue Démo"` | Ligue                                          |
| `nation`  | `"France"`     | Nationalité                                    |
| `rating`  | `84`           | Note générale                                  |
| `version` | `"Or rare"`    | Version de la carte                            |
| `price`   | `1500`         | Prix estimé sur le marché, en crédits          |

## `sets.json` — les sets de l'album

| Champ       | Exemple                | Signification                                   |
|-------------|------------------------|-------------------------------------------------|
| `id`        | `"club-alpha"`         | Identifiant unique du set (texte, sans espace)  |
| `name`      | `"Club Alpha"`         | Nom affiché                                     |
| `type`      | `"club"`               | `"club"`, `"league"` ou `"special"`             |
| `playerIds` | `[1, 2, 3]`            | Les `id` des joueurs qui comptent pour ce set   |
| `tiers`     | voir ci-dessous        | Les paliers, **du plus facile au plus dur**     |

Chaque palier :

| Champ      | Exemple | Signification                                              |
|------------|---------|------------------------------------------------------------|
| `name`     | `"D"`   | Nom du palier (D, C, B, A, S… ou autre)                    |
| `required` | `3`     | Nombre de joueurs du set à posséder pour atteindre le palier |
| `tokens`   | `2`     | Jetons gagnés en atteignant ce palier                      |

Un set peut avoir n'importe quel nombre de paliers (le set « Héros démo » n'en a que 3).
Un même joueur peut apparaître dans plusieurs sets (ex. un set club et un set ligue).

## `rules.json` — les règles générales

| Champ                | Valeur | Signification |
|----------------------|--------|---------------|
| `taxRate`            | `0.05` | Taxe du marché des transferts (5 %), ajoutée au coût d'achat des joueurs manquants. |
| `cumulativeTiers`    | `true` | `true` : atteindre le palier B rapporte aussi les jetons de D et C si tu ne les avais pas. `false` : seul le palier atteint rapporte ses jetons. |
| `maxCreditsPerToken` | `2000` | Seuil du verdict : un palier est « rentable » s'il coûte au plus ce nombre de crédits par jeton. |

À ajouter plus tard quand on connaîtra la règle exacte : le bonus premier propriétaire.
