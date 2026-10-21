// S'exécute sur la Web App EA (monde isolé de l'extension).
// Reçoit les cartes repérées par inject.js, les garde dans le stockage de l'extension,
// et affiche un petit badge discret pour les envoyer vers le site.

(function () {
  const { toClubText } = globalThis.Album27;
  let items = {}; // cartes repérées, indexées par exemplaire (itemId)

  // ---------- Stockage ----------

  chrome.storage.local.get("items").then((data) => {
    items = data.items || {};
    render();
  });

  window.addEventListener("message", (event) => {
    const message = event.data;
    if (event.source !== window || !message || message.source !== "album27-webapp") return;
    if (message.type === "raw") {
      saveRaw(message.path, message.body);
      return;
    }
    if (message.type !== "items" || !Array.isArray(message.items)) return;

    let added = 0;
    for (const item of message.items) {
      if (typeof item.itemId !== "number" || typeof item.cardId !== "number") continue;
      if (!items[item.itemId]) added++;
      items[item.itemId] = item;
    }
    if (added > 0) {
      chrome.storage.local.set({ items, updatedAt: Date.now() });
      render();
    }
  });

  // ---------- Mode découverte ----------
  // Garde la dernière réponse de chaque adresse du jeu, si le mode est activé dans la
  // fenêtre de l'extension. Limité en taille pour ne pas remplir le navigateur.
  const MAX_BODY = 300000; // caractères
  const MAX_PATHS = 40;

  async function saveRaw(path, body) {
    const { discovery, raw = {} } = await chrome.storage.local.get(["discovery", "raw"]);
    if (!discovery || typeof path !== "string") return;
    let text = JSON.stringify(body);
    if (text.length > MAX_BODY) text = text.slice(0, MAX_BODY);
    raw[path] = { at: Date.now(), body: text };
    const paths = Object.keys(raw).sort((a, b) => raw[b].at - raw[a].at);
    for (const old of paths.slice(MAX_PATHS)) delete raw[old];
    await chrome.storage.local.set({ raw });
  }

  // ---------- Badge ----------
  // Dans un "shadow DOM" pour que les styles de la Web App ne le dérèglent pas (et inversement)

  const host = document.createElement("div");
  host.style.cssText = "position:fixed;right:16px;bottom:16px;z-index:2147483647";
  const shadow = host.attachShadow({ mode: "closed" });
  shadow.innerHTML = `
    <style>
      .badge { display:flex; align-items:center; gap:10px; padding:8px 10px 8px 14px;
        background:#09090b; color:#f4f4f5; border:1px solid rgba(255,255,255,.12);
        border-radius:999px; font:600 13px system-ui,sans-serif; box-shadow:0 8px 24px rgba(0,0,0,.4) }
      .count { color:#a1a1aa; font-weight:500 }
      button { border:0; border-radius:999px; padding:6px 12px; cursor:pointer;
        background:#10b981; color:#022c22; font:700 12px system-ui,sans-serif }
      button:disabled { background:#3f3f46; color:#a1a1aa; cursor:default }
    </style>
    <div class="badge">
      <span>Album27</span>
      <span class="count"></span>
      <button type="button">Envoyer</button>
    </div>`;
  const countLabel = shadow.querySelector(".count");
  const button = shadow.querySelector("button");

  function render() {
    const list = Object.values(items).filter((item) => !item.loan);
    const cards = new Set(list.map((item) => item.cardId)).size;
    countLabel.textContent = cards === 0 ? "parcours ton club…" : `${cards} carte${cards > 1 ? "s" : ""}`;
    button.disabled = cards === 0;
  }

  button.addEventListener("click", async () => {
    const list = Object.values(items);
    const text = toClubText(list);
    const { siteUrl } = await chrome.storage.local.get("siteUrl");
    // Le site lira ce club à son ouverture (voir site.js)
    await chrome.storage.local.set({ pendingClub: { text, at: Date.now() } });
    window.open(siteUrl || "https://fc27-album.vercel.app", "_blank");
  });

  function mount() {
    if (!document.body.contains(host)) document.body.appendChild(host);
  }
  if (document.body) mount();
  else document.addEventListener("DOMContentLoaded", mount);
})();
