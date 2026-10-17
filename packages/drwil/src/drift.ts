import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, relative } from "node:path";
import { isKitProse, resolveFromConfig, type Resolved } from "./config.js";
import { fill, projectLang } from "./i18n.js";
import { readManifest } from "./manifest.js";
import { relPosix, render, scaffold, templatesDir, walk } from "./render.js";

// The kit's prose (KIT_PROSE) the kit itself installed (in the manifest): a project's own AGENTS.md,
// never installed by the kit, is never proposed. Same walk as the install, writing nothing.
async function renderedProse(r: Resolved): Promise<Map<string, string>> {
  const all = new Map<string, string>();
  await scaffold(r, { shouldOverwrite: () => false, simulation: { created: [], kept: [], replaced: [] }, rendered: all });
  const installed = readManifest(r.opts.targetDir);
  const prose = new Map<string, string>();
  for (const [rel, content] of all) if (isKitProse(rel) && rel in installed) prose.set(join(r.opts.targetDir, rel), content);
  return prose;
}

// Mechanics "with no legitimate customisation expected" — .githooks/, .claude/settings.json and the
// CI file; the prose comes from renderedProse.
async function renderedMechanics(r: Resolved): Promise<Map<string, string>> {
  const rendered = new Map<string, string>();
  // `walkDir`: folder walked; `relBase`: folder the relative path is computed from (keeps the
  // `.githooks/` prefix instead of losing it by walking that folder directly).
  const add = async (walkDir: string, relBase: string) => {
    for (const file of await walk(walkDir)) {
      const target = join(r.opts.targetDir, relative(relBase, file));
      rendered.set(target, render(await readFile(file, "utf8"), r));
    }
  };
  const base = join(templatesDir, "common", "base");
  await add(join(base, ".githooks"), base);
  if (r.tools.includes("claude")) {
    const settings = join(templatesDir, "common", "tools", "claude", ".claude", "settings.json");
    rendered.set(join(r.opts.targetDir, ".claude", "settings.json"), render(await readFile(settings, "utf8"), r));
  }
  if (r.ci !== "none") {
    const srcCi = join(templatesDir, "common", "ci", r.ci);
    await add(srcCi, srcCi);
  }
  return rendered;
}

// Minimal unified diff (line by line, closest possible, no external library): just enough to show
// the user what would change before confirmation — not a patch tool.
function unifiedDiff(before: string, after: string): string {
  const a = before.split(/\r?\n/);
  const b = after.split(/\r?\n/);
  // Dynamic programming (longest common subsequence): short mechanics files, negligible cost.
  const lcs: number[][] = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      lcs[i][j] = a[i] === b[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }
  const lines: string[] = [];
  let i = 0,
    j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i++;
      j++;
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      lines.push(`- ${a[i]}`);
      i++;
    } else {
      lines.push(`+ ${b[j]}`);
      j++;
    }
  }
  while (i < a.length) {
    lines.push(`- ${a[i]}`);
    i++;
  }
  while (j < b.length) {
    lines.push(`+ ${b[j]}`);
    j++;
  }
  return lines.join("\n");
}

export interface ResolveDriftOptions {
  targetDir: string;
  /** Non-interactive use (scripted/CI): overwrites without asking. Default `false` — without it,
   * never an overwrite without explicit confirmation. */
  force?: boolean;
}

export interface ResolveDriftReport {
  /** Mechanics files rewritten (confirmed, or forced). */
  resolved: string[];
  /** Mechanics files that drifted but were left untouched (confirmation refused). */
  ignored: string[];
}

/** Resolves the drift of the mechanics files (`.githooks/`, `.claude/settings.json`, CI file) and of
 * the kit's prose it installed (skills, recipes, instructions…) reported by `init()`: shows a diff,
 * asks for confirmation (unless forced), backs the old file up as `.bak` before overwriting. Never
 * called automatically by `init()`. */
export async function resolveDrift(
  opts: ResolveDriftOptions,
  confirm: (rel: string, diff: string) => boolean | Promise<boolean> = defaultConfirm,
): Promise<ResolveDriftReport> {
  const r = resolveFromConfig(opts.targetDir);
  const rendered = new Map([...(await renderedMechanics(r)), ...(await renderedProse(r))]);
  const resolved: string[] = [];
  const ignored: string[] = [];
  for (const [target, templateContent] of rendered) {
    if (!existsSync(target)) continue; // creates nothing: only the files that already drifted are handled.
    const rel = relPosix(opts.targetDir, target);
    const existing = await readFile(target, "utf8");
    if (existing === templateContent) continue; // no drift.
    const ok = opts.force || (await confirm(rel, unifiedDiff(existing, templateContent)));
    if (!ok) {
      ignored.push(rel);
      continue;
    }
    await writeFile(`${target}.bak`, existing);
    await writeFile(target, templateContent);
    resolved.push(rel);
  }
  return { resolved, ignored };
}

const TEXTS = {
  fr: { question: "Écraser {0} ? [o/N] ", yes: /^o(ui)?$/i },
  en: { question: "Overwrite {0}? [y/N] ", yes: /^y(es)?$/i },
};

// Real interactive confirmation (stdin): kept apart from resolveDrift() so that it stays testable
// without a terminal (the test provides a synthetic `confirm`).
async function defaultConfirm(rel: string, diff: string): Promise<boolean> {
  console.log(`\n--- ${rel} ---`);
  console.log(diff);
  if (!process.stdin.isTTY) return false; // non-interactive without force: never an overwrite.
  const T = TEXTS[projectLang(process.cwd())];
  const { createInterface } = await import("node:readline/promises");
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    return T.yes.test((await rl.question(fill(T.question, rel))).trim());
  } finally {
    rl.close();
  }
}
