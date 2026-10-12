import { writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

export { detectStack, type StackEntry } from "./stack.js";
export {
  verify,
  formaterVerdict,
  verdictJson,
  ecrireEvidence,
  caviarder,
  empreinte,
  lireAttestations,
  type Attestation,
  type Verdict,
  type ResultatContrat,
  type ResultatControle,
  type Statut,
} from "./verify.js";
export { attester, resumeContrat, type ResultatAttestation } from "./attest.js";
export { formaterPourAgent } from "./agent.js";
export { doctor, formaterDiagnostic, diagnosticJson, listerContrats, type Diagnostic } from "./doctor.js";
export { LANGS, TOOLS, CIS, type InitOptions } from "./config.js";
export { uninstall, type UninstallOptions, type UninstallReport } from "./manifeste.js";
export { resoudreDerive, type ResoudreDeriveOptions, type ResoudreDeriveReport } from "./derive.js";
export { auditerApply, formaterAudit, type AuditApply } from "./apercu.js";
import { KIT_MECHANICS, readConfig, resolve, writeConfig, type InitOptions, type Resolved } from "./config.js";
import { scaffold, type Overwrite } from "./rendu.js";
import { nettoyerObsoletes, readManifest, writeManifest } from "./manifeste.js";

// Branche créée par `init()` avant le tout premier commit : personne n'a plus jamais besoin de
// pousser sur master/main, même pour le bootstrap — décision du 2026-10-05,
// docs/projets/init-cree-une-branche.md.
const BRANCHE_INSTALLATION = "chantier/installation-kit";

function setupGit(targetDir: string, allowInit: boolean): void {
  const git = (...args: string[]) => execFileSync("git", args, { cwd: targetDir, stdio: "pipe" }).toString().trim();
  try {
    git("--version");
  } catch {
    console.warn("⚠ git introuvable : dépôt et hooks non configurés (lancer `git init` puis `git config core.hooksPath .githooks`).");
    return;
  }
  if (!existsSync(join(targetDir, ".git"))) {
    if (!allowInit) {
      console.warn("⚠ pas de dépôt git : hooks non activés (lancer `git config core.hooksPath .githooks` après `git init`).");
      return;
    }
    git("init");
    // Avant tout commit : jamais sur master/main (cf. QUA-017, plus d'exception de bootstrap).
    git("checkout", "-b", BRANCHE_INSTALLATION);
    console.log(`Dépôt git initialisé, branche « ${BRANCHE_INSTALLATION} » créée (jamais de commit direct sur master/main).`);
  }
  git("config", "core.hooksPath", ".githooks");
  // commit-msg est volontairement livré non exécutable (voir plus haut) : sans ce
  // réglage, git redonne le même avertissement à chaque commit, du bruit permanent.
  git("config", "advice.ignoredHook", "false");
  console.log("Hooks activés (core.hooksPath = .githooks).");
}

function reportStack(r: Resolved): void {
  if (r.stack.length) {
    console.log(`Stack détectée : ${r.stack.map((s) => `${s.path} → ${s.technos.join(", ")}`).join(" ; ")}`);
    return;
  }
  console.log("Stack non détectée : à décider par l'utilisateur (voir docs/architecture.md).");
  // Défaut écrit sur le disque sans que l'utilisateur l'ait demandé explicitement : le signaler.
  if (r.opts.layers === undefined && r.layers.length) {
    console.log(`Couches par défaut écrites : ${r.layers.join(", ")} — modifiable avec --layers.`);
  }
}

// Jamais de réécriture automatique : juste informer qu'un fichier déjà présent a dérivé du
// template du kit (mécanique ou prose), à comparer/mettre à jour à la main si besoin.
function reportDerives(derives: string[]): void {
  if (!derives.length) return;
  console.log(`⚠ Fichiers dérivés du template du kit (nombre de lignes ou sections différents, jamais réécrits automatiquement) :`);
  for (const d of derives) console.log(`  - ${d}`);
}

function reportObsoletes(obsoletes: string[]): void {
  if (!obsoletes.length) return;
  console.log(`Fichiers obsolètes d'une version antérieure du kit supprimés (jamais modifiés depuis l'installation) :`);
  for (const o of obsoletes) console.log(`  - ${o}`);
}

/**
 * Installe le kit. Par défaut ne réécrase que `.githooks/` (mécanique du kit) ; le
 * reste (AGENTS.md, docs/contrats.md, docs/projets/en-attente.md…) n'est écrit que
 * s'il manque, pour ne pas effacer les contrats et chantiers ajoutés par le projet.
 * `--force` réécrit tout, comme sur un dépôt neuf.
 */
export async function init(opts: InitOptions): Promise<void> {
  const r = resolve(opts, () => ["backend", "frontend"]);
  const shouldOverwrite: Overwrite = opts.force ? () => true : (rel) => rel.startsWith(KIT_MECHANICS);
  const derives: string[] = [];
  const manifest: Record<string, string> = {};
  const attendus: string[] = [];
  const ancien = readManifest(opts.targetDir);
  await scaffold(r, shouldOverwrite, derives, manifest, attendus);
  const obsoletes = await nettoyerObsoletes(opts.targetDir, ancien, attendus);
  await writeManifest(opts.targetDir, manifest, obsoletes);
  await writeConfig(r);
  reportStack(r);
  reportDerives(derives);
  reportObsoletes(obsoletes);
  if (opts.git !== false) setupGit(opts.targetDir, true);
}

export async function apply(opts: InitOptions): Promise<void> {
  // Sur un projet existant, les couches sont les sous-dossiers où une stack a été trouvée.
  const r = resolve(opts, (stack) => stack.map((s) => s.path).filter((p) => p !== "."));
  const derives: string[] = [];
  const manifest: Record<string, string> = {};
  const attendus: string[] = [];
  const ancien = readManifest(opts.targetDir);
  await scaffold(r, () => false, derives, manifest, attendus);
  const obsoletes = await nettoyerObsoletes(opts.targetDir, ancien, attendus);
  await writeManifest(opts.targetDir, manifest, obsoletes);
  const existante = readConfig(opts.targetDir);
  if (!existante) await writeConfig(r);
  else if (existante.nouvellesExigences === undefined) {
    // Seul ajout à une configuration existante : rendre visible le réglage des exigences récentes,
    // à « avertissement » (une mise à jour ne durcit jamais) ; le reste n'est pas touché.
    await writeFile(
      join(opts.targetDir, ".drwil", "ia-first.json"),
      JSON.stringify({ ...existante, nouvellesExigences: "avertissement" }, null, 2) + "\n",
    );
  }
  reportStack(r);
  reportDerives(derives);
  reportObsoletes(obsoletes);
  // On n'initialise pas de dépôt sur un projet existant : on active seulement les hooks s'il y en a un.
  if (opts.git !== false) setupGit(opts.targetDir, false);
}
