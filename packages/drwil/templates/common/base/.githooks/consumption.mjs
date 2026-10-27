#!/usr/bin/env node
// Token consumption per workstream, with nothing to type (QUA-042). Source: Claude Code's session logs
// (~/.claude/projects/<project path, non-alphanumeric characters as "-">/*.jsonl), where each agent
// answer carries its tokens, model, timestamp and the git branch of the moment; one branch per brief
// (`workstream/<brief>`, and `scoping/<brief>` or `cadrage/<brief>` for its scoping) attributes it.
// The logs hold the whole conversation: only the consumption fields are read, never a message content
// is shown or written. Never blocking: without a readable log, it says so and exits 0.
// Usage: node .githooks/consumption.mjs [--since YYYY-MM-DD (UTC)] [--json] [--logs <folder>]
//        node .githooks/consumption.mjs --record <brief> (at closing: one line in .drwil/usage.jsonl)
//        node .githooks/consumption.mjs --recorded (the recorded workstreams compared, no log needed)
import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, realpathSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { activeTime, aggregate, group, logsFolder, PAUSE_MS, readLog, WEIGHTS } from "./consumption-log.mjs";
import { format, formatRecorded, readable, usageLine } from "./consumption-format.mjs";
import { TEXTS, USAGE } from "./consumption-texts.mjs";

export { PAUSE_MS, WEIGHTS, activeTime, aggregate, group, format, formatRecorded, logsFolder, readLog, usageLine };

const jsonlFiles = (folder) =>
  readdirSync(folder).flatMap((name) => {
    const path = join(folder, name);
    if (statSync(path).isDirectory()) return jsonlFiles(path);
    return name.endsWith(".jsonl") ? [path] : [];
  });

/** Reads the arguments and the logs, prints or records; returns the exit code. */
export function main(args, { env = process.env, root = process.cwd(), log = console.log, err = console.error, now = new Date() } = {}) {
  let lang = "fr";
  try {
    lang = JSON.parse(readFileSync(join(root, ".drwil", "ia-first.json"), "utf8"))?.lang === "en" ? "en" : "fr";
  } catch {}
  const T = TEXTS[lang];
  const opt = { json: false, since: null, logs: null, record: null, recorded: false };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--json") opt.json = true;
    else if (args[i] === "--since") opt.since = Date.parse(args[++i]);
    else if (args[i] === "--logs") opt.logs = args[++i];
    else if (args[i] === "--record") opt.record = args[++i] ?? "";
    else if (args[i] === "--recorded") opt.recorded = true;
  }
  if (opt.recorded) {
    const path = join(root, USAGE);
    const out = formatRecorded(existsSync(path) ? readFileSync(path, "utf8") : "", T);
    (out ? log : err)(out ?? T.noRecorded);
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
  // Without a log, nothing is measured: never "0 token" — but never blocking either.
  if (!existsSync(folder)) {
    err(T.noLogs(folder));
    return 0;
  }
  const answers = [];
  let unreadable = 0;
  for (const f of jsonlFiles(folder)) {
    const r = readLog(readFileSync(f, "utf8"));
    answers.push(...r.answers);
    unreadable += r.unreadable;
  }
  const rows = aggregate(answers, { since: opt.since, T }).filter((r) => opt.record === null || r.workstream === opt.record);
  if (unreadable && !opt.json) err(T.unreadable(unreadable));
  if (!rows.length) {
    err(T.noAnswer(folder));
    return 0;
  }
  if (opt.record !== null) {
    const path = join(root, USAGE);
    const lines = existsSync(path) ? readFileSync(path, "utf8").split("\n") : [];
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
    appendFileSync(path, `${JSON.stringify(usageLine(rows[0], now.toISOString().slice(0, 10)))}\n`);
    log(T.recorded(opt.record, rows[0].weighted, readable(rows[0].cacheReadPerRequest, lang === "fr")));
    return 0;
  }
  log(opt.json ? JSON.stringify({ version: 1, unreadable, workstreams: rows }, null, 2) : format(rows, T));
  return 0;
}

// Through a symbolic link (an installed copy), argv[1] is the link: compare the real paths.
if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  process.exitCode = main(process.argv.slice(2));
}
