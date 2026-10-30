// Messages of create-release.mjs, in the project's language. Imported by create-release.mjs and
// create-release-version.mjs; create-release.mjs re-exports `texts`.
import { readFileSync } from "node:fs";
import { join } from "node:path";

export const TEXTS = {
  fr: {
    disagree: "paquets en désaccord sur la version ({0}) : les aligner dans une PR",
    notSemver: "version de paquet absente ou non semver ({0}) dans {1}/package.json",
    fix: "changer la version dans une PR (npm version patch|minor|major --no-git-tag-version)",
    exists: "{0} existe déjà : {1}",
    notHigher: "{0} n'est pas supérieure au dernier tag {1} : {2}",
    packFailed: '[create-release] "npm pack" a échoué pour {0}, tarball non attaché : {1}',
    nothing: "[create-release] rien à publier depuis {0} (aucun commit).",
    lastTag: "[create-release] dernier tag : {0}",
    none: "(aucun)",
    refused: "[create-release] ✗ release refusée : {0}",
    suggestion: "suggestion d'après les commits",
    detected: "bump détecté",
    bump: "[create-release] {0} : {1} ({2} commit(s) analysé(s))",
    next: "[create-release] prochaine version : {0} (source : {1})",
    tarballs: "[create-release] tarball(s) à construire et attacher à la release : {0}",
    dryRun: "[create-release] --dry-run : aucun tag ni release créé.",
    pushed: "[create-release] tag {0} créé et poussé.",
    attached: "[create-release] tarball(s) attaché(s) à la release : {0}",
    ghFailed: "[create-release] tag créé, mais la release GitHub a échoué (gh indisponible ou permission insuffisante) : {0}",
    catchUp: "[create-release] rattraper à la main : {0}",
    candidate: "[create-release] candidate : {0} (pré-release ; la release définitive vient de la promotion, après le verdict de recette)",
    sheet: "[create-release] fiche de recette de {0} :",
    prerelease: "[create-release] pré-release {0} publiée avec sa fiche de recette ({1}).",
    mode: "[create-release] mode de release : {0}",
    badMode: "release.mode vaut « {0} » dans .drwil/ia-first.json : « solo » ou « team » attendu",
    teamDirect:
      "mode « team » : la release directe est refusée, publier une candidate (node .githooks/create-release.mjs --candidate) puis la promouvoir après le verdict",
  },
  en: {
    disagree: "packages disagree on the version ({0}): align them in a PR",
    notSemver: "package version missing or not semver ({0}) in {1}/package.json",
    fix: "change the version in a PR (npm version patch|minor|major --no-git-tag-version)",
    exists: "{0} already exists: {1}",
    notHigher: "{0} is not higher than the latest tag {1}: {2}",
    packFailed: '[create-release] "npm pack" failed for {0}, tarball not attached: {1}',
    nothing: "[create-release] nothing to publish since {0} (no commit).",
    lastTag: "[create-release] latest tag: {0}",
    none: "(none)",
    refused: "[create-release] ✗ release refused: {0}",
    suggestion: "suggestion from the commits",
    detected: "detected bump",
    bump: "[create-release] {0}: {1} ({2} commit(s) analysed)",
    next: "[create-release] next version: {0} (source: {1})",
    tarballs: "[create-release] tarball(s) to build and attach to the release: {0}",
    dryRun: "[create-release] --dry-run: no tag nor release created.",
    pushed: "[create-release] tag {0} created and pushed.",
    attached: "[create-release] tarball(s) attached to the release: {0}",
    ghFailed: "[create-release] tag created, but the GitHub release failed (gh unavailable or insufficient permission): {0}",
    catchUp: "[create-release] catch up by hand: {0}",
    candidate: "[create-release] candidate: {0} (pre-release; the final release comes from the promotion, after the acceptance verdict)",
    sheet: "[create-release] acceptance sheet of {0}:",
    prerelease: "[create-release] pre-release {0} published with its acceptance sheet ({1}).",
    mode: "[create-release] release mode: {0}",
    badMode: 'release.mode is "{0}" in .drwil/ia-first.json: "solo" or "team" expected',
    teamDirect:
      'mode "team": a direct release is refused, publish a candidate (node .githooks/create-release.mjs --candidate) then promote it after the verdict',
  },
};

/** Fills the `{0}`, `{1}`… holes of a message. */
export const fill = (message, ...values) => message.replace(/\{(\d)\}/g, (_, i) => values[i]);

/** Messages in the project's language (.drwil/ia-first.json of the current folder; French by default). */
export function texts() {
  try {
    return TEXTS[JSON.parse(readFileSync(join(".drwil", "ia-first.json"), "utf8")).lang === "en" ? "en" : "fr"];
  } catch {
    return TEXTS.fr;
  }
}

export const RELEASE_MODES = ["solo", "team"];

/** `release.mode` of .drwil/ia-first.json: "solo" (default, also without file or key) or "team"; any other value is returned as `error`. */
export function releaseMode() {
  let mode;
  try {
    mode = JSON.parse(readFileSync(join(".drwil", "ia-first.json"), "utf8")).release?.mode;
  } catch {
    mode = undefined;
  }
  if (mode === undefined) return { mode: "solo" };
  return RELEASE_MODES.includes(mode) ? { mode } : { error: String(mode) };
}
