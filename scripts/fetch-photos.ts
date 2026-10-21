// Récupère une vraie photo de chaque joueur sur Wikimedia Commons (photos libres de droits
// de Wikipédia), avec l'auteur et la licence à afficher en crédit.
//
//   npm run photos            -> cherche les joueurs qui n'ont pas encore de photo
//   npm run photos -- --force -> recherche tout à nouveau
//
// Résultat : data/photos.json, indexé par nom de joueur (toutes ses versions partagent la photo).
// Aucune image EA : uniquement des photos sous licence libre (CC BY, CC BY-SA, domaine public...).

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import type { Player, PlayerPhoto } from "../lib/types.ts";

const PLAYERS_FILE = "data/players.json";
const PHOTOS_FILE = "data/photos.json";
// Wikimedia demande d'identifier les programmes qui utilisent son API
const USER_AGENT = "Album27/0.1 (https://github.com/yasserabdoulaye92/fc27-album)";
// Sur Wikidata, "footballeur" = Q937857 : sert à écarter les homonymes
const FOOTBALLER = "Q937857";

const force = process.argv.includes("--force");
const players: Player[] = JSON.parse(readFileSync(PLAYERS_FILE, "utf8"));
const photos: Record<string, PlayerPhoto | null> =
  existsSync(PHOTOS_FILE) && !force ? JSON.parse(readFileSync(PHOTOS_FILE, "utf8")) : {};

// Forme (simplifiée) des réponses des API Wikidata et Commons
type Claim = { mainsnak?: { datavalue?: { value?: unknown } } };
type SearchResponse = { search: { id: string }[] };
type EntitiesResponse = { entities: Record<string, { claims?: Record<string, Claim[]> }> };
type ImageInfoResponse = {
  query: {
    pages: Record<
      string,
      {
        imageinfo?: {
          thumburl: string;
          descriptionurl: string;
          extmetadata?: Record<string, { value: string }>;
        }[];
      }
    >;
  };
};

async function api<T>(url: string, params: Record<string, string>): Promise<T> {
  const query = new URLSearchParams({ ...params, format: "json" });
  const response = await fetch(`${url}?${query}`, { headers: { "User-Agent": USER_AGENT } });
  if (!response.ok) throw new Error(`HTTP ${response.status} sur ${url}`);
  return (await response.json()) as T;
}

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Enlève les balises HTML d'un texte ("<a href=...>Bryan Berlin</a>" -> "Bryan Berlin")
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

// Cherche le nom de fichier de la photo d'un footballeur sur Wikidata
async function findImageFile(name: string): Promise<string | null> {
  for (const language of ["fr", "en"]) {
    const search = await api<SearchResponse>("https://www.wikidata.org/w/api.php", {
      action: "wbsearchentities",
      search: name,
      language,
      type: "item",
      limit: "5",
    });
    const ids = search.search.map((r) => r.id);
    if (ids.length === 0) continue;

    const entities = await api<EntitiesResponse>("https://www.wikidata.org/w/api.php", {
      action: "wbgetentities",
      ids: ids.join("|"),
      props: "claims",
    });
    // On garde le premier résultat qui est un footballeur et qui a une photo (propriété P18)
    for (const id of ids) {
      const claims = entities.entities[id]?.claims ?? {};
      const jobs = (claims.P106 ?? []).map((c) => (c.mainsnak?.datavalue?.value as { id?: string })?.id);
      const image = claims.P18?.[0]?.mainsnak?.datavalue?.value;
      if (jobs.includes(FOOTBALLER) && typeof image === "string") return image;
    }
  }
  return null;
}

// Récupère l'adresse d'une miniature, l'auteur et la licence d'un fichier Commons
async function describeFile(file: string): Promise<PlayerPhoto | null> {
  const data = await api<ImageInfoResponse>("https://commons.wikimedia.org/w/api.php", {
    action: "query",
    titles: `File:${file}`,
    prop: "imageinfo",
    iiprop: "url|extmetadata",
    iiurlwidth: "400",
  });
  const info = Object.values(data.query.pages)[0]?.imageinfo?.[0];
  if (!info) return null;
  const meta = info.extmetadata ?? {};
  return {
    url: info.thumburl.split("?")[0],
    author: stripHtml(meta.Artist?.value ?? "Auteur inconnu"),
    license: meta.LicenseShortName?.value ?? "voir la source",
    source: info.descriptionurl,
  };
}

const names = [...new Set(players.map((p) => p.name))].filter((name) => !(name in photos));
console.log(`${names.length} joueur(s) à chercher…`);

for (const name of names) {
  try {
    const file = await findImageFile(name);
    photos[name] = file ? await describeFile(file) : null;
    console.log(photos[name] ? `✓ ${name}` : `– ${name} : pas de photo libre trouvée`);
  } catch (error) {
    console.warn(`⚠ ${name} : ${(error as Error).message} (on réessaiera la prochaine fois)`);
  }
  await pause(300); // on ne surcharge pas les serveurs de Wikimedia
}

// Tri par nom pour un fichier stable dans git
const sorted = Object.fromEntries(Object.entries(photos).sort(([a], [b]) => a.localeCompare(b)));
writeFileSync(PHOTOS_FILE, JSON.stringify(sorted, null, 2) + "\n");
const found = Object.values(sorted).filter(Boolean).length;
console.log(`${found}/${Object.keys(sorted).length} joueurs avec photo → ${PHOTOS_FILE}`);
