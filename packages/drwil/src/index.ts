import { mkdir, readFile, writeFile, readdir, chmod, rm } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { basename, dirname, join, relative } from "node:path";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { detectStack, type StackEntry } from "./stack.js";

export { detectStack, type StackEntry } from "./stack.js";
export { verify, formaterVerdict, verdictJson, ecrireEvidence, caviarder, empreinte, lireAttestations, type Attestation, type Verdict, type ResultatContrat, type ResultatControle, type Statut } from "./verify.js";
export { attester, resumeContrat, type ResultatAttestation } from "./attest.js";
export { doctor, formaterDiagnostic, diagnosticJson, listerContrats, type Diagnostic } from "./doctor.js";

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
function relPosix(from: string, to: string): string {
  return relative(from, to).replace(/\\/g, "/");
}

// Aperçu d'`apply` (DRWIL-011) : le même parcours que l'installation réelle, mais writeOut relève
// chaque fichier au lieu de l'écrire. L'aperçu ne peut donc pas diverger de ce qu'apply ferait.
let simulation: { crees: string[]; conserves: string[]; remplaces: string[] } | null = null;

async function writeOut(
  target: string, content: string, targetDir: string, shouldOverwrite: Overwrite, derives?: string[], manifest?: Record<string, string>, attendus?: string[],
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
  if (target.endsWith(".mjs") || ["pre-commit", "pre-push"].includes(basename(target))) {
    try { await chmod(target, 0o755); } catch {}
  }
}

/** Copie un dossier de modèles à la racine de la cible, en rendant les variables. */
async function copyTree(srcDir: string, r: Resolved, shouldOverwrite: Overwrite, derives?: string[], manifest?: Record<string, string>, attendus?: string[]): Promise<void> {
  for (const file of await walk(srcDir)) {
    const target = join(r.opts.targetDir, relative(srcDir, file));
    await writeOut(target, render(await readFile(file, "utf8"), r), r.opts.targetDir, shouldOverwrite, derives, manifest, attendus);
  }
}

async function scaffold(r: Resolved, shouldOverwrite: Overwrite, derives?: string[], manifest?: Record<string, string>, attendus?: string[]): Promise<void> {
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
    for (const p of pointers) await writeOut(join(r.opts.targetDir, dir, p), "@AGENTS.md\n", r.opts.targetDir, shouldOverwrite, derives, manifest, attendus);
  }
}

function sha256(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

const MANIFEST_PATH = [".drwil", "fichiers-installes.json"];

function readManifest(targetDir: string): Record<string, string> {
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
async function writeManifest(targetDir: string, manifest: Record<string, string>, obsoletes: string[] = []): Promise<void> {
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
async function nettoyerObsoletes(targetDir: string, ancien: Record<string, string>, attendus: string[]): Promise<string[]> {
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
    if (actuel !== hash) { modified.push(rel); continue; }
    removed.push(rel);
  }
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

// Reconstruit un `Resolved` minimal à partir de la config déjà écrite par init()/apply(), pour
// relire ses décisions (lang, tools, ci, stack...) sans ré-exécuter la détection de pile — lot 2,
// docs/projets/apply-rafraichit-mecanique.md.
function resolveFromConfig(targetDir: string): Resolved {
  const config = readConfig(targetDir);
  if (!config) {
    throw new Error(`projet non initialisé (${join(targetDir, ".drwil", "ia-first.json")} introuvable) : lancer « drwil init » d'abord`);
  }
  const opts: InitOptions = {
    targetDir,
    name: config.projectName as string | undefined,
    short: config.projectShort as string | undefined,
    contractPrefixes: Array.isArray(config.contractPrefixes) ? (config.contractPrefixes as string[]).join(",") : undefined,
  };
  return {
    opts,
    lang: pick((config.lang as string) ?? "fr", LANGS, "lang"),
    layers: Array.isArray(config.layers) ? (config.layers as string[]) : [],
    tools: Array.isArray(config.tools) ? (config.tools as string[]).map(t => pick(t, TOOLS, "tools")) : [],
    ci: pick((config.ci as string) ?? "none", CIS, "ci"),
    mode: pick((config.mode as string) ?? "full", ["minimal", "full"] as const, "mode"),
    stack: Array.isArray(config.stack) ? (config.stack as StackEntry[]) : [],
  };
}

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
  let i = 0, j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; }
    else if (lcs[i + 1][j] >= lcs[i][j + 1]) { lignes.push(`- ${a[i]}`); i++; }
    else { lignes.push(`+ ${b[j]}`); j++; }
  }
  while (i < a.length) { lignes.push(`- ${a[i]}`); i++; }
  while (j < b.length) { lignes.push(`+ ${b[j]}`); j++; }
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
    const ok = opts.forcer || await confirmer(rel, diffUnifie(existant, contenuModele));
    if (!ok) { ignores.push(rel); continue; }
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
    console.log(`Stack détectée : ${r.stack.map(s => `${s.path} → ${s.technos.join(", ")}`).join(" ; ")}`);
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

/** Applique le kit à un projet existant sans écraser aucun fichier. */
export interface AuditApply {
  stack: StackEntry[];
  /** Fichiers d'entrée d'outils IA déjà présents avant installation. */
  outilsPresents: string[];
  /** Protections déjà en place (tests, lint, hooks, secrets, CI), détectées sans rien exécuter. */
  protections: string[];
  /** Fichiers qu'`apply` créerait. */
  crees: string[];
  /** Fichiers déjà présents, laissés tels quels (jamais écrasés). */
  conserves: string[];
  /** Parmi les conservés, ceux qui ont dérivé du modèle du kit (à comparer à la main). */
  derives: string[];
}

function protectionsExistantes(dir: string): string[] {
  const p: string[] = [];
  const present = (f: string) => existsSync(join(dir, f));
  try {
    const pkg = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
    for (const s of ["test", "lint", "typecheck"]) if (pkg.scripts?.[s]) p.push(`script npm « ${s} »`);
  } catch {}
  if (["eslint.config.js", "eslint.config.mjs", ".eslintrc", ".eslintrc.js", ".eslintrc.json", ".eslintrc.cjs"].some(present)) p.push("eslint");
  if (present("pyproject.toml") || present("ruff.toml")) p.push("configuration Python (pyproject/ruff)");
  if (present(".husky")) p.push("hooks husky");
  if (present(".pre-commit-config.yaml")) p.push("pre-commit");
  if (present(".gitleaks.toml") || present(".gitleaksignore")) p.push("gitleaks");
  if (present(".github/workflows")) p.push("GitHub Actions");
  if (present(".gitlab-ci.yml")) p.push("GitLab CI");
  try {
    const hooks = execFileSync("git", ["config", "core.hooksPath"], { cwd: dir, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
    if (hooks) p.push(`hooks git (core.hooksPath = ${hooks})`);
  } catch {}
  return p;
}

/** Aperçu d'`apply` (DRWIL-011) : audit du dépôt et liste exacte de ce qui serait créé, sans rien écrire. */
export async function auditerApply(opts: InitOptions): Promise<AuditApply> {
  const r = resolve(opts, stack => stack.map(s => s.path).filter(p => p !== "."));
  const outilsPresents = ["AGENTS.md", "CLAUDE.md", "GEMINI.md", ".cursor", ".github/copilot-instructions.md"].filter(f => existsSync(join(opts.targetDir, f)));
  const protections = protectionsExistantes(opts.targetDir);
  const derives: string[] = [];
  simulation = { crees: [], conserves: [], remplaces: [] };
  try {
    await scaffold(r, () => false, derives);
    const crees = [...simulation.crees];
    if (!readConfig(opts.targetDir)) crees.push(".drwil/ia-first.json");
    return { stack: r.stack, outilsPresents, protections, crees, conserves: simulation.conserves, derives };
  } finally {
    simulation = null;
  }
}

export function formaterAudit(a: AuditApply): string {
  const l = ["Analyse du dépôt…", ""];
  l.push("Détecté :");
  l.push(a.stack.length ? `  stack : ${a.stack.map(s => `${s.path} → ${s.technos.join(", ")}`).join(" ; ")}` : "  stack : non détectée");
  l.push(`  outils IA déjà présents : ${a.outilsPresents.length ? a.outilsPresents.join(", ") : "aucun"}`);
  l.push("", "Protections existantes :", ...(a.protections.length ? a.protections.map(p => `  ✓ ${p}`) : ["  aucune détectée"]));
  l.push("", `Serait ajouté (${a.crees.length} fichier(s)) :`, ...a.crees.map(f => `  + ${f}`));
  if (a.conserves.length) l.push("", `Déjà présents, laissés tels quels (${a.conserves.length}) :`, ...a.conserves.map(f => `  = ${f}${a.derives.includes(f) ? " (diffère du modèle du kit)" : ""}`));
  l.push("", "Rien ne sera écrasé.");
  return l.join("\n");
}

export async function apply(opts: InitOptions): Promise<void> {
  // Sur un projet existant, les couches sont les sous-dossiers où une stack a été trouvée.
  const r = resolve(opts, stack => stack.map(s => s.path).filter(p => p !== "."));
  const derives: string[] = [];
  const manifest: Record<string, string> = {};
  const attendus: string[] = [];
  const ancien = readManifest(opts.targetDir);
  await scaffold(r, () => false, derives, manifest, attendus);
  const obsoletes = await nettoyerObsoletes(opts.targetDir, ancien, attendus);
  await writeManifest(opts.targetDir, manifest, obsoletes);
  if (!readConfig(opts.targetDir)) await writeConfig(r);
  reportStack(r);
  reportDerives(derives);
  reportObsoletes(obsoletes);
  // On n'initialise pas de dépôt sur un projet existant : on active seulement les hooks s'il y en a un.
  if (opts.git !== false) setupGit(opts.targetDir, false);
}
