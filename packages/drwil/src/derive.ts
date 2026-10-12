import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, relative } from "node:path";
import { resolveFromConfig, type Resolved } from "./config.js";
import { relPosix, render, templatesDir, walk } from "./rendu.js";

// Périmètre du lot 2 (résolution) : seulement la mécanique « sans personnalisation légitime
// attendue » — .githooks/, .claude/settings.json et le fichier de CI — jamais la prose
// (AGENTS.md, docs/recettes/...), décision du 2026-10-05.
async function rendusMecaniques(r: Resolved): Promise<Map<string, string>> {
  const rendus = new Map<string, string>();
  // `walkDir` : dossier parcouru ; `relBase` : dossier servant de référence pour le chemin relatif
  // (garde le préfixe `.githooks/` au lieu de le perdre en marchant directement dans ce dossier).
  const ajouter = async (walkDir: string, relBase: string) => {
    for (const file of await walk(walkDir)) {
      const target = join(r.opts.targetDir, relative(relBase, file));
      rendus.set(target, render(await readFile(file, "utf8"), r));
    }
  };
  const base = join(templatesDir, "common", "base");
  await ajouter(join(base, ".githooks"), base);
  if (r.tools.includes("claude")) {
    const settings = join(templatesDir, "common", "tools", "claude", ".claude", "settings.json");
    rendus.set(join(r.opts.targetDir, ".claude", "settings.json"), render(await readFile(settings, "utf8"), r));
  }
  if (r.ci !== "none") {
    const srcCi = join(templatesDir, "common", "ci", r.ci);
    await ajouter(srcCi, srcCi);
  }
  return rendus;
}

// Diff unifié minimal (ligne à ligne, plus proche possible, sans bibliothèque externe) : juste de
// quoi montrer à l'utilisateur ce qui changerait avant confirmation — pas un outil de patch.
function diffUnifie(ancien: string, nouveau: string): string {
  const a = ancien.split(/\r?\n/);
  const b = nouveau.split(/\r?\n/);
  // Programmation dynamique (plus longue sous-séquence commune) : fichiers mécaniques courts, coût négligeable.
  const lcs: number[][] = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      lcs[i][j] = a[i] === b[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }
  const lignes: string[] = [];
  let i = 0,
    j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i++;
      j++;
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      lignes.push(`- ${a[i]}`);
      i++;
    } else {
      lignes.push(`+ ${b[j]}`);
      j++;
    }
  }
  while (i < a.length) {
    lignes.push(`- ${a[i]}`);
    i++;
  }
  while (j < b.length) {
    lignes.push(`+ ${b[j]}`);
    j++;
  }
  return lignes.join("\n");
}

export interface ResoudreDeriveOptions {
  targetDir: string;
  /** Usage non interactif (scripté/CI) : écrase sans demander. Défaut `false` — sans elle, jamais
   * d'écrasement sans confirmation explicite (décision du 2026-10-05). */
  forcer?: boolean;
}

export interface ResoudreDeriveReport {
  /** Fichiers mécaniques réécrits (confirmés, ou --forcer). */
  resolus: string[];
  /** Fichiers mécaniques en dérive mais laissés intacts (confirmation refusée). */
  ignores: string[];
}

/** Résout la dérive des fichiers mécaniques (`.githooks/`, `.claude/settings.json`, fichier de
 * CI) signalée par `apply()`/`init()` : affiche un diff, demande confirmation (sauf `--forcer`),
 * sauvegarde l'ancien fichier en `.bak` avant d'écraser. Jamais appelée automatiquement par
 * `init()`/`apply()` (lot 2, docs/projets/apply-rafraichit-mecanique.md). */
export async function resoudreDerive(
  opts: ResoudreDeriveOptions,
  confirmer: (rel: string, diff: string) => boolean | Promise<boolean> = confirmerParDefaut,
): Promise<ResoudreDeriveReport> {
  const r = resolveFromConfig(opts.targetDir);
  const rendus = await rendusMecaniques(r);
  const resolus: string[] = [];
  const ignores: string[] = [];
  for (const [target, contenuModele] of rendus) {
    if (!existsSync(target)) continue; // ce lot ne crée rien : seuls les fichiers déjà en dérive sont traités.
    const rel = relPosix(opts.targetDir, target);
    const existant = await readFile(target, "utf8");
    if (existant === contenuModele) continue; // pas de dérive.
    const ok = opts.forcer || (await confirmer(rel, diffUnifie(existant, contenuModele)));
    if (!ok) {
      ignores.push(rel);
      continue;
    }
    await writeFile(`${target}.bak`, existant);
    await writeFile(target, contenuModele);
    resolus.push(rel);
  }
  return { resolus, ignores };
}

// Confirmation interactive réelle (stdin) : séparée de resoudreDerive() pour rester testable sans
// terminal (le test fournit un `confirmer` synthétique).
async function confirmerParDefaut(rel: string, diff: string): Promise<boolean> {
  console.log(`\n--- ${rel} ---`);
  console.log(diff);
  if (!process.stdin.isTTY) return false; // non interactif sans --forcer : jamais d'écrasement.
  const { createInterface } = await import("node:readline/promises");
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const reponse = await rl.question(`Écraser ${rel} ? [o/N] `);
    return /^o(ui)?$/i.test(reponse.trim());
  } finally {
    rl.close();
  }
}
