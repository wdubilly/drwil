#!/usr/bin/env node
// Acceptance note of a version, kept in the repository (QUA-078, QUA-079, QUA-080): the generated
// acceptance sheet, the verdict, the reserves, who gave it and when, the fingerprint of each
// tarball — or the mention « no verdict » for a version published without a candidate. It reaches
// the repository through a dedicated branch and a pull request (the main branch is protected,
// QUA-017): the commit is built with git plumbing on a private index, so neither the working tree,
// the index nor the current branch is touched. The tag and the release never depend on it: a
// failure is reported with the catch-up command, nothing published is undone.
// Usage: node .githooks/recette-note.mjs <vX.Y.Z> <note.md> [--dry-run]   (catch-up of a note)
import { mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { fill, runner } from "./acceptance-sheet.mjs";
import { config } from "./briefs.mjs";

const TEXTS = {
  fr: {
    usage: "usage : node .githooks/recette-note.mjs <vX.Y.Z> <note.md> [--dry-run]",
    title: "# Note de recette de {0}",
    published: "Publiée le {0}.",
    candidate: "Candidate : [{0}]({1})",
    verdict: "Verdict : {0}, donné par @{1} le {2}",
    kinds: { approved: "approuvée", reserved: "approuvée avec réserves" },
    noVerdict: "Verdict : sans verdict — version publiée sans candidate ni verdict de recette ; à compléter par l'humain.",
    verdictNote: "Note du verdict : {0}",
    reserves: "### Réserves",
    prints: "## Empreintes des tarballs",
    noTarball: "aucun tarball",
    sheet: "## Fiche de recette — {0}",
    complete: "## À compléter",
    todo: ["Ce qui a été validé : …", "Par qui : …", "Quand : …"],
    changes: "## Changements",
    where: "[recette-note] note de recette : {0}",
    dryRun: "[recette-note] --dry-run : aucune branche ni PR créée.",
    already: "[recette-note] {0} est déjà dans le dépôt : rien à faire.",
    opened: "[recette-note] note de {0} proposée par la PR {1} (branche {2}).",
    title_pr: "Note de recette de {0}",
    body: "Note de recette de {0}, générée à la publication de la version (jamais écrite à la main, sauf la partie à compléter d'une version sans verdict).",
    noBase: "branche principale de origin introuvable (git fetch, remote origin) : note non écrite",
    pushFailed: "branche {0} non créée ou non poussée : note non écrite",
    prFailed: "branche {0} poussée, mais la PR a échoué ; rattraper : {1}",
    catchUp: "la release publiée n'est pas défaite ; rattraper la note : {0}",
  },
  en: {
    usage: "usage: node .githooks/recette-note.mjs <vX.Y.Z> <note.md> [--dry-run]",
    title: "# Acceptance note of {0}",
    published: "Published on {0}.",
    candidate: "Candidate: [{0}]({1})",
    verdict: "Verdict: {0}, given by @{1} on {2}",
    kinds: { approved: "approved", reserved: "approved with reserves" },
    noVerdict: "Verdict: no verdict — version published without a candidate or an acceptance verdict; to be completed by a human.",
    verdictNote: "Verdict note: {0}",
    reserves: "### Reserves",
    prints: "## Tarball fingerprints",
    noTarball: "no tarball",
    sheet: "## Acceptance sheet — {0}",
    complete: "## To complete",
    todo: ["What was validated: …", "By whom: …", "When: …"],
    changes: "## Changes",
    where: "[recette-note] acceptance note: {0}",
    dryRun: "[recette-note] --dry-run: no branch nor PR created.",
    already: "[recette-note] {0} is already in the repository: nothing to do.",
    opened: "[recette-note] note of {0} proposed by PR {1} (branch {2}).",
    title_pr: "Acceptance note of {0}",
    body: "Acceptance note of {0}, generated when the version was published (never written by hand, except the part to complete of a version without a verdict).",
    noBase: "origin's main branch not found (git fetch, remote origin): note not written",
    pushFailed: "branch {0} not created or not pushed: note not written",
    prFailed: "branch {0} pushed, but the PR failed; catch up: {1}",
    catchUp: "the published release is not undone; catch up the note: {0}",
  },
};

export const noteTexts = (root) => TEXTS[config(root).lang === "en" ? "en" : "fr"];
export const notePath = (version) => `docs/recettes/${version}.md`;

/**
 * Text of the note. `verdict` null: version published without a candidate (`commits`: subjects of
 * the range). `sheet` / `tag` / `url`: the candidate's, when there is one.
 */
export function renderNote({ version, tag, url, verdict, sheet, tarballs, commits = [], date }, T) {
  const lines = [fill(T.title, version), ""];
  if (date) lines.push(fill(T.published, date), "");
  if (tag) lines.push(fill(T.candidate, tag, url), "");
  if (!verdict) lines.push(T.noVerdict, "");
  else {
    lines.push(fill(T.verdict, T.kinds[verdict.verdict], verdict.by, verdict.at), "");
    if (verdict.note) lines.push(fill(T.verdictNote, verdict.note), "");
    const reserves = verdict.points.filter((p) => p.type === "reserve");
    if (reserves.length) lines.push(T.reserves, "", ...reserves.map((p) => `- ${p.id} : ${p.what}${p.issue ? ` (${p.issue})` : ""}`), "");
  }
  lines.push(
    T.prints,
    "",
    ...(tarballs.length ? tarballs.map((t) => `- \`${t.name}\` — sha256 \`${t.sha256}\``) : [`- ${T.noTarball}`]),
    "",
  );
  if (!verdict) {
    lines.push(T.complete, "", ...T.todo.map((x) => `- ${x}`), "");
    if (commits.length) lines.push(T.changes, "", ...commits.map((c) => `- ${c}`), "");
  }
  if (sheet) {
    // The sheet is a document of its own: its headings go one level down under ours.
    const body = sheet.replace(/^(#{1,5}) /gm, "$1# ").trim();
    lines.push(body.replace(/^## [^\n]*/, fill(T.sheet, tag)), "");
  }
  return `${lines.join("\n").trimEnd()}\n`;
}

function gitIn(root, args, { env = {}, input } = {}) {
  const r = spawnSync("git", args, { cwd: root, encoding: "utf8", input, env: { ...process.env, ...env } });
  return r.status === 0 ? r.stdout.trim() : null;
}

/** Like gitIn, but a failing command throws: a sequence of steps stops at the first failure. */
function must(root, args, options) {
  const out = gitIn(root, args, options);
  if (out === null) throw new Error(`git ${args[0]} failed`);
  return out;
}

/** Main branch of origin (after a fetch): remote HEAD, else main, else master. */
function mainBranch(root) {
  const head = /ref: refs\/heads\/(\S+)\s+HEAD/.exec(gitIn(root, ["ls-remote", "--symref", "origin", "HEAD"]) ?? "")?.[1];
  const candidates = [head, "main", "master"].filter(Boolean);
  return candidates.find((b) => gitIn(root, ["rev-parse", "--verify", "--quiet", `refs/remotes/origin/${b}^{commit}`])) ?? null;
}

/** Commit of the note on the main branch's tip, on a private index; returns its sha or null. */
function commitNote(root, { base, version, file }) {
  let index = "";
  let sha = null;
  try {
    index = join(must(root, ["rev-parse", "--absolute-git-dir"]), "recette-note.index");
    const env = { GIT_INDEX_FILE: index };
    const blob = must(root, ["hash-object", "-w", file]);
    must(root, ["read-tree", base], { env });
    must(root, ["update-index", "--add", "--cacheinfo", `100644,${blob},${notePath(version)}`], { env });
    const tree = must(root, ["write-tree"], { env });
    sha = must(root, ["commit-tree", tree, "-p", base, "-m", `Note de recette de ${version}`]);
  } catch {
    // a failed step leaves no commit
  }
  rmSync(index, { force: true });
  return sha;
}

/**
 * Proposes the note of `version` through a branch `recette/<version>` and a PR; `run` (gh) injected
 * by the tests. `file`: the note already saved (catch-up); else it is saved first, so that any
 * failure can name a command that replays it. Returns { code, message }; code 1 on any failure.
 */
export function publishNote(root, { version, note, file, dryRun = false }, { run = runner(root) } = {}) {
  const T = noteTexts(root);
  const path = notePath(version);
  const shown = `${fill(T.where, path)}\n\n${note}`;
  if (dryRun) return { code: 0, message: `${shown}\n${T.dryRun}` };
  if (!file) {
    file = join(mkdtempSync(join(tmpdir(), "recette-note-")), `${version}.md`);
    writeFileSync(file, note);
  }
  const retry = `node .githooks/recette-note.mjs ${version} ${file}`;
  const failed = (m) => ({ code: 1, message: `${shown}\n✗ ${m}\n${fill(T.catchUp, retry)}` });
  const branch = `recette/${version}`;
  gitIn(root, ["fetch", "-q", "origin"]);
  const main = mainBranch(root);
  if (!main) return failed(T.noBase);
  const base = `refs/remotes/origin/${main}`;
  if (gitIn(root, ["cat-file", "-e", `${base}:${path}`]) !== null) return { code: 0, message: fill(T.already, path) };
  const commit = commitNote(root, { base, version, file });
  if (!commit || gitIn(root, ["push", "-q", "origin", `${commit}:refs/heads/${branch}`]) === null)
    return failed(fill(T.pushFailed, branch));
  const args = ["pr", "create", "--base", main, "--head", branch, "--title", fill(T.title_pr, version), "--body", fill(T.body, version)];
  const url = run("gh", args);
  if (url === null) return failed(fill(T.prFailed, branch, `gh pr create --base ${main} --head ${branch} --fill`));
  return { code: 0, message: fill(T.opened, version, url.trim(), branch) };
}

/** Entry point; `deps` ({ run }) injected by the tests. Returns the exit code. */
export function main(args, root, deps = {}) {
  const [version, file, ...rest] = args;
  let path;
  let note = null;
  try {
    path = resolve(root, file);
    note = readFileSync(path, "utf8");
  } catch {
    // no file argument, or unreadable: usage
  }
  if (!/^v\d+\.\d+\.\d+$/.test(version) || note === null || rest.some((a) => a !== "--dry-run")) {
    console.error(noteTexts(root).usage);
    return 2;
  }
  const r = publishNote(root, { version, note, file: path, dryRun: rest.includes("--dry-run") }, deps);
  (r.code === 0 ? console.log : console.error)(`${r.code === 0 ? "✓" : "✗"} ${r.message}`);
  return r.code;
}

// Root: the parent of the `.githooks/` holding this script, never the current folder.
if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  process.exitCode = main(process.argv.slice(2), join(dirname(fileURLToPath(import.meta.url)), ".."));
}
