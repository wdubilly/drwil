import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { ACTIVITES, ETAT_NEUTRE, contexte, exigeHumain, lireEtat, passer, preparerTransition, preuveVerify, transitionAutorisee, validerEtat } from "./etat.mjs";

const FICHE = "docs/projets/exemple.md";

function depot({ etat, fiche = true, lang, config } = {}) {
  const racine = mkdtempSync(join(tmpdir(), "drwil-etat-"));
  mkdirSync(join(racine, ".drwil"));
  mkdirSync(join(racine, "docs", "projets"), { recursive: true });
  if (lang || config) writeFileSync(join(racine, ".drwil", "ia-first.json"), JSON.stringify({ ...(lang ? { lang } : {}), ...config }));
  if (fiche) {
    writeFileSync(join(racine, FICHE), `# Projet : Exemple

**Statut** : cadré le 2026-10-09.

<!-- cadrage
fichiers:
  - src/auth/login.ts
  - tests/auth/login.test.ts
-->
`);
  }
  if (etat !== undefined) {
    writeFileSync(join(racine, ".drwil", "state.json"), typeof etat === "string" ? etat : JSON.stringify(etat));
  }
  return racine;
}

const actif = (activite, extra = {}) => ({ version: 1, activite, attente_active: FICHE, demande_active: null, depuis: "2026-10-09T10:00:00Z", ...extra });

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
  assert.deepEqual(preparerTransition(neutre(), "ATTENTE", { fiche: FICHE, maintenant: MAINTENANT }, racine).etat,
    { version: 1, activite: "ATTENTE", attente_active: FICHE, demande_active: null, depuis: MAINTENANT });
  assert.match(preparerTransition(neutre(), "ATTENTE", { maintenant: MAINTENANT }, racine).erreur, /--fiche/);
  assert.match(preparerTransition(neutre(), "ATTENTE", { fiche: "docs/projets/absente.md", maintenant: MAINTENANT }, racine).erreur, /introuvable/);
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

test("humain requis (mode humain) : ouvrir, lancer la réalisation, clore ; rien en mode agent", () => {
  assert.equal(exigeHumain("CADRAGE", "ATTENTE", "humain"), true);
  assert.equal(exigeHumain("DEMANDE", "REALISATION", "humain"), true);
  assert.equal(exigeHumain("VERIFY", "CLOTURE", "humain"), true);
  assert.equal(exigeHumain("REALISATION", "PREUVES", "humain"), false);
  assert.equal(exigeHumain("VERIFY", "REALISATION", "humain"), false, "retour sur la même attente");
  assert.equal(exigeHumain("REALISATION", "CADRAGE", "humain"), false, "l'abandon resserre les droits");
  for (const [de, vers] of [["CADRAGE", "ATTENTE"], ["DEMANDE", "REALISATION"], ["VERIFY", "CLOTURE"]]) assert.equal(exigeHumain(de, vers, "agent"), false);
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
  const refus = await passer(racine, { vers: "ATTENTE", fiche: FICHE }, { tty: true, confirmer: async () => false, maintenant: MAINTENANT });
  assert.equal(refus.code, 1);
  assert.equal(lireEtat(racine).source, "absent");
  let question = "";
  const ok = await passer(racine, { vers: "ATTENTE", fiche: FICHE }, { tty: true, confirmer: async (q) => { question = q; return true; }, maintenant: MAINTENANT });
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
    writeFileSync(join(racine, ".drwil", "evidence", nom), typeof contenu === "string" ? contenu : JSON.stringify({ version: 1, commit: head, dirtyWorktree: false, ...contenu }));
  };
  return { racine, evidence };
}

const humainOk = { tty: true, confirmer: async () => true, maintenant: MAINTENANT };

test("clôture : sans évidence de verify, refusée avant toute question à l'humain", async () => {
  const { racine } = depotEnVerify();
  let demande = false;
  const r = await passer(racine, { vers: "CLOTURE" }, { tty: true, confirmer: async () => (demande = true), maintenant: MAINTENANT });
  assert.equal(r.code, 1);
  assert.match(r.message, /aucune évidence.*drwil verify --evidence/);
  assert.equal(demande, false);
  assert.equal(lireEtat(racine).etat.activite, "VERIFY");
});

test("clôture : PASS ou ATTESTED sur HEAD, arbre propre, autorise (puis confirmation humaine)", async () => {
  for (const status of ["pass", "attested"]) {
    const { racine, evidence } = depotEnVerify();
    evidence("verify-2026-10-09T10-00-00-000Z.json", { status });
    assert.deepEqual(preuveVerify(racine), { ok: true });
    const r = await passer(racine, { vers: "CLOTURE" }, humainOk);
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
  for (const [lang, motif] of [["fr", /Gouvernance désactivée/], ["en", /Governance disabled/]]) {
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
