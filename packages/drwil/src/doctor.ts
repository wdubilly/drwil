// `drwil doctor` (DRWIL-010) and `drwil contracts` (DRWIL-021): quick diagnosis of an installation,
// without running any check (that is the role of `drwil verify`).
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fill, projectLang, type MessageLang } from "./i18n.js";
import { loadProject } from "./verify.js";
import { resolveFromConfig } from "./config.js";
import { AUTO_KINDS, describeGap, findGaps, hooksPath, scriptsDir, unchainedHooks } from "./essentials.js";
import { compareVersions, engineVersion, readInstall } from "./manifest.js";

export type PointState = "ok" | "warning" | "problem";

export interface DiagnosisPoint {
  id: string;
  label: string;
  state: PointState;
  detail: string;
}

export interface Diagnosis {
  lang: MessageLang;
  /** 0: healthy (warnings tolerated); 1: at least one problem; 2: not a usable drwil project. */
  code: 0 | 1 | 2;
  points: DiagnosisPoint[];
  error?: string;
}

// Entry file of each AI tool (AGENTS.md is for all of them).
const TOOL_FILES: Record<string, string> = {
  claude: "CLAUDE.md",
  codex: "AGENTS.md",
  cursor: ".cursor/rules/ia-first.mdc",
  gemini: "GEMINI.md",
  copilot: ".github/copilot-instructions.md",
};

const TEXTS = {
  fr: {
    installation: "Installation",
    manifest: "Manifeste",
    noManifest: "absent : relancer `drwil init` (uninstall et dérive en dépendent)",
    present: "présent",
    version: "Version du moteur",
    noInstall: "inconnue (installation antérieure à .drwil/install.json) : relancer `npx drwil init`",
    sameVersion: "{0} (première installation : {1})",
    olderInstall: "{0} installée, CLI {1} plus récente : mettre à jour par `npx drwil init`",
    newerInstall: "{0} installée, CLI {1} plus ancienne : utiliser une CLI au moins en {0}",
    noAgents: "absent : point d'entrée unique des agents",
    integrations: "Intégrations IA",
    missing: " (manquant : {0})",
    contracts: "Contrats",
    contractErrors: "{0} erreur(s) : {1}",
    validContracts: "{0} contrat(s) valide(s) ({1})",
    proofs: "Preuves automatisées",
    noCheck: " (sans Contrôle, toujours MANUAL : {0})",
    hooks: "Hooks git",
    hooksOff: "inactifs : lancer `git config core.hooksPath .githooks`",
    hooksChained: "core.hooksPath = {0}, hooks drwil appelés depuis là",
    hooksForeign:
      "core.hooksPath = {0} : hooks drwil jamais appelés ({1}) — les appeler depuis {2}, ou `git config core.hooksPath .githooks`",
    fixWith: "{0} — correctif : {1}",
    noCi: "aucune CI configurée : pas de filet pour les contrôles dégradables (QUA-013)",
    ciMissing: "fichier absent : {0}",
    tools: "Outils requis",
    gitState: "node {0}, git {1}{2}",
    absent: "absent",
    gitleaks: ", gitleaks {0}",
    gitleaksMissing: "absent (secrets non contrôlés localement)",
    healthy: "Installation saine.",
    problems: "Problème(s) à corriger ci-dessus.",
  },
  en: {
    installation: "Installation",
    manifest: "Manifest",
    noManifest: "missing: run `drwil init` again (uninstall and drift depend on it)",
    present: "present",
    version: "Engine version",
    noInstall: "unknown (installed before .drwil/install.json): run `npx drwil init` again",
    sameVersion: "{0} (first installed: {1})",
    olderInstall: "{0} installed, CLI {1} is newer: update with `npx drwil init`",
    newerInstall: "{0} installed, CLI {1} is older: use a CLI at least at {0}",
    noAgents: "missing: the agents' single entry point",
    integrations: "AI integrations",
    missing: " (missing: {0})",
    contracts: "Contracts",
    contractErrors: "{0} error(s): {1}",
    validContracts: "{0} valid contract(s) ({1})",
    proofs: "Automated proofs",
    noCheck: " (without Check, always MANUAL: {0})",
    hooks: "Git hooks",
    hooksOff: "inactive: run `git config core.hooksPath .githooks`",
    hooksChained: "core.hooksPath = {0}, drwil hooks called from there",
    hooksForeign: "core.hooksPath = {0}: drwil hooks never called ({1}) — call them from {2}, or `git config core.hooksPath .githooks`",
    fixWith: "{0} — fix: {1}",
    noCi: "no CI configured: no net for degradable checks (QUA-013)",
    ciMissing: "missing file: {0}",
    tools: "Required tools",
    gitState: "node {0}, git {1}{2}",
    absent: "missing",
    gitleaks: ", gitleaks {0}",
    gitleaksMissing: "missing (secrets not checked locally)",
    healthy: "Healthy installation.",
    problems: "Problem(s) to fix above.",
  },
};

function toolPresent(cmd: string, args: string[]): boolean {
  return !spawnSync(cmd, args, { stdio: "ignore" }).error;
}

export async function doctor(opts: { targetDir: string }): Promise<Diagnosis> {
  const root = opts.targetDir;
  const project = await loadProject(root);
  if (typeof project === "string") return { lang: projectLang(root), code: 2, points: [], error: project };
  const { lang, cfg, registry, contracts: reader } = project;
  const T = TEXTS[lang];
  const points: DiagnosisPoint[] = [];
  const point = (id: string, label: string, state: PointState, detail: string) => points.push({ id, label, state, detail });

  point("installation", T.installation, "ok", ".drwil/ia-first.json");
  const manifest = existsSync(join(root, ".drwil", "installed-files.json"));
  point("manifest", T.manifest, manifest ? "ok" : "warning", manifest ? ".drwil/installed-files.json" : T.noManifest);
  const install = readInstall(root);
  const cli = engineVersion();
  const gap = install ? compareVersions(install.version, cli) : null;
  point(
    "version",
    T.version,
    gap === 0 ? "ok" : "warning",
    !install
      ? T.noInstall
      : gap === 0
        ? fill(T.sameVersion, install.version, install.firstVersion)
        : fill((gap ?? 0) < 0 ? T.olderInstall : T.newerInstall, install.version, cli),
  );
  const agents = existsSync(join(root, "AGENTS.md"));
  point("agents", "AGENTS.md", agents ? "ok" : "problem", agents ? T.present : T.noAgents);

  const tools: string[] = Array.isArray(cfg.tools) ? cfg.tools : [];
  const missing = tools.filter((t) => TOOL_FILES[t] && !existsSync(join(root, TOOL_FILES[t])));
  point(
    "integrations",
    T.integrations,
    missing.length ? "problem" : "ok",
    `${tools.length - missing.length}/${tools.length}${missing.length ? fill(T.missing, missing.map((t) => TOOL_FILES[t]).join(", ")) : ""}`,
  );

  const contracts: any[] = reader.readContracts(readFileSync(join(root, registry), "utf8"));
  const errors: { message: string }[] = reader.validateContracts(contracts, reader.knownChecks(cfg), lang);
  point(
    "contracts",
    T.contracts,
    errors.length || !contracts.length ? "problem" : "ok",
    errors.length
      ? fill(T.contractErrors, errors.length, errors.map((e) => e.message).join(" ; "))
      : fill(T.validContracts, contracts.length, registry),
  );
  const provable = contracts.filter((k) => k.checks?.length).length;
  const noCheck = contracts.filter((k) => !k.checks?.length).map((k) => k.id);
  point(
    "proofs",
    T.proofs,
    noCheck.length ? "warning" : "ok",
    `${provable}/${contracts.length}${noCheck.length ? fill(T.noCheck, noCheck.join(", ")) : ""}`,
  );

  // A hook manager of the project (husky…) is fine as long as it calls the drwil hooks.
  const path = hooksPath(root);
  const unchained = path && path !== ".githooks" ? unchainedHooks(root, path) : [];
  if (path === ".githooks") point("hooks", T.hooks, "ok", "core.hooksPath = .githooks");
  else if (!path) point("hooks", T.hooks, "problem", T.hooksOff);
  else if (unchained.length) point("hooks", T.hooks, "problem", fill(T.hooksForeign, path, unchained.join(", "), scriptsDir(path)));
  else point("hooks", T.hooks, "ok", fill(T.hooksChained, path));

  // What drwil needs inside the project's own files (the hooks have their point above).
  for (const g of findGaps(resolveFromConfig(root)).filter((x) => x.kind !== "hooksPath")) {
    const what = g.missing.length ? `${describeGap(g, lang)} (${g.missing.join(", ")})` : describeGap(g, lang);
    const fix = AUTO_KINDS.has(g.kind) ? "npx drwil init" : g.fix.join(" ⏎ ");
    point(`essentials:${g.file}`, g.file, "problem", fix ? fill(T.fixWith, what, fix) : what);
  }

  const ciFiles: string[] = Array.isArray(cfg.ciFiles) ? cfg.ciFiles : [];
  const ciMissing = ciFiles.filter((f) => !existsSync(join(root, f)));
  point(
    "ci",
    "CI",
    !ciFiles.length ? "warning" : ciMissing.length ? "problem" : "ok",
    !ciFiles.length ? T.noCi : ciMissing.length ? fill(T.ciMissing, ciMissing.join(", ")) : ciFiles.join(", "),
  );

  const git = toolPresent("git", ["--version"]);
  const gitleaks =
    toolPresent("gitleaks", ["version"]) || toolPresent(join(process.env.HOME ?? "", ".local", "bin", "gitleaks"), ["version"]);
  const full = (cfg.mode ?? "full") === "full";
  point(
    "tools",
    T.tools,
    !git ? "problem" : full && !gitleaks ? "warning" : "ok",
    fill(T.gitState, process.version, git ? T.present : T.absent, full ? fill(T.gitleaks, gitleaks ? T.present : T.gitleaksMissing) : ""),
  );

  return { lang, code: points.some((p) => p.state === "problem") ? 1 : 0, points };
}

const SYMBOLS: Record<PointState, string> = { ok: "✓", warning: "⚠", problem: "✗" };

export function formatDiagnosis(d: Diagnosis): string {
  if (d.error) return `drwil doctor\n\n✗ ${d.error}`;
  const T = TEXTS[d.lang];
  const lines = ["drwil doctor", ""];
  for (const p of d.points) lines.push(`${SYMBOLS[p.state]} ${p.label.padEnd(22)} ${p.detail}`);
  lines.push("", d.code === 0 ? T.healthy : T.problems);
  return lines.join("\n");
}

/** Stable machine format of `drwil doctor --json`, version 1. */
export function diagnosisJson(d: Diagnosis) {
  return {
    version: 1,
    status: d.code === 0 ? "healthy" : d.code === 1 ? "problems" : "error",
    exitCode: d.code,
    ...(d.error ? { error: d.error } : {}),
    checks: d.points.map((p) => ({ id: p.id, label: p.label, state: p.state, detail: p.detail })),
  };
}

/** `drwil contracts`: registry read and validated, without running anything. Code 0 if valid, 2 otherwise. */
export async function listContracts(opts: { targetDir: string }) {
  const project = await loadProject(opts.targetDir);
  if (typeof project === "string") return { version: 1, exitCode: 2 as const, error: project, contracts: [], errors: [] as string[] };
  const { lang, cfg, registry, contracts: reader } = project;
  const contracts: any[] = reader.readContracts(readFileSync(join(opts.targetDir, registry), "utf8"));
  const errors: { message: string }[] = reader.validateContracts(contracts, reader.knownChecks(cfg), lang);
  return {
    version: 1,
    exitCode: (errors.length ? 2 : 0) as 0 | 2,
    registry,
    contracts: contracts.map((k) => ({ id: k.id, title: k.title, form: k.form, rule: k.rule, checks: k.checks ?? [], manual: k.manual })),
    errors: errors.map((e) => e.message),
  };
}
