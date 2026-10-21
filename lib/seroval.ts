// Lecture des données intégrées aux pages de FUT.GG.
// Elles sont écrites en JavaScript compact (format "seroval") et pas en JSON :
//   {id:91,name:"Rayo",ok:!0,grades:$R[17]=[{name:"D",threshold:10}]}
// On les convertit en JSON standard, sans jamais exécuter leur code.

// Trouve l'objet { ... } (ou le tableau [ ... ]) qui commence à "start",
// en tenant compte des chaînes de caractères. Renvoie son texte.
export function extractBalanced(source: string, start: number): string {
  const open = source[start];
  const close = open === "{" ? "}" : "]";
  let depth = 0;
  for (let i = start; i < source.length; i++) {
    const c = source[i];
    if (c === '"') {
      i = endOfString(source, i);
      continue;
    }
    if (c === "{" || c === "[") depth++;
    if (c === "}" || c === "]") depth--;
    if (depth === 0 && c === close) return source.slice(start, i + 1);
  }
  throw new Error("Objet non terminé");
}

// Position du guillemet fermant d'une chaîne qui commence à "start"
function endOfString(source: string, start: number): number {
  for (let i = start + 1; i < source.length; i++) {
    if (source[i] === "\\") i++;
    else if (source[i] === '"') return i;
  }
  throw new Error("Chaîne non terminée");
}

// Convertit un objet seroval en valeur JavaScript (via JSON, sans exécution de code)
export function parseSeroval(text: string): unknown {
  let out = "";
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      const end = endOfString(text, i);
      // \x3C n'existe pas en JSON : on l'écrit <
      out += text.slice(i, end + 1).replace(/\\x([0-9a-fA-F]{2})/g, "\\u00$1");
      i = end;
      continue;
    }
    const rest = text.slice(i, i + 40);
    let m: RegExpMatchArray | null;
    if ((m = rest.match(/^\$R\[\d+\]=/))) {
      i += m[0].length - 1; // "$R[12]=" : simple étiquette, on l'enlève
    } else if ((m = rest.match(/^\$R\[\d+\]/))) {
      out += "null"; // renvoi vers un objet déjà vu : on ne le recopie pas
      i += m[0].length - 1;
    } else if (rest.startsWith("!0")) {
      out += "true";
      i += 1;
    } else if (rest.startsWith("!1")) {
      out += "false";
      i += 1;
    } else if (rest.startsWith("void 0")) {
      out += "null";
      i += 5;
    } else if ((m = rest.match(/^([A-Za-z_$][\w$]*):/)) && /[{,]$/.test(out)) {
      out += `"${m[1]}":`; // clé sans guillemets -> clé JSON
      i += m[0].length - 1;
    } else {
      out += c;
    }
  }
  return JSON.parse(out);
}

// Le plus gros <script> d'une page : c'est lui qui contient les données
export function largestScript(html: string): string {
  const scripts = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  return scripts.reduce((a, b) => (b.length > a.length ? b : a), "");
}

// Tous les objets qui commencent par "prefix" (ex. "{id:" suivi de "categoryId")
export function findObjects(source: string, pattern: RegExp): unknown[] {
  const found: unknown[] = [];
  for (const match of source.matchAll(new RegExp(pattern.source, "g"))) {
    found.push(parseSeroval(extractBalanced(source, match.index!)));
  }
  return found;
}
