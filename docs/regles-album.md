# Règles de l'album (Galerie) FC 27 — notes de recherche

Recherche faite le 20/10/2026. EA ne publie **pas** les chiffres exacts (barème des
scores, seuils, pourcentages) : ils viennent de sites communautaires qui les relèvent
dans le jeu. À vérifier en jeu et à garder **configurables dans `data/`**.

## 1. Fonctionnement général

- L'album contient ~126 sets (club, ligue, rareté/campagne…). Chaque set a un nombre
  fixe d'**emplacements** (entre 4 et 30) et une condition d'éligibilité
  (ex. « joueurs de tel club »).
- Il faut **remplir tous les emplacements** pour obtenir une note (palier D à S).
- La note dépend d'un **score**, pas du nombre de joueurs :
  - **Score de base** = somme des *Item Scores* des cartes placées ;
  - **Bonus** = pourcentages des **tags** remplis ;
  - **Score total** = base + bonus → donne le palier.
- Les **seuils** de score de chaque palier sont **différents pour chaque set**.
- Les **jetons** par palier sont aussi **différents pour chaque set**, et **cumulatifs**
  (atteindre S rapporte aussi D, C, B et A).
  - Exemple « Season 1 » (10 emplacements) : D 1 000 → 0 jeton, C 25 000 → 5,
    B 60 000 → 10, A 100 000 → 20, S 150 000 → 50 (total 85).
  - Autre exemple relevé : D 5, C 15, B 30, A 50, S 75 jetons (total 175).

## 2. Les joueurs ne sont pas consommés

- Valider un set **ne retire pas** les cartes du club (contrairement à un DCE).
- Une carte possédée une fois reste **enregistrée dans la Galerie** même si on la vend
  ou l'utilise dans un DCE. Les cartes **prêtées** ne comptent pas.
- Donc la vraie perte quand on achète pour l'album = **taxe de 5 %** à la revente
  (+ la variation de prix). C'est ce que les autres outils appellent « perte de taxe ».

## 3. Item Score par note (cartes de base)

| Note | Score | | Note | Score |
|---|---|---|---|---|
| 99 | 100 000 | | 86 | 4 100 |
| 98 | 90 000 | | 85 | 2 100 |
| 97 | 85 000 | | 84 | 830 |
| 96 | 55 000 | | 83 | 410 |
| 95 | 40 000 | | 82 | 340 |
| 94 | 30 000 | | 81 | 280 |
| 93 | 25 000 | | 80 | 180 |
| 92 | 20 000 | | 79 | 160 |
| 91 | 19 000 | | 78 | 140 |
| 90 | 14 000 | | 77 | 120 |
| 89 | 11 000 | | 76 | 100 |
| 88 | 8 300 | | 75 | 90 |
| 87 | 5 500 | | 65–74 (argent) | 35 |
| | | | 45–64 (bronze) | 20 |

Versions spéciales (valeurs approximatives) : TOTW ≈ ×1,25, Héros ≈ ×1,25,
ICÔNE ≈ ×1,5, cartes de campagne ×1,25 puis ×1,5 en Holographique.
Une source donne 89 = 13 750 au lieu de 11 000 → à vérifier en jeu.

## 4. Tags (bonus en %)

Le pourcentage s'applique **au score de base des cartes concernées** par le tag
(pas à tout le set), arrondi à l'inférieur. Les bonus de plusieurs tags s'additionnent.

| Tag | Palier 1 | Palier 2 | Palier 3 |
|---|---|---|---|
| **Premier propriétaire** | 5–9 cartes : +150 % | 10–19 : +300 % | 20+ : +500 % |
| Bronze | 5–9 : +20 % | 10–19 : +40 % | 20+ : +80 % |
| Argent | 5–9 : +15 % | 10–19 : +30 % | 20+ : +60 % |
| ICÔNES | 2–3 : +10 % | 4–5 : +15 % | 6+ : +25 % |
| Holographique | 2–3 : +8 % | 4–5 : +12 % | 6+ : +20 % |
| Héros | 2–3 : +8 % | 4–5 : +12 % | 6+ : +20 % |
| Multiples (même joueur) | 2 : +10 % | 3 : +15 % | 4+ : +20 % |
| TOTW | 3–5 : +4 % | 6–9 : +8 % | 10+ : +15 % |
| Gardiens | 3–5 : +3 % | 6–9 : +6 % | 10+ : +15 % |
| Ambidextre (5★ mauvais pied) | 3–4 : +3 % | 5–9 : +6 % | 10+ : +12 % |
| Technique (5★ gestes) | 3–4 : +3 % | 5–9 : +6 % | 10+ : +12 % |
| Mur défensif (DC/DG/DD) | 5–9 : +3 % | 10–14 : +6 % | 15+ : +10 % |
| Contrôle du milieu | 5–9 : +3 % | 10–14 : +6 % | 15+ : +10 % |
| Attaque totale (BU/AD/AG) | 5–9 : +3 % | 10–14 : +6 % | 15+ : +10 % |
| Même ligue | 5–9 : +1 % | 10–19 : +2 % | 20+ : +8 % |
| Même nation / même club | 5–9 : +1 % | 10–19 : +2 % | 20+ : +4 % |
| Nations / clubs / ligues différents | 5–9 : +1 % | 10–19 : +2 % | 20+ : +4 % |
| Or | 5–9 : +1 % | 10–19 : +2 % | 20+ : +4 % |

Exemple : 20 cartes 84 obtenues en packs → base 20 × 830 = 16 600 ;
Premier propriétaire +500 % → +83 000 ; total 99 600.

### Premier propriétaire

- Concerne les cartes **obtenues soi-même** : packs, objectifs, DCE, récompenses.
- Les cartes **achetées sur le marché ne comptent pas**.
- C'est le plus gros bonus : il sert surtout à monter le **niveau de Galerie**
  (score total de tous les sets), moins à gagner des jetons pas chers.
- Le jeu ne permet pas aux outils externes de savoir quelles cartes sont
  « premier propriétaire » → il faudra que l'utilisateur l'indique lui-même.

## 5. Niveau de Galerie

Score de Galerie = somme des scores de tous les sets. Récompenses aux niveaux
5, 10, 15, 20 et 25. Les seuils de niveau ne sont pas publiés.

## Sources

- EA — aide Galerie : https://help.ea.com/en/articles/ea-sports-fc/gallery-hub/
- EA — FUT Deep Dive FC 27 : https://www.ea.com/games/ea-sports-fc/fc-27/news/pitch-notes-fc27-fut-deep-dive
- Timesaver — Premier propriétaire et tags : https://timesaver.gg/blog/fc-27-first-owner-gallery-tags-500-percent-bonus
- Timesaver — table des Item Scores : https://timesaver.gg/blog/fc-27-item-score-table-cheapest-fodder-84s
- Timesaver — set Season 1 : https://timesaver.gg/blog/fc-27-season-1-gallery-set-grades-85-tokens-cost
- FUT.GG — Galerie : https://www.fut.gg/fut-gallery/
- FUTGenie — Galerie : https://www.futgenie.gg/posts/what-is-fut-gallery
- Red Bull — tags : https://www.redbull.com/int-en/fc-27-ultimate-team-gallery-tags
