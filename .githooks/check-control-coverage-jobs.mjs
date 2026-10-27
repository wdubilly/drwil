// Jobs of the CI files and what triggers them (split from check-control-coverage.mjs).
import { existsSync, readFileSync } from "node:fs";
import { globToRegex } from "./glob.mjs";

/** A concrete path under a glob, to know whether a rule would trigger on it. */
export function sample(glob) {
  return glob.replace(/\*\*/g, "a/b").replace(/\*/g, "a");
}

const NOT_JOBS = new Set([
  "stages",
  "variables",
  "default",
  "include",
  "workflow",
  "image",
  "services",
  "cache",
  "before_script",
  "after_script",
  "types",
]);

/** GitLab job name -> { always, changes } (rules: changes:). */
function gitlabJobs(text) {
  const jobs = {};
  let name = null;
  let block = [];
  const flush = () => {
    if (name) jobs[name] = parse(block);
    name = null;
    block = [];
  };
  const parse = (lines) => {
    const changes = [];
    let inside = false;
    for (const line of lines) {
      if (/^\s*(?:-\s+)?changes:\s*$/.test(line)) {
        inside = true;
        continue;
      }
      const item = /^\s*-\s+(\S.*?)\s*$/.exec(line);
      if (inside && item) {
        changes.push(item[1].replace(/^["']|["']$/g, ""));
        continue;
      }
      if (inside && !item) inside = false;
    }
    return { always: !lines.some((l) => /^\s+(?:-\s+)?rules:\s*$/.test(l)), changes };
  };
  for (const line of text.split("\n")) {
    const header = /^([A-Za-z0-9_.-]+):\s*$/.exec(line);
    if (header && !NOT_JOBS.has(header[1])) {
      flush();
      name = header[1];
      block = [];
      continue;
    }
    if (name && line.trim() && !/^[ \t]/.test(line)) {
      flush();
      continue;
    }
    if (name) block.push(line);
  }
  flush();
  return jobs;
}

/**
 * GitHub Actions job name -> { always, changes }. GitHub Actions does not filter a job by
 * path natively (unlike GitLab `rules: changes`): only `on: push/pull_request: paths:`, at
 * workflow level, exists — it then applies to all the jobs of the file. Without that filter
 * (our default template), the workflow runs on every push, so does every job: full coverage,
 * trivial but real.
 */
function githubJobs(text) {
  const lines = text.split("\n");
  const paths = [];
  let inOn = false;
  let inPaths = false;
  for (const line of lines) {
    if (/^on:\s*$/.test(line)) {
      inOn = true;
      continue;
    }
    if (inOn && /^\S/.test(line)) inOn = false;
    if (inOn && /^\s+paths:\s*$/.test(line)) {
      inPaths = true;
      continue;
    }
    const item = /^\s*-\s+(\S.*?)\s*$/.exec(line);
    if (inPaths && item) {
      paths.push(item[1].replace(/^["']|["']$/g, ""));
      continue;
    }
    if (inPaths && !item) inPaths = false;
  }
  const names = [];
  let inJobs = false;
  for (const line of lines) {
    if (/^jobs:\s*$/.test(line)) {
      inJobs = true;
      continue;
    }
    if (inJobs) {
      if (/^\S/.test(line)) {
        inJobs = false;
        continue;
      }
      const m = /^ {2}([A-Za-z0-9_.-]+):\s*$/.exec(line);
      if (m) names.push(m[1]);
    }
  }
  const job = { always: paths.length === 0, changes: paths };
  return Object.fromEntries(names.map((n) => [n, job]));
}

export function ciJobs(file) {
  if (!existsSync(file)) return null;
  const text = readFileSync(file, "utf8");
  return file.endsWith(".gitlab-ci.yml") ? gitlabJobs(text) : githubJobs(text);
}

export function covers(job, path) {
  return job.always || job.changes.some((g) => globToRegex(g).test(path));
}
