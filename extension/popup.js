// Fenêtre de l'extension (clic sur son icône) : résumé, envoi, copie, réglage de l'adresse.

const DEFAULT_SITE = "https://fc27-album.vercel.app";
const { toClubText } = globalThis.Album27;

const $ = (id) => document.getElementById(id);
let items = {};

async function load() {
  const data = await chrome.storage.local.get(["items", "siteUrl"]);
  items = data.items || {};
  $("site-url").value = data.siteUrl || DEFAULT_SITE;

  const list = Object.values(items).filter((item) => !item.loan);
  const cards = new Set(list.map((item) => item.cardId));
  const firstOwner = new Set(list.filter((item) => item.firstOwner).map((item) => item.cardId));
  $("cards").textContent = cards.size;
  $("first-owner").textContent = firstOwner.size;
  for (const id of ["send", "copy", "clear"]) $(id).disabled = cards.size === 0;
}

$("send").addEventListener("click", async () => {
  await chrome.storage.local.set({
    pendingClub: { text: toClubText(Object.values(items)), at: Date.now() },
  });
  chrome.tabs.create({ url: $("site-url").value || DEFAULT_SITE });
});

$("copy").addEventListener("click", async () => {
  await navigator.clipboard.writeText(toClubText(Object.values(items)));
  $("status").textContent = "Copié : colle-le dans l'onglet « Mon club » du site.";
});

$("clear").addEventListener("click", async () => {
  await chrome.storage.local.remove(["items", "pendingClub", "updatedAt"]);
  $("status").textContent = "Liste effacée.";
  load();
});

$("site-url").addEventListener("change", (event) => {
  chrome.storage.local.set({ siteUrl: event.target.value.trim() });
});

load();
