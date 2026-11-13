import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { mergeChoice, recordMerge } from "./state-merge.mjs";
import { readState } from "./state-validate.mjs";

// Voir scope-gate.test.mjs : des GIT_* hérités feraient agir les tests sur le dépôt qui les lance.
for (const nom of Object.keys(process.env)) if (nom.startsWith("GIT_")) delete process.env[nom];

const RACINE_DEPOT = fileURLToPath(new URL("..", import.meta.url));
const FICHE = "docs/projects/exemple.md";
let dossiers = [];
afterEach(() => {
  for (const d of dossiers) rmSync(d, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  dossiers = [];
});

const actif = (activite, extra = {}) => ({
  version: 1,
  activity: activite,
  active_brief: FICHE,
  active_request: null,
  since: "2026-11-07T10:00:00Z",
  ...extra,
});

/** Projet temporaire avec les hooks du dépôt (.githooks, .claude/hooks), sur une branche de chantier, état `etat`. */
function projet({ lang, etat = actif("BUILD") } = {}) {
  const racine = mkdtempSync(join(tmpdir(), "drwil-fusion-"));
  dossiers.push(racine);
  const copie = (de) =>
    cpSync(join(RACINE_DEPOT, de), join(racine, de), { recursive: true, filter: (f) => !/\.test\.mjs$|__pycache__/.test(f) });
  copie(".githooks");
  copie(".claude/hooks");
  mkdirSync(join(racine, ".drwil"), { recursive: true });
  mkdirSync(join(racine, "docs/projects"), { recursive: true });
  writeFileSync(join(racine, FICHE), "# Projet : Exemple\n");
  if (lang) writeFileSync(join(racine, ".drwil", "ia-first.json"), JSON.stringify({ lang }));
  if (etat) writeFileSync(join(racine, ".drwil", "state.json"), JSON.stringify(etat));
  const git = (...a) => spawnSync("git", a, { cwd: racine, encoding: "utf8" });
  git("init", "-q", "-b", "master");
  git("-c", "user.email=t@t", "-c", "user.name=t", "commit", "-q", "--allow-empty", "-m", "init");
  git("checkout", "-q", "-b", "workstream/exemple");
  return racine;
}

function hook(racine, entree) {
  const r = spawnSync(process.execPath, [join(racine, ".claude/hooks/prompt-hook.mjs")], {
    encoding: "utf8",
    input: JSON.stringify(entree),
  });
  const contexte = r.stdout ? JSON.parse(r.stdout).hookSpecificOutput.additionalContext : "";
  return { status: r.status, stderr: r.stderr, contexte };
}

const QUESTION = "Fusion de la PR de ce chantier ?";
const question = (extra = {}) => ({
  question: QUESTION,
  header: "drwil-merge",
  multiSelect: false,
  options: [
    { label: "Automatic merge", description: "programmée par merge-auto.mjs une fois la CI verte" },
    { label: "Manual merge", description: "la fusion reste un geste humain" },
  ],
  ...extra,
});
const SONDAGE = { questions: [question()] };
const reponse = (racine, choix, sondage = SONDAGE) =>
  hook(racine, {
    hook_event_name: "PostToolUse",
    tool_name: "AskUserQuestion",
    tool_input: sondage,
    tool_response: { ...sondage, answers: choix === undefined ? {} : { [QUESTION]: choix } },
  });
const etat = (racine) => readFileSync(join(racine, ".drwil", "state.json"), "utf8");

test("QUA-188 : la réponse au sondage de fusion n'écrit plus rien, une marque héritée auto_merge reste lisible", () => {
  const racine = projet();
  const avantEtat = etat(racine);
  // Plus de sondage de fusion : le hook ne le lit plus, rien n'est dit ni écrit (QUA-163).
  for (const choix of ["Automatic merge", "Manual merge"]) {
    const r = reponse(racine, choix);
    assert.equal(r.contexte, "", choix);
    assert.equal(etat(racine), avantEtat, choix);
  }
  assert.match(
    recordMerge(racine, "auto").message,
    /^réponse au sondage de fusion lue, état inchangé : la fusion automatique est le comportement par défaut/,
  );
  // Marque héritée : état valide, gardée telle quelle par une réponse ; en anglais selon la langue du projet.
  const herite = projet({ etat: actif("CLOSING", { auto_merge: true }) });
  assert.deepEqual(readState(herite).problems, []);
  assert.equal(recordMerge(herite, "manual").code, 0);
  assert.deepEqual(readState(herite).state, actif("CLOSING", { auto_merge: true }));
  assert.match(recordMerge(projet({ lang: "en" }), "auto").message, /^answer to the merge poll read, state unchanged/);
  // Hors de BUILD à CLOSING ou sur un état invalide : ignorée, rien n'est écrit.
  const neutre = projet({ etat: null });
  assert.match(recordMerge(neutre, "auto").message, /réponse au sondage de fusion ignorée : l'activité est SCOPING/);
  assert.equal(readState(neutre).source, "missing");
  assert.match(recordMerge(projet({ lang: "en", etat: null }), "auto").message, /the activity is SCOPING/);
  const invalide = projet({ etat: actif("BUILD", { auto_merge: "oui" }) });
  assert.match(recordMerge(invalide, "auto").message, /réponse au sondage de fusion ignorée : auto_merge : booléen attendu/);
  assert.equal(mergeChoice("fusion manuelle"), "manual");
  assert.equal(mergeChoice(" Automatic merge "), "auto");
  assert.equal(mergeChoice(undefined), null);
  // Aucune ligne de commande : state-merge.mjs n'a pas de point d'entrée.
  assert.doesNotMatch(readFileSync(join(RACINE_DEPOT, ".githooks", "state-merge.mjs"), "utf8"), /process\.argv/);
});
