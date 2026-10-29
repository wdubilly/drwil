import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, dirname, join } from "node:path";
import { close } from "./close.mjs";
import { context, readState, start } from "./state.mjs";
import { scopesOverlap } from "./briefs.mjs";
import { activeElsewhere, launchInWorktree, launchParallel, lateLines } from "./worktree.mjs";

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
  // La branche du worktree disparu existe encore : le lancement ici la refuse (QUA-179).
  assert.match(start(d.racine, FICHE, { human: true }).message, /la branche workstream\/exemple existe déjà/);
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

// Fiches prêtes : A, B et D sont disjointes, C recoupe A.
const PRETE = (nom, fichiers) => `# Projet : ${nom}

**Statut** : cadré le 2026-10-26.
**Maturité** : prêt

<!-- scope
files:
${fichiers.map((f) => `  - ${f}`).join("\n")}
-->

## Critères d'acceptation

- ${nom} — contrat à créer

## Points à trancher

## Incréments

- **Lot 1** : ${nom}
`;
const A = "docs/projects/a.md";
const B = "docs/projects/b.md";
const C = "docs/projects/c.md";
const D = "docs/projects/d.md";

/** Dépôt avec les fiches A, B, C et D poussées sur master. */
function depotParallele(config = {}) {
  const d = depot(config);
  ecrire(d.racine, {
    [A]: PRETE("A", ["src/commun.js", "src/a.js"]),
    [B]: PRETE("B", ["src/b.js"]),
    [C]: PRETE("C", ["src/commun.js"]),
    [D]: PRETE("D", ["src/d.js"]),
  });
  git(d.racine, "add", "-A");
  git(d.racine, "commit", "-q", "-m", "fiches prêtes");
  git(d.racine, "push", "-q", "origin", "master");
  return { ...d, dossier: (f) => join(d.parent, `projet-${f}`) };
}

test("QUA-147 une file en parallèle lance chaque fiche dans son worktree, porte la fusion et s'enregistre dans le dossier d'origine", async () => {
  const d = depotParallele();
  const r = await launchParallel(d.racine, [A, B], { autoMerge: true });
  assert.equal(r.code, 0, r.message);
  for (const [fiche, nom] of [
    [A, "a"],
    [B, "b"],
  ]) {
    const etat = readState(d.dossier(nom)).state;
    assert.equal(etat.activity, "BUILD");
    assert.equal(etat.active_brief, fiche);
    assert.equal(etat.auto_merge, true);
    assert.equal(etat.queue, undefined, "aucune file dans un worktree : chacun mène sa fiche");
  }
  const origine = readState(d.racine).state;
  assert.equal(origine.activity, "SCOPING");
  assert.deepEqual(origine.parallel, [A, B]);
});

test("QUA-147 une file en parallèle refusée ne crée rien : une fiche, doublon, fiche non prête, recoupement des cadrages", async () => {
  const d = depotParallele();
  const refus = async (fiches, motif) => {
    const r = await launchParallel(d.racine, fiches);
    assert.equal(r.code, 1);
    assert.match(r.message, motif);
    assert.equal(existsSync(d.dossier("a")) || existsSync(d.dossier("b")) || existsSync(d.dossier("c")), false);
    assert.equal(readState(d.racine).state.parallel, undefined);
  };
  await refus([A], /au moins deux fiches/);
  await refus([A, A], /choisie deux fois/);
  await refus([A, FICHE], /ne peut pas entrer dans une file/);
  await refus([A, C], /se recoupent \(src\/commun\.js et src\/commun\.js\)/);
});

test("QUA-147 au plus maxParallel chantiers sont actifs à la fois, ceux d'un autre worktree comptent, et un cadrage recoupé par un actif est refusé", async () => {
  const d = depotParallele({ maxParallel: 2 });
  const trop = await launchParallel(d.racine, [A, B, D]);
  assert.match(trop.message, /0 chantier\(s\) déjà actifs, 3 demandés, au plus 2/);
  assert.equal(existsSync(d.dossier("a")), false);
  assert.equal((await launchInWorktree(d.racine, B)).code, 0);
  const encore = await launchParallel(d.racine, [A, C]);
  assert.match(encore.message, /1 chantier\(s\) déjà actifs, 2 demandés, au plus 2/);
  assert.equal(existsSync(d.dossier("a")), false);
  // Sans réglage : trois à la fois ; C recoupe A, déjà actif dans son worktree.
  const e = depotParallele();
  assert.equal((await launchInWorktree(e.racine, A)).code, 0);
  const recoupe = await launchParallel(e.racine, [B, C]);
  assert.match(recoupe.message, /se recoupent/);
  assert.equal(existsSync(e.dossier("b")), false);
});

test("QUA-147 un lancement qui échoue arrête les suivants sans défaire ceux déjà lancés", async () => {
  const d = depotParallele();
  mkdirSync(d.dossier("b"));
  const r = await launchParallel(d.racine, [A, B]);
  assert.equal(r.code, 1);
  assert.match(r.message, /interrompue à docs\/projects\/b\.md/);
  assert.equal(readState(d.dossier("a")).state.activity, "BUILD");
  assert.deepEqual(readState(d.racine).state.parallel, [A]);
});

test("QUA-147 l'index et le journal des chantiers, que toute clôture modifie, ne font pas recouper deux cadrages", () => {
  const cloture = ["docs/projects/pending.md", "docs/projects/journal.md"];
  const d = depot();
  const fiches = {
    "docs/projects/h1.md": [...cloture, "src/h1.js"],
    "docs/projects/h2.md": [...cloture, "src/h2.js"],
    "docs/projects/h3.md": [...cloture, "src/h1.js"],
  };
  ecrire(d.racine, Object.fromEntries(Object.entries(fiches).map(([f, p]) => [f, PRETE(f, p)])));
  git(d.racine, "add", "-A");
  git(d.racine, "commit", "-q", "-m", "fiches");
  const [h1, h2, h3] = Object.keys(fiches);
  assert.equal(scopesOverlap(d.racine, h1, h2), null, "seuls l'index et le journal sont partagés");
  assert.deepEqual(scopesOverlap(d.racine, h1, h3), { a: "src/h1.js", b: "src/h1.js" }, "un autre fichier partagé recoupe toujours");

  // Dossiers réglés : l'index et le journal réglés sont ignorés, l'index par défaut redevient un fichier comme un autre.
  const e = depot({ dirs: { index: "suivi/index.md", projects: "suivi" } });
  ecrire(e.racine, {
    "suivi/k1.md": PRETE("k1", ["suivi/index.md", "suivi/journal.md", "src/k1.js"]),
    "suivi/k2.md": PRETE("k2", ["suivi/index.md", "suivi/journal.md", "src/k2.js"]),
    "suivi/k3.md": PRETE("k3", ["docs/projects/pending.md", "src/k3.js"]),
    "suivi/k4.md": PRETE("k4", ["docs/projects/pending.md", "src/k4.js"]),
  });
  git(e.racine, "add", "-A");
  git(e.racine, "commit", "-q", "-m", "fiches");
  assert.equal(scopesOverlap(e.racine, "suivi/k1.md", "suivi/k2.md"), null);
  assert.deepEqual(scopesOverlap(e.racine, "suivi/k3.md", "suivi/k4.md"), { a: "docs/projects/pending.md", b: "docs/projects/pending.md" });
});

test("QUA-147 le recoupement des cadrages compare littéraux et motifs, une fiche déjà active ailleurs et un état invalide sont refusés", async () => {
  const d = depot();
  const fiches = {
    "docs/projects/g1.md": ["src/a/*.js", "lib/x.js"],
    "docs/projects/g2.md": ["src/a/b*.js", "doc/*.md"],
    "docs/projects/g3.md": ["src/c/*.js", "lib/x.js"],
    "docs/projects/g4.md": ["src/a/z.js", "src/d/e.js"],
    "docs/projects/g5.md": ["src/q/*.js", "src/r/f.js"],
  };
  ecrire(d.racine, Object.fromEntries(Object.entries(fiches).map(([f, p]) => [f, PRETE(f, p)])));
  git(d.racine, "add", "-A");
  git(d.racine, "commit", "-q", "-m", "fiches");
  const [g1, g2, g3, g4, g5] = Object.keys(fiches);
  assert.deepEqual(scopesOverlap(d.racine, g1, g2), { a: "src/a/*.js", b: "src/a/b*.js" }, "deux motifs de même racine");
  assert.deepEqual(scopesOverlap(d.racine, g1, g3), { a: "lib/x.js", b: "lib/x.js" }, "deux littéraux égaux");
  assert.deepEqual(scopesOverlap(d.racine, g1, g4), { a: "src/a/*.js", b: "src/a/z.js" }, "un motif couvre le littéral");
  assert.deepEqual(scopesOverlap(d.racine, g4, g1), { a: "src/a/z.js", b: "src/a/*.js" }, "un littéral couvert par le motif");
  assert.equal(scopesOverlap(d.racine, g5, g2), null);
  assert.equal(scopesOverlap(d.racine, g5, "docs/projects/absente.md"), null, "fiche absente de HEAD : aucun cadrage");

  const p = depotParallele();
  assert.equal((await launchInWorktree(p.racine, A)).code, 0);
  assert.match((await launchParallel(p.racine, [A, B])).message, /déjà active dans/);
  assert.match((await launchParallel(join(p.racine, "sous"), [A, B])).message, /pas un dépôt git lisible/);
  ecrire(p.racine, {
    ".drwil/state.json": JSON.stringify({
      version: 1,
      activity: "SCOPING",
      active_brief: null,
      active_request: null,
      since: null,
      parallel: "a",
    }),
  });
  assert.match(readState(p.racine).problems.join(), /parallel : liste de fiches attendue/);
});

// Un faux gh qui répond « aucune PR fusionnée » : la fusion d'une branche non fusionnée est alors établie « non ».
function ghSansPr(parent) {
  const bin = join(parent, "bin");
  ecrire(bin, { gh: "#!/bin/sh\necho '[]'\n" });
  chmodSync(join(bin, "gh"), 0o755);
  return `${bin}${delimiter}${process.env.PATH}`;
}

test("QUA-179 « This folder » crée workstream/<fiche> depuis la branche principale à jour, la garde si on y est déjà", () => {
  const d = depot();
  avancerOrigine(d);
  const r = start(d.racine, FICHE, { human: true });
  assert.equal(r.code, 0, r.message);
  assert.match(r.message, /^Branche créée : workstream\/exemple \(depuis origin\/master\)\./);
  assert.equal(git(d.racine, "rev-parse", "--abbrev-ref", "HEAD"), "workstream/exemple");
  assert.ok(existsSync(join(d.racine, "recent.txt")), "la branche part de origin/master à jour");
  assert.equal(git(d.racine, "for-each-ref", "--format=%(upstream)", "refs/heads/workstream/exemple"), "", "pas de suivi de origin/master");
  // Déjà sur la branche du chantier, arbre en cours de travail : gardée, rien de refusé.
  rmSync(join(d.racine, ".drwil", "state.json"));
  ecrire(d.racine, { "travail.txt": "en cours" });
  const garde = start(d.racine, FICHE, { human: true });
  assert.equal(garde.code, 0, garde.message);
  assert.doesNotMatch(garde.message, /Branche créée/);
});

test("QUA-179 la branche part de la principale locale quand elle a des commits que origin n'a pas", () => {
  const d = depot();
  ecrire(d.racine, { "local.txt": "x" });
  git(d.racine, "add", "-A");
  git(d.racine, "commit", "-q", "-m", "local");
  const r = start(d.racine, FICHE, { human: true });
  assert.equal(r.code, 0, r.message);
  assert.match(r.message, /^Branche créée : workstream\/exemple \(depuis master\)\.\n/);
  assert.ok(existsSync(join(d.racine, "local.txt")));
});

test("QUA-179 le lancement est refusé sans rien changer : arbre sale, branche non fusionnée, branche existante, git qui échoue", () => {
  const d = depot();
  const intact = () => {
    assert.equal(existsSync(join(d.racine, ".drwil", "state.json")), false, "l'état n'est pas écrit");
    assert.equal(git(d.racine, "rev-parse", "--abbrev-ref", "HEAD"), actuelle);
  };
  let actuelle = "master";
  ecrire(d.racine, { "sale.txt": "x" });
  const sale = start(d.racine, FICHE, { human: true });
  assert.equal(sale.code, 1);
  assert.match(sale.message, /modifications non commitées/);
  assert.equal(git(d.racine, "branch", "--list", "workstream/*"), "");
  intact();
  rmSync(join(d.racine, "sale.txt"));

  git(d.racine, "branch", "workstream/exemple");
  const prise = start(d.racine, FICHE, { human: true });
  assert.equal(prise.code, 1);
  assert.match(prise.message, /la branche workstream\/exemple existe déjà.*git switch workstream\/exemple/);
  intact();
  git(d.racine, "branch", "-q", "-D", "workstream/exemple");

  git(d.racine, "switch", "-q", "-c", "autre");
  ecrire(d.racine, { "autre.txt": "x" });
  git(d.racine, "add", "-A");
  git(d.racine, "commit", "-q", "-m", "travail non fusionné");
  actuelle = "autre";
  const inconnue = start(d.racine, FICHE, { human: true });
  assert.equal(inconnue.code, 1);
  assert.match(inconnue.message, /^lancement refusé : la fusion de la branche courante autre n'est pas établie \(gh injoignable/);
  intact();
  const chemin = process.env.PATH;
  process.env.PATH = ghSansPr(d.parent);
  const nonFusionnee = start(d.racine, FICHE, { human: true });
  process.env.PATH = chemin;
  assert.equal(nonFusionnee.code, 1);
  assert.match(nonFusionnee.message, /^lancement refusé : la branche courante autre n'est pas fusionnée dans master/);
  intact();
  git(d.racine, "checkout", "-q", "--detach");
  actuelle = "HEAD";
  assert.match(
    start(d.racine, FICHE, { human: true }).message,
    /^lancement refusé : la fusion de la branche courante HEAD n'est pas établie/,
  );
  intact();

  git(d.racine, "switch", "-q", "master");
  actuelle = "master";
  writeFileSync(join(d.racine, ".git", "index.lock"), "");
  const echec = start(d.racine, FICHE, { human: true });
  rmSync(join(d.racine, ".git", "index.lock"));
  assert.equal(echec.code, 1);
  assert.match(echec.message, /^lancement refusé : git switch a échoué/);
  intact();
});

test("QUA-179 une branche déjà fusionnée est quittée, messages anglais ; fetch en échec dit la branche peut-être en retard", () => {
  const d = depot({ lang: "en" });
  git(d.racine, "switch", "-q", "-c", "workstream/ancien");
  ecrire(d.racine, { "ancien.txt": "x" });
  git(d.racine, "add", "-A");
  git(d.racine, "commit", "-q", "-m", "ancien");
  git(d.racine, "switch", "-q", "master");
  git(d.racine, "merge", "-q", "--no-ff", "-m", "fusion", "workstream/ancien");
  git(d.racine, "switch", "-q", "workstream/ancien");
  git(d.racine, "remote", "set-url", "origin", join(d.parent, "absent.git"));
  const r = start(d.racine, FICHE, { human: true });
  assert.equal(r.code, 0, r.message);
  assert.match(
    r.message,
    /^Branch created: workstream\/exemple \(from master\)\.\ngit fetch failed: the branch starts from the local branch master/,
  );
  git(d.racine, "switch", "-q", "master");
  rmSync(join(d.racine, ".drwil", "state.json"));
  git(d.racine, "branch", "-q", "-D", "workstream/exemple");
  git(d.racine, "checkout", "-q", "--detach");
  assert.match(start(d.racine, FICHE, { human: true }).message, /^start refused: the merge of the current branch HEAD is not established/);
  git(d.racine, "switch", "-q", "master");
  ecrire(d.racine, { "sale.txt": "x" });
  assert.match(start(d.racine, FICHE, { human: true }).message, /^start refused: the working tree has uncommitted changes/);
  git(d.racine, "switch", "-q", "-c", "autre2");
  git(d.racine, "add", "-A");
  git(d.racine, "commit", "-q", "-m", "x");
  const chemin = process.env.PATH;
  process.env.PATH = ghSansPr(d.parent);
  const nonFusionnee = start(d.racine, FICHE, { human: true });
  process.env.PATH = chemin;
  assert.match(nonFusionnee.message, /^start refused: the current branch autre2 is not merged into master/);
  git(d.racine, "switch", "-q", "master");
  git(d.racine, "branch", "workstream/exemple");
  assert.match(start(d.racine, FICHE, { human: true }).message, /^start refused: branch workstream\/exemple already exists/);
  git(d.racine, "branch", "-q", "-D", "workstream/exemple");
  writeFileSync(join(d.racine, ".git", "index.lock"), "");
  const echec = start(d.racine, FICHE, { human: true });
  rmSync(join(d.racine, ".git", "index.lock"));
  assert.match(echec.message, /^start refused: git switch failed/);
});

test("QUA-179 sans branche principale locale, le lancement ne crée aucune branche", () => {
  const d = depot();
  git(d.racine, "branch", "-m", "trunk");
  const r = start(d.racine, FICHE, { human: true });
  assert.equal(r.code, 0, r.message);
  assert.equal(git(d.racine, "rev-parse", "--abbrev-ref", "HEAD"), "trunk");
});
