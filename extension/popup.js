// Fenêtre de l'extension (clic sur son icône) : résumé, envoi, copie, réglage de l'adresse.

const DEFAULT_SITE = "https://fc27-album.vercel.app";
const { toClubText } = globalThis.Album27;

const $ = (id) => document.getElementById(id);
let items = {};

async function load() {
  const data = await chrome.storage.local.get(["items", "siteUrl", "discovery", "raw"]);
  $("discovery").checked = data.discovery === true;
  $("raw-count").textContent = Object.keys(data.raw || {}).length;
  $("export").disabled = Object.keys(data.raw || {}).length === 0;
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

$("discovery").addEventListener("change", (event) => {
  chrome.storage.local.set({ discovery: event.target.checked });
});

// Télécharge les réponses enregistrées dans un fichier JSON
$("export").addEventListener("click", async () => {
  const { raw = {} } = await chrome.storage.local.get("raw");
  const content = Object.entries(raw).map(([path, entry]) => ({
    path,
    at: new Date(entry.at).toISOString(),
    body: JSON.parse(entry.body.length < 300000 ? entry.body : "null"),
  }));
  const blob = new Blob([JSON.stringify(content, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `album27-decouverte-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  $("status").textContent = "Fichier téléchargé : mets-le dans le dossier captures/ du projet.";
});

$("site-url").addEventListener("change", (event) => {
  chrome.storage.local.set({ siteUrl: event.target.value.trim() });
});

load();
