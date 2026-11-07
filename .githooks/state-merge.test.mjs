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
const COPILOT = (champ = { type: "string", enum: ["Automatic merge", "Manual merge"] }, autres = {}) => ({
  message: "drwil-merge : fusion de la PR de ce chantier ?",
  requestedSchema: { properties: { "drwil-merge": champ, ...autres } },
});
const avant = (racine, tool_input) => hook(racine, { hook_event_name: "PreToolUse", tool_name: "AskUserQuestion", tool_input });
const reponse = (racine, choix, sondage = SONDAGE) =>
  hook(racine, {
    hook_event_name: "PostToolUse",
    tool_name: "AskUserQuestion",
    tool_input: sondage,
    tool_response: { ...sondage, answers: choix === undefined ? {} : { [QUESTION]: choix } },
  });
const etat = (racine) => readFileSync(join(racine, ".drwil", "state.json"), "utf8");

test("QUA-265 : le hook refuse un sondage de fusion prérempli, recommandé, à valeur par défaut ou mal formé", () => {
  const racine = projet();
  assert.equal(avant(racine, SONDAGE).status, 0, "une question, deux réponses, rien de prérempli : posé");
  const francais = question({ options: [{ label: "Fusion automatique" }, { label: "Fusion manuelle" }] });
  assert.equal(avant(racine, { questions: [francais] }).status, 0, "réponses en français : posé");
  const q = question();
  const refuses = {
    preremplie: { ...SONDAGE, answers: { [QUESTION]: "Automatic merge" } },
    recommandee: { questions: [{ ...q, options: [{ label: "Automatic merge (Recommended)" }, q.options[1]] }] },
    "recommandée en description": {
      questions: [{ ...q, options: [q.options[0], { label: "Manual merge", description: "(Recommandé)" }] }],
    },
    "choix multiple": { questions: [{ ...q, multiSelect: true }] },
    "une seule réponse": { questions: [{ ...q, options: [q.options[0]] }] },
    "trois réponses": { questions: [{ ...q, options: [...q.options, { label: "Plus tard" }] }] },
    "deux fois la même réponse": { questions: [{ ...q, options: [q.options[0], q.options[0]] }] },
    "autre réponse": { questions: [{ ...q, options: [q.options[0], { label: "Plus tard" }] }] },
    "une autre question à côté": { questions: [q, { question: "Autre ?", header: "autre", options: q.options }] },
  };
  for (const [cas, sondage] of Object.entries(refuses)) {
    const r = avant(racine, sondage);
    assert.equal(r.status, 2, cas);
    assert.match(r.stderr, /sondage de fusion refusé — une seule question d'en-tête `drwil-merge`/, cas);
  }
  // Copilot CLI : un seul champ `drwil-merge`, choix unique (`enum` seul), sans défaut, tableau ni recommandation.
  assert.equal(avant(racine, COPILOT()).status, 0);
  const champ = { type: "string", enum: ["Automatic merge", "Manual merge"] };
  for (const mauvais of [
    COPILOT({ ...champ, default: "Automatic merge" }),
    COPILOT({ type: "array", items: champ, enum: champ.enum }),
    COPILOT({ ...champ, enum: ["Automatic merge (Recommended)", "Manual merge"] }),
    COPILOT(champ, { autre: champ }),
    { message: "drwil-merge : ?", requestedSchema: { properties: { autre: champ } } },
  ])
    assert.equal(avant(racine, mauvais).status, 2);
  // En anglais selon la langue du projet ; un sondage étranger passe sans rien changer.
  assert.match(avant(projet({ lang: "en" }), refuses.preremplie).stderr, /merge poll refused/);
  assert.equal(avant(racine, { questions: [{ ...q, header: "autre" }] }).status, 0);
  // La question drwil-merge d'un sondage de lancement reste celle du lancement, jamais ce sondage.
  const lancement = { questions: [{ question: "Quelle fiche ?", header: "drwil-start", options: [{ label: FICHE }] }, q] };
  assert.doesNotMatch(avant(racine, lancement).stderr, /sondage de fusion refusé/);
});

test("QUA-265 : la réponse humaine, lue par le hook, écrit ou retire auto_merge de BUILD à CLOSING", () => {
  const racine = projet();
  let r = reponse(racine, "Automatic merge");
  assert.match(r.contexte, /^\[drwil\] ✓ fusion automatique autorisée par l'humain \(sondage `drwil-merge`\) pour ce chantier/);
  assert.equal(readState(racine).state.auto_merge, true);
  r = reponse(racine, "Manual merge");
  assert.match(r.contexte, /✓ fusion manuelle choisie par l'humain/);
  assert.equal(readState(racine).state.auto_merge, undefined);
  assert.equal(readState(racine).state.activity, "BUILD", "le reste de l'état est gardé");
  // Sans réponse, ou réponse libre : rien n'est écrit.
  const avantEtat = etat(racine);
  assert.match(reponse(racine, undefined).contexte, /✗ aucune réponse lue dans le sondage de fusion/);
  assert.match(reponse(racine, "Je ne sais pas").contexte, /✗ aucune réponse lue/);
  assert.equal(etat(racine), avantEtat);
  // Copilot CLI : réponse en texte libre, avec ou sans le nom du champ.
  for (const texte of ["Automatic merge", "drwil-merge=Fusion automatique"]) {
    const copilot = projet({ etat: actif("VERIFY") });
    hook(copilot, {
      hook_event_name: "PostToolUse",
      tool_input: COPILOT(),
      tool_result: { text_result_for_llm: `User responded: ${texte}` },
    });
    assert.equal(readState(copilot).state.auto_merge, true, texte);
  }
  // En CLOSING : enregistrée ; en anglais selon la langue du projet.
  const cloture = projet({ etat: actif("CLOSING") });
  reponse(cloture, "Automatic merge");
  assert.equal(readState(cloture).state.auto_merge, true);
  assert.match(
    reponse(projet({ lang: "en" }), "Automatic merge").contexte,
    /✓ automatic merge authorised by the human \(`drwil-merge` poll\)/,
  );
});

test("QUA-265 : hors de BUILD à CLOSING ou sur un état invalide, rien n'est écrit ; aucune commande ne l'écrit", () => {
  const cadrage = projet({ etat: actif("SCOPING", { active_brief: null }) });
  const neutre = projet({ etat: null });
  assert.match(reponse(neutre, "Automatic merge").contexte, /✗ réponse au sondage de fusion ignorée : l'activité est SCOPING/);
  assert.equal(readState(neutre).state.auto_merge, undefined);
  writeFileSync(join(cadrage, ".drwil", "state.json"), "{ pas du json");
  assert.match(reponse(cadrage, "Automatic merge").contexte, /✗ réponse au sondage de fusion ignorée : .*illisible/);
  assert.equal(etat(cadrage), "{ pas du json");
  assert.match(recordMerge(projet({ lang: "en", etat: null }), "auto").message, /the activity is SCOPING.*`drwil-scope` poll/);
  assert.equal(mergeChoice("fusion manuelle"), "manual");
  // Appel direct, comme le hook : auto écrit auto_merge, manual le retire, le reste de l'état est gardé.
  const direct = projet({ etat: actif("EVIDENCE") });
  assert.equal(recordMerge(direct, "auto").code, 0);
  assert.deepEqual(readState(direct).state, actif("EVIDENCE", { auto_merge: true }));
  assert.match(recordMerge(direct, "manual").message, /fusion manuelle choisie par l'humain/);
  assert.deepEqual(readState(direct).state, actif("EVIDENCE"));
  assert.equal(mergeChoice(undefined), null);
  assert.equal(mergeChoice(" Automatic merge "), "auto");
  assert.equal(mergeChoice("Plus tard"), null);
  const invalide = projet({ etat: actif("BUILD", { auto_merge: "oui" }) });
  assert.match(recordMerge(invalide, "auto").message, /réponse au sondage de fusion ignorée : auto_merge : booléen attendu/);
  // Aucune ligne de commande : state-merge.mjs n'a pas de point d'entrée, state.mjs ne connaît pas de sous-commande de fusion.
  const source = readFileSync(join(RACINE_DEPOT, ".githooks", "state-merge.mjs"), "utf8");
  assert.doesNotMatch(source, /process\.argv/);
  spawnSync(process.execPath, [join(neutre, ".githooks", "state.mjs"), "merge", "auto"], {
    cwd: neutre,
    encoding: "utf8",
  });
  assert.equal(readState(neutre).state.auto_merge, undefined);
});

test("QUA-265 : le rappel d'état dit la fusion automatique autorisée par l'humain, au lancement ou par le sondage", async () => {
  const { context } = await import("./state-texts.mjs");
  const racine = projet({ etat: actif("BUILD", { auto_merge: true }) });
  assert.match(
    context(readState(racine), racine),
    /Fusion automatique autorisée par l'humain \(au lancement ou par le sondage `drwil-merge`\) : en CLOSING/,
  );
  const en = projet({ lang: "en", etat: actif("BUILD", { auto_merge: true }) });
  assert.match(context(readState(en), en), /Automatic merge authorised by the human \(at start or by the `drwil-merge` poll\): in CLOSING/);
  assert.doesNotMatch(context(readState(projet()), racine), /Fusion automatique autorisée/);
});
