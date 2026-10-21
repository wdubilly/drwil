// Coherence rules between the index, the briefs and the code, written once: check-docs.mjs (at each
// commit, as warnings) and close.mjs (at closing, blocking and corrective) read them from here, so
// the same inconsistency is seen by both.
import { existsSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { briefStatus } from "./briefs.mjs";

const TEXTS = {
  fr: {
    openButDone: (brief) => `case ouverte mais la fiche ${brief} se dit déjà terminée (QUA-015)`,
    checkedButOpen: (brief) => `case cochée mais la fiche ${brief} ne se dit pas terminée (QUA-015)`,
  },
  en: {
    openButDone: (brief) => `item unchecked but ${brief} already says it is done (QUA-015)`,
    checkedButOpen: (brief) => `item checked but ${brief} does not say it is done (QUA-015)`,
  },
};

export const BRIEF_CITATION_RE = /`((?:docs\/projects|docs\/intentions)\/[^`]+\.md)`/g;
// tolerates a date in parentheses right after the word (e.g. "**Status** (2026-10-04):").
export const STATUS_RE = /^\*{0,2}(Statut|Status)\*{0,2}\s?(\([^)]*\))?\s?:/;

/**
 * The box ([ ]/[x]) of an index line must reflect the actual status of the brief it cites. The "Status"
 * text stays free (prose), so only a brief with a dated Status line in its first lines is judged.
 * `[{ place: "index:line", message, brief, line, checked }]`; `except`: a brief left out (the one closing).
 */
export function checkboxProblems(root, cfg, lang, { except } = {}) {
  const T = TEXTS[lang === "en" ? "en" : "fr"];
  const problems = [];
  const indexPath = join(root, cfg.dirs?.index ?? "docs/projects/pending.md");
  if (!existsSync(indexPath)) return problems;
  const relIndex = relative(root, indexPath).split("\\").join("/");
  const lines = readFileSync(indexPath, "utf8").split(/\r?\n/);
  // groups each bullet (an entry may spread over several indented lines): a new bullet starts at "- [ ]" or "- [x]".
  let bullet = null;
  const bullets = [];
  for (let i = 0; i < lines.length; i++) {
    const m = /^\s*-\s*\[( |x|X)\]/.exec(lines[i]);
    if (m) {
      bullet = { checked: m[1].toLowerCase() === "x", line: i + 1, text: lines[i] };
      bullets.push(bullet);
    } else if (bullet && lines[i].trim() !== "" && /^\s+\S/.test(lines[i])) {
      bullet.text += "\n" + lines[i];
    } else {
      bullet = null;
    }
  }
  for (const b of bullets) {
    for (const m of b.text.matchAll(BRIEF_CITATION_RE)) {
      const briefPath = join(root, m[1]);
      if (m[1] === except || !existsSync(briefPath)) continue; // a missing path is reported elsewhere.
      const briefText = readFileSync(briefPath, "utf8");
      if (
        !briefText
          .split(/\r?\n/)
          .slice(0, 15)
          .some((l) => STATUS_RE.test(l))
      )
        continue; // no Status line: reported elsewhere.
      const done = briefStatus(briefText) === "done";
      const wrong = !b.checked && done ? "openButDone" : b.checked && !done ? "checkedButOpen" : null;
      if (wrong) problems.push({ place: `${relIndex}:${b.line}`, message: T[wrong](m[1]), brief: m[1], line: b.line, checked: b.checked });
    }
  }
  return problems;
}
