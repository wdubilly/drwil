#!/usr/bin/env node
// Outil propre au dépôt drwil, jamais livré (QUA-018) : resserre les `paths` des contrôles de tests de .drwil/ia-first.json
// (QUA-338). Un contrôle qui cite `.githooks/**` ou `packages/drwil/**` est rejoué à chaque fichier touché dessous, alors que
// ses tests n'en lisent que quelques-uns : l'outil suit les imports statiques de ses fichiers de test, de proche en proche,
// et propose les fichiers exacts. Au moindre doute (import non résolu ou calculé, dossier balayé, sous-processus de code)
// le motif large est gardé : mieux vaut rejouer un contrôle de trop que laisser passer un fichier lu.
// Usage : node outils/resserrer-paths.mjs [racine] [--appliquer] [--mesure fichier,fichier…]
import { existsSync, readFileSync, realpathSync, statSync, writeFileSync } from "node:fs";
import { posix } from "node:path";
import { fileURLToPath } from "node:url";
import { globToRegex, matchPaths } from "../.githooks/glob.mjs";
import { LARGES, lireSource, parNom, voisins } from "./resserrer-paths-lecture.mjs";

export { LARGES };
const CODE = /\.(?:mjs|cjs|js|ts|mts)$/;
const EXT = [".mjs", ".js", ".ts", ".cjs", ".json"];
// Modules dont un sous-processus à commande variable a été lu : il ne lance que git, gh, glab, gitleaks, ou la commande d'un
// contrôle, d'une installation ou d'une mesure que le test écrit lui-même dans sa configuration d'essai (morceaux de chaînes lus).
const SOUS_PROCESSUS_LUS = new Set(
  "close-branches engine engine-launch worktree acceptance-sheet run-checks-shards run-checks-pr check-diff-coverage wait-command"
    .split(" ")
    .map((n) => `${n}.mjs`),
);
// Module dont la lecture d'un dossier a été lue : `engine-selftest.mjs` liste les tests des hooks pour le contrôle `checks-self-test` du moteur, lancé par `run-checks` seul, jamais par un test.
const DOSSIERS_LUS = new Set(["engine-selftest.mjs"]);

const estFichier = (racine, rel) => existsSync(`${racine}/${rel}`) && statSync(`${racine}/${rel}`).isFile();
/** Fichier (chemin relatif à la racine) que vise un import relatif, ou null : `dist/` se lit dans `src/`, `.js` dans `.ts`. */
export function resoudre(spec, depuis, racine) {
  const base = posix.join(posix.dirname(depuis), spec);
  if (base.startsWith("..")) return null;
  const source = base.replace(/(^|\/)dist\//, "$1src/");
  const candidats = source !== base ? [source] : [base];
  const sansExt = (c) => c.replace(/\.(?:m?js|cjs)$/, "");
  for (const c of candidats) {
    const essais = [c, ...EXT.map((e) => c + e), ...EXT.map((e) => `${c}/index${e}`), `${sansExt(c)}.ts`, `${sansExt(c)}.mts`];
    const trouve = essais.find((e) => estFichier(racine, e));
    if (trouve) return trouve;
  }
  return null;
}

const lectures = new Map();
const lire = (racine, f) => {
  const k = `${racine}\0${f}`;
  if (!lectures.has(k)) lectures.set(k, lireSource(readFileSync(`${racine}/${f}`, "utf8")));
  return lectures.get(k);
};

const fermetures = new Map();
/** Fichiers atteints depuis `entrees` par imports et chemins cités : { fichiers: Set, douteux: [raison…] }. */
export function fermeture(entrees, racine) {
  const fichiers = new Set();
  const douteux = new Set();
  for (const e of entrees) {
    const k = `${racine}\0${e}`;
    if (!fermetures.has(k)) fermetures.set(k, fermetureUne(e, racine));
    for (const f of fermetures.get(k).fichiers) fichiers.add(f);
    for (const d of fermetures.get(k).douteux) douteux.add(d);
  }
  return { fichiers, douteux: [...douteux] };
}

function fermetureUne(entree, racine) {
  const fichiers = new Set();
  const douteux = [];
  const aVoir = [entree];
  const ajouter = (f) => !fichiers.has(f) && aVoir.push(f);
  while (aVoir.length) {
    const f = aVoir.pop();
    if (fichiers.has(f)) continue;
    if (!estFichier(racine, f)) {
      douteux.push(`${f} : fichier introuvable`);
      continue;
    }
    fichiers.add(f);
    if (!CODE.test(f)) continue;
    const lu = lire(racine, f);
    const lus = SOUS_PROCESSUS_LUS.has(posix.basename(f));
    for (const raison of lu.douteux) if (!(lus && raison.startsWith("sous-processus"))) douteux.push(`${f} : ${raison}`);
    for (const b of DOSSIERS_LUS.has(posix.basename(f)) ? [] : lu.balayages) {
      const cite = (b.inconnu ? lu.chaines : b.lus)
        .map((c) => c.replace(/^\.\//, "").replace(/\/$/, ""))
        .find((c) => parNom(racine).dossiers.has(c));
      if (cite) douteux.push(`${f} : ${b.nom}(…) lit le dossier ${cite}`);
    }
    for (const spec of lu.relatifs) {
      const cible = resoudre(spec, f, racine);
      // Fichier voisin d'un gabarit, installé ailleurs à l'usage : tous les fichiers de ce nom sont pris.
      const homonymes = cible ? [] : voisins(parNom(racine).fichiers.get(posix.basename(spec)) ?? [], f);
      for (const h of homonymes) ajouter(h);
      if (!cible && !homonymes.length) douteux.push(`${f} : import non résolu ${spec}`);
      else if (cible) {
        ajouter(cible);
        if (/(^|\/)dist\//.test(posix.join(posix.dirname(f), spec))) {
          const paquet = cible.split("/src/")[0];
          for (const m of [`${paquet}/package.json`, `${paquet}/tsconfig.json`, `${paquet}/tsconfig.build.json`])
            if (estFichier(racine, m)) fichiers.add(m);
        }
      }
    }
    for (const s of lu.chaines) {
      const t = s.replace(/^\.\//, "");
      if (estFichier(racine, t)) ajouter(t);
      else for (const c of /[.-]/.test(t) ? voisins(parNom(racine).fichiers.get(posix.basename(t)) ?? [], f) : []) ajouter(c);
    }
  }
  return { fichiers, douteux };
}

/** { paths, douteux } proposé pour un contrôle de tests, ou null s'il n'a ni motif large ni fichier de test dans sa commande. */
export function proposer(controle, racine) {
  const larges = controle.paths.filter((p) => LARGES.includes(p));
  const tests = controle.run.split(/\s+/).filter((t) => /\.test\.(?:mjs|js|ts)$/.test(t));
  if (!larges.length || !tests.length || /&&|\|\||[;|]/.test(controle.run)) return null; // une seule commande : un autre script lit ce qu'il veut
  const { fichiers, douteux } = fermeture(tests, racine);
  if (douteux.length) return { paths: controle.paths, douteux };
  const garde = (p) => !p.startsWith("!") && !LARGES.includes(p);
  const dejaVu = matchPaths(controle.paths.filter(garde));
  const sous = larges.map(globToRegex);
  const ajoutes = [...fichiers].filter((f) => sous.some((re) => re.test(f)) && !dejaVu(f)).sort();
  const place = controle.paths.findIndex((p) => LARGES.includes(p));
  const paths = [...controle.paths.slice(0, place).filter(garde), ...ajoutes, ...controle.paths.slice(place).filter(garde)];
  return { paths, douteux: [] };
}

/** Nombre de contrôles que le fichier touché invalide. */
export const invalides = (checks, fichier) => checks.filter((c) => c.paths && matchPaths(c.paths)(fichier)).length;

/** Réécrit seulement le tableau `paths` de chaque contrôle donné, dans le style où il était (une ligne ou une par chemin). */
export function reecrire(texte, controles) {
  for (const c of controles) {
    const debut = texte.indexOf('"paths": [', texte.indexOf(`"id": ${JSON.stringify(c.id)}`));
    const fin = texte.indexOf("]", debut);
    const multi = texte.slice(debut, fin).includes("\n");
    const marge = `\n${" ".repeat(texte.slice(texte.lastIndexOf("\n", debut) + 1, debut).length)}`;
    const liste = c.paths.map((p) => JSON.stringify(p));
    texte = `${texte.slice(0, debut)}"paths": [${multi ? `${marge}  ${liste.join(`,${marge}  `)}${marge}` : liste.join(", ")}${texte.slice(fin)}`;
  }
  return texte;
}

export function principal(argv, sortie = console.log) {
  const mesure = argv.includes("--mesure") ? argv[argv.indexOf("--mesure") + 1].split(",") : [];
  const racine = argv.find((a, i) => !a.startsWith("--") && argv[i - 1] !== "--mesure") ?? ".";
  const chemin = `${racine}/.drwil/ia-first.json`;
  const config = JSON.parse(readFileSync(chemin, "utf8"));
  const avant = config.checks.map((c) => ({ ...c }));
  let resserres = 0;
  for (const c of config.checks) {
    const p = proposer(c, racine);
    if (!p) continue;
    if (p.douteux.length) sortie(`${c.id} : motif large gardé (${p.douteux[0]})`);
    else {
      resserres++;
      sortie(`${c.id} : ${c.paths.length} → ${p.paths.length} chemins`);
      c.paths = p.paths;
    }
  }
  sortie(`${resserres} contrôle(s) resserré(s) sur ${config.checks.length}`);
  for (const f of mesure) sortie(`${f} : ${invalides(avant, f)} → ${invalides(config.checks, f)} contrôles invalidés`);
  const changes = config.checks.filter((c, i) => c.paths !== avant[i].paths);
  if (argv.includes("--appliquer")) writeFileSync(chemin, reecrire(readFileSync(chemin, "utf8"), changes));
}

if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) principal(process.argv.slice(2));
