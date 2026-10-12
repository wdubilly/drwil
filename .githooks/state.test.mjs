import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { PassThrough } from "node:stream";
import {
  ACTIVITES,
  ETAT_NEUTRE,
  contexte,
  principal,
  exigeHumain,
  lireEtat,
  passer,
  preparerTransition,
  preuveVerify,
  fichesCadrees,
  lancer,
  rappelCourt,
  rappelSiChange,
  statutFiche,
  transitionAutorisee,
  validerEtat,
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

function depot({ etat, fiche = true, lang, config } = {}) {
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
  const lu = lireEtat(depot());
  assert.equal(lu.source, "absent");
  assert.deepEqual(lu.etat, ETAT_NEUTRE);
  assert.deepEqual(lu.problemes, []);
});

test("état actif valide : activité et attente lues depuis le disque", () => {
  const lu = lireEtat(depot({ etat: actif("BUILD") }));
  assert.equal(lu.source, "fichier");
  assert.deepEqual(lu.problemes, []);
  assert.equal(lu.etat.activity, "BUILD");
  assert.equal(lu.etat.active_brief, FICHE);
});

test("JSON illisible : état invalide, ramené au neutre, problème signalé", () => {
  const lu = lireEtat(depot({ etat: "{ pas du json" }));
  assert.equal(lu.source, "fichier");
  assert.deepEqual(lu.etat, ETAT_NEUTRE);
  assert.match(lu.problemes[0], /illisible/);
});

test("validation : activité inconnue, champ inconnu, version absente", () => {
  const racine = depot();
  assert.match(validerEtat({ ...actif("CODAGE") }, racine)[0], /activité inconnue/);
  // Le périmètre vit dans la fiche versionnée, jamais dans l'état local.
  assert.match(validerEtat({ ...actif("BUILD"), perimetre_actif: ["src/"] }, racine)[0], /champ inconnu « perimetre_actif »/);
  const { version, ...sansVersion } = actif("BUILD");
  assert.match(validerEtat(sansVersion, racine)[0], /version/);
  assert.match(validerEtat([], racine)[0], /objet/);
});

test("validation : SCOPING sans attente ni demande, les autres activités exigent une attente", () => {
  const racine = depot();
  assert.deepEqual(validerEtat(ETAT_NEUTRE, racine), []);
  assert.match(validerEtat(actif("SCOPING"), racine)[0], /SCOPING.*aucune attente/);
  assert.match(validerEtat({ ...actif("BUILD"), active_brief: null }, racine)[0], /attente active requise/);
});

test("validation : l'attente active est une fiche existante de docs/projects/, hors modèle", () => {
  const racine = depot();
  assert.match(validerEtat(actif("BUILD", { active_brief: "docs/projects/absente.md" }), racine)[0], /introuvable/);
  assert.match(validerEtat(actif("BUILD", { active_brief: "src/auth/login.ts" }), racine)[0], /docs\/projects\//);
  assert.match(validerEtat(actif("BUILD", { active_brief: "docs/projects/../../etc/passwd.md" }), racine)[0], /docs\/projects\//);
  assert.match(validerEtat(actif("BUILD", { active_brief: "docs/projects/model-brief.md" }), racine)[0], /modèle/);
});

test("validation : active_request et depuis bien typés", () => {
  const racine = depot();
  assert.match(validerEtat(actif("REQUEST", { active_request: 42 }), racine)[0], /active_request/);
  assert.match(validerEtat(actif("REQUEST", { since: "hier" }), racine)[0], /since/);
  assert.deepEqual(validerEtat(actif("REQUEST", { active_request: "Lot 1" }), racine), []);
});

test("clôture : fiche déjà supprimée tolérée en CLOSING seulement, les autres règles de l'attente restent", () => {
  const racine = depot({ fiche: false });
  assert.deepEqual(validerEtat(actif("CLOSING"), racine), []);
  for (const activite of ["EXPECTATION", "REQUEST", "BUILD", "EVIDENCE", "VERIFY"]) {
    assert.match(validerEtat(actif(activite), racine)[0], /introuvable/, activite);
  }
  assert.match(validerEtat(actif("CLOSING", { active_brief: "src/auth/login.ts" }), racine)[0], /docs\/projects\//);
  assert.match(validerEtat(actif("CLOSING", { active_brief: "docs/projects/model-brief.md" }), racine)[0], /modèle/);
});

test("clôture : fiche supprimée selon la recette, retour en SCOPING accepté ; contexte et rappel le disent", async () => {
  const racine = depot({ etat: actif("CLOSING"), fiche: false });
  const lu = lireEtat(racine);
  assert.deepEqual(lu.problemes, []);
  const ctx = contexte(lu, racine);
  assert.match(ctx, /fiche supprimée/);
  assert.doesNotMatch(ctx, /Périmètre autorisé|invalide/);
  assert.match(rappelCourt(lu, racine), /fiche supprimée/);
  assert.doesNotMatch(rappelCourt(lu, racine), /invalide|périmètre/);
  const r = await passer(racine, { vers: "SCOPING" }, { tty: false, maintenant: MAINTENANT });
  assert.equal(r.code, 0, r.message);
  assert.doesNotMatch(r.message, /invalide/);
  assert.equal(lireEtat(racine).etat.activity, "SCOPING");
});

test("transitions : une activité à la fois, retours vers BUILD, abandon vers SCOPING", () => {
  assert.equal(transitionAutorisee("SCOPING", "EXPECTATION"), true);
  assert.equal(transitionAutorisee("SCOPING", "BUILD"), false, "pas de saut en avant");
  assert.equal(transitionAutorisee("VERIFY", "BUILD"), true, "retour après échec");
  assert.equal(transitionAutorisee("EVIDENCE", "BUILD"), true);
  assert.equal(transitionAutorisee("VERIFY", "CLOSING"), true);
  assert.equal(transitionAutorisee("CLOSING", "SCOPING"), true);
  for (const a of ACTIVITES) if (a !== "SCOPING") assert.equal(transitionAutorisee(a, "SCOPING"), true, `abandon depuis ${a}`);
  assert.equal(transitionAutorisee("BUILD", "BUILD"), false);
  assert.equal(transitionAutorisee("INCONNUE", "SCOPING"), false);
});

test("contexte : SCOPING interdit la réalisation", () => {
  const racine = depot();
  const texte = contexte(lireEtat(racine), racine);
  assert.match(texte, /Activité : SCOPING/);
  assert.match(texte, /aucune attente active/);
  assert.match(texte, /aucun fichier de code/);
});

test("contexte : BUILD rappelle la fiche, son titre et son périmètre", () => {
  const racine = depot({ etat: actif("BUILD") });
  const texte = contexte(lireEtat(racine), racine);
  assert.match(texte, /Activité : BUILD/);
  assert.match(texte, /docs\/projects\/exemple\.md — Projet : Exemple/);
  assert.match(texte, /- src\/auth\/login\.ts/);
  assert.match(texte, /- tests\/auth\/login\.test\.ts/);
});

test("contexte : un état invalide est signalé, pas masqué", () => {
  const racine = depot({ etat: actif("CODAGE") });
  const texte = contexte(lireEtat(racine), racine);
  assert.match(texte, /état invalide/i);
  assert.match(texte, /activité inconnue/);
});

test("contexte en anglais selon .drwil/ia-first.json", () => {
  const racine = depot({ lang: "en" });
  assert.match(contexte(lireEtat(racine), racine), /Activity: SCOPING/);
});

const MAINTENANT = "2026-10-09T12:00:00Z";
const neutre = () => ({ etat: { ...ETAT_NEUTRE }, source: "absent", problemes: [] });

test("préparer : ouvrir une attente exige une fiche existante", () => {
  const racine = depot();
  assert.deepEqual(preparerTransition(neutre(), "EXPECTATION", { fiche: FICHE, maintenant: MAINTENANT }, racine).etat, {
    version: 1,
    activity: "EXPECTATION",
    active_brief: FICHE,
    active_request: null,
    since: MAINTENANT,
  });
  assert.match(preparerTransition(neutre(), "EXPECTATION", { maintenant: MAINTENANT }, racine).erreur, /--fiche/);
  assert.match(
    preparerTransition(neutre(), "EXPECTATION", { fiche: "docs/projects/absente.md", maintenant: MAINTENANT }, racine).erreur,
    /introuvable/,
  );
});

test("préparer : transition interdite refusée, --fiche réservé à l'ouverture, abandon vers le neutre", () => {
  const racine = depot();
  assert.match(preparerTransition(neutre(), "BUILD", { maintenant: MAINTENANT }, racine).erreur, /SCOPING → BUILD.*interdite/);
  const enCours = { etat: actif("BUILD"), source: "fichier", problemes: [] };
  assert.match(preparerTransition(enCours, "EVIDENCE", { fiche: FICHE, maintenant: MAINTENANT }, racine).erreur, /--fiche/);
  const suite = preparerTransition(enCours, "EVIDENCE", { demande: "Lot 2", maintenant: MAINTENANT }, racine).etat;
  assert.equal(suite.active_brief, FICHE, "l'attente suit");
  assert.equal(suite.active_request, "Lot 2");
  assert.deepEqual(preparerTransition(enCours, "SCOPING", { maintenant: MAINTENANT }, racine).etat, { ...ETAT_NEUTRE, since: MAINTENANT });
});

test("humain requis (mode humain) : ouvrir et lancer la réalisation, pas clore ; rien en mode agent", () => {
  assert.equal(exigeHumain("SCOPING", "EXPECTATION", "human"), true);
  assert.equal(exigeHumain("REQUEST", "BUILD", "human"), true);
  assert.equal(exigeHumain("VERIFY", "CLOSING", "human"), false, "clore retire des droits : libre sur évidence valide");
  assert.equal(exigeHumain("BUILD", "EVIDENCE", "human"), false);
  assert.equal(exigeHumain("VERIFY", "BUILD", "human"), false, "retour sur la même attente");
  assert.equal(exigeHumain("BUILD", "SCOPING", "human"), false, "l'abandon resserre les droits");
  for (const [de, vers] of [
    ["SCOPING", "EXPECTATION"],
    ["REQUEST", "BUILD"],
    ["VERIFY", "CLOSING"],
  ])
    assert.equal(exigeHumain(de, vers, "agent"), false);
});

test("passer (mode humain par défaut) : refus sans terminal interactif, état inchangé", async () => {
  const racine = depot();
  const r = await passer(racine, { vers: "EXPECTATION", fiche: FICHE }, { tty: false, maintenant: MAINTENANT });
  assert.equal(r.code, 1);
  assert.match(r.message, /terminal interactif/);
  assert.equal(lireEtat(racine).source, "absent");
});

test("passer : avec un humain qui confirme, l'état est écrit ; sans confirmation, rien", async () => {
  const racine = depot();
  const refus = await passer(
    racine,
    { vers: "EXPECTATION", fiche: FICHE },
    { tty: true, confirmer: async () => false, maintenant: MAINTENANT },
  );
  assert.equal(refus.code, 1);
  assert.equal(lireEtat(racine).source, "absent");
  let question = "";
  const ok = await passer(
    racine,
    { vers: "EXPECTATION", fiche: FICHE },
    {
      tty: true,
      confirmer: async (q) => {
        question = q;
        return true;
      },
      maintenant: MAINTENANT,
    },
  );
  assert.equal(ok.code, 0, ok.message);
  assert.match(question, /EXPECTATION/);
  assert.equal(lireEtat(racine).etat.activity, "EXPECTATION");
  // Transition libre ensuite : pas de terminal requis.
  assert.equal((await passer(racine, { vers: "REQUEST", demande: "Lot 2" }, { tty: false, maintenant: MAINTENANT })).code, 0);
  assert.equal(lireEtat(racine).etat.active_request, "Lot 2");
});

test("passer (mode agent) : toute transition permise est libre ; une interdite reste refusée", async () => {
  const racine = depot({ config: { transitions: "agent" } });
  assert.equal((await passer(racine, { vers: "EXPECTATION", fiche: FICHE }, { tty: false, maintenant: MAINTENANT })).code, 0);
  const saut = await passer(racine, { vers: "VERIFY" }, { tty: false, maintenant: MAINTENANT });
  assert.equal(saut.code, 1);
  assert.match(saut.message, /interdite/);
});

test("passer : depuis un état invalide, on repart du neutre (signalé)", async () => {
  const racine = depot({ etat: "{ cassé", config: { transitions: "agent" } });
  const r = await passer(racine, { vers: "EXPECTATION", fiche: FICHE }, { tty: false, maintenant: MAINTENANT });
  assert.equal(r.code, 0, r.message);
  assert.match(r.message, /invalide/);
  assert.equal(lireEtat(racine).etat.activity, "EXPECTATION");
});

test("contexte : indique la commande de transition", () => {
  const racine = depot();
  assert.match(contexte(lireEtat(racine), racine), /node \.githooks\/state\.mjs move/);
});

// Dépôt git commité, prêt à clore : l'évidence est jugée contre HEAD.
function depotEnVerify(config) {
  const racine = depot({ etat: actif("VERIFY"), config });
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
  const r = await passer(racine, { vers: "CLOSING" }, { tty: true, confirmer: async () => (demande = true), maintenant: MAINTENANT });
  assert.equal(r.code, 1);
  assert.match(r.message, /aucune évidence.*drwil verify --evidence/);
  assert.equal(demande, false);
  assert.equal(lireEtat(racine).etat.activity, "VERIFY");
});

test("clôture : PASS ou ATTESTED sur HEAD, arbre propre, autorise sans geste humain", async () => {
  for (const status of ["pass", "attested"]) {
    const { racine, evidence } = depotEnVerify();
    evidence("verify-2026-10-09T10-00-00-000Z.json", { status });
    assert.deepEqual(preuveVerify(racine), { ok: true });
    const r = await passer(racine, { vers: "CLOSING" }, { tty: false, maintenant: MAINTENANT });
    assert.equal(r.code, 0, r.message);
    assert.equal(lireEtat(racine).etat.activity, "CLOSING");
  }
});

test("clôture : FAIL et ERROR renvoient en BUILD, MANUAL à l'attestation humaine", () => {
  const attendus = { fail: /FAIL.*move BUILD/, error: /ERROR.*move BUILD/, manual: /MANUAL.*drwil attest/ };
  for (const [status, motif] of Object.entries(attendus)) {
    const { racine, evidence } = depotEnVerify();
    evidence("verify-2026-10-09T10-00-00-000Z.json", { status });
    const p = preuveVerify(racine);
    assert.equal(p.ok, false);
    assert.match(p.raison, motif);
  }
});

test("clôture : seule la dernière évidence compte", () => {
  const { racine, evidence } = depotEnVerify();
  evidence("verify-2026-10-09T10-00-00-000Z.json", { status: "pass" });
  evidence("verify-2026-10-09T11-00-00-000Z.json", { status: "fail" });
  assert.match(preuveVerify(racine).raison, /FAIL/);
});

test("clôture : évidence d'un autre commit, d'un arbre modifié ou illisible, refusée", () => {
  const autre = depotEnVerify();
  autre.evidence("verify-a.json", { status: "pass", commit: "0".repeat(40) });
  assert.match(preuveVerify(autre.racine).raison, /autre commit/);

  const sale = depotEnVerify();
  sale.evidence("verify-a.json", { status: "pass", dirtyWorktree: true });
  assert.match(preuveVerify(sale.racine).raison, /arbre modifié/);

  // Modifié après verify : ce qui serait clos n'est pas ce qui a été vérifié.
  const apres = depotEnVerify();
  apres.evidence("verify-a.json", { status: "pass" });
  writeFileSync(join(apres.racine, FICHE), readFileSync(join(apres.racine, FICHE), "utf8") + "\nmodifié\n");
  assert.match(preuveVerify(apres.racine).raison, /arbre modifié/);

  const casse = depotEnVerify();
  casse.evidence("verify-a.json", "{ cassé");
  assert.match(preuveVerify(casse.racine).raison, /illisible/);
});

test("clôture : la preuve est exigée aussi en mode agent", async () => {
  const { racine } = depotEnVerify({ transitions: "agent" });
  const r = await passer(racine, { vers: "CLOSING" }, { tty: false, maintenant: MAINTENANT });
  assert.equal(r.code, 1);
  assert.match(r.message, /clôture refusée/);
});

test("clôture : hors dépôt git, refusée", () => {
  const racine = depot({ etat: actif("VERIFY") });
  mkdirSync(join(racine, ".drwil", "evidence"));
  writeFileSync(join(racine, ".drwil", "evidence", "verify-a.json"), JSON.stringify({ status: "pass", commit: "x", dirtyWorktree: false }));
  assert.match(preuveVerify(racine).raison, /HEAD introuvable/);
});

test("scopeGate: off : contexte réduit à « gouvernance désactivée », même avec un état actif", () => {
  for (const [lang, motif] of [
    ["fr", /Gouvernance désactivée/],
    ["en", /Governance disabled/],
  ]) {
    const racine = depot({ etat: actif("BUILD"), config: { scopeGate: "off", lang } });
    const texte = contexte(lireEtat(racine), racine);
    assert.match(texte, motif);
    assert.doesNotMatch(texte, /BUILD|cadrage/);
  }
});

test("messages : commandes drwil complètes (npx), jamais « drwil » seul", () => {
  const { racine } = depotEnVerify();
  assert.match(preuveVerify(racine).raison, /`npx drwil verify --evidence`/);
  assert.match(contexte(lireEtat(racine), racine), /`npx drwil verify --evidence`/);
});

test("rappel court : activité, fiche et taille du périmètre en deux lignes ; état invalide signalé", () => {
  const racine = depot({ etat: actif("BUILD") });
  const texte = rappelCourt(lireEtat(racine), racine);
  assert.equal(texte.split("\n").length, 2);
  assert.match(texte, /BUILD · docs\/projects\/exemple\.md · périmètre : 2 fichier/);
  assert.match(texte, /Règle : réaliser l'attente/);
  const neutre = depot();
  assert.match(rappelCourt(lireEtat(neutre), neutre), /SCOPING · aucune attente active/);
  const casse = depot({ etat: "{ cassé" });
  assert.match(rappelCourt(lireEtat(casse), casse), /état invalide/);
});

test("rappel court : rien quand la gouvernance est désactivée (scopeGate: off)", () => {
  const racine = depot({ etat: actif("BUILD"), config: { scopeGate: "off" } });
  assert.equal(rappelCourt(lireEtat(racine), racine), null);
  assert.equal(rappelSiChange(racine), null);
});

test("rappel seulement si l'état a changé ; empreinte illisible : rappel injecté", async () => {
  const racine = depot({ config: { transitions: "agent" } });
  assert.match(rappelSiChange(racine), /SCOPING/);
  assert.equal(rappelSiChange(racine), null, "inchangé : rien");
  assert.equal((await passer(racine, { vers: "EXPECTATION", fiche: FICHE }, { tty: false, maintenant: MAINTENANT })).code, 0);
  assert.match(rappelSiChange(racine), /EXPECTATION/, "changé : rappel");
  writeFileSync(join(racine, ".drwil", "reminder.json"), "{ cassé");
  assert.match(rappelSiChange(racine), /EXPECTATION/, "jamais masqué");
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
  assert.equal(statutFiche("# F\n\n**Statut** : terminé le 2026-10-10.\n"), "terminee");
  assert.equal(statutFiche("# F\n\n**Status**: done on 2026-10-10.\n"), "terminee");
  assert.equal(statutFiche("# F\n\n**Statut** : référence — mécanique du kit.\n"), "reference");
  assert.equal(statutFiche("# F\n\n**Status**: reference — kit mechanics.\n"), "reference");
  for (const statut of [
    "cadré le 2026-10-06 — lots 1 à 4 livrés, essai réel fait.",
    "fait (lot 1) le 2026-10-05.",
    "terminé, sans date.",
  ]) {
    assert.equal(statutFiche(`# F\n\n**Statut** : ${statut}\n`), "ouverte", statut);
  }
  assert.equal(statutFiche("# F\n\nSans statut.\n"), "ouverte");
});

test("clôture : retour en SCOPING refusé si la fiche terminée est encore là", async () => {
  const racine = depot({ etat: actif("CLOSING"), fiche: false });
  writeFileSync(join(racine, FICHE), "# Projet : Exemple\n\n**Statut** : terminé le 2026-10-10.\n");
  const refus = await passer(racine, { vers: "SCOPING" }, { tty: false, maintenant: MAINTENANT });
  assert.equal(refus.code, 1);
  assert.match(refus.message, /terminée.*journal/);
  assert.equal(lireEtat(racine).etat.activity, "CLOSING");
  // Lots encore ouverts : la fiche reste, le retour passe.
  writeFileSync(join(racine, FICHE), "# Projet : Exemple\n\n**Statut** : cadré — lot 1 fait, lot 2 ouvert.\n");
  assert.equal((await passer(racine, { vers: "SCOPING" }, { tty: false, maintenant: MAINTENANT })).code, 0);
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
  const fiches = fichesCadrees(racine);
  assert.deepEqual(
    fiches.map((f) => [f.chemin, f.priorite, f.decisions, f.prete]),
    [
      ["docs/projects/sans-tag.md", "P2", 0, true],
      [FICHE, "P3", 0, true],
      ["docs/projects/anglaise.md", "P1", 2, false],
      ["docs/projects/bloquee.md", "P1", 1, false],
    ],
  );
});

test("fusion autorisée : seulement par un lancement humain, gardée jusqu'à CLOSING, effacée en SCOPING", () => {
  const { racine } = depotCadre({ transitions: "agent" });
  assert.equal(lancer(racine, FICHE, { fusion: true }).code, 0);
  assert.equal(lireEtat(racine).etat.auto_merge, undefined, "un lancement par l'agent n'autorise jamais la fusion");
  assert.doesNotMatch(contexte(lireEtat(racine), racine), /fusion automatique/i);
  rmSync(join(racine, ".drwil", "state.json"));
  assert.equal(lancer(racine, FICHE, { humain: true, fusion: true }).code, 0);
  let lu = lireEtat(racine);
  assert.deepEqual(lu.problemes, []);
  assert.equal(lu.etat.auto_merge, true);
  assert.match(contexte(lu, racine), /fusion automatique autorisée/i);
  // Ordre sûr (PR #29 : fusion refusée, retour en SCOPING quand même, autorisation perdue) : la PR
  // calculée et à jour, la fusion programmée puis vérifiée, et seulement ensuite le retour en SCOPING.
  assert.match(
    contexte(lu, racine),
    /mergeStateStatus.*BEHIND.*gh pr merge --auto --merge.*autoMergeRequest.*seulement ensuite revenir en SCOPING.*rester en CLOSING/s,
  );
  writeFileSync(join(racine, ".drwil", "ia-first.json"), JSON.stringify({ transitions: "agent", lang: "en" }));
  assert.match(
    contexte(lu, racine),
    /mergeStateStatus.*BEHIND.*gh pr merge --auto --merge.*autoMergeRequest.*only then go back to SCOPING.*stay in CLOSING/s,
  );
  for (const vers of ["EVIDENCE", "VERIFY"]) {
    const r = preparerTransition(lu, vers, { maintenant: MAINTENANT }, racine);
    assert.equal(r.etat.auto_merge, true, vers);
    lu = { ...lu, etat: r.etat };
  }
  assert.equal(
    preparerTransition({ ...lu, etat: { ...lu.etat, activity: "CLOSING" } }, "SCOPING", { maintenant: MAINTENANT }, racine).etat.auto_merge,
    undefined,
  );
});

test("validation : auto_merge booléenne, jamais vraie en SCOPING", () => {
  const racine = depot();
  assert.match(validerEtat(actif("BUILD", { auto_merge: "oui" }), racine)[0], /auto_merge/);
  assert.match(validerEtat({ ...ETAT_NEUTRE, auto_merge: true }, racine)[0], /auto_merge/);
  assert.deepEqual(validerEtat(actif("CLOSING", { auto_merge: true }), racine), []);
});

test("fiches cadrées : sans dossier de fiches, aucune", () => {
  assert.deepEqual(fichesCadrees(tmp("drwil-etat-vide-")), []);
});

test("fiches cadrées : bloc cadrage commité, non terminée, hors modèles", () => {
  const { racine } = depotCadre();
  assert.deepEqual(
    fichesCadrees(racine).map((f) => f.chemin),
    [FICHE],
  );
  assert.equal(fichesCadrees(racine)[0].titre, "Projet : Exemple");
  // Un cadrage seulement dans l'arbre de travail ne compte pas : c'est le cadrage commité qui est validé.
  writeFileSync(join(racine, "docs", "projects", "sans-cadrage.md"), "# Sans cadrage\n\n<!-- scope\nfiles:\n  - src/z.ts\n-->\n");
  assert.deepEqual(
    fichesCadrees(racine).map((f) => f.chemin),
    [FICHE],
  );
});

test("lancer : un geste humain passe directement en BUILD ; refusé à l'agent en mode humain", () => {
  const { racine } = depotCadre();
  const agent = lancer(racine, FICHE, { maintenant: MAINTENANT });
  assert.equal(agent.code, 1);
  assert.match(agent.message, /décision humaine/);
  assert.equal(lireEtat(racine).source, "absent");
  const ok = lancer(racine, FICHE, { humain: true, maintenant: MAINTENANT });
  assert.equal(ok.code, 0, ok.message);
  assert.deepEqual(lireEtat(racine).etat, {
    version: 1,
    activity: "BUILD",
    active_brief: FICHE,
    active_request: null,
    since: MAINTENANT,
  });
  assert.match(lancer(racine, FICHE, { humain: true }).message, /activité BUILD/, "pas de relance en pleine réalisation");
});

test("lancer : fiche non cadrée, terminée ou modèle refusée ; mode agent libre", () => {
  const { racine } = depotCadre();
  for (const f of ["docs/projects/sans-cadrage.md", "docs/projects/finie.md", "docs/projects/model-brief.md", "docs/projects/absente.md"]) {
    assert.match(lancer(racine, f, { humain: true }).message, /n'est pas une fiche cadrée/, f);
  }
  const agent = depotCadre({ transitions: "agent" }).racine;
  assert.equal(lancer(agent, FICHE).code, 0);
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
  let r = await capturer(() => principal(["briefs"], racine));
  assert.equal(r.code, 0);
  assert.equal(r.sortie, `1. ${FICHE} — Projet : Exemple`);
  r = await capturer(() => principal(["briefs", "--json"], racine));
  assert.equal(JSON.parse(r.sortie)[0].chemin, FICHE);
  r = await capturer(() => principal(["briefs"], depot()));
  assert.match(r.sortie, /^\(aucune fiche cadrée/);
});

test("principal lancer sans terminal : refusé en mode humain, lancé en mode agent (avec --demande)", async () => {
  const humain = depotCadre().racine;
  let r = await capturer(() => principal(["start", FICHE], humain));
  assert.equal(r.code, 1);
  assert.match(r.erreurs, /^✗ lancement refusé : c'est une décision humaine/);
  const agent = depotCadre({ transitions: "agent" }).racine;
  r = await capturer(() => principal(["start", FICHE, "--demande", "faire X"], agent));
  assert.equal(r.code, 0, r.erreurs);
  assert.match(r.sortie, /^✓ SCOPING → BUILD \(lancé : docs\/projects\/exemple\.md\)\n\n\[drwil\] État de gouvernance/);
  assert.equal(lireEtat(agent).etat.active_request, "faire X");
  // --demande sans valeur : ignoré.
  const autre = depotCadre({ transitions: "agent" }).racine;
  await capturer(() => principal(["start", FICHE, "--demande"], autre));
  assert.equal(lireEtat(autre).etat.active_request, null);
});

test("principal lancer au terminal : l'humain choisit, confirme et décide de la fusion", async () => {
  const { racine, git } = depotCadre();
  writeFileSync(
    join(racine, "docs", "projects", "bloquee.md"),
    "# Bloquée\n\n**Statut** : cadré le 2026-10-10.\n\n<!-- scope\nfiles:\n  - src/b.ts\n-->\n\n## Points à trancher\n\n- [décision] A ou B ?\n",
  );
  git("add", "-A");
  git("commit", "-qm", "bloquee");
  const r = await avecTerminal(["1", "LANCER", "FUSION"], () => capturer(() => principal(["start"], racine)));
  assert.equal(r.code, 0, r.erreurs);
  assert.match(
    r.sortie,
    /^1\. docs\/projects\/exemple\.md — Projet : Exemple \[P2\]\n2\. docs\/projects\/bloquee\.md — Bloquée \[P2 · non prête : 1 décision\(s\) à trancher\]/,
  );
  assert.deepEqual(r.invites.length, 3);
  assert.equal(lireEtat(racine).etat.auto_merge, true);
});

test("principal lancer au terminal : sans confirmation exacte ou numéro inconnu, rien ne change", async () => {
  const { racine } = depotCadre();
  let r = await avecTerminal(["oui"], () => capturer(() => principal(["start", FICHE], racine)));
  assert.equal(r.code, 1);
  assert.equal(r.erreurs, "✗ lancement non confirmé : état inchangé");
  r = await avecTerminal(["9"], () => capturer(() => principal(["start"], racine)));
  assert.equal(r.code, 1);
  assert.equal(r.invites.length, 1);
  r = await avecTerminal(["LANCER", ""], () => capturer(() => principal(["start", FICHE], racine)));
  assert.equal(r.code, 0, r.erreurs);
  assert.equal(lireEtat(racine).etat.auto_merge, undefined);
});

test("principal rappel : affiché seulement quand l'état change", async () => {
  const racine = depot();
  assert.match((await capturer(() => principal(["reminder"], racine))).sortie, /^\[drwil\] Rappel/);
  assert.equal((await capturer(() => principal(["reminder"], racine))).sortie, "");
});

test("principal rappel et lecture : une racine inutilisable ne casse jamais la session", async () => {
  assert.deepEqual(await capturer(() => principal(["reminder"], null)), { code: 0, sortie: "", erreurs: "" });
  const r = await capturer(() => principal([], null));
  assert.equal(r.code, 0);
  assert.match(r.sortie, /^\[drwil\] état de gouvernance illisible : /);
});

test("rappel court en anglais, fiche active", () => {
  const racine = depot({ etat: actif("BUILD"), lang: "en" });
  assert.match(rappelCourt(lireEtat(racine), racine), /^\[drwil\] Reminder: BUILD · docs\/projects\/exemple\.md · scope: 2 file\(s\)/);
  const neutre = depot({ lang: "en" });
  assert.match(rappelCourt(lireEtat(neutre), neutre), /^\[drwil\] Reminder: SCOPING · no active expectation \(read again/);
});

test("principal lecture : contexte ou JSON", async () => {
  const racine = depot({ etat: actif("BUILD") });
  assert.match((await capturer(() => principal([], racine))).sortie, /^\[drwil\] État de gouvernance/);
  assert.equal(JSON.parse((await capturer(() => principal(["--json"], racine))).sortie).etat.activity, "BUILD");
});

test("principal passer : usage sans activité, transition écrite ou refusée, confirmation au terminal", async () => {
  const racine = depot({ config: { transitions: "agent" } });
  for (const args of [["move"], ["move", "--fiche"]]) {
    const r = await capturer(() => principal(args, racine));
    assert.equal(r.code, 2);
    assert.match(r.erreurs, /^usage : node \.githooks\/state\.mjs move </);
  }
  let r = await capturer(() => principal(["move", "EXPECTATION", "--fiche", FICHE, "--demande", "d"], racine));
  assert.equal(r.code, 0, r.erreurs);
  assert.match(r.sortie, /^✓ /);
  r = await capturer(() => principal(["move", "CLOSING"], racine));
  assert.equal(r.code, 1);
  assert.match(r.erreurs, /^✗ /);
  const humain = depot();
  r = await avecTerminal(["EXPECTATION"], () => capturer(() => principal(["move", "EXPECTATION", "--fiche", FICHE], humain)));
  assert.equal(r.code, 0, r.erreurs);
  assert.equal(lireEtat(humain).etat.activity, "EXPECTATION");
});

test("ligne de commande : node state.mjs lit l'état du dossier courant", () => {
  const racine = depot();
  const r = spawnSync(process.execPath, [fileURLToPath(new URL("./state.mjs", import.meta.url))], { cwd: racine, encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /Activité : SCOPING/);
});

test("cas limites : attente non textuelle, verdict inconnu, configuration « null »", () => {
  assert.deepEqual(validerEtat(actif("BUILD", { active_brief: 5 }), depot()), ["active_brief : chemin de fiche ou null attendu"]);
  const { racine, evidence } = depotEnVerify();
  evidence("verify-2026-10-09T10-00-00-000Z.json", { status: "bizarre" });
  assert.match(preuveVerify(racine).raison, /sans verdict reconnu/);
  const nulle = depot();
  writeFileSync(join(nulle, ".drwil", "ia-first.json"), "null");
  assert.match(contexte(lireEtat(nulle), nulle), /Activité : SCOPING/);
});

test("fiche active sans titre, ou illisible (un dossier) : contexte et rappel tiennent", () => {
  const sansTitre = depot({ etat: actif("BUILD"), fiche: false });
  writeFileSync(join(sansTitre, FICHE), "**Statut** : cadré le 2026-10-09.\n");
  assert.match(contexte(lireEtat(sansTitre), sansTitre), /Attente active : docs\/projects\/exemple\.md\n/);
  const dossier = depot({ etat: actif("BUILD"), fiche: false });
  mkdirSync(join(dossier, FICHE));
  assert.match(contexte(lireEtat(dossier), dossier), /\(aucun bloc cadrage/);
  assert.match(rappelCourt(lireEtat(dossier), dossier), /périmètre : 0 fichier/);
});

test("rappel : empreinte impossible à écrire, le rappel est quand même rendu", () => {
  const racine = depot();
  mkdirSync(join(racine, ".drwil", "reminder.json"));
  assert.match(rappelSiChange(racine), /^\[drwil\] Rappel/);
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
  const sansTitre = fichesCadrees(racine).find((f) => f.chemin === "docs/projects/sans-titre.md");
  assert.deepEqual([sansTitre.titre, sansTitre.priorite], ["docs/projects/sans-titre.md", "P0"]);
  assert.match(lancer(racine, undefined).message, /« undefined » n'est pas une fiche cadrée/);
  assert.match(lancer(racine, FICHE, { demande: 5 }).message, /^lancement refusé : active_request : chaîne ou null attendu/);
});
