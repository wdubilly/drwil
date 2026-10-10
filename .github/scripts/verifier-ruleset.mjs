#!/usr/bin/env node
// Vérifie que le ruleset de la branche principale, sur GitHub, est celui versionné dans
// .github/ruleset-master.json : la protection vit dans les réglages de la forge, hors du dépôt ;
// sans cette comparaison, elle pourrait changer sans trace ni PR.
// - sans argument : compare, code 1 si différent (ou ruleset introuvable) ;
// - --ecrire : réécrit le fichier depuis GitHub, après un changement voulu, à faire relire en PR.
// Lit l'API avec `gh` (GH_TOKEN en CI) ; dépôt : GITHUB_REPOSITORY, sinon celui de `gh`.
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const FICHIER = join(dirname(fileURLToPath(import.meta.url)), "..", "ruleset-master.json");
// bypass_actors n'est renvoyé qu'aux administrateurs : comparé seulement s'il est lu des deux côtés.
const CHAMPS = ["name", "target", "enforcement", "conditions", "rules", "bypass_actors"];

const gh = (...args) => JSON.parse(execFileSync("gh", ["api", ...args], { encoding: "utf8" }));

/** Forme comparable : champs utiles seulement, clés triées, règles triées par type. */
function normaliser(ruleset) {
  const trier = (v) => (Array.isArray(v) ? v.map(trier) : v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, trier(v[k])])) : v);
  const choisi = Object.fromEntries(CHAMPS.filter((c) => c in ruleset).map((c) => [c, ruleset[c]]));
  if (Array.isArray(choisi.rules)) choisi.rules = [...choisi.rules].sort((a, b) => String(a.type).localeCompare(String(b.type)));
  return trier(choisi);
}

function principal() {
  const depot = process.env.GITHUB_REPOSITORY || execFileSync("gh", ["repo", "view", "--json", "nameWithOwner", "-q", ".nameWithOwner"], { encoding: "utf8" }).trim();
  const attendu = JSON.parse(readFileSync(FICHIER, "utf8"));
  const resume = gh(`repos/${depot}/rulesets`).find((r) => r.name === attendu.name);
  if (!resume) {
    console.error(`✗ ruleset « ${attendu.name} » introuvable sur ${depot} : la branche principale n'est plus protégée comme versionné.`);
    return 1;
  }
  const reel = normaliser(gh(`repos/${depot}/rulesets/${resume.id}`));
  if (process.argv.includes("--ecrire")) {
    writeFileSync(FICHIER, JSON.stringify(reel, null, 2) + "\n");
    console.log(`✓ ${FICHIER} réécrit depuis GitHub : à faire relire en PR.`);
    return 0;
  }
  const versionne = normaliser(attendu);
  if (!("bypass_actors" in reel)) delete versionne.bypass_actors;
  if (JSON.stringify(reel) === JSON.stringify(versionne)) {
    console.log(`✓ ruleset « ${attendu.name} » conforme à .github/ruleset-master.json`);
    return 0;
  }
  console.error(`✗ ruleset « ${attendu.name} » différent de .github/ruleset-master.json : changement de protection hors PR ?`);
  console.error(`  versionné : ${JSON.stringify(versionne)}`);
  console.error(`  sur GitHub : ${JSON.stringify(reel)}`);
  console.error("  Changement voulu : `node .github/scripts/verifier-ruleset.mjs --ecrire`, puis PR.");
  return 1;
}

process.exitCode = principal();
