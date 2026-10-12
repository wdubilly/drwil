import { mkdir, readFile, writeFile, readdir, rm } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { createHash } from "node:crypto";
import { KIT_MECHANICS } from "./config.js";

export function sha256(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

const MANIFEST_PATH = [".drwil", "fichiers-installes.json"];

export function readManifest(targetDir: string): Record<string, string> {
  try {
    return JSON.parse(readFileSync(join(targetDir, ...MANIFEST_PATH), "utf8"));
  } catch {
    return {};
  }
}

// Fusionné (jamais réécrit intégralement) : une installation partielle (apply ciblé)
// ne doit pas perdre les entrées d'une installation précédente (contrainte section 3,
// docs/projets/desinstaller-proprement.md). `obsoletes` : chemins supprimés par
// nettoyerObsoletes() dans cette même exécution, retirés du manifeste fusionné
// (sinon la fusion les réintroduirait).
export async function writeManifest(targetDir: string, manifest: Record<string, string>, obsoletes: string[] = []): Promise<void> {
  const fusion = { ...readManifest(targetDir), ...manifest };
  for (const o of obsoletes) delete fusion[o];
  await mkdir(join(targetDir, ".drwil"), { recursive: true });
  await writeFile(join(targetDir, ...MANIFEST_PATH), JSON.stringify(fusion, null, 2) + "\n");
}

// Fiches et décisions produites par l'utilisateur/l'IA au fil du temps, jamais retirées
// automatiquement (ni par le nettoyage d'obsolètes, ni par `uninstall`), même si leur contenu
// initial (gabarit vide) a été copié par le kit — décision du 2026-10-04,
// docs/projets/desinstaller-proprement.md.
const PROTECTED_DIRS = ["docs/projets/", "docs/projects/", "docs/intentions/", "docs/recettes/", "docs/recipes/"];
function estProtege(rel: string): boolean {
  return PROTECTED_DIRS.some((p) => rel.startsWith(p));
}

// Fichiers écrits par une version antérieure du kit, absents de la version actuelle du template
// (`attendus`), jamais modifiés depuis l'installation (empreinte inchangée) : supprimés.
// Scopé à la mécanique du kit (même périmètre que KIT_MECHANICS) — jamais docs/projets/ etc.
// (point 3, docs/projets/suites-kit-portable.md ; mécanisme partagé avec `uninstall`,
// docs/projets/desinstaller-proprement.md).
export async function nettoyerObsoletes(targetDir: string, ancien: Record<string, string>, attendus: string[]): Promise<string[]> {
  const attenduSet = new Set(attendus);
  const supprimes: string[] = [];
  for (const [rel, hash] of Object.entries(ancien)) {
    if (!rel.startsWith(KIT_MECHANICS) || attenduSet.has(rel) || estProtege(rel)) continue;
    const abs = join(targetDir, rel);
    if (!existsSync(abs)) continue;
    const actuel = sha256(await readFile(abs, "utf8"));
    if (actuel !== hash) continue; // modifié depuis l'installation : jamais supprimé automatiquement.
    await rm(abs);
    supprimes.push(rel);
  }
  return supprimes;
}

// Supprime, de bas en haut, les dossiers devenus vides après une suppression de fichiers.
async function purgerDossiersVides(targetDir: string, relSupprimes: string[]): Promise<void> {
  const dossiers = new Set(relSupprimes.map((r) => dirname(join(targetDir, r))));
  for (const depart of dossiers) {
    let courant = depart;
    while (courant !== targetDir && courant.startsWith(targetDir)) {
      let entries: string[];
      try {
        entries = await readdir(courant);
      } catch {
        break;
      }
      if (entries.length) break;
      // fs.rm exige recursive:true pour un dossier, même vide (sinon EISDIR).
      await rm(courant, { recursive: true });
      courant = dirname(courant);
    }
  }
}

export interface UninstallOptions {
  targetDir: string;
  /** Défaut `true` : liste ce qui serait supprimé sans rien toucher (décision du 2026-10-04,
   * docs/projets/desinstaller-proprement.md — confirmation explicite avant suppression réelle). */
  dryRun?: boolean;
}

export interface UninstallReport {
  /** Fichiers supprimés (ou qui le seraient, en mode simulation). */
  removed: string[];
  /** Fichiers dont l'empreinte diffère du manifeste (modifiés depuis l'installation) : jamais supprimés. */
  modified: string[];
}

/** Désinstalle la mécanique du kit à partir du manifeste des fichiers installés. Ne touche
 * jamais `docs/projets/`, `docs/intentions/`, `docs/recettes/` (ni leurs équivalents anglais),
 * ni un fichier modifié depuis l'installation (empreinte différente). */
export async function uninstall(opts: UninstallOptions): Promise<UninstallReport> {
  const manifest = readManifest(opts.targetDir);
  const dryRun = opts.dryRun ?? true;
  const removed: string[] = [];
  const modified: string[] = [];
  for (const [rel, hash] of Object.entries(manifest)) {
    if (estProtege(rel)) continue;
    const abs = join(opts.targetDir, rel);
    if (!existsSync(abs)) continue;
    const actuel = sha256(await readFile(abs, "utf8"));
    if (actuel !== hash) {
      modified.push(rel);
      continue;
    }
    removed.push(rel);
  }
  // État de gouvernance local (gitignoré, hors manifeste) : relu par aucun autre outil une fois
  // la mécanique retirée ; listé comme le reste, donc jamais supprimé en silence.
  if (existsSync(join(opts.targetDir, ".drwil", "state.json"))) removed.push(".drwil/state.json");
  if (!dryRun) {
    for (const rel of removed) await rm(join(opts.targetDir, rel));
    const fusion = { ...manifest };
    for (const rel of removed) delete fusion[rel];
    await mkdir(join(opts.targetDir, ".drwil"), { recursive: true });
    await writeFile(join(opts.targetDir, ...MANIFEST_PATH), JSON.stringify(fusion, null, 2) + "\n");
    await purgerDossiersVides(opts.targetDir, removed);
  }
  return { removed, modified };
}
