// S'exécute sur le site Album27. Remet au site le club envoyé depuis la Web App.
// Échange de messages :
//   extension -> site : "hello"  (l'extension est là)
//   site -> extension : "ready"  (le site est prêt à recevoir)
//   extension -> site : "club"   (le texte du club, une seule fois)

(function () {
  async function deliver() {
    const { pendingClub } = await chrome.storage.local.get("pendingClub");
    // On n'envoie qu'un club récent (moins de 10 minutes), puis on l'efface
    if (!pendingClub || Date.now() - pendingClub.at > 10 * 60 * 1000) return;
    await chrome.storage.local.remove("pendingClub");
    window.postMessage(
      { source: "album27-extension", type: "club", text: pendingClub.text },
      window.location.origin,
    );
  }

  window.addEventListener("message", (event) => {
    const message = event.data;
    if (event.source !== window || event.origin !== window.location.origin) return;
    if (message && message.source === "album27-site" && message.type === "ready") deliver();
  });

  window.postMessage({ source: "album27-extension", type: "hello" }, window.location.origin);
})();
