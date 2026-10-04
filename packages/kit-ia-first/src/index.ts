import { mkdir, readFile, writeFile, readdir, chmod } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { basename, dirname, join, relative } from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { detectStack, type StackEntry } from "./stack.js";

export { detectStack, type StackEntry } from "./stack.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const templatesDir = join(dirname(__dirname), "templates");

export const LANGS = ["fr", "en"] as const;
export const TOOLS = ["claude", "codex", "cursor", "gemini", "copilot"] as const;
export const CIS = ["none", "github", "gitlab"] as const;
type Lang = typeof LANGS[number];
type Tool = typeof TOOLS[number];
type Ci = typeof CIS[number];

export interface InitOptions {
  targetDir: string;
  name?: string;
  short?: string;
  lang?: string;
  /** CSV. Défaut : backend,frontend pour init, couches détectées pour apply. */
  layers?: string;
  contractPrefixes?: string;
  mode?: string;
  description?: string;
  git?: boolean;
  /** CSV parmi TOOLS. Défaut : tous. */
  tools?: string;
  ci?: string;
  /** `init` seul : réécrit tout (sinon seul .githooks/, mécanique du kit, est réécrit). */
  force?: boolean;
}

/** Dossier dont `init` rafraîchit le contenu par défaut : la mécanique du kit, pas les docs du projet. */
const KIT_MECHANICS = ".githooks/";

// Couches qui ont une fiche dédiée dans templates/<lang>/layers ; les autres reçoivent generic.md.
const LAYER_TEMPLATES = ["backend", "frontend"];
const CI_FILES: Record<Ci, string[]> = { none: [], github: [".github/workflows/ia-first.yml"], gitlab: [".gitlab-ci.yml"] };

// Commandes de test/lint à autoriser par défaut dans .claude/settings.json, selon la techno détectée
// (modèle à compléter par le projet : docs/projets/extraction-ia-first-run-box.md, lot 3).
const STACK_ALLOW: Record<string, string[]> = {
  "Node.js": ["npm test:*", "npm run:*", "npx vitest:*", "npx tsc:*", "npx eslint:*"],
  "Python": ["pytest:*", "python3 -m pytest:*"],
  "Go": ["go test:*", "go build:*"],
  "Rust": ["cargo test:*", "cargo build:*"],
  "Java/Maven": ["mvn test:*"],
  "JVM/Gradle": ["./gradlew test:*"],
  ".NET": ["dotnet test:*"],
  "Ruby": ["bundle exec rspec:*"],
  "PHP": ["composer test:*"],
};

function stackAllow(stack: StackEntry[]): string {
  const technos = new Set(stack.flatMap(s => s.technos.flatMap(t => Object.keys(STACK_ALLOW).filter(k => t.includes(k)))));
  const commandes = [...technos].flatMap(t => STACK_ALLOW[t]);
  return commandes.map(c => `,\n      "Bash(${c})"`).join("");
}

const TEXT = {
  fr: {
    description: "(à décrire : ce que fait l'application, pour qui)",
    layer: (l: string) => `- \`${l}/\` — voir \`${l}/AGENTS.md\``,
    noLayer: "Aucune couche séparée : le code vit à la racine du dépôt.",
    stackNote: "Détectée à l'installation d'après les fichiers de projet : à confirmer par l'utilisateur.",
    stackUndecided: "Non décidée. L'utilisateur la choisit ; une IA la propose et attend sa validation avant d'écrire du code applicatif.",
    ciLine: (f: string) => ` et en CI (\`${f}\`)`,
    dirs: { projects: "docs/projets", intentions: "docs/intentions", recettes: "docs/recettes", contracts: "docs/contrats.md", index: "docs/projets/en-attente.md" },
  },
  en: {
    description: "(to describe: what the application does, for whom)",
    layer: (l: string) => `- \`${l}/\` — see \`${l}/AGENTS.md\``,
    noLayer: "No separate layer: the code lives at the repository root.",
    stackNote: "Detected at install time from project files: to be confirmed by the user.",
    stackUndecided: "Not decided. The user chooses it; an AI proposes one and waits for approval before writing application code.",
    ciLine: (f: string) => ` and in CI (\`${f}\`)`,
    dirs: { projects: "docs/projects", intentions: "docs/intentions", recettes: "docs/recipes", contracts: "docs/contracts.md", index: "docs/projects/pending.md" },
  },
};

interface Resolved {
  opts: InitOptions;
  lang: Lang;
  layers: string[];
  tools: Tool[];
  ci: Ci;
  mode: "minimal" | "full";
  stack: StackEntry[];
}

function splitCsv(s?: string) {
  return (s ?? "").split(",").map(x => x.trim()).filter(Boolean);
}

function pick<T extends string>(value: string, allowed: readonly T[], option: string): T {
  if (!(allowed as readonly string[]).includes(value)) {
    throw new Error(`--${option} : valeur « ${value} » inconnue (attendu : ${allowed.join(", ")})`);
  }
  return value as T;
}

function resolve(opts: InitOptions, defaultLayers: (stack: StackEntry[]) => string[]): Resolved {
  const stack = detectStack(opts.targetDir);
  return {
    opts,
    lang: pick(opts.lang ?? "fr", LANGS, "lang"),
    tools: splitCsv(opts.tools ?? TOOLS.join(",")).map(t => pick(t, TOOLS, "tools")),
    ci: pick(opts.ci ?? "none", CIS, "ci"),
    mode: pick(opts.mode ?? "full", ["minimal", "full"] as const, "mode"),
    layers: opts.layers !== undefined ? splitCsv(opts.layers) : defaultLayers(stack),
    stack,
  };
}

function projectName(r: Resolved): string {
  return r.opts.name ?? basename(r.opts.targetDir);
}

function render(content: string, r: Resolved, extra: Record<string, string> = {}): string {
  const t = TEXT[r.lang];
  const stack = r.stack.length
    ? `${r.stack.map(s => `- \`${s.path === "." ? "./" : s.path + "/"}\` : ${s.technos.join(", ")}`).join("\n")}\n\n${t.stackNote}`
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

async function walk(dir: string): Promise<string[]> {
  if (!existsSync(dir)) return [];
  const files: string[] = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name === "__pycache__") continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await walk(full));
    else files.push(full);
  }
  return files;
}

/** `shouldOverwrite` reçoit le chemin cible relatif à la racine du projet. */
type Overwrite = (relTarget: string) => boolean;

async function writeOut(target: string, content: string, targetDir: string, shouldOverwrite: Overwrite): Promise<void> {
  if (existsSync(target) && !shouldOverwrite(relative(targetDir, target))) return;
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, content);
  // commit-msg reste volontairement non exécutable (livré mais désactivé par défaut, lot 4).
  if (target.endsWith(".mjs") || ["pre-commit", "pre-push"].includes(basename(target))) {
    try { await chmod(target, 0o755); } catch {}
  }
}

/** Copie un dossier de modèles à la racine de la cible, en rendant les variables. */
async function copyTree(srcDir: string, r: Resolved, shouldOverwrite: Overwrite): Promise<void> {
  for (const file of await walk(srcDir)) {
    const target = join(r.opts.targetDir, relative(srcDir, file));
    await writeOut(target, render(await readFile(file, "utf8"), r), r.opts.targetDir, shouldOverwrite);
  }
}

async function scaffold(r: Resolved, shouldOverwrite: Overwrite): Promise<void> {
  const langDir = join(templatesDir, r.lang);
  await copyTree(join(templatesDir, "common", "base"), r, shouldOverwrite);
  await copyTree(join(langDir, "base"), r, shouldOverwrite);
  for (const tool of r.tools) {
    await copyTree(join(templatesDir, "common", "tools", tool), r, shouldOverwrite);
    await copyTree(join(langDir, "tools", tool), r, shouldOverwrite);
  }
  await copyTree(join(templatesDir, "common", "ci", r.ci), r, shouldOverwrite);

  for (const layer of r.layers) {
    const specific = join(langDir, "layers", `${layer}.md`);
    const source = LAYER_TEMPLATES.includes(layer) && existsSync(specific) ? specific : join(langDir, "layers", "generic.md");
    const up = "../".repeat(layer.split("/").filter(Boolean).length);
    const content = render(await readFile(source, "utf8"), r, { layer }).replace("`../AGENTS.md`", `\`${up}AGENTS.md\``);
    await writeOut(join(r.opts.targetDir, layer, "AGENTS.md"), content, r.opts.targetDir, shouldOverwrite);
  }

  // Un seul contenu de consignes (AGENTS.md) ; les outils qui ne le lisent pas nativement reçoivent un import.
  const pointers = [r.tools.includes("claude") && "CLAUDE.md", r.tools.includes("gemini") && "GEMINI.md"].filter(Boolean) as string[];
  for (const dir of [".", ...r.layers]) {
    for (const p of pointers) await writeOut(join(r.opts.targetDir, dir, p), "@AGENTS.md\n", r.opts.targetDir, shouldOverwrite);
  }
}

function readConfig(targetDir: string): Record<string, unknown> | null {
  try {
    return JSON.parse(readFileSync(join(targetDir, ".drwil", "ia-first.json"), "utf8"));
  } catch {
    return null;
  }
}

async function writeConfig(r: Resolved): Promise<void> {
  const previous = readConfig(r.opts.targetDir);
  const config = {
    projectName: projectName(r),
    projectShort: r.opts.short ?? projectName(r),
    lang: r.lang,
    layers: r.layers,
    contractPrefixes: splitCsv(r.opts.contractPrefixes ?? "SEC,QUA"),
    tools: r.tools,
    ci: r.ci,
    dirs: TEXT[r.lang].dirs,
    stack: r.stack,
    // Les contrôles du projet sont saisis par l'utilisateur ou l'IA : une réinstallation ne doit pas les effacer.
    checks: Array.isArray(previous?.checks) ? previous.checks : [],
    // Sévérité du rappel de cadrage (QUA-016 seul) : "bloquant" | "avertissement" | "off".
    // Défaut "avertissement" ; une valeur déjà choisie par le projet n'est jamais écrasée par une réinstallation.
    cadrage: typeof previous?.cadrage === "string" ? previous.cadrage : "avertissement",
    layerPrefixes: ["app", "tests", "src", "scripts"],
    codePrefixes: ["scripts", ".githooks", "e2e"],
    extraCodeFiles: [],
    extraCodeGlobs: ["docker-compose*.yml"],
    ciFiles: CI_FILES[r.ci],
    mode: r.mode,
  };
  await mkdir(join(r.opts.targetDir, ".drwil"), { recursive: true });
  await writeFile(join(r.opts.targetDir, ".drwil", "ia-first.json"), JSON.stringify(config, null, 2) + "\n");
}

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
    console.log("Dépôt git initialisé.");
  }
  git("config", "core.hooksPath", ".githooks");
  console.log("Hooks activés (core.hooksPath = .githooks).");
}

function reportStack(r: Resolved): void {
  if (r.stack.length) {
    console.log(`Stack détectée : ${r.stack.map(s => `${s.path} → ${s.technos.join(", ")}`).join(" ; ")}`);
    return;
  }
  console.log("Stack non détectée : à décider par l'utilisateur (voir docs/architecture.md).");
  // Défaut écrit sur le disque sans que l'utilisateur l'ait demandé explicitement : le signaler.
  if (r.opts.layers === undefined && r.layers.length) {
    console.log(`Couches par défaut écrites : ${r.layers.join(", ")} — modifiable avec --layers.`);
  }
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
  await scaffold(r, shouldOverwrite);
  await writeConfig(r);
  reportStack(r);
  if (opts.git !== false) setupGit(opts.targetDir, true);
}

/** Applique le kit à un projet existant sans écraser aucun fichier. */
export async function apply(opts: InitOptions): Promise<void> {
  // Sur un projet existant, les couches sont les sous-dossiers où une stack a été trouvée.
  const r = resolve(opts, stack => stack.map(s => s.path).filter(p => p !== "."));
  await scaffold(r, () => false);
  if (!readConfig(opts.targetDir)) await writeConfig(r);
  reportStack(r);
  // On n'initialise pas de dépôt sur un projet existant : on active seulement les hooks s'il y en a un.
  if (opts.git !== false) setupGit(opts.targetDir, false);
}
