#!/usr/bin/env node
// Git adapter of the check engine (.githooks/engine.mjs), run at commit time (pre-commit),
// at push time (pre-push) and in CI. It implements no check: it runs them through the engine
// shared with `drwil verify` and lays out the output for a human who commits.
// QUA-013: a check that did not run is not a passed check.
// Each check therefore ends "failed", "OK" or "not run", never hidden.
// QUA-126, QUA-127: the output shows the failed checks only, then one summary line counting the warnings;
// the full report (each check, its output, every warning) goes to a file — an agent reads the outputs
// again at each request, a passed check's output is only context to pay for.
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { intentsLeftBehind, staleIntents } from "./briefs.mjs";
import { checks, projectRoot, startParallel } from "./engine.mjs";
import { annotate, glossary } from "./glossary.mjs";

const root = projectRoot(import.meta.url);
process.chdir(root);

let cfg = {};
try {
  cfg = JSON.parse(readFileSync(".drwil/ia-first.json", "utf8"));
} catch {}
const lang = cfg.lang === "en" ? "en" : "fr";
const T = {
  fr: {
    project: "contrôles du projet (lint, tests…)",
    noCheck: "aucun déclaré dans .drwil/ia-first.json → checks",
    notRun: "non exécuté :",
    failed: "échec :",
    ok: (n, f) => `contrôles exécutés : OK (${n} avertissement(s), non exécutés compris — détail : ${f})`,
    ko: (k, n, f) => `contrôles exécutés : ${k} en échec, ${n} avertissement(s) — détail : ${f}`,
    leak: (name, n) => `${name} laisse ${n} élément(s) dans son dossier temporaire : le supprimer à la source`,
    keptTmp: (d) => `dossiers temporaires des contrôles en échec gardés pour le diagnostic : ${d}`,
    cleanupFailed: "dossier temporaire de la passe non supprimé (fichier encore ouvert ?)",
    tail: (n, f) => `    … ${n} ligne(s) plus haut, dans ${f}`,
    staleAudit: (f, n) => `audit périmé (${f}, vieux de ${n} jours) : à relancer`,
    staleIntent: (f, n) => `intention sans revue depuis ${n} jours (${f}) : la revoir, la mettre à jour (ligne « Revu le ») ou la clore`,
    intentLeft: (b, i) =>
      `la fiche ${b} est supprimée sans que son intention ${i} soit touchée : la mettre à jour, ou la résumer au journal et la retirer si elle est couverte`,
  },
  en: {
    project: "project checks (lint, tests…)",
    noCheck: "none declared in .drwil/ia-first.json → checks",
    notRun: "not run:",
    failed: "failed:",
    ok: (n, f) => `checks run: OK (${n} warning(s), not run included — detail: ${f})`,
    ko: (k, n, f) => `checks run: ${k} failed, ${n} warning(s) — detail: ${f}`,
    leak: (name, n) => `${name} leaves ${n} item(s) in its temporary folder: remove them at the source`,
    keptTmp: (d) => `temporary folders of the failed checks kept for diagnosis: ${d}`,
    cleanupFailed: "the pass's temporary folder was not removed (file still open?)",
    tail: (n, f) => `    … ${n} line(s) above, in ${f}`,
    staleAudit: (f, n) => `stale audit (${f}, ${n} days old): time to re-run`,
    staleIntent: (f, n) => `intent not reviewed for ${n} days (${f}): review it, update it ("Reviewed on" line) or close it`,
    intentLeft: (b, i) =>
      `brief ${b} is deleted without touching its intent ${i}: update it, or summarise it in the journal and remove it when covered`,
  },
}[lang];

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
const list = checks(root, { cfg, staged });
// Checks with a `runAsync` (setting `parallel`) are all started up front; their result is read
// here in the list order, so the report and the verdict are those of a sequential run.
const started = startParallel(list);
const leaks = [];
for (const c of list) {
  let r;
  if (started.has(c.id)) {
    r = await started.get(c.id);
    if (r.launched) announce(c.name);
  } else r = c.run({ beforeRun: announce, stdio: "pipe", maxBuffer: 1 << 30 });
  if (r.leaked) leaks.push({ name: c.name, count: r.leaked });
  if (r.output) report.push(r.output.replace(/\n$/, ""));
  if (r.status === "fail") {
    failures.push(r.message ?? c.name);
    outputs.set(failures.at(-1), r.output);
  } else if (r.status === "not-run") unrun(`${c.name} (${r.detail})`, r.configured);
}
const end = list.finish();
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
const summary = `[ia-first] ${failures.length ? T.ko(failures.length, warnings.length, DETAIL) : T.ok(warnings.length, DETAIL)}${end.kept ? ` — ${T.keptTmp(end.kept)}` : ""}`;
// Never at the cost of the verdict: a report that cannot be written changes nothing to the exit code.
try {
  mkdirSync(".drwil/evidence", { recursive: true });
  writeFileSync(
    DETAIL,
    `${[...report, ...warnings, ...failures.map((c) => label(`[ia-first] ✗ ${T.failed} ${c}`)), summary].join("\n")}\n`,
  );
} catch {}
for (const line of [...shown, summary]) console.log(line);
if (failures.length) process.exitCode = 1;
