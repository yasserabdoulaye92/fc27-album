// Lecture des données de la Web App EA (fonctions pures, sans accès au navigateur :
// elles sont testées dans tests/extension.test.ts).
//
// L'extension ne fait AUCUNE requête vers EA : elle lit seulement les réponses que la
// Web App reçoit déjà quand tu parcours ton club.

(function (root) {
  // Réponses qui contiennent des cartes que tu possèdes
  // (club, réserve, achats non attribués, liste de transferts)
  const CLUB_URL = /\/ut\/game\/[^/]+\/(club|storagepile|purchased|tradepile)/i;
  // Réponses qui contiennent des cartes des AUTRES joueurs : à ignorer
  const NOT_OWNED_URL = /transfermarket|watchlist/i;

  function isClubUrl(url) {
    const text = String(url || "");
    return CLUB_URL.test(text) && !NOT_OWNED_URL.test(text);
  }

  // Cherche toutes les cartes "joueur" dans une réponse, quelle que soit sa forme.
  // Pour chaque carte :
  //   itemId     : identifiant de TON exemplaire de la carte
  //   cardId     : identifiant de la carte (même valeur pour tous les exemplaires)
  //   rating     : note
  //   firstOwner : vrai si tu es le premier propriétaire (1 seul propriétaire)
  //   loan       : vrai pour une carte prêtée (elles ne comptent pas dans l'album)
  function extractPlayers(data) {
    const found = [];
    const seen = new Set();

    function walk(node, depth) {
      if (!node || typeof node !== "object" || depth > 8) return;
      if (Array.isArray(node)) {
        for (const child of node) walk(child, depth + 1);
        return;
      }
      if (node.itemType === "player" && typeof node.rating === "number") {
        const cardId = typeof node.definitionId === "number" ? node.definitionId : node.resourceId;
        if (typeof cardId === "number") {
          const itemId = typeof node.id === "number" ? node.id : cardId;
          if (!seen.has(itemId)) {
            seen.add(itemId);
            found.push({
              itemId,
              cardId,
              rating: node.rating,
              firstOwner: node.owners === 1,
              loan: typeof node.loans === "number" && node.loans > 0,
            });
          }
        }
        return;
      }
      for (const value of Object.values(node)) walk(value, depth + 1);
    }

    walk(data, 0);
    return found;
  }

  // Texte à coller dans le site : "123*, 456" (étoile = premier propriétaire).
  // Une seule entrée par carte, les cartes prêtées sont exclues.
  function toClubText(items) {
    const byCard = new Map();
    for (const item of items) {
      if (item.loan) continue;
      byCard.set(item.cardId, byCard.get(item.cardId) === true || item.firstOwner === true);
    }
    return [...byCard].map(([id, firstOwner]) => (firstOwner ? `${id}*` : String(id))).join(", ");
  }

  // Mode découverte : réponses du jeu utiles pour comprendre le format des données
  // (Galerie, club...). On exclut le marché et tout ce qui concerne le compte
  // (pseudo, crédits, réglages, connexion).
  const GAME_URL = /\/ut\/game\/[^/]+\//i;
  const PRIVATE_URL = /transfermarket|watchlist|tradepile|\/user|usermassinfo|settings|auth|token|purchase(?!d)|store|bid|sell|message|notification/i;

  function isDiscoveryUrl(url) {
    const text = String(url || "");
    return GAME_URL.test(text) && !PRIVATE_URL.test(text);
  }

  // Chemin sans les paramètres : "/ut/game/fc27/club?count=91" -> "/ut/game/fc27/club"
  function pathOf(url) {
    try {
      return new URL(String(url), "https://example.com").pathname;
    } catch {
      return String(url).split("?")[0];
    }
  }

  root.Album27 = { isClubUrl, extractPlayers, toClubText, isDiscoveryUrl, pathOf };
})(globalThis);
