#!/usr/bin/env node
// Cohérence entre les tests et les contrats qu'ils protègent (docs/projets/non-regression-continue.md).
// Propre à ce dépôt pour l'instant ; la mécanique livrée (lecteur de contrats, drwil verify) ne change
// qu'au moment de livrer. Deux sources qui se recoupent, vérifiées dans les deux sens :
// - le nom d'un test commence par l'ID du contrat qu'il protège (« QUA-016 : … ») ;
// - le champ « Tests » du contrat liste les fichiers de tests qui le protègent (des fichiers, pas des
//   noms : un test renommé ne casse pas le lien) ;
// - un contrat qui a des tests cite son propre contrôle, `tests-<id>`, qui ne rejoue qu'eux (QUA-033) :
//   un test cassé fait échouer ce seul contrat, jamais un contrôle partagé (QUA-030).
// Seuls les ID au préfixe d'un contrat du projet (.drwil/ia-first.json → contractPrefixes) comptent :
// un autre préfixe (ex. une exigence d'une fiche) n'est pas un contrat.
// Usage : node outils/verifier-tests-contrats.mjs [racine]
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

/** Contrats du registre (forme sections) : Map ID → { tests, controles } (champs « Tests » et « Contrôle », ou []). */
export function lireRegistre(texte) {
  const contrats = new Map();
  let courant = null;
  for (const ligne of texte.split(/\r?\n/)) {
    const titre = /^##\s+([A-Z][A-Z0-9]*-\d+)\b/.exec(ligne);
    if (titre) {
      courant = { tests: [], controles: [] };
      contrats.set(titre[1], courant);
      continue;
    }
    if (/^##\s/.test(ligne)) courant = null;
    const champ = /^\*\*(Tests|Contrôle)\*\*\s*:\s*(.*)$/.exec(ligne);
    if (courant && champ) courant[champ[1] === "Tests" ? "tests" : "controles"] = [...champ[2].matchAll(/`([^`]+)`/g)].map((m) => m[1]);
  }
  return contrats;
}

/**
 * Tests d'un fichier : [{ nom, id }], `id` étant l'ID en tête du nom (ou null). Seul un appel `test(`
 * en début de ligne compte : un exemple de test cité dans une chaîne n'en est pas un.
 */
export function testsDuFichier(texte) {
  return [...texte.matchAll(/^\s*test\(\s*(["'`])((?:(?!\1).)*)\1/gm)].map((m) => ({
    nom: m[2],
    id: /^([A-Z][A-Z0-9]*-\d+)\b/.exec(m[2])?.[1] ?? null,
  }));
}

/**
 * Problèmes de cohérence. `fichiers` : Map chemin → texte des fichiers de tests suivis ; `existe` :
 * le chemin existe-t-il dans le dépôt ; `prefixes` : préfixes des contrats du projet.
 */
export function verifier({ registre, fichiers, prefixes, existe }) {
  const problemes = [];
  const estContrat = (id) => prefixes.some((p) => id.startsWith(`${p}-`));
  for (const [id, { tests, controles }] of registre) {
    const propre = `tests-${id.toLowerCase()}`;
    if (tests.length && !controles.includes(propre))
      problemes.push(`${id} : a des tests mais ne cite pas son propre contrôle ${propre} (un contrôle par règle)`);
    for (const chemin of tests) {
      if (!existe(chemin)) {
        problemes.push(`${id} : le champ Tests cite ${chemin}, introuvable`);
        continue;
      }
      if (!testsDuFichier(fichiers.get(chemin) ?? "").some((t) => t.id === id))
        problemes.push(`${id} : ${chemin} ne contient aucun test dont le nom commence par ${id}`);
    }
  }
  for (const [chemin, texte] of fichiers) {
    for (const { nom, id } of testsDuFichier(texte)) {
      if (!id || !estContrat(id)) continue;
      if (!registre.has(id)) problemes.push(`${chemin} : « ${nom} » cite ${id}, absent du registre des contrats`);
      else if (!registre.get(id).tests.includes(chemin))
        problemes.push(`${chemin} : « ${nom} » protège ${id}, mais ${id} ne cite pas ce fichier dans son champ Tests`);
    }
  }
  return [...new Set(problemes)];
}

const EST_FICHIER_DE_TESTS = /(\.test\.mjs$|^packages\/drwil\/test\/.+\.mjs$)/;

/** Lit la configuration, le registre et les tests suivis, vérifie, affiche ; rend le code de sortie. */
export function principal(racine) {
  let cfg = {};
  try {
    cfg = JSON.parse(readFileSync(join(racine, ".drwil", "ia-first.json"), "utf8"));
  } catch {}
  const prefixes = cfg.contractPrefixes ?? ["SEC", "QUA"];
  const cheminRegistre = cfg.dirs?.contracts ?? "docs/contrats.md";
  if (!existsSync(join(racine, cheminRegistre))) {
    console.error(`tests et contrats : registre ${cheminRegistre} introuvable — contrôle non exécuté`);
    return 1;
  }
  const git = spawnSync("git", ["ls-files", "-z"], { cwd: racine, encoding: "utf8" });
  // Sans la liste des fichiers suivis, aucun test ne serait lu : jamais vert sans avoir regardé (QUA-013).
  if (git.status !== 0) {
    console.error("tests et contrats : fichiers suivis illisibles (git ls-files) — contrôle non exécuté");
    return 1;
  }
  const fichiers = new Map(
    git.stdout
      .split("\0")
      .filter((f) => EST_FICHIER_DE_TESTS.test(f))
      .map((f) => [f, readFileSync(join(racine, f), "utf8")]),
  );
  const registre = lireRegistre(readFileSync(join(racine, cheminRegistre), "utf8"));
  const problemes = verifier({ registre, fichiers, prefixes, existe: (c) => existsSync(join(racine, c)) });
  for (const p of problemes) console.error(`  ✗ ${p}`);
  const rattaches = [...fichiers.values()]
    .flatMap(testsDuFichier)
    .filter((t) => t.id && prefixes.some((p) => t.id.startsWith(`${p}-`))).length;
  console.log(`tests et contrats : ${rattaches} test(s) rattaché(s) à un contrat, ${problemes.length} problème(s)`);
  return problemes.length ? 1 : 0;
}

// Chemins réels comparés : un dossier en lien symbolique ne doit pas faire passer le contrôle à vide.
if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = principal(process.argv[2] ?? process.cwd());
}
