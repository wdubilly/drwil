#!/usr/bin/env node
// Contrôle propre au dépôt drwil, jamais livré : tout fichier du dépôt qui a un homologue dans le
// gabarit (packages/drwil/templates/) lui est identique, sauf écart déclaré avec sa raison dans
// outils/miroirs.json. Preuve automatique de QUA-018 (dépôt drwil vs livrable gabarit) : sans lui,
// garder les copies identiques reposait sur un `cp` à la main après chaque modification.
// Usage : node outils/verifier-miroirs.mjs [racine]
import { existsSync, readdirSync, readFileSync, realpathSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const GABARIT = join("packages", "drwil", "templates");

// Même ordre et mêmes règles que scaffold() (packages/drwil/src/index.ts) : un dossier par outil ou
// par CI se retire du chemin installé. Le dernier homologue trouvé l'emporte, comme à l'installation.
const SOURCES = [
  ["common/base", 0],
  ["{lang}/base", 0],
  ["common/tools", 1],
  ["{lang}/tools", 1],
  ["common/ci", 1],
  ["{lang}/ci", 1],
];
// npm retire tout `.gitignore` d'un paquet : le gabarit le livre sous un autre nom (NOMS_LIVRES de index.ts).
const NOMS_LIVRES = { gitignore: ".gitignore" };
// Modules optionnels (templates/common/optional/<module>/) : leurs .mjs se copient à la main dans
// .githooks/ (README de chaque module) ; leur README ne s'installe pas.
const OPTIONNELS = "common/optional";

const posix = (p) => p.split(sep).join("/");

function fichiers(dossier) {
  if (!existsSync(dossier)) return [];
  return readdirSync(dossier, { withFileTypes: true }).flatMap((e) => {
    const p = join(dossier, e.name);
    return e.isDirectory() ? fichiers(p) : [p];
  });
}

/** { chemin dans le dépôt : chemin dans le gabarit } pour chaque fichier du gabarit installable. */
export function homologues(racine, lang = "fr") {
  const gabarit = join(racine, GABARIT);
  const carte = new Map();
  for (const [source, profondeur] of SOURCES) {
    const dossier = join(gabarit, source.replace("{lang}", lang));
    for (const f of fichiers(dossier)) {
      const parties = posix(relative(dossier, f)).split("/").slice(profondeur);
      const nom = NOMS_LIVRES[parties.at(-1)];
      if (nom) parties[parties.length - 1] = nom;
      carte.set(parties.join("/"), posix(relative(racine, f)));
    }
  }
  for (const f of fichiers(join(gabarit, OPTIONNELS))) {
    if (f.endsWith(".mjs")) carte.set(`.githooks/${f.split(sep).at(-1)}`, posix(relative(racine, f)));
  }
  return carte;
}

const normaliser = (texte) => texte.replace(/\r\n/g, "\n");

/**
 * Le fichier installé correspond-il au gabarit ? Un gabarit à variables (`{{nom}}`, rendues à
 * l'installation) est comparé dans sa forme : chaque variable accepte n'importe quel texte, le reste
 * doit être identique.
 */
export function correspond(installe, gabarit) {
  const [a, g] = [normaliser(installe), normaliser(gabarit)];
  if (!/{{\w+}}/.test(g)) return a === g;
  const motif = g.split(/{{\w+}}/).map((m) => m.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("[\\s\\S]*?");
  return new RegExp(`^${motif}$`).test(a);
}

/**
 * Compare chaque fichier du dépôt présent à son homologue. Un fichier du gabarit sans copie dans le
 * dépôt (outil ou CI non installés ici) n'est pas comparé. Rend { compares, problemes }.
 */
export function verifier(racine, { lang = "fr", ecarts = {} } = {}) {
  const problemes = [];
  const carte = homologues(racine, lang);
  let compares = 0;
  for (const [installe, source] of [...carte].sort(([a], [b]) => a.localeCompare(b))) {
    if (!existsSync(join(racine, installe))) continue;
    compares++;
    const identique = correspond(readFileSync(join(racine, installe), "utf8"), readFileSync(join(racine, source), "utf8"));
    const declare = Object.hasOwn(ecarts, installe);
    if (!identique && !declare) problemes.push(`${installe} : diffère de ${source} (corriger, ou déclarer l'écart et sa raison dans outils/miroirs.json)`);
    if (identique && declare) problemes.push(`${installe} : écart déclaré mais résolu (retirer sa ligne de outils/miroirs.json)`);
  }
  for (const [chemin, raison] of Object.entries(ecarts)) {
    if (!carte.has(chemin) || !existsSync(join(racine, chemin))) problemes.push(`${chemin} : écart déclaré sans fichier à comparer (retirer sa ligne de outils/miroirs.json)`);
    if (typeof raison !== "string" || !raison.trim()) problemes.push(`${chemin} : écart déclaré sans raison`);
  }
  return { compares, problemes };
}

/** Lit la langue du projet et la liste des écarts, vérifie, affiche ; rend le code de sortie. */
export function principal(racine) {
  let lang = "fr";
  try {
    lang = JSON.parse(readFileSync(join(racine, ".drwil", "ia-first.json"), "utf8")).lang === "en" ? "en" : "fr";
  } catch {}
  let ecarts;
  try {
    ecarts = JSON.parse(readFileSync(join(racine, "outils", "miroirs.json"), "utf8")).ecarts ?? {};
  } catch (e) {
    console.error(`miroirs : outils/miroirs.json illisible (${e.message})`);
    return 1;
  }
  const { compares, problemes } = verifier(racine, { lang, ecarts });
  for (const p of problemes) console.error(`  ✗ ${p}`);
  console.log(`miroirs : ${compares} fichier(s) comparé(s) au gabarit, ${Object.keys(ecarts).length} écart(s) déclaré(s), ${problemes.length} problème(s)`);
  return problemes.length ? 1 : 0;
}

// Chemins réels comparés : un dossier en lien symbolique ne doit pas faire passer le contrôle à vide.
if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = principal(process.argv[2] ?? process.cwd());
}
