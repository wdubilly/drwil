import { mkdir, writeFile } from "node:fs/promises";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { fill, projectLang, type MessageLang } from "./i18n.js";
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
  /** CSV. Default: the subfolders where a stack is detected, else backend,frontend. */
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
export const KIT_MECHANICS = [".githooks/", ".claude/hooks/"];

export function isMechanics(rel: string): boolean {
  return KIT_MECHANICS.some((m) => rel.startsWith(m));
}

export const CI_FILES: Record<Ci, string[]> = { none: [], github: [".github/workflows/ia-first.yml"], gitlab: [".gitlab-ci.yml"] };

// Texts rendered into the template, in English like it: `lang` is the project's language, not the kit's.
export const TEXT = {
  // The project's language, as the AGENTS.md instruction names it to the agent.
  languages: { fr: "French", en: "English" } as Record<string, string>,
  description: "(to describe: what the application does, for whom)",
  layer: (l: string) => `- \`${l}/\` — see \`${l}/AGENTS.md\``,
  noLayer: "No separate layer: the code lives at the repository root.",
  stackNote: "Detected at install time from project files: to be confirmed by the user.",
  stackUndecided: "Not decided. The user chooses it; an AI proposes one and waits for approval before writing application code.",
  ciLine: (f: string) => ` and in CI (\`${f}\`)`,
  dirs: {
    projects: "docs/projects",
    intentions: "docs/intentions",
    recipes: "docs/recipes",
    contracts: "docs/contracts.md",
    index: "docs/projects/pending.md",
  },
};

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
function ciFromConfig(config: Record<string, unknown>): string | undefined {
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

export async function writeConfig(r: Resolved): Promise<void> {
  const previous = readConfig(r.opts.targetDir);
  // Settings entered by the project: kept as they are; those derived from an option (CI files) are
  // only recomputed if the option changed.
  const keep = (key: string, fallback: string[]) => (Array.isArray(previous?.[key]) ? (previous[key] as string[]) : fallback);
  const config = {
    // Project-specific keys, unknown to the kit: never lost.
    ...previous,
    projectName: projectName(r),
    projectShort: r.opts.short ?? projectName(r),
    lang: r.lang,
    layers: r.layers,
    contractPrefixes: splitCsv(r.opts.contractPrefixes ?? "SEC,QUA"),
    tools: r.tools,
    ci: r.ci,
    // An installed project's folders do not move with its language: its briefs live there.
    dirs: previous?.dirs ?? TEXT.dirs,
    stack: r.stack,
    // The project's checks are entered by the user or the AI: a reinstall must not erase them.
    checks: Array.isArray(previous?.checks) ? previous.checks : [],
    // Severity of the scope reminder (QUA-016 only): "blocking" | "warning" | "off". Default
    // "blocking"; a value already chosen by the project is never overwritten by a reinstall.
    scopeReminder: typeof previous?.scopeReminder === "string" ? previous.scopeReminder : "blocking",
    // Transitions of the governance state (.githooks/state.mjs): "human" (opening and starting
    // require an interactive terminal) | "agent". Never overwritten.
    transitions: typeof previous?.transitions === "string" ? previous.transitions : "human",
    // Scope gate of the active brief (.githooks/scope-gate.mjs): "off" | "warning" | "blocking".
    // "warning" at install time: the project sees the gaps before hardening.
    scopeGate: typeof previous?.scopeGate === "string" ? previous.scopeGate : "warning",
    // Requirements added by a kit version later than the install (today: a cited path that only
    // exists as a file ignored by Git): "blocking" for a fresh install, "warning" for an already
    // equipped project that does not have this setting yet — an update never breaks a commit
    // that used to pass. Never overwritten afterwards.
    newRequirements: typeof previous?.newRequirements === "string" ? previous.newRequirements : previous ? "warning" : "blocking",
    layerPrefixes: keep("layerPrefixes", ["app", "tests", "src", "scripts"]),
    codePrefixes: keep("codePrefixes", ["scripts", ".githooks", "e2e"]),
    extraCodeFiles: keep("extraCodeFiles", []),
    extraCodeGlobs: keep("extraCodeGlobs", ["docker-compose*.yml"]),
    ciFiles: previous && ciFromConfig(previous) === r.ci ? keep("ciFiles", CI_FILES[r.ci]) : CI_FILES[r.ci],
    mode: r.mode,
  };
  await mkdir(join(r.opts.targetDir, ".drwil"), { recursive: true });
  await writeFile(join(r.opts.targetDir, ".drwil", "ia-first.json"), JSON.stringify(config, null, 2) + "\n");
}
