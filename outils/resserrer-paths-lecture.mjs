// Lecture d'un fichier source pour l'outil resserrer-paths (QUA-338) : ses imports relatifs, les chaînes qui peuvent
// nommer un fichier lu, et ce qui interdit de conclure (import dynamique, balayage de dossier, sous-processus de code).
// Un analyseur de lexèmes, pas un parseur : il lui suffit de ne jamais prendre un commentaire ou un texte pour du code.

import { readdirSync } from "node:fs";

/** Motifs larges que l'outil sait resserrer. */
export const LARGES = [".githooks/**", "packages/drwil/**"];
const IGNORES = new Set(["node_modules", ".git", "dist", "coverage", "evidence"]);

const PRECEDE_REGEX = /[(,=:[!&|?{};+\-*%<>~^]$|^$|\b(?:return|typeof|case|in|of)$/;

/** Retire commentaires et expressions régulières, remplace chaque chaîne par "§n" : { code, chaines }. */
function lexer(src) {
  const chaines = [];
  let code = "";
  const ajouter = (valeur, avecExpr) => {
    chaines.push({ valeur, avecExpr });
    code += `"§${chaines.length - 1}"`;
  };
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === "/" && src[i + 1] === "/") {
      while (i < src.length && src[i] !== "\n") i++;
    } else if (c === "/" && src[i + 1] === "*") {
      const fin = src.indexOf("*/", i + 2);
      i = fin < 0 ? src.length : fin + 2;
    } else if (c === '"' || c === "'") {
      let valeur = "";
      for (i++; i < src.length && src[i] !== c && src[i] !== "\n"; i++) valeur += src[i] === "\\" ? (src[++i] ?? "") : src[i];
      i++;
      ajouter(valeur, false);
    } else if (c === "`") {
      let valeur = "";
      let avecExpr = false;
      for (i++; i < src.length && src[i] !== "`"; i++) {
        if (src[i] === "\\") valeur += src[++i] ?? "";
        else if (src[i] === "$" && src[i + 1] === "{") {
          avecExpr = true;
          for (let prof = 0; i < src.length; i++) {
            if (src[i] === "{") prof++;
            if (src[i] === "}" && --prof === 0) break;
          }
        } else valeur += src[i];
      }
      i++;
      ajouter(valeur, avecExpr);
    } else if (c === "/" && PRECEDE_REGEX.test(code.trimEnd().slice(-12).replace(/^.*\s/, ""))) {
      let classe = false;
      for (i++; i < src.length && (classe || src[i] !== "/") && src[i] !== "\n"; i++) {
        if (src[i] === "\\") i++;
        else if (src[i] === "[") classe = true;
        else if (src[i] === "]") classe = false;
      }
      i++;
      while (/[a-z]/.test(src[i] ?? "")) i++;
      code += "/r/";
    } else code += src[i++];
  }
  return { code, chaines };
}

const OUTILS_SANS_CODE = new Set(["git", "gh", "which", "where", "find", "ls", "cat", "chmod", "node"]);
const BALAYAGES = /\b(readdirSync|readdir|opendirSync|globSync|glob|cpSync)\s*\(/g;
// Un chemin calculé mais bâti de morceaux littéraux (`import(join(MOTEUR, "a.mjs"))`) est couvert par la lecture des chaînes.
/** Texte des arguments du premier appel à `mot(` trouvé à partir de `depuis`, et la position qui suit ; null si aucun. */
function appel(code, mot, depuis) {
  const m = new RegExp(`\\b${mot}\\s*\\(`, "g");
  m.lastIndex = depuis;
  const d = m.exec(code);
  if (!d) return null;
  let prof = 0;
  let fin = d.index + d[0].length - 1;
  for (; fin < code.length; fin++) {
    if (code[fin] === "(") prof++;
    if (code[fin] === ")" && --prof === 0) break;
  }
  return { args: code.slice(d.index + d[0].length, fin), suite: fin };
}
const appels = (code, mot) => {
  const sortie = [];
  for (let a = appel(code, mot, 0); a; a = appel(code, mot, a.suite)) sortie.push(a.args);
  return sortie;
};
const CALCULE = (code, mot) => appels(code, mot).some((args) => !args.includes('"§'));

/**
 * { relatifs, chaines, balayages, douteux } : imports relatifs littéraux ; morceaux de chaînes littérales (candidats à
 * nommer un fichier lu, y compris un morceau de `join(…)`) ; fonctions qui lisent un dossier ; raisons de ne pas conclure.
 */
export function lireSource(texte) {
  const { code, chaines } = lexer(texte);
  const valeur = (n) => chaines[Number(n)];
  const relatifs = [];
  const douteux = [];
  const litteral = (n, sorte) => {
    const s = valeur(n);
    if (s.avecExpr) douteux.push(`${sorte} dont le chemin est calculé`);
    else if (s.valeur.startsWith(".")) relatifs.push(s.valeur);
  };
  for (const m of code.matchAll(/\b(?:import|export)\b(?:[^;"]*?\bfrom\b)?\s*"§(\d+)"/g)) litteral(m[1], "import");
  for (const m of code.matchAll(/\bimport\s*\(\s*"§(\d+)"\s*\)/g)) litteral(m[1], "import()");
  for (const m of code.matchAll(/\brequire\s*\(\s*"§(\d+)"\s*\)/g)) litteral(m[1], "require");
  if (CALCULE(code, "import")) douteux.push("import() dont le chemin est calculé");
  if (CALCULE(code, "require")) douteux.push("require dont le chemin est calculé");
  if (chaines.some((s) => /^(?:node:)?(?:worker_threads|vm)$/.test(s.valeur))) douteux.push("worker ou vm");
  for (const m of code.matchAll(/(?<![.\w])(spawnSync|spawn|execFileSync|execFile|execSync|exec|fork)\s*\(\s*([^,)]*)/g)) {
    const arg = m[2].trim();
    const lit = arg.match(/^"§(\d+)"$/);
    if (!(lit ? OUTILS_SANS_CODE.has(valeur(lit[1]).valeur.split(/\s+/)[0]) : /^process\.execPath$|^node$|^process\.argv0$/.test(arg)))
      douteux.push(`sous-processus : ${m[1]}(${arg.slice(0, 30)}…)`);
  }
  // Un dossier lu : les chaînes de ses arguments et de la définition des variables passées ; une variable sans définition
  // (paramètre, variable de boucle) ne dit pas quel dossier : toutes les chaînes du fichier sont alors à prendre.
  const balayages = [...code.matchAll(BALAYAGES)].map((m) => {
    const args = appel(code, m[1], m.index)?.args ?? "";
    const textes = [args];
    let inconnu = false;
    for (const id of args.match(/(?<![.\w$"§])[A-Za-z_$][\w$]*(?![\w$]*\s*[(:])/g) ?? []) {
      const def = code.match(new RegExp(`\\b(?:const|let|var)\\s+${id.replace(/\$/g, "\\$")}\\s*=\\s*([^;]{0,300})`));
      if (def) textes.push(def[1]);
      else if (!/^(?:true|false|null|undefined|withFileTypes|recursive|encoding|utf8)$/.test(id)) inconnu = true;
    }
    const lus = textes.flatMap((t) => [...t.matchAll(/"§(\d+)"/g)].map((x) => valeur(x[1]).valeur));
    return { nom: m[1], lus, inconnu };
  });
  const lisibles = chaines
    .filter((s) => !s.avecExpr && s.valeur.length < 400)
    .flatMap((s) => s.valeur.split(/[\s'"=]+/))
    .filter(Boolean);
  return { relatifs, chaines: lisibles, balayages, douteux: [...new Set(douteux)] };
}

const indexes = new Map();
/** Fichiers du dépôt par nom de base, et chemins et noms des dossiers sous les motifs larges (mémorisé par racine). */
export function parNom(racine) {
  if (!indexes.has(racine)) {
    const index = { fichiers: new Map(), dossiers: new Set() };
    const dehors = new Set();
    const parcourir = (rel) => {
      for (const e of readdirSync(`${racine}/${rel}`, { withFileTypes: true })) {
        if (IGNORES.has(e.name)) continue;
        const chemin = rel ? `${rel}/${e.name}` : e.name;
        if (!e.isDirectory()) index.fichiers.set(e.name, [...(index.fichiers.get(e.name) ?? []), chemin]);
        else {
          if (LARGES.some((g) => `${chemin}/`.startsWith(g.slice(0, -2)))) index.dossiers.add(chemin).add(e.name);
          else dehors.add(e.name);
          parcourir(chemin);
        }
      }
    };
    parcourir("");
    for (const nom of dehors) index.dossiers.delete(nom); // un nom aussi porté hors des motifs larges ne désigne rien de sûr
    indexes.set(racine, index);
  }
  return indexes.get(racine);
}

const prefixeCommun = (a, b) => a.split("/").findIndex((x, i) => x !== b.split("/")[i]);
/** Homonymes d'un nom cité par `depuis` : les plus proches de lui ; l'autre exemplaire (gabarit ou copie) est identique (miroirs). */
export function voisins(candidats, depuis) {
  if (!candidats.length) return [];
  const proches = Math.max(...candidats.map((c) => prefixeCommun(c, depuis)));
  return candidats.filter((c) => prefixeCommun(c, depuis) === proches);
}
