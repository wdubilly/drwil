// Acceptance sheet of a candidate release (QUA-051, QUA-052): generated, never written by hand, from
// existing sources only — the commits of the range and their `Drwil-Brief` trailer, the briefs as
// they were before their deletion, the journal entries added in the range, `drwil verify --json`,
// the contract registry, the CI runs of the commit and the tarballs. On top, what the acceptance
// team has to validate (each point with a stable ID and its workstream's PR); below, what the
// automated non-regression already proved.
// Imported by create-release.mjs (`--candidate`); release-verdict.mjs and promote-release.mjs read
// the points and fingerprints back from the sheet attached to the pre-release. The messages are in
// acceptance-sheet-texts.mjs, the workstreams and points in acceptance-sheet-works.mjs (re-exported).
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { config } from "./briefs.mjs";
import { readContracts } from "./contracts.mjs";
import { fill, sheetTexts } from "./acceptance-sheet-texts.mjs";
import { knownLimits, points, realTrials, repoUrl, sections, workstreams } from "./acceptance-sheet-works.mjs";

export { fill, sheetTexts, knownLimits, points, realTrials, repoUrl, sections, workstreams };

/**
 * Command runner of the module: stdout, or null when the command fails or is missing (`any`: stdout
 * whatever the exit code, for `drwil verify`, which exits 1 on FAIL). Injected by the tests.
 */
export function runner(root) {
  return (cmd, args, { any = false } = {}) => {
    const r = spawnSync(cmd, args, { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
    return r.status === 0 || (any && typeof r.stdout === "string" && r.stdout) ? r.stdout : null;
  };
}

/** `drwil verify --json` of the project (local package only, never fetched), or null. */
export function verifyJson(root, run) {
  const bin = join(root, "node_modules", "drwil", "bin", "drwil.js");
  if (!existsSync(bin)) return null;
  try {
    return JSON.parse(run(process.execPath, [bin, "verify", "--json"], { any: true }) ?? "");
  } catch {
    return null;
  }
}

const MAIN = "main-branch";
const RANK = ["fail", "error", "manual"];

/**
 * Verdict of `drwil verify` for a release, created on the main branch: a contract that fails only by
 * its `main-branch` check (no direct work on the main branch) does not count, and is named (`excused`).
 * Any other failure, a configuration error or an open criterion keeps the verdict of verify.
 */
export function releaseVerdict(verdict) {
  const as = { status: verdict?.status ?? null, excused: [] };
  const results = verdict?.results ?? [];
  const onlyMain = (k) =>
    k.status === "fail" &&
    k.checks?.some((c) => c.id === MAIN && c.status === "fail") &&
    k.checks.every((c) => c.status !== "fail" || c.id === MAIN);
  const excused = results.filter(onlyMain);
  if (as.status !== "fail" || !excused.length || (verdict.criteria ?? []).some((c) => c.status !== "pass")) return as;
  const rest = results.filter((k) => !excused.includes(k) && (k.severity ?? "blocking") === "blocking").map((k) => k.status);
  if (verdict.errors?.length) rest.push("error");
  return { status: RANK.find((s) => rest.includes(s)) ?? "pass", excused };
}

/** Contracts that pass and cite a test in the registry: [{ id, title }]. */
export function provenByTest(root, verdict) {
  const registry = join(root, config(root).dirs?.contracts ?? "docs/contracts.md");
  const tested = new Set(
    existsSync(registry)
      ? readContracts(readFileSync(registry, "utf8"))
          .filter((k) => k.tests?.length)
          .map((k) => k.id)
      : [],
  );
  return (verdict?.results ?? []).filter((k) => k.status === "pass" && tested.has(k.id)).map(({ id, title }) => ({ id, title }));
}

const parse = (text, fallback) => {
  try {
    return JSON.parse(text ?? "");
  } catch {
    return fallback;
  }
};

/** Runner labels of the CI jobs that succeeded on `sha` (gh), sorted; empty when none is found. */
export function ciOs(run, sha) {
  const runs = parse(run("gh", ["run", "list", "--commit", sha, "--json", "databaseId", "--limit", "50"]), []);
  const os = new Set();
  for (const { databaseId } of Array.isArray(runs) ? runs : []) {
    const jobs = parse(run("gh", ["api", `repos/{owner}/{repo}/actions/runs/${databaseId}/jobs`]), {}).jobs ?? [];
    for (const j of jobs) if (j.conclusion === "success") for (const l of j.labels ?? []) os.add(l);
  }
  return [...os].sort();
}

/** sha256 of a file, hexadecimal. */
export const sha256 = (file) => createHash("sha256").update(readFileSync(file)).digest("hex");

/**
 * The sheet in Markdown. `data`: { tag, version, commit, from, repo, points, verdict, proven, os,
 * tarballs: null (not built) | [{ name, sha256 }] , packages }.
 */
export function renderSheet(data, T) {
  const lines = [`# ${fill(T.title, data.tag)}`, "", fill(T.intro, data.tag, data.commit.slice(0, 7), data.from ?? T.fromStart), ""];
  lines.push(fill(T.verdictHow, data.tag), "", T.toValidate, "");
  if (!data.points.length) lines.push(T.nothing, "");
  for (const p of data.points) {
    const pr = p.work?.pr ? (data.repo ? `[PR #${p.work.pr}](${data.repo}/pull/${p.work.pr})` : `PR #${p.work.pr}`) : T.noPr;
    lines.push(`- **${p.id}** — ${T.kinds[p.kind]}${p.work ? ` — ${p.work.title} (${pr})` : ""}`);
    lines.push(`  - ${T.what} : ${p.what}`, `  - ${T.how} : ${p.how}`);
  }
  if (data.points.length) lines.push("");
  const v = releaseVerdict(data.verdict);
  const shown = v.excused.length
    ? fill(T.excused, v.status.toUpperCase(), v.excused.map((k) => `${k.id} (${k.title})`).join(", "))
    : v.status?.toUpperCase();
  lines.push(T.nonRegression, "", `- ${fill(T.verdict, data.verdict ? shown : T.unavailable)}`);
  if (data.verdict) {
    lines.push(`- ${fill(T.proven, data.proven.length)}`);
    for (const k of data.proven) lines.push(`  - ${k.id} — ${k.title}`);
  }
  lines.push(`- ${fill(T.os, data.os.length ? data.os.join(", ") : T.noOs)}`);
  if (!data.packages) lines.push(`- ${T.prints} ${T.noTarball}`);
  else if (!data.tarballs) lines.push(`- ${T.prints} ${T.noPrint}`);
  else {
    lines.push(`- ${T.prints}`);
    for (const t of data.tarballs) lines.push(`  - \`${t.name}\` — sha256 \`${t.sha256}\``);
  }
  return `${lines.join("\n")}\n`;
}

/** Points of a sheet read back: [{ id, kind, what }] (verdict and issues cite them). */
export function readPoints(sheet) {
  const out = [];
  for (const m of sheet.matchAll(/^- \*\*(v?[\w.]+-P\d+)\*\* — (.+)\n {2}- [^:\n]+ : (.+)$/gm))
    out.push({ id: m[1], head: m[2], what: m[3] });
  return out;
}

/** Tarball fingerprints of a sheet read back: { name: sha256 }. */
export function readFingerprints(sheet) {
  return Object.fromEntries([...sheet.matchAll(/^ {2}- `([^`]+)` — sha256 `([0-9a-f]{64})`$/gm)].map((m) => [m[1], m[2]]));
}

/** Gathers the sources and renders the sheet of `tag` (candidate) for the range `from..HEAD`. */
export function buildSheet(root, { tag, version, from, tarballs, packages }, run = runner(root)) {
  const T = sheetTexts(root);
  const commit = (run("git", ["rev-parse", "HEAD"]) ?? "").trim();
  const verdict = verifyJson(root, run);
  const works = workstreams(run, from, "HEAD");
  const data = {
    tag,
    version,
    commit,
    from,
    repo: repoUrl(run),
    points: points(version, works, verdict, T),
    verdict,
    proven: provenByTest(root, verdict),
    os: ciOs(run, commit),
    tarballs: tarballs ? tarballs.map((f) => ({ name: f.split(/[\\/]/).pop(), sha256: sha256(f) })) : null,
    packages,
  };
  return renderSheet(data, T);
}
