// Reprise d'un détour sur une branche déjà poussée (QUA-050) : fusion, jamais de réécriture ni de push forcé.
import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { open, resume } from "./detour.mjs";
import { readState } from "./state.mjs";

// Voir scope-gate.test.mjs : des GIT_* hérités feraient agir les tests sur le dépôt qui les lance.
for (const nom of Object.keys(process.env)) if (nom.startsWith("GIT_")) delete process.env[nom];

const BARRIERE = fileURLToPath(new URL("./scope-gate.mjs", import.meta.url));
let dossiers = [];
afterEach(() => {
  for (const d of dossiers) rmSync(d, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  dossiers = [];
});
const dossier = () => {
  const d = mkdtempSync(join(tmpdir(), "drwil-reprise-"));
  dossiers.push(d);
  return d;
};

const ORIGINE = "docs/projects/chantier.md";
const FICHE = "docs/projects/detour-date-mal-lue.md";
const BRANCHE = "detour/date-mal-lue";
const git = (racine, ...args) => {
  const r = spawnSync("git", args, { cwd: racine, encoding: "utf8" });
  assert.equal(r.status, 0, `git ${args.join(" ")} : ${r.stderr}`);
  return r.stdout.trim();
};
const ecrire = (racine, fichiers) => {
  for (const [chemin, contenu] of Object.entries(fichiers)) {
    mkdirSync(dirname(join(racine, chemin)), { recursive: true });
    writeFileSync(join(racine, chemin), contenu);
  }
};
const lire = (racine, chemin) => readFileSync(join(racine, chemin), "utf8");
const etat = (racine) => readState(racine).state;
const tete = (racine) => git(racine, "rev-parse", "HEAD");
const commiter = (racine, fichiers, message) => {
  ecrire(racine, fichiers);
  git(racine, "add", "-A");
  git(racine, "commit", "-q", "-m", message);
};

/**
 * Dépôt git temporaire avec un dépôt distant et le vrai hook prepare-commit-msg : master, branche chantier/x
 * (un commit de travail) en BUILD sur sa fiche, poussée selon `pousser` ("amont" : avec -u ; "sans-amont" :
 * sans -u ; rien : jamais poussée). Travail en cours `enCours` mis de côté par l'ouverture du détour.
 */
function chantier({ pousser = "amont", enCours = { "src/b.txt": "travail en cours\n" }, chantierTouche = {} } = {}) {
  const racine = dossier();
  git(racine, "init", "-q", "-b", "master");
  git(racine, "config", "user.name", "t");
  git(racine, "config", "user.email", "t@t.invalid");
  ecrire(racine, { "hooks/prepare-commit-msg": `#!/bin/sh\nexec node "${BARRIERE}" --trailer "$1"\n` });
  chmodSync(join(racine, "hooks/prepare-commit-msg"), 0o755);
  git(racine, "config", "core.hooksPath", "hooks");
  commiter(
    racine,
    {
      ".drwil/ia-first.json": "{}",
      ".gitignore": ".drwil/state.json\n.drwil/evidence/\n.drwil/reminder.json\nhooks/\n",
      [ORIGINE]: "# Projet : Chantier\n\n<!-- scope\nfiles:\n  - src/b.txt\n-->\n",
      "src/a.txt": "ligne 1\nligne 2\n",
      "docs/projects/journal.md": "# Journal\n",
    },
    "initial",
  );
  git(racine, "switch", "-q", "-c", "chantier/x");
  ecrire(racine, {
    ".drwil/state.json": JSON.stringify({ version: 1, activity: "BUILD", active_brief: ORIGINE, active_request: null, since: null }),
  });
  commiter(racine, { "src/b.txt": "travail commité\n", ...chantierTouche }, "travail");
  const distant = dossier();
  git(distant, "init", "-q", "--bare");
  git(racine, "remote", "add", "origin", distant);
  git(racine, "push", "-q", "origin", "master");
  if (pousser === "amont") git(racine, "push", "-q", "-u", "origin", "chantier/x");
  if (pousser === "sans-amont") git(racine, "push", "-q", "origin", "chantier/x");
  ecrire(racine, enCours);
  const r = open(racine, "date-mal-lue", { title: "Date", files: ["src/a.txt"] });
  assert.equal(r.code, 0, r.message);
  // La PR du détour : correction, entrée de journal, fiche retirée ; fusionnée puis poussée.
  commiter(
    racine,
    { "src/a.txt": "ligne 1 corrigée\nligne 2\n", "docs/projects/journal.md": `# Journal\n\n- Branche ${BRANCHE}.\n` },
    "correction",
  );
  git(racine, "rm", "-q", FICHE);
  git(racine, "commit", "-q", "-m", "clôture du détour");
  git(racine, "switch", "-q", "master");
  git(racine, "merge", "-q", "--no-ff", "-m", "fusion du détour", BRANCHE);
  git(racine, "push", "-q", "origin", "master");
  git(racine, "switch", "-q", BRANCHE);
  return racine;
}

test("QUA-050 : une branche déjà poussée reprend par fusion de la branche principale, hooks joués, jamais de rebase ni de push forcé", () => {
  const racine = chantier();
  const avant = git(racine, "rev-parse", "chantier/x");
  const r = resume(racine, { now: "2026-11-14T10:00:00.000Z" });
  assert.equal(r.code, 0, r.message);
  assert.match(r.message, /origin\/master fusionnée dans la branche/);
  assert.doesNotMatch(r.message, /force|rebas/);
  assert.equal(git(racine, "symbolic-ref", "--short", "HEAD"), "chantier/x");
  assert.equal(git(racine, "rev-parse", "HEAD^1"), avant, "l'historique poussé est gardé tel quel");
  assert.equal(git(racine, "rev-parse", "HEAD^2"), git(racine, "rev-parse", "origin/master"), "commit de fusion de la branche principale");
  assert.equal(git(racine, "rev-parse", "origin/chantier/x"), avant);
  assert.equal(
    git(racine, "log", "-1", "--format=%(trailers:key=Drwil-Brief,valueonly,separator=)"),
    ORIGINE,
    "hook joué sous la fiche du chantier",
  );
  assert.equal(lire(racine, "src/a.txt"), "ligne 1 corrigée\nligne 2\n");
  assert.equal(lire(racine, "src/b.txt"), "travail en cours\n", "travail restauré");
  assert.equal(git(racine, "stash", "list"), "");
  const e = etat(racine);
  assert.equal(e.active_brief, ORIGINE);
  assert.equal(e.detour, undefined);
});

test("QUA-050 : une branche poussée sans amont configuré est traitée comme poussée — fusion, pas de réécriture", () => {
  const racine = chantier({ pousser: "sans-amont" });
  const avant = git(racine, "rev-parse", "chantier/x");
  const r = resume(racine);
  assert.equal(r.code, 0, r.message);
  assert.match(r.message, /fusionnée dans la branche/);
  assert.equal(git(racine, "rev-parse", "HEAD^1"), avant);
});

test("QUA-050 : une branche qui contient déjà la branche principale est reprise sans rien rejouer ni fusionner", () => {
  const racine = chantier();
  git(racine, "switch", "-q", "chantier/x");
  git(racine, "merge", "-q", "--no-ff", "-m", "fusion à la main", "origin/master");
  git(racine, "switch", "-q", BRANCHE);
  const avant = git(racine, "rev-parse", "chantier/x");
  const r = resume(racine);
  assert.equal(r.code, 0, r.message);
  assert.match(r.message, /contient déjà origin\/master \(rien à rejouer\)/);
  assert.equal(tete(racine), avant, "aucun commit ajouté ni réécrit");
  assert.equal(lire(racine, "src/b.txt"), "travail en cours\n");
  assert.equal(etat(racine).active_brief, ORIGINE);
});

test("QUA-050 : une fusion de reprise en conflit est annulée — état, branche et mise de côté inchangés", () => {
  const racine = chantier({ chantierTouche: { "src/a.txt": "ligne 1 du chantier\nligne 2\n" } });
  const avant = git(racine, "rev-parse", "chantier/x");
  const detour = etat(racine).detour;
  const r = resume(racine);
  assert.equal(r.code, 1);
  assert.match(r.message, /chantier\/x ne se fusionne pas avec origin\/master sans conflit \(fusion annulée\)/);
  assert.equal(tete(racine), avant, "branche à son commit d'avant");
  assert.equal(git(racine, "status", "--porcelain"), "");
  assert.equal(etat(racine).active_brief, FICHE, "état inchangé");
  assert.deepEqual(etat(racine).detour, detour);
  assert.equal(git(racine, "stash", "list", "--format=%H"), detour.stash, "mise de côté intacte");
});

test("QUA-050 : une restauration en conflit après la fusion remet la branche à son commit d'avant — état et mise de côté inchangés", () => {
  const racine = chantier({ enCours: { "src/a.txt": "ligne 1 en cours\nligne 2\n" } });
  const avant = git(racine, "rev-parse", "chantier/x");
  const detour = etat(racine).detour;
  const r = resume(racine);
  assert.equal(r.code, 1);
  assert.match(r.message, /la restauration du travail entre en conflit/);
  assert.equal(tete(racine), avant, "le commit de fusion est retiré : la branche est à son commit d'avant");
  assert.equal(git(racine, "status", "--porcelain"), "");
  assert.equal(etat(racine).active_brief, FICHE);
  assert.equal(git(racine, "stash", "list", "--format=%H"), detour.stash);
});
