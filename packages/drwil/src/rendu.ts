import { mkdir, readFile, writeFile, readdir, chmod } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { basename, dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import type { StackEntry } from "./stack.js";
import { CI_FILES, projectName, splitCsv, TEXT, type Resolved } from "./config.js";
import { sha256 } from "./manifeste.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
export const templatesDir = join(dirname(__dirname), "templates");

// Couches qui ont une fiche dédiée dans templates/<lang>/layers ; les autres reçoivent generic.md.
const LAYER_TEMPLATES = ["backend", "frontend"];

// Commandes de test/lint à autoriser par défaut dans .claude/settings.json, selon la techno détectée
// (modèle à compléter par le projet : docs/projets/extraction-ia-first-run-box.md, lot 3).
const STACK_ALLOW: Record<string, string[]> = {
  "Node.js": ["npm test:*", "npm run:*", "npx vitest:*", "npx tsc:*", "npx eslint:*"],
  Python: ["pytest:*", "python3 -m pytest:*"],
  Go: ["go test:*", "go build:*"],
  Rust: ["cargo test:*", "cargo build:*"],
  "Java/Maven": ["mvn test:*"],
  "JVM/Gradle": ["./gradlew test:*"],
  ".NET": ["dotnet test:*"],
  Ruby: ["bundle exec rspec:*"],
  PHP: ["composer test:*"],
};

function stackAllow(stack: StackEntry[]): string {
  const technos = new Set(stack.flatMap((s) => s.technos.flatMap((t) => Object.keys(STACK_ALLOW).filter((k) => t.includes(k)))));
  const commandes = [...technos].flatMap((t) => STACK_ALLOW[t]);
  return commandes.map((c) => `,\n      "Bash(${c})"`).join("");
}

export function render(content: string, r: Resolved, extra: Record<string, string> = {}): string {
  const t = TEXT[r.lang];
  const stack = r.stack.length
    ? `${r.stack.map((s) => `- \`${s.path === "." ? "./" : s.path + "/"}\` : ${s.technos.join(", ")}`).join("\n")}\n\n${t.stackNote}`
    : t.stackUndecided;
  const ciFile = CI_FILES[r.ci][0];
  const values: Record<string, string> = {
    projectName: projectName(r),
    projectShort: r.opts.short ?? projectName(r),
    lang: r.lang,
    layersCsv: r.layers.join(","),
    layersList: r.layers.length ? r.layers.map(t.layer).join("\n") : t.noLayer,
    contractPrefixesCsv: splitCsv(r.opts.contractPrefixes ?? "SEC,QUA").join(","),
    description: r.opts.description ?? t.description,
    stack,
    ciLine: ciFile ? t.ciLine(ciFile) : "",
    indexFile: t.dirs.index,
    date: new Date().toISOString().slice(0, 10),
    // Fichiers propres au kit à couvrir par le bloc cadrage de mecanique-ia-first.md (lignes vides si absents).
    cadrageCi: ciFile ? `  - ${ciFile}` : "",
    cadrageClaude: r.tools.includes("claude") ? "  - .claude/settings.json" : "",
    stackAllowJson: stackAllow(r.stack),
    ...extra,
  };
  // Remplacement par fonction : une valeur contenant « $& » ou « $1 » doit rester littérale.
  return content.replace(/{{(\w+)}}/g, (m, key: string) => values[key] ?? m);
}

export async function walk(dir: string): Promise<string[]> {
  if (!existsSync(dir)) return [];
  const files: string[] = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name === "__pycache__") continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(full)));
    else files.push(full);
  }
  return files;
}

/** `shouldOverwrite` reçoit le chemin cible relatif à la racine du projet. */
export type Overwrite = (relTarget: string) => boolean;

// Compare un fichier déjà présent (non réécrit) au contenu du template : signalement seul, jamais
// de réécriture automatique (décision du 2026-10-04, docs/projets/apply-rafraichit-mecanique.md).
// Critère volontairement grossier (nombre de lignes + sections `##` manquantes), pas un diff complet.
function detecterDerive(target: string, contenuModele: string): boolean {
  const existant = readFileSync(target, "utf8");
  if (existant === contenuModele) return false;
  const lignes = (s: string) => s.split(/\r?\n/).length;
  const sections = (s: string) => new Set(s.match(/^##[^\n]*$/gm) ?? []);
  const sectionsModele = sections(contenuModele);
  const sectionsExistantes = sections(existant);
  const sectionManquante = [...sectionsModele].some((s) => !sectionsExistantes.has(s));
  return lignes(existant) !== lignes(contenuModele) || sectionManquante;
}

/** Chemin relatif en séparateurs `/`, pour que les comparaisons (préfixes, manifeste) soient
 * indépendantes de l'OS : `path.relative` rend des `\` sous Windows. */
export function relPosix(from: string, to: string): string {
  return relative(from, to).replace(/\\/g, "/");
}

// Aperçu d'`apply` (DRWIL-011) : le même parcours que l'installation réelle, mais writeOut relève
// chaque fichier au lieu de l'écrire. L'aperçu ne peut donc pas diverger de ce qu'apply ferait.
let simulation: { crees: string[]; conserves: string[]; remplaces: string[] } | null = null;
export function definirSimulation(s: typeof simulation): void {
  simulation = s;
}

async function writeOut(
  target: string,
  content: string,
  targetDir: string,
  shouldOverwrite: Overwrite,
  derives?: string[],
  manifest?: Record<string, string>,
  attendus?: string[],
): Promise<void> {
  const rel = relPosix(targetDir, target);
  if (attendus) attendus.push(rel);
  if (existsSync(target) && !shouldOverwrite(rel)) {
    if (derives && detecterDerive(target, content)) derives.push(rel);
    if (simulation) simulation.conserves.push(rel);
    return;
  }
  if (simulation) {
    (existsSync(target) ? simulation.remplaces : simulation.crees).push(rel);
    return;
  }
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, content);
  if (manifest) manifest[rel] = sha256(content);
  // commit-msg reste volontairement non exécutable (livré mais désactivé par défaut, lot 4).
  if (target.endsWith(".mjs") || ["pre-commit", "pre-push", "prepare-commit-msg"].includes(basename(target))) {
    try {
      await chmod(target, 0o755);
    } catch {}
  }
}

// npm retire tout fichier `.gitignore` d'un paquet publié : le gabarit le livre sous un autre nom,
// rendu ici sous son vrai nom (le manifeste et la dérive ne voient que le nom final).
const NOMS_LIVRES: Record<string, string> = { gitignore: ".gitignore" };

/** Copie un dossier de modèles à la racine de la cible, en rendant les variables. */
async function copyTree(
  srcDir: string,
  r: Resolved,
  shouldOverwrite: Overwrite,
  derives?: string[],
  manifest?: Record<string, string>,
  attendus?: string[],
): Promise<void> {
  for (const file of await walk(srcDir)) {
    const rel = relative(srcDir, file);
    const nom = NOMS_LIVRES[basename(rel)];
    const target = join(r.opts.targetDir, nom ? join(dirname(rel), nom) : rel);
    await writeOut(target, render(await readFile(file, "utf8"), r), r.opts.targetDir, shouldOverwrite, derives, manifest, attendus);
  }
}

export async function scaffold(
  r: Resolved,
  shouldOverwrite: Overwrite,
  derives?: string[],
  manifest?: Record<string, string>,
  attendus?: string[],
): Promise<void> {
  const langDir = join(templatesDir, r.lang);
  await copyTree(join(templatesDir, "common", "base"), r, shouldOverwrite, derives, manifest, attendus);
  await copyTree(join(langDir, "base"), r, shouldOverwrite, derives, manifest, attendus);
  for (const tool of r.tools) {
    await copyTree(join(templatesDir, "common", "tools", tool), r, shouldOverwrite, derives, manifest, attendus);
    await copyTree(join(langDir, "tools", tool), r, shouldOverwrite, derives, manifest, attendus);
  }
  await copyTree(join(templatesDir, "common", "ci", r.ci), r, shouldOverwrite, derives, manifest, attendus);
  await copyTree(join(langDir, "ci", r.ci), r, shouldOverwrite, derives, manifest, attendus);

  for (const layer of r.layers) {
    const specific = join(langDir, "layers", `${layer}.md`);
    const source = LAYER_TEMPLATES.includes(layer) && existsSync(specific) ? specific : join(langDir, "layers", "generic.md");
    const up = "../".repeat(layer.split("/").filter(Boolean).length);
    const content = render(await readFile(source, "utf8"), r, { layer }).replace("`../AGENTS.md`", `\`${up}AGENTS.md\``);
    await writeOut(join(r.opts.targetDir, layer, "AGENTS.md"), content, r.opts.targetDir, shouldOverwrite, derives, manifest, attendus);
  }

  // Un seul contenu de consignes (AGENTS.md) ; les outils qui ne le lisent pas nativement reçoivent un import.
  const pointers = [r.tools.includes("claude") && "CLAUDE.md", r.tools.includes("gemini") && "GEMINI.md"].filter(Boolean) as string[];
  for (const dir of [".", ...r.layers]) {
    for (const p of pointers)
      await writeOut(join(r.opts.targetDir, dir, p), "@AGENTS.md\n", r.opts.targetDir, shouldOverwrite, derives, manifest, attendus);
  }
}
