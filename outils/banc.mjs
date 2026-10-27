#!/usr/bin/env node
// Mini-banc « même consigne, avec et sans drwil » (QUA-101 à QUA-108). Propre à ce dépôt (QUA-018) : il
// mesure le livrable, il n'en fait pas partie. Un passage = une tâche de bench/taches/, une condition
// (avec ou sans drwil, installé depuis son tarball), sur une copie jetable de bench/reference/ avec un
// dépôt distant local ; l'agent tourne en mode non interactif (`claude -p`, flux JSON), puis un juge
// indépendant de drwil copie les tests cachés, relit le diff et écrit un résultat JSON, déroulé à côté.
// La campagne tourne en CI, à la demande (.github/workflows/banc.yml).
// L'exécution (lancement, installation, copie jetable) est dans banc-run.mjs, réexportée ici (QUA-001).
// Usage :
//   node outils/banc.mjs plan [--repetitions 3] [--essai]
//   node outils/banc.mjs passage --tache bug --condition avec --repetition 1 --modele <id> [--effort high]
//        [--max-tours 40] [--delai 1800] [--sortie resultats] [--essai] [--isoler] [--garder]
//   node outils/banc.mjs rapport <dossier des résultats> [--protocole docs/benchmark-protocole.md]
import { existsSync, readdirSync, readFileSync, realpathSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  CONDITIONS,
  ecrireResultat,
  gouvernance,
  instantane,
  juger,
  lancerTests,
  lireFlux,
  mesures,
  messageErreur,
  rapport,
  testsVisibles,
} from "./banc-juge.mjs";
import { REFERENCE, RACINE, adopter, argsAgent, envAgent, installerDrwil, lancer, lancerAgent, preparer } from "./banc-run.mjs";

export { CONDITIONS, REFERENCE, adopter, argsAgent, envAgent, installerDrwil, lancer, lancerAgent, preparer };

export const TACHES = join(RACINE, "bench", "taches");

/** Une tâche lue de son fichier Markdown : consigne mot pour mot, fichiers de la tâche, tests cachés. */
export function lireTache(texte, nom) {
  const sections = Object.fromEntries(
    texte
      .split(/^## /m)
      .slice(1)
      .map((s) => [s.slice(0, s.indexOf("\n")).trim(), s.slice(s.indexOf("\n") + 1)]),
  );
  const consigne = sections.Consigne?.trim();
  const fichiers = [...(sections["Fichiers de la tâche"] ?? "").matchAll(/`([^`]+)`/g)].map((m) => m[1]);
  const cache = sections["Tests cachés"] ?? "";
  const chemin = /`([^`]+\.test\.js)`/.exec(cache)?.[1];
  const code = /```js\n([\s\S]*?)```/.exec(cache)?.[1];
  if (!consigne || !fichiers.length || !chemin || !code)
    throw new Error(`tâche ${nom} incomplète : consigne, fichiers et tests cachés attendus`);
  return { nom, consigne, fichiers, cache: { chemin, code } };
}

export const nomsTaches = (dossier = TACHES) =>
  readdirSync(dossier)
    .filter((f) => f.endsWith(".md"))
    .map((f) => f.slice(0, -3))
    .sort();
export const chargerTache = (nom, dossier = TACHES) => lireTache(readFileSync(join(dossier, `${nom}.md`), "utf8"), nom);

/** Matrice des passages : l'ordre avec/sans est tiré au sort par tâche ; l'essai est un passage seul, hors mesure. */
export function plan({ taches, repetitions = 3, aleatoire = Math.random, essai = false }) {
  if (essai) return { include: [{ tache: taches[0], condition: "avec", repetition: 0, ordre: 1, essai: true }] };
  const include = [];
  for (const tache of taches) {
    const ordre = aleatoire() < 0.5 ? CONDITIONS : [...CONDITIONS].reverse();
    for (let repetition = 1; repetition <= repetitions; repetition++)
      for (const [i, condition] of ordre.entries()) include.push({ tache, condition, repetition, ordre: i + 1, essai: false });
  }
  return { include };
}

/**
 * Un passage complet. Ce qui n'a pas pu tourner (agent absent, préparation impossible, délai dépassé, pas de
 * résultat, erreur de l'agent hors plafond de tours) est « non mesuré », jamais réussi ni raté (QUA-013).
 */
export async function passage(o) {
  const { tache, condition, repetition = 1, essai = false, modele, effort = null, maxTours = 40, delai = 1800000 } = o;
  const { executer = lancer, agent = lancerAgent, installer = installerDrwil, horloge = () => new Date(), env = process.env } = o;
  const entete = { version: 1, tache: tache.nom, condition, repetition, essai, date: horloge().toISOString(), modele, effort, maxTours };
  const nonMesure = (raison, extra = {}) => ({ ...entete, ...extra, statut: "non mesuré", raison, verdict: null });
  if (!CONDITIONS.includes(condition)) return nonMesure(`condition inconnue : ${condition}`);
  if (!modele) return nonMesure("modèle non précisé");
  const version = executer("claude", ["--version"], { cwd: tmpdir(), timeout: 30000 });
  if (version.absent || version.code !== 0) return nonMesure("claude absent du poste");
  const versionAgent = version.sortie.trim();
  let dossier;
  try {
    dossier = preparer({ condition, base: o.base, executer, installer });
  } catch (e) {
    return nonMesure(`préparation impossible : ${e.message}`, { versionAgent });
  }
  try {
    const avant = instantane(dossier);
    const echecsAvant = lancerTests(dossier, testsVisibles(avant, tache.cache.chemin), executer).echecs;
    const args = argsAgent({ consigne: tache.consigne, modele, effort, maxTours });
    const r = await agent("claude", args, { cwd: dossier, env: envAgent(env), timeout: delai });
    if (r.absent) return nonMesure("claude absent du poste", { versionAgent });
    // Le déroulé, même partiel (délai, erreur), est ce qui dit où l'agent a été bloqué (QUA-107).
    const deroule = r.lignes.map((l) => l.texte);
    if (r.delai) return nonMesure(`délai de ${delai / 1000} s dépassé`, { versionAgent, deroule });
    const { resultat, appels } = lireFlux(r.lignes);
    if (!resultat) return nonMesure(`aucun résultat de l'agent (code ${r.code})`, { versionAgent, deroule });
    if (resultat.is_error && resultat.subtype !== "error_max_turns")
      return nonMesure(`erreur de l'agent : ${messageErreur(resultat)}`, { versionAgent, ...mesures(resultat), deroule });
    const commandes = appels.filter((a) => a.nom === "Bash").map((a) => String(a.entree.command ?? ""));
    const { reussi, juge } = juger({ dossier, tache, avant, echecsAvant, commandes, executer });
    return {
      ...entete,
      versionAgent,
      statut: "mesuré",
      verdict: reussi ? "réussi" : "raté",
      plafondAtteint: resultat.subtype === "error_max_turns",
      ...mesures(resultat),
      juge,
      gouvernance: gouvernance(appels, { fichiers: tache.fichiers, dossier, reussi }),
      deroule,
    };
  } finally {
    if (!o.garder) rmSync(dirname(dossier), { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
}

const valeur = (argv, opt, defaut) => (argv.includes(opt) ? argv[argv.indexOf(opt) + 1] : defaut);

/** Retire du dépôt de la machine de CI ce qui révélerait les tests cachés (tâches, historique git) ; jamais hors CI. */
export function isoler(env = process.env, racine = RACINE) {
  if (env.GITHUB_ACTIONS !== "true") throw new Error("--isoler ne s'emploie que sur une machine de CI jetable");
  for (const d of [join(racine, "bench", "taches"), join(racine, ".git")]) rmSync(d, { recursive: true, force: true });
}

export async function principal(argv, options = {}) {
  const [commande] = argv;
  if (commande === "plan") {
    const p = plan({
      taches: nomsTaches(options.taches),
      repetitions: Number(valeur(argv, "--repetitions", 3)),
      essai: argv.includes("--essai"),
    });
    console.log(JSON.stringify(p));
    return 0;
  }
  if (commande === "passage") {
    const tache = chargerTache(valeur(argv, "--tache"), options.taches);
    if (argv.includes("--isoler")) isoler(options.env, options.racine);
    const resultat = await passage({
      ...options,
      tache,
      condition: valeur(argv, "--condition"),
      repetition: Number(valeur(argv, "--repetition", 1)),
      essai: argv.includes("--essai"),
      modele: valeur(argv, "--modele"),
      effort: valeur(argv, "--effort", null),
      maxTours: Number(valeur(argv, "--max-tours", 40)),
      delai: Number(valeur(argv, "--delai", 1800)) * 1000,
      garder: argv.includes("--garder"),
    });
    const fichier = ecrireResultat(resultat, valeur(argv, "--sortie", "resultats-banc"), options.env);
    console.log(
      `${resultat.tache} ${resultat.condition} ${resultat.repetition} : ${resultat.statut}${resultat.verdict ? `, ${resultat.verdict}` : ` (${resultat.raison})`} → ${fichier}`,
    );
    return 0;
  }
  if (commande === "rapport") {
    const dossier = argv[1];
    const fichiers = readdirSync(dossier, { recursive: true }).filter((f) => String(f).endsWith(".json"));
    const resultats = fichiers.map((f) => JSON.parse(readFileSync(join(dossier, String(f)), "utf8")));
    const protocole = readFileSync(valeur(argv, "--protocole", join(RACINE, "docs", "benchmark-protocole.md")), "utf8");
    console.log(rapport(resultats, { protocole }));
    return 0;
  }
  console.error("usage : node outils/banc.mjs plan|passage|rapport (voir l'en-tête du script)");
  return 2;
}

if (process.argv[1] && existsSync(process.argv[1]) && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url)))
  principal(process.argv.slice(2)).then((code) => process.exit(code));
