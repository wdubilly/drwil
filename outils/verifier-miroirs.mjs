#!/usr/bin/env node
// Contrôle propre au dépôt drwil, jamais livré : preuve automatique d'une partie de QUA-018 (dépôt
// drwil vs livrable gabarit). Sans lui, garder les copies identiques reposait sur un `cp` à la main.
// Vérifie, d'après outils/miroirs.json (écarts voulus, chacun avec sa raison) :
// 1. tout fichier du dépôt qui a un homologue dans le gabarit (packages/drwil/templates/) lui est
//    identique, sauf écart déclaré ;
// 2. aucun fichier n'existe d'un seul côté sans être déclaré : fichier suivi du dépôt sans homologue
//    dans les dossiers miroirs, ou fichier d'une partie du gabarit installée ici absent du dépôt ;
// 3. la CI du dépôt contient tous les jobs de celle du gabarit, ses jobs en plus sont déclarés, et
//    aucun job déclaré propre au dépôt n'apparaît dans le gabarit (la fuite qui a motivé QUA-018) ;
// 4. le contenu livré (tout packages/drwil/templates/) ne cite pas l'historique
//    interne de drwil : numéro de PR, décision datée du demandeur, ADR, lot interne, projet
//    d'origine, fiche qui n'existe que dans ce dépôt.
// Hors de portée (à dire, pas à taire) : le contenu d'un écart déclaré, le texte des variables d'un
// gabarit, et la part humaine de QUA-018.
// Usage : node outils/verifier-miroirs.mjs [racine]
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, realpathSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const GABARIT = join("packages", "drwil", "templates");

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

const posix = (p) => p.split(sep).join("/");

function fichiers(dossier) {
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

const normaliser = (texte) => texte.replace(/\r\n/g, "\n");

/**
 * Le fichier installé correspond-il au gabarit ? Un gabarit à variables (`{{nom}}`, rendues à
 * l'installation) est comparé dans sa forme : chaque variable accepte n'importe quel texte, le reste
 * doit être identique.
 */
export function correspond(installe, gabarit) {
  const [a, g] = [normaliser(installe), normaliser(gabarit)];
  if (!/{{\w+}}/.test(g)) return a === g;
  const motif = g
    .split(/{{\w+}}/)
    .map((m) => m.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("[\\s\\S]*?");
  return new RegExp(`^${motif}$`).test(a);
}

/** Une entrée déclarée : chemin exact, dossier (« docs/projects/ ») ou motif (« * » dans un segment). */
function couvrePar(entree) {
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

const raisonVide = (raison) => typeof raison !== "string" || !raison.trim();

/**
 * Vérifie les miroirs. `suivis` : fichiers suivis par Git (chemins `/`), pour repérer ceux qui
 * n'existent que dans le dépôt. Rend { compares, problemes }.
 */
export function verifier(racine, { ecarts = {}, propresAuDepot = {}, propresAuGabarit = {}, ci = null, suivis = [] } = {}) {
  const problemes = [];
  const carte = homologues(racine);
  const present = (f) => existsSync(join(racine, f));
  const installees = unitesInstallees(racine, carte);
  let compares = 0;

  for (const [installe, { source, unite }] of [...carte].sort(([a], [b]) => a.localeCompare(b))) {
    if (!present(installe)) {
      const declare = Object.hasOwn(propresAuGabarit, installe);
      if (installees.has(unite) && !declare)
        problemes.push(
          `${installe} : présent dans le gabarit (${source}) mais absent du dépôt (npm run installer-depot, ou le déclarer propre au gabarit dans outils/miroirs.json)`,
        );
      continue;
    }
    compares++;
    const identique = correspond(readFileSync(join(racine, installe), "utf8"), readFileSync(join(racine, source), "utf8"));
    const declare = Object.hasOwn(ecarts, installe);
    if (!identique && !declare)
      problemes.push(
        `${installe} : diffère de ${source} (modifier le gabarit puis lancer npm run installer-depot, ou déclarer l'écart et sa raison dans outils/miroirs.json)`,
      );
    if (identique && declare) problemes.push(`${installe} : écart déclaré mais résolu (retirer sa ligne de outils/miroirs.json)`);
  }

  // Dossiers miroirs : ceux où le gabarit installe des fichiers ; les fichiers de la racine du dépôt
  // (package.json…) ne sont pas des miroirs.
  const zones = [...new Set([...carte.keys()].filter((f) => f.includes("/")).map((f) => `${f.split("/")[0]}/`))];
  const declares = Object.keys(propresAuDepot).map((e) => [e, couvrePar(e)]);
  for (const f of suivis) {
    if (carte.has(f) || !zones.some((z) => f.startsWith(z))) continue;
    if (!declares.some(([, couvre]) => couvre(f)))
      problemes.push(
        `${f} : présent dans le dépôt seulement (le livrer dans le gabarit, ou le déclarer propre au dépôt dans outils/miroirs.json)`,
      );
  }

  for (const [chemin, raison] of Object.entries(ecarts)) {
    if (!carte.has(chemin) || !present(chemin))
      problemes.push(`${chemin} : écart déclaré sans fichier à comparer (retirer sa ligne de outils/miroirs.json)`);
    if (raisonVide(raison)) problemes.push(`${chemin} : écart déclaré sans raison`);
  }
  for (const [entree, couvre] of declares) {
    if (!suivis.some((f) => couvre(f) && !carte.has(f)))
      problemes.push(
        `${entree} : déclaré propre au dépôt, mais ne couvre aucun fichier sans homologue (retirer sa ligne de outils/miroirs.json)`,
      );
    if (raisonVide(propresAuDepot[entree])) problemes.push(`${entree} : déclaré propre au dépôt sans raison`);
  }
  for (const [chemin, raison] of Object.entries(propresAuGabarit)) {
    if (!carte.has(chemin) || present(chemin))
      problemes.push(
        `${chemin} : déclaré propre au gabarit, mais absent du gabarit ou présent dans le dépôt (retirer sa ligne de outils/miroirs.json)`,
      );
    if (raisonVide(raison)) problemes.push(`${chemin} : déclaré propre au gabarit sans raison`);
  }

  if (ci) problemes.push(...verifierCi(racine, carte, ci));
  problemes.push(...fuitesInternes(racine));
  return { compares, problemes };
}

/** Jobs de la CI : ceux du gabarit tous présents, ceux en plus déclarés, aucun déclaré qui fuit vers le gabarit. */
function verifierCi(racine, carte, { fichier, jobsPropresAuDepot = {} }) {
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
// Noms des fiches de l'ancien gabarit français : les hooks les lisent encore pour les projets installés
// avant le gabarit unique en anglais. À retirer avec la migration des projets équipés (chantier A de
// docs/intentions/livrable-full-english.md).
const FICHES_DE_L_ANCIEN_GABARIT = ["en-attente.md", "entretien-courant.md", "mecanique-ia-first.md", "modele-fiche-projet.md"];

/** Lignes du gabarit qui citent l'historique interne de drwil, ou une fiche absente du gabarit. */
export function fuitesInternes(racine) {
  const gabarit = join(racine, GABARIT);
  const fiches = new Set([
    ...FICHES_DU_GABARIT.flatMap((d) => fichiers(join(gabarit, d)).map((f) => f.split(sep).at(-1))),
    ...FICHES_DE_L_ANCIEN_GABARIT,
  ]);
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

/** Lit la liste des écarts et les fichiers suivis, vérifie, affiche ; rend le code de sortie. */
export function principal(racine) {
  let liste;
  try {
    liste = JSON.parse(readFileSync(join(racine, "outils", "miroirs.json"), "utf8"));
  } catch (e) {
    console.error(`miroirs : outils/miroirs.json illisible (${e.message})`);
    return 1;
  }
  const git = spawnSync("git", ["ls-files", "-z"], { cwd: racine, encoding: "utf8" });
  // Hors dépôt git, les fichiers propres au dépôt ne se repèrent pas : le dire, jamais passer à vide (QUA-013).
  if (git.status !== 0) {
    console.error("miroirs : fichiers suivis illisibles (git ls-files) — contrôle non exécuté");
    return 1;
  }
  const { compares, problemes } = verifier(racine, {
    ecarts: liste.ecarts ?? {},
    propresAuDepot: liste.propresAuDepot ?? {},
    propresAuGabarit: liste.propresAuGabarit ?? {},
    ci: liste.ci ?? null,
    suivis: git.stdout.split("\0").filter(Boolean),
  });
  for (const p of problemes) console.error(`  ✗ ${p}`);
  console.log(
    `miroirs : ${compares} fichier(s) comparé(s) au gabarit, ${Object.keys(liste.ecarts ?? {}).length} écart(s) déclaré(s), ${problemes.length} problème(s)`,
  );
  return problemes.length ? 1 : 0;
}

// Chemins réels comparés : un dossier en lien symbolique ne doit pas faire passer le contrôle à vide.
if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = principal(process.argv[2] ?? process.cwd());
}
