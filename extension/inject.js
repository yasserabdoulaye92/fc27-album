// S'exécute DANS la page de la Web App EA (monde "MAIN"), avant ses propres scripts.
// Observe les réponses du club que la Web App reçoit déjà et les transmet au collecteur
// (collector.js). Ne modifie rien, n'envoie aucune requête, ne lit aucun mot de passe.

(function () {
  const { isClubUrl, extractPlayers } = globalThis.Album27;

  function forward(url, data) {
    const items = extractPlayers(data);
    if (items.length > 0) {
      window.postMessage({ source: "album27-webapp", type: "items", items }, window.location.origin);
    }
  }

  // 1. Requêtes faites avec fetch()
  const originalFetch = window.fetch;
  window.fetch = async function (...args) {
    const response = await originalFetch.apply(this, args);
    try {
      const url = typeof args[0] === "string" ? args[0] : args[0] && args[0].url;
      if (isClubUrl(url)) {
        // clone() : on lit une copie, la Web App garde la réponse intacte
        response
          .clone()
          .json()
          .then((data) => forward(url, data))
          .catch(() => {});
      }
    } catch {
      // en cas de souci on ne gêne jamais la Web App
    }
    return response;
  };

  // 2. Requêtes faites avec XMLHttpRequest
  const originalOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    this.album27Url = url;
    return originalOpen.call(this, method, url, ...rest);
  };
  const originalSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.send = function (...args) {
    if (isClubUrl(this.album27Url)) {
      this.addEventListener("load", () => {
        try {
          const data = this.responseType === "json" ? this.response : JSON.parse(this.responseText);
          forward(this.album27Url, data);
        } catch {
          // réponse illisible : on ignore
        }
      });
    }
    return originalSend.apply(this, args);
  };
})();
