// Mise à jour du kit par `drwil init` (split from scope-gate.mjs) : la barrière ne juge pas les fichiers que
// le commit de la mise à jour tient du manifeste du kit (.drwil/installed-files.json) ; tout autre fichier du
// même commit reste jugé comme dans un commit ordinaire. Reconnu par le trailer `Drwil-Kit-Update` (rejeu) ou
// par `DRWIL_KIT_UPDATE` (pre-commit, posé par `init` seul), jamais sur la foi du seul trailer ou de la variable :
// l'empreinte de chaque fichier doit être celle que le manifeste du commit déclare. Le commit d'installation dans
// un dépôt existant (parent sans manifeste) crée la configuration : admise si aucune garde n'y est coupée. Les
// chemins que le kit donne à ses contrôles (`kitPaths`) sont calculés ici, pour la CLI comme pour la barrière.
import { createHash } from "node:crypto";
import { git } from "./scope-gate-merge.mjs";

export const KIT_TRAILER = "Drwil-Kit-Update";
export const KIT_ENV = "DRWIL_KIT_UPDATE";
const MANIFEST = ".drwil/installed-files.json";
const RECORD = ".drwil/install.json";
const CONFIG = ".drwil/ia-first.json";
// Empreintes après complétion d'un fichier modifié à la main, notées à part par `init` à chaque passage (QUA-244).
const COMPLETED = ".drwil/completed-files.json";
// Réglages que `init` recalcule à chaque passage (détection de pile, options) : seuls eux peuvent changer ; les
// autres clés (barrière, transitions, contrôles, garanties…) sont au projet, un ajout ou un retrait les refuse.
const RECOMPUTED = new Set([
  "projectName",
  "projectShort",
  "lang",
  "layers",
  "contractPrefixes",
  "tools",
  "ci",
  "ciFiles",
  "stack",
  "mode",
  "dirs",
  "layerPrefixes",
  "codePrefixes",
  "extraCodeFiles",
  "extraCodeGlobs",
  "guaranteeBaseline",
]);
const WEAKENING = new Set(["off", "agent"]);
// Dossiers et fichiers du kit, de l'outillage et de git : le code d'un projet ne les lit pas ; les toucher (une fiche, une
// mise à jour du kit) ne rejoue pas la couverture ni l'e2e.
const KIT_DIRS = new Set([
  ".drwil",
  ".githooks",
  ".claude",
  ".cursor",
  ".gemini",
  ".codex",
  ".github",
  ".gitlab",
  "docs",
  ".git",
  "node_modules",
]);
const KIT_FILES = new Set([".gitignore", ".gitattributes", ".gitlab-ci.yml", ".gitleaks.toml"]);

/**
 * Paths the kit gives a check of `layer` (`files`: the project's files, relative to its root): a layer below the root, `<layer>/**`;
 * the root, each directory holding a file and each extension of its own files (sources, tests, tool configuration, package
 * manifest and lock), never the kit's, Markdown or git's — `["**"]` only when nothing delimits (a check never reads less than
 * its paths). One function for the creation, the update, `doctor` and this gate.
 */
export function kitPaths(layer, files) {
  if (layer !== "." && layer !== "") return [`${layer}/**`];
  const out = new Set();
  for (const f of files) {
    const [top, ...rest] = f.split("/");
    if (rest.length) {
      if (!KIT_DIRS.has(top)) out.add(`${top}/**`);
      continue;
    }
    if (!top || KIT_FILES.has(top) || /\.md$/i.test(top)) continue;
    // `vite.config.js` → `*.js` (a new file of the same kind is covered too) ; `.env`, `Makefile` : the name itself.
    const ext = /^.+(\.[^.]+)$/.exec(top)?.[1];
    out.add(ext ? `*${ext}` : top);
  }
  return out.size ? [...out].sort() : ["**"];
}

/** A check the kit generates: the coverage of a layer (`coverage-<layer>`, `coverage-diff-<layer>`) or `e2e`. */
export const kitCheck = (id) => id === "e2e" || /^coverage-./.test(String(id));
/** Paths the kit computes for one of its checks: a coverage check covers its layer (`cwd`), `e2e` all the code it crosses. */
export const kitPathsOf = (c, files) => kitPaths(/^coverage-/.test(String(c?.id)) && typeof c.cwd === "string" ? c.cwd : ".", files);

// rev null : l'index.
const show = (root, rev, f) => git(root, ["show", rev === null ? `:${f}` : `${rev}:${f}`]);
const sha = (text) => createHash("sha256").update(text).digest("hex");

function manifestAt(root, rev) {
  try {
    const m = JSON.parse(show(root, rev, MANIFEST));
    return m && typeof m === "object" && !Array.isArray(m) ? m : {};
  } catch {
    return {};
  }
}

const parse = (text) => {
  try {
    const v = JSON.parse(text);
    return v && typeof v === "object" && !Array.isArray(v) ? v : null;
  } catch {
    return null;
  }
};

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/**
 * True when the config only changes what `init` recomputes, appends checks, adds a setting that does not switch a guard off, or
 * moves the `paths` of a kit check from `["**"]` to the ones the kit computes on `files()` (what the commit holds), nothing else.
 */
function configFromInit(before, after, files) {
  const old = parse(before);
  const now = parse(after);
  if (!old || !now) return false;
  for (const key of new Set([...Object.keys(old), ...Object.keys(now)])) {
    if (same(old[key], now[key]) || RECOMPUTED.has(key)) continue;
    if (!(key in old)) {
      if (WEAKENING.has(now[key])) return false;
      continue;
    }
    if (key !== "checks" || !Array.isArray(old.checks) || !Array.isArray(now.checks)) return false;
    const repathed = (c, n) =>
      kitCheck(c?.id) && same(c.paths, ["**"]) && same({ ...c, paths: n?.paths }, n) && same(n.paths, kitPathsOf(n, files()));
    if (old.checks.some((c, i) => !same(c, now.checks[i]) && !repathed(c, now.checks[i]))) return false;
  }
  return true;
}

/**
 * Among `files` (changed between `before` and `after`, null: the index), those that a kit update does not
 * explain: a file present after must carry the fingerprint of the manifest after, or the one noted aside after
 * completion; a file removed, that of the manifest before (an obsolete file never modified).
 */
export function nonKitFiles(root, before, after, files) {
  const was = manifestAt(root, before);
  const now = manifestAt(root, after);
  // Une entrée notée à part se reconnaît à sa forme exacte une fois relue : dans une chaîne JSON, un guillemet est
  // toujours échappé, une valeur ne peut donc pas imiter `{"file":…,"sha256":…}`. Illisible ou absent : « null ».
  const completed = JSON.stringify({ ...parse(show(root, after, COMPLETED)) }.files);
  const args = after === null ? ["ls-files", "-z"] : ["ls-tree", "-r", "-z", "--name-only", "--full-tree", after];
  const tree = () => (git(root, args) ?? "").split("\0").filter(Boolean);
  const fromKit = (f) => {
    if (f === MANIFEST || f === RECORD || f === COMPLETED) return true;
    // Installation (parent sans manifeste) : configuration créée, jugée comme un ajout de réglages à une configuration vide.
    if (f === CONFIG) return configFromInit(show(root, before, f) ?? (Object.keys(was).length ? null : "{}"), show(root, after, f), tree);
    const content = show(root, after, f);
    if (content !== null)
      return (f in now && sha(content) === now[f]) || `${completed}`.includes(JSON.stringify({ file: f, sha256: sha(content) }));
    const old = show(root, before, f);
    return old !== null && f in was && sha(old) === was[f];
  };
  return files.filter((f) => !fromKit(f));
}
