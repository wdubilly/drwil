// Review of the documents a release must carry (QUA-098): `README.md`, `docs/features.md` and
// `docs/architecture.md`. Before the tag (preview and creation), for each one, says what changed since
// the latest tag — closed workstreams, code files touched, document modified or not. A document not
// modified since the tag must be recorded « unchanged » with its reason, one versioned line in
// `docs/release-review.md`; a document still carrying skeleton text blocks too. The script imposes
// the review, the agent writes: the updates go into the version PR, before the tag.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export const REVIEWED = ["README.md", "docs/features.md", "docs/architecture.md"];
export const REVIEW_FILE = "docs/release-review.md";
const SKELETON = ["(to describe", "template to fill in", "(à décrire", "gabarit à remplir"];

const TEXTS = {
  fr: {
    title: "[create-release] examen des documents avant le tag (depuis {0}) :",
    since: "  chantiers clos : {0} ; fichiers de code touchés : {1}",
    none: "aucun",
    modified: "  ✓ {0} : modifié depuis le dernier tag",
    unchanged: "  ✓ {0} : inchangé — {1}",
    missing: "  ✗ {0} : inchangé depuis le dernier tag, sans raison enregistrée",
    skeleton: "  ✗ {0} : texte du squelette encore présent (« à décrire », « gabarit à remplir »)",
    hint: "  → le mettre à jour dans la PR de version, ou ajouter à {0} la ligne : - {1} — `<fichier>` — inchangé : <raison>",
    refused: "examen des documents non fait : {0}",
  },
  en: {
    title: "[create-release] review of the documents before the tag (since {0}):",
    since: "  closed workstreams: {0}; code files touched: {1}",
    none: "none",
    modified: "  ✓ {0}: modified since the latest tag",
    unchanged: "  ✓ {0}: unchanged — {1}",
    missing: "  ✗ {0}: unchanged since the latest tag, no reason recorded",
    skeleton: "  ✗ {0}: skeleton text still present (« to describe », « template to fill in »)",
    hint: "  → update it in the version PR, or add to {0} the line: - {1} — `<file>` — unchanged: <reason>",
    refused: "document review not done: {0}",
  },
};

const fill = (message, ...values) => message.replace(/\{(\d)\}/g, (_, i) => values[i]);

function git(root, args) {
  try {
    return execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return "";
  }
}

/** Reasons recorded for `version`: Map(file → reason), from `- vX.Y.Z — `file` — unchanged: reason`. */
export function recordedReasons(text, version) {
  const reasons = new Map();
  const re = /^-\s+(v\d+\.\d+\.\d+)\s+—\s+`([^`]+)`\s+—\s+(?:inchangé|unchanged)\s*:\s*(.+)$/gm;
  for (const m of text.matchAll(re)) if (m[1] === version && m[3].trim()) reasons.set(m[2], m[3].trim());
  return reasons;
}

/** What happened since `tag` (all the history without a tag): closed workstreams, code files touched. */
export function sinceTag(root, tag) {
  const range = tag ? [`${tag}..HEAD`] : ["HEAD"];
  const files = git(root, ["log", ...range, "--name-only", "--pretty=format:"])
    .split("\n")
    .filter(Boolean);
  const journal = git(root, ["log", ...range, "-p", "--pretty=format:", "--", "docs/projects/journal.md"]);
  const closed = journal
    .split("\n")
    .filter((l) => /^\+##\s/.test(l))
    .map((l) => l.replace(/^\+##\s*/, "").trim());
  const code = [...new Set(files.filter((f) => !f.endsWith(".md") && !f.startsWith("docs/")))];
  return { closed, code };
}

/**
 * Review of the documents for `version` (`vX.Y.Z`): { ok, lines }. A document absent from the
 * repository is not reviewed; one modified since the tag passes; otherwise a recorded reason is needed.
 */
export function reviewDocuments(root, { tag, version, lang = "fr" }) {
  const T = TEXTS[lang === "en" ? "en" : "fr"];
  const recorded = existsSync(join(root, REVIEW_FILE))
    ? recordedReasons(readFileSync(join(root, REVIEW_FILE), "utf8"), version)
    : new Map();
  const { closed, code } = sinceTag(root, tag);
  const lines = [fill(T.title, tag ?? "—"), fill(T.since, closed.length ? closed.join(" ; ") : T.none, code.length)];
  let ok = true;
  for (const file of REVIEWED.filter((f) => existsSync(join(root, f)))) {
    const text = readFileSync(join(root, file), "utf8");
    if (SKELETON.some((m) => text.includes(m))) {
      lines.push(fill(T.skeleton, file));
      ok = false;
      continue;
    }
    const modified = !tag || git(root, ["diff", "--name-only", `${tag}..HEAD`, "--", file]) !== "";
    if (modified) lines.push(fill(T.modified, file));
    else if (recorded.has(file)) lines.push(fill(T.unchanged, file, recorded.get(file)));
    else {
      lines.push(fill(T.missing, file));
      ok = false;
    }
  }
  if (!ok) lines.push(fill(T.hint, REVIEW_FILE, version));
  return { ok, lines, refused: fill(T.refused, version) };
}
