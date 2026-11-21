#!/usr/bin/env node
// Acceptance verdict from the chat (QUA-053): prints the `drwil-verdict` poll the agent asks as is to the human,
// with the same checks as the terminal; writes nothing. Only the hook (.claude/hooks/verdict-poll.mjs), on the
// human's answer in the tool's result, calls `verdictFromPoll`, which records the verdict as the terminal does.
// Usage: node .githooks/release-verdict-poll.mjs <vX.Y.Z-rc.N> --approve | [--reserve <point>]... [--refuse <point>]... [--note <text>]
import { createHash } from "node:crypto";
import { realpathSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { fill, runner } from "./acceptance-sheet.mjs";
import { config } from "./briefs.mjs";
import { check, parseArgs, write } from "./release-verdict.mjs";

const TEXTS = {
  fr: {
    usage:
      "usage : node .githooks/release-verdict-poll.mjs <vX.Y.Z-rc.N> --approve | [--reserve <point>]... [--refuse <point>]... [--note <texte>]",
    title: "Verdict de recette « {0} » sur {1} — {2}",
    ask: "Donner ce verdict ? Il est enregistré sur la pré-release avec votre identité GitHub (gh) et l'heure ; chaque réserve et chaque refus devient une issue.",
    options: [
      { label: "Donner le verdict", description: "Enregistrer ce verdict sur la candidate, comme au terminal" },
      { label: "Ne pas le donner", description: "Rien n'est enregistré sur la candidate" },
    ],
  },
  en: {
    usage:
      "usage: node .githooks/release-verdict-poll.mjs <vX.Y.Z-rc.N> --approve | [--reserve <point>]... [--refuse <point>]... [--note <text>]",
    title: 'Acceptance verdict "{0}" on {1} — {2}',
    ask: "Give this verdict? It is recorded on the pre-release with your GitHub identity (gh) and the time; each reserve and each refusal becomes an issue.",
    options: [
      { label: "Give the verdict", description: "Record this verdict on the candidate, as in the terminal" },
      { label: "Do not give it", description: "Nothing is recorded on the candidate" },
    ],
  },
};

// The same arguments in one order: the poll prepared again by the hook is the one asked.
const canonical = (o) => [
  ...(o.approve ? ["--approve"] : []),
  ...o.reserves.flatMap((p) => ["--reserve", p]),
  ...o.refusals.flatMap((p) => ["--refuse", p]),
  ...(o.note === null ? [] : ["--note", o.note]),
];
const print = (sheet) => `sha256:${createHash("sha256").update(sheet).digest("hex")}`;

/** The arguments carried by the first line of an asked poll (`<tag> <JSON array>`); null when unreadable. */
export function pollArgs(tag, json) {
  try {
    const args = JSON.parse(json);
    return Array.isArray(args) && args.every((a) => typeof a === "string") ? [tag, ...args] : null;
  } catch {
    return null;
  }
}

/**
 * The `drwil-verdict` poll for `args` (command line), checked as in the terminal; writes nothing. `data` is what the
 * hook keeps tied to the call and gives back to `verdictFromPoll` with the human's answer. { code, message, poll, data }.
 */
export function verdictPoll(root, args, { run = runner(root) } = {}) {
  const T = TEXTS[config(root).lang === "en" ? "en" : "fr"];
  const opts = args ? parseArgs(args) : { error: "usage" };
  if (opts.error) return { code: 2, message: T.usage };
  const c = check(root, opts, run);
  if (c.code) return c;
  const V = c.T;
  const question = [
    `drwil-verdict ${opts.tag} ${JSON.stringify(canonical(opts))}`,
    fill(T.title, V.kinds[c.kind], opts.tag, c.view.url),
    ...c.cited.map(([type, id]) => `- ${id} (${V[type]}) : ${c.known.get(id).what}`),
    ...(opts.note === null ? [] : [fill(V.noteLine, opts.note)]),
    "",
    T.ask,
  ].join("\n");
  const options = T.options.map((o) => ({ ...o }));
  const poll = { questions: [{ header: "drwil-verdict", question, options }] };
  return { code: 0, message: "", poll, data: { args: [opts.tag, ...canonical(opts)], sheet: print(c.sheet) } };
}

/**
 * Records the verdict the human gave by answering the poll, called by the hook only (QUA-053): the terminal's checks
 * again, the candidate's sheet unchanged since the question. { code, message }, or null (sheet changed: nothing written).
 */
export function verdictFromPoll(root, data, { run = runner(root), now = new Date() } = {}) {
  const opts = parseArgs(Array.isArray(data?.args) ? data.args : []);
  if (opts.error) return null;
  const c = check(root, opts, run);
  if (c.code) return c;
  if (print(c.sheet) !== data.sheet) return null;
  return write(c, opts, { run, now });
}

/** Entry point; `deps` ({ run }) injected by the tests. Prints the poll in JSON; returns the exit code. */
export function main(args, root, deps = {}) {
  const r = verdictPoll(root, args, deps);
  if (r.code !== 0) {
    console.error(r.code === 2 ? r.message : `✗ ${r.message}`);
    return r.code;
  }
  console.log(JSON.stringify(r.poll, null, 2));
  return 0;
}

// Root: the parent of the `.githooks/` holding this script, never the current folder.
if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  process.exitCode = main(process.argv.slice(2), join(dirname(fileURLToPath(import.meta.url)), ".."));
}
