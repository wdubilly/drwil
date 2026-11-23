#!/usr/bin/env node
// Formatting checked before commit (QUA-328, QUA-329), run by .githooks/pre-commit before the checks.
// Inactive without a "format" key in .drwil/ia-first.json: the commit is unchanged (QUA-329).
// With it ({ "stdin": "<command printing {file} formatted from stdin>", "write": "<command that formats>",
// "paths": [globs] }), each staged file matching "paths" is read from the index (never the working tree, so a
// partially staged file is judged as it will be committed), piped to "stdin" and compared: one difference refuses
// the commit, naming "write" with the files. Nothing is ever rewritten or re-staged (decision D4): an agent or a
// human formats, then stages again. A formatter that cannot run refuses too: a check not run is not passed (QUA-013).
import { spawn, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { availableParallelism } from "node:os";
import { globToRegex } from "./glob.mjs";

const TEXTS = {
  fr: {
    invalid:
      '[ia-first] Clé "format" de .drwil/ia-first.json incomplète : il faut "stdin" et "write" (chaînes) et "paths" (liste) ; commit refusé.',
    unreadable: "[ia-first] Index illisible (git diff --cached) : formatage non vérifié, commit refusé.",
    failed: "[ia-first] Formateur absent ou en échec sur {0} : `{1}` (code {2}) ; commit refusé.\n{3}",
    title: "[ia-first] Formatage : {0} fichier(s) indexé(s) non formaté(s), commit refusé (rien n'a été modifié) :",
    fix: "Les formater puis les indexer à nouveau :",
  },
  en: {
    invalid:
      '[ia-first] Incomplete "format" key in .drwil/ia-first.json: "stdin" and "write" (strings) and "paths" (list) are required; commit refused.',
    unreadable: "[ia-first] Unreadable index (git diff --cached): formatting not checked, commit refused.",
    failed: "[ia-first] Formatter missing or failing on {0}: `{1}` (exit {2}); commit refused.\n{3}",
    title: "[ia-first] Formatting: {0} staged file(s) not formatted, commit refused (nothing was changed):",
    fix: "Format them, then stage them again:",
  },
};
const fill = (s, ...v) => s.replace(/\{(\d)\}/g, (_, i) => String(v[i]));
// Double quotes hold an ordinary path in sh as in cmd.exe (Windows runs a shell command through cmd).
const quote = (f) => `"${f.replace(/"/g, '\\"')}"`;

/** The "format" setting when it is complete, false when it is incomplete, null when absent. */
export function formatSetting(cfg) {
  const f = cfg?.format;
  if (f === undefined) return null;
  const ok = f && typeof f.stdin === "string" && typeof f.write === "string" && Array.isArray(f.paths) && f.paths.length > 0;
  return ok ? f : false;
}

/** Staged files (added, copied, modified, renamed) matching the declared paths; null when the index is unreadable. */
export function stagedToFormat(paths) {
  const r = spawnSync("git", ["diff", "--cached", "--name-only", "--diff-filter=ACMR", "-z"], { encoding: "utf8" });
  if (r.status !== 0) return null;
  const globs = paths.map(globToRegex);
  return r.stdout.split("\0").filter((f) => f && globs.some((g) => g.test(f)));
}

/** Formats the staged content of `file` through `command`: { same } or { code, err } when the formatter fails. */
function judge(command, file) {
  const blob = spawnSync("git", ["show", `:${file}`], { maxBuffer: 1 << 28 });
  if (blob.status !== 0) return Promise.resolve({ code: blob.status, err: String(blob.stderr) });
  return new Promise((done) => {
    const child = spawn(command.replaceAll("{file}", quote(file)), { shell: true, stdio: ["pipe", "pipe", "pipe"] });
    const out = [];
    const err = [];
    child.stdout.on("data", (d) => out.push(d));
    child.stderr.on("data", (d) => err.push(d));
    child.on("error", (e) => done({ code: e.code ?? "?", err: e.message }));
    child.on("close", (code) => {
      const formatted = Buffer.concat(out);
      const why = Buffer.concat(err).toString().trim().split("\n").slice(0, 5).join("\n");
      if (code !== 0) done({ code, err: why });
      // `npx --no-install` without the package may exit 0 printing nothing: empty output for content is a failure.
      else if (formatted.length === 0 && blob.stdout.length > 0) done({ code: 0, err: why || "(stdout vide / empty stdout)" });
      else done({ same: formatted.equals(blob.stdout) });
    });
    // A formatter that exits without reading its input closes the pipe: EPIPE is not a verdict, its exit code is.
    child.stdin.on("error", () => {});
    child.stdin.end(blob.stdout);
  });
}

/** Checks the staged files; returns the exit code and the lines to print. */
export async function checkStaged(cfg) {
  const T = TEXTS[cfg?.lang === "en" ? "en" : "fr"];
  const setting = formatSetting(cfg);
  if (setting === null) return { code: 0, lines: [] };
  if (setting === false) return { code: 1, lines: [T.invalid] };
  const files = stagedToFormat(setting.paths);
  if (files === null) return { code: 1, lines: [T.unreadable] };
  const results = new Array(files.length);
  let next = 0;
  const width = Math.max(1, Math.min(files.length, availableParallelism()));
  await Promise.all(
    Array.from({ length: width }, async () => {
      while (next < files.length) {
        const i = next++;
        results[i] = await judge(setting.stdin, files[i]);
      }
    }),
  );
  const broken = results.findIndex((r) => r.same === undefined);
  if (broken >= 0) {
    const r = results[broken];
    return { code: 1, lines: [fill(T.failed, files[broken], setting.stdin, r.code, r.err)] };
  }
  const unformatted = files.filter((_, i) => !results[i].same);
  if (unformatted.length === 0) return { code: 0, lines: [] };
  const list = unformatted.map(quote).join(" ");
  return {
    code: 1,
    lines: [
      fill(T.title, unformatted.length),
      ...unformatted.map((f) => `  - ${f}`),
      T.fix,
      `  ${setting.write} ${list} && git add ${list}`,
    ],
  };
}

if (process.argv[1]?.endsWith("format-staged.mjs")) {
  let cfg = {};
  try {
    cfg = JSON.parse(readFileSync(".drwil/ia-first.json", "utf8"));
  } catch {}
  const { code, lines } = await checkStaged(cfg);
  if (lines.length) console.error(lines.join("\n"));
  process.exit(code);
}
