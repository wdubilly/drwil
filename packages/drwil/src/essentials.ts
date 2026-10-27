// What drwil needs inside files `init` keeps as they are (a project file is never overwritten):
// found missing here, reported with their fix by `init`, its preview and `doctor`, never silently.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { CI_FILES, type Resolved, usesClaudeTree } from "./config.js";
import { render, templatesDir } from "./render.js";
import { hooksPath, scriptsDir, unchainedHooks } from "./essentials-hooks.js";

export { formatGaps, describeGap } from "./essentials-format.js";
export { hooksPath, scriptsDir, unchainedHooks } from "./essentials-hooks.js";

/** Delimiters of what drwil adds to a project file: `uninstall` removes exactly this block. */
export const MARKERS = {
  hash: { begin: "# >>> drwil", end: "# <<< drwil" },
  html: { begin: "<!-- >>> drwil -->", end: "<!-- <<< drwil -->" },
};

/** drwil instructions written aside when the project already has its own AGENTS.md. */
export const DEDICATED_AGENTS = ".drwil/AGENTS.md";

export type GapKind = "lines" | "instructions" | "pointer" | "settings" | "gitleaks" | "ci" | "hooksPath" | "unreadable";

/** Gaps `init` fills by itself (complete.ts); the others stay for the human. */
export const AUTO_KINDS: ReadonlySet<GapKind> = new Set(["lines", "instructions", "pointer", "settings", "gitleaks"]);

export interface Gap {
  /** File (relative to the project root), or `core.hooksPath` for the git setting. */
  file: string;
  kind: GapKind;
  /** What is missing, one entry per line to show. */
  missing: string[];
  /** Lines to paste (or commands to run) to fix it. */
  fix: string[];
}

export function templateFile(rel: string): string {
  return readFileSync(join(templatesDir, "common", rel), "utf8");
}

/** Lines of the delimited block of a text (markers included), empty if there is none. */
export function blockOf(content: string, begin: string, end: string): string[] {
  const lines = content.split(/\r?\n/);
  const from = lines.findIndex((l) => l.startsWith(begin));
  const to = lines.findIndex((l, i) => i > from && l.startsWith(end));
  return from < 0 || to < 0 ? [] : lines.slice(from, to + 1);
}

/** Entries of the template's .gitignore drwil block (comments left out). */
export function requiredIgnores(): string[] {
  return blockOf(templateFile("base/gitignore"), MARKERS.hash.begin, MARKERS.hash.end).filter((l) => l.trim() && !l.startsWith("#"));
}

// `/.env` and `.env` both ignore the root's file: either one is enough.
const norm = (l: string) => l.trim().replace(/^\//, "");
function missingLines(content: string, required: string[]): string[] {
  const have = new Set(content.split(/\r?\n/).map(norm));
  return required.filter((l) => !have.has(norm(l)));
}

/** Instructions written aside: already there, or about to be (`init` writes them before the imports). */
export function dedicatedAgents(targetDir: string): boolean {
  const agents = join(targetDir, "AGENTS.md");
  return existsSync(join(targetDir, DEDICATED_AGENTS)) || (existsSync(agents) && !hasInstructions(readFileSync(agents, "utf8")));
}

/** Imports a CLAUDE.md or GEMINI.md needs: AGENTS.md, and the instructions written aside if any. */
export function requiredImports(targetDir: string, layer: string): string[] {
  const own = ["@AGENTS.md"];
  return layer === "." && dedicatedAgents(targetDir) ? [...own, `@${DEDICATED_AGENTS}`] : own;
}

/** The project's AGENTS.md carries the drwil instructions, or points to those written aside. */
export function hasInstructions(content: string): boolean {
  return content.includes(".githooks/state.mjs") || content.includes(DEDICATED_AGENTS);
}

interface HookEntry {
  matcher?: string;
  hooks: { type: string; command: string }[];
}
export type Settings = { hooks?: Record<string, HookEntry[]>; permissions?: Record<string, unknown> } & Record<string, unknown>;

/** The kit's Claude Code settings, rendered for this project. */
export function kitSettings(r: Resolved): Settings {
  return JSON.parse(render(templateFile("tools/claude/.claude/settings.json"), r));
}

const hasHook = (entries: HookEntry[] | undefined, matcher: string | undefined, command: string) =>
  (entries ?? []).some((e) => e.matcher === matcher && e.hooks?.some((h) => h.command === command));

/** Hooks and permissions of the kit missing from the project's settings, as `kind: value`. */
export function missingSettings(own: Settings, kit: Settings, kinds = ["ask", "deny"]): string[] {
  const missing: string[] = [];
  for (const [event, entries] of Object.entries(kit.hooks ?? {}))
    for (const e of entries)
      for (const h of e.hooks)
        if (!hasHook(own.hooks?.[event], e.matcher, h.command)) missing.push(`${event}${e.matcher ? ` (${e.matcher})` : ""}: ${h.command}`);
  for (const kind of kinds) {
    const have = new Set((own.permissions?.[kind] as string[] | undefined) ?? []);
    for (const p of (kit.permissions?.[kind] as string[] | undefined) ?? []) if (!have.has(p)) missing.push(`${kind}: ${p}`);
  }
  return missing;
}

/** Lines of a YAML job of the template (the `checks:` key and its indented body). */
export function templateJob(ciTemplate: string, job: string): string[] {
  const lines = ciTemplate.split(/\r?\n/);
  const start = lines.findIndex((l) => new RegExp(`^\\s*${job}:\\s*$`).test(l));
  if (start < 0) return [];
  const indent = lines[start].search(/\S/);
  const out = [lines[start]];
  for (const l of lines.slice(start + 1)) {
    if (l.trim() && l.search(/\S/) <= indent) break;
    out.push(l);
  }
  while (out.length && !out[out.length - 1].trim()) out.pop();
  return out;
}

const CI_TEMPLATES: Record<string, string> = { github: "ci/github/.github/workflows/ia-first.yml", gitlab: "ci/gitlab/.gitlab-ci.yml" };

const read = (targetDir: string, rel: string) => readFileSync(join(targetDir, rel), "utf8");

/** Everything drwil needs that is missing from the project's files, with its fix. */
export function findGaps(r: Resolved): Gap[] {
  const dir = r.opts.targetDir;
  const gaps: Gap[] = [];
  const present = (rel: string) => existsSync(join(dir, rel));

  if (present(".gitignore")) {
    const missing = missingLines(read(dir, ".gitignore"), requiredIgnores());
    if (missing.length) gaps.push({ file: ".gitignore", kind: "lines", missing, fix: [MARKERS.hash.begin, ...missing, MARKERS.hash.end] });
  }

  if (present("AGENTS.md") && !hasInstructions(read(dir, "AGENTS.md")))
    gaps.push({ file: "AGENTS.md", kind: "instructions", missing: [], fix: ["npx drwil init"] });

  const pointers = (["claude", "gemini"] as const)
    .filter((t) => r.tools.includes(t))
    .map((t) => (t === "claude" ? "CLAUDE.md" : "GEMINI.md"));
  for (const layer of [".", ...r.layers])
    for (const p of pointers) {
      const rel = layer === "." ? p : `${layer}/${p}`;
      if (!present(rel)) continue;
      const missing = missingLines(read(dir, rel), requiredImports(dir, layer));
      if (missing.length) gaps.push({ file: rel, kind: "lines", missing, fix: [MARKERS.html.begin, ...missing, MARKERS.html.end] });
    }

  const readers: [string, string][] = [
    ["copilot", ".github/copilot-instructions.md"],
    ["cursor", ".cursor/rules/ia-first.mdc"],
  ];
  for (const [tool, rel] of readers)
    if (r.tools.includes(tool as never) && present(rel) && !read(dir, rel).includes("AGENTS.md"))
      gaps.push({ file: rel, kind: "pointer", missing: [], fix: [pointerLine()] });

  if (usesClaudeTree(r.tools) && present(".claude/settings.json")) {
    try {
      const missing = missingSettings(JSON.parse(read(dir, ".claude/settings.json")), kitSettings(r));
      if (missing.length) gaps.push({ file: ".claude/settings.json", kind: "settings", missing, fix: ["npx drwil init"] });
    } catch (e) {
      gaps.push({ file: ".claude/settings.json", kind: "unreadable", missing: [(e as Error).message], fix: [] });
    }
  }

  if (present(".gitleaks.toml") && !read(dir, ".gitleaks.toml").includes("installed-files"))
    gaps.push({ file: ".gitleaks.toml", kind: "gitleaks", missing: [], fix: gitleaksBlock() });

  for (const f of CI_FILES[r.ci])
    if (present(f) && !read(dir, f).includes(".githooks/run-checks.mjs"))
      gaps.push({ file: f, kind: "ci", missing: [], fix: templateJob(templateFile(CI_TEMPLATES[r.ci]), "checks") });

  const path = hooksPath(dir);
  if (path && path !== ".githooks") {
    const unchained = unchainedHooks(dir, path);
    if (unchained.length)
      gaps.push({
        file: `core.hooksPath = ${path}`,
        kind: "hooksPath",
        missing: unchained,
        fix: [...unchained.map((h) => `${scriptsDir(path)}/${h}: .githooks/${h} "$@" || exit $?`), "git config core.hooksPath .githooks"],
      });
  }
  return gaps;
}

/** The single line by which a tool's instruction file points to AGENTS.md, taken from the template. */
export function pointerLine(): string {
  return templateFile("tools/copilot/.github/copilot-instructions.md").trim().split(/\r?\n/)[0];
}

/** Allowlist block of the template's .gitleaks.toml (its `[allowlist]` table). */
export function gitleaksBlock(): string[] {
  const lines = templateFile("base/.gitleaks.toml").split(/\r?\n/);
  const from = lines.findIndex((l) => l.trim() === "[allowlist]");
  const to = lines.findIndex((l, i) => i > from && l.trim() === "]");
  return lines.slice(from, to + 1);
}
