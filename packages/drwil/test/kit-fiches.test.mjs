// Tests du kit, thème fiches : fiches de chantier, cadrage et contrôle de la doc au commit.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { writeFileSync, mkdirSync, appendFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { init } from "../dist/index.js";
import { tmp, quiet, envTest, checks, git, read, config, enAvertissement } from "./kit-commun.mjs";

test("le hook refuse un commit dont la doc cite un chemin inexistant", async () => {
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir }));
  enAvertissement(dir);
  assert.equal(git(dir, "add", "-A").status, 0);
  assert.equal(git(dir, "commit", "-qm", "init", "--allow-empty").status, 0, "premier commit accepté");
  const avant = git(dir, "rev-list", "--count", "HEAD").stdout.trim();
  appendFileSync(join(dir, "docs/ia-first.md"), "\nVoir `docs/inexistant.md` et SEC-999.\n");
  git(dir, "add", "-A");
  const r = git(dir, "commit", "-qm", "casse");
  assert.notEqual(r.status, 0);
  assert.match(r.stdout + r.stderr, /docs\/inexistant\.md/);
  assert.match(r.stdout + r.stderr, /SEC-999/);
  assert.equal(git(dir, "rev-list", "--count", "HEAD").stdout.trim(), avant);
});

test("chemin cité : un fichier ignoré par Git ne vaut pas preuve (local = CI) ; « (si présent) » aussi sur la ligne suivante", async () => {
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir }));
  // Cas du 2026-10-09 : l'état local existe sur le poste, ignoré par Git, donc absent en CI.
  writeFileSync(join(dir, ".drwil/state.json"), "{}\n");
  const docsCheck = () => spawnSync(process.execPath, [".githooks/check-docs.mjs"], { cwd: dir, encoding: "utf8", env: envTest });
  assert.equal(docsCheck().status, 0, "point de départ propre");
  appendFileSync(join(dir, "docs/ia-first.md"), "\nÉtat local : `.drwil/state.json`.\n");
  let r = docsCheck();
  assert.equal(r.status, 1, "ignoré par Git : refusé en local comme en CI");
  assert.match(r.stdout + r.stderr, /\.drwil\/state\.json/);
  // Un fichier suivi par Git reste une preuve valable.
  writeFileSync(join(dir, "docs/ia-first.md"), read(dir, "docs/ia-first.md").replace("`.drwil/state.json`.", "`.drwil/ia-first.json`."));
  assert.equal(docsCheck().status, 0, docsCheck().stdout);
  // « (si présent) » reconnu sur la ligne suivante, après un retour à la ligne.
  writeFileSync(
    join(dir, "docs/ia-first.md"),
    read(dir, "docs/ia-first.md").replace("`.drwil/ia-first.json`.", "`.drwil/state.json`\n(si présent)."),
  );
  r = docsCheck();
  assert.equal(r.status, 0, r.stdout + r.stderr);
});

test("QUA-015 : marqueur de chantier, statut daté, section Reprise, chemin « à créer »", async () => {
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir, git: false }));

  // chemin « à créer » : accepté, pas une erreur.
  appendFileSync(join(dir, "docs/ia-first.md"), "\nÀ écrire : `docs/futur.md` (à créer).\n");
  let r = checks(dir);
  assert.equal(r.status, 0, r.stdout + r.stderr);

  // case ouverte sans marqueur [IA]/[humain]/[décision].
  appendFileSync(join(dir, "docs/projects/pending.md"), "\n## Test\n- [ ] sujet sans marqueur\n");
  r = checks(dir);
  assert.notEqual(r.status, 0);
  assert.match(r.stdout, /pending\.md.*marqueur/);
  // corrigé avant la suite, pour isoler chaque contrôle.
  writeFileSync(
    join(dir, "docs/projects/pending.md"),
    read(dir, "docs/projects/pending.md").replace("- [ ] sujet sans marqueur", "- [ ] [IA] sujet avec marqueur"),
  );

  // fiche de projet sans Statut daté ni section Reprise.
  writeFileSync(join(dir, "docs/projects/mon-chantier.md"), "# Mon chantier\n\nTexte.\n");
  r = checks(dir);
  assert.match(r.stdout, /mon-chantier\.md.*Statut/);
  assert.match(r.stdout, /mon-chantier\.md.*Reprise/);
  writeFileSync(
    join(dir, "docs/projects/mon-chantier.md"),
    "# Mon chantier\n\n**Statut** : 2026-10-04, fait.\n\n## Reprise\n\nRien à reprendre.\n",
  );
  r = checks(dir);
  assert.equal(r.status, 0, r.stdout + r.stderr);

  // modèle et fiche permanente exemptés du contrôle.
  writeFileSync(join(dir, "docs/projects/modele-exemple.md"), "# Modèle\n\nSans statut ni Reprise.\n");
  r = checks(dir);
  assert.equal(r.status, 0, r.stdout + r.stderr);

  // fiche suivant à la lettre le modèle fourni : sections numérotées (« ## 7. Reprise »)
  // et Statut avec date entre parenthèses — doit passer, pas seulement la forme minimale ci-dessus.
  writeFileSync(
    join(dir, "docs/projects/chantier-modele.md"),
    "# Projet : chantier\n\n**Statut** (2026-10-04) : cadré le 2026-10-04 — lot 1 en cours.\n\n## 6. Lots\n\nTexte.\n\n## 7. Reprise\n\n- **Dernier état** (2026-10-04) : rien à signaler.\n",
  );
  r = checks(dir);
  assert.equal(r.status, 0, r.stdout + r.stderr);
});

test("QUA-015 (extension) : fiche terminée encore présente refusée ; case cochée vs fiche ouverte signalée", async () => {
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir, git: false }));

  // « fait » dans le statut ne vaut pas terminée : seul le marqueur explicite compte.
  writeFileSync(
    join(dir, "docs/projects/mon-chantier.md"),
    "# Mon chantier\n\n**Statut** (2026-10-04) : cadré — essai réel fait, lot 2 ouvert.\n\n## Reprise\n\nRien à reprendre.\n",
  );
  appendFileSync(join(dir, "docs/projects/pending.md"), "\n## Test\n- [ ] [IA] sujet en cours `docs/projects/mon-chantier.md`.\n");
  let direct = spawnSync(process.execPath, [".githooks/check-docs.mjs"], { cwd: dir, encoding: "utf8" });
  assert.equal(direct.status, 0, direct.stdout + direct.stderr);
  assert.doesNotMatch(direct.stdout, /mon-chantier\.md/);

  // fiche marquée terminée mais encore là : erreur bloquante (la condenser dans le journal, la supprimer).
  writeFileSync(
    join(dir, "docs/projects/mon-chantier.md"),
    "# Mon chantier\n\n**Statut** : terminé le 2026-10-10.\n\n## Reprise\n\nRien à reprendre.\n",
  );
  direct = spawnSync(process.execPath, [".githooks/check-docs.mjs"], { cwd: dir, encoding: "utf8" });
  assert.equal(direct.status, 1, direct.stdout + direct.stderr);
  assert.match(direct.stdout + direct.stderr, /mon-chantier\.md.*terminée.*journal/);
  rmSync(join(dir, "docs/projects/mon-chantier.md"));
  writeFileSync(
    join(dir, "docs/projects/pending.md"),
    read(dir, "docs/projects/pending.md").replace("- [ ] [IA] sujet en cours `docs/projects/mon-chantier.md`.\n", ""),
  );
  direct = spawnSync(process.execPath, [".githooks/check-docs.mjs"], { cwd: dir, encoding: "utf8" });
  assert.equal(direct.status, 0, direct.stdout + direct.stderr);

  // cas inverse : case cochée mais fiche pas terminée.
  writeFileSync(
    join(dir, "docs/projects/autre-chantier.md"),
    "# Autre chantier\n\n**Statut** (2026-10-04) : cadré, lot 1 en cours.\n\n## Reprise\n\nRien.\n",
  );
  appendFileSync(join(dir, "docs/projects/pending.md"), "- [x] [IA] sujet pas fini `docs/projects/autre-chantier.md`.\n");
  direct = spawnSync(process.execPath, [".githooks/check-docs.mjs"], { cwd: dir, encoding: "utf8" });
  assert.equal(direct.status, 0);
  assert.match(direct.stdout, /autre-chantier\.md.*QUA-015|QUA-015.*autre-chantier\.md/);
});

test("QUA-021 : maturité : une fiche « prête » avec un point [décision] restant, sans lot ou sans critère est refusée ; « à affiner » et sans champ passent", async () => {
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir, git: false }));
  const critere = "## Critères d'acceptation\n\n- Un export vide est refusé [humain]\n\n";
  const fiche = (maturite, points, lots, criteres = critere) =>
    `# Chantier\n\n**Statut** (2026-10-04) : cadré.\n${maturite}\n\n${criteres}## 5. Points à trancher\n\n${points}\n\n## 6. Lots\n\n${lots}\n\n## Reprise\n\nRien.\n`;
  const lancer = () => spawnSync(process.execPath, [".githooks/check-docs.mjs"], { cwd: dir, encoding: "utf8" });
  const ecrire = (texte) => writeFileSync(join(dir, "docs/projects/mon-chantier.md"), texte);
  const lot = "- **Lot 1 — modèle** [IA] : à faire.";

  ecrire(fiche("**Maturité** : prêt", "(aucun.)", lot));
  let r = lancer();
  assert.equal(r.status, 0, r.stdout + r.stderr);

  ecrire(fiche("**Maturité** : prêt", "- [décision] reste à trancher.", lot));
  r = lancer();
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.match(r.stdout + r.stderr, /mon-chantier\.md.*prête.*décision/);

  ecrire(fiche("**Maturité** : prêt", "(aucun.)", "(aucun.)"));
  r = lancer();
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.match(r.stdout + r.stderr, /mon-chantier\.md.*prête.*lot/);

  ecrire(fiche("**Maturité** : prêt", "(aucun.)", lot, ""));
  r = lancer();
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.match(r.stdout + r.stderr, /mon-chantier\.md.*prête.*critère d'acceptation/);
  ecrire(fiche("", "(aucun.)", lot, ""));
  assert.equal(lancer().status, 0);

  ecrire(fiche("**Maturité** : à affiner", "- [décision] reste à trancher.", "(aucun.)"));
  assert.equal(lancer().status, 0);
  ecrire(fiche("", "- [décision] reste à trancher.", "(aucun.)"));
  assert.equal(lancer().status, 0);
});

test("QUA-015 : l'index anglais (pending.md) vérifie aussi le marqueur de chantier", async () => {
  const dir = tmp();
  await quiet(() => init({ targetDir: dir, lang: "en", git: false }));

  // case ouverte sans marqueur [AI]/[human]/[decision], côté anglais.
  appendFileSync(join(dir, "docs/projects/pending.md"), "\n## Test\n- [ ] topic without marker\n");
  let r = checks(dir);
  assert.notEqual(r.status, 0);
  assert.match(r.stdout, /pending\.md.*marker/);

  // corrigé : contrôle vert.
  writeFileSync(
    join(dir, "docs/projects/pending.md"),
    read(dir, "docs/projects/pending.md").replace("- [ ] topic without marker", "- [ ] [AI] topic with marker"),
  );
  r = checks(dir);
  assert.equal(r.status, 0, r.stdout + r.stderr);
});

test("une alternative écrite avec une barre oblique n'est pas prise pour un chemin", async () => {
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir, git: false }));
  appendFileSync(join(dir, "docs/ia-first.md"), "\nChoisir entre `minimal/complet` ou `init/apply` selon le cas.\n");
  const r = checks(dir);
  assert.equal(r.status, 0, r.stdout + r.stderr);
});

test("doublon d'ID dans le registre des contrats", async () => {
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir, git: false }));
  appendFileSync(join(dir, "docs/contracts.md"), "\n| QUA-011 | doublon | — | — |\n");
  const r = checks(dir);
  assert.notEqual(r.status, 0);
  assert.match(r.stdout, /QUA-011.*plusieurs fois/);
});

test("QUA-016 : rappel de cadrage réglé sur bloquant, débloqué par le bloc cadrage", async () => {
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir }));
  enAvertissement(dir);
  writeFileSync(join(dir, ".drwil/ia-first.json"), JSON.stringify({ ...config(dir), scopeReminder: "blocking" }));
  assert.equal(git(dir, "add", "-A").status, 0);
  const rInit = git(dir, "commit", "-qm", "init");
  assert.equal(rInit.status, 0, `premier commit accepté (kit-mechanics.md couvre .githooks/) :\n${rInit.stdout}${rInit.stderr}`);
  // QUA-017 ne tolère que le tout premier commit sur master : les commits suivants de
  // ce test (sans rapport avec le workflow branche/MR testé ailleurs) se font sur une branche.
  assert.equal(git(dir, "checkout", "-qb", "chantier/essai-cadrage").status, 0);

  // un nouveau fichier de code hors de toute fiche bloque le commit.
  mkdirSync(join(dir, "scripts"));
  writeFileSync(join(dir, "scripts/tache.mjs"), "console.log('tache');\n");
  // Le dossier de code figure sur la carte (QUA-040) : ce test éprouve le cadrage, pas la carte.
  appendFileSync(join(dir, "docs/architecture.md"), "\n- `scripts/` — tâches du projet\n");
  git(dir, "add", "-A");
  let r = git(dir, "commit", "-qm", "tache");
  assert.notEqual(r.status, 0);
  assert.match(r.stdout + r.stderr, /scripts\/tache\.mjs.*hors de toute fiche/);

  // rattaché à la fiche « entretien courant », le commit passe.
  writeFileSync(
    join(dir, "docs/projects/routine-maintenance.md"),
    read(dir, "docs/projects/routine-maintenance.md").replace("files:\n-->", "files:\n  - scripts/tache.mjs\n-->"),
  );
  git(dir, "add", "-A");
  r = git(dir, "commit", "-qm", "tache rattachée");
  assert.equal(r.status, 0, r.stdout + r.stderr);

  // un motif de cadrage trop large reste refusé.
  writeFileSync(
    join(dir, "docs/projects/routine-maintenance.md"),
    read(dir, "docs/projects/routine-maintenance.md").replace("  - scripts/tache.mjs", "  - scripts/*"),
  );
  git(dir, "add", "-A");
  r = git(dir, "commit", "-qm", "motif trop large");
  assert.notEqual(r.status, 0);
  assert.match(r.stdout + r.stderr, /motif de cadrage trop large/);
});

test("QUA-016 : réglage par défaut (bloquant) : premier commit accepté, code orphelin refusé ; avertissement toujours possible", async () => {
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir }));
  enAvertissement(dir);
  assert.equal(config(dir).scopeReminder, "blocking", "réglage par défaut écrit à l'installation (docs/projects/journal.md, garde-fous)");
  git(dir, "add", "-A");
  assert.equal(git(dir, "commit", "-qm", "init").status, 0, "les fichiers du kit sont couverts : le premier commit passe");
  // QUA-017 : commit suivant hors du périmètre testé ici, donc sur une branche.
  assert.equal(git(dir, "checkout", "-qb", "chantier/essai-cadrage").status, 0);

  mkdirSync(join(dir, "scripts"));
  writeFileSync(join(dir, "scripts/tache.mjs"), "console.log('tache');\n");
  // Le dossier de code figure sur la carte (QUA-040) : ce test éprouve le cadrage, pas la carte.
  appendFileSync(join(dir, "docs/architecture.md"), "\n- `scripts/` — tâches du projet\n");
  git(dir, "add", "-A");
  const r = git(dir, "commit", "-qm", "tache non cadrée");
  assert.notEqual(r.status, 0, "bloquant par défaut : code hors fiche refusé");
  assert.match(r.stdout + r.stderr, /scripts\/tache\.mjs.*hors de toute fiche/);

  writeFileSync(join(dir, ".drwil/ia-first.json"), JSON.stringify({ ...config(dir), scopeReminder: "warning" }));
  const direct = spawnSync(process.execPath, [".githooks/check-docs.mjs"], { cwd: dir, encoding: "utf8" });
  assert.match(direct.stdout, /scripts\/tache\.mjs.*hors de toute fiche/, "en avertissement : affiché quand même");
  assert.equal(direct.status, 0, "en avertissement : le contrôle reste vert");
});

test("QUA-016 : réglage off, contrôle et rappel à l'agent silencieux", async () => {
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir, tools: "claude", git: false }));
  writeFileSync(join(dir, ".drwil/ia-first.json"), JSON.stringify({ ...config(dir), scopeReminder: "off" }));

  mkdirSync(join(dir, "scripts"));
  writeFileSync(join(dir, "scripts/tache.mjs"), "console.log('tache');\n");
  // Le dossier de code figure sur la carte (QUA-040) : ce test éprouve le cadrage, pas la carte.
  appendFileSync(join(dir, "docs/architecture.md"), "\n- `scripts/` — tâches du projet\n");
  const direct = spawnSync(process.execPath, [".githooks/check-docs.mjs"], { cwd: dir, encoding: "utf8" });
  assert.doesNotMatch(direct.stdout, /hors de toute fiche/);
  assert.equal(direct.status, 0);

  const rappel = spawnSync(process.execPath, [".claude/hooks/scope-reminder.mjs"], {
    cwd: dir,
    encoding: "utf8",
    input: JSON.stringify({ tool_name: "Write", tool_input: { file_path: join(dir, "scripts/tache.mjs") } }),
  });
  assert.equal(rappel.stdout.trim(), "", "le rappel à l'agent se tait aussi quand cadrage est désactivé");
});

test("DRWIL-002 : check-docs refuse un contrat mal formé dès le commit (contrôle inconnu, Règle absente)", async () => {
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir, git: false }));
  const base = read(dir, "docs/contracts.md");
  assert.equal(
    spawnSync(process.execPath, [".githooks/check-docs.mjs"], { cwd: dir, encoding: "utf8" }).status,
    0,
    "le registre livré est valide",
  );
  writeFileSync(join(dir, "docs/contracts.md"), `${base}\n## QUA-020 — mal formé\n**Contrôle** : \`inexistant\`\n`);
  const r = spawnSync(process.execPath, [".githooks/check-docs.mjs"], { cwd: dir, encoding: "utf8" });
  assert.notEqual(r.status, 0);
  assert.match(r.stdout + r.stderr, /QUA-020 : contrôle inconnu « inexistant »/);
  assert.match(r.stdout + r.stderr, /QUA-020 : exigence absente/);
});

test("QUA-154 : installation neuve : barrière de périmètre bloquante ; projet déjà installé : son réglage gardé, avertissement s'il n'en a pas", async () => {
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir, git: false }));
  assert.equal(config(dir).scopeGate, "blocking");
  const sans = { ...config(dir) };
  delete sans.scopeGate;
  writeFileSync(join(dir, ".drwil/ia-first.json"), JSON.stringify(sans, null, 2));
  await quiet(() => init({ lang: "fr", targetDir: dir, git: false }));
  assert.equal(config(dir).scopeGate, "warning", "une mise à jour ne bloque pas des commits du jour au lendemain");
  writeFileSync(join(dir, ".drwil/ia-first.json"), JSON.stringify({ ...config(dir), scopeGate: "off" }, null, 2));
  await quiet(() => init({ lang: "fr", targetDir: dir, git: false }));
  assert.equal(config(dir).scopeGate, "off", "le réglage choisi est gardé");
});
