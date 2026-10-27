import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { fill, projectLang, type MessageLang } from "./i18n.js";
import { TEXT } from "./config-text.js";
import { detectStack, type StackEntry } from "./stack.js";

export const LANGS = ["fr", "en"] as const;
export const TOOLS = ["claude", "codex", "cursor", "gemini", "copilot"] as const;
export const CIS = ["none", "github", "gitlab"] as const;
export type Lang = (typeof LANGS)[number];
export type Tool = (typeof TOOLS)[number];
export type Ci = (typeof CIS)[number];

export interface InitOptions {
  targetDir: string;
  name?: string;
  short?: string;
  lang?: string;
  /** CSV. Default: the subfolders where a stack is detected, else none (declared once the stack is chosen). */
  layers?: string;
  contractPrefixes?: string;
  mode?: string;
  description?: string;
  git?: boolean;
  /** CSV among TOOLS. Default: all. */
  tools?: string;
  ci?: string;
  /** `init` only: rewrites everything (otherwise only the kit mechanics, KIT_MECHANICS, are rewritten). */
  force?: boolean;
}

/** Folders whose content `init` refreshes by default: the kit mechanics, not the project's docs. */
export const KIT_MECHANICS = [".githooks/", ".claude/hooks/", ".github/hooks/"];

/**
 * Copilot CLI reads .claude/ (settings, hooks, skills) itself: the tree is installed for it too. Gemini CLI
 * runs the same hook scripts (one set for every tool) from its own .gemini/settings.json.
 */
export const usesClaudeTree = (tools: readonly string[]): boolean => ["claude", "copilot", "gemini"].some((t) => tools.includes(t));

export function isMechanics(rel: string): boolean {
  return KIT_MECHANICS.some((m) => rel.startsWith(m));
}

/**
 * The kit's prose and settings, refreshed by `init` only when recorded in the manifest and never
 * modified since: never the project's own documents (README, map, registry, briefs, layers'
 * AGENTS.md…), even unchanged. A folder ends with `/`; anything else is an exact path. Not CLAUDE.md
 * nor GEMINI.md: a fixed `@AGENTS.md` pointer that never changes, which complete.ts extends when the
 * project has its own AGENTS.md — refreshing it would only undo and redo that block at each init.
 */
export const KIT_PROSE = [
  ".claude/skills/",
  ".claude/settings.json",
  ".gemini/settings.json",
  "docs/recipes/",
  "docs/ia-first.md",
  "AGENTS.md",
  ".cursor/",
  ".github/copilot-instructions.md",
  ".github/instructions/",
  "docs/contracts-catalog.md",
  "docs/intentions/README.md",
];

export function isKitProse(rel: string): boolean {
  return KIT_PROSE.some((p) => (p.endsWith("/") ? rel.startsWith(p) : rel === p));
}

export { TEXT };
export const CI_FILES: Record<Ci, string[]> = { none: [], github: [".github/workflows/ia-first.yml"], gitlab: [".gitlab-ci.yml"] };

export interface Resolved {
  opts: InitOptions;
  lang: Lang;
  layers: string[];
  tools: Tool[];
  ci: Ci;
  mode: "minimal" | "full";
  stack: StackEntry[];
}

export function splitCsv(s?: string) {
  return (s ?? "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

const TEXTS = {
  fr: {
    unknownValue: "--{0} : valeur « {1} » inconnue (attendu : {2})",
    notInitialised: "projet non initialisé ({0} introuvable) : lancer « drwil init » d'abord",
  },
  en: {
    unknownValue: '--{0}: unknown value "{1}" (expected: {2})',
    notInitialised: 'project not initialised ({0} not found): run "drwil init" first',
  },
};

export function pick<T extends string>(value: string, allowed: readonly T[], option: string, lang: MessageLang = "en"): T {
  if (!(allowed as readonly string[]).includes(value)) {
    throw new Error(fill(TEXTS[lang].unknownValue, option, value, allowed.join(", ")));
  }
  return value as T;
}

const csv = (v: unknown) => (Array.isArray(v) ? v.join(",") : undefined);
const text = (v: unknown) => (typeof v === "string" ? v : undefined);

/** CI of an existing config: its `ci` key, otherwise deduced from `ciFiles` (configs older than the key). */
export function ciFromConfig(config: Record<string, unknown>): string | undefined {
  if (typeof config.ci === "string") return config.ci;
  const first = Array.isArray(config.ciFiles) ? config.ciFiles[0] : undefined;
  return first === undefined ? undefined : CIS.find((c) => CI_FILES[c][0] === first);
}

/** CI already used by the project: an install never ignores it (QUA-013 would report "no CI"). */
export function detectCi(targetDir: string): Ci | undefined {
  try {
    if (readdirSync(join(targetDir, ".github", "workflows")).some((f) => /\.ya?ml$/.test(f))) return "github";
  } catch {}
  return existsSync(join(targetDir, ".gitlab-ci.yml")) ? "gitlab" : undefined;
}

/**
 * On an already installed project, a missing option takes the value of its config: running the
 * install again to update the kit never resets a chosen setting to its default. A given option
 * always wins.
 */
export function resolve(opts: InitOptions, defaultLayers: (stack: StackEntry[]) => string[]): Resolved {
  const stack = detectStack(opts.targetDir);
  const previous = readConfig(opts.targetDir) ?? {};
  const lang = projectLang(opts.targetDir);
  const merged: InitOptions = {
    ...opts,
    name: opts.name ?? text(previous.projectName),
    short: opts.short ?? text(previous.projectShort),
    contractPrefixes: opts.contractPrefixes ?? csv(previous.contractPrefixes),
  };
  const layers = opts.layers ?? csv(previous.layers);
  return {
    opts: merged,
    lang: pick(opts.lang ?? text(previous.lang) ?? "en", LANGS, "lang", lang),
    tools: splitCsv(opts.tools ?? csv(previous.tools) ?? TOOLS.join(",")).map((t) => pick(t, TOOLS, "tools", lang)),
    ci: pick(opts.ci ?? ciFromConfig(previous) ?? detectCi(opts.targetDir) ?? "none", CIS, "ci", lang),
    mode: pick(opts.mode ?? text(previous.mode) ?? "full", ["minimal", "full"] as const, "mode", lang),
    layers: layers !== undefined ? splitCsv(layers) : defaultLayers(stack),
    stack,
  };
}

export function projectName(r: Resolved): string {
  return r.opts.name ?? basename(r.opts.targetDir);
}

// Rebuilds a minimal `Resolved` from the config already written by init(), to read its
// decisions again (lang, tools, ci, stack...) without running the stack detection again.
export function resolveFromConfig(targetDir: string): Resolved {
  const config = readConfig(targetDir);
  if (!config) throw new Error(fill(TEXTS.en.notInitialised, join(targetDir, ".drwil", "ia-first.json")));
  const opts: InitOptions = {
    targetDir,
    name: config.projectName as string | undefined,
    short: config.projectShort as string | undefined,
    contractPrefixes: Array.isArray(config.contractPrefixes) ? (config.contractPrefixes as string[]).join(",") : undefined,
  };
  return {
    opts,
    lang: pick((config.lang as string) ?? "en", LANGS, "lang"),
    layers: Array.isArray(config.layers) ? (config.layers as string[]) : [],
    tools: Array.isArray(config.tools) ? (config.tools as string[]).map((t) => pick(t, TOOLS, "tools")) : [],
    ci: pick((config.ci as string) ?? "none", CIS, "ci"),
    mode: pick((config.mode as string) ?? "full", ["minimal", "full"] as const, "mode"),
    stack: Array.isArray(config.stack) ? (config.stack as StackEntry[]) : [],
  };
}

export function readConfig(targetDir: string): Record<string, unknown> | null {
  try {
    return JSON.parse(readFileSync(join(targetDir, ".drwil", "ia-first.json"), "utf8"));
  } catch {
    return null;
  }
}
