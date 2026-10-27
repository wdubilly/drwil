// Reading the session logs and aggregating them per workstream (split from consumption.mjs, which re-exports it).
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { TEXTS } from "./consumption-texts.mjs";

/** Pause beyond which time is no longer counted as active. */
export const PAUSE_MS = 15 * 60 * 1000;

/**
 * Indicative weights, in input-token equivalents (price ratios published by Anthropic: output ×5,
 * cache read ×0.1, cache write ×1.25 for 5 minutes). Prices change: the weighted total is only an order
 * of magnitude, the four categories remain the measure.
 */
export const WEIGHTS = { input: 1, output: 5, cacheRead: 0.1, cacheWrite: 1.25 };

/** Logs folder of a project: absolute path, non-alphanumeric characters replaced by "-". */
export function logsFolder(root, env = process.env) {
  const base = env.CLAUDE_CONFIG_DIR ?? join(homedir(), ".claude");
  return join(base, "projects", resolve(root).replace(/[^A-Za-z0-9]/g, "-"));
}

/**
 * Agent answers of a log text: [{ key, time, branch, model, usage }]. Only these fields are extracted;
 * an unreadable line is counted, never guessed.
 */
export function readLog(text) {
  const answers = [];
  let unreadable = 0;
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    let j;
    try {
      j = JSON.parse(line);
    } catch {
      unreadable++;
      continue;
    }
    const usage = j?.message?.usage;
    // "<synthetic>": a message produced by the tool itself (error, interruption), without a model call.
    if (j?.type !== "assistant" || !usage || !j.timestamp || j.message.model === "<synthetic>") continue;
    answers.push({
      key: j.requestId ?? j.message.id ?? j.uuid,
      time: Date.parse(j.timestamp),
      branch: j.gitBranch || null,
      model: j.message.model ?? "unknown",
      usage: {
        input: usage.input_tokens ?? 0,
        output: usage.output_tokens ?? 0,
        cacheRead: usage.cache_read_input_tokens ?? 0,
        cacheWrite: usage.cache_creation_input_tokens ?? 0,
      },
    });
  }
  return { answers, unreadable };
}

/** Group of a branch: the brief for a workstream or scoping branch, otherwise the branch itself. */
export function group(branch, T = TEXTS.en) {
  if (!branch) return T.noBranch;
  if (["master", "main"].includes(branch)) return T.main;
  // `chantier/` and `cadrage/`: names of the branches of the French-named versions.
  const prefix = ["workstream/", "scoping/", "chantier/", "cadrage/"].find((p) => branch.startsWith(p));
  return prefix ? branch.slice(prefix.length) : T.branch(branch);
}

/** Active time: sum of the gaps between successive answers, without the pauses longer than PAUSE_MS. */
export function activeTime(times) {
  const t = [...times].sort((a, b) => a - b);
  let total = 0;
  for (let i = 1; i < t.length; i++) if (t[i] - t[i - 1] <= PAUSE_MS) total += t[i] - t[i - 1];
  return total;
}

/**
 * Aggregates answers: a request counted once (a log repeats an answer over several blocks, each with
 * the request's usage). Returns [{ workstream, requests, input, output, cacheRead, cacheWrite,
 * cacheReadPerRequest, weighted, models, minutes }], most weighted first. The average cache read per
 * request shows the cost of the context read again, which grows with a long session.
 */
export function aggregate(answers, { since = null, T = TEXTS.en } = {}) {
  const seen = new Set();
  const groups = new Map();
  for (const r of answers) {
    if (since !== null && r.time < since) continue;
    if (seen.has(r.key)) continue;
    seen.add(r.key);
    const name = group(r.branch, T);
    const g = groups.get(name) ?? { requests: 0, input: 0, output: 0, cacheRead: 0, cacheWrite: 0, models: new Set(), t: [] };
    groups.set(name, g);
    g.requests++;
    for (const k of Object.keys(WEIGHTS)) g[k] += r.usage[k];
    g.models.add(r.model);
    g.t.push(r.time);
  }
  return [...groups]
    .map(([name, g]) => ({
      workstream: name,
      requests: g.requests,
      input: g.input,
      output: g.output,
      cacheRead: g.cacheRead,
      cacheWrite: g.cacheWrite,
      cacheReadPerRequest: Math.round(g.cacheRead / g.requests),
      weighted: Math.round(Object.entries(WEIGHTS).reduce((s, [k, w]) => s + g[k] * w, 0)),
      models: [...g.models].sort(),
      minutes: Math.round(activeTime(g.t) / 60000),
    }))
    .sort((a, b) => b.weighted - a.weighted || a.workstream.localeCompare(b.workstream));
}
