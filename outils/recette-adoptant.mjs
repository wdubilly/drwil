#!/usr/bin/env node
// Recette réelle d'un chantier (QUA-331), propre au dépôt : le tarball de la branche (`npm pack`) installé, en mise à
// jour (`drwil init`), sur des copies d'adoptants réels (par défaut marinade-poulet et drwil_walk). Chaque copie est un
// clone de la branche principale (jamais la copie de travail de l'adoptant) dans un dossier temporaire, sans remote :
// rien n'est poussé, ni sur la forge de l'adoptant ni dans son dépôt d'origine, que l'outil ne fait que lire.
// Registre injoignable ou adoptant absent : « non exécuté », jamais vert (QUA-013).
// Usage : node outils/recette-adoptant.mjs [--garder] [chemin-adoptant…]   (--garder : copies laissées pour inspection)
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const BRANCHE_MAJ = "workstream/kit-update";
const TRAILER = "Drwil-Kit-Update";
const RESEAU = /E(NOTFOUND|AI_AGAIN|CONNREFUSED|CONNRESET|TIMEDOUT|NETUNREACH)|network|fetch failed/i;
const PREMIERE_PASSE = /Première passe complète|First full pass/;

export const adoptantsParDefaut = (home = homedir()) => ["marinade-poulet", "drwil_walk"].map((n) => join(home, "projects", n));

export function lireArguments(argv, home) {
  const chemins = argv.filter((a) => a !== "--garder").map((a) => resolve(a));
  return { garder: argv.includes("--garder"), adoptants: chemins.length ? chemins : adoptantsParDefaut(home) };
}

const lancerReel = (cmd, args, opts) =>
  // Sous Windows, npm et la CLI installée sont des scripts .cmd : ils ne se lancent que par le shell. Pas de limite
  // de temps courte : le commit de la mise à jour lance les hooks de l'adoptant.
  spawnSync(cmd, args, { encoding: "utf8", shell: process.platform === "win32", timeout: 3_600_000, ...opts });
const sortie = (r) => `${r.stdout ?? ""}${r.stderr ?? ""}${r.error ? r.error.message : ""}`.trim();
const debut = (r) => sortie(r).split("\n").slice(0, 4).join("\n");

/** Construit le tarball et l'installe à part ; rend { bin, tarball } ou { statut, message }. */
export function construire(paquet, temp, lancer) {
  const [archives, installe] = ["archives", "installe"].map((d) => join(temp, d));
  for (const d of [archives, installe]) mkdirSync(d, { recursive: true });
  const pack = lancer("npm", ["pack", "--json", "--pack-destination", archives], { cwd: paquet });
  if (pack.error) return { statut: "non-execute", message: `npm introuvable (${pack.error.message})` };
  if (pack.status !== 0) return { statut: "echec", message: `npm pack a échoué : ${debut(pack)}` };
  let info;
  try {
    // Le script prepack (build) écrit aussi sur la sortie standard : le JSON commence au premier « [ ».
    info = JSON.parse(pack.stdout.slice(pack.stdout.indexOf("[")))[0];
  } catch {
    return { statut: "echec", message: "npm pack : sortie JSON illisible" };
  }
  writeFileSync(join(installe, "package.json"), '{ "private": true }\n');
  const tarball = join(archives, info.filename);
  const install = lancer("npm", ["install", "--no-audit", "--no-fund", tarball], { cwd: installe });
  if (install.status !== 0)
    return { statut: RESEAU.test(sortie(install)) ? "non-execute" : "echec", message: `installation du tarball : ${debut(install)}` };
  const bin = join(installe, "node_modules", ".bin", process.platform === "win32" ? "drwil.cmd" : "drwil");
  if (!existsSync(bin)) return { statut: "echec", message: "la commande drwil n'est pas installée" };
  return { bin, tarball: info.filename };
}

/** Clone l'adoptant sur sa branche principale, sans remote ni autre branche, hooks activés ; rend un problème ou null. */
export function copier(source, copie, lancer) {
  const git = (args, cwd = copie) => lancer("git", args, { cwd });
  const clone = git(["clone", "--quiet", "--no-hardlinks", source, copie], dirname(copie));
  if (clone.status !== 0) return `clone impossible : ${debut(clone)}`;
  const principale = ["master", "main"].find((b) => git(["rev-parse", "--verify", "--quiet", `refs/remotes/origin/${b}`]).status === 0);
  if (!principale) return "branche principale introuvable (master, main)";
  const hooks = git(["-C", source, "config", "--get", "core.hooksPath"], dirname(copie)).stdout?.trim() || ".githooks";
  const etapes = [
    ["checkout", "--quiet", "-B", principale, `origin/${principale}`],
    // Sans remote, aucun push ne peut atteindre le dépôt d'origine ni sa forge.
    ["remote", "remove", "origin"],
    ["config", "core.hooksPath", hooks],
  ];
  for (const args of etapes) {
    const r = git(args);
    if (r.status !== 0) return `git ${args.join(" ")} : ${debut(r)}`;
  }
  const autres = (git(["for-each-ref", "--format=%(refname:short)", "refs/heads"]).stdout ?? "")
    .split("\n")
    .filter((b) => b && b !== principale);
  if (autres.length && git(["branch", "--quiet", "-D", ...autres]).status !== 0) return "branches de la copie non retirées";
  return null;
}

/** Juge la mise à jour faite : `{ problemes, premierePasse }`. */
export function jugerMiseAJour({ init, branche, message, statut, config }) {
  const problemes = [];
  if (init.status !== 0) problemes.push(`drwil init : code ${init.status} — ${debut(init)}`);
  if (branche !== BRANCHE_MAJ) problemes.push(`aucun commit de mise à jour sur ${BRANCHE_MAJ} (branche courante : ${branche || "?"})`);
  else if (!message.includes(`${TRAILER}:`)) problemes.push(`le dernier commit ne porte pas le trailer ${TRAILER}`);
  if (statut.trim()) problemes.push(`arbre de travail non propre après la mise à jour :\n${statut.trim()}`);
  if (config && Object.hasOwn(config, "format")) problemes.push("la mise à jour a ajouté la clé `format`");
  return { problemes, premierePasse: PREMIERE_PASSE.test(sortie(init)) };
}

function recetter(source, copie, bin, lancer) {
  const nom = basename(source);
  const probleme = copier(source, copie, lancer);
  if (probleme) return { nom, statut: "echec", message: probleme };
  if (existsSync(join(copie, "package-lock.json"))) {
    const ci = lancer("npm", ["ci", "--no-audit", "--no-fund"], { cwd: copie });
    if (ci.status !== 0) return { nom, statut: RESEAU.test(sortie(ci)) ? "non-execute" : "echec", message: `npm ci : ${debut(ci)}` };
  }
  const debutInit = Date.now();
  const init = lancer(bin, ["init"], { cwd: copie });
  const duree = Math.round((Date.now() - debutInit) / 100) / 10;
  const git = (args) => (lancer("git", args, { cwd: copie }).stdout ?? "").trim();
  let config = null;
  try {
    config = JSON.parse(readFileSync(join(copie, ".drwil", "ia-first.json"), "utf8"));
  } catch {}
  const j = jugerMiseAJour({
    init,
    branche: git(["symbolic-ref", "--quiet", "--short", "HEAD"]),
    message: git(["log", "-1", "--format=%B"]),
    statut: git(["status", "--porcelain"]),
    config,
  });
  const annonce = j.premierePasse ? "première passe complète annoncée" : "première passe complète non annoncée";
  if (j.problemes.length) return { nom, statut: "echec", message: j.problemes.join("\n    "), duree };
  return {
    nom,
    statut: "ok",
    message: `mise à jour commitée sur ${BRANCHE_MAJ} en ${duree} s, arbre propre, sans clé format, ${annonce}`,
    duree,
  };
}

/** Déroule la recette dans `temp` ; rend { statut, message?, adoptants: [{ nom, statut, message }] }. */
export function derouler({ paquet, adoptants, temp, lancer = lancerReel, existe = existsSync }) {
  const construit = construire(paquet, temp, lancer);
  if (!construit.bin) return { ...construit, adoptants: [] };
  const resultats = adoptants.map((source, i) => {
    if (!existe(source)) return { nom: basename(source), statut: "non-execute", message: `adoptant introuvable : ${source}` };
    const copie = join(temp, "copies", `${i}-${basename(source)}`);
    mkdirSync(dirname(copie), { recursive: true });
    return recetter(source, copie, construit.bin, lancer);
  });
  const pire = ["echec", "non-execute"].find((s) => resultats.some((r) => r.statut === s)) ?? "ok";
  return { statut: pire, message: `tarball ${construit.tarball}`, adoptants: resultats };
}

export function principal(racine, argv = [], { lancer = lancerReel, home } = {}) {
  const { garder, adoptants } = lireArguments(argv, home);
  const temp = mkdtempSync(join(tmpdir(), "drwil-recette-"));
  let r;
  try {
    r = derouler({ paquet: join(racine, "packages", "drwil"), adoptants, temp, lancer });
  } finally {
    if (!garder) rmSync(temp, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
  const marque = { ok: "✓", echec: "✗", "non-execute": "○" };
  console.log(`${marque[r.statut]} recette réelle — ${r.message}`);
  for (const a of r.adoptants) console.log(`  ${marque[a.statut]} ${a.nom} : ${a.message}`);
  if (garder) console.log(`  copies gardées dans ${temp}`);
  return r.statut === "ok" ? 0 : 1;
}

if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = principal(resolve(fileURLToPath(import.meta.url), "..", ".."), process.argv.slice(2));
}
