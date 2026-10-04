#!/usr/bin/env node
// Point d'entrée des contrôles IA-first, lancé au commit (pre-commit) et en CI.
// QUA-013 : un contrôle qui n'a pas tourné n'est pas un contrôle passé.
// Chaque contrôle finit donc « échec », « OK » ou « non exécuté », jamais masqué.
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(root);

let cfg = {};
try {
  cfg = JSON.parse(readFileSync(".drwil/ia-first.json", "utf8"));
} catch {}
const lang = cfg.lang === "en" ? "en" : "fr";
const full = (cfg.mode ?? "full") === "full";
const T = {
  fr: {
    secrets: "secrets (gitleaks)",
    gitleaksAbsent: "gitleaks absent",
    pasDeGit: "pas de dépôt git",
    docs: "chemins et contrats cités dans la doc",
    testsControles: "tests des contrôles eux-mêmes",
    aucunTest: "aucun .githooks/*.test.mjs",
    couvertureCi: "couverture CI de chaque contrôle (QUA-013)",
    pasDeCi: "aucune CI configurée (ci: none) : pas de filet pour les contrôles dégradables",
    projet: "contrôles du projet (lint, tests…)",
    aucunCheck: "aucun déclaré dans .drwil/ia-first.json → checks",
    brancheProtegee: (b) => `travail direct sur la branche principale (${b}) : passer par une branche et une pull/merge request (voir docs/recettes/travailler-en-branche.md)`,
    nonExecute: "non exécuté :",
    echec: "échec :",
    ok: (n) => `contrôles exécutés : OK (${n} non exécuté(s), voir ci-dessus)`,
    auditPerime: (f, n) => `audit périmé (${f}, vieux de ${n} jours) : à relancer`,
  },
  en: {
    secrets: "secrets (gitleaks)",
    gitleaksAbsent: "gitleaks not installed",
    pasDeGit: "not a git repository",
    docs: "paths and contracts cited in docs",
    testsControles: "tests of the checks themselves",
    aucunTest: "no .githooks/*.test.mjs",
    couvertureCi: "CI coverage of each check (QUA-013)",
    pasDeCi: "no CI configured (ci: none): no net for degradable checks",
    projet: "project checks (lint, tests…)",
    aucunCheck: "none declared in .drwil/ia-first.json → checks",
    brancheProtegee: (b) => `direct work on the main branch (${b}): go through a branch and a pull/merge request (see docs/recipes/working-with-branches.md)`,
    nonExecute: "not run:",
    echec: "failed:",
    ok: (n) => `checks run: OK (${n} not run, see above)`,
    auditPerime: (f, n) => `stale audit (${f}, ${n} days old): time to re-run`,
  },
}[lang];

const echecs = [];
const nonExecutes = [];

function controle(nom, cmd, args, opts = {}) {
  console.log(`[ia-first] ${nom}…`);
  const r = spawnSync(cmd, args, { stdio: "inherit", ...opts });
  if (r.error || r.status !== 0) echecs.push(nom);
}

function trouverGitleaks() {
  for (const candidat of ["gitleaks", join(homedir(), ".local", "bin", "gitleaks")]) {
    if (!spawnSync(candidat, ["version"], { stdio: "ignore" }).error) return candidat;
  }
  return null;
}

if (full) {
  const gitleaks = trouverGitleaks();
  if (!gitleaks) nonExecutes.push(`${T.secrets} (${T.gitleaksAbsent})`);
  else if (spawnSync("git", ["rev-parse", "--git-dir"], { stdio: "ignore" }).status !== 0) nonExecutes.push(`${T.secrets} (${T.pasDeGit})`);
  // En CI il n'y a rien d'indexé : on analyse l'historique au lieu des fichiers en attente de commit.
  else if (process.env.CI) controle(T.secrets, gitleaks, ["git", "--no-banner", "--redact", "."]);
  else controle(T.secrets, gitleaks, ["git", "--pre-commit", "--staged", "--no-banner", "--redact", "."]);
}

controle(T.docs, process.execPath, [".githooks/check-docs.mjs"]);

// QUA-017 : pas de travail direct sur la branche principale après le premier commit.
// Jamais en CI (process.env.CI) : la CI tourne aussi sur master après un merge légitime,
// qu'il ne faut pas bloquer rétroactivement — seuls les hooks locaux (pre-commit/pre-push) l'appliquent.
if (!process.env.CI) {
  const branche = spawnSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], { encoding: "utf8" });
  const nomBranche = branche.status === 0 ? branche.stdout.trim() : null;
  if (nomBranche && ["master", "main"].includes(nomBranche)) {
    // HEAD déjà existant = au moins un commit précédent sur cette branche : le tout premier
    // commit du dépôt (HEAD pas encore créé) est le seul cas toléré (bootstrap).
    const headExiste = spawnSync("git", ["rev-parse", "--verify", "HEAD"], { stdio: "ignore" }).status === 0;
    if (headExiste) echecs.push(T.brancheProtegee(nomBranche));
  }
}

if (full) {
  const tests = existsSync(".githooks") ? readdirSync(".githooks").filter((f) => f.endsWith(".test.mjs")) : [];
  // NODE_TEST_CONTEXT se propage aux enfants : si run-checks.mjs est lui-même
  // lancé depuis un `node --test` (ex. le paquet du kit qui teste ce hook en
  // bout en bout), ce `node --test` imbriqué serait sinon silencieusement
  // sauté (avertissement « called recursively »), masquant un vrai échec.
  if (tests.length) controle(T.testsControles, process.execPath, ["--test", ...tests.map((f) => join(".githooks", f))], { env: { ...process.env, NODE_TEST_CONTEXT: undefined } });
  else nonExecutes.push(`${T.testsControles} (${T.aucunTest})`);
}

if (full) {
  const ciFiles = Array.isArray(cfg.ciFiles) ? cfg.ciFiles : [];
  if (ciFiles.length) controle(T.couvertureCi, process.execPath, [".githooks/check-control-coverage.mjs"]);
  else nonExecutes.push(`${T.couvertureCi} (${T.pasDeCi})`);
}

// Les contrôles propres à la stack (lint, typecheck, tests) sont déclarés par le projet, pas par le kit.
const checks = Array.isArray(cfg.checks) ? cfg.checks : [];
if (!checks.length) nonExecutes.push(`${T.projet} (${T.aucunCheck})`);
for (const c of checks) controle(c.name ?? c.run, c.run, [], { shell: true, cwd: c.cwd ? join(root, c.cwd) : root });

// Rappel non bloquant (confort, pas un contrat) : un audit (opportunité, risques/dette) dont le
// « Dernier scan »/« Last scan » date de plus de 30 jours gagnerait à être relancé.
const SEUIL_PEREMPTION_JOURS = 30;
for (const fichier of [
  { fr: "docs/audit-risques.md", en: "docs/audit-risks.md" }[lang],
  { fr: "docs/decouverte-valeur.md", en: "docs/value-discovery.md" }[lang],
]) {
  if (!existsSync(fichier)) continue;
  const bloc = readFileSync(fichier, "utf8").split(/\r?\n/).find((l) => /^>\s*(dernier scan|last scan)/i.test(l));
  const m = bloc?.match(/\d{4}-\d{2}-\d{2}/);
  if (!m) continue;
  const jours = Math.floor((Date.now() - new Date(m[0]).getTime()) / 86400000);
  if (jours >= SEUIL_PEREMPTION_JOURS) nonExecutes.push(T.auditPerime(fichier, jours));
}

for (const c of nonExecutes) console.log(`[ia-first] ⚠ ${T.nonExecute} ${c}`);
if (echecs.length) {
  for (const c of echecs) console.log(`[ia-first] ✗ ${T.echec} ${c}`);
  process.exit(1);
}
console.log(`[ia-first] ${T.ok(nonExecutes.length)}`);
