#!/usr/bin/env node
// Mini-banc « même consigne, avec et sans drwil » (QUA-101 à QUA-108). Propre à ce dépôt (QUA-018) : il
// mesure le livrable, il n'en fait pas partie. Un passage = une tâche de bench/taches/, une condition
// (avec ou sans drwil, installé depuis son tarball), sur une copie jetable de bench/reference/ avec un
// dépôt distant local ; l'agent tourne en mode non interactif (`claude -p`, flux JSON), puis un juge
// indépendant de drwil copie les tests cachés, relit le diff et écrit un résultat JSON, déroulé à côté.
// La campagne tourne en CI, à la demande (.github/workflows/banc.yml).
// Usage :
//   node outils/banc.mjs plan [--repetitions 3] [--essai]
//   node outils/banc.mjs passage --tache bug --condition avec --repetition 1 --modele <id> [--effort high]
//        [--max-tours 40] [--delai 1800] [--sortie resultats] [--essai] [--isoler] [--garder]
//   node outils/banc.mjs rapport <dossier des résultats> [--protocole docs/benchmark-protocole.md]
import { spawn, spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, readdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, sep } from "node:path";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
import {
  CONDITIONS,
  ecrireResultat,
  instantane,
  juger,
  lancerTests,
  lireFlux,
  mesures,
  messageErreur,
  rapport,
  testsVisibles,
  gouvernance,
} from "./banc-juge.mjs";

export { CONDITIONS };

const RACINE = join(dirname(fileURLToPath(import.meta.url)), "..");
export const REFERENCE = join(RACINE, "bench", "reference");
export const TACHES = join(RACINE, "bench", "taches");
const PAQUET = join(RACINE, "packages", "drwil");
const ENV_AGENT = ["PATH", "HOME", "USER", "LANG", "LC_ALL", "TMPDIR", "TERM", "SHELL", "CLAUDE_CODE_OAUTH_TOKEN"];

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
 * Commande lancée sans variable GIT_* héritée (QUA-057) : elle ferait agir git sur le dépôt qui lance le banc ;
 * ni NODE_TEST_CONTEXT, qui ferait parler les tests jugés au lanceur de tests du banc au lieu de rendre leur TAP.
 */
export function lancer(commande, args, { cwd, timeout = 120000, env } = {}) {
  const base = env ?? Object.fromEntries(Object.entries(process.env).filter(([n]) => !n.startsWith("GIT_") && n !== "NODE_TEST_CONTEXT"));
  const r = spawnSync(commande, args, { cwd, env: base, encoding: "utf8", timeout, maxBuffer: 64 * 1024 * 1024 });
  return {
    code: r.status,
    sortie: `${r.stdout ?? ""}${r.stderr ?? ""}`,
    absent: r.error?.code === "ENOENT",
    delai: r.error?.code === "ETIMEDOUT",
  };
}

/**
 * Installation de drwil dans la copie comme chez un utilisateur (QUA-108) : le tarball de la version construite
 * dans ce dépôt (`npm pack`), à côté de la copie, en dépendance de développement, puis `init` par ce paquet ;
 * `npx drwil` s'y résout sur place, jamais sur le registre npm (drwil n'y est pas publié). CI GitHub déclarée,
 * comme un projet gouverné (sans elle, `verify` ne peut juger la couverture CI des contrôles, QUA-013, et le
 * signale avant tout travail de l'agent) ; son workflow ne tourne jamais dans le bac à sable. Gestes humains
 * délégués (transitions : agent).
 */
export function installerDrwil(dossier, executer = lancer, paquet = PAQUET) {
  const racine = dirname(dossier);
  const etape = (nom, r) => {
    if (r.code !== 0) throw new Error(`${nom} : ${r.sortie.trim().split("\n").slice(-2).join(" | ")}`);
  };
  etape("npm pack", executer("npm", ["pack", "--pack-destination", racine], { cwd: paquet, timeout: 300000 }));
  const tarball = readdirSync(racine).find((f) => /^drwil-.+\.tgz$/.test(f));
  if (!tarball) throw new Error("npm pack : aucun tarball drwil-*.tgz produit");
  const npm = ["install", "--save-dev", "--prefer-offline", "--no-audit", "--no-fund", `../${tarball}`];
  etape("npm install", executer("npm", npm, { cwd: dossier, timeout: 300000 }));
  const args = ["init", "--name", "boutique", "--lang", "fr", "--tools", "claude", "--ci", "github", "--layers", "", "--no-git"];
  etape("npx drwil init", executer("npx", ["--offline", "drwil", ...args], { cwd: dossier }));
  adopter(dossier);
}

/**
 * Adoption fixe, identique à chaque passage, après `init` (QUA-108), comme un utilisateur avant sa première tâche
 * (docs/recipes/adopt-the-kit.md, étapes 1 à 3) : `init` a déjà rattaché le code indexé à la fiche « code
 * existant » et cité ses dossiers dans la carte ; restent les rôles réels de la carte et les contrôles de la pile
 * (`npm test`). Aucune couche, aucune garantie obligatoire (forge protégée impossible dans le bac à sable). Un
 * texte attendu absent fait échouer la préparation : jamais une copie à moitié adoptée en silence.
 */
export function adopter(dossier) {
  const remplacer = (relatif, motif, texte) => {
    const fichier = join(dossier, relatif);
    const avant = readFileSync(fichier, "utf8");
    if (!motif.test(avant)) throw new Error(`adoption : ${relatif} sans ${motif}`);
    writeFileSync(fichier, avant.replace(motif, texte));
  };
  const description = JSON.parse(readFileSync(join(dossier, "package.json"), "utf8")).description;
  remplacer("docs/architecture.md", /^\((to describe|à décrire)[^)\n]*\)$/m, description);
  remplacer(
    "docs/architecture.md",
    /^(Dossiers de code indexés avant l'installation du kit[^;\n]*); le rôle[^\n]*$/m,
    "$1 : rôles décrits à l'adoption.",
  );
  const role = "- `src/` — code de la boutique : panier et remises (`src/panier.js`), affichage des prix (`src/format.js`)";
  remplacer("docs/architecture.md", /^- `src\/` — .*$/m, role);
  const fichier = join(dossier, ".drwil", "ia-first.json");
  const config = JSON.parse(readFileSync(fichier, "utf8"));
  const checks = [...(config.checks ?? []), { name: "tests du projet", run: "npm test" }];
  writeFileSync(fichier, JSON.stringify({ ...config, checks, transitions: "agent" }, null, 2) + "\n");
}

/**
 * Copie jetable du projet de référence, jamais dans le dépôt : dans un dossier temporaire qui porte aussi son dépôt
 * distant local (`distant.git`, où pousser une branche, dans les deux conditions) et, pour la condition « avec »,
 * le tarball de drwil installé. Le dépôt distant reçoit la branche principale telle que préparée, avant
 * l'activation des hooks : mêmes conditions de départ avec et sans drwil, seule l'installation diffère.
 */
export function preparer({ condition, base = tmpdir(), executer = lancer, installer = installerDrwil }) {
  const racine = realpathSync(mkdtempSync(join(base, "banc-")));
  if (racine === RACINE || racine.startsWith(RACINE + sep)) {
    rmSync(racine, { recursive: true, force: true });
    throw new Error(`le banc ne lance jamais un agent dans le dépôt : ${racine}`);
  }
  const dossier = join(racine, "projet");
  try {
    cpSync(REFERENCE, dossier, { recursive: true });
    const git = (...a) => {
      const r = executer("git", a, { cwd: dossier });
      if (r.code !== 0) throw new Error(`git ${a[0]} : ${r.sortie.trim()}`);
    };
    git("init", "-q", "-b", "master");
    git("config", "user.name", "banc");
    git("config", "user.email", "banc@exemple.invalid");
    git("add", "-A");
    git("commit", "-qm", "Projet de référence");
    git("init", "-q", "--bare", "-b", "master", join(racine, "distant.git"));
    git("remote", "add", "origin", join(racine, "distant.git"));
    if (condition === "avec") {
      installer(dossier, executer);
      git("add", "-A");
      git("commit", "-qm", "drwil installé et adopté");
    }
    git("push", "-q", "-u", "origin", "master");
    if (condition === "avec") git("config", "core.hooksPath", ".githooks");
    return dossier;
  } catch (e) {
    rmSync(racine, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    throw e;
  }
}

/** Arguments de `claude -p` : même modèle, même effort, plafond de tours ; flux JSON pour les tokens et les appels d'outils. */
export function argsAgent({ consigne, modele, effort, maxTours }) {
  const args = ["-p", consigne, "--output-format", "stream-json", "--verbose", "--max-turns", String(maxTours)];
  args.push("--permission-mode", "bypassPermissions", "--model", modele);
  return effort ? [...args, "--effort", effort] : args;
}

/** Environnement de l'agent : le strict nécessaire ; seul secret, le jeton de l'abonnement Claude (CLAUDE_CODE_OAUTH_TOKEN). */
export const envAgent = (env) => Object.fromEntries(ENV_AGENT.filter((n) => env[n] !== undefined).map((n) => [n, env[n]]));

/** Lancement réel de l'agent : chaque ligne du flux est horodatée à son arrivée (temps passé par appel d'outil). */
export function lancerAgent(commande, args, { cwd, env, timeout, horloge = Date.now }) {
  return new Promise((resolve) => {
    const lignes = [];
    let delai = false;
    const p = spawn(commande, args, { cwd, env, stdio: ["ignore", "pipe", "pipe"] });
    const minuterie = setTimeout(() => {
      delai = true;
      p.kill("SIGKILL");
    }, timeout);
    createInterface({ input: p.stdout }).on("line", (texte) => lignes.push({ t: horloge(), texte }));
    p.stderr.resume();
    p.on("error", (e) => {
      clearTimeout(minuterie);
      resolve({ code: null, lignes, absent: e.code === "ENOENT", delai });
    });
    p.on("close", (code) => {
      clearTimeout(minuterie);
      resolve({ code, lignes, absent: false, delai });
    });
  });
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
