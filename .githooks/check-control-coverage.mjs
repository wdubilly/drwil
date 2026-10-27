#!/usr/bin/env node
// QUA-013 (a check that did not run did not pass): a "degradable" check (gitleaks
// missing…) that does not run locally must leave no blind spot — a CI job must
// trigger on the same paths. Checking that the job exists is not enough: a job can
// exist and never trigger if its `paths`/`rules: changes` do not cover those paths.
// So the trigger is checked, not the name.
//
// Base checks, hard-coded (each new check of run-checks.mjs must be added here);
// the project's checks (.drwil/ia-first.json → checks) can be covered too by adding
// paths + ciJob (and degradable if needed) — otherwise they are not verified, for
// compatibility.
import { readFileSync } from "node:fs";
import { ciJobs, covers, sample } from "./check-control-coverage-jobs.mjs";

const BASE = [
  {
    id: "secrets",
    degradable: true,
    degradation: "gitleaks missing on the machine: the hook does not check secrets",
    paths: ["**"],
    ciJob: "checks",
  },
  {
    id: "docs-references",
    degradable: false,
    paths: ["AGENTS.md", "CLAUDE.md", "GEMINI.md", "README.md", "INSTALL.md", "docs/**", ".claude/**", ".githooks/**"],
    ciJob: "checks",
  },
  // Replayed in CI on each commit of the branch (Drwil-Brief trailer): never degraded.
  { id: "scope-gate", degradable: false, paths: ["**"], ciJob: "checks" },
  { id: "checks-self-test", degradable: false, paths: [".githooks/**"], ciJob: "checks" },
];

let cfg = {};
try {
  cfg = JSON.parse(readFileSync(".drwil/ia-first.json", "utf8"));
} catch {}
const lang = cfg.lang === "en" ? "en" : "fr";
const T = {
  fr: {
    title: "Contrôles (QUA-013) : couverture CI absente ou inopérante :",
    missingJob: (id, job, f) => `${id} : job CI « ${job} » absent de ${f}`,
    noPath: (id) => `${id} : aucun chemin déclaré (que doit protéger ce contrôle ?)`,
    notTriggered: (id, job, glob, f, triggers) =>
      `${id} : le job CI « ${job} » (${f}) ne se déclenche pas sur \`${glob}\` (changes : ${triggers})`,
    neverCaught: " ; dégradable : rien ne le rattrape localement",
    none: "aucun",
  },
  en: {
    title: "Checks (QUA-013): missing or inoperative CI coverage:",
    missingJob: (id, job, f) => `${id}: CI job "${job}" missing from ${f}`,
    noPath: (id) => `${id}: no path declared (what should this check protect?)`,
    notTriggered: (id, job, glob, f, triggers) => `${id}: CI job "${job}" (${f}) does not trigger on \`${glob}\` (changes: ${triggers})`,
    neverCaught: "; degradable: nothing catches it locally",
    none: "none",
  },
}[lang];

const ciFiles = Array.isArray(cfg.ciFiles) ? cfg.ciFiles : [];
const checks = [...BASE, ...(Array.isArray(cfg.checks) ? cfg.checks : []).filter((c) => c.ciJob)];
const errors = [];

for (const file of ciFiles) {
  const jobs = ciJobs(file);
  if (!jobs) continue;
  for (const c of checks) {
    if (!jobs[c.ciJob]) {
      errors.push(T.missingJob(c.id, c.ciJob, file));
      continue;
    }
    if (!c.paths?.length) {
      errors.push(T.noPath(c.id));
      continue;
    }
    for (const glob of c.paths) {
      if (!covers(jobs[c.ciJob], sample(glob))) {
        const triggers = jobs[c.ciJob].changes.join(", ") || T.none;
        errors.push(T.notTriggered(c.id, c.ciJob, glob, file, triggers) + (c.degradable ? T.neverCaught : ""));
      }
    }
  }
}

if (errors.length) {
  console.log(`${T.title}\n  ${errors.join("\n  ")}`);
  process.exit(1);
}
