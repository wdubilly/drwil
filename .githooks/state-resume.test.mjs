import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { checkScope } from "./scope-gate.mjs";
import { lotStatus } from "./state-lots.mjs";
import { lastLot, resume } from "./state-resume.mjs";
import { main, readState, writeState } from "./state.mjs";

// Hérités d'un hook, GIT_DIR, GIT_INDEX_FILE… feraient agir les tests sur le dépôt qui les lance.
for (const nom of Object.keys(process.env)) if (nom.startsWith("GIT_")) delete process.env[nom];

let dossiers = [];
afterEach(() => {
  for (const d of dossiers) rmSync(d, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  dossiers = [];
});

const FICHE = "docs/projects/chantier.md";
const AUTRE = "docs/projects/autre.md";
const BRANCHE = "workstream/chantier";
const LOTS = `## 6. Increments

- **Lot 1 — lire** [IA] : détail.
- **Lot 2 — écrire** [IA] : détail.
- **Lot 3 — relire** [humain] : détail.
`;
const fiche = (lots = "") => `# Projet : Chantier\n\n**Statut** : cadré le 2026-11-05.\n\n<!-- scope\nfiles:\n  - src/a.js\n-->\n\n${lots}`;

// La CI n'a pas d'identité git : chaque commit la reçoit explicitement.
function git(racine, ...args) {
  const r = spawnSync("git", ["-c", "user.name=t", "-c", "user.email=t@t", ...args], { cwd: racine, encoding: "utf8" });
  assert.equal(r.status, 0, `git ${args.join(" ")} : ${r.stderr}`);
  return r.stdout.trim();
}

function ecrire(racine, chemin, contenu) {
  mkdirSync(dirname(join(racine, chemin)), { recursive: true });
  writeFileSync(join(racine, chemin), contenu);
}

const tmp = () => {
  const d = mkdtempSync(join(tmpdir(), "drwil-reprise-"));
  dossiers.push(d);
  return d;
};

/** Dépôt d'origine : master porte la barrière (marqueur) et les fiches ; la branche du chantier, un commit de code. */
function origine({ lots = "", trailer } = {}) {
  const racine = tmp();
  git(racine, "init", "-q", "-b", "master");
  ecrire(racine, ".gitignore", ".drwil/\n");
  ecrire(racine, ".githooks/scope-gate.mjs", "// marqueur : barrière en vigueur\n");
  ecrire(racine, FICHE, fiche(lots));
  ecrire(racine, AUTRE, fiche());
  git(racine, "add", ".");
  git(racine, "commit", "-qm", "base");
  git(racine, "switch", "-qc", BRANCHE);
  ecrire(racine, "src/a.js", "1\n");
  git(racine, "add", ".");
  git(racine, "commit", "-qm", "Travail", "-m", `Drwil-Brief: ${FICHE}${trailer ? `\nDrwil-Lot: ${trailer}` : ""}`);
  return racine;
}

/** Clone neuf placé sur la branche du chantier (sans branche principale locale) : aucun état. */
function clone(source) {
  const racine = join(tmp(), "clone");
  git(dirname(racine), "clone", "-q", "-b", BRANCHE, source, racine);
  return racine;
}

const sansGh = () => null;
const aucunePr = () => "[]";
const etat = (racine) => readState(racine);

test("QUA-245 : clone neuf sur la branche du chantier, fiche présente : resume remet BUILD et le commit suivant passe la barrière", () => {
  const racine = clone(origine());
  ecrire(racine, "src/a.js", "2\n");
  git(racine, "add", ".");
  const bloquant = { cfg: { scopeGate: "blocking" }, staged: ["src/a.js"] };
  assert.equal(checkScope(racine, bloquant).status, "fail", "avant la reprise, l'état neutre refuse le commit");
  const r = resume(racine, { gh: sansGh, now: "2026-11-05T10:00:00Z" });
  assert.equal(r.code, 0, r.message);
  assert.match(r.message, /état repris en BUILD sur docs\/projects\/chantier\.md/);
  assert.match(r.message, /fusion automatique, file de chantiers, réouverture/);
  assert.match(r.message, /verify --evidence/);
  assert.deepEqual(etat(racine).state, {
    version: 1,
    activity: "BUILD",
    active_brief: FICHE,
    active_request: null,
    since: "2026-11-05T10:00:00Z",
  });
  assert.equal(checkScope(racine, bloquant).status, "ok");
  git(racine, "commit", "-qm", "Suite du travail");
});

test("QUA-245 : fiche supprimée par la clôture, PR non fusionnée : resume remet CLOSING ; depuis la ligne de commande aussi", async () => {
  const source = origine();
  git(source, "rm", "-q", FICHE);
  git(source, "commit", "-qm", "Clôture");
  const racine = clone(source);
  const r = resume(racine, { gh: aucunePr });
  assert.equal(r.code, 0, r.message);
  assert.match(r.message, /état repris en CLOSING/);
  assert.match(r.message, /pousser la branche/);
  assert.equal(etat(racine).state.activity, "CLOSING");
  assert.equal(etat(racine).state.active_brief, FICHE);
  assert.equal(etat(racine).state.auto_merge, undefined, "une décision humaine n'est jamais reconstruite");

  // Ligne de commande, BUILD sur le dépôt d'origine (branche principale locale).
  const autre = origine();
  assert.equal(await main(["resume"], autre), 0);
  assert.equal(etat(autre).state.activity, "BUILD");
});

test("QUA-246 : resume reprend le dernier lot lu dans le trailer Drwil-Lot, les lots [IA] d'avant faits", async () => {
  const racine = clone(origine({ lots: LOTS, trailer: 2 }));
  const r = resume(racine, { gh: sansGh });
  assert.equal(r.code, 0, r.message);
  assert.match(r.message, /lot courant : 2/);
  const s = lotStatus(racine, etat(racine));
  assert.equal(s.current.n, 2);
  assert.deepEqual(
    s.done.map((l) => l.n),
    [1],
  );
  assert.equal(lastLot(racine, "origin/master"), 2);

  // Sans trailer, ou un numéro qui n'est pas un lot [IA] : aucun lot repris.
  for (const trailer of [undefined, 3]) {
    const sans = clone(origine({ lots: LOTS, trailer }));
    const rs = resume(sans, { gh: sansGh });
    assert.equal(rs.code, 0, rs.message);
    assert.doesNotMatch(rs.message, /lot courant/);
    assert.equal(lotStatus(sans, etat(sans)).current.n, 1);
  }
});

test("QUA-247 : resume refuse sans rien écrire quand l'historique ne prouve rien, et dit pourquoi", async () => {
  const source = origine();
  const refuse = (racine, motif, gh = sansGh) => {
    const r = resume(racine, { gh });
    assert.equal(r.code, 1, r.message);
    assert.match(r.message, motif);
    assert.equal(etat(racine).source, "missing", "rien n'est écrit");
  };
  // Branche qui n'est pas celle d'un chantier, puis HEAD détachée.
  const racine = clone(source);
  git(racine, "switch", "-qc", "feature/x");
  refuse(racine, /la branche « feature\/x » n'est pas celle d'un chantier/);
  git(racine, "switch", "-q", "--detach");
  refuse(racine, /la branche « HEAD »/);
  // Fiche absente sans commit de clôture.
  git(racine, "switch", "-qc", "workstream/inconnu");
  refuse(racine, /docs\/projects\/inconnu\.md est absente et aucun commit/);
  // PR fusionnée, ou gh muet.
  git(source, "rm", "-q", FICHE);
  git(source, "commit", "-qm", "Clôture");
  const close = clone(source);
  const tip = git(close, "rev-parse", "HEAD");
  refuse(close, /est fusionnée/, () => JSON.stringify([{ headRefName: BRANCHE, headRefOid: tip }]));
  refuse(close, /gh n'a pas dit/);
  // Sans branche principale, ni locale ni distante.
  const seul = tmp();
  git(seul, "init", "-q", "-b", BRANCHE);
  ecrire(seul, FICHE, fiche());
  git(seul, "add", ".");
  git(seul, "commit", "-qm", "base");
  refuse(seul, /branche principale introuvable/);
  // Ligne de commande : le refus sort en erreur.
  assert.equal(await main(["resume"], seul), 1);

  // État local déjà actif sur une autre fiche : refusé, l'état reste ; sur la même : rien à reprendre.
  const actif = clone(origine());
  writeState(actif, { version: 1, activity: "BUILD", active_brief: AUTRE, active_request: null, since: null });
  const occupe = resume(actif, { gh: sansGh });
  assert.equal(occupe.code, 1);
  assert.match(occupe.message, /déjà actif sur docs\/projects\/autre\.md, pas sur docs\/projects\/chantier\.md/);
  assert.equal(etat(actif).state.active_brief, AUTRE);
  writeState(actif, { version: 1, activity: "VERIFY", active_brief: FICHE, active_request: null, since: null });
  const deja = resume(actif, { gh: sansGh });
  assert.equal(deja.code, 0);
  assert.match(deja.message, /rien à reprendre : l'état local est déjà en VERIFY/);
  assert.equal(etat(actif).state.activity, "VERIFY");
  assert.equal(existsSync(join(actif, ".drwil", "lot.json")), false);
  assert.ok(readFileSync(join(actif, ".drwil", "state.json"), "utf8").includes("VERIFY"));
});
