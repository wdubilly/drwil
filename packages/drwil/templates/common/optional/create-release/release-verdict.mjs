#!/usr/bin/env node
// Acceptance verdict on a candidate pre-release (QUA-053): a human gesture, like `drwil attest` —
// an interactive terminal and the candidate's name typed back; an agent never runs it. Approved,
// approved with reserves (each reserve cites its point of the sheet) or refused (each refused point
// cited). Recorded on the GitHub pre-release (asset recette-verdict.json, summary added to its
// note), never in a commit (QUA-017); keeps who gave it (GitHub identity only) and when. Each
// reserve and each refusal becomes an issue, sorted afterwards as a defect or an intent.
// Usage: node .githooks/release-verdict.mjs <vX.Y.Z-rc.N> --approve | [--reserve <point>]... [--refuse <point>]... [--note <text>]
import { existsSync, mkdtempSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { fill, readPoints, runner } from "./acceptance-sheet.mjs";
import { config } from "./briefs.mjs";

export const VERDICT_ASSET = "recette-verdict.json";
export const sheetAsset = (tag) => `recette-${tag}.md`;
export const CANDIDATE_RE = /^v\d+\.\d+\.\d+-rc\.\d+$/;

const TEXTS = {
  fr: {
    usage:
      "usage : node .githooks/release-verdict.mjs <vX.Y.Z-rc.N> --approve | [--reserve <point>]... [--refuse <point>]... [--note <texte>]",
    notCandidate: "{0} n'est pas une candidate (vX.Y.Z-rc.N)",
    human: "le verdict de recette est un geste humain : le donner dans un terminal interactif ; un agent ne l'exécute jamais",
    noRelease: "{0} : pré-release introuvable sur GitHub (gh indisponible ou release absente)",
    notPrerelease: "{0} n'est pas une pré-release : le verdict se donne sur une candidate",
    already: "{0} a déjà un verdict : une nouvelle candidate pour un nouveau verdict",
    noSheet: "{0} : fiche de recette introuvable ({1})",
    unknown: "point inconnu de la fiche de {0} : {1}",
    confirm: "Verdict « {0} » sur {1} — taper « {1} » pour confirmer : ",
    notGiven: "verdict non donné (confirmation absente)",
    noIdentity: "identité GitHub introuvable (gh api user) : le verdict garde qui l'a donné",
    uploadFailed: "verdict non enregistré sur {0} (gh release upload a échoué) : rien n'est publié",
    issueFailed: "⚠ issue non ouverte pour {0} : l'ouvrir à la main",
    issue: "issue ouverte pour {0} : {1}",
    noteFailed: "⚠ note de {0} non mise à jour : le verdict reste enregistré ({1})",
    recorded: "verdict « {0} » enregistré sur {1} par {2} le {3}",
    kinds: { approved: "approuvée", reserved: "approuvée avec réserves", refused: "refusée" },
    reserve: "réserve",
    refusal: "refus",
    section: "## Verdict de recette",
    by: "« {0} », donné par @{1} le {2}.",
    noteLine: "Note : {0}",
    issueBody:
      "Point {0} de la fiche de recette de {1} ({2}) : {3}.\n\n{4}\n\nÀ ranger (recette « corriger un défaut ») : défaut à corriger (une régression) ou intention (un manque).",
  },
  en: {
    usage:
      "usage: node .githooks/release-verdict.mjs <vX.Y.Z-rc.N> --approve | [--reserve <point>]... [--refuse <point>]... [--note <text>]",
    notCandidate: "{0} is not a candidate (vX.Y.Z-rc.N)",
    human: "the acceptance verdict is a human gesture: give it in an interactive terminal; an agent never runs it",
    noRelease: "{0}: pre-release not found on GitHub (gh unavailable or release missing)",
    notPrerelease: "{0} is not a pre-release: the verdict is given on a candidate",
    already: "{0} already has a verdict: a new candidate for a new verdict",
    noSheet: "{0}: acceptance sheet not found ({1})",
    unknown: "point unknown to the sheet of {0}: {1}",
    confirm: 'Verdict "{0}" on {1} — type "{1}" to confirm: ',
    notGiven: "verdict not given (no confirmation)",
    noIdentity: "GitHub identity not found (gh api user): the verdict keeps who gave it",
    uploadFailed: "verdict not recorded on {0} (gh release upload failed): nothing is published",
    issueFailed: "⚠ issue not opened for {0}: open it by hand",
    issue: "issue opened for {0}: {1}",
    noteFailed: "⚠ note of {0} not updated: the verdict stays recorded ({1})",
    recorded: 'verdict "{0}" recorded on {1} by {2} on {3}',
    kinds: { approved: "approved", reserved: "approved with reserves", refused: "refused" },
    reserve: "reserve",
    refusal: "refusal",
    section: "## Acceptance verdict",
    by: '"{0}", given by @{1} on {2}.',
    noteLine: "Note: {0}",
    issueBody:
      'Point {0} of the acceptance sheet of {1} ({2}): {3}.\n\n{4}\n\nTo sort (recipe "fix a defect"): defect to fix (a regression) or intent (a gap).',
  },
};

export const verdictTexts = (root) => TEXTS[config(root).lang === "en" ? "en" : "fr"];

/** Command-line options: { tag, approve, reserves, refusals, note } or { error: "usage" }. */
export function parseArgs(args) {
  const out = { tag: args[0], approve: false, reserves: [], refusals: [], note: null };
  if (!out.tag || out.tag.startsWith("--")) return { error: "usage" };
  for (let i = 1; i < args.length; i++) {
    const a = args[i];
    if (a === "--approve") out.approve = true;
    else if (["--reserve", "--refuse", "--note"].includes(a) && i + 1 < args.length) {
      const v = args[++i];
      if (a === "--note") out.note = v;
      else (a === "--reserve" ? out.reserves : out.refusals).push(v);
    } else return { error: "usage" };
  }
  const cited = out.reserves.length + out.refusals.length;
  return out.approve === cited > 0 ? { error: "usage" } : out;
}

/** Downloads one asset of a release into `dir`; its text, or null when absent. */
export function asset(run, tag, name, dir) {
  if (run("gh", ["release", "download", tag, "--pattern", name, "--dir", dir, "--clobber"]) === null) return null;
  const file = join(dir, name);
  return existsSync(file) ? readFileSync(file, "utf8") : null;
}

const refused = (message) => ({ code: 1, message });

/**
 * Records the verdict `opts` (parseArgs) on the candidate. `confirm(question, expected)` only in an
 * interactive terminal; `run` and `now` injected by the tests. Returns { code, message }.
 */
export async function record(root, opts, { tty = false, confirm, run = runner(root), now = new Date() } = {}) {
  const T = verdictTexts(root);
  const { tag } = opts;
  if (!CANDIDATE_RE.test(tag)) return refused(fill(T.notCandidate, tag));
  if (!tty || typeof confirm !== "function") return refused(T.human);
  let view = null;
  try {
    view = JSON.parse(run("gh", ["release", "view", tag, "--json", "isPrerelease,url,body"]) ?? "");
  } catch {}
  if (!view) return refused(fill(T.noRelease, tag));
  if (!view.isPrerelease) return refused(fill(T.notPrerelease, tag));
  const dir = mkdtempSync(join(tmpdir(), "release-verdict-"));
  if (asset(run, tag, VERDICT_ASSET, dir) !== null) return refused(fill(T.already, tag));
  const sheet = asset(run, tag, sheetAsset(tag), dir);
  if (sheet === null) return refused(fill(T.noSheet, tag, sheetAsset(tag)));
  const version = tag.replace(/-rc\.\d+$/, "");
  const known = new Map(readPoints(sheet).map((p) => [p.id, p]));
  const resolve = (id) => (/^P\d+$/i.test(id) ? `${version}-${id.toUpperCase()}` : id);
  const cited = [...opts.reserves.map((id) => ["reserve", resolve(id)]), ...opts.refusals.map((id) => ["refusal", resolve(id)])];
  const unknown = cited.filter(([, id]) => !known.has(id)).map(([, id]) => id);
  if (unknown.length) return refused(fill(T.unknown, tag, unknown.join(", ")));
  const kind = opts.refusals.length ? "refused" : opts.reserves.length ? "reserved" : "approved";
  if (!(await confirm(fill(T.confirm, T.kinds[kind], tag), tag))) return refused(T.notGiven);
  const by = (run("gh", ["api", "user", "--jq", ".login"]) ?? "").trim();
  if (!by) return refused(T.noIdentity);
  const at = now.toISOString();
  const lines = [];
  const points = cited.map(([type, id]) => {
    const p = known.get(id);
    const body = fill(T.issueBody, id, tag, view.url, p.what, opts.note ? fill(T.noteLine, opts.note) : "");
    const url = (run("gh", ["issue", "create", "--title", `${id} (${T[type]}) — ${p.what}`.slice(0, 250), "--body", body]) ?? "").trim();
    lines.push(url ? fill(T.issue, id, url) : fill(T.issueFailed, id));
    return { type, id, what: p.what, issue: url || null };
  });
  const verdict = { version: 1, tag, verdict: kind, points, note: opts.note, by, at };
  const file = join(dir, VERDICT_ASSET);
  writeFileSync(file, `${JSON.stringify(verdict, null, 2)}\n`);
  if (run("gh", ["release", "upload", tag, file]) === null) return refused([...lines, fill(T.uploadFailed, tag)].join("\n"));
  const summary = [
    T.section,
    "",
    fill(T.by, T.kinds[kind], by, at),
    ...points.map((p) => `- ${p.id} (${T[p.type]}) : ${p.issue ?? p.what}`),
  ];
  if (opts.note) summary.push("", fill(T.noteLine, opts.note));
  const notes = join(dir, "notes.md");
  writeFileSync(notes, `${view.body ?? ""}\n\n${summary.join("\n")}\n`);
  if (run("gh", ["release", "edit", tag, "--notes-file", notes]) === null) lines.push(fill(T.noteFailed, tag, VERDICT_ASSET));
  return { code: 0, message: [...lines, fill(T.recorded, T.kinds[kind], tag, by, at)].join("\n") };
}

/** Entry point; `deps` ({ run, now }) injected by the tests. Returns the exit code. */
export async function main(args, root, deps = {}) {
  const opts = parseArgs(args);
  if (opts.error) {
    console.error(verdictTexts(root).usage);
    return 2;
  }
  const tty = Boolean(process.stdin.isTTY && process.stdout.isTTY);
  const confirm = async (question, expected) => {
    const { createInterface } = await import("node:readline/promises");
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    try {
      return (await rl.question(question)).trim() === expected;
    } finally {
      rl.close();
    }
  };
  const r = await record(root, opts, { tty, confirm, ...deps });
  (r.code === 0 ? console.log : console.error)(`${r.code === 0 ? "✓" : "✗"} ${r.message}`);
  return r.code;
}

// Root: the parent of the `.githooks/` holding this script, never the current folder.
if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  process.exitCode = await main(process.argv.slice(2), join(dirname(fileURLToPath(import.meta.url)), ".."));
}
