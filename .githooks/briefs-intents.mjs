// The brief → intent loop (split from briefs.mjs, which re-exports it).
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { BRIEF_DIRS } from "./briefs.mjs";

// The brief → intent loop (QUA-036): a workstream brief names the intent it comes from; at closing,
// that intent is updated, or summarised in the journal and removed when fully covered.
const INTENT_FIELD = /^\*\*(?:Intention|Intent)\*\*\s*:\s*`([^`]+)`/m;

/** Path of the intent a brief comes from (`**Intention**: `docs/intentions/x.md``), or null. */
export function briefIntent(text) {
  return INTENT_FIELD.exec(text)?.[1] ?? null;
}

/**
 * Files the branch changed since its merge base with the main branch (DRWIL_BASE, origin/HEAD, then the
 * usual names), only those of a git `--diff-filter` (e.g. "A", added) if given; [] without a base.
 */
export function branchFiles(root, filter) {
  const git = (...args) => {
    const r = spawnSync("git", args, { cwd: root, encoding: "utf8" });
    return r.status === 0 ? r.stdout.trim() : "";
  };
  const refs = [
    process.env.DRWIL_BASE,
    git("symbolic-ref", "--quiet", "refs/remotes/origin/HEAD"),
    "origin/master",
    "origin/main",
    "master",
    "main",
  ];
  for (const ref of refs) {
    if (!ref || !git("rev-parse", "--verify", "--quiet", `${ref}^{commit}`)) continue;
    const base = git("merge-base", "HEAD", ref);
    if (base)
      return git("diff", "--name-only", "--no-renames", ...(filter ? [`--diff-filter=${filter}`] : []), `${base}..HEAD`)
        .split("\n")
        .filter(Boolean);
  }
  return [];
}

/**
 * At commit time: the briefs this commit deletes whose intent still exists but was not touched by
 * the commit nor, earlier, by the branch (compared from the merge base) — `[{ brief, intent }]`.
 * A warning, never a refusal: an intent may already be up to date.
 */
export function intentsLeftBehind(root, staged) {
  const r = spawnSync("git", ["diff", "--cached", "--name-only", "--diff-filter=D", "--no-renames", "-z"], { cwd: root, encoding: "utf8" });
  if (r.status !== 0) return [];
  const deleted = r.stdout.split("\0").filter((f) => f && BRIEF_DIRS.some((d) => f.startsWith(d)) && f.endsWith(".md"));
  if (!deleted.length) return [];
  const touched = new Set([...staged, ...branchFiles(root)]);
  const left = [];
  for (const brief of deleted) {
    // A staged deletion always exists in HEAD: its text is there to read.
    const intent = briefIntent(spawnSync("git", ["show", `HEAD:${brief}`], { cwd: root, encoding: "utf8" }).stdout);
    if (intent && existsSync(join(root, intent)) && !touched.has(intent)) left.push({ brief, intent });
  }
  return left;
}

const REVIEW_DATES =
  /^\*\*(?:Statut|Status)\*\*[^\n]*?(\d{4}-\d{2}-\d{2})|^\*\*(?:Revu le|Reviewed on)\s+(\d{4}-\d{2}-\d{2})\*\*|^##\s*(?:Existant|Current state)[^\n]*?(\d{4}-\d{2}-\d{2})/gm;

/** Latest dated review of an intent: its Status line, a « Revu le … » line or a dated « Existant » heading; null if none. */
export function lastReview(text) {
  const dates = [...text.matchAll(REVIEW_DATES)].map((m) => m[1] ?? m[2] ?? m[3]);
  return dates.length ? dates.sort().at(-1) : null;
}

/** Intents whose latest review is `days` old or more — `[{ file, days }]`, the oldest first. */
export function staleIntents(root, cfg, now = Date.now(), days = 30) {
  const dir = cfg?.dirs?.intentions ?? "docs/intentions";
  if (!existsSync(join(root, dir))) return [];
  const stale = [];
  for (const f of readdirSync(join(root, dir)).filter((f) => f.endsWith(".md") && !/^readme\.md$/i.test(f))) {
    const date = lastReview(readFileSync(join(root, dir, f), "utf8"));
    const age = date ? Math.floor((now - new Date(date).getTime()) / 86400000) : null;
    if (age !== null && age >= days) stale.push({ file: `${dir}/${f}`, days: age });
  }
  return stale.sort((a, b) => b.days - a.days);
}
