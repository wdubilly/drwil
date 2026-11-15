#!/usr/bin/env node
// Token consumption per workstream, with nothing to type (QUA-042). Sources: Claude Code's session logs
// (~/.claude/projects/<project path, non-alphanumeric characters as "-">/*.jsonl), where each agent
// answer carries its tokens, model, timestamp and the git branch of the moment, and Copilot CLI's
// (~/.copilot/session-state/<session>/events.jsonl, every project mixed: only the calls made in the
// project count); one branch per brief (`workstream/<brief>`, and `scoping/<brief>` or `cadrage/<brief>`
// for its scoping) attributes it, the two tools' parts summed. The logs hold the whole conversation:
// only the consumption fields are read, never a message content is shown or written. Each workstream's requests
// are split by the governance activity of their instant (consumption-split.mjs, QUA-306). Never blocking:
// without a readable log, it says so and exits 0.
// Usage: node .githooks/consumption.mjs [--since YYYY-MM-DD (UTC)] [--json] [--logs <folder>] [--copilot-logs <folder>]
//        node .githooks/consumption.mjs --record <brief> (at closing: one line in .drwil/usage.jsonl)
//        node .githooks/consumption.mjs --recorded (the recorded workstreams compared, no log needed)
import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, realpathSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { activeTime, aggregate, copilotFolder, group, logsFolder, PAUSE_MS, readCopilotLog, readLog, WEIGHTS } from "./consumption-log.mjs";
import { format, formatRecorded, formatSplit, formatSplitCount, readable, usageLine } from "./consumption-format.mjs";
import { briefBranch, briefHistory, recordedSplit, split } from "./consumption-split.mjs";
import { TEXTS, TOOLS, USAGE } from "./consumption-texts.mjs";

export {
  PAUSE_MS,
  WEIGHTS,
  activeTime,
  aggregate,
  copilotFolder,
  group,
  format,
  formatRecorded,
  logsFolder,
  readCopilotLog,
  readLog,
  usageLine,
};

const jsonlFiles = (folder) =>
  readdirSync(folder).flatMap((name) => {
    const path = join(folder, name);
    if (statSync(path).isDirectory()) return jsonlFiles(path);
    return name.endsWith(".jsonl") ? [path] : [];
  });

/**
 * Copilot CLI's calls made in the project. A session log that never writes the project's path (as JSON
 * escapes it) cannot hold one of its calls: it is not parsed, its unreadable lines are not counted.
 */
function copilotAnswers(folder, root) {
  const answers = [];
  let unreadable = 0;
  const path = JSON.stringify(resolve(root)).slice(1, -1);
  for (const name of existsSync(folder) ? readdirSync(folder) : []) {
    const file = join(folder, name, "events.jsonl");
    const text = existsSync(file) ? readFileSync(file, "utf8") : "";
    if (!text.includes(path)) continue;
    const r = readCopilotLog(text, root);
    answers.push(...r.answers);
    unreadable += r.unreadable;
  }
  return { answers, unreadable };
}

/** aggregate, each row with its part per tool (`tools`: { tool: row }); keys never shared between tools. */
export function aggregateTools(answers, opt = {}) {
  const parts = Object.keys(TOOLS).map((tool) => [
    tool,
    aggregate(
      answers.filter((a) => a.tool === tool),
      opt,
    ),
  ]);
  return aggregate(answers, opt).map((row) => ({
    ...row,
    tools: Object.fromEntries(parts.flatMap(([tool, rows]) => rows.filter((r) => r.workstream === row.workstream).map((r) => [tool, r]))),
  }));
}

/** Reads the arguments and the logs, prints or records; returns the exit code. */
export function main(args, { env = process.env, root = process.cwd(), log = console.log, err = console.error, now = new Date() } = {}) {
  let lang = "fr";
  try {
    lang = JSON.parse(readFileSync(join(root, ".drwil", "ia-first.json"), "utf8"))?.lang === "en" ? "en" : "fr";
  } catch {}
  const T = TEXTS[lang];
  const opt = { json: false, since: null, logs: null, copilotLogs: null, record: null, recorded: false };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--json") opt.json = true;
    else if (args[i] === "--since") opt.since = Date.parse(args[++i]);
    else if (args[i] === "--logs") opt.logs = args[++i];
    else if (args[i] === "--copilot-logs") opt.copilotLogs = args[++i];
    else if (args[i] === "--record") opt.record = args[++i] ?? "";
    else if (args[i] === "--recorded") opt.recorded = true;
  }
  const usagePath = join(root, USAGE);
  const usage = () => (existsSync(usagePath) ? readFileSync(usagePath, "utf8") : "");
  if (opt.recorded) {
    const out = formatRecorded(usage(), T);
    (out ? log : err)(out ?? T.noRecorded);
    if (out) log(formatSplitCount(recordedSplit(usage()), T));
    return 0;
  }
  if (Number.isNaN(opt.since)) {
    err(T.badDate);
    return 2;
  }
  if (opt.record !== null && !/^\w[\w.-]*$/.test(opt.record)) {
    err(T.noBrief);
    return 2;
  }
  const folder = opt.logs ?? logsFolder(root, env);
  const copilotLogs = opt.copilotLogs ?? copilotFolder(env);
  const answers = [];
  let unreadable = 0;
  // Tagged per tool, the key prefixed with it: two tools' calls are never taken for one another.
  const add = (tool, r) => {
    for (const a of r.answers) answers.push({ ...a, key: `${tool}:${a.key}`, tool });
    unreadable += r.unreadable;
  };
  if (existsSync(folder)) for (const f of jsonlFiles(folder)) add("claude-code", readLog(readFileSync(f, "utf8")));
  add("copilot-cli", copilotAnswers(copilotLogs, root));
  // Without a log, nothing is measured: never "0 token" — but never blocking either.
  if (!existsSync(folder) && !answers.length && !unreadable) {
    err(T.noLogs(folder, copilotLogs));
    return 0;
  }
  const rows = aggregateTools(answers, { since: opt.since, T }).filter((r) => opt.record === null || r.workstream === opt.record);
  // Only a brief's branches are split; the history is only that of the state's workstream (QUA-306).
  for (const row of rows) {
    const own = answers.filter((a) => group(a.branch, T) === row.workstream);
    if (own.some((a) => briefBranch(a.branch))) row.activities = split(own, briefHistory(root, row.workstream), { since: opt.since });
  }
  if (unreadable && !opt.json) err(T.unreadable(unreadable));
  if (!rows.length) {
    err(T.noAnswer(folder, copilotLogs));
    return 0;
  }
  if (opt.record !== null) {
    const lines = usage().split("\n");
    const known = lines.some((l) => {
      try {
        return JSON.parse(l).workstream === opt.record;
      } catch {
        return false;
      }
    });
    if (known) {
      log(T.already(opt.record));
      return 0;
    }
    mkdirSync(join(root, ".drwil"), { recursive: true });
    appendFileSync(usagePath, `${JSON.stringify(usageLine(rows[0], now.toISOString().slice(0, 10)))}\n`);
    const parts = Object.entries(rows[0].tools).map(([tool, r]) => [TOOLS[tool].name, r.weighted]);
    log(T.recorded(opt.record, rows[0].weighted, readable(rows[0].cacheReadPerRequest, lang === "fr"), parts));
    if (rows[0].activities) log(formatSplit(opt.record, rows[0].activities, T));
    return 0;
  }
  const count = recordedSplit(usage());
  if (opt.json) log(JSON.stringify({ version: 1, unreadable, workstreams: rows, split: count }, null, 2));
  else {
    const splits = rows.filter((r) => r.activities).map((r) => formatSplit(r.workstream, r.activities, T));
    log([format(rows, T), "", ...splits, formatSplitCount(count, T)].join("\n"));
  }
  return 0;
}

// Through a symbolic link (an installed copy), argv[1] is the link: compare the real paths.
if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  process.exitCode = main(process.argv.slice(2));
}
