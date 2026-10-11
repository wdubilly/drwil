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
} from "./etat.mjs";

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

const FICHE = "docs/projets/exemple.md";

function depot({ etat, fiche = true, lang, config } = {}) {
  const racine = tmp("drwil-etat-");
  mkdirSync(join(racine, ".drwil"));
  mkdirSync(join(racine, "docs", "projets"), { recursive: true });
  if (lang || config) writeFileSync(join(racine, ".drwil", "ia-first.json"), JSON.stringify({ ...(lang ? { lang } : {}), ...config }));
  if (fiche) {
    writeFileSync(
      join(racine, FICHE),
      `# Projet : Exemple

**Statut** : cadré le 2026-10-09.

<!-- cadrage
fichiers:
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
  activite,
  attente_active: FICHE,
  demande_active: null,
  depuis: "2026-10-09T10:00:00Z",
  ...extra,
});

test("sans state.json : CADRAGE neutre, jamais d'état actif implicite", () => {
  const lu = lireEtat(depot());
  assert.equal(lu.source, "absent");
  assert.deepEqual(lu.etat, ETAT_NEUTRE);
  assert.deepEqual(lu.problemes, []);
});

test("état actif valide : activité et attente lues depuis le disque", () => {
  const lu = lireEtat(depot({ etat: actif("REALISATION") }));
  assert.equal(lu.source, "fichier");
  assert.deepEqual(lu.problemes, []);
  assert.equal(lu.etat.activite, "REALISATION");
  assert.equal(lu.etat.attente_active, FICHE);
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
  assert.match(validerEtat({ ...actif("REALISATION"), perimetre_actif: ["src/"] }, racine)[0], /champ inconnu « perimetre_actif »/);
  const { version, ...sansVersion } = actif("REALISATION");
  assert.match(validerEtat(sansVersion, racine)[0], /version/);
  assert.match(validerEtat([], racine)[0], /objet/);
});

test("validation : CADRAGE sans attente ni demande, les autres activités exigent une attente", () => {
  const racine = depot();
  assert.deepEqual(validerEtat(ETAT_NEUTRE, racine), []);
  assert.match(validerEtat(actif("CADRAGE"), racine)[0], /CADRAGE.*aucune attente/);
  assert.match(validerEtat({ ...actif("REALISATION"), attente_active: null }, racine)[0], /attente active requise/);
});

test("validation : l'attente active est une fiche existante de docs/projets/, hors modèle", () => {
  const racine = depot();
  assert.match(validerEtat(actif("REALISATION", { attente_active: "docs/projets/absente.md" }), racine)[0], /introuvable/);
  assert.match(validerEtat(actif("REALISATION", { attente_active: "src/auth/login.ts" }), racine)[0], /docs\/projets\//);
  assert.match(validerEtat(actif("REALISATION", { attente_active: "docs/projets/../../etc/passwd.md" }), racine)[0], /docs\/projets\//);
  assert.match(validerEtat(actif("REALISATION", { attente_active: "docs/projets/modele-fiche-projet.md" }), racine)[0], /modèle/);
});

test("validation : demande_active et depuis bien typés", () => {
  const racine = depot();
  assert.match(validerEtat(actif("DEMANDE", { demande_active: 42 }), racine)[0], /demande_active/);
  assert.match(validerEtat(actif("DEMANDE", { depuis: "hier" }), racine)[0], /depuis/);
  assert.deepEqual(validerEtat(actif("DEMANDE", { demande_active: "Lot 1" }), racine), []);
});

test("clôture : fiche déjà supprimée tolérée en CLOTURE seulement, les autres règles de l'attente restent", () => {
  const racine = depot({ fiche: false });
  assert.deepEqual(validerEtat(actif("CLOTURE"), racine), []);
  for (const activite of ["ATTENTE", "DEMANDE", "REALISATION", "PREUVES", "VERIFY"]) {
    assert.match(validerEtat(actif(activite), racine)[0], /introuvable/, activite);
  }
  assert.match(validerEtat(actif("CLOTURE", { attente_active: "src/auth/login.ts" }), racine)[0], /docs\/projets\//);
  assert.match(validerEtat(actif("CLOTURE", { attente_active: "docs/projets/modele-fiche-projet.md" }), racine)[0], /modèle/);
});

test("clôture : fiche supprimée selon la recette, retour en CADRAGE accepté ; contexte et rappel le disent", async () => {
  const racine = depot({ etat: actif("CLOTURE"), fiche: false });
  const lu = lireEtat(racine);
  assert.deepEqual(lu.problemes, []);
  const ctx = contexte(lu, racine);
  assert.match(ctx, /fiche supprimée/);
  assert.doesNotMatch(ctx, /Périmètre autorisé|invalide/);
  assert.match(rappelCourt(lu, racine), /fiche supprimée/);
  assert.doesNotMatch(rappelCourt(lu, racine), /invalide|périmètre/);
  const r = await passer(racine, { vers: "CADRAGE" }, { tty: false, maintenant: MAINTENANT });
  assert.equal(r.code, 0, r.message);
  assert.doesNotMatch(r.message, /invalide/);
  assert.equal(lireEtat(racine).etat.activite, "CADRAGE");
});

test("transitions : une activité à la fois, retours vers REALISATION, abandon vers CADRAGE", () => {
  assert.equal(transitionAutorisee("CADRAGE", "ATTENTE"), true);
  assert.equal(transitionAutorisee("CADRAGE", "REALISATION"), false, "pas de saut en avant");
  assert.equal(transitionAutorisee("VERIFY", "REALISATION"), true, "retour après échec");
  assert.equal(transitionAutorisee("PREUVES", "REALISATION"), true);
  assert.equal(transitionAutorisee("VERIFY", "CLOTURE"), true);
  assert.equal(transitionAutorisee("CLOTURE", "CADRAGE"), true);
  for (const a of ACTIVITES) if (a !== "CADRAGE") assert.equal(transitionAutorisee(a, "CADRAGE"), true, `abandon depuis ${a}`);
  assert.equal(transitionAutorisee("REALISATION", "REALISATION"), false);
  assert.equal(transitionAutorisee("INCONNUE", "CADRAGE"), false);
});

test("contexte : CADRAGE interdit la réalisation", () => {
  const racine = depot();
  const texte = contexte(lireEtat(racine), racine);
  assert.match(texte, /Activité : CADRAGE/);
  assert.match(texte, /aucune attente active/);
  assert.match(texte, /aucun fichier de code/);
});

test("contexte : REALISATION rappelle la fiche, son titre et son périmètre", () => {
  const racine = depot({ etat: actif("REALISATION") });
  const texte = contexte(lireEtat(racine), racine);
  assert.match(texte, /Activité : REALISATION/);
  assert.match(texte, /docs\/projets\/exemple\.md — Projet : Exemple/);
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
  assert.match(contexte(lireEtat(racine), racine), /Activity: CADRAGE/);
});

const MAINTENANT = "2026-10-09T12:00:00Z";
const neutre = () => ({ etat: { ...ETAT_NEUTRE }, source: "absent", problemes: [] });

test("préparer : ouvrir une attente exige une fiche existante", () => {
  const racine = depot();
  assert.deepEqual(preparerTransition(neutre(), "ATTENTE", { fiche: FICHE, maintenant: MAINTENANT }, racine).etat, {
    version: 1,
    activite: "ATTENTE",
    attente_active: FICHE,
    demande_active: null,
    depuis: MAINTENANT,
  });
  assert.match(preparerTransition(neutre(), "ATTENTE", { maintenant: MAINTENANT }, racine).erreur, /--fiche/);
  assert.match(
    preparerTransition(neutre(), "ATTENTE", { fiche: "docs/projets/absente.md", maintenant: MAINTENANT }, racine).erreur,
    /introuvable/,
  );
});

test("préparer : transition interdite refusée, --fiche réservé à l'ouverture, abandon vers le neutre", () => {
  const racine = depot();
  assert.match(preparerTransition(neutre(), "REALISATION", { maintenant: MAINTENANT }, racine).erreur, /CADRAGE → REALISATION.*interdite/);
  const enCours = { etat: actif("REALISATION"), source: "fichier", problemes: [] };
  assert.match(preparerTransition(enCours, "PREUVES", { fiche: FICHE, maintenant: MAINTENANT }, racine).erreur, /--fiche/);
  const suite = preparerTransition(enCours, "PREUVES", { demande: "Lot 2", maintenant: MAINTENANT }, racine).etat;
  assert.equal(suite.attente_active, FICHE, "l'attente suit");
  assert.equal(suite.demande_active, "Lot 2");
  assert.deepEqual(preparerTransition(enCours, "CADRAGE", { maintenant: MAINTENANT }, racine).etat, { ...ETAT_NEUTRE, depuis: MAINTENANT });
});

test("humain requis (mode humain) : ouvrir et lancer la réalisation, pas clore ; rien en mode agent", () => {
  assert.equal(exigeHumain("CADRAGE", "ATTENTE", "humain"), true);
  assert.equal(exigeHumain("DEMANDE", "REALISATION", "humain"), true);
  assert.equal(exigeHumain("VERIFY", "CLOTURE", "humain"), false, "clore retire des droits : libre sur évidence valide");
  assert.equal(exigeHumain("REALISATION", "PREUVES", "humain"), false);
  assert.equal(exigeHumain("VERIFY", "REALISATION", "humain"), false, "retour sur la même attente");
  assert.equal(exigeHumain("REALISATION", "CADRAGE", "humain"), false, "l'abandon resserre les droits");
  for (const [de, vers] of [
    ["CADRAGE", "ATTENTE"],
    ["DEMANDE", "REALISATION"],
    ["VERIFY", "CLOTURE"],
  ])
    assert.equal(exigeHumain(de, vers, "agent"), false);
});

test("passer (mode humain par défaut) : refus sans terminal interactif, état inchangé", async () => {
  const racine = depot();
  const r = await passer(racine, { vers: "ATTENTE", fiche: FICHE }, { tty: false, maintenant: MAINTENANT });
  assert.equal(r.code, 1);
  assert.match(r.message, /terminal interactif/);
  assert.equal(lireEtat(racine).source, "absent");
});

test("passer : avec un humain qui confirme, l'état est écrit ; sans confirmation, rien", async () => {
  const racine = depot();
  const refus = await passer(
    racine,
    { vers: "ATTENTE", fiche: FICHE },
    { tty: true, confirmer: async () => false, maintenant: MAINTENANT },
  );
  assert.equal(refus.code, 1);
  assert.equal(lireEtat(racine).source, "absent");
  let question = "";
  const ok = await passer(
    racine,
    { vers: "ATTENTE", fiche: FICHE },
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
  assert.match(question, /ATTENTE/);
  assert.equal(lireEtat(racine).etat.activite, "ATTENTE");
  // Transition libre ensuite : pas de terminal requis.
  assert.equal((await passer(racine, { vers: "DEMANDE", demande: "Lot 2" }, { tty: false, maintenant: MAINTENANT })).code, 0);
  assert.equal(lireEtat(racine).etat.demande_active, "Lot 2");
});

test("passer (mode agent) : toute transition permise est libre ; une interdite reste refusée", async () => {
  const racine = depot({ config: { transitions: "agent" } });
  assert.equal((await passer(racine, { vers: "ATTENTE", fiche: FICHE }, { tty: false, maintenant: MAINTENANT })).code, 0);
  const saut = await passer(racine, { vers: "VERIFY" }, { tty: false, maintenant: MAINTENANT });
  assert.equal(saut.code, 1);
  assert.match(saut.message, /interdite/);
});

test("passer : depuis un état invalide, on repart du neutre (signalé)", async () => {
  const racine = depot({ etat: "{ cassé", config: { transitions: "agent" } });
  const r = await passer(racine, { vers: "ATTENTE", fiche: FICHE }, { tty: false, maintenant: MAINTENANT });
  assert.equal(r.code, 0, r.message);
  assert.match(r.message, /invalide/);
  assert.equal(lireEtat(racine).etat.activite, "ATTENTE");
});

test("contexte : indique la commande de transition", () => {
  const racine = depot();
  assert.match(contexte(lireEtat(racine), racine), /node \.githooks\/etat\.mjs passer/);
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
  const r = await passer(racine, { vers: "CLOTURE" }, { tty: true, confirmer: async () => (demande = true), maintenant: MAINTENANT });
  assert.equal(r.code, 1);
  assert.match(r.message, /aucune évidence.*drwil verify --evidence/);
  assert.equal(demande, false);
  assert.equal(lireEtat(racine).etat.activite, "VERIFY");
});

test("clôture : PASS ou ATTESTED sur HEAD, arbre propre, autorise sans geste humain", async () => {
  for (const status of ["pass", "attested"]) {
    const { racine, evidence } = depotEnVerify();
    evidence("verify-2026-10-09T10-00-00-000Z.json", { status });
    assert.deepEqual(preuveVerify(racine), { ok: true });
    const r = await passer(racine, { vers: "CLOTURE" }, { tty: false, maintenant: MAINTENANT });
    assert.equal(r.code, 0, r.message);
    assert.equal(lireEtat(racine).etat.activite, "CLOTURE");
  }
});

test("clôture : FAIL et ERROR renvoient en REALISATION, MANUAL à l'attestation humaine", () => {
  const attendus = { fail: /FAIL.*passer REALISATION/, error: /ERROR.*passer REALISATION/, manual: /MANUAL.*drwil attest/ };
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
  const r = await passer(racine, { vers: "CLOTURE" }, { tty: false, maintenant: MAINTENANT });
  assert.equal(r.code, 1);
  assert.match(r.message, /clôture refusée/);
});

test("clôture : hors dépôt git, refusée", () => {
  const racine = depot({ etat: actif("VERIFY") });
  mkdirSync(join(racine, ".drwil", "evidence"));
  writeFileSync(join(racine, ".drwil", "evidence", "verify-a.json"), JSON.stringify({ status: "pass", commit: "x", dirtyWorktree: false }));
  assert.match(preuveVerify(racine).raison, /HEAD introuvable/);
});

test("barriere: off : contexte réduit à « gouvernance désactivée », même avec un état actif", () => {
  for (const [lang, motif] of [
    ["fr", /Gouvernance désactivée/],
    ["en", /Governance disabled/],
  ]) {
    const racine = depot({ etat: actif("REALISATION"), config: { barriere: "off", lang } });
    const texte = contexte(lireEtat(racine), racine);
    assert.match(texte, motif);
    assert.doesNotMatch(texte, /REALISATION|cadrage/);
  }
});

test("messages : commandes drwil complètes (npx), jamais « drwil » seul", () => {
  const { racine } = depotEnVerify();
  assert.match(preuveVerify(racine).raison, /`npx drwil verify --evidence`/);
  assert.match(contexte(lireEtat(racine), racine), /`npx drwil verify --evidence`/);
});

test("rappel court : activité, fiche et taille du périmètre en deux lignes ; état invalide signalé", () => {
  const racine = depot({ etat: actif("REALISATION") });
  const texte = rappelCourt(lireEtat(racine), racine);
  assert.equal(texte.split("\n").length, 2);
  assert.match(texte, /REALISATION · docs\/projets\/exemple\.md · périmètre : 2 fichier/);
  assert.match(texte, /Règle : réaliser l'attente/);
  const neutre = depot();
  assert.match(rappelCourt(lireEtat(neutre), neutre), /CADRAGE · aucune attente active/);
  const casse = depot({ etat: "{ cassé" });
  assert.match(rappelCourt(lireEtat(casse), casse), /état invalide/);
});

test("rappel court : rien quand la gouvernance est désactivée (barriere: off)", () => {
  const racine = depot({ etat: actif("REALISATION"), config: { barriere: "off" } });
  assert.equal(rappelCourt(lireEtat(racine), racine), null);
  assert.equal(rappelSiChange(racine), null);
});

test("rappel seulement si l'état a changé ; empreinte illisible : rappel injecté", async () => {
  const racine = depot({ config: { transitions: "agent" } });
  assert.match(rappelSiChange(racine), /CADRAGE/);
  assert.equal(rappelSiChange(racine), null, "inchangé : rien");
  assert.equal((await passer(racine, { vers: "ATTENTE", fiche: FICHE }, { tty: false, maintenant: MAINTENANT })).code, 0);
  assert.match(rappelSiChange(racine), /ATTENTE/, "changé : rappel");
  writeFileSync(join(racine, ".drwil", "rappel.json"), "{ cassé");
  assert.match(rappelSiChange(racine), /ATTENTE/, "jamais masqué");
});

// Dépôt git dont la fiche exemple (bloc cadrage) est commitée : une fiche cadrée.
function depotCadre(config) {
  const racine = depot({ config });
  const git = (...args) => spawnSync("git", ["-c", "user.name=t", "-c", "user.email=t@t", ...args], { cwd: racine, encoding: "utf8" });
  writeFileSync(join(racine, ".gitignore"), ".drwil/\n");
  writeFileSync(join(racine, "docs", "projets", "sans-cadrage.md"), "# Sans cadrage\n");
  writeFileSync(
    join(racine, "docs", "projets", "finie.md"),
    "# Finie\n\n**Statut** : terminé le 2026-10-01.\n\n<!-- cadrage\nfichiers:\n  - src/x.ts\n-->\n",
  );
  writeFileSync(
    join(racine, "docs", "projets", "reference.md"),
    "# Référence\n\n**Statut** : référence — mécanique du kit.\n\n<!-- cadrage\nfichiers:\n  - src/r.ts\n-->\n",
  );
  writeFileSync(join(racine, "docs", "projets", "modele-fiche-projet.md"), "# Modèle\n\n<!-- cadrage\nfichiers:\n  - src/y.ts\n-->\n");
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

test("clôture : retour en CADRAGE refusé si la fiche terminée est encore là", async () => {
  const racine = depot({ etat: actif("CLOTURE"), fiche: false });
  writeFileSync(join(racine, FICHE), "# Projet : Exemple\n\n**Statut** : terminé le 2026-10-10.\n");
  const refus = await passer(racine, { vers: "CADRAGE" }, { tty: false, maintenant: MAINTENANT });
  assert.equal(refus.code, 1);
  assert.match(refus.message, /terminée.*journal/);
  assert.equal(lireEtat(racine).etat.activite, "CLOTURE");
  // Lots encore ouverts : la fiche reste, le retour passe.
  writeFileSync(join(racine, FICHE), "# Projet : Exemple\n\n**Statut** : cadré — lot 1 fait, lot 2 ouvert.\n");
  assert.equal((await passer(racine, { vers: "CADRAGE" }, { tty: false, maintenant: MAINTENANT })).code, 0);
});

test("fiches cadrées : prêtes d'abord, puis priorité de l'index ([P2] sans tag) ; décisions ouvertes comptées", () => {
  const { racine, git } = depotCadre();
  const fiche = (titre, points) =>
    `# ${titre}\n\n**Statut** : cadré le 2026-10-10.\n\n<!-- cadrage\nfichiers:\n  - src/${titre}.ts\n-->\n\n## 5. Points à trancher\n\n${points}\n\n## 6. Lots\n\n- [décision] hors section, non compté.\n`;
  writeFileSync(
    join(racine, "docs", "projets", "bloquee.md"),
    fiche("bloquee", "- [décision] Choisir A ou B ?\n- ~~Tranché~~ — voir Décisions."),
  );
  writeFileSync(join(racine, "docs", "projets", "sans-tag.md"), fiche("sans-tag", "- ~~Tranché~~ — voir Décisions."));
  writeFileSync(
    join(racine, "docs", "projets", "anglaise.md"),
    "# anglaise\n\n**Status**: scoped on 2026-10-10.\n\n<!-- cadrage\nfichiers:\n  - src/en.ts\n-->\n\n## 5. Points to decide\n\n- [decision] A or B?\n- [decision] C or D?\n",
  );
  writeFileSync(
    join(racine, "docs", "projets", "en-attente.md"),
    [
      "# Index",
      "",
      "Priorité : `[P0]` le plus urgent.",
      "",
      `- [ ] [IA] [P3] Exemple — \`${FICHE}\`.`,
      "- [ ] [décision] [P1] Bloquée —",
      "  `docs/projets/bloquee.md`.",
      "- [x] [IA] [P0] point fait d'une fiche ouverte — `docs/projets/sans-tag.md`.",
      "- [ ] [IA] Sans tag — `docs/projets/sans-tag.md`.",
      "- [ ] [IA] [P1] Anglaise — `docs/projets/anglaise.md`.",
      "",
    ].join("\n"),
  );
  git("add", "-A");
  git("commit", "-qm", "fiches");
  const fiches = fichesCadrees(racine);
  assert.deepEqual(
    fiches.map((f) => [f.chemin, f.priorite, f.decisions, f.prete]),
    [
      ["docs/projets/sans-tag.md", "P2", 0, true],
      [FICHE, "P3", 0, true],
      ["docs/projets/anglaise.md", "P1", 2, false],
      ["docs/projets/bloquee.md", "P1", 1, false],
    ],
  );
});

test("fusion autorisée : seulement par un lancement humain, gardée jusqu'à CLOTURE, effacée en CADRAGE", () => {
  const { racine } = depotCadre({ transitions: "agent" });
  assert.equal(lancer(racine, FICHE, { fusion: true }).code, 0);
  assert.equal(lireEtat(racine).etat.fusion_autorisee, undefined, "un lancement par l'agent n'autorise jamais la fusion");
  assert.doesNotMatch(contexte(lireEtat(racine), racine), /fusion automatique/i);
  rmSync(join(racine, ".drwil", "state.json"));
  assert.equal(lancer(racine, FICHE, { humain: true, fusion: true }).code, 0);
  let lu = lireEtat(racine);
  assert.deepEqual(lu.problemes, []);
  assert.equal(lu.etat.fusion_autorisee, true);
  assert.match(contexte(lu, racine), /fusion automatique autorisée/i);
  // Ordre sûr (PR #29 : fusion refusée, retour en CADRAGE quand même, autorisation perdue) : la PR
  // calculée et à jour, la fusion programmée puis vérifiée, et seulement ensuite le retour en CADRAGE.
  assert.match(
    contexte(lu, racine),
    /mergeStateStatus.*BEHIND.*gh pr merge --auto --merge.*autoMergeRequest.*seulement ensuite revenir en CADRAGE.*rester en CLOTURE/s,
  );
  writeFileSync(join(racine, ".drwil", "ia-first.json"), JSON.stringify({ transitions: "agent", lang: "en" }));
  assert.match(
    contexte(lu, racine),
    /mergeStateStatus.*BEHIND.*gh pr merge --auto --merge.*autoMergeRequest.*only then go back to CADRAGE.*stay in CLOTURE/s,
  );
  for (const vers of ["PREUVES", "VERIFY"]) {
    const r = preparerTransition(lu, vers, { maintenant: MAINTENANT }, racine);
    assert.equal(r.etat.fusion_autorisee, true, vers);
    lu = { ...lu, etat: r.etat };
  }
  assert.equal(
    preparerTransition({ ...lu, etat: { ...lu.etat, activite: "CLOTURE" } }, "CADRAGE", { maintenant: MAINTENANT }, racine).etat
      .fusion_autorisee,
    undefined,
  );
});

test("validation : fusion_autorisee booléenne, jamais vraie en CADRAGE", () => {
  const racine = depot();
  assert.match(validerEtat(actif("REALISATION", { fusion_autorisee: "oui" }), racine)[0], /fusion_autorisee/);
  assert.match(validerEtat({ ...ETAT_NEUTRE, fusion_autorisee: true }, racine)[0], /fusion_autorisee/);
  assert.deepEqual(validerEtat(actif("CLOTURE", { fusion_autorisee: true }), racine), []);
});

test("fiches cadrées : bloc cadrage commité, non terminée, hors modèles", () => {
  const { racine } = depotCadre();
  assert.deepEqual(
    fichesCadrees(racine).map((f) => f.chemin),
    [FICHE],
  );
  assert.equal(fichesCadrees(racine)[0].titre, "Projet : Exemple");
  // Un cadrage seulement dans l'arbre de travail ne compte pas : c'est le cadrage commité qui est validé.
  writeFileSync(join(racine, "docs", "projets", "sans-cadrage.md"), "# Sans cadrage\n\n<!-- cadrage\nfichiers:\n  - src/z.ts\n-->\n");
  assert.deepEqual(
    fichesCadrees(racine).map((f) => f.chemin),
    [FICHE],
  );
});

test("lancer : un geste humain passe directement en REALISATION ; refusé à l'agent en mode humain", () => {
  const { racine } = depotCadre();
  const agent = lancer(racine, FICHE, { maintenant: MAINTENANT });
  assert.equal(agent.code, 1);
  assert.match(agent.message, /décision humaine/);
  assert.equal(lireEtat(racine).source, "absent");
  const ok = lancer(racine, FICHE, { humain: true, maintenant: MAINTENANT });
  assert.equal(ok.code, 0, ok.message);
  assert.deepEqual(lireEtat(racine).etat, {
    version: 1,
    activite: "REALISATION",
    attente_active: FICHE,
    demande_active: null,
    depuis: MAINTENANT,
  });
  assert.match(lancer(racine, FICHE, { humain: true }).message, /activité REALISATION/, "pas de relance en pleine réalisation");
});

test("lancer : fiche non cadrée, terminée ou modèle refusée ; mode agent libre", () => {
  const { racine } = depotCadre();
  for (const f of [
    "docs/projets/sans-cadrage.md",
    "docs/projets/finie.md",
    "docs/projets/modele-fiche-projet.md",
    "docs/projets/absente.md",
  ]) {
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
  const r = spawnSync(process.execPath, ["--test", join(ici, "etat.test.mjs"), join(ici, "perimetre.test.mjs")], {
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

// --- Commande `node .githooks/etat.mjs` (principal) et cas limites ---

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
  let r = await capturer(() => principal(["fiches"], racine));
  assert.equal(r.code, 0);
  assert.equal(r.sortie, `1. ${FICHE} — Projet : Exemple`);
  r = await capturer(() => principal(["fiches", "--json"], racine));
  assert.equal(JSON.parse(r.sortie)[0].chemin, FICHE);
  r = await capturer(() => principal(["fiches"], depot()));
  assert.match(r.sortie, /^\(aucune fiche cadrée/);
});

test("principal lancer sans terminal : refusé en mode humain, lancé en mode agent (avec --demande)", async () => {
  const humain = depotCadre().racine;
  let r = await capturer(() => principal(["lancer", FICHE], humain));
  assert.equal(r.code, 1);
  assert.match(r.erreurs, /^✗ lancement refusé : c'est une décision humaine/);
  const agent = depotCadre({ transitions: "agent" }).racine;
  r = await capturer(() => principal(["lancer", FICHE, "--demande", "faire X"], agent));
  assert.equal(r.code, 0, r.erreurs);
  assert.match(r.sortie, /^✓ CADRAGE → REALISATION \(lancé : docs\/projets\/exemple\.md\)\n\n\[drwil\] État de gouvernance/);
  assert.equal(lireEtat(agent).etat.demande_active, "faire X");
  // --demande sans valeur : ignoré.
  const autre = depotCadre({ transitions: "agent" }).racine;
  await capturer(() => principal(["lancer", FICHE, "--demande"], autre));
  assert.equal(lireEtat(autre).etat.demande_active, null);
});

test("principal lancer au terminal : l'humain choisit, confirme et décide de la fusion", async () => {
  const { racine, git } = depotCadre();
  writeFileSync(
    join(racine, "docs", "projets", "bloquee.md"),
    "# Bloquée\n\n**Statut** : cadré le 2026-10-10.\n\n<!-- cadrage\nfichiers:\n  - src/b.ts\n-->\n\n## Points à trancher\n\n- [décision] A ou B ?\n",
  );
  git("add", "-A");
  git("commit", "-qm", "bloquee");
  const r = await avecTerminal(["1", "LANCER", "FUSION"], () => capturer(() => principal(["lancer"], racine)));
  assert.equal(r.code, 0, r.erreurs);
  assert.match(
    r.sortie,
    /^1\. docs\/projets\/exemple\.md — Projet : Exemple \[P2\]\n2\. docs\/projets\/bloquee\.md — Bloquée \[P2 · non prête : 1 décision\(s\) à trancher\]/,
  );
  assert.deepEqual(r.invites.length, 3);
  assert.equal(lireEtat(racine).etat.fusion_autorisee, true);
});

test("principal lancer au terminal : sans confirmation exacte ou numéro inconnu, rien ne change", async () => {
  const { racine } = depotCadre();
  let r = await avecTerminal(["oui"], () => capturer(() => principal(["lancer", FICHE], racine)));
  assert.equal(r.code, 1);
  assert.equal(r.erreurs, "✗ lancement non confirmé : état inchangé");
  r = await avecTerminal(["9"], () => capturer(() => principal(["lancer"], racine)));
  assert.equal(r.code, 1);
  assert.equal(r.invites.length, 1);
  r = await avecTerminal(["LANCER", ""], () => capturer(() => principal(["lancer", FICHE], racine)));
  assert.equal(r.code, 0, r.erreurs);
  assert.equal(lireEtat(racine).etat.fusion_autorisee, undefined);
});

test("principal rappel : affiché seulement quand l'état change", async () => {
  const racine = depot();
  assert.match((await capturer(() => principal(["rappel"], racine))).sortie, /^\[drwil\] Rappel/);
  assert.equal((await capturer(() => principal(["rappel"], racine))).sortie, "");
});

test("principal rappel et lecture : une racine inutilisable ne casse jamais la session", async () => {
  assert.deepEqual(await capturer(() => principal(["rappel"], null)), { code: 0, sortie: "", erreurs: "" });
  const r = await capturer(() => principal([], null));
  assert.equal(r.code, 0);
  assert.match(r.sortie, /^\[drwil\] état de gouvernance illisible : /);
});

test("rappel court en anglais, fiche active", () => {
  const racine = depot({ etat: actif("REALISATION"), lang: "en" });
  assert.match(rappelCourt(lireEtat(racine), racine), /^\[drwil\] Reminder: REALISATION · docs\/projets\/exemple\.md · scope: 2 file\(s\)/);
  const neutre = depot({ lang: "en" });
  assert.match(rappelCourt(lireEtat(neutre), neutre), /^\[drwil\] Reminder: CADRAGE · no active expectation \(read again/);
});

test("principal lecture : contexte ou JSON", async () => {
  const racine = depot({ etat: actif("REALISATION") });
  assert.match((await capturer(() => principal([], racine))).sortie, /^\[drwil\] État de gouvernance/);
  assert.equal(JSON.parse((await capturer(() => principal(["--json"], racine))).sortie).etat.activite, "REALISATION");
});

test("principal passer : usage sans activité, transition écrite ou refusée, confirmation au terminal", async () => {
  const racine = depot({ config: { transitions: "agent" } });
  for (const args of [["passer"], ["passer", "--fiche"]]) {
    const r = await capturer(() => principal(args, racine));
    assert.equal(r.code, 2);
    assert.match(r.erreurs, /^usage : node \.githooks\/etat\.mjs passer </);
  }
  let r = await capturer(() => principal(["passer", "ATTENTE", "--fiche", FICHE, "--demande", "d"], racine));
  assert.equal(r.code, 0, r.erreurs);
  assert.match(r.sortie, /^✓ /);
  r = await capturer(() => principal(["passer", "CLOTURE"], racine));
  assert.equal(r.code, 1);
  assert.match(r.erreurs, /^✗ /);
  const humain = depot();
  r = await avecTerminal(["ATTENTE"], () => capturer(() => principal(["passer", "ATTENTE", "--fiche", FICHE], humain)));
  assert.equal(r.code, 0, r.erreurs);
  assert.equal(lireEtat(humain).etat.activite, "ATTENTE");
});

test("ligne de commande : node etat.mjs lit l'état du dossier courant", () => {
  const racine = depot();
  const r = spawnSync(process.execPath, [fileURLToPath(new URL("./etat.mjs", import.meta.url))], { cwd: racine, encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /Activité : CADRAGE/);
});

test("cas limites : attente non textuelle, verdict inconnu, configuration « null »", () => {
  assert.deepEqual(validerEtat(actif("REALISATION", { attente_active: 5 }), depot()), ["attente_active : chemin de fiche ou null attendu"]);
  const { racine, evidence } = depotEnVerify();
  evidence("verify-2026-10-09T10-00-00-000Z.json", { status: "bizarre" });
  assert.match(preuveVerify(racine).raison, /sans verdict reconnu/);
  const nulle = depot();
  writeFileSync(join(nulle, ".drwil", "ia-first.json"), "null");
  assert.match(contexte(lireEtat(nulle), nulle), /Activité : CADRAGE/);
});

test("fiche active sans titre, ou illisible (un dossier) : contexte et rappel tiennent", () => {
  const sansTitre = depot({ etat: actif("REALISATION"), fiche: false });
  writeFileSync(join(sansTitre, FICHE), "**Statut** : cadré le 2026-10-09.\n");
  assert.match(contexte(lireEtat(sansTitre), sansTitre), /Attente active : docs\/projets\/exemple\.md\n/);
  const dossier = depot({ etat: actif("REALISATION"), fiche: false });
  mkdirSync(join(dossier, FICHE));
  assert.match(contexte(lireEtat(dossier), dossier), /\(aucun bloc cadrage/);
  assert.match(rappelCourt(lireEtat(dossier), dossier), /périmètre : 0 fichier/);
});

test("rappel : empreinte impossible à écrire, le rappel est quand même rendu", () => {
  const racine = depot();
  mkdirSync(join(racine, ".drwil", "rappel.json"));
  assert.match(rappelSiChange(racine), /^\[drwil\] Rappel/);
});

test("fiches cadrées : index réglé, fiche sans titre ; lancer sans fiche ou avec une demande invalide", () => {
  const { racine, git } = depotCadre({ dirs: { index: "suivi/index.md" }, transitions: "agent" });
  mkdirSync(join(racine, "suivi"));
  writeFileSync(join(racine, "suivi", "index.md"), "- [ ] [IA] [P0] `docs/projets/sans-titre.md`\n");
  writeFileSync(
    join(racine, "docs", "projets", "sans-titre.md"),
    "**Statut** : cadré le 2026-10-10.\n\n<!-- cadrage\nfichiers:\n  - src/t.ts\n-->\n",
  );
  git("add", "-A");
  git("commit", "-qm", "index");
  const sansTitre = fichesCadrees(racine).find((f) => f.chemin === "docs/projets/sans-titre.md");
  assert.deepEqual([sansTitre.titre, sansTitre.priorite], ["docs/projets/sans-titre.md", "P0"]);
  assert.match(lancer(racine, undefined).message, /« undefined » n'est pas une fiche cadrée/);
  assert.match(lancer(racine, FICHE, { demande: 5 }).message, /^lancement refusé : demande_active : chaîne ou null attendu/);
});
