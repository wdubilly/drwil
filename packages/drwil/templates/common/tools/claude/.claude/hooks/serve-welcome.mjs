#!/usr/bin/env node
// Session welcome of `drwil serve` (QUA-277): when the human chose the automatic start, the server is started
// if it is not running and the link reaches the human through `systemMessage`, which the tool shows and never
// sends to the model. stdout carries that JSON only; no other output, and Copilot CLI, which has no such channel
// (only `additionalContext`, read by the model), gets nothing: its human asks /drwil-serve. Never blocks the session.
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// Below the timeout declared for this hook in each tool (15 s).
const WAIT_MS = 12000;
const LOCAL_CLIS = ["node_modules/drwil/bin/drwil.js", "packages/drwil/bin/drwil.js"];
const FAILED = {
  fr: "drwil serve : le serveur n'a pas démarré. Lancer « npx drwil serve --welcome » pour en voir la raison.",
  en: 'drwil serve: the server did not start. Run "npx drwil serve --welcome" to see why.',
};

function readConfig(root) {
  try {
    return JSON.parse(readFileSync(join(root, ".drwil", "ia-first.json"), "utf8"));
  } catch {
    return {};
  }
}

function startServer(root) {
  const local = LOCAL_CLIS.map((rel) => join(root, rel)).find((file) => existsSync(file));
  const [command, args] = local ? [process.execPath, [local]] : ["npx", ["--no-install", "drwil"]];
  // A shell only for npx, a .cmd on Windows; its arguments are fixed.
  return spawnSync(command, [...args, "serve", "--welcome"], {
    cwd: root,
    encoding: "utf8",
    timeout: WAIT_MS,
    stdio: ["ignore", "pipe", "ignore"],
    windowsHide: true,
    shell: !local,
  });
}

/** The message for the human, or null when there is nothing to say. */
export function welcome(root, tool) {
  const config = readConfig(root);
  if (config.serveAutostart !== true) return null;
  const run = startServer(root);
  if (tool === "copilot") return null;
  const line = run.status === 0 ? run.stdout.trim() : "";
  return line || FAILED[config.lang === "fr" ? "fr" : "en"];
}

// Real paths on both sides: a project path through a symbolic link must still run the hook.
if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  try {
    // The folder holding this hook's .claude/, never the current folder (QUA-044).
    const message = welcome(join(dirname(fileURLToPath(import.meta.url)), "..", ".."), process.argv[2]);
    if (message) console.log(JSON.stringify({ systemMessage: message }));
  } catch {}
}
