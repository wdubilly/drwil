import { mkdir, readFile, writeFile, readdir, chmod } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { basename, dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import type { StackEntry } from "./stack.js";
import { CI_FILES, projectName, splitCsv, TEXT, type Resolved } from "./config.js";
import { sha256 } from "./manifest.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
export const templatesDir = join(dirname(__dirname), "templates");

// Layers with a dedicated template in templates/common/layers; the others get generic.md.
const LAYER_TEMPLATES = ["backend", "frontend"];

// Test/lint commands allowed by default in .claude/settings.json, according to the detected technology
// (a model the project completes).
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
  const commands = [...technos].flatMap((t) => STACK_ALLOW[t]);
  return commands.map((c) => `,\n      "Bash(${c})"`).join("");
}

export function render(content: string, r: Resolved, extra: Record<string, string> = {}): string {
  const t = TEXT;
  const stack = r.stack.length
    ? `${r.stack.map((s) => `- \`${s.path === "." ? "./" : s.path + "/"}\` : ${s.technos.join(", ")}`).join("\n")}\n\n${t.stackNote}`
    : t.stackUndecided;
  const ciFile = CI_FILES[r.ci][0];
  const values: Record<string, string> = {
    projectName: projectName(r),
    projectShort: r.opts.short ?? projectName(r),
    lang: r.lang,
    projectLanguage: t.languages[r.lang],
    layersCsv: r.layers.join(","),
    layersList: r.layers.length ? r.layers.map(t.layer).join("\n") : t.noLayer,
    contractPrefixesCsv: splitCsv(r.opts.contractPrefixes ?? "SEC,QUA").join(","),
    description: r.opts.description ?? t.description,
    stack,
    ciLine: ciFile ? t.ciLine(ciFile) : "",
    indexFile: t.dirs.index,
    date: new Date().toISOString().slice(0, 10),
    // Kit files to cover by the scope block of kit-mechanics.md (empty lines if absent).
    scopeCi: ciFile ? `  - ${ciFile}` : "",
    scopeClaude: r.tools.includes("claude") ? "  - .claude/settings.json" : "",
    stackAllowJson: stackAllow(r.stack),
    ...extra,
  };
  // Replacement by function: a value containing "$&" or "$1" must stay literal.
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

/** `shouldOverwrite` receives the target path relative to the project root. */
export type Overwrite = (relTarget: string) => boolean;

// Compares an already present file (not rewritten) to the template's content: report only, never
// an automatic rewrite. Deliberately coarse criterion (line count + missing `##` sections), not a
// full diff.
function hasDrifted(target: string, templateContent: string): boolean {
  const existing = readFileSync(target, "utf8");
  if (existing === templateContent) return false;
  const lines = (s: string) => s.split(/\r?\n/).length;
  const sections = (s: string) => new Set(s.match(/^##[^\n]*$/gm) ?? []);
  const templateSections = sections(templateContent);
  const existingSections = sections(existing);
  const missingSection = [...templateSections].some((s) => !existingSections.has(s));
  return lines(existing) !== lines(templateContent) || missingSection;
}

/** Relative path with `/` separators, so that comparisons (prefixes, manifest) do not depend on
 * the OS: `path.relative` returns `\` on Windows. */
export function relPosix(from: string, to: string): string {
  return relative(from, to).replace(/\\/g, "/");
}

/** What the walk of the template does with each file, and what it records. */
export interface WriteOptions {
  shouldOverwrite: Overwrite;
  drifted?: string[];
  manifest?: Record<string, string>;
  expected?: string[];
  // Preview of `init` (DRWIL-011): the same walk as the real install, but writeOut records each file
  // instead of writing it. The preview therefore cannot diverge from what init would do.
  simulation?: { created: string[]; kept: string[]; replaced: string[] };
}

async function writeOut(target: string, content: string, targetDir: string, w: WriteOptions): Promise<void> {
  const { shouldOverwrite, drifted, manifest, expected, simulation } = w;
  const rel = relPosix(targetDir, target);
  if (expected) expected.push(rel);
  if (existsSync(target) && !shouldOverwrite(rel)) {
    if (drifted && hasDrifted(target, content)) drifted.push(rel);
    if (simulation) simulation.kept.push(rel);
    return;
  }
  if (simulation) {
    (existsSync(target) ? simulation.replaced : simulation.created).push(rel);
    return;
  }
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, content);
  if (manifest) manifest[rel] = sha256(content);
  // commit-msg deliberately stays non-executable (shipped but disabled by default).
  if (target.endsWith(".mjs") || ["pre-commit", "pre-push", "prepare-commit-msg"].includes(basename(target))) {
    try {
      await chmod(target, 0o755);
    } catch {}
  }
}

// npm removes any `.gitignore` file from a published package: the template ships it under another
// name, rendered here under its real name (the manifest and the drift only see the final name).
const SHIPPED_NAMES: Record<string, string> = { gitignore: ".gitignore" };

/** Copies a template folder to the target's root, rendering the variables. */
async function copyTree(srcDir: string, r: Resolved, w: WriteOptions): Promise<void> {
  for (const file of await walk(srcDir)) {
    const rel = relative(srcDir, file);
    const name = SHIPPED_NAMES[basename(rel)];
    const target = join(r.opts.targetDir, name ? join(dirname(rel), name) : rel);
    await writeOut(target, render(await readFile(file, "utf8"), r), r.opts.targetDir, w);
  }
}

export async function scaffold(r: Resolved, w: WriteOptions): Promise<void> {
  // A single template, in English: the project's language no longer chooses files.
  const template = join(templatesDir, "common");
  await copyTree(join(template, "base"), r, w);
  for (const tool of r.tools) await copyTree(join(template, "tools", tool), r, w);
  await copyTree(join(template, "ci", r.ci), r, w);

  for (const layer of r.layers) {
    const specific = join(template, "layers", `${layer}.md`);
    const source = LAYER_TEMPLATES.includes(layer) && existsSync(specific) ? specific : join(template, "layers", "generic.md");
    const up = "../".repeat(layer.split("/").filter(Boolean).length);
    const content = render(await readFile(source, "utf8"), r, { layer }).replace("`../AGENTS.md`", `\`${up}AGENTS.md\``);
    await writeOut(join(r.opts.targetDir, layer, "AGENTS.md"), content, r.opts.targetDir, w);
  }

  // A single instruction content (AGENTS.md); the tools that do not read it natively get an import.
  const pointers = [r.tools.includes("claude") && "CLAUDE.md", r.tools.includes("gemini") && "GEMINI.md"].filter(Boolean) as string[];
  for (const dir of [".", ...r.layers]) {
    for (const p of pointers) await writeOut(join(r.opts.targetDir, dir, p), "@AGENTS.md\n", r.opts.targetDir, w);
  }
}
