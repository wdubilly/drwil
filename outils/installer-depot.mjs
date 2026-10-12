#!/usr/bin/env node
// Le dépôt s'installe depuis son gabarit (docs/projects/depot-installe-par-gabarit.md) : le gabarit
// (packages/drwil/templates/) est la seule source, les copies du dépôt en sont l'installation.
// `drwil init` lancé sur le dépôt lui-même n'y rafraîchirait que la mécanique inchangée et ne
// recopierait aucun document déjà présent : il ne convient pas tel quel. On installe donc avec la vraie CLI
// (`init --force`) dans une copie temporaire des fichiers suivis, puis on ne recopie dans le dépôt que
// les fichiers du gabarit dont l'unité y est installée, hors écarts déclarés (outils/miroirs.json),
// hors fichiers déclarés propres au gabarit et hors .drwil/. Les modules optionnels, que la CLI
// n'installe pas, sont recopiés tels quels.
// Avant d'installer, le dépôt passe de l'ancien format aux noms anglais avec la migration de la CLI
// (docs/projects/coeur-en-anglais.md) : état, config, journal de consommation, blocs et chemins des fiches.
// Hors de portée : un fichier retiré du gabarit reste dans le dépôt (miroirs-gabarit le signale).
// Usage : node outils/installer-depot.mjs [--dry-run] [racine]
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { homologues, unitesInstallees } from "./verifier-miroirs.mjs";

/** Arguments de `drwil init` qui reproduisent l'installation du dépôt, d'après sa config et ses unités. */
export function argumentsInit(config, unites) {
  const parmi = (genre) => [...unites].filter((u) => u.startsWith(`${genre}/`)).map((u) => u.slice(genre.length + 1));
  const ci = parmi("ci");
  return [
    "init",
    "--force",
    "--no-git",
    "--name",
    config.projectName,
    "--short",
    config.projectShort ?? config.projectName,
    "--lang",
    config.lang ?? "fr",
    "--layers",
    (config.layers ?? []).join(","),
    "--contract-prefixes",
    (config.contractPrefixes ?? ["SEC", "QUA"]).join(","),
    "--tools",
    parmi("tools").join(","),
    "--ci",
    ci.length ? ci.join(",") : "none",
    "--mode",
    config.mode ?? "full",
  ];
}

/**
 * Fichiers à écrire dans le dépôt : { chemin, depuis, action } pour chaque fichier du gabarit d'une
 * unité installée, hors écart déclaré, dont le contenu installé (`installe`, dossier rendu par la CLI)
 * diffère du dépôt. Un module optionnel est pris dans le gabarit même.
 */
export function planifier(racine, installe, { ecarts = {}, propresAuGabarit = {} } = {}) {
  const carte = homologues(racine);
  const unites = unitesInstallees(racine, carte);
  const plan = [];
  const problemes = [];
  for (const [chemin, { source, unite }] of [...carte].sort(([a], [b]) => a.localeCompare(b))) {
    // Un fichier déclaré propre au gabarit n'appartient pas au dépôt : jamais créé ici.
    if (!unites.has(unite) || Object.hasOwn(ecarts, chemin) || Object.hasOwn(propresAuGabarit, chemin) || chemin.startsWith(".drwil/"))
      continue;
    const depuis = unite.startsWith("optional/") ? join(racine, source) : join(installe, chemin);
    if (!existsSync(depuis)) {
      problemes.push(`${chemin} : attendu de l'installation (${source}) mais non produit par drwil init`);
      continue;
    }
    const cible = join(racine, chemin);
    if (!existsSync(cible)) plan.push({ chemin, depuis, action: "cree" });
    else if (!readFileSync(cible).equals(readFileSync(depuis))) plan.push({ chemin, depuis, action: "remplace" });
  }
  return { plan, problemes };
}

/** Écrit le plan ; un fichier créé prend les droits du fichier installé (hooks exécutables). */
export function appliquer(racine, plan) {
  for (const { chemin, depuis, action } of plan) {
    const cible = join(racine, chemin);
    mkdirSync(dirname(cible), { recursive: true });
    writeFileSync(cible, readFileSync(depuis), action === "cree" ? { mode: statSync(depuis).mode } : undefined);
  }
}

/**
 * Installation réelle : construit la CLI, copie les fichiers suivis (la détection de pile les lit)
 * dans un dossier temporaire et y lance `drwil init`. Rend { dossier } ou { erreur }.
 */
export function installerAvecCli(racine, args) {
  const build = spawnSync("npm", ["run", "build", "--silent"], { cwd: racine, encoding: "utf8", shell: process.platform === "win32" });
  if (build.status !== 0) return { erreur: `construction de la CLI en échec (npm run build)\n${build.stdout}${build.stderr}` };
  const git = spawnSync("git", ["ls-files", "-z"], { cwd: racine, encoding: "utf8" });
  if (git.status !== 0) return { erreur: "fichiers suivis illisibles (git ls-files)" };
  const dossier = mkdtempSync(join(tmpdir(), "drwil-installer-depot-"));
  for (const f of git.stdout.split("\0").filter(Boolean))
    if (existsSync(join(racine, f))) cpSync(join(racine, f), join(dossier, f), { recursive: true });
  const cli = join(racine, "packages", "drwil", "bin", "drwil.js");
  const init = spawnSync(process.execPath, [cli, ...args], { cwd: dossier, encoding: "utf8" });
  if (init.status !== 0) {
    rmSync(dossier, { recursive: true, force: true });
    return { erreur: `drwil init en échec\n${init.stdout}${init.stderr}` };
  }
  return { dossier };
}

/**
 * Migration de l'ancien format par la CLI construite (`migrate`, idempotente ; rien d'écrit en
 * simulation). Rend { lignes } (résumé, vide si rien à migrer) ou { erreur }.
 */
export function migrerAvecCli(racine, simulation) {
  const build = spawnSync("npm", ["run", "build", "--silent"], { cwd: racine, encoding: "utf8", shell: process.platform === "win32" });
  if (build.status !== 0) return { erreur: `construction de la CLI en échec (npm run build)\n${build.stdout}${build.stderr}` };
  const dist = pathToFileURL(join(racine, "packages", "drwil", "dist", "index.js")).href;
  const code = `const { migrate, formatMigration, projectLang } = await import(${JSON.stringify(dist)});
const simulation = process.argv[2] === "1";
console.log(formatMigration(await migrate(process.argv[1], { dryRun: simulation }), simulation, projectLang(process.argv[1])).join("\\n"));`;
  const r = spawnSync(process.execPath, ["--input-type=module", "-e", code, racine, simulation ? "1" : "0"], { encoding: "utf8" });
  if (r.status !== 0) return { erreur: `migration en échec\n${r.stdout}${r.stderr}` };
  return { lignes: r.stdout.split("\n").filter(Boolean) };
}

/** Lit la config, migre, installe, compare, écrit (sauf simulation) ; rend le code de sortie. */
export function principal(racine, { simulation = false, installer = installerAvecCli, migrerDepot = migrerAvecCli } = {}) {
  let config;
  let miroirs;
  try {
    config = JSON.parse(readFileSync(join(racine, ".drwil", "ia-first.json"), "utf8"));
    miroirs = JSON.parse(readFileSync(join(racine, "outils", "miroirs.json"), "utf8"));
  } catch (e) {
    console.error(`installer-depot : config illisible (${e.message})`);
    return 1;
  }
  const migration = migrerDepot(racine, simulation);
  if (migration.erreur) {
    console.error(`installer-depot : ${migration.erreur}`);
    return 1;
  }
  for (const l of migration.lignes) console.log(l);
  const { dossier, erreur } = installer(racine, argumentsInit(config, unitesInstallees(racine, homologues(racine))));
  if (erreur) {
    console.error(`installer-depot : ${erreur}`);
    return 1;
  }
  try {
    const { plan, problemes } = planifier(racine, dossier, {
      ecarts: miroirs.ecarts ?? {},
      propresAuGabarit: miroirs.propresAuGabarit ?? {},
    });
    for (const p of problemes) console.error(`  ✗ ${p}`);
    if (problemes.length) return 1;
    if (!simulation) appliquer(racine, plan);
    for (const { chemin, action } of plan) console.log(`  ${action === "cree" ? "+" : "~"} ${chemin}`);
    console.log(
      `installer-depot : ${plan.length} fichier(s) ${simulation ? "à écrire (simulation, rien d'écrit)" : "écrit(s)"} depuis le gabarit`,
    );
    return 0;
  } finally {
    rmSync(dossier, { recursive: true, force: true });
  }
}

// Chemins réels comparés : un dossier en lien symbolique ne doit pas empêcher l'exécution.
if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  process.exitCode = principal(args.find((a) => a !== "--dry-run") ?? process.cwd(), { simulation: args.includes("--dry-run") });
}
