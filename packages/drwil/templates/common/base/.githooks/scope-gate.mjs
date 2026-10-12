#!/usr/bin/env node
// Barrière de périmètre (docs/ia-first.md, « Barrière de périmètre »), contrôle
// « perimetre-attente » du moteur (.githooks/engine.mjs) : commit, push, CI, `drwil verify`.
//
// - Les fiches (docs/projects/, docs/intentions/…) sont toujours commitables.
// - Au commit, tout autre fichier exige l'activité BUILD et doit être couvert par le
//   bloc cadrage de la fiche active tel qu'il est dans HEAD : élargir son périmètre demande
//   un commit séparé, visible à part.
// - Ailleurs (pre-push, CI, verify), l'état local n'existe pas : chaque commit de la branche
//   est rejoué contre le cadrage de la fiche de son trailer `Drwil-Brief`, lu dans son
//   parent. Un commit est jugé selon les règles de son parent : sans barrière dans le parent,
//   il n'est pas contrôlé.
// Sévérité : réglage `scopeGate` (off | warning | blocking), warning si absent.
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { fnmatch, lireBloc, normaliser } from "./scope.mjs";
import { gouvernanceDesactivee, lireEtat } from "./state.mjs";

// Les attestations passent comme les fiches : preuve humaine déjà gardée par
// `drwil attest` (terminal requis, empreinte du contrat), relue en revue ; les
// soumettre au cadrage obligerait à élargir chaque fiche pour clore.
export const HORS_PERIMETRE = ["docs/projects/*", "docs/intentions/*", ".drwil/evidence/attestations/*"];
export const TRAILER = "Drwil-Brief";
const NIVEAUX = new Set(["off", "warning", "blocking"]);
const MARQUEUR = ".githooks/scope-gate.mjs";

const TEXTES = {
  fr: {
    activity: (a, n) =>
      `${n} fichier(s) hors fiches commité(s) en ${a} : seule l'activité BUILD l'autorise (node .githooks/state.mjs move …)`,
    horsCadrage: (f, fiche) => `${f} : hors du cadrage de ${fiche} (dans HEAD) — l'ajouter au bloc cadrage et commiter la fiche d'abord`,
    sansTrailer: (c, n) => `${c} : ${n} fichier(s) hors fiches sans trailer ${TRAILER}`,
    horsCadrageCommit: (c, f, fiche) => `${c} : ${f} hors du cadrage de ${fiche} (dans le parent)`,
    sansReference: "aucune branche de référence (origin/HEAD, master, main, ou DRWIL_BASE)",
    echec: (n) => `périmètre de l'attente : ${n} problème(s) (barrière bloquante)`,
  },
  en: {
    activity: (a, n) =>
      `${n} file(s) outside sheets committed in ${a}: only the BUILD activity allows it (node .githooks/state.mjs move …)`,
    horsCadrage: (f, fiche) => `${f}: outside the scope of ${fiche} (in HEAD) — add it to the scope block and commit the brief first`,
    sansTrailer: (c, n) => `${c}: ${n} file(s) outside sheets without a ${TRAILER} trailer`,
    horsCadrageCommit: (c, f, fiche) => `${c}: ${f} outside the scope of ${fiche} (in the parent)`,
    sansReference: "no reference branch (origin/HEAD, master, main, or DRWIL_BASE)",
    echec: (n) => `expectation scope: ${n} problem(s) (blocking barrier)`,
  },
};

const textes = (cfg) => TEXTES[cfg?.lang === "en" ? "en" : "fr"];

function git(racine, args) {
  const r = spawnSync("git", args, { cwd: racine, encoding: "utf8" });
  return r.status === 0 ? r.stdout : null;
}

/** Fichiers soumis au périmètre : tout sauf les fiches (liste réglable). */
export function horsFiches(fichiers, outOfScope = HORS_PERIMETRE) {
  return fichiers.map(normaliser).filter((f) => !outOfScope.some((m) => fnmatch(f, m)));
}

const couvert = (f, motifs) => motifs.some((m) => fnmatch(f, m));

/** Problèmes d'un commit en préparation (pur). */
export function verifierIndex({ fichiers, etat, motifs, outOfScope, cfg }) {
  const T = textes(cfg);
  const soumis = horsFiches(fichiers, outOfScope);
  if (!soumis.length) return [];
  if (etat.activity !== "BUILD") return [T.activity(etat.activity, soumis.length)];
  return soumis.filter((f) => !couvert(f, motifs)).map((f) => T.horsCadrage(f, etat.active_brief));
}

/** Motifs du bloc cadrage de `fiche` dans la révision `rev` ; aucun si la fiche n'y existe pas. */
function motifsA(racine, rev, fiche) {
  const texte = fiche ? git(racine, ["show", `${rev}:${fiche}`]) : null;
  return texte === null ? [] : lireBloc(texte).motifs;
}

function reference(racine, env) {
  const candidats = env.DRWIL_BASE ? [env.DRWIL_BASE] : [];
  const origine = git(racine, ["symbolic-ref", "--quiet", "refs/remotes/origin/HEAD"]);
  if (origine) candidats.push(origine.trim());
  candidats.push("origin/master", "origin/main", "master", "main");
  for (const ref of candidats) {
    if (git(racine, ["rev-parse", "--verify", "--quiet", `${ref}^{commit}`]) === null) continue;
    const base = git(racine, ["merge-base", "HEAD", ref]);
    if (base) return base.trim();
  }
  return null;
}

function verifierBranche(racine, base, { outOfScope, cfg }) {
  const T = textes(cfg);
  const problemes = [];
  // Aucun repli `?? ""` sur ces appels git : ils portent sur des commits existants (base issue de
  // merge-base) ; un échec doit casser le contrôle, pas le faire passer sans rien juger (QUA-013).
  const commits = git(racine, ["rev-list", "--no-merges", "--reverse", `${base}..HEAD`])
    .split("\n")
    .filter(Boolean);
  for (const c of commits) {
    const court = c.slice(0, 7);
    // Règles du parent : sans barrière dans le parent, le commit n'est pas jugé.
    if (git(racine, ["cat-file", "-e", `${c}^:${MARQUEUR}`]) === null) continue;
    const fichiers = git(racine, ["diff-tree", "--no-commit-id", "--name-only", "-r", "--no-renames", c]).split("\n").filter(Boolean);
    const soumis = horsFiches(fichiers, outOfScope);
    if (!soumis.length) continue;
    const valeurs = git(racine, ["log", "-1", `--format=%(trailers:key=${TRAILER},valueonly)`, c])
      .split("\n")
      .map((v) => v.trim())
      .filter(Boolean);
    const fiche = valeurs.at(-1);
    if (!fiche) {
      problemes.push(T.sansTrailer(court, soumis.length));
      continue;
    }
    const motifs = motifsA(racine, `${c}^`, fiche);
    for (const f of soumis) if (!couvert(f, motifs)) problemes.push(T.horsCadrageCommit(court, f, fiche));
  }
  return problemes;
}

/**
 * Contrôle complet pour le moteur : `{ statut, problemes, message?, detail? }`.
 * `indexes` (fichiers indexés) n'est fourni qu'au pre-commit ; sinon la branche est rejouée.
 */
export function controlerPerimetre(racine, { cfg = {}, indexes = null, env = process.env } = {}) {
  const niveau = NIVEAUX.has(cfg.scopeGate) ? cfg.scopeGate : "warning";
  if (niveau === "off") return { statut: "non-applicable", problemes: [], detail: "scopeGate: off" };
  const outOfScope = Array.isArray(cfg.outOfScope) ? cfg.outOfScope : HORS_PERIMETRE;
  let problemes;
  if (indexes) {
    const { etat } = lireEtat(racine);
    problemes = verifierIndex({ fichiers: indexes, etat, motifs: motifsA(racine, "HEAD", etat.active_brief), outOfScope, cfg });
  } else {
    const base = reference(racine, env);
    if (!base) return { statut: "non-execute", problemes: [], detail: textes(cfg).sansReference };
    problemes = verifierBranche(racine, base, { outOfScope, cfg });
  }
  if (problemes.length && niveau === "blocking") return { statut: "echec", problemes, message: textes(cfg).echec(problemes.length) };
  return { statut: "ok", problemes };
}

/** Ajoute `Drwil-Brief: <fiche active>` au message (hook prepare-commit-msg) ; rien sans attente ni gouvernance. */
export function ajouterTrailer(racine, fichierMessage) {
  if (gouvernanceDesactivee(racine)) return;
  const { etat } = lireEtat(racine);
  if (!etat.active_brief) return;
  git(racine, [
    "interpret-trailers",
    "--in-place",
    "--if-exists",
    "replace",
    "--trailer",
    `${TRAILER}: ${etat.active_brief}`,
    fichierMessage,
  ]);
}

// `node .githooks/scope-gate.mjs --trailer <fichier>` (prepare-commit-msg). Ne bloque jamais le commit :
// ajouterTrailer ne lève pas, un échec de git laisse le message tel quel.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const i = process.argv.indexOf("--trailer");
  if (i >= 0 && process.argv[i + 1]) ajouterTrailer(process.cwd(), process.argv[i + 1]);
}
