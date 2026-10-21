# Extension Album27 — import du club

Extension Chrome / Edge qui importe ton club EA FC 27 dans Album27, étoiles
« premier propriétaire » comprises.

## Ce qu'elle fait (et ne fait pas)

- Elle **lit** les réponses que la Web App EA reçoit déjà quand tu parcours ton club
  (club, réserve, achats, liste de transferts).
- Elle **ne fait aucune requête** vers EA, ne clique sur rien, n'automatise rien.
- Elle **ne voit jamais ton mot de passe** (tu te connectes à la Web App comme d'habitude).
- Les cartes repérées restent dans ton navigateur, jusqu'à ce que tu cliques sur
  « Envoyer ».

EA interdit l'automatisation de la Web App. Une extension qui se contente de lire est
le cas le plus prudent, mais le risque n'est jamais tout à fait nul : utilise-la en
connaissance de cause.

## Installer (mode développeur)

1. Ouvre `chrome://extensions` (ou `edge://extensions`).
2. Active le **mode développeur** (en haut à droite).
3. Clique sur **Charger l'extension non empaquetée** et choisis ce dossier `extension/`.

## Utiliser

1. Ouvre la [Web App FC 27](https://www.ea.com/ea-sports-fc/ultimate-team/web-app/) et connecte-toi.
2. Va dans **Club → Joueurs** et fais défiler **toutes les pages** : un badge « Album27 »
   en bas à droite compte les cartes repérées.
3. Clique sur **Envoyer** : le site s'ouvre avec ton club déjà importé.

L'icône de l'extension permet aussi de copier la liste, de tout effacer, ou de changer
l'adresse du site (par défaut `https://fc27-album.vercel.app`). Pour une autre adresse,
ajoute-la aussi dans `manifest.json` (section `site.js`), puis recharge l'extension.

## Comment les cartes sont reconnues

- Chaque carte est identifiée par son **identifiant EA** (`definitionId`). Pour que le
  site la reconnaisse, la colonne `id` de `data/players.json` doit contenir ces mêmes
  identifiants EA.
- **Premier propriétaire** : une carte avec un seul propriétaire (`owners = 1`).
- Les cartes **prêtées** sont ignorées (elles ne comptent pas dans l'album).

À vérifier au premier essai : ces noms de champs viennent des versions précédentes de
la Web App. Si le compteur reste à zéro ou si aucune étoile n'apparaît, signale-le :
il faudra adapter `parse.js` (la logique est testée dans `tests/extension.test.ts`).

## Fichiers

| Fichier | Rôle |
|---|---|
| `manifest.json` | Déclaration de l'extension (Manifest V3) |
| `parse.js` | Lecture des réponses de la Web App (fonctions pures, testées) |
| `inject.js` | Observe les réponses du club dans la page de la Web App |
| `collector.js` | Garde les cartes repérées et affiche le badge |
| `site.js` | Remet le club au site Album27 |
| `popup.html` / `popup.js` | Fenêtre de l'extension |
