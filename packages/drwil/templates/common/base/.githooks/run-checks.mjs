#!/usr/bin/env node
// Git adapter of the check engine (.githooks/engine.mjs), run at commit time (pre-commit),
// at push time (pre-push) and in CI. It implements no check: it runs them through the engine
// shared with `drwil verify` and lays out the output for a human who commits.
// QUA-013: a check that did not run is not a passed check.
// Each check therefore ends "failed", "OK" or "not run", never hidden.
// QUA-126, QUA-127: the output shows the failed checks only, then one summary line counting the warnings;
// the full report (each check, its output, every warning) goes to a file — an agent reads the outputs
// again at each request, a passed check's output is only context to pay for.
// QUA-140: a pass outside any hook leaves each check's verdict (ok / fail) with the fingerprint of the tree, for `drwil verify` to reuse.
// QUA-141: outside any hook and CI, a check "ok" whose own fingerprint (its declaration and the files of its `paths`) is the one of the
// last pass is not replayed (`--tout-rejouer` / `--replay-all` replays everything); its verdict keeps its own fingerprint only.
// QUA-152: the pre-push does the same, from the verdicts of `run-checks` and its own (a separate file `verify` ignores), only when the
// working tree is the pushed commit; never in CI.
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { intentsLeftBehind, staleIntents } from "./briefs.mjs";
import { checks, projectRoot, startParallel, treeFingerprint } from "./engine.mjs";
import { annotate, glossary } from "./glossary.mjs";
import { loadReuse, saveVerdicts } from "./run-checks-verdicts.mjs";
import { TEXTS } from "./run-checks-texts.mjs";

const root = projectRoot(import.meta.url);
process.chdir(root);

let cfg = {};
try {
  cfg = JSON.parse(readFileSync(".drwil/ia-first.json", "utf8"));
} catch {}
const lang = cfg.lang === "en" ? "en" : "fr";
const T = TEXTS[lang];

// At pre-commit only (DRWIL_HOOK=pre-commit, set by .githooks/pre-commit), the engine defers
// a project check outside its `paths`. If git does not answer, everything runs (never deferred by default).
function stagedFiles() {
  if (process.env.DRWIL_HOOK !== "pre-commit") return null;
  const r = spawnSync("git", ["diff", "--cached", "--name-only", "--no-renames", "-z"], { encoding: "utf8" });
  return r.status === 0 ? r.stdout.split("\0").filter(Boolean) : null;
}

// Only the commit may leave a check unrun (a check deferred outside its `paths` is replayed on push
// and in CI): everywhere else a check that did not run fails, never a green light (QUA-013).
const atCommit = process.env.DRWIL_HOOK === "pre-commit";
const failures = [];
const notRun = [];
// An unconfigured project (no CI, no declared check) stays a visible warning: only a check that
// should have run and could not (missing tool, deferred) blocks.
// In CI nothing is "unconfigured": the pipeline must be complete.
const unrun = (what, configured = false) =>
  (atCommit || (configured && !process.env.CI) ? notRun : failures).push(
    atCommit || (configured && !process.env.CI) ? what : `${T.notRun} ${what}`,
  );
// The full report, written to DETAIL at the end; the output keeps the failures and the summary.
const DETAIL = ".drwil/evidence/run-checks.log";
const report = [];
const outputs = new Map();
const announce = (name) => report.push(`[ia-first] ${name}…`);
// "not-applicable" (excluded by design: minimal mode, QUA-017 in CI…) is not shown, as before.
const staged = stagedFiles();
// A hook pass judges the index or the pushed reference, not the whole tree `drwil verify` judges: it leaves nothing to reuse.
const hooked = ["DRWIL_HOOK", "DRWIL_PUSH_REFS", "DRWIL_PUSH_TAGS_ONLY", "DRWIL_PUSH_NO_BRANCH"].some((k) => process.env[k]);
const fingerprint = hooked ? null : treeFingerprint(root);
const verdicts = {};
const ranAt = new Date().toISOString();
// Only `secrets` judges something else here than in `drwil verify` (the index, not the whole history, outside CI): never reusable.
const reusableByVerify = (id) => id !== "secrets" || Boolean(process.env.CI);
const list = checks(root, { cfg, staged });
// QUA-141: the verdicts of the last pass, to keep an "ok" whose check files did not change (never in a hook or in CI, never with the option).
const replayAll = process.argv.some((a) => a === "--tout-rejouer" || a === "--replay-all");
const { prePush, controls, reuseActive, keptFrom } = loadReuse(list, { hooked, atCommit, replayAll });
const reused = new Set(keptFrom.keys());
// Checks with a `runAsync` (setting `parallel`) are all started up front; their result is read
// here in the list order, so the report and the verdict are those of a sequential run.
const started = startParallel(list.filter((c) => !reused.has(c.id)));
const leaks = [];
const timings = [];
// A check (a test of the package…) reports a non-blocking warning by printing a line "[ia-first-warning] <text>": counted in the summary.
const flagged = [];
for (const c of list) {
  let r;
  if (reused.has(c.id)) {
    const { v, name } = keptFrom.get(c.id);
    verdicts[c.id] = v;
    report.push(`[ia-first] ${c.name} : ${T.reused(v.ranAt, name)}`);
    continue;
  }
  if (started.has(c.id)) {
    r = await started.get(c.id);
    if (r.launched) announce(c.name);
  } else r = c.run({ beforeRun: announce, stdio: "pipe", maxBuffer: 1 << 30 });
  if (r.status === "ok" || r.status === "fail")
    verdicts[c.id] = {
      status: r.status,
      reusable: reusableByVerify(c.id),
      durationMs: r.durationMs,
      output: (r.output ?? "").split("\n").slice(-20).join("\n"),
      ranAt,
      control: controls.get(c.id) ?? null,
    };
  if (reuseActive && reused.size > 0 && r.durationMs !== undefined) report.push(`[ia-first] ${c.name} : ${T.replayed}`);
  if (r.leaked) leaks.push({ name: c.name, count: r.leaked });
  if (r.output) report.push(r.output.replace(/\n$/, ""));
  for (const m of (r.output ?? "").matchAll(/^\[ia-first-warning\] (.+)$/gm)) flagged.push(m[1].trim());
  if (r.durationMs !== undefined) {
    report.push(`[ia-first] ${c.name} : ${T.duration(r.durationMs)}`);
    timings.push({ name: c.name, ms: r.durationMs });
  }
  if (r.status === "fail") {
    failures.push(r.message ?? c.name);
    outputs.set(failures.at(-1), r.output);
  } else if (r.status === "not-run") unrun(`${c.name} (${r.detail})`, r.configured);
}
const end = list.finish();
saveVerdicts({ root, list, verdicts, reused, fingerprint, ranAt, hooked, prePush });
if (!Array.isArray(cfg.checks) || !cfg.checks.length) unrun(`${T.project} (${T.noCheck})`, true);

// Non-blocking reminder (comfort, not a contract): an audit (opportunity, risks/debt) whose
// "Dernier scan"/"Last scan" is more than 30 days old would benefit from a re-run.
const STALE_AFTER_DAYS = 30;
for (const file of [
  { fr: "docs/audit-risques.md", en: "docs/audit-risks.md" }[lang],
  { fr: "docs/decouverte-valeur.md", en: "docs/value-discovery.md" }[lang],
]) {
  if (!existsSync(file)) continue;
  const line = readFileSync(file, "utf8")
    .split(/\r?\n/)
    .find((l) => /^>\s*(dernier scan|last scan)/i.test(l));
  const m = line?.match(/\d{4}-\d{2}-\d{2}/);
  if (!m) continue;
  const days = Math.floor((Date.now() - new Date(m[0]).getTime()) / 86400000);
  if (days >= STALE_AFTER_DAYS) notRun.push(T.staleAudit(file, days));
}

// Reminders on the intents (QUA-036): never blocking, they say what the closing left behind.
const reminders = [
  ...(staged ? intentsLeftBehind(root, staged).map((l) => T.intentLeft(l.brief, l.intent)) : []),
  ...staleIntents(root, cfg).map((s) => T.staleIntent(s.file, s.days)),
];

// An ID cited to the human comes with its label (QUA-039).
const labels = glossary(root);
const label = (line) => annotate(line, labels);
const warnings = [
  ...notRun.map((c) => `[ia-first] ⚠ ${T.notRun} ${c}`),
  ...reminders.map((r) => `[ia-first] ⚠ ${r}`),
  ...flagged.map((w) => `[ia-first] ⚠ ${w}`),
  ...leaks.map((l) => `[ia-first] ⚠ ${T.leak(l.name, l.count)}`),
  ...(end.cleanupFailed ? [`[ia-first] ⚠ ${T.cleanupFailed}`] : []),
].map(label);
// A failed check comes with the end of its output (in CI, the whole of it: the file does not outlive the job).
const TAIL = 40;
const shown = [];
for (const c of failures) {
  shown.push(label(`[ia-first] ✗ ${T.failed} ${c}`));
  const lines = (outputs.get(c) ?? "").replace(/\n$/, "").split("\n").filter(Boolean);
  const cut = process.env.CI ? 0 : Math.max(0, lines.length - TAIL);
  if (cut) shown.push(T.tail(cut, DETAIL));
  shown.push(...lines.slice(cut).map((l) => `    ${l}`));
}
// QUA-126: the three slowest checks of the pass, to see where the time goes without opening the detail.
// Never empty: the checks of the base (docs, contracts, architecture) always run.
const slowest = timings.toSorted((a, b) => b.ms - a.ms);
const slowestSummary = ` — ${T.slowestSummary} ${slowest
  .slice(0, 3)
  .map((t) => `${t.name} ${t.ms} ms`)
  .join(", ")}`;
const reuseSummary = reused.size ? ` — ${T.reuseSummary(reused.size, timings.length)}` : "";
const summary = `[ia-first] ${failures.length ? T.ko(failures.length, warnings.length, DETAIL) : T.ok(warnings.length, DETAIL)}${reuseSummary}${slowestSummary}${end.kept ? ` — ${T.keptTmp(end.kept)}` : ""}`;
// Never at the cost of the verdict: a report that cannot be written changes nothing to the exit code.
try {
  mkdirSync(".drwil/evidence", { recursive: true });
  writeFileSync(
    DETAIL,
    `${[
      ...report,
      ...warnings,
      ...failures.map((c) => label(`[ia-first] ✗ ${T.failed} ${c}`)),
      summary,
      `[ia-first] ${T.slowest}`,
      ...slowest.map((t) => `  ${t.ms} ms  ${t.name}`),
    ].join("\n")}\n`,
  );
} catch {}
for (const line of [...shown, summary]) console.log(line);
if (failures.length) process.exitCode = 1;
