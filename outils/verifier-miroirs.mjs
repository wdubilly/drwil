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
// Les briques (homologues, comparaison, jobs, fuites) sont dans verifier-miroirs-lib.mjs (QUA-001).
// Usage : node outils/verifier-miroirs.mjs [racine]
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  correspond,
  couvrePar,
  fuitesInternes,
  homologues,
  jobs,
  raisonVide,
  unitesInstallees,
  verifierCi,
} from "./verifier-miroirs-lib.mjs";

export { correspond, fuitesInternes, homologues, jobs, unitesInstallees };

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
