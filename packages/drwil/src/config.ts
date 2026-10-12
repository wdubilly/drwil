import { mkdir, writeFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { basename, join } from "node:path";
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
export const KIT_MECHANICS = ".githooks/";

export const CI_FILES: Record<Ci, string[]> = { none: [], github: [".github/workflows/ia-first.yml"], gitlab: [".gitlab-ci.yml"] };

// Textes rendus dans le gabarit, en anglais comme lui : `lang` dit la langue du projet, pas celle du kit.
export const TEXT = {
  // Langue du projet, telle que la consigne de AGENTS.md la nomme à l'agent.
  langues: { fr: "French", en: "English" } as Record<string, string>,
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

export function pick<T extends string>(value: string, allowed: readonly T[], option: string): T {
  if (!(allowed as readonly string[]).includes(value)) {
    throw new Error(`--${option} : valeur « ${value} » inconnue (attendu : ${allowed.join(", ")})`);
  }
  return value as T;
}

const csv = (v: unknown) => (Array.isArray(v) ? v.join(",") : undefined);
const texte = (v: unknown) => (typeof v === "string" ? v : undefined);

/** CI d'une config existante : sa clé `ci`, sinon déduite de `ciFiles` (configs antérieures à la clé). */
function ciDeConfig(config: Record<string, unknown>): string | undefined {
  if (typeof config.ci === "string") return config.ci;
  const premier = Array.isArray(config.ciFiles) ? config.ciFiles[0] : undefined;
  return premier === undefined ? undefined : CIS.find((c) => CI_FILES[c][0] === premier);
}

/**
 * Sur un projet déjà installé, une option absente prend la valeur de sa config : relancer
 * l'installation pour mettre le kit à jour ne remet jamais un réglage choisi à son défaut
 * (docs/projets/init-preserve-config.md). Une option passée l'emporte toujours.
 */
export function resolve(opts: InitOptions, defaultLayers: (stack: StackEntry[]) => string[]): Resolved {
  const stack = detectStack(opts.targetDir);
  const previous = readConfig(opts.targetDir) ?? {};
  const merged: InitOptions = {
    ...opts,
    name: opts.name ?? texte(previous.projectName),
    short: opts.short ?? texte(previous.projectShort),
    contractPrefixes: opts.contractPrefixes ?? csv(previous.contractPrefixes),
  };
  const layers = opts.layers ?? csv(previous.layers);
  return {
    opts: merged,
    lang: pick(opts.lang ?? texte(previous.lang) ?? "en", LANGS, "lang"),
    tools: splitCsv(opts.tools ?? csv(previous.tools) ?? TOOLS.join(",")).map((t) => pick(t, TOOLS, "tools")),
    ci: pick(opts.ci ?? ciDeConfig(previous) ?? "none", CIS, "ci"),
    mode: pick(opts.mode ?? texte(previous.mode) ?? "full", ["minimal", "full"] as const, "mode"),
    layers: layers !== undefined ? splitCsv(layers) : defaultLayers(stack),
    stack,
  };
}

export function projectName(r: Resolved): string {
  return r.opts.name ?? basename(r.opts.targetDir);
}

// Reconstruit un `Resolved` minimal à partir de la config déjà écrite par init()/apply(), pour
// relire ses décisions (lang, tools, ci, stack...) sans ré-exécuter la détection de pile — lot 2,
// docs/projets/apply-rafraichit-mecanique.md.
export function resolveFromConfig(targetDir: string): Resolved {
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
  // Réglages saisis par le projet : repris tels quels ; ceux qui découlent d'une option (dossiers de
  // la langue, fichiers de la CI) ne sont recalculés que si l'option a changé.
  const garde = (cle: string, defaut: string[]) => (Array.isArray(previous?.[cle]) ? (previous[cle] as string[]) : defaut);
  const config = {
    // Clés propres au projet, inconnues du kit : jamais perdues.
    ...previous,
    projectName: projectName(r),
    projectShort: r.opts.short ?? projectName(r),
    lang: r.lang,
    layers: r.layers,
    contractPrefixes: splitCsv(r.opts.contractPrefixes ?? "SEC,QUA"),
    tools: r.tools,
    ci: r.ci,
    // Les dossiers d'un projet installé ne bougent pas avec sa langue : leurs fiches y vivent.
    dirs: previous?.dirs ?? TEXT.dirs,
    stack: r.stack,
    // Les contrôles du projet sont saisis par l'utilisateur ou l'IA : une réinstallation ne doit pas les effacer.
    checks: Array.isArray(previous?.checks) ? previous.checks : [],
    // Sévérité du rappel de cadrage (QUA-016 seul) : "blocking" | "warning" | "off".
    // Défaut "blocking" (docs/projets/garde-fous-depot.md) ; une valeur déjà choisie par le projet
    // n'est jamais écrasée par une réinstallation.
    scopeReminder: typeof previous?.scopeReminder === "string" ? previous.scopeReminder : "blocking",
    // Transitions de l'état de gouvernance (.githooks/state.mjs) : "human" (ouvrir, lancer la
    // réalisation et clore exigent un terminal interactif) | "agent". Jamais écrasé.
    transitions: typeof previous?.transitions === "string" ? previous.transitions : "human",
    // Barrière de périmètre de l'attente (.githooks/scope-gate.mjs) : "off" | "warning" |
    // "blocking". "warning" à l'installation : le projet voit les écarts avant de durcir.
    scopeGate: typeof previous?.scopeGate === "string" ? previous.scopeGate : "warning",
    // Exigences ajoutées par une version du kit postérieure à l'installation (aujourd'hui : chemin
    // cité qui n'existe que comme fichier ignoré par Git) : "blocking" pour une installation neuve,
    // "warning" pour un projet déjà équipé qui n'a pas encore ce réglage — une mise à jour ne
    // casse jamais un commit qui passait. Jamais écrasé ensuite.
    newRequirements: typeof previous?.newRequirements === "string" ? previous.newRequirements : previous ? "warning" : "blocking",
    layerPrefixes: garde("layerPrefixes", ["app", "tests", "src", "scripts"]),
    codePrefixes: garde("codePrefixes", ["scripts", ".githooks", "e2e"]),
    extraCodeFiles: garde("extraCodeFiles", []),
    extraCodeGlobs: garde("extraCodeGlobs", ["docker-compose*.yml"]),
    ciFiles: previous && ciDeConfig(previous) === r.ci ? garde("ciFiles", CI_FILES[r.ci]) : CI_FILES[r.ci],
    mode: r.mode,
  };
  await mkdir(join(r.opts.targetDir, ".drwil"), { recursive: true });
  await writeFile(join(r.opts.targetDir, ".drwil", "ia-first.json"), JSON.stringify(config, null, 2) + "\n");
}
