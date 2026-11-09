import { isMechanics, isKitProse, type Resolved } from "./config.js";
import { isCiFile } from "./ci-zone.js";
import { texts } from "./cli-texts.js";
import { fill } from "./i18n.js";
import { type Overwrite, scaffold } from "./render.js";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

/** Files the project owns once installed (QUA-284): never rewritten, only completed by what a version requires. */
const PROJECT_FILES = ["AGENTS.md", "docs/recipes/", "docs/intentions/README.md", "docs/contracts-catalog.md"];

export function isProjectFile(rel: string): boolean {
  return PROJECT_FILES.some((p) => (p.endsWith("/") ? rel.startsWith(p) : rel === p));
}

/** The human's answer before a kit file modified by hand is replaced: its diff is shown first. */
export type ConfirmDrift = (rel: string, diff: string) => boolean | Promise<boolean>;

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

/**
 * Kit files (mechanics and prose) modified by hand since their installation that the update would replace: each
 * is shown as a diff and replaced only on the human's yes. Project files (QUA-284) and CI files (QUA-283) are
 * never offered. Writes nothing: the update branch keeps the old version, so no `.bak`.
 */
export async function replaceOnConfirm(
  r: Resolved,
  previous: Record<string, string>,
  base: Overwrite,
  confirm?: ConfirmDrift,
): Promise<Overwrite> {
  if (!confirm) return base;
  const rendered = new Map<string, string>();
  await scaffold(r, { shouldOverwrite: () => false, simulation: { created: [], kept: [], replaced: [] }, rendered });
  const approved = new Set<string>();
  for (const [rel, content] of rendered) {
    if (!(rel in previous) || isProjectFile(rel) || isCiFile(rel) || !(isMechanics(rel) || isKitProse(rel))) continue;
    const target = join(r.opts.targetDir, rel);
    if (!existsSync(target) || base(rel)) continue;
    const existing = readFileSync(target, "utf8");
    if (existing === content) continue;
    if (await confirm(rel, unifiedDiff(existing, content))) approved.add(rel);
  }
  return (rel) => base(rel) || approved.has(rel);
}

/** The terminal's confirmation: the diff (cut when long), then the human's yes (`ask` reads one answer). */
export const confirmDriftWith =
  (ask: (question: string) => Promise<string>): ConfirmDrift =>
  async (rel, diff) => {
    const lines = diff.split("\n");
    const shown = lines.length > 60 ? [...lines.slice(0, 60), `… (${lines.length - 60})`] : lines;
    return /^(y|yes|o|oui)$/i.test((await ask(fill(texts().driftQuestion, rel, shown.join("\n")))).trim());
  };
