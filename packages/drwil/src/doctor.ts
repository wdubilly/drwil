// `drwil doctor` (DRWIL-010) and `drwil contracts` (DRWIL-021): quick diagnosis of an installation,
// without running any check (that is the role of `drwil verify`).
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fill, projectLang, type MessageLang } from "./i18n.js";
import { TEXTS } from "./doctor-texts.js";
import { lacksCoverage } from "./coverage.js";
import { loadProject } from "./verify.js";
import { resolveFromConfig } from "./config.js";
import { AUTO_KINDS, describeGap, findGaps, hooksPath, scriptsDir, unchainedHooks } from "./essentials.js";
import { compareVersions, engineVersion, readInstall } from "./manifest.js";
import { bypassDiagnosis } from "./guarantees-forge.js";
import { computeProtection, formatProtection, protectionJson, type Protection } from "./protection.js";
import { defaultExec, type Exec } from "./guarantees-table.js";

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
  protection?: Protection;
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

function toolPresent(cmd: string, args: string[]): boolean {
  return !spawnSync(cmd, args, { stdio: "ignore" }).error;
}

export async function doctor(opts: { targetDir: string; exec?: Exec }): Promise<Diagnosis> {
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
        ? install.firstVersion === null
          ? fill(T.unknownOrigin, install.version)
          : fill(T.sameVersion, install.version, install.firstVersion)
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

  const uncovered = contracts.filter(lacksCoverage);
  const human = contracts.filter((k) => k.form === "section" && (k.manual || k.checks === null)).length;
  point(
    "coverage",
    T.coverage,
    uncovered.length ? "warning" : "ok",
    `${human - uncovered.length}/${human}${uncovered.length ? fill(T.noCovers, uncovered.map((k) => k.id).join(", ")) : ""}`,
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

  // QUA-115: read with the human's token, the only one that sees a ruleset's bypass list.
  const bypass = bypassDiagnosis(root, opts.exec ?? defaultExec, lang);
  if (bypass) point("bypass", T.bypass, bypass.state, bypass.detail);

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

  const hooksOk = points.find((p) => p.id === "hooks")?.state === "ok";
  const protection = computeProtection(root, cfg, opts.exec ?? defaultExec, lang, hooksOk);
  return { lang, code: points.some((p) => p.state === "problem") ? 1 : 0, points, protection };
}

const SYMBOLS: Record<PointState, string> = { ok: "✓", warning: "⚠", problem: "✗" };

export function formatDiagnosis(d: Diagnosis): string {
  if (d.error) return `drwil doctor\n\n✗ ${d.error}`;
  const T = TEXTS[d.lang];
  const lines = ["drwil doctor", ""];
  for (const p of d.points) lines.push(`${SYMBOLS[p.state]} ${p.label.padEnd(22)} ${p.detail}`);
  if (d.protection) lines.push("", ...formatProtection(d.protection));
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
    ...(d.protection ? { protection: protectionJson(d.protection) } : {}),
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
