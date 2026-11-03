#!/usr/bin/env node
// Runs a long command in the background and waits for its verdict, never longer than a bound (QUA-219,
// QUA-220). A subagent that loops on `pgrep` sees its own loop and never ends: here the wait is bounded,
// says « still running » at the deadline without killing the command, and a second launch of the same
// command joins the one running instead of duplicating it, and a verdict, once delivered, is consumed:
// the next call runs the command again. The verdict file holds the exit code only:
// the output stays in a local log, never in the verdict (QUA-013: not run is not passed).
// Usage: node .githooks/wait-command.mjs [--wait <seconds>] [--status] <command…>
// Exit code: 0 passed, 1 failed, 2 not run or interrupted, 3 still running.
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { closeSync, mkdirSync, openSync, readFileSync, realpathSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const TEXTS = {
  fr: {
    passed: "[wait-command] terminée, réussie (code 0). Sortie : {0}",
    failed: "[wait-command] terminée, en échec (code {0}). Sortie : {1}",
    interrupted: "[wait-command] non exécutée ou interrompue : aucun verdict. Relancer la commande.",
    running: "[wait-command] toujours en cours après {0} s. Relancer la même commande pour attendre encore (rien n'est tué).",
    none: "[wait-command] aucune exécution connue de cette commande.",
    usage: "[wait-command] usage : node .githooks/wait-command.mjs [--wait <secondes>] [--status] <commande…>",
  },
  en: {
    passed: "[wait-command] finished, passed (code 0). Output: {0}",
    failed: "[wait-command] finished, failed (code {0}). Output: {1}",
    interrupted: "[wait-command] not run or interrupted: no verdict. Run the command again.",
    running: "[wait-command] still running after {0} s. Run the same command again to keep waiting (nothing is killed).",
    none: "[wait-command] no known run of this command.",
    usage: "[wait-command] usage: node .githooks/wait-command.mjs [--wait <seconds>] [--status] <command…>",
  },
};

const fill = (message, ...values) => message.replace(/\{(\d)\}/g, (_, i) => values[i]);

/** Messages in the project's language (French by default). */
export function texts(root = process.cwd()) {
  try {
    return TEXTS[JSON.parse(readFileSync(join(root, ".drwil", "ia-first.json"), "utf8")).lang === "en" ? "en" : "fr"];
  } catch {
    return TEXTS.fr;
  }
}

/** Command line: `[--wait <seconds>] [--status] <command…>`; 100 s by default, under the 120 s of a tool call. */
export function parseArgs(argv) {
  const rest = [...argv];
  const status = rest.includes("--status");
  if (status) rest.splice(rest.indexOf("--status"), 1);
  const i = rest.indexOf("--wait");
  const wait = i >= 0 ? Number(rest[i + 1]) : 100;
  if (i >= 0) rest.splice(i, 2);
  return { wait: wait >= 0 ? wait : 100, status, command: rest.join(" ") };
}

const dir = (root) => join(root, ".drwil", "evidence", "wait");
const keyOf = (command) => createHash("sha256").update(command).digest("hex").slice(0, 12);
const verdictFile = (root, key) => join(dir(root), `${key}.json`);
const pidFile = (root, key) => join(dir(root), `${key}.pid`);
const logFile = (root, key) => join(dir(root), `${key}.log`);

const alive = (pid) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};

/** The state of a command: { state: "none" | "running" | "done" | "interrupted", exit?, log? }. */
export function read(root, command) {
  const key = keyOf(command);
  const log = logFile(root, key);
  try {
    return { state: "done", exit: JSON.parse(readFileSync(verdictFile(root, key), "utf8")).exit, log };
  } catch {
    // no verdict yet: the pid file says whether the runner still lives
  }
  try {
    return { state: alive(Number(readFileSync(pidFile(root, key), "utf8"))) ? "running" : "interrupted", log };
  } catch {
    return { state: "none" };
  }
}

/** Starts the command detached; only the runner writes the verdict, only the launcher writes the pid. */
export function launch(root, command, script = fileURLToPath(import.meta.url)) {
  const key = keyOf(command);
  mkdirSync(dir(root), { recursive: true });
  rmSync(verdictFile(root, key), { force: true });
  const runner = spawn(process.execPath, [script, "--exec", root, command], { detached: true, stdio: "ignore" });
  runner.unref();
  writeFileSync(pidFile(root, key), String(runner.pid));
}

/** The runner: plays the command with its output in the log, then writes the verdict. */
export function exec(root, command) {
  const key = keyOf(command);
  const fd = openSync(logFile(root, key), "w");
  const child = spawn(command, { shell: true, cwd: root, stdio: ["ignore", fd, fd] });
  child.on("close", (code) => {
    closeSync(fd);
    // renamed into place: a reader never sees a half-written verdict, which it would take for an interrupted run
    writeFileSync(`${verdictFile(root, key)}.tmp`, JSON.stringify({ exit: code ?? 1 }));
    renameSync(`${verdictFile(root, key)}.tmp`, verdictFile(root, key));
  });
}

/** Launches if needed, then waits at most `wait` seconds; returns { code, message }. */
export async function waitFor({ root = process.cwd(), command, wait, status, interval = 500, T = texts(root) }) {
  if (!command) return { code: 2, message: T.usage };
  let v = read(root, command);
  if (status && v.state === "none") return { code: 2, message: T.none };
  if (!status && (v.state === "none" || v.state === "interrupted")) {
    launch(root, command);
    v = { state: "running" };
  }
  const end = Date.now() + (status ? 0 : wait) * 1000;
  while (v.state === "running" && Date.now() < end) {
    await new Promise((r) => setTimeout(r, interval));
    v = read(root, command);
  }
  if (v.state === "running") return { code: 3, message: fill(T.running, status ? 0 : wait) };
  if (v.state === "interrupted") return { code: 2, message: T.interrupted };
  if (!status) {
    // the pid goes with the verdict: a runner still shutting down must not pass for a live run of the next call
    rmSync(verdictFile(root, keyOf(command)));
    rmSync(pidFile(root, keyOf(command)));
  }
  if (v.exit === 0) return { code: 0, message: fill(T.passed, v.log) };
  return { code: 1, message: fill(T.failed, v.exit, v.log) };
}

if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  if (process.argv[2] === "--exec") exec(process.argv[3], process.argv[4]);
  else {
    const r = await waitFor(parseArgs(process.argv.slice(2)));
    (r.code === 0 ? console.log : console.error)(r.message);
    process.exitCode = r.code;
  }
}
