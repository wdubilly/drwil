// Mise à jour du kit par `drwil init` (split from scope-gate.mjs) : la barrière ne juge pas les fichiers que
// le commit de la mise à jour tient du manifeste du kit (.drwil/installed-files.json) ; tout autre fichier du
// même commit reste jugé comme dans un commit ordinaire. Reconnu par le trailer `Drwil-Kit-Update` (rejeu) ou
// par `DRWIL_KIT_UPDATE` (pre-commit, posé par `init` seul), jamais sur la foi du seul trailer ou de la variable :
// l'empreinte de chaque fichier doit être celle que le manifeste du commit déclare.
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

/** True when the config only changes what `init` recomputes, appends checks, or adds a setting that does not switch a guard off. */
function configFromInit(before, after) {
  const old = parse(before);
  const now = parse(after);
  if (!old || !now) return false;
  for (const key of new Set([...Object.keys(old), ...Object.keys(now)])) {
    if (JSON.stringify(old[key]) === JSON.stringify(now[key]) || RECOMPUTED.has(key)) continue;
    if (!(key in old)) {
      if (WEAKENING.has(now[key])) return false;
      continue;
    }
    if (key !== "checks" || !Array.isArray(old.checks) || !Array.isArray(now.checks)) return false;
    if (old.checks.some((c, i) => JSON.stringify(c) !== JSON.stringify(now.checks[i]))) return false;
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
  const fromKit = (f) => {
    if (f === MANIFEST || f === RECORD || f === COMPLETED) return true;
    if (f === CONFIG) return configFromInit(show(root, before, f), show(root, after, f));
    const content = show(root, after, f);
    if (content !== null)
      return (f in now && sha(content) === now[f]) || `${completed}`.includes(JSON.stringify({ file: f, sha256: sha(content) }));
    const old = show(root, before, f);
    return old !== null && f in was && sha(old) === was[f];
  };
  return files.filter((f) => !fromKit(f));
}
