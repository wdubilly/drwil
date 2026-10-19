#!/usr/bin/env node
// Promotion of a candidate to the final release (QUA-054): refused without a verdict or when the
// verdict is « refused »; approved, with or without reserves, it tags the candidate's commit with
// the final version and publishes the final release with the same tarball (fingerprint checked
// against the acceptance sheet), the reserves and their issues listed in its note. Never modifies a
// tracked file (QUA-017). The final release becomes `releases/latest`, which never shows a
// pre-release (QUA-055). `--dry-run` shows what the promotion would do without publishing anything.
// Usage: node .githooks/promote-release.mjs <vX.Y.Z-rc.N> [--dry-run]
import { mkdtempSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { fill, readFingerprints, repoUrl, runner, sha256 } from "./acceptance-sheet.mjs";
import { config } from "./briefs.mjs";
import { asset, CANDIDATE_RE, sheetAsset, VERDICT_ASSET } from "./release-verdict.mjs";

const TEXTS = {
  fr: {
    usage: "usage : node .githooks/promote-release.mjs <vX.Y.Z-rc.N> [--dry-run]",
    notCandidate: "{0} n'est pas une candidate (vX.Y.Z-rc.N)",
    noRelease: "{0} : pré-release introuvable sur GitHub (gh indisponible ou release absente)",
    notPrerelease: "{0} n'est pas une pré-release : seule une candidate se promeut",
    noVerdict: "{0} n'a pas de verdict de recette : promotion refusée (verdict humain : release-verdict.mjs)",
    refusedVerdict: "{0} a été refusée par la recette : promotion refusée ; corriger, puis une nouvelle candidate",
    exists: "{0} existe déjà : promotion refusée",
    noTag: "tag {0} introuvable dans le dépôt (git fetch --tags)",
    noSheet: "{0} : fiche de recette introuvable ({1})",
    mismatch: "{0} : empreinte différente de la fiche de recette (ou absente) : promotion refusée",
    plan: "[promote-release] {0} ({1}) → {2}, sur le commit {3}, avec : {4}",
    none: "aucun tarball",
    note: "[promote-release] note de la release :",
    dryRun: "[promote-release] --dry-run : aucun tag ni release créé.",
    tagFailed: "tag {0} non créé ou non poussé : rien n'est publié",
    published: "[promote-release] release {0} publiée (releases/latest).",
    ghFailed: "tag {0} poussé, mais la release GitHub a échoué ; rattraper à la main : {1}",
    acceptance: "## Recette",
    kinds: { approved: "approuvée", reserved: "approuvée avec réserves" },
    given: "Candidate [{0}]({1}) {2} par @{3} le {4}.",
    reserves: "### Réserves",
    same: "### Même tarball que la candidate",
    install: "### Installer",
  },
  en: {
    usage: "usage: node .githooks/promote-release.mjs <vX.Y.Z-rc.N> [--dry-run]",
    notCandidate: "{0} is not a candidate (vX.Y.Z-rc.N)",
    noRelease: "{0}: pre-release not found on GitHub (gh unavailable or release missing)",
    notPrerelease: "{0} is not a pre-release: only a candidate is promoted",
    noVerdict: "{0} has no acceptance verdict: promotion refused (human verdict: release-verdict.mjs)",
    refusedVerdict: "{0} was refused by the acceptance team: promotion refused; fix, then a new candidate",
    exists: "{0} already exists: promotion refused",
    noTag: "tag {0} not found in the repository (git fetch --tags)",
    noSheet: "{0}: acceptance sheet not found ({1})",
    mismatch: "{0}: fingerprint differs from the acceptance sheet (or is missing): promotion refused",
    plan: "[promote-release] {0} ({1}) → {2}, on commit {3}, with: {4}",
    none: "no tarball",
    note: "[promote-release] release note:",
    dryRun: "[promote-release] --dry-run: no tag nor release created.",
    tagFailed: "tag {0} not created or not pushed: nothing is published",
    published: "[promote-release] release {0} published (releases/latest).",
    ghFailed: "tag {0} pushed, but the GitHub release failed; catch up by hand: {1}",
    acceptance: "## Acceptance",
    kinds: { approved: "approved", reserved: "approved with reserves" },
    given: "Candidate [{0}]({1}) {2} by @{3} on {4}.",
    reserves: "### Reserves",
    same: "### Same tarball as the candidate",
    install: "### Install",
  },
};

export const promoteTexts = (root) => TEXTS[config(root).lang === "en" ? "en" : "fr"];

const refused = (message) => ({ code: 1, message });
const json = (text) => {
  try {
    return JSON.parse(text ?? "");
  } catch {
    return null;
  }
};

/** Note of the final release: the verdict, the reserves and their issues, the fingerprints, how to install. */
export function releaseNote({ tag, url, verdict, tarballs, repo, final }, T) {
  const lines = [T.acceptance, "", fill(T.given, tag, url, T.kinds[verdict.verdict], verdict.by, verdict.at)];
  const reserves = verdict.points.filter((p) => p.type === "reserve");
  if (reserves.length) lines.push("", T.reserves, "", ...reserves.map((p) => `- ${p.id} : ${p.what}${p.issue ? ` (${p.issue})` : ""}`));
  if (tarballs.length) {
    lines.push("", T.same, "", ...tarballs.map((t) => `- \`${t.name}\` — sha256 \`${t.sha256}\``));
    if (repo) lines.push("", T.install, "", ...tarballs.map((t) => `- \`npm install -D ${repo}/releases/download/${final}/${t.name}\``));
  }
  return `${lines.join("\n")}\n`;
}

/** Promotes the candidate `tag`; `run` injected by the tests. Returns { code, message }. */
export function promote(root, { tag, dryRun = false }, { run = runner(root) } = {}) {
  const T = promoteTexts(root);
  if (!CANDIDATE_RE.test(tag ?? "")) return refused(fill(T.notCandidate, tag));
  const view = json(run("gh", ["release", "view", tag, "--json", "isPrerelease,url,assets"]));
  if (!view) return refused(fill(T.noRelease, tag));
  if (!view.isPrerelease) return refused(fill(T.notPrerelease, tag));
  const dir = mkdtempSync(join(tmpdir(), "promote-release-"));
  const verdict = json(asset(run, tag, VERDICT_ASSET, dir));
  if (!verdict) return refused(fill(T.noVerdict, tag));
  if (verdict.verdict === "refused") return refused(fill(T.refusedVerdict, tag));
  const final = tag.replace(/-rc\.\d+$/, "");
  run("git", ["fetch", "-q", "origin", "--tags"]);
  if ((run("git", ["tag", "-l", final]) ?? "").trim()) return refused(fill(T.exists, final));
  const commit = (run("git", ["rev-parse", "--verify", "--quiet", `${tag}^{commit}`]) ?? "").trim();
  if (!commit) return refused(fill(T.noTag, tag));
  const sheet = asset(run, tag, sheetAsset(tag), dir);
  if (sheet === null) return refused(fill(T.noSheet, tag, sheetAsset(tag)));
  const prints = readFingerprints(sheet);
  const names = (view.assets ?? []).map((a) => a.name).filter((n) => n.endsWith(".tgz"));
  const tarballs = [];
  for (const name of new Set([...names, ...Object.keys(prints)])) {
    const ok = asset(run, tag, name, dir) !== null && prints[name] === sha256(join(dir, name));
    if (!ok) return refused(fill(T.mismatch, name));
    tarballs.push({ name, sha256: prints[name], file: join(dir, name) });
  }
  const note = releaseNote({ tag, url: view.url, verdict, tarballs, repo: repoUrl(run), final }, T);
  const lines = [fill(T.plan, tag, T.kinds[verdict.verdict], final, commit.slice(0, 7), tarballs.map((t) => t.name).join(", ") || T.none)];
  lines.push(T.note, "", note);
  if (dryRun) return { code: 0, message: [...lines, T.dryRun].join("\n") };
  const prev = (
    run("git", ["describe", "--tags", "--abbrev=0", "--match", "v[0-9]*.[0-9]*.[0-9]*", "--exclude", "*-*", commit]) ?? ""
  ).trim();
  if (
    run("git", ["tag", "-a", final, commit, "-m", `Release ${final} (${tag})`]) === null ||
    run("git", ["push", "origin", final]) === null
  )
    return refused([...lines, fill(T.tagFailed, final)].join("\n"));
  const file = join(dir, "notes.md");
  writeFileSync(file, note);
  const args = [
    "release",
    "create",
    final,
    ...tarballs.map((t) => t.file),
    "--verify-tag",
    "--title",
    final,
    "--notes-file",
    file,
    "--latest",
  ];
  args.push("--generate-notes", ...(prev ? ["--notes-start-tag", prev] : []));
  if (run("gh", args) === null) return refused([...lines, fill(T.ghFailed, final, `gh ${args.join(" ")}`)].join("\n"));
  return { code: 0, message: [...lines, fill(T.published, final)].join("\n") };
}

/** Entry point; `deps` ({ run }) injected by the tests. Returns the exit code. */
export function main(args, root, deps = {}) {
  const [tag, ...rest] = args;
  if (!tag || rest.some((a) => a !== "--dry-run")) {
    console.error(promoteTexts(root).usage);
    return 2;
  }
  const r = promote(root, { tag, dryRun: rest.includes("--dry-run") }, deps);
  (r.code === 0 ? console.log : console.error)(`${r.code === 0 ? "✓" : "✗"} ${r.message}`);
  return r.code;
}

// Root: the parent of the `.githooks/` holding this script, never the current folder.
if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  process.exitCode = main(process.argv.slice(2), join(dirname(fileURLToPath(import.meta.url)), ".."));
}
