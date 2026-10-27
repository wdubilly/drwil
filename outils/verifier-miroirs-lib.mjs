// Briques du contrôle des miroirs (outils/verifier-miroirs.mjs, QUA-018), séparées pour tenir le plafond
// de taille d'un fichier de code (QUA-001) : carte des homologues du gabarit, comparaison, jobs de CI,
// fuites de l'historique interne. Propre au dépôt drwil, jamais livré.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

export const GABARIT = join("packages", "drwil", "templates");

// Même ordre et mêmes règles que scaffold() (packages/drwil/src/index.ts) : un dossier par outil ou
// par CI se retire du chemin installé. Le dernier homologue trouvé l'emporte, comme à l'installation.
const SOURCES = [
  ["common/base", 0],
  ["common/tools", 1],
  ["common/ci", 1],
];
// npm retire tout `.gitignore` d'un paquet : le gabarit le livre sous un autre nom (NOMS_LIVRES de index.ts).
const NOMS_LIVRES = { gitignore: ".gitignore" };
// Modules optionnels (templates/common/optional/<module>/) : leurs .mjs se copient à la main dans
// .githooks/ (README de chaque module) ; leur README ne s'installe pas.
const OPTIONNELS = "common/optional";

export const posix = (p) => p.split(sep).join("/");

export function fichiers(dossier) {
  if (!existsSync(dossier)) return [];
  return readdirSync(dossier, { withFileTypes: true }).flatMap((e) => {
    const p = join(dossier, e.name);
    return e.isDirectory() ? fichiers(p) : [p];
  });
}

/**
 * { chemin dans le dépôt : { source, unite } } pour chaque fichier installable du gabarit. L'unité
 * (base, outil, CI ou module optionnel) s'installe en bloc : elle dit si un fichier absent manque.
 */
export function homologues(racine) {
  const gabarit = join(racine, GABARIT);
  const carte = new Map();
  for (const [source, profondeur] of SOURCES) {
    const dossier = join(gabarit, source);
    for (const f of fichiers(dossier)) {
      const parties = posix(relative(dossier, f)).split("/");
      const unite = profondeur ? `${source.split("/")[1]}/${parties[0]}` : "base";
      const installe = parties.slice(profondeur);
      const nom = NOMS_LIVRES[installe.at(-1)];
      if (nom) installe[installe.length - 1] = nom;
      carte.set(installe.join("/"), { source: posix(relative(racine, f)), unite });
    }
  }
  for (const f of fichiers(join(gabarit, OPTIONNELS))) {
    const parties = posix(relative(join(gabarit, OPTIONNELS), f)).split("/");
    if (f.endsWith(".mjs"))
      carte.set(`.githooks/${parties.at(-1)}`, { source: posix(relative(racine, f)), unite: `optional/${parties[0]}` });
  }
  return carte;
}

/** Unités installées dans le dépôt : la base, et toute unité dont un fichier au moins y est présent. */
export function unitesInstallees(racine, carte) {
  return new Set(["base", ...[...carte].filter(([f]) => existsSync(join(racine, f))).map(([, h]) => h.unite)]);
}

export const normaliser = (texte) => texte.replace(/\r\n/g, "\n");

/**
 * Le fichier installé correspond-il au gabarit ? Un gabarit à variables (`{{nom}}`, rendues à
 * l'installation) est comparé dans sa forme : chaque variable accepte n'importe quel texte, le reste
 * doit être identique.
 */
export function correspond(installe, gabarit) {
  const [a, g] = [normaliser(installe), normaliser(gabarit)];
  if (!/{{\w+}}/.test(g)) return a === g;
  // Morceau par morceau : une expression régulière aussi longue qu'un document déborde.
  const morceaux = g.split(/{{\w+}}/);
  const fin = a.length - morceaux.at(-1).length;
  if (!a.startsWith(morceaux[0]) || fin < morceaux[0].length || !a.endsWith(morceaux.at(-1))) return false;
  let pos = morceaux[0].length;
  for (const m of morceaux.slice(1, -1)) {
    const i = a.indexOf(m, pos);
    if (i < 0 || i + m.length > fin) return false;
    pos = i + m.length;
  }
  return true;
}

/** Une entrée déclarée : chemin exact, dossier (« docs/projects/ ») ou motif (« * » dans un segment). */
export function couvrePar(entree) {
  if (entree.endsWith("/")) return (f) => f.startsWith(entree);
  const re = new RegExp(`^${entree.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, "[^/]*")}$`);
  return (f) => re.test(f);
}

/** Noms des jobs d'un workflow GitHub Actions (clés à deux espaces sous `jobs:`). */
export function jobs(texte) {
  const noms = [];
  let dans = false;
  for (const ligne of normaliser(texte).split("\n")) {
    if (/^jobs:\s*$/.test(ligne)) dans = true;
    else if (dans && /^\S/.test(ligne)) dans = false;
    else if (dans) {
      const m = /^ {2}([A-Za-z0-9_-]+):\s*$/.exec(ligne);
      if (m) noms.push(m[1]);
    }
  }
  return noms;
}

export const raisonVide = (raison) => typeof raison !== "string" || !raison.trim();

/** Jobs de la CI : ceux du gabarit tous présents, ceux en plus déclarés, aucun déclaré qui fuit vers le gabarit. */
export function verifierCi(racine, carte, { fichier, jobsPropresAuDepot = {} }) {
  const homologue = carte.get(fichier);
  if (!homologue || !existsSync(join(racine, fichier)))
    return [`${fichier} : CI déclarée dans outils/miroirs.json sans homologue à comparer`];
  const depot = jobs(readFileSync(join(racine, fichier), "utf8"));
  const gabarit = jobs(readFileSync(join(racine, homologue.source), "utf8"));
  const problemes = [];
  for (const j of gabarit) {
    if (Object.hasOwn(jobsPropresAuDepot, j))
      problemes.push(
        `${fichier} : job « ${j} » déclaré propre au dépôt mais présent dans le gabarit — fuite du dépôt vers le livrable (QUA-018)`,
      );
    else if (!depot.includes(j)) problemes.push(`${fichier} : job « ${j} » du gabarit absent de la CI du dépôt`);
  }
  for (const j of depot) {
    if (!gabarit.includes(j) && !Object.hasOwn(jobsPropresAuDepot, j))
      problemes.push(`${fichier} : job « ${j} » propre au dépôt non déclaré (jobsPropresAuDepot dans outils/miroirs.json)`);
  }
  for (const [j, raison] of Object.entries(jobsPropresAuDepot)) {
    if (!depot.includes(j)) problemes.push(`${fichier} : job « ${j} » déclaré propre au dépôt mais absent de sa CI`);
    if (raisonVide(raison)) problemes.push(`${fichier} : job « ${j} » déclaré propre au dépôt sans raison`);
  }
  return problemes;
}

// Références internes à drwil, sans sens pour un projet équipé.
const HISTORIQUE_INTERNE = [
  /PR #\d+/,
  /\b[Dd][ée]cision[^.\n]{0,40}\d{4}-\d{2}-\d{2}/,
  /\bADR-\d+/,
  /\bLot \d+ (?:a ajouté|added)/,
  /run-box/,
];
const FICHES_DU_GABARIT = ["common/base/docs/projects"];

/** Lignes du gabarit qui citent l'historique interne de drwil, ou une fiche absente du gabarit. */
export function fuitesInternes(racine) {
  const gabarit = join(racine, GABARIT);
  const fiches = new Set(FICHES_DU_GABARIT.flatMap((d) => fichiers(join(gabarit, d)).map((f) => f.split(sep).at(-1))));
  const problemes = [];
  for (const f of fichiers(gabarit).sort()) {
    normaliser(readFileSync(f, "utf8"))
      .split("\n")
      .forEach((ligne, i) => {
        const lieu = `${posix(relative(racine, f))}:${i + 1}`;
        for (const motif of HISTORIQUE_INTERNE) {
          const m = motif.exec(ligne);
          if (m) problemes.push(`${lieu} : historique interne de drwil dans le livrable « ${m[0]} » (QUA-018)`);
        }
        for (const [, nom] of ligne.matchAll(/docs\/projec?ts\/([A-Za-z0-9_-]+\.md)/g)) {
          if (!fiches.has(nom)) problemes.push(`${lieu} : fiche propre au dépôt citée dans le livrable « ${nom} » (QUA-018)`);
        }
      });
  }
  return problemes;
}
