#!/usr/bin/env node
// Extension point for machine-checked code hygiene rules (pre-commit hook and
// CI). Empty by default: this check stays green as long as the project adds
// nothing. A project that adopts it adds it to .drwil/ia-first.json -> checks:
//   { "name": "code hygiene rules", "run": "node .githooks/check-code-rules.mjs" }
//
// Each rule is a function (root) => string[] of errors. Examples (disabled, to
// adapt or remove):
//   - no import of a private name (`_name`) from another module of the same package;
//   - a pure-logic module has its test file next to it;
//   - a CSV export goes through a single point (anti-injection escaping);
//   - an isolated subsystem never imports a package from another one.
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const rules = [
  // (root) => { const errors = []; /* ... */ return errors; },
];

const TEXTS = { fr: "Règles d'hygiène du code :", en: "Code hygiene rules:" };

/** The project's language, read from the current folder (the project root, where hooks run). */
export function language() {
  try {
    return JSON.parse(readFileSync(join(".drwil", "ia-first.json"), "utf8")).lang === "en" ? "en" : "fr";
  } catch {
    return "fr";
  }
}

/** Applies `list` (the rules above by default) to `root`; prints the errors, returns the exit code. */
export function check(root, list = rules, lang = "fr") {
  const errors = existsSync(root) ? list.flatMap((rule) => rule(root)) : [];
  if (!errors.length) return 0;
  console.error(`${TEXTS[lang]}\n  ${errors.join("\n  ")}`);
  return 1;
}

// Run from the command line (not imported by a test): real paths compared, otherwise a
// symlinked .githooks/ would make the check pass without verifying anything.
if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = check(process.argv[2] ?? ".", rules, language());
}
