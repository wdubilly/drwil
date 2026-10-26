import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { close } from "./close.mjs";
import { context, readState, start } from "./state.mjs";
import { activeElsewhere, launchInWorktree, lateLines } from "./worktree.mjs";

// Voir state.test.mjs : des GIT_* hérités feraient agir les tests sur le dépôt qui les lance.
for (const nom of Object.keys(process.env)) if (nom.startsWith("GIT_")) delete process.env[nom];

let dossiers = [];
afterEach((t) => {
  if (t.passed === false) console.error(`dossiers gardés pour diagnostic (${t.name}) : ${dossiers.join(", ")}`);
  else
    for (const d of dossiers)
      rmSync(d, {
        recursive: true,
        force: true,
        maxRetries: 5,
        retryDelay: 100,
      });
  dossiers = [];
});

const git = (racine, ...args) => {
  const r = spawnSync("git", ["-c", "user.name=t", "-c", "user.email=t@t.invalid", "-c", "core.hooksPath=/dev/null", ...args], {
    cwd: racine,
    encoding: "utf8",
  });
  assert.equal(r.status, 0, `git ${args.join(" ")} : ${r.stderr}`);
  return r.stdout.trim();
};
const ecrire = (racine, fichiers) => {
  for (const [chemin, contenu] of Object.entries(fichiers)) {
    mkdirSync(dirname(join(racine, chemin)), { recursive: true });
    writeFileSync(join(racine, chemin), contenu);
  }
};

const FICHE = "docs/projects/exemple.md";
const FICHE_TEXTE = `# Projet : Exemple

**Statut** : cadré le 2026-10-26.

<!-- scope
files:
  - src/exemple.js
-->

## Critères d'acceptation

- Exemple — contrat à créer
`;

/** Un dépôt `origin` (nu), un clone `<parent>/projet` avec une fiche cadrée poussée sur master. */
function depot(config = {}) {
  const parent = mkdtempSync(join(tmpdir(), "drwil-worktree-"));
  dossiers.push(parent);
  const origine = join(parent, "origine.git");
  git(parent, "init", "-q", "--bare", "-b", "master", origine);
  const racine = join(parent, "projet");
  git(parent, "clone", "-q", origine, racine);
  git(racine, "checkout", "-q", "-b", "master");
  ecrire(racine, {
    [FICHE]: FICHE_TEXTE,
    ".drwil/ia-first.json": JSON.stringify({ lang: "fr", ...config }),
    ".gitignore": ".drwil/state.json\n",
  });
  git(racine, "add", "-A");
  git(racine, "commit", "-q", "-m", "initial");
  git(racine, "push", "-q", "origin", "master");
  return { parent, origine, racine, voisin: join(parent, "projet-exemple") };
}

/** Pousse un commit sur origin/master depuis un second clone. */
function avancerOrigine({ parent, origine }, nom = "recent.txt") {
  const autre = join(parent, "autre");
  git(parent, "clone", "-q", origine, autre);
  ecrire(autre, { [nom]: "nouveau" });
  git(autre, "add", "-A");
  git(autre, "commit", "-q", "-m", "avance");
  git(autre, "push", "-q", "origin", "master");
}

test("QUA-142 la réponse humaine crée le worktree frère depuis la branche principale à jour et y lance le chantier", async () => {
  const d = depot();
  avancerOrigine(d);
  const configAvant = readFileSync(join(d.racine, ".git", "config"), "utf8");
  const r = await launchInWorktree(d.racine, FICHE, { autoMerge: true });
  assert.equal(r.code, 0, r.message);
  assert.equal(r.path, d.voisin);
  assert.equal(git(d.voisin, "rev-parse", "--abbrev-ref", "HEAD"), "workstream/exemple");
  assert.ok(existsSync(join(d.voisin, "recent.txt")), "le worktree part de origin/master à jour");
  const etat = readState(d.voisin).state;
  assert.equal(etat.activity, "BUILD");
  assert.equal(etat.active_brief, FICHE);
  assert.equal(etat.auto_merge, true);
  assert.equal(existsSync(join(d.racine, ".drwil", "state.json")), false, "l'état du dossier d'origine ne change pas");
  assert.equal(readFileSync(join(d.racine, ".git", "config"), "utf8"), configAvant, "la configuration du dépôt principal n'est pas écrite");
  assert.equal(git(d.racine, "rev-parse", "--abbrev-ref", "HEAD"), "master");
});

test("QUA-142 un lancement refusé ne crée rien : file, fiche non cadrée, dossier ou branche existants", async () => {
  const d = depot();
  assert.equal(
    (
      await launchInWorktree(d.racine, FICHE, {
        queue: ["docs/projects/autre.md"],
      })
    ).code,
    1,
  );
  assert.equal((await launchInWorktree(d.racine, "docs/projects/inconnue.md")).code, 1);
  mkdirSync(d.voisin);
  assert.match((await launchInWorktree(d.racine, FICHE)).message, /existe déjà/);
  rmSync(d.voisin, { recursive: true });
  git(d.racine, "branch", "workstream/exemple");
  assert.match((await launchInWorktree(d.racine, FICHE)).message, /branche workstream\/exemple existe déjà/);
  assert.equal(existsSync(d.voisin), false);
});

test("QUA-142 sans accès à origin, le worktree part de la branche locale et le dit", async () => {
  const d = depot();
  rmSync(d.origine, { recursive: true });
  const r = await launchInWorktree(d.racine, FICHE);
  assert.equal(r.code, 0, r.message);
  assert.match(r.message, /git fetch a échoué/);
  assert.equal(readState(d.voisin).state.activity, "BUILD");
});

test("QUA-143 le rappel d'état nomme le dépôt principal dans un worktree et liste les worktrees dans le dossier principal", async () => {
  const d = depot();
  assert.doesNotMatch(context(readState(d.racine), d.racine), /worktree/i, "aucun worktree : rien à dire");
  await launchInWorktree(d.racine, FICHE);
  const dansWorktree = context(readState(d.voisin), d.voisin);
  assert.ok(dansWorktree.includes(`worktree du dépôt principal ${d.racine}`), dansWorktree);
  assert.match(dansWorktree, /branche workstream\/exemple, chantier docs\/projects\/exemple\.md/);
  assert.match(dansWorktree, /non des dépôts distincts : ne modifier que celui-ci/);
  assert.ok(dansWorktree.includes(`- ${d.racine} — branche master, chantier aucun`));
  const dansPrincipal = context(readState(d.racine), d.racine);
  assert.match(dansPrincipal, /dépôt principal/);
  assert.ok(dansPrincipal.includes(`- ${d.voisin} — branche workstream/exemple, chantier docs/projects/exemple.md`), dansPrincipal);
  // Un dossier listé mais disparu est ignoré, pas une erreur.
  rmSync(d.voisin, { recursive: true });
  assert.doesNotMatch(context(readState(d.racine), d.racine), /worktree/i);
});

test("QUA-144 la commande d'installation déclarée est lancée dans le worktree ; son échec est dit, le worktree et l'état restent", async () => {
  const d = depot({
    worktreeInstall: "node -e \"require('fs').writeFileSync('installe.txt', process.cwd())\"",
  });
  const r = await launchInWorktree(d.racine, FICHE);
  assert.equal(r.code, 0, r.message);
  assert.match(r.message, /Installation lancée dans le worktree/);
  assert.ok(existsSync(join(d.voisin, "installe.txt")), "lancée dans le nouveau dossier");
  assert.equal(existsSync(join(d.racine, "installe.txt")), false);

  const e = depot({
    worktreeInstall: "node -e \"console.error('boum'); process.exit(3)\"",
  });
  const re = await launchInWorktree(e.racine, FICHE);
  assert.match(re.message, /Installation en échec dans le worktree.*boum/);
  assert.equal(re.code, 0, "l'échec d'installation n'annule pas le lancement");
  assert.equal(readState(e.voisin).state.activity, "BUILD");

  const s = depot();
  const rs = await launchInWorktree(s.racine, FICHE);
  assert.match(rs.message, /Aucune installation lancée/);
  assert.equal(readState(s.voisin).state.activity, "BUILD");
});

test("QUA-145 une fiche déjà active dans un autre worktree est refusée avec le chemin de ce worktree", async () => {
  const d = depot();
  await launchInWorktree(d.racine, FICHE);
  assert.equal(activeElsewhere(d.racine, FICHE), d.voisin);
  const depuisPrincipal = await launchInWorktree(d.racine, FICHE);
  assert.equal(depuisPrincipal.code, 1);
  assert.ok(depuisPrincipal.message.includes(d.voisin), depuisPrincipal.message);
  const direct = start(d.racine, FICHE, { human: true });
  assert.equal(direct.code, 1);
  assert.ok(direct.message.includes(d.voisin), direct.message);
  assert.equal(existsSync(join(d.racine, ".drwil", "state.json")), false);
  // Le dossier disparu ne retient plus la fiche.
  rmSync(d.voisin, { recursive: true });
  assert.equal(activeElsewhere(d.racine, FICHE), null);
  assert.equal(start(d.racine, FICHE, { human: true }).code, 0);
});

test("QUA-146 close --check signale une branche en retard sur la branche principale distante sans refuser la clôture", () => {
  const d = depot();
  git(d.racine, "switch", "-q", "-c", "workstream/exemple");
  assert.deepEqual(lateLines(d.racine), []);
  const avant = close(d.racine, { brief: FICHE, check: true });
  assert.doesNotMatch(avant.message, /en retard/);
  avancerOrigine(d);
  const apres = close(d.racine, { brief: FICHE, check: true });
  assert.match(apres.message, /branche en retard de 1 commit\(s\) sur origin\/master : `git merge origin\/master`/);
  assert.equal(apres.code, avant.code, "le retard seul ne change pas le verdict");
  // La branche principale elle-même n'est jamais « en retard » ; sans réseau, le signal le dit sans conclure.
  git(d.racine, "switch", "-q", "master");
  assert.deepEqual(lateLines(d.racine), []);
  git(d.racine, "switch", "-q", "workstream/exemple");
  rmSync(d.origine, { recursive: true });
  assert.match(lateLines(d.racine)[0], /non mesuré/);
});

test("QUA-142 hors dépôt, sans branche principale, ou si git refuse le worktree, rien n'est créé et la cause est dite", async () => {
  const hors = mkdtempSync(join(tmpdir(), "drwil-worktree-"));
  dossiers.push(hors);
  assert.match((await launchInWorktree(hors, FICHE)).message, /pas un dépôt git lisible/);
  const d = depot();
  mkdirSync(join(d.racine, "sous"));
  assert.equal((await launchInWorktree(join(d.racine, "sous"), FICHE)).code, 1, "seule la racine d'un worktree convient");
  // Un worktree enregistré mais disparu fait échouer git : le refus cite git et rien ne reste.
  git(d.racine, "worktree", "add", "-q", "--detach", d.voisin);
  rmSync(d.voisin, { recursive: true });
  assert.match((await launchInWorktree(d.racine, FICHE)).message, /git worktree add a échoué/);
  git(d.racine, "worktree", "prune");
  git(d.racine, "branch", "-m", "master", "trunk");
  assert.match((await launchInWorktree(d.racine, FICHE)).message, /aucune branche principale locale/);
});

test("QUA-142 un worktree sans branche est listé sans nom de branche, et un démarrage refusé dans le worktree est dit", async () => {
  const d = depot();
  git(d.racine, "worktree", "add", "-q", "--detach", d.voisin);
  assert.match(context(readState(d.voisin), d.voisin), /branche \?, chantier aucun/);
  assert.ok(context(readState(d.racine), d.racine).includes(`- ${d.voisin} — branche ?, chantier aucun`));
  git(d.racine, "worktree", "remove", "--force", d.voisin);
  const e = depot({ newRequirements: "blocking" });
  ecrire(e.racine, { [FICHE]: "# Projet : Exemple\n\n<!-- scope\nfiles:\n  - src/exemple.js\n-->\n" });
  git(e.racine, "commit", "-q", "-am", "sans critères");
  git(e.racine, "push", "-q", "origin", "master");
  const r = await launchInWorktree(e.racine, FICHE);
  assert.equal(r.code, 1);
  assert.match(r.message, /Chantier non lancé dans le worktree/);
  assert.ok(existsSync(e.voisin), "le worktree reste");
});
