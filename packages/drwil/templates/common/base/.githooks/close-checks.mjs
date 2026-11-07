// Checks of the closing that read the repository (split from close.mjs), and what the closing and pr-watch.mjs read of the
// forge (QUA-262): its kind, the checks left to CI, the merge request's pipeline on GitLab.
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { acceptanceCriteria, config } from "./briefs.mjs";
import { ciOnly } from "./engine-runat.mjs";
import { changedFiles } from "./check-code-rules.mjs";
import { mainBranch } from "./close-branches.mjs";
import { texts } from "./close-texts.mjs";
import { proofPath } from "./closure-proof.mjs";
import { definedIds } from "./contracts.mjs";
import { outsideBriefFiles } from "./scope-gate.mjs";
import { fnmatch, readBlock, withMirrors } from "./scope.mjs";

export const git = (root, ...args) => {
  const r = spawnSync("git", args, { cwd: root, encoding: "utf8" });
  return r.status === 0 ? r.stdout.trim() : null;
};

/** Contract IDs the project defines in `text`, per its prefixes. */
export function contractIds(root, text) {
  const prefixes = config(root).contractPrefixes ?? ["SEC", "QUA"];
  return definedIds(text, `(?:${prefixes.join("|")})-\\d{3}\\b`).defined;
}

/** Criteria still « contract to create », with the ID to write: the contracts created on the branch the brief does not cite yet. */
export function criteriaToCreate(root, brief, text) {
  const T = texts(root);
  const open = acceptanceCriteria(text).filter((c) => !c.link && /contrat à créer|contract to create/i.test(c.text));
  if (!open.length) return [];
  const registry = config(root).dirs?.contracts ?? "docs/contracts.md";
  const now = existsSync(join(root, registry)) ? readFileSync(join(root, registry), "utf8") : "";
  const main = mainBranch(root);
  const base = main ? git(root, "merge-base", "HEAD", main) : null;
  const before = contractIds(root, (base && git(root, "show", `${base}:${registry}`)) ?? "");
  const ids = [...contractIds(root, now)].filter((id) => !before.has(id) && !text.includes(id));
  // One contract per criterion, created in the same order: the pairing is given; otherwise the candidates.
  const short = (t) => {
    const label = t.replace(/\s*[—–-]\s*(contrat à créer|contract to create)\s*$/i, "");
    return label.length > 70 ? `${label.slice(0, 69)}…` : label;
  };
  return open.map((c, i) => T.toCreate(short(c.text), brief, ids.length === open.length ? `\`${ids[i]}\`` : T.candidates(ids)));
}

/** A single journal entry per workstream (QUA-118): its proof cited by two `## ` entries is an entry doubled. */
export function journalTwice(root, brief) {
  const journal = `${config(root).dirs?.projects ?? "docs/projects"}/journal.md`;
  if (!existsSync(join(root, journal))) return [];
  const proof = proofPath(root, brief);
  const n = readFileSync(join(root, journal), "utf8")
    .split(/^## /m)
    .slice(1)
    .filter((entry) => entry.includes(proof)).length;
  return n > 1 ? [texts(root).twice(journal, proof, n)] : [];
}

/** Places (file:line) of the non-Markdown files citing the brief (the Markdown ones are corrected by `deadCitations`). */
export function deadReferences(root, brief) {
  const T = texts(root);
  const out = git(root, "grep", "-n", "-I", "--untracked", "-F", brief) ?? "";
  return out
    .split("\n")
    .filter(Boolean)
    .map((l) => /^(.+?):(\d+):/.exec(l))
    .filter(([, f]) => f !== brief && !f.endsWith(".md"))
    .map(([, f, n]) => T.dead(`${f}:${n}`, brief));
}

/** QUA-230 : anticiper la barrière, qui lit le périmètre commité, pas l'extension en cours. */
export function referenceScope(root, brief) {
  const cfg = config(root);
  const patterns = withMirrors(readBlock(git(root, "show", `HEAD:${brief}`) ?? "").patterns, cfg);
  const out = git(root, "grep", "-n", "-I", "--untracked", "--exclude-standard", "-F", "-e", brief) ?? "";
  const places = new Map();
  for (const line of out.split("\n")) {
    const match = /^(.+?):(\d+):/.exec(line);
    if (match && match[1] !== brief && !places.has(match[1])) places.set(match[1], `${match[1]}:${match[2]}`);
  }
  const exclusions = Array.isArray(cfg.outOfScope) ? cfg.outOfScope : undefined;
  const files = outsideBriefFiles([...places.keys()], exclusions).filter((f) => !patterns.some((p) => fnmatch(f, p)));
  if (!files.length) return [];
  const T = texts(root);
  return [...files.map((f) => T.scopeReference(places.get(f), brief)), T.scopeExtension(brief, files)];
}

const NAME = /`([^`\s/<>{}*?|=:@$]+\.(?:md|mdc|mjs|cjs|js|ts|tsx|jsx|py|sh|json|ya?ml|toml|txt))`(?!\s*\((?:à créer|to create)\))/g;

/** Backticked file names without a path, in the Markdown files changed, that check-docs would not find. */
export function bareNames(root) {
  const T = texts(root);
  const found = [];
  for (const file of changedFiles(root).filter((f) => f.endsWith(".md") && existsSync(join(root, f)))) {
    const lines = readFileSync(join(root, file), "utf8").split(/\r?\n/);
    lines.forEach((line, i) => {
      if (/si présent|if present/i.test(line + (lines[i + 1] ?? ""))) return;
      for (const [, name] of line.matchAll(NAME)) {
        if (!name.startsWith("-") && !existsSync(join(root, name)) && !existsSync(join(root, dirname(file), name)))
          found.push(T.bare(`${file}:${i + 1}`, name));
      }
    });
  }
  return found;
}

// QUA-262: a check left to CI (`runAt: ["ci"]`, QUA-208) is proven only by the PR (GitHub) or MR (GitLab) CI on the
// commit closed: until it is seen green there, the closing is not acquired and the workstream stays in CLOSING.
const CI_TEXTS = {
  fr: {
    green: "CI de la {0} verte sur HEAD : contrôles confiés à la CI prouvés ({1}) — clôture acquise sur ce point.",
    wait: "{0} : contrôles confiés à la CI non prouvés ({1}) — clôture non acquise, le chantier reste en CLOSING ; suivre la CI par `node .githooks/pr-watch.mjs`.",
    pending: "CI de la {0} en cours",
    stale: "CI de la {0} vue sur {1}, pas sur HEAD (commit à pousser, ou CI à venir)",
    red: "CI de la {0} rouge (en échec : {1}) ; corriger la cause, jamais contourner (QUA-019)",
    none: "CI de la PR ou MR absente (aucune PR ou MR pour cette branche, aucun contrôle, ou forge injoignable)",
  },
  en: {
    green: "{0} CI green on HEAD: checks left to CI proven ({1}) — closing acquired on this point.",
    wait: "{0}: checks left to CI not proven ({1}) — closing not acquired, the workstream stays in CLOSING; follow the CI with `node .githooks/pr-watch.mjs`.",
    pending: "{0} CI running",
    stale: "{0} CI seen on {1}, not on HEAD (commit to push, or CI to come)",
    red: "{0} CI red (failing: {1}); fix the cause, never bypass (QUA-019)",
    none: "PR or MR CI missing (no PR or MR for this branch, no check, or forge unreachable)",
  },
};
const fill = (message, ...values) => message.replace(/\{(\d)\}/g, (_, i) => values[i]);

// QUA-262: a GitLab pipeline is green on `success` only; skipped (nothing ran) is no CI, never green (QUA-013).
const GITLAB = { success: "green", failed: "red", canceled: "red", skipped: "none" };
const OVER = new Set(["success", "failed", "canceled", "skipped", "manual"]);

/** One look at the merge request (`glab mr view`, its head pipeline and its jobs): same states as `look`. */
export function lookMr(mr, glab) {
  const view = glab(["mr", "view", ...(mr ? [mr] : []), "--output", "json"]);
  if (!view || typeof view !== "object") return { state: "not-run" };
  const p = view.head_pipeline;
  const jobs = p?.id ? glab(["api", `projects/:id/pipelines/${p.id}/jobs?per_page=100`]) : null;
  const list = Array.isArray(jobs) ? jobs : [];
  const state = p ? (GITLAB[p.status] ?? "pending") : "none";
  const failed = list.filter((j) => ["failed", "canceled"].includes(j.status) && !j.allow_failure).map((j) => j.name);
  const more = {
    red: () => ({ failed: failed.length ? failed : [`pipeline #${p.id}`] }),
    green: () => ({ total: list.length || 1 }),
    pending: () => ({ pending: list.filter((j) => !OVER.has(j.status)).length || 1 }),
    none: () => ({}),
  }[state]();
  const ci = { state, ...more };
  if (view.state === "merged")
    return { state: "merged", number: view.iid, mergeCommit: view.merge_commit_sha ?? view.squash_commit_sha, ci: state, head: view.sha };
  if (view.state === "closed" || view.state === "locked") return { state: "closed", number: view.iid };
  return { ...ci, number: view.iid, head: view.sha };
}

/** Forge whose CI follows the change: "gitlab" when `origin` names GitLab, or without GitHub a `.gitlab-ci.yml`; else "github". */
export function changeForge(root, url = git(root, "remote", "get-url", "origin")) {
  if (/github/i.test(url ?? "")) return "github";
  if (/gitlab/i.test(url ?? "")) return "gitlab";
  return existsSync(join(root, ".gitlab-ci.yml")) && !existsSync(join(root, ".github", "workflows")) ? "gitlab" : "github";
}

/** Checks the project leaves to CI (`runAt: ["ci"]`, QUA-208), proven only by the PR or MR CI. */
export function ciChecks(root) {
  const checks = config(root).checks;
  return (Array.isArray(checks) ? checks : []).filter(ciOnly).map((c) => c.id);
}

/**
 * Whether the closing is acquired on the checks left to CI: null without any; else `{ acquired, line }` from one look
 * (`look(forge)`, pr-watch's `look` or `lookMr`) at the CI of the branch's PR or MR, green on HEAD only.
 */
export function closingCi(root, look) {
  const checks = ciChecks(root);
  if (!checks.length) return null;
  const T = CI_TEXTS[config(root).lang === "en" ? "en" : "fr"];
  const forge = changeForge(root);
  const seen = look(forge);
  // Merged: its CI state at the merge (`ci`), seen on the PR or MR head.
  const s = seen.state === "merged" ? { ...seen, state: seen.ci } : seen;
  const name = forge === "gitlab" ? `MR !${s.number}` : `PR #${s.number}`;
  const head = git(root, "rev-parse", "HEAD");
  const list = checks.join(", ");
  if (s.state === "green" && s.head === head) return { acquired: true, line: fill(T.green, name, list) };
  const why =
    s.state === "green"
      ? fill(T.stale, name, String(s.head ?? "?").slice(0, 7))
      : s.state === "pending"
        ? fill(T.pending, name)
        : s.state === "red"
          ? fill(T.red, name, (s.failed ?? ["?"]).join(", "))
          : T.none;
  return { acquired: false, line: fill(T.wait, why, list) };
}
