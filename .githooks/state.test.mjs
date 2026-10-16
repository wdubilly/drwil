import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { PassThrough } from "node:stream";
import { briefIntent, intentsLeftBehind, lastReview, missingCriteria, staleIntents } from "./briefs.mjs";
import {
  ACTIVITIES,
  acceptanceCriteria,
  declaredContracts,
  NEUTRAL_STATE,
  context,
  main,
  requiresHuman,
  readState,
  move,
  prepareTransition,
  verifyEvidence,
  scopedBriefs,
  start,
  stopQueue,
  shortReminder,
  reminderIfChanged,
  briefStatus,
  briefMaturity,
  transitionAllowed,
  validateState,
} from "./state.mjs";

// Un hook lancé par `git commit -a` ou depuis un worktree reçoit GIT_INDEX_FILE, GIT_DIR… :
// hérités, ils font agir les dépôts de test, et le code testé, sur le dépôt qui lance les tests.
for (const nom of Object.keys(process.env)) if (nom.startsWith("GIT_")) delete process.env[nom];

// Chaque dossier temporaire est supprimé après son test : ces tests tournent à chaque commit,
// et aussi dans chaque projet que génèrent les tests du kit ; sans ça, ils épuisaient les
// inodes de /tmp. Ceux d'un test en échec sont gardés
// (et affichés) pour le diagnostic.
let dossiersDuTest = [];
const tmp = (prefixe) => {
  const dir = mkdtempSync(join(tmpdir(), prefixe));
  dossiersDuTest.push(dir);
  return dir;
};
afterEach((t) => {
  if (t.passed === false) console.error(`dossiers gardés pour diagnostic (${t.name}) : ${dossiersDuTest.join(", ")}`);
  else {
    for (const dir of dossiersDuTest) {
      // macOS (CI) : ENOTEMPTY possible pendant la suppression ; rmSync réessaie. Un dossier
      // résiduel ne doit pas faire échouer un test réussi : signalé.
      try {
        rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
      } catch (e) {
        console.error(`dossier temporaire non supprimé (${t.name}) : ${dir} — ${e.code ?? e.message}`);
      }
    }
  }
  dossiersDuTest = [];
});

const FICHE = "docs/projects/exemple.md";

function depot({ state: etat, fiche = true, lang, config } = {}) {
  const racine = tmp("drwil-etat-");
  mkdirSync(join(racine, ".drwil"));
  mkdirSync(join(racine, "docs", "projects"), { recursive: true });
  if (lang || config) writeFileSync(join(racine, ".drwil", "ia-first.json"), JSON.stringify({ ...(lang ? { lang } : {}), ...config }));
  if (fiche) {
    writeFileSync(
      join(racine, FICHE),
      `# Projet : Exemple

**Statut** : cadré le 2026-10-09.

<!-- scope
files:
  - src/auth/login.ts
  - tests/auth/login.test.ts
-->
`,
    );
  }
  if (etat !== undefined) {
    writeFileSync(join(racine, ".drwil", "state.json"), typeof etat === "string" ? etat : JSON.stringify(etat));
  }
  return racine;
}

const actif = (activite, extra = {}) => ({
  version: 1,
  activity: activite,
  active_brief: FICHE,
  active_request: null,
  since: "2026-10-09T10:00:00Z",
  ...extra,
});

test("sans state.json : SCOPING neutre, jamais d'état actif implicite", () => {
  const lu = readState(depot());
  assert.equal(lu.source, "missing");
  assert.deepEqual(lu.state, NEUTRAL_STATE);
  assert.deepEqual(lu.problems, []);
});

test("état actif valide : activité et attente lues depuis le disque", () => {
  const lu = readState(depot({ state: actif("BUILD") }));
  assert.equal(lu.source, "file");
  assert.deepEqual(lu.problems, []);
  assert.equal(lu.state.activity, "BUILD");
  assert.equal(lu.state.active_brief, FICHE);
});

test("JSON illisible : état invalide, ramené au neutre, problème signalé", () => {
  const lu = readState(depot({ state: "{ pas du json" }));
  assert.equal(lu.source, "file");
  assert.deepEqual(lu.state, NEUTRAL_STATE);
  assert.match(lu.problems[0], /illisible/);
});

test("validation : activité inconnue, champ inconnu, version absente", () => {
  const racine = depot();
  assert.match(validateState({ ...actif("CODAGE") }, racine)[0], /activité inconnue/);
  // Le périmètre vit dans la fiche versionnée, jamais dans l'état local.
  assert.match(validateState({ ...actif("BUILD"), perimetre_actif: ["src/"] }, racine)[0], /champ inconnu « perimetre_actif »/);
  const { version, ...sansVersion } = actif("BUILD");
  assert.match(validateState(sansVersion, racine)[0], /version/);
  assert.match(validateState([], racine)[0], /objet/);
});

test("validation : SCOPING sans attente ni demande, les autres activités exigent une attente", () => {
  const racine = depot();
  assert.deepEqual(validateState(NEUTRAL_STATE, racine), []);
  assert.match(validateState(actif("SCOPING"), racine)[0], /SCOPING.*aucune attente/);
  assert.match(validateState({ ...actif("BUILD"), active_brief: null }, racine)[0], /attente active requise/);
});

test("validation : l'attente active est une fiche existante de docs/projects/, hors modèle", () => {
  const racine = depot();
  assert.match(validateState(actif("BUILD", { active_brief: "docs/projects/absente.md" }), racine)[0], /introuvable/);
  assert.match(validateState(actif("BUILD", { active_brief: "src/auth/login.ts" }), racine)[0], /docs\/projects\//);
  assert.match(validateState(actif("BUILD", { active_brief: "docs/projects/../../etc/passwd.md" }), racine)[0], /docs\/projects\//);
  assert.match(validateState(actif("BUILD", { active_brief: "docs/projects/model-brief.md" }), racine)[0], /modèle/);
});

test("validation : active_request et depuis bien typés", () => {
  const racine = depot();
  assert.match(validateState(actif("REQUEST", { active_request: 42 }), racine)[0], /active_request/);
  assert.match(validateState(actif("REQUEST", { since: "hier" }), racine)[0], /since/);
  assert.deepEqual(validateState(actif("REQUEST", { active_request: "Lot 1" }), racine), []);
});

test("clôture : fiche déjà supprimée tolérée en CLOSING seulement, les autres règles de l'attente restent", () => {
  const racine = depot({ fiche: false });
  assert.deepEqual(validateState(actif("CLOSING"), racine), []);
  for (const activite of ["EXPECTATION", "REQUEST", "BUILD", "EVIDENCE", "VERIFY"]) {
    assert.match(validateState(actif(activite), racine)[0], /introuvable/, activite);
  }
  assert.match(validateState(actif("CLOSING", { active_brief: "src/auth/login.ts" }), racine)[0], /docs\/projects\//);
  assert.match(validateState(actif("CLOSING", { active_brief: "docs/projects/model-brief.md" }), racine)[0], /modèle/);
});

test("clôture : fiche supprimée selon la recette, retour en SCOPING accepté ; contexte et rappel le disent", async () => {
  const racine = depot({ state: actif("CLOSING"), fiche: false });
  const lu = readState(racine);
  assert.deepEqual(lu.problems, []);
  const ctx = context(lu, racine);
  assert.match(ctx, /fiche supprimée/);
  assert.doesNotMatch(ctx, /Périmètre autorisé|invalide/);
  assert.match(shortReminder(lu, racine), /fiche supprimée/);
  assert.doesNotMatch(shortReminder(lu, racine), /invalide|périmètre/);
  const r = await move(racine, { to: "SCOPING" }, { tty: false, now: MAINTENANT });
  assert.equal(r.code, 0, r.message);
  assert.doesNotMatch(r.message, /invalide/);
  assert.equal(readState(racine).state.activity, "SCOPING");
});

test("transitions : une activité à la fois, retours vers BUILD, abandon vers SCOPING", () => {
  assert.equal(transitionAllowed("SCOPING", "EXPECTATION"), true);
  assert.equal(transitionAllowed("SCOPING", "BUILD"), false, "pas de saut en avant");
  assert.equal(transitionAllowed("VERIFY", "BUILD"), true, "retour après échec");
  assert.equal(transitionAllowed("EVIDENCE", "BUILD"), true);
  assert.equal(transitionAllowed("VERIFY", "CLOSING"), true);
  assert.equal(transitionAllowed("CLOSING", "SCOPING"), true);
  for (const a of ACTIVITIES) if (a !== "SCOPING") assert.equal(transitionAllowed(a, "SCOPING"), true, `abandon depuis ${a}`);
  assert.equal(transitionAllowed("BUILD", "BUILD"), false);
  assert.equal(transitionAllowed("INCONNUE", "SCOPING"), false);
});

test("sept activités : matrice complète des transitions, une table de cas", () => {
  const permises = {
    SCOPING: ["EXPECTATION"],
    EXPECTATION: ["REQUEST", "SCOPING"],
    REQUEST: ["BUILD", "SCOPING"],
    BUILD: ["EVIDENCE", "SCOPING"],
    EVIDENCE: ["VERIFY", "BUILD", "SCOPING"],
    VERIFY: ["CLOSING", "BUILD", "SCOPING"],
    CLOSING: ["SCOPING"],
  };
  assert.deepEqual([...ACTIVITIES], Object.keys(permises));
  for (const de of ACTIVITIES)
    for (const vers of ACTIVITIES) assert.equal(transitionAllowed(de, vers), permises[de].includes(vers), `${de} → ${vers}`);
});

test("sept activités : parcours réel par move, un saut refusé laisse l'état inchangé", async () => {
  const racine = depot({ config: { transitions: "agent" } });
  const activite = () => readState(racine).state.activity;
  const etapes = [
    ["EXPECTATION", { brief: FICHE }],
    ["REQUEST", {}],
    ["BUILD", {}],
    ["EVIDENCE", {}],
    ["VERIFY", {}],
  ];
  for (const [vers, opts] of etapes) {
    const r = await move(racine, { to: vers, ...opts }, { tty: false, now: MAINTENANT });
    assert.equal(r.code, 0, `${vers} : ${r.message}`);
    assert.equal(activite(), vers);
  }
  let r = await move(racine, { to: "CLOSING" }, { tty: false, now: MAINTENANT });
  assert.equal(r.code, 1, "CLOSING refusé sans évidence de verify");
  assert.equal(activite(), "VERIFY");
  r = await move(racine, { to: "EXPECTATION" }, { tty: false, now: MAINTENANT });
  assert.equal(r.code, 1);
  assert.equal(activite(), "VERIFY");
  r = await move(racine, { to: "BUILD" }, { tty: false, now: MAINTENANT });
  assert.equal(r.code, 0, "retour en BUILD après un échec");
  assert.equal(activite(), "BUILD");
});

test("contexte : SCOPING interdit la réalisation", () => {
  const racine = depot();
  const texte = context(readState(racine), racine);
  assert.match(texte, /Activité : SCOPING/);
  assert.match(texte, /aucune attente active/);
  assert.match(texte, /aucun fichier de code/);
});

test("contexte : BUILD rappelle la fiche, son titre et son périmètre", () => {
  const racine = depot({ state: actif("BUILD") });
  const texte = context(readState(racine), racine);
  assert.match(texte, /Activité : BUILD/);
  assert.match(texte, /docs\/projects\/exemple\.md — Projet : Exemple/);
  assert.match(texte, /- src\/auth\/login\.ts/);
  assert.match(texte, /- tests\/auth\/login\.test\.ts/);
});

test("contexte : un état invalide est signalé, pas masqué", () => {
  const racine = depot({ state: actif("CODAGE") });
  const texte = context(readState(racine), racine);
  assert.match(texte, /état invalide/i);
  assert.match(texte, /activité inconnue/);
});

test("contexte en anglais selon .drwil/ia-first.json", () => {
  const racine = depot({ lang: "en" });
  assert.match(context(readState(racine), racine), /Activity: SCOPING/);
});

test("QUA-036 : rappel CLOSING : boucler les intentions (limites en intentions, intention d'origine mise à jour ou close), en anglais aussi", () => {
  const fr = context(readState(depot({ state: actif("CLOSING") })), depot({ state: actif("CLOSING") }));
  assert.match(fr, /chaque limite non traitée devient une fiche d'intention \(jamais une fiche de chantier\)/);
  assert.match(fr, /l'intention d'origine \(champ Intention de la fiche\) est mise à jour, ou résumée au journal et retirée/);
  const racine = depot({ state: actif("CLOSING"), lang: "en" });
  assert.match(context(readState(racine), racine), /each limit left untreated becomes an intent brief \(never a workstream brief\)/);
});

test("QUA-036 : champ Intention et date de revue : la plus récente compte (Statut, Revu le, Existant daté)", () => {
  assert.equal(briefIntent("# P\n\n**Intention** : `docs/intentions/a.md`\n"), "docs/intentions/a.md");
  assert.equal(briefIntent("# P\n\n**Intent**: `docs/intentions/b.md`\n"), "docs/intentions/b.md");
  assert.equal(briefIntent("# P\n\nIntention : a.md\n"), null);
  const texte = [
    "**Statut** : proposée le 2026-09-01.",
    "",
    "**Revu le 2026-09-20** : ce qui a changé.",
    "",
    "## Existant (vérifié le 2026-09-10)",
  ].join("\n");
  assert.equal(lastReview(texte), "2026-09-20");
  assert.equal(lastReview("**Status** (2026-08-02): to scope.\n\n## Current state (checked on 2026-08-05)\n"), "2026-08-05");
  assert.equal(lastReview("**Statut** : proposée le AAAA-MM-JJ.\n"), null);
});

test("QUA-036 : intentions sans revue depuis 30 jours signalées, les plus anciennes d'abord ; README et intention non datée ignorés", () => {
  const racine = depot();
  mkdirSync(join(racine, "docs", "intentions"), { recursive: true });
  const ecrire = (f, statut) => writeFileSync(join(racine, "docs", "intentions", f), `# I\n\n**Statut** : ${statut}\n`);
  ecrire("ancienne.md", "proposée le 2026-08-01.");
  ecrire("vieille.md", "proposée le 2026-09-01.");
  ecrire("recente.md", "proposée le 2026-10-01.");
  ecrire("README.md", "proposée le 2020-01-01.");
  ecrire("sans-date.md", "proposée.");
  const maintenant = new Date("2026-10-16T00:00:00Z").getTime();
  assert.deepEqual(staleIntents(racine, {}, maintenant), [
    { file: "docs/intentions/ancienne.md", days: 76 },
    { file: "docs/intentions/vieille.md", days: 45 },
  ]);
  assert.deepEqual(staleIntents(racine, { dirs: { intentions: "idees" } }, maintenant), [], "dossier réglé absent");
});

test("QUA-036 : au commit, une fiche supprimée sans que son intention soit touchée est signalée ; touchée ou absente, rien", () => {
  const racine = depot();
  const git = (...args) => spawnSync("git", ["-c", "user.name=t", "-c", "user.email=t@t", ...args], { cwd: racine, encoding: "utf8" });
  mkdirSync(join(racine, "docs", "intentions"), { recursive: true });
  writeFileSync(join(racine, "docs", "intentions", "origine.md"), "# Intention\n");
  writeFileSync(join(racine, FICHE), `${readFileSync(join(racine, FICHE), "utf8")}\n**Intention** : \`docs/intentions/origine.md\`\n`);
  git("init", "-q");
  git("add", "-A");
  git("commit", "-qm", "base");
  git("rm", "-q", FICHE);
  assert.deepEqual(intentsLeftBehind(racine, [FICHE]), [{ brief: FICHE, intent: "docs/intentions/origine.md" }]);
  assert.deepEqual(intentsLeftBehind(racine, [FICHE, "docs/intentions/origine.md"]), [], "intention mise à jour dans le même commit");
  git("rm", "-q", "docs/intentions/origine.md");
  assert.deepEqual(intentsLeftBehind(racine, [FICHE, "docs/intentions/origine.md"]), [], "intention retirée dans le même commit");
  assert.deepEqual(intentsLeftBehind(tmp("drwil-hors-git-"), []), [], "hors dépôt git : rien");
});

const MAINTENANT = "2026-10-09T12:00:00Z";
const neutre = () => ({ state: { ...NEUTRAL_STATE }, source: "missing", problems: [] });

test("préparer : ouvrir une attente exige une fiche existante", () => {
  const racine = depot();
  assert.deepEqual(prepareTransition(neutre(), "EXPECTATION", { brief: FICHE, now: MAINTENANT }, racine).state, {
    version: 1,
    activity: "EXPECTATION",
    active_brief: FICHE,
    active_request: null,
    since: MAINTENANT,
  });
  assert.match(prepareTransition(neutre(), "EXPECTATION", { now: MAINTENANT }, racine).error, /--brief/);
  assert.match(
    prepareTransition(neutre(), "EXPECTATION", { brief: "docs/projects/absente.md", now: MAINTENANT }, racine).error,
    /introuvable/,
  );
});

test("préparer : transition interdite refusée, --brief réservé à l'ouverture, abandon vers le neutre", () => {
  const racine = depot();
  assert.match(prepareTransition(neutre(), "BUILD", { now: MAINTENANT }, racine).error, /SCOPING → BUILD.*interdite/);
  const enCours = { state: actif("BUILD"), source: "file", problems: [] };
  assert.match(prepareTransition(enCours, "EVIDENCE", { brief: FICHE, now: MAINTENANT }, racine).error, /--brief/);
  const suite = prepareTransition(enCours, "EVIDENCE", { request: "Lot 2", now: MAINTENANT }, racine).state;
  assert.equal(suite.active_brief, FICHE, "l'attente suit");
  assert.equal(suite.active_request, "Lot 2");
  assert.deepEqual(prepareTransition(enCours, "SCOPING", { now: MAINTENANT }, racine).state, { ...NEUTRAL_STATE, since: MAINTENANT });
});

test("humain requis (mode humain) : ouvrir et lancer la réalisation, pas clore ; rien en mode agent", () => {
  assert.equal(requiresHuman("SCOPING", "EXPECTATION", "human"), true);
  assert.equal(requiresHuman("REQUEST", "BUILD", "human"), true);
  assert.equal(requiresHuman("VERIFY", "CLOSING", "human"), false, "clore retire des droits : libre sur évidence valide");
  assert.equal(requiresHuman("BUILD", "EVIDENCE", "human"), false);
  assert.equal(requiresHuman("VERIFY", "BUILD", "human"), false, "retour sur la même attente");
  assert.equal(requiresHuman("BUILD", "SCOPING", "human"), false, "l'abandon resserre les droits");
  for (const [de, vers] of [
    ["SCOPING", "EXPECTATION"],
    ["REQUEST", "BUILD"],
    ["VERIFY", "CLOSING"],
  ])
    assert.equal(requiresHuman(de, vers, "agent"), false);
});

test("passer (mode humain par défaut) : refus sans terminal interactif, état inchangé", async () => {
  const racine = depot();
  const r = await move(racine, { to: "EXPECTATION", brief: FICHE }, { tty: false, now: MAINTENANT });
  assert.equal(r.code, 1);
  assert.match(r.message, /terminal interactif/);
  assert.equal(readState(racine).source, "missing");
});

test("passer : avec un humain qui confirme, l'état est écrit ; sans confirmation, rien", async () => {
  const racine = depot();
  const refus = await move(racine, { to: "EXPECTATION", brief: FICHE }, { tty: true, confirm: async () => false, now: MAINTENANT });
  assert.equal(refus.code, 1);
  assert.equal(readState(racine).source, "missing");
  let question = "";
  const ok = await move(
    racine,
    { to: "EXPECTATION", brief: FICHE },
    {
      tty: true,
      confirm: async (q) => {
        question = q;
        return true;
      },
      now: MAINTENANT,
    },
  );
  assert.equal(ok.code, 0, ok.message);
  assert.match(question, /EXPECTATION/);
  assert.equal(readState(racine).state.activity, "EXPECTATION");
  // Transition libre ensuite : pas de terminal requis.
  assert.equal((await move(racine, { to: "REQUEST", request: "Lot 2" }, { tty: false, now: MAINTENANT })).code, 0);
  assert.equal(readState(racine).state.active_request, "Lot 2");
});

test("passer (mode agent) : toute transition permise est libre ; une interdite reste refusée", async () => {
  const racine = depot({ config: { transitions: "agent" } });
  assert.equal((await move(racine, { to: "EXPECTATION", brief: FICHE }, { tty: false, now: MAINTENANT })).code, 0);
  const saut = await move(racine, { to: "VERIFY" }, { tty: false, now: MAINTENANT });
  assert.equal(saut.code, 1);
  assert.match(saut.message, /interdite/);
});

test("passer : depuis un état invalide, on repart du neutre (signalé)", async () => {
  const racine = depot({ state: "{ cassé", config: { transitions: "agent" } });
  const r = await move(racine, { to: "EXPECTATION", brief: FICHE }, { tty: false, now: MAINTENANT });
  assert.equal(r.code, 0, r.message);
  assert.match(r.message, /invalide/);
  assert.equal(readState(racine).state.activity, "EXPECTATION");
});

test("contexte : indique la commande de transition", () => {
  const racine = depot();
  assert.match(context(readState(racine), racine), /node \.githooks\/state\.mjs move/);
});

// Dépôt git commité, prêt à clore : l'évidence est jugée contre HEAD.
function depotEnVerify(config, ajoutFiche = "") {
  const racine = depot({ state: actif("VERIFY"), config });
  if (ajoutFiche) writeFileSync(join(racine, FICHE), readFileSync(join(racine, FICHE), "utf8") + ajoutFiche);
  writeFileSync(join(racine, ".gitignore"), ".drwil/state.json\n.drwil/evidence/\n");
  const git = (...args) => spawnSync("git", ["-c", "user.name=t", "-c", "user.email=t@t", ...args], { cwd: racine, encoding: "utf8" });
  git("init", "-q");
  git("add", "-A");
  git("commit", "-qm", "init");
  const head = git("rev-parse", "HEAD").stdout.trim();
  const evidence = (nom, contenu) => {
    mkdirSync(join(racine, ".drwil", "evidence"), { recursive: true });
    writeFileSync(
      join(racine, ".drwil", "evidence", nom),
      typeof contenu === "string" ? contenu : JSON.stringify({ version: 1, commit: head, dirtyWorktree: false, ...contenu }),
    );
  };
  return { racine, evidence };
}

test("clôture : sans évidence de verify, refusée avant toute question à l'humain", async () => {
  const { racine } = depotEnVerify();
  let demande = false;
  const r = await move(racine, { to: "CLOSING" }, { tty: true, confirm: async () => (demande = true), now: MAINTENANT });
  assert.equal(r.code, 1);
  assert.match(r.message, /aucune évidence.*drwil verify --evidence/);
  assert.equal(demande, false);
  assert.equal(readState(racine).state.activity, "VERIFY");
});

test("clôture : PASS ou ATTESTED sur HEAD, arbre propre, autorise sans geste humain", async () => {
  for (const status of ["pass", "attested"]) {
    const { racine, evidence } = depotEnVerify();
    evidence("verify-2026-10-09T10-00-00-000Z.json", { status });
    assert.deepEqual(verifyEvidence(racine), { ok: true });
    const r = await move(racine, { to: "CLOSING" }, { tty: false, now: MAINTENANT });
    assert.equal(r.code, 0, r.message);
    assert.equal(readState(racine).state.activity, "CLOSING");
  }
});

test("QUA-021 : clôture : sans critères, refusée si newRequirements l'impose ; avertie sinon, en anglais aussi", async () => {
  const exige = depotEnVerify({ newRequirements: "blocking" });
  exige.evidence("verify-2026-10-09T10-00-00-000Z.json", { status: "pass" });
  const refus = await move(exige.racine, { to: "CLOSING" }, { tty: false, now: MAINTENANT });
  assert.equal(refus.code, 1);
  assert.match(refus.message, /^clôture refusée : la fiche « docs\/projects\/exemple\.md » n'a aucun critère d'acceptation/);
  assert.equal(readState(exige.racine).state.activity, "VERIFY");
  const anglais = depotEnVerify({ lang: "en" });
  anglais.evidence("verify-2026-10-09T10-00-00-000Z.json", { status: "pass" });
  const averti = await move(anglais.racine, { to: "CLOSING" }, { tty: false, now: MAINTENANT });
  assert.equal(averti.code, 0, averti.message);
  assert.match(averti.message, /warning: brief "docs\/projects\/exemple\.md" has no acceptance criterion/);
});

test("QUA-021 : missingCriteria : aucune fiche active, fiche absente ou avec critères, entretien courant : rien à signaler", () => {
  const { racine } = depotCadre({ newRequirements: "blocking" });
  assert.equal(missingCriteria(racine, null), null);
  assert.equal(missingCriteria(racine, "docs/projects/absente.md"), null);
  assert.equal(missingCriteria(racine, "docs/projects/routine-maintenance.md"), null);
  assert.equal(missingCriteria(racine, FICHE), "blocking");
  writeFileSync(join(racine, FICHE), "# Exemple\n\n## Critères d'acceptation\n\n- Un critère — `QUA-001`\n");
  assert.equal(missingCriteria(racine, FICHE), null);
});

test("QUA-021 : lancement : sans critères, refusé si newRequirements l'impose, averti sinon ; l'entretien courant en est exempt", () => {
  const exige = depotCadre({ newRequirements: "blocking" }).racine;
  const refus = start(exige, FICHE, { human: true, now: MAINTENANT });
  assert.equal(refus.code, 1);
  assert.match(refus.message, /^lancement refusé : la fiche « docs\/projects\/exemple\.md » n'a aucun critère d'acceptation/);
  assert.equal(readState(exige).source, "missing", "rien n'est écrit");
  const averti = start(depotCadre().racine, FICHE, { human: true, now: MAINTENANT });
  assert.equal(averti.code, 0);
  assert.match(averti.message, /\navertissement : la fiche « docs\/projects\/exemple\.md » n'a aucun critère/);
  const anglais = start(depotCadre({ lang: "en", newRequirements: "blocking" }).racine, FICHE, { human: true });
  assert.match(anglais.message, /^start refused: brief "docs\/projects\/exemple\.md" has no acceptance criterion/);

  const routine = depotCadre({ newRequirements: "blocking" });
  // Comme la vraie fiche d'entretien courant : permanente, sans statut ni critères.
  writeFileSync(
    join(routine.racine, "docs", "projects", "routine-maintenance.md"),
    "# Entretien courant\n\n<!-- scope\nfiles:\n  - src/z.ts\n-->\n",
  );
  routine.git("add", "-A");
  routine.git("commit", "-qm", "routine");
  const r = start(routine.racine, "docs/projects/routine-maintenance.md", { human: true });
  assert.equal(r.code, 0, r.message);
  assert.doesNotMatch(r.message, /critère/);
});

test("QUA-021 : clôture : une fiche sans critères d'acceptation est avertie, la clôture passe ; avec critères, aucun avertissement", async () => {
  const sans = depotEnVerify();
  sans.evidence("verify-2026-10-09T10-00-00-000Z.json", { status: "pass" });
  const averti = await move(sans.racine, { to: "CLOSING" }, { tty: false, now: MAINTENANT });
  assert.equal(averti.code, 0, averti.message);
  assert.match(averti.message, /avertissement.*exemple\.md.*aucun critère d'acceptation/);
  assert.equal(readState(sans.racine).state.activity, "CLOSING");

  const avec = depotEnVerify(undefined, "\n## Critères d'acceptation\n\n- Un export vide est refusé — `CTR-012`\n");
  avec.evidence("verify-2026-10-09T10-00-00-000Z.json", { status: "pass", criteria: [] });
  const r = await move(avec.racine, { to: "CLOSING" }, { tty: false, now: MAINTENANT });
  assert.equal(r.code, 0, r.message);
  assert.doesNotMatch(r.message, /critère/);
});

test("clôture : FAIL et ERROR renvoient en BUILD, MANUAL à l'attestation humaine", () => {
  const attendus = { fail: /FAIL.*move BUILD/, error: /ERROR.*move BUILD/, manual: /MANUAL.*drwil attest/ };
  for (const [status, motif] of Object.entries(attendus)) {
    const { racine, evidence } = depotEnVerify();
    evidence("verify-2026-10-09T10-00-00-000Z.json", { status });
    const p = verifyEvidence(racine);
    assert.equal(p.ok, false);
    assert.match(p.reason, motif);
  }
});

test("clôture : un critère d'acceptation non prouvé est refusé, nommé ; tous prouvés, ou sans critères, acceptés", () => {
  const nom = "verify-2026-10-09T10-00-00-000Z.json";
  const critere = (text, status) => ({ text, link: "CTR-012", human: false, status, proof: null });
  const refuse = (criteria) => {
    const { racine, evidence } = depotEnVerify();
    evidence(nom, { status: "pass", criteria });
    return verifyEvidence(racine);
  };
  const sansPreuve = refuse([critere("Un export vide est refusé", "pass"), critere("Le total est exact", "no-proof")]);
  assert.equal(sansPreuve.ok, false);
  assert.match(sansPreuve.reason, /« Le total est exact » \(no-proof\)/);
  assert.doesNotMatch(sansPreuve.reason, /export vide/);
  for (const status of ["unknown-proof", "not-durable", "not-pass"]) assert.equal(refuse([critere("C", status)]).ok, false, status);
  assert.deepEqual(refuse([critere("Un export vide est refusé", "pass")]), { ok: true });
  const { racine: r2, evidence: e2 } = depotEnVerify();
  e2(nom, { status: "pass", criteria: [], undeclared: ["QUA-001"] });
  assert.match(verifyEvidence(r2).reason, /modifié\(s\) sans déclaration : QUA-001.*Contrats modifiés/);
  e2(nom, { status: "pass", criteria: [], undeclared: [] });
  assert.deepEqual(verifyEvidence(r2), { ok: true });
  assert.deepEqual(refuse([]), { ok: true });
  const { racine, evidence } = depotEnVerify();
  evidence(nom, { status: "attested" });
  assert.deepEqual(verifyEvidence(racine), { ok: true });
});

test("clôture : seule la dernière évidence compte", () => {
  const { racine, evidence } = depotEnVerify();
  evidence("verify-2026-10-09T10-00-00-000Z.json", { status: "pass" });
  evidence("verify-2026-10-09T11-00-00-000Z.json", { status: "fail" });
  assert.match(verifyEvidence(racine).reason, /FAIL/);
});

test("clôture : évidence d'un autre commit, d'un arbre modifié ou illisible, refusée", () => {
  const autre = depotEnVerify();
  autre.evidence("verify-a.json", { status: "pass", commit: "0".repeat(40) });
  assert.match(verifyEvidence(autre.racine).reason, /autre commit/);

  const sale = depotEnVerify();
  sale.evidence("verify-a.json", { status: "pass", dirtyWorktree: true });
  assert.match(verifyEvidence(sale.racine).reason, /arbre modifié/);

  // Modifié après verify : ce qui serait clos n'est pas ce qui a été vérifié.
  const apres = depotEnVerify();
  apres.evidence("verify-a.json", { status: "pass" });
  writeFileSync(join(apres.racine, FICHE), readFileSync(join(apres.racine, FICHE), "utf8") + "\nmodifié\n");
  assert.match(verifyEvidence(apres.racine).reason, /arbre modifié/);

  const casse = depotEnVerify();
  casse.evidence("verify-a.json", "{ cassé");
  assert.match(verifyEvidence(casse.racine).reason, /illisible/);
});

test("clôture : la preuve est exigée aussi en mode agent", async () => {
  const { racine } = depotEnVerify({ transitions: "agent" });
  const r = await move(racine, { to: "CLOSING" }, { tty: false, now: MAINTENANT });
  assert.equal(r.code, 1);
  assert.match(r.message, /clôture refusée/);
});

test("clôture : hors dépôt git, refusée", () => {
  const racine = depot({ state: actif("VERIFY") });
  mkdirSync(join(racine, ".drwil", "evidence"));
  writeFileSync(join(racine, ".drwil", "evidence", "verify-a.json"), JSON.stringify({ status: "pass", commit: "x", dirtyWorktree: false }));
  assert.match(verifyEvidence(racine).reason, /HEAD introuvable/);
});

test("scopeGate: off : contexte réduit à « gouvernance désactivée », même avec un état actif", () => {
  for (const [lang, motif] of [
    ["fr", /Gouvernance désactivée/],
    ["en", /Governance disabled/],
  ]) {
    const racine = depot({ state: actif("BUILD"), config: { scopeGate: "off", lang } });
    const texte = context(readState(racine), racine);
    assert.match(texte, motif);
    assert.doesNotMatch(texte, /BUILD|cadrage/);
  }
});

test("messages : commandes drwil complètes (npx), jamais « drwil » seul", () => {
  const { racine } = depotEnVerify();
  assert.match(verifyEvidence(racine).reason, /`npx drwil verify --evidence`/);
  assert.match(context(readState(racine), racine), /`npx drwil verify --evidence`/);
});

test("rappel court : activité, fiche et taille du périmètre en deux lignes ; état invalide signalé", () => {
  const racine = depot({ state: actif("BUILD") });
  const texte = shortReminder(readState(racine), racine);
  assert.equal(texte.split("\n").length, 2);
  assert.match(texte, /BUILD · docs\/projects\/exemple\.md · périmètre : 2 fichier/);
  assert.match(texte, /Règle : réaliser l'attente/);
  const neutre = depot();
  assert.match(shortReminder(readState(neutre), neutre), /SCOPING · aucune attente active/);
  const casse = depot({ state: "{ cassé" });
  assert.match(shortReminder(readState(casse), casse), /état invalide/);
});

test("rappel court : rien quand la gouvernance est désactivée (scopeGate: off)", () => {
  const racine = depot({ state: actif("BUILD"), config: { scopeGate: "off" } });
  assert.equal(shortReminder(readState(racine), racine), null);
  assert.equal(reminderIfChanged(racine), null);
});

test("rappel seulement si l'état a changé ; empreinte illisible : rappel injecté", async () => {
  const racine = depot({ config: { transitions: "agent" } });
  assert.match(reminderIfChanged(racine), /SCOPING/);
  assert.equal(reminderIfChanged(racine), null, "inchangé : rien");
  assert.equal((await move(racine, { to: "EXPECTATION", brief: FICHE }, { tty: false, now: MAINTENANT })).code, 0);
  assert.match(reminderIfChanged(racine), /EXPECTATION/, "changé : rappel");
  writeFileSync(join(racine, ".drwil", "reminder.json"), "{ cassé");
  assert.match(reminderIfChanged(racine), /EXPECTATION/, "jamais masqué");
});

// Dépôt git dont la fiche exemple (bloc cadrage) est commitée : une fiche cadrée.
function depotCadre(config) {
  const racine = depot({ config });
  const git = (...args) => spawnSync("git", ["-c", "user.name=t", "-c", "user.email=t@t", ...args], { cwd: racine, encoding: "utf8" });
  writeFileSync(join(racine, ".gitignore"), ".drwil/\n");
  writeFileSync(join(racine, "docs", "projects", "sans-cadrage.md"), "# Sans cadrage\n");
  writeFileSync(
    join(racine, "docs", "projects", "finie.md"),
    "# Finie\n\n**Statut** : terminé le 2026-10-01.\n\n<!-- scope\nfiles:\n  - src/x.ts\n-->\n",
  );
  writeFileSync(
    join(racine, "docs", "projects", "reference.md"),
    "# Référence\n\n**Statut** : référence — mécanique du kit.\n\n<!-- scope\nfiles:\n  - src/r.ts\n-->\n",
  );
  writeFileSync(join(racine, "docs", "projects", "modele-fiche-projet.md"), "# Modèle\n\n<!-- scope\nfiles:\n  - src/y.ts\n-->\n");
  git("init", "-q");
  git("add", "-A");
  git("commit", "-qm", "init");
  return { racine, git };
}

test("fiche terminée : seul le marqueur explicite compte ; référence reconnue", () => {
  assert.equal(briefStatus("# F\n\n**Statut** : terminé le 2026-10-10.\n"), "done");
  assert.equal(briefStatus("# F\n\n**Status**: done on 2026-10-10.\n"), "done");
  assert.equal(briefStatus("# F\n\n**Statut** : référence — mécanique du kit.\n"), "reference");
  assert.equal(briefStatus("# F\n\n**Status**: reference — kit mechanics.\n"), "reference");
  for (const statut of [
    "cadré le 2026-10-06 — lots 1 à 4 livrés, essai réel fait.",
    "fait (lot 1) le 2026-10-05.",
    "terminé, sans date.",
  ]) {
    assert.equal(briefStatus(`# F\n\n**Statut** : ${statut}\n`), "open", statut);
  }
  assert.equal(briefStatus("# F\n\nSans statut.\n"), "open");
});

test("clôture : retour en SCOPING refusé si la fiche terminée est encore là", async () => {
  const racine = depot({ state: actif("CLOSING"), fiche: false });
  writeFileSync(join(racine, FICHE), "# Projet : Exemple\n\n**Statut** : terminé le 2026-10-10.\n");
  const refus = await move(racine, { to: "SCOPING" }, { tty: false, now: MAINTENANT });
  assert.equal(refus.code, 1);
  assert.match(refus.message, /terminée.*journal/);
  assert.equal(readState(racine).state.activity, "CLOSING");
  // Lots encore ouverts : la fiche reste, le retour passe.
  writeFileSync(join(racine, FICHE), "# Projet : Exemple\n\n**Statut** : cadré — lot 1 fait, lot 2 ouvert.\n");
  assert.equal((await move(racine, { to: "SCOPING" }, { tty: false, now: MAINTENANT })).code, 0);
});

test("QUA-023 : contrats modifiés : ID en tête de chaque puce de la section, autres sections ignorées, fiche en anglais", () => {
  const fiche = [
    "## Critères d'acceptation",
    "- Un export vide est refusé — `QUA-009`",
    "## 4. Contrats modifiés",
    "",
    "- `QUA-012` — ancien critère : « strict » — raison : assoupli",
    "  suite de la raison, `QUA-099` cité sans être déclaré",
    "- sans ID en tête — `QUA-098`",
    "- `QUA-013` — raison : précisé",
    "## Reprise",
    "- `QUA-014` hors section",
  ].join("\n");
  assert.deepEqual(declaredContracts(fiche), ["QUA-012", "QUA-013"]);
  assert.deepEqual(declaredContracts("## Modified contracts\n\n- `SEC-001` — reason: widened\n"), ["SEC-001"]);
  assert.deepEqual(declaredContracts("# Sans section\n- `QUA-001`\n"), []);
});

test("critères d'acceptation : liste structurée (lien, humain), ignore les autres sections, fiche en anglais", () => {
  const fr = [
    "# Projet",
    "",
    "## Critères d'acceptation",
    "",
    "(consigne, pas un critère)",
    "",
    "- Un export vide est refusé — `CTR-012`",
    "- Le libellé est clair [humain] — `MAN-003`",
    "- Un critère sans preuve",
    "",
    "## 2. Hors périmètre",
    "",
    "- Pas un critère `CTR-999`",
  ].join("\n");
  assert.deepEqual(acceptanceCriteria(fr), [
    { text: "Un export vide est refusé", link: "CTR-012", human: false },
    { text: "Le libellé est clair", link: "MAN-003", human: true },
    { text: "Un critère sans preuve", link: null, human: false },
  ]);
  const en = "## Acceptance criteria\n\n- Export is checked [human]\n- Totals match — `QUA-001`\n\n## 2. Out of scope\n";
  assert.deepEqual(acceptanceCriteria(en), [
    { text: "Export is checked", link: null, human: true },
    { text: "Totals match", link: "QUA-001", human: false },
  ]);
  assert.deepEqual(acceptanceCriteria("# Sans section\n\n- rien\n"), []);
  // Critère sur plusieurs lignes : la preuve est en fin de puce ; du code cité avant n'en est pas une.
  const plusieursLignes = [
    "## Critères d'acceptation",
    "- Un `init` neuf fournit un contrat",
    "  d'exemple — `QUA-024`",
    "- Second critère",
    "",
    "  paragraphe après une ligne vide, pas une suite",
    "Texte collé, pas une suite non plus `QUA-999`",
  ].join("\n");
  assert.deepEqual(acceptanceCriteria(plusieursLignes), [
    { text: "Un init neuf fournit un contrat d'exemple", link: "QUA-024", human: false },
    { text: "Second critère", link: null, human: false },
  ]);
});

test("maturité : champ explicite lu dans l'en-tête (FR et EN), absent ou inconnu = non renseignée", () => {
  const f = (ligne) => `# F\n\n**Statut** : cadré.\n${ligne}\n`;
  assert.equal(briefMaturity(f("**Maturité** : prêt")), "ready");
  assert.equal(briefMaturity(f("**Maturité** : à affiner — points ouverts")), "refine");
  assert.equal(briefMaturity(f("**Maturité** : en cours")), "in-progress");
  assert.equal(briefMaturity(f("**Maturity**: ready")), "ready");
  assert.equal(briefMaturity(f("**Maturity**: to refine")), "refine");
  assert.equal(briefMaturity(f("**Maturity**: in progress")), "in-progress");
  assert.equal(briefMaturity(f("**Maturité** : PRÊT")), "ready");
  assert.equal(briefMaturity(f("**Maturité** : bientôt")), "unset");
  assert.equal(briefMaturity("# F\n\n**Statut** : cadré.\n"), "unset");
  assert.equal(briefMaturity(`# F\n${"\n".repeat(20)}**Maturité** : prêt\n`), "unset");
});

test("fiches cadrées : prêtes d'abord, puis priorité de l'index ([P2] sans tag) ; décisions ouvertes comptées", () => {
  const { racine, git } = depotCadre();
  const fiche = (titre, points) =>
    `# ${titre}\n\n**Statut** : cadré le 2026-10-10.\n\n<!-- scope\nfiles:\n  - src/${titre}.ts\n-->\n\n## 5. Points à trancher\n\n${points}\n\n## 6. Lots\n\n- [décision] hors section, non compté.\n`;
  writeFileSync(
    join(racine, "docs", "projects", "bloquee.md"),
    fiche("bloquee", "- [décision] Choisir A ou B ?\n- ~~Tranché~~ — voir Décisions."),
  );
  writeFileSync(join(racine, "docs", "projects", "sans-tag.md"), fiche("sans-tag", "- ~~Tranché~~ — voir Décisions."));
  writeFileSync(
    join(racine, "docs", "projects", "anglaise.md"),
    "# anglaise\n\n**Status**: scoped on 2026-10-10.\n\n<!-- scope\nfiles:\n  - src/en.ts\n-->\n\n## 5. Points to decide\n\n- [decision] A or B?\n- [decision] C or D?\n",
  );
  writeFileSync(
    join(racine, "docs", "projects", "pending.md"),
    [
      "# Index",
      "",
      "Priorité : `[P0]` le plus urgent.",
      "",
      `- [ ] [IA] [P3] Exemple — \`${FICHE}\`.`,
      "- [ ] [décision] [P1] Bloquée —",
      "  `docs/projects/bloquee.md`.",
      "- [x] [IA] [P0] point fait d'une fiche ouverte — `docs/projects/sans-tag.md`.",
      "- [ ] [IA] Sans tag — `docs/projects/sans-tag.md`.",
      "- [ ] [IA] [P1] Anglaise — `docs/projects/anglaise.md`.",
      "",
    ].join("\n"),
  );
  git("add", "-A");
  git("commit", "-qm", "fiches");
  const fiches = scopedBriefs(racine);
  assert.deepEqual(
    fiches.map((f) => [f.path, f.priority, f.decisions, f.ready]),
    [
      ["docs/projects/sans-tag.md", "P2", 0, true],
      [FICHE, "P3", 0, true],
      ["docs/projects/anglaise.md", "P1", 2, false],
      ["docs/projects/bloquee.md", "P1", 1, false],
    ],
  );
});

test("fiches cadrées : à maturité égale la priorité décide ; « à affiner » classée en dernier mais jamais masquée", () => {
  const { racine, git } = depotCadre();
  const fiche = (nom, maturite) =>
    `# ${nom}\n\n**Statut** : cadré le 2026-10-10.\n${maturite}\n\n<!-- scope\nfiles:\n  - src/${nom}.ts\n-->\n\n## 5. Points à trancher\n\n(aucun.)\n`;
  writeFileSync(join(racine, "docs", "projects", "aa-affiner.md"), fiche("aa-affiner", "**Maturité** : à affiner"));
  writeFileSync(join(racine, "docs", "projects", "zz-pret.md"), fiche("zz-pret", "**Maturité** : prêt"));
  writeFileSync(join(racine, "docs", "projects", "mm-cours.md"), fiche("mm-cours", "**Maturité** : en cours"));
  git("add", "-A");
  git("commit", "-qm", "maturité");
  assert.deepEqual(
    scopedBriefs(racine).map((f) => [f.path, f.maturity]),
    [
      ["docs/projects/zz-pret.md", "ready"],
      [FICHE, "unset"],
      ["docs/projects/mm-cours.md", "in-progress"],
      ["docs/projects/aa-affiner.md", "refine"],
    ],
  );
});

test("fusion autorisée : seulement par un lancement humain, gardée jusqu'à CLOSING, effacée en SCOPING", () => {
  const { racine } = depotCadre({ transitions: "agent" });
  assert.equal(start(racine, FICHE, { autoMerge: true }).code, 0);
  assert.equal(readState(racine).state.auto_merge, undefined, "un lancement par l'agent n'autorise jamais la fusion");
  assert.doesNotMatch(context(readState(racine), racine), /fusion automatique/i);
  rmSync(join(racine, ".drwil", "state.json"));
  assert.equal(start(racine, FICHE, { human: true, autoMerge: true }).code, 0);
  let lu = readState(racine);
  assert.deepEqual(lu.problems, []);
  assert.equal(lu.state.auto_merge, true);
  assert.match(context(lu, racine), /fusion automatique autorisée/i);
  // Ordre sûr (PR #29 : fusion refusée, retour en SCOPING quand même, autorisation perdue) : la PR
  // calculée et à jour, la fusion programmée puis vérifiée, et seulement ensuite le retour en SCOPING.
  assert.match(
    context(lu, racine),
    /mergeStateStatus.*BEHIND.*gh pr merge --auto --merge.*autoMergeRequest.*seulement ensuite revenir en SCOPING.*rester en CLOSING/s,
  );
  writeFileSync(join(racine, ".drwil", "ia-first.json"), JSON.stringify({ transitions: "agent", lang: "en" }));
  assert.match(
    context(lu, racine),
    /mergeStateStatus.*BEHIND.*gh pr merge --auto --merge.*autoMergeRequest.*only then go back to SCOPING.*stay in CLOSING/s,
  );
  for (const vers of ["EVIDENCE", "VERIFY"]) {
    const r = prepareTransition(lu, vers, { now: MAINTENANT }, racine);
    assert.equal(r.state.auto_merge, true, vers);
    lu = { ...lu, state: r.state };
  }
  assert.equal(
    prepareTransition({ ...lu, state: { ...lu.state, activity: "CLOSING" } }, "SCOPING", { now: MAINTENANT }, racine).state.auto_merge,
    undefined,
  );
});

test("validation : auto_merge booléenne, jamais vraie en SCOPING", () => {
  const racine = depot();
  assert.match(validateState(actif("BUILD", { auto_merge: "oui" }), racine)[0], /auto_merge/);
  assert.match(validateState({ ...NEUTRAL_STATE, auto_merge: true }, racine)[0], /auto_merge/);
  assert.deepEqual(validateState(actif("CLOSING", { auto_merge: true }), racine), []);
});

test("fiches cadrées : sans dossier de fiches, aucune", () => {
  assert.deepEqual(scopedBriefs(tmp("drwil-etat-vide-")), []);
});

test("fiches cadrées : bloc cadrage commité, non terminée, hors modèles", () => {
  const { racine } = depotCadre();
  assert.deepEqual(
    scopedBriefs(racine).map((f) => f.path),
    [FICHE],
  );
  assert.equal(scopedBriefs(racine)[0].title, "Projet : Exemple");
  // Un cadrage seulement dans l'arbre de travail ne compte pas : c'est le cadrage commité qui est validé.
  writeFileSync(join(racine, "docs", "projects", "sans-cadrage.md"), "# Sans cadrage\n\n<!-- scope\nfiles:\n  - src/z.ts\n-->\n");
  assert.deepEqual(
    scopedBriefs(racine).map((f) => f.path),
    [FICHE],
  );
});

test("lancer : un geste humain passe directement en BUILD ; refusé à l'agent en mode humain", () => {
  const { racine } = depotCadre();
  const agent = start(racine, FICHE, { now: MAINTENANT });
  assert.equal(agent.code, 1);
  assert.match(agent.message, /décision humaine/);
  assert.equal(readState(racine).source, "missing");
  const ok = start(racine, FICHE, { human: true, now: MAINTENANT });
  assert.equal(ok.code, 0, ok.message);
  assert.deepEqual(readState(racine).state, {
    version: 1,
    activity: "BUILD",
    active_brief: FICHE,
    active_request: null,
    since: MAINTENANT,
  });
  assert.match(start(racine, FICHE, { human: true }).message, /activité BUILD/, "pas de relance en pleine réalisation");
});

test("lancer : fiche non cadrée, terminée ou modèle refusée ; mode agent libre", () => {
  const { racine } = depotCadre();
  for (const f of ["docs/projects/sans-cadrage.md", "docs/projects/finie.md", "docs/projects/model-brief.md", "docs/projects/absente.md"]) {
    assert.match(start(racine, f, { human: true }).message, /n'est pas une fiche cadrée/, f);
  }
  const agent = depotCadre({ transitions: "agent" }).racine;
  assert.equal(start(agent, FICHE).code, 0);
});

// L'enfant relance ces mêmes fichiers : sans garde, il se relancerait sans fin.
test("variables GIT_* du lanceur (commit -a, worktree) : les tests n'agissent jamais sur le dépôt qui les lance", {
  skip: process.env.DRWIL_TESTS_ENFANT === "1",
}, () => {
  const victime = tmp("drwil-etat-victime-");
  assert.equal(spawnSync("git", ["init", "-q", victime]).status, 0);
  const config = readFileSync(join(victime, ".git", "config"), "utf8");
  const ici = dirname(fileURLToPath(import.meta.url));
  // NODE_TEST_CONTEXT, posé par node --test pour ses enfants : hérité, l'enfant ne lançait aucun test.
  const { NODE_TEST_CONTEXT, ...env } = process.env;
  const r = spawnSync(process.execPath, ["--test", join(ici, "state.test.mjs"), join(ici, "scope-gate.test.mjs")], {
    encoding: "utf8",
    env: { ...env, DRWIL_TESTS_ENFANT: "1", GIT_DIR: join(victime, ".git"), GIT_INDEX_FILE: join(victime, ".git", "index-du-hook") },
  });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.notEqual(
    spawnSync("git", ["rev-parse", "--verify", "-q", "HEAD"], { cwd: victime }).status,
    0,
    "un test a commité dans le dépôt lanceur",
  );
  assert.equal(readFileSync(join(victime, ".git", "config"), "utf8"), config, "un test a modifié la config du dépôt lanceur");
});

// --- Commande `node .githooks/state.mjs` (principal) et cas limites ---

/** Exécute `fn` en capturant console.log et console.error. */
async function capturer(fn) {
  const sortie = [];
  const erreurs = [];
  const { log, error } = console;
  console.log = (...m) => sortie.push(m.join(" "));
  console.error = (...m) => erreurs.push(m.join(" "));
  try {
    const code = await fn();
    return { code, sortie: sortie.join("\n"), erreurs: erreurs.join("\n") };
  } finally {
    Object.assign(console, { log, error });
  }
}

/**
 * Simule un terminal interactif : chaque invite (écriture se terminant par « : ») reçoit la
 * réponse suivante. Rend aussi les invites vues.
 */
async function avecTerminal(reponses, fn) {
  const entree = new PassThrough();
  entree.isTTY = true;
  const descripteur = Object.getOwnPropertyDescriptor(process, "stdin");
  Object.defineProperty(process, "stdin", { value: entree, configurable: true });
  const { isTTY } = process.stdout;
  const ecrire = process.stdout.write;
  const invites = [];
  process.stdout.isTTY = true;
  process.stdout.write = (morceau, ...reste) => {
    const texte = String(morceau);
    if (/: $/.test(texte)) {
      invites.push(texte);
      setImmediate(() => entree.write(`${reponses.shift() ?? ""}\n`));
      return true;
    }
    return ecrire.call(process.stdout, morceau, ...reste);
  };
  try {
    return { ...(await fn()), invites };
  } finally {
    process.stdout.write = ecrire;
    process.stdout.isTTY = isTTY;
    Object.defineProperty(process, "stdin", descripteur);
  }
}

test("principal fiches : liste lisible, JSON, ou aucune fiche", async () => {
  const { racine } = depotCadre();
  let r = await capturer(() => main(["briefs"], racine));
  assert.equal(r.code, 0);
  assert.equal(r.sortie, `1. ${FICHE} — Projet : Exemple`);
  r = await capturer(() => main(["briefs", "--json"], racine));
  assert.equal(JSON.parse(r.sortie)[0].path, FICHE);
  r = await capturer(() => main(["briefs"], depot()));
  assert.match(r.sortie, /^\(aucune fiche cadrée/);
  r = await capturer(() => main(["briefs"], depot({ lang: "en" })));
  assert.match(r.sortie, /^\(no scoped brief/, "ligne de commande en anglais");
});

test("principal lancer sans terminal : refusé en mode humain, lancé en mode agent (avec --request)", async () => {
  const humain = depotCadre().racine;
  let r = await capturer(() => main(["start", FICHE], humain));
  assert.equal(r.code, 1);
  assert.match(r.erreurs, /^✗ lancement refusé : c'est une décision humaine/);
  const agent = depotCadre({ transitions: "agent" }).racine;
  r = await capturer(() => main(["start", FICHE, "--request", "faire X"], agent));
  assert.equal(r.code, 0, r.erreurs);
  // La fiche d'exemple n'a pas de critère : lancée avec un avertissement (newRequirements non imposé, QUA-021).
  assert.match(
    r.sortie,
    /^✓ SCOPING → BUILD \(lancé : docs\/projects\/exemple\.md\)\navertissement : la fiche « docs\/projects\/exemple\.md » n'a aucun critère[^\n]*\n\n\[drwil\] État de gouvernance/,
  );
  assert.equal(readState(agent).state.active_request, "faire X");
  // --request sans valeur : ignoré.
  const autre = depotCadre({ transitions: "agent" }).racine;
  await capturer(() => main(["start", FICHE, "--request"], autre));
  assert.equal(readState(autre).state.active_request, null);
});

test("principal lancer au terminal : l'humain choisit, confirme et décide de la fusion", async () => {
  const { racine, git } = depotCadre();
  writeFileSync(
    join(racine, "docs", "projects", "bloquee.md"),
    "# Bloquée\n\n**Statut** : cadré le 2026-10-10.\n**Maturité** : à affiner\n\n<!-- scope\nfiles:\n  - src/b.ts\n-->\n\n## Points à trancher\n\n- [décision] A ou B ?\n",
  );
  git("add", "-A");
  git("commit", "-qm", "bloquee");
  const r = await avecTerminal(["1", "START", "MERGE"], () => capturer(() => main(["start"], racine)));
  assert.equal(r.code, 0, r.erreurs);
  assert.match(
    r.sortie,
    /^1\. docs\/projects\/exemple\.md — Projet : Exemple \[P2\]\n2\. docs\/projects\/bloquee\.md — Bloquée \[P2 · non prête : 1 décision\(s\) à trancher · à affiner : à revoir avant de la lancer\]/,
  );
  assert.deepEqual(r.invites.length, 3);
  assert.equal(readState(racine).state.auto_merge, true);
});

test("principal lancer au terminal : sans confirmation exacte ou numéro inconnu, rien ne change", async () => {
  const { racine } = depotCadre();
  let r = await avecTerminal(["oui"], () => capturer(() => main(["start", FICHE], racine)));
  assert.equal(r.code, 1);
  assert.equal(r.erreurs, "✗ lancement non confirmé : état inchangé");
  r = await avecTerminal(["9"], () => capturer(() => main(["start"], racine)));
  assert.equal(r.code, 1);
  assert.equal(r.invites.length, 1);
  r = await avecTerminal(["START", ""], () => capturer(() => main(["start", FICHE], racine)));
  assert.equal(r.code, 0, r.erreurs);
  assert.equal(readState(racine).state.auto_merge, undefined);
});

test("principal rappel : affiché seulement quand l'état change", async () => {
  const racine = depot();
  assert.match((await capturer(() => main(["reminder"], racine))).sortie, /^\[drwil\] Rappel/);
  assert.equal((await capturer(() => main(["reminder"], racine))).sortie, "");
});

test("principal rappel et lecture : une racine inutilisable ne casse jamais la session", async () => {
  assert.deepEqual(await capturer(() => main(["reminder"], null)), { code: 0, sortie: "", erreurs: "" });
  const r = await capturer(() => main([], null));
  assert.equal(r.code, 0);
  assert.match(r.sortie, /^\[drwil\] état de gouvernance illisible : /);
});

test("rappel court en anglais, fiche active", () => {
  const racine = depot({ state: actif("BUILD"), lang: "en" });
  assert.match(shortReminder(readState(racine), racine), /^\[drwil\] Reminder: BUILD · docs\/projects\/exemple\.md · scope: 2 file\(s\)/);
  const neutre = depot({ lang: "en" });
  assert.match(shortReminder(readState(neutre), neutre), /^\[drwil\] Reminder: SCOPING · no active brief \(read again/);
});

test("principal lecture : contexte ou JSON", async () => {
  const racine = depot({ state: actif("BUILD") });
  assert.match((await capturer(() => main([], racine))).sortie, /^\[drwil\] État de gouvernance/);
  assert.equal(JSON.parse((await capturer(() => main(["--json"], racine))).sortie).state.activity, "BUILD");
});

test("principal passer : usage sans activité, transition écrite ou refusée, confirmation au terminal", async () => {
  const racine = depot({ config: { transitions: "agent" } });
  for (const args of [["move"], ["move", "--brief"]]) {
    const r = await capturer(() => main(args, racine));
    assert.equal(r.code, 2);
    assert.match(r.erreurs, /^usage : node \.githooks\/state\.mjs move </);
  }
  let r = await capturer(() => main(["move", "EXPECTATION", "--brief", FICHE, "--request", "d"], racine));
  assert.equal(r.code, 0, r.erreurs);
  assert.match(r.sortie, /^✓ /);
  r = await capturer(() => main(["move", "CLOSING"], racine));
  assert.equal(r.code, 1);
  assert.match(r.erreurs, /^✗ /);
  const humain = depot();
  r = await avecTerminal(["EXPECTATION"], () => capturer(() => main(["move", "EXPECTATION", "--brief", FICHE], humain)));
  assert.equal(r.code, 0, r.erreurs);
  assert.equal(readState(humain).state.activity, "EXPECTATION");
});

test("ligne de commande : node state.mjs lit l'état du dossier courant", () => {
  const racine = depot();
  const r = spawnSync(process.execPath, [fileURLToPath(new URL("./state.mjs", import.meta.url))], { cwd: racine, encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /Activité : SCOPING/);
});

test("cas limites : attente non textuelle, verdict inconnu, configuration « null »", () => {
  assert.deepEqual(validateState(actif("BUILD", { active_brief: 5 }), depot()), ["active_brief : chemin de fiche ou null attendu"]);
  const { racine, evidence } = depotEnVerify();
  evidence("verify-2026-10-09T10-00-00-000Z.json", { status: "bizarre" });
  assert.match(verifyEvidence(racine).reason, /sans verdict reconnu/);
  const nulle = depot();
  writeFileSync(join(nulle, ".drwil", "ia-first.json"), "null");
  assert.match(context(readState(nulle), nulle), /Activité : SCOPING/);
});

test("fiche active sans titre, ou illisible (un dossier) : contexte et rappel tiennent", () => {
  const sansTitre = depot({ state: actif("BUILD"), fiche: false });
  writeFileSync(join(sansTitre, FICHE), "**Statut** : cadré le 2026-10-09.\n");
  assert.match(context(readState(sansTitre), sansTitre), /Attente active : docs\/projects\/exemple\.md\n/);
  const dossier = depot({ state: actif("BUILD"), fiche: false });
  mkdirSync(join(dossier, FICHE));
  assert.match(context(readState(dossier), dossier), /\(aucun bloc scope/);
  assert.match(shortReminder(readState(dossier), dossier), /périmètre : 0 fichier/);
});

test("rappel : empreinte impossible à écrire, le rappel est quand même rendu", () => {
  const racine = depot();
  mkdirSync(join(racine, ".drwil", "reminder.json"));
  assert.match(reminderIfChanged(racine), /^\[drwil\] Rappel/);
});

test("fiches cadrées : index réglé, fiche sans titre ; lancer sans fiche ou avec une demande invalide", () => {
  const { racine, git } = depotCadre({ dirs: { index: "suivi/index.md" }, transitions: "agent" });
  mkdirSync(join(racine, "suivi"));
  writeFileSync(join(racine, "suivi", "index.md"), "- [ ] [IA] [P0] `docs/projects/sans-titre.md`\n");
  writeFileSync(
    join(racine, "docs", "projects", "sans-titre.md"),
    "**Statut** : cadré le 2026-10-10.\n\n<!-- scope\nfiles:\n  - src/t.ts\n-->\n",
  );
  git("add", "-A");
  git("commit", "-qm", "index");
  const sansTitre = scopedBriefs(racine).find((f) => f.path === "docs/projects/sans-titre.md");
  assert.deepEqual([sansTitre.title, sansTitre.priority], ["docs/projects/sans-titre.md", "P0"]);
  assert.match(start(racine, undefined).message, /« undefined » n'est pas une fiche cadrée/);
  assert.match(start(racine, FICHE, { request: 5 }).message, /^lancement refusé : active_request : chaîne ou null attendu/);
});

/** Un dépôt avec trois fiches cadrées : a et b prêtes (maturité, critères), c sans critère. */
function depotFile(config = {}) {
  const racine = depot({ fiche: false, config });
  const fiche = (nom, pret) =>
    writeFileSync(
      join(racine, "docs", "projects", `${nom}.md`),
      `# Projet : ${nom}\n\n**Statut** : cadré le 2026-10-16.\n${pret ? "**Maturité** : prêt\n" : ""}\n<!-- scope\nfiles:\n  - src/${nom}.ts\n-->\n\n${pret ? `## Critères d'acceptation\n\n- Critère ${nom} — \`QUA-001\`\n` : ""}`,
    );
  fiche("a", true);
  fiche("b", true);
  fiche("c", false);
  writeFileSync(join(racine, ".gitignore"), ".drwil/\n");
  const git = (...args) => spawnSync("git", ["-c", "user.name=t", "-c", "user.email=t@t", ...args], { cwd: racine, encoding: "utf8" });
  git("init", "-q");
  git("add", "-A");
  git("commit", "-qm", "init");
  return racine;
}
const [A, B, C] = ["a", "b", "c"].map((n) => `docs/projects/${n}.md`);
const ecrireEtat = (racine, etat) => writeFileSync(join(racine, ".drwil", "state.json"), JSON.stringify(etat));

test("QUA-037 : un geste humain enregistre une file de fiches prêtes et la fusion ; une fiche non prête la refuse entière", () => {
  const racine = depotFile();
  const r = start(racine, A, { human: true, autoMerge: true, queue: [B] });
  assert.equal(r.code, 0, r.message);
  assert.match(r.message, /file : ensuite docs\/projects\/b\.md/);
  assert.deepEqual(readState(racine).state.queue, [B]);
  assert.equal(readState(racine).state.queue_merge, true);
  const refus = depotFile();
  assert.match(start(refus, A, { human: true, queue: [C] }).message, /« docs\/projects\/c\.md » ne peut pas entrer dans une file/);
  assert.equal(readState(refus).source, "missing", "rien n'est écrit");
  assert.equal(start(depotFile(), C, { human: true }).code, 0, "sans file, une fiche non prête se lance comme avant");
});

test("QUA-037 : après clôture la file reste, l'agent lance seul sa tête avec la fusion ; hors file ou hors SCOPING, refusé", () => {
  const racine = depotFile();
  ecrireEtat(racine, {
    version: 1,
    activity: "CLOSING",
    active_brief: C,
    active_request: null,
    since: null,
    auto_merge: true,
    queue: [B, A],
    queue_merge: true,
  });
  const p = prepareTransition(readState(racine), "SCOPING", { now: MAINTENANT }, racine);
  assert.deepEqual(p.state, { ...NEUTRAL_STATE, since: MAINTENANT, queue: [B, A], queue_merge: true });
  ecrireEtat(racine, p.state);
  assert.match(start(racine, C).message, /décision humaine/, "fiche hors file");
  const r = start(racine, B, { now: MAINTENANT });
  assert.equal(r.code, 0, r.message);
  assert.deepEqual(readState(racine).state, {
    version: 1,
    activity: "BUILD",
    active_brief: B,
    active_request: null,
    since: MAINTENANT,
    auto_merge: true,
    queue: [A],
    queue_merge: true,
  });
  assert.match(start(racine, B).message, /activité BUILD/, "pas de relance en pleine réalisation");
  const abandon = depotFile();
  ecrireEtat(abandon, {
    version: 1,
    activity: "BUILD",
    active_brief: A,
    active_request: null,
    since: null,
    queue: [B],
    queue_merge: false,
  });
  assert.equal(
    prepareTransition(readState(abandon), "SCOPING", { now: MAINTENANT }, abandon).state.queue,
    undefined,
    "abandon : file perdue",
  );
});

test("QUA-037 : arrêter la file ; commandes next et queue stop ; contexte et état invalide, en anglais aussi", async () => {
  const racine = depotFile();
  ecrireEtat(racine, { version: 1, activity: "BUILD", active_brief: A, active_request: null, since: null, queue: [B], queue_merge: true });
  assert.match(context(readState(racine), racine), /File décidée au lancement : ensuite docs\/projects\/b\.md \(fusion automatique\)/);
  let r = await capturer(() => main(["queue", "stop"], racine));
  assert.equal(r.code, 0);
  assert.match(r.sortie, /file arrêtée : docs\/projects\/b\.md ne seront pas lancés/);
  assert.equal(readState(racine).state.queue, undefined);
  assert.match(stopQueue(racine).message, /aucune file en cours/);
  const suivante = depotFile();
  ecrireEtat(suivante, { version: 1, activity: "SCOPING", active_brief: null, active_request: null, since: null, queue: [A] });
  r = await capturer(() => main(["next"], suivante));
  assert.equal(r.code, 0, r.sortie);
  assert.equal(readState(suivante).state.active_brief, A);
  r = await capturer(() => main(["next"], depotFile()));
  assert.equal(r.code, 1, "sans file, rien à lancer");
  const anglais = depotFile({ lang: "en" });
  ecrireEtat(anglais, { version: 1, activity: "BUILD", active_brief: A, active_request: null, since: null, queue: [B] });
  assert.match(context(readState(anglais), anglais), /Queue decided at start: then docs\/projects\/b\.md\. After/);
  assert.match(
    start(depotFile({ lang: "en" }), A, { human: true, queue: [C] }).message,
    /^start refused: "docs\/projects\/c\.md" cannot enter a queue/,
  );
  assert.deepEqual(validateState({ ...NEUTRAL_STATE, queue: "x", queue_merge: 1 }, anglais), [
    "queue: list of briefs expected",
    "queue_merge: boolean expected",
  ]);
  assert.match(validateState({ ...NEUTRAL_STATE, queue: ["docs/projects/absente.md"] }, racine).join(), /absente\.md/);
});
