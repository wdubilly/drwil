import { existsSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import type { StackEntry } from "./stack.js";
import { readConfig, type InitOptions } from "./config.js";
import { fill, projectLang, type MessageLang } from "./i18n.js";
import { installChoices } from "./install.js";
import { scaffold } from "./render.js";
import { formatMigration, migrate, type MigrationPlan } from "./migration.js";

/** Preview of `drwil init --dry-run`: what the installation would do, writing nothing. */
export interface InitPreview {
  lang: MessageLang;
  stack: StackEntry[];
  /** Entry files of AI tools already present before installation. */
  aiTools: string[];
  /** Protections already in place (tests, lint, hooks, secrets, CI), detected without running anything. */
  protections: string[];
  /** Files `init` would create. */
  created: string[];
  /** Kit mechanics `init` would refresh (unchanged since their installation). */
  replaced: string[];
  /** Files already present, left as they are (never overwritten). */
  kept: string[];
  /** Among the kept ones, those that drifted from the kit's template (to compare by hand). */
  drifted: string[];
  /** Migration of the old format `init` would run first (dry run, nothing written). */
  migration: MigrationPlan;
}

const TEXTS = {
  fr: {
    npmScript: "script npm « {0} »",
    python: "configuration Python (pyproject/ruff)",
    huskyHooks: "hooks husky",
    gitHooks: "hooks git (core.hooksPath = {0})",
    analysing: "Analyse du dépôt…",
    detected: "Détecté :",
    stack: "  stack : {0}",
    noStack: "  stack : non détectée",
    aiTools: "  outils IA déjà présents : {0}",
    none: "aucun",
    protections: "Protections existantes :",
    noProtection: "  aucune détectée",
    added: "Serait ajouté ({0} fichier(s)) :",
    replaced: "Mécanique du kit rafraîchie ({0} fichier(s)) :",
    kept: "Déjà présents, laissés tels quels ({0}) :",
    drifted: " (diffère du modèle du kit)",
    nothingOverwritten: "Rien d'autre ne sera écrasé : un fichier modifié à la main est signalé, jamais réécrit.",
  },
  en: {
    npmScript: 'npm script "{0}"',
    python: "Python configuration (pyproject/ruff)",
    huskyHooks: "husky hooks",
    gitHooks: "git hooks (core.hooksPath = {0})",
    analysing: "Analysing the repository…",
    detected: "Detected:",
    stack: "  stack: {0}",
    noStack: "  stack: not detected",
    aiTools: "  AI tools already present: {0}",
    none: "none",
    protections: "Existing protections:",
    noProtection: "  none detected",
    added: "Would be added ({0} file(s)):",
    replaced: "Kit mechanics refreshed ({0} file(s)):",
    kept: "Already present, left as they are ({0}):",
    drifted: " (differs from the kit's template)",
    nothingOverwritten: "Nothing else will be overwritten: a file modified by hand is reported, never rewritten.",
  },
};

function existingProtections(dir: string, lang: MessageLang): string[] {
  const T = TEXTS[lang];
  const p: string[] = [];
  const present = (f: string) => existsSync(join(dir, f));
  try {
    const pkg = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
    for (const s of ["test", "lint", "typecheck"]) if (pkg.scripts?.[s]) p.push(fill(T.npmScript, s));
  } catch {}
  if (["eslint.config.js", "eslint.config.mjs", ".eslintrc", ".eslintrc.js", ".eslintrc.json", ".eslintrc.cjs"].some(present))
    p.push("eslint");
  if (present("pyproject.toml") || present("ruff.toml")) p.push(T.python);
  if (present(".husky")) p.push(T.huskyHooks);
  if (present(".pre-commit-config.yaml")) p.push("pre-commit");
  if (present(".gitleaks.toml") || present(".gitleaksignore")) p.push("gitleaks");
  if (present(".github/workflows")) p.push("GitHub Actions");
  if (present(".gitlab-ci.yml")) p.push("GitLab CI");
  try {
    const hooks = execFileSync("git", ["config", "core.hooksPath"], {
      cwd: dir,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    if (hooks) p.push(fill(T.gitHooks, hooks));
  } catch {}
  return p;
}

/** Preview of `init` (DRWIL-011): audit of the repository and exact list of what would be written, writing nothing. */
export async function previewInit(opts: InitOptions): Promise<InitPreview> {
  // The language asked for (`--lang`) wins: on a project not installed yet, there is no config to read.
  const lang: MessageLang = opts.lang === "fr" || opts.lang === "en" ? opts.lang : projectLang(opts.targetDir);
  const migration = await migrate(opts.targetDir, { dryRun: true });
  const { r, shouldOverwrite } = installChoices(opts);
  const aiTools = ["AGENTS.md", "CLAUDE.md", "GEMINI.md", ".cursor", ".github/copilot-instructions.md"].filter((f) =>
    existsSync(join(opts.targetDir, f)),
  );
  const protections = existingProtections(opts.targetDir, lang);
  const drifted: string[] = [];
  const simulation = { created: [] as string[], kept: [] as string[], replaced: [] as string[] };
  await scaffold(r, { shouldOverwrite, drifted, simulation });
  const created = [...simulation.created];
  if (!readConfig(opts.targetDir)) created.push(".drwil/ia-first.json");
  return { lang, stack: r.stack, aiTools, protections, created, replaced: simulation.replaced, kept: simulation.kept, drifted, migration };
}

export function formatPreview(a: InitPreview): string {
  const T = TEXTS[a.lang];
  const l = [T.analysing, ""];
  const migration = formatMigration(a.migration, true, a.lang);
  if (migration.length) l.push(...migration, "");
  l.push(T.detected);
  l.push(a.stack.length ? fill(T.stack, a.stack.map((s) => `${s.path} → ${s.technos.join(", ")}`).join(" ; ")) : T.noStack);
  l.push(fill(T.aiTools, a.aiTools.length ? a.aiTools.join(", ") : T.none));
  l.push("", T.protections, ...(a.protections.length ? a.protections.map((p) => `  ✓ ${p}`) : [T.noProtection]));
  l.push("", fill(T.added, a.created.length), ...a.created.map((f) => `  + ${f}`));
  if (a.replaced.length) l.push("", fill(T.replaced, a.replaced.length), ...a.replaced.map((f) => `  ~ ${f}`));
  if (a.kept.length) l.push("", fill(T.kept, a.kept.length), ...a.kept.map((f) => `  = ${f}${a.drifted.includes(f) ? T.drifted : ""}`));
  l.push("", T.nothingOverwritten);
  return l.join("\n");
}
