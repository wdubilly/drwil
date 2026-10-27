// What changes the rules, and the contracts registry's blocks (split from detour.mjs, which re-exports them).
import { fnmatch, normalize } from "./scope.mjs";

// What changes the rules besides the contracts registry: hooks (the gate among them), thresholds and
// checks (.drwil/ia-first.json), CI.
export const RULES = [".githooks/*", ".drwil/ia-first.json", ".github/workflows/*", ".gitlab-ci.yml"];

/**
 * Files of `files` that change the rules (contracts registry, hooks, thresholds, CI), the template
 * sources of the project's declared copies (`scopeMirrors`) included.
 */
export function rulesFiles(files, cfg = {}) {
  const patterns = [registryPath(cfg), ...RULES, ...(Array.isArray(cfg.ciFiles) ? cfg.ciFiles : [])];
  return files.map(normalize).filter((f) => targets(f, cfg).some((p) => patterns.some((g) => fnmatch(p, g))));
}

const registryPath = (cfg) => cfg.dirs?.contracts ?? "docs/contracts.md";

/** `f` and the copies it is the template source of (`scopeMirrors`). */
function targets(f, cfg) {
  const mirrors = (Array.isArray(cfg.scopeMirrors) ? cfg.scopeMirrors : []).filter(
    (m) => typeof m?.from === "string" && m.from && typeof m.to === "string",
  );
  return [f, ...mirrors.filter((m) => f.startsWith(m.from)).map((m) => m.to + f.slice(m.from.length))];
}

/** True if `f` is the contracts registry, or the template source of its copy. */
export function isRegistry(f, cfg = {}) {
  return targets(normalize(f), cfg).some((p) => fnmatch(p, registryPath(cfg)));
}

const HEADING = /^##\s+([A-Z][A-Z0-9]*-\d+)\s*(?:[—–-]\s*.*)?$/;

/** Blocks of a registry keyed by their `## ` heading (the preamble under ""); null if a heading repeats. */
function blocks(text) {
  const map = new Map();
  let key = "";
  let lines = [];
  const flush = () => !map.has(key) && map.set(key, lines.join("\n").trimEnd());
  for (const line of text.split(/\r?\n/)) {
    if (!line.startsWith("## ")) lines.push(line);
    else if (!flush()) return null;
    else [key, lines] = [line, []];
  }
  return flush() ? map : null;
}

/**
 * QUA-050: true if `after` only adds new contracts to `before` — every existing block (preamble
 * included) kept word for word, each new block a contract heading whose ID `before` never defines.
 * In doubt (a registry missing, a repeated heading), false: the human's yes stays asked.
 */
export function contractsAddedOnly(before, after) {
  if (typeof before !== "string" || typeof after !== "string") return false;
  const old = blocks(before);
  const next = blocks(after);
  if (!old || !next) return false;
  if ([...old].some(([k, v]) => next.get(k) !== v)) return false;
  const known = (id) => new RegExp(`^(?:##\\s+|\\|\\s*)${id}\\b`, "m").test(before);
  return [...next.keys()].filter((k) => !old.has(k)).every((k) => HEADING.test(k) && !known(HEADING.exec(k)[1]));
}
