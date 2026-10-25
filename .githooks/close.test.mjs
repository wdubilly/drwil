import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { close, closingSignals, main, mainBranch, pathToClosing, prunedMessage } from "./close.mjs";
import { intentsLeftBehind } from "./briefs.mjs";
import { twinIntents } from "./doc-coherence.mjs";
import { move, start } from "./state.mjs";

// Voir scope-gate.test.mjs : des GIT_* hérités feraient agir les tests sur le dépôt qui les lance.
for (const nom of Object.keys(process.env)) if (nom.startsWith("GIT_")) delete process.env[nom];

const SCRIPT = fileURLToPath(new URL("./close.mjs", import.meta.url));
let dossiers = [];
afterEach(() => {
  delete process.env.DRWIL_BASE;
  for (const d of dossiers) rmSync(d, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  dossiers = [];
});
const dossier = () => {
  const d = mkdtempSync(join(tmpdir(), "drwil-cloture-"));
  dossiers.push(d);
  return d;
};

const FICHE = "docs/projects/exemple.md";
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
const fiche = (criteres) =>
  `# Projet : Exemple\n\n**Statut** : cadré le 2026-10-18.\n\n<!-- scope\nfiles:\n  - src/a.mjs\n-->\n\n## Critères d'acceptation\n\n${criteres}\n\n## 6. Increments\n\n- **Lot 1** [IA] : tout.\n\n## 7. Reprise\n\nRien.\n`;
const INDEX = [
  "# Index",
  "",
  "- [ ] [IA] Autre chantier — `docs/projects/autre.md`.",
  "- [ ] [IA] Exemple, sur deux lignes",
  "  — `docs/projects/exemple.md`.",
  "- [ ] [IA] Fin.",
  "",
].join("\n");

/**
 * Dépôt git temporaire : master avec un contrat, branche chantier/exemple avec la fiche, l'index et
 * l'état `activite`. Rend la racine.
 */
function depot({ activite = "CLOSING", criteres = "- Un critère — `QUA-001`", lang, index = INDEX, evidence = {} } = {}) {
  const racine = dossier();
  git(racine, "init", "-q", "-b", "master");
  ecrire(racine, {
    ".drwil/ia-first.json": JSON.stringify({ ...(lang ? { lang } : {}), contractPrefixes: ["QUA"] }),
    ".gitignore": ".drwil/state.json\n.drwil/evidence/\n",
    "docs/contracts.md": "# Contrats\n\n## QUA-001 — Un\n",
    "docs/projects/autre.md": "# Autre\n",
  });
  git(racine, "add", "-A");
  git(racine, "commit", "-q", "-m", "initial");
  git(racine, "checkout", "-q", "-b", "chantier/exemple");
  ecrire(racine, { [FICHE]: fiche(criteres), "docs/projects/pending.md": index });
  git(racine, "add", "-A");
  git(racine, "commit", "-q", "-m", "cadrage");
  const etat = { version: 1, activity: activite, active_brief: FICHE, active_request: null, since: null };
  ecrire(racine, { ".drwil/state.json": JSON.stringify(etat) });
  if (evidence) ecrireEvidence(racine, evidence);
  return racine;
}

/**
 * Dernière évidence de `drwil verify --evidence` (hors git) : ce que la clôture recopie dans la
 * preuve de clôture, jamais un jugement refait par elle.
 */
function ecrireEvidence(racine, { statut = "pass", commit, contrats } = {}) {
  const contenu = {
    status: statut,
    commit: commit ?? git(racine, "rev-parse", "HEAD"),
    dirtyWorktree: false,
    evidence: contrats ?? [
      {
        id: "QUA-001",
        status: "pass",
        checks: [{ id: "tests-qua-001", status: "ok", summary: "ok" }],
        manual: null,
        covers: ["src/**"],
        coverage: { "src/a.mjs": "ab12cd34" },
      },
    ],
  };
  ecrire(racine, { ".drwil/evidence/verify-2026-10-18T10-00-00-000Z.json": JSON.stringify(contenu) });
}

/** Dossier de journaux de Claude Code avec une réponse sur la branche du chantier. */
function journaux() {
  const d = dossier();
  const usage = { input_tokens: 10, output_tokens: 100, cache_read_input_tokens: 1000, cache_creation_input_tokens: 50 };
  const ligne = { type: "assistant", requestId: "r1", timestamp: "2026-10-18T10:00:00Z", gitBranch: "chantier/exemple" };
  writeFileSync(join(d, "s.jsonl"), `${JSON.stringify({ ...ligne, message: { model: "claude-opus-5-5", usage } })}\n`);
  return d;
}

test("QUA-048 : en CLOSING, la commande fait la mécanique d'un geste — fiche supprimée, ligne d'index retirée, consommation consignée — sans rien commiter", () => {
  const racine = depot();
  const r = close(racine, { logs: journaux() });
  assert.equal(r.code, 0, r.message);
  assert.ok(!existsSync(join(racine, FICHE)), "fiche supprimée");
  const index = readFileSync(join(racine, "docs/projects/pending.md"), "utf8");
  assert.doesNotMatch(index, /exemple/, "l'élément d'index et sa ligne de suite retirés");
  assert.match(index, /autre\.md`\.\n- \[ \] \[IA\] Fin\./, "les autres éléments restent");
  const usage = readFileSync(join(racine, ".drwil/usage.jsonl"), "utf8");
  assert.match(usage, /"workstream":"exemple"/);
  assert.match(r.message, /fiche supprimée : docs\/projects\/exemple\.md/);
  assert.match(r.message, /ligne d'index retirée/);
  assert.match(r.message, /Rien ne ferait échouer la clôture\.\nReste à l'agent : l'entrée du journal/);
  assert.equal(git(racine, "log", "--oneline").split("\n").length, 2, "aucun commit");
  assert.equal(git(racine, "diff", "--cached", "--name-only"), "", "rien d'indexé");
  // Relancée : rien à refaire, la consommation n'est jamais consignée deux fois.
  const encore = close(racine, { logs: journaux() });
  assert.match(encore.message, /aucune ligne d'index à retirer/);
  assert.match(encore.message, /déjà une ligne pour « exemple »/);
});

test("QUA-048 : hors CLOSING, la mécanique est refusée ; --check signale sans rien écrire ; sans fiche, refus", () => {
  const racine = depot({ activite: "BUILD" });
  const refus = close(racine);
  assert.equal(refus.code, 1);
  assert.match(refus.message, /clôture refusée : activité BUILD/);
  assert.ok(existsSync(join(racine, FICHE)));
  const verif = close(racine, { check: true });
  assert.equal(verif.code, 0, verif.message);
  assert.match(verif.message, /^Rien ne ferait échouer la clôture\.\nChemin jusqu'à CLOSING/);
  assert.ok(existsSync(join(racine, FICHE)));
  ecrire(racine, {
    ".drwil/state.json": JSON.stringify({ version: 1, activity: "SCOPING", active_brief: null, active_request: null, since: null }),
  });
  assert.match(close(racine).message, /aucune fiche active ni fiche donnée/);
  assert.equal(close(racine, { brief: FICHE, check: true }).code, 0, "une fiche donnée se vérifie hors chantier");
});

test("QUA-048 : critère encore « contrat à créer » signalé avec l'ID à écrire — contrat créé sur la branche, plusieurs candidats ou aucun", () => {
  const criteres = "- Un export vide est refusé — contrat à créer\n- Déjà prouvé — contrat à créer `QUA-001`";
  const racine = depot({ activite: "BUILD", criteres });
  let r = close(racine, { check: true });
  assert.equal(r.code, 1);
  assert.match(r.message, /critère « Un export vide est refusé » encore « contrat à créer » : .*l'ID du contrat, une fois créé/);
  assert.doesNotMatch(r.message, /Déjà prouvé/, "un critère déjà lié n'est plus à créer");
  ecrire(racine, { "docs/contracts.md": "# Contrats\n\n## QUA-001 — Un\n\n## QUA-002 — Deux\n" });
  r = close(racine, { check: true });
  assert.match(r.message, /\(docs\/projects\/exemple\.md\), `QUA-002`/);
  ecrire(racine, { "docs/contracts.md": "# Contrats\n\n## QUA-001 — Un\n\n## QUA-002 — Deux\n\n## QUA-003 — Trois\n" });
  assert.match(close(racine, { check: true }).message, /l'ID du contrat créé \(QUA-002 ou QUA-003\)/);
  const long = depot({ activite: "BUILD", criteres: `- ${"x".repeat(80)} — contrat à créer` });
  assert.match(close(long, { check: true }).message, /« x{69}… » encore/, "un critère long est abrégé");
});

test("QUA-048 : références qui deviendraient mortes et noms de fichiers sans chemin signalés avant le commit", () => {
  const racine = depot({ activite: "BUILD" });
  ecrire(racine, {
    "docs/projects/autre.md": "# Autre\n\nVoir `docs/projects/exemple.md`.\n",
    "docs/projects/journal.md": [
      "Nom nu : `close.mjs` ; présent : `README.md` ; relatif : `autre.md` ; prévu : `neuf.mjs` (à créer) ;",
      "pas un nom : `-x.md`.",
      "facultatif : `option.md` (si présent).",
    ].join("\n"),
    "README.md": "x\n",
  });
  const r = close(racine, { check: true });
  assert.equal(r.code, 1);
  assert.match(r.message, /docs\/projects\/autre\.md:3 cite docs\/projects\/exemple\.md, qui sera supprimée/);
  assert.doesNotMatch(r.message, /pending\.md:\d+ cite/, "l'élément d'index est retiré par la commande");
  assert.match(r.message, /docs\/projects\/journal\.md:1 : `close\.mjs` sans chemin/);
  assert.doesNotMatch(r.message, /`(README|autre|neuf|option|-x)\./);
  assert.deepEqual(closingSignals(racine, "docs/projects/absente.md"), [
    "docs/projects/journal.md : l'entrée de journal du chantier ne cite pas `docs/preuves/absente.md` — la preuve de clôture se cite depuis le journal",
    "docs/projects/journal.md:1 : `close.mjs` sans chemin, refusé par check-docs — écrire son chemin depuis la racine",
  ]);
});

test("QUA-048 : un élément d'index commun à plusieurs fiches n'est pas retiré, il est signalé", () => {
  const index = "# Index\n\n- [ ] [IA] Deux fiches — `docs/projects/exemple.md`, `docs/projects/autre.md`.\n";
  const racine = depot({ index });
  const r = close(racine, { logs: dossier() });
  assert.match(r.message, /aucune ligne d'index à retirer pour docs\/projects\/exemple\.md .*commune à plusieurs fiches/);
  assert.match(r.message, /pending\.md:3 cite docs\/projects\/exemple\.md/);
  assert.equal(readFileSync(join(racine, "docs/projects/pending.md"), "utf8"), index);
});

test("QUA-048 : start supprime les branches fusionnées et le dit ; move vers EVIDENCE signale les pièges de la clôture", async () => {
  const racine = depot({ activite: "SCOPING", criteres: "- Refusé — contrat à créer" });
  git(racine, "checkout", "-q", "master");
  git(racine, "merge", "-q", "--no-ff", "-m", "fusion", "chantier/exemple");
  git(racine, "checkout", "-q", "-b", "fini");
  ecrire(racine, { "y.txt": "y" });
  git(racine, "add", "-A");
  git(racine, "commit", "-q", "-m", "fini");
  git(racine, "checkout", "-q", "master");
  git(racine, "merge", "-q", "--no-ff", "-m", "fusion", "fini");
  const r = start(racine, FICHE, { human: true });
  assert.equal(r.code, 0, r.message);
  assert.match(r.message, /branches locales fusionnées supprimées : chantier\/exemple, fini/);
  const m = await move(racine, { to: "EVIDENCE" });
  assert.equal(m.code, 0, m.message);
  assert.match(m.message, /BUILD → EVIDENCE\nCe qui ferait échouer la clôture.*move BUILD`\) :\n {2}⚠ critère « Refusé »/);
  assert.doesNotMatch((await move(racine, { to: "VERIFY" })).message, /ferait échouer/, "seulement en quittant BUILD");
});

test("QUA-048 : ligne de commande — usage, --check, refus et racine du projet ; messages en anglais", () => {
  const racine = depot({ activite: "BUILD", lang: "en" });
  const lancer = (...args) =>
    spawnSync(process.execPath, [SCRIPT, ...args], { encoding: "utf8", env: { ...process.env, DRWIL_ROOT: racine } });
  assert.match(lancer("--inconnu").stderr, /^usage: node \.githooks\/close\.mjs/);
  assert.equal(lancer("a.md", "b.md").status, 2);
  const verif = lancer("--check");
  assert.equal(verif.status, 0);
  assert.match(verif.stdout, /^Nothing would make the closing fail\.\nPath to CLOSING, in order:\n/);
  const refus = lancer();
  assert.equal(refus.status, 1);
  assert.match(refus.stderr, /closing refused: activity BUILD/);
  ecrire(racine, {
    ".drwil/state.json": JSON.stringify({ version: 1, activity: "CLOSING", active_brief: FICHE, active_request: null, since: null }),
  });
  const fin = lancer("--logs", journaux());
  assert.equal(fin.status, 0, fin.stderr);
  assert.match(
    fin.stdout,
    /^closing proof written: docs\/preuves\/exemple\.md\nbrief deleted: docs\/projects\/exemple\.md\nindex line removed: docs\/projects\/pending\.md\nconsumption: "exemple" recorded/,
  );
  assert.match(fin.stdout, /Left to the agent: the journal entry/);
  const sortie = [];
  const { log } = console;
  console.log = (m) => sortie.push(m);
  try {
    assert.equal(main(["--check", FICHE], racine), 0);
  } finally {
    console.log = log;
  }
  assert.deepEqual(sortie, ["Nothing would make the closing fail."], "en CLOSING, aucun chemin à dire");
});

test("QUA-048 : en anglais, dossiers réglés, sans branche principale ni registre ni index ; journaux lus selon l'environnement", () => {
  const racine = dossier();
  git(racine, "init", "-q", "-b", "tronc");
  const reglage = { lang: "en", dirs: { index: "docs/idx.md", contracts: "docs/reg.md" } };
  ecrire(racine, { ".drwil/ia-first.json": JSON.stringify(reglage), [FICHE]: fiche("- Refused — contract to create") });
  git(racine, "add", "-A");
  git(racine, "commit", "-q", "-m", "initial");
  ecrire(racine, {
    "docs/notes.md": "See `docs/projects/exemple.md` and `nu.mjs`.\n",
    ".drwil/state.json": JSON.stringify({ version: 1, activity: "CLOSING", active_brief: FICHE, active_request: null, since: null }),
  });
  ecrireEvidence(racine);
  assert.equal(mainBranch(racine), null);
  let r = close(racine, { check: true });
  assert.match(
    r.message,
    /^Before the commit, what would make the closing fail:\n {2}⚠ criterion « Refused » still « contract to create »: write, in backticks at the end of this criterion \(docs\/projects\/exemple\.md\), the contract's ID, once created in the registry/,
  );
  assert.match(r.message, /docs\/notes\.md:1 cites docs\/projects\/exemple\.md, which will be deleted/);
  assert.match(r.message, /docs\/notes\.md:1: `nu\.mjs` without a path, refused by check-docs/);
  ecrire(racine, { "docs/reg.md": "# Contracts\n\n## QUA-001 — One\n\n## SEC-001 — Two\n" });
  assert.match(close(racine, { check: true }).message, /the ID of the contract created \(QUA-001 or SEC-001\)/, "préfixes par défaut");
  r = close(racine, { env: { ...process.env, CLAUDE_CONFIG_DIR: dossier() } });
  assert.match(
    r.message,
    /^closing proof written: docs\/preuves\/exemple\.md\nbrief deleted: docs\/projects\/exemple\.md\nno index line to remove for docs\/projects\/exemple\.md in docs\/idx\.md/,
  );
  assert.match(r.message, /consumption: no readable session log/);
  assert.equal(prunedMessage(racine, { deleted: ["a", "b"], unproven: [] }), "\nmerged local branches deleted: a, b");
  assert.match(prunedMessage(racine, { deleted: [], unproven: ["c"] }), /^\ngh unreachable: .*classic merge only.*kept: c/);
});

test("QUA-073 : hors CLOSING, la clôture et --check nomment les commandes restantes dans l'ordre, et l'évidence périmée ou absente à renouveler", () => {
  const racine = depot({ activite: "BUILD", evidence: false });
  const renouveler = "`npx drwil verify --evidence`";
  const etapes = (activite) =>
    pathToClosing(racine, activite)
      .split("\n")
      .slice(1)
      .map((l) => l.trim());
  const sansEvidence = etapes("BUILD");
  assert.equal(sansEvidence.length, 4);
  assert.deepEqual(
    [sansEvidence[0], sansEvidence[1], sansEvidence[3]],
    ["node .githooks/state.mjs move EVIDENCE", "node .githooks/state.mjs move VERIFY", "node .githooks/state.mjs move CLOSING"],
  );
  assert.match(
    sansEvidence[2],
    /^`npx drwil verify --evidence` \(l'évidence ne date pas de HEAD/,
    "sans évidence : à produire avant CLOSING",
  );
  assert.equal(etapes("VERIFY").at(-1), "node .githooks/state.mjs move CLOSING");
  assert.equal(pathToClosing(racine, "CLOSING"), null);
  assert.equal(pathToClosing(racine, "SCOPING"), null, "avant BUILD, la clôture n'est pas à portée de l'agent");

  const refus = close(racine);
  assert.equal(refus.code, 1);
  assert.match(
    refus.message,
    /clôture refusée : activité BUILD[^\n]*\nChemin jusqu'à CLOSING, dans l'ordre :\n {2}node .* move EVIDENCE\n/,
  );
  assert.match(close(racine, { check: true }).message, /move VERIFY\n/);

  // Évidence du HEAD courant, propre : plus rien à renouveler ; d'un autre commit : à renouveler.
  const head = git(racine, "rev-parse", "HEAD");
  const evidence = (commit) =>
    ecrire(racine, {
      ".drwil/evidence/verify-2026-10-20T10-00-00Z.json": JSON.stringify({ commit, dirtyWorktree: false, status: "pass", criteria: [] }),
    });
  evidence(head);
  assert.doesNotMatch(pathToClosing(racine, "BUILD"), /verify --evidence/);
  evidence("0".repeat(40));
  assert.ok(pathToClosing(racine, "VERIFY").includes(renouveler));
  assert.equal(pathToClosing(racine, "VERIFY").indexOf(renouveler) < pathToClosing(racine, "VERIFY").indexOf("move CLOSING"), true);

  const anglais = depot({ activite: "EVIDENCE", lang: "en" });
  assert.match(close(anglais).message, /closing refused: activity EVIDENCE[^\n]*\nPath to CLOSING, in order:\n {2}node .* move VERIFY\n/);
});

test("QUA-073 : l'avertissement d'intention compare à la branche entière — intention touchée dans un commit précédent, jamais touchée, retirée", () => {
  const racine = depot({ activite: "CLOSING" });
  ecrire(racine, {
    "docs/intentions/origine.md": "# Intention\n",
    "docs/projects/autre.md": "# Autre\n\n**Intention** : `docs/intentions/origine.md`\n",
  });
  git(racine, "checkout", "-q", "master");
  git(racine, "add", "-A");
  git(racine, "commit", "-q", "-m", "intention");
  git(racine, "checkout", "-q", "chantier/exemple");
  git(racine, "rebase", "-q", "master");
  ecrire(racine, { [FICHE]: `${readFileSync(join(racine, FICHE), "utf8")}\n**Intention** : \`docs/intentions/origine.md\`\n` });
  git(racine, "commit", "-qam", "lien");
  git(racine, "rm", "-q", FICHE);
  assert.deepEqual(
    intentsLeftBehind(racine, [FICHE]),
    [{ brief: FICHE, intent: "docs/intentions/origine.md" }],
    "jamais touchée sur la branche",
  );
  git(racine, "reset", "-q", "--hard");
  ecrire(racine, { "docs/intentions/origine.md": "# Intention\n\nMise à jour.\n" });
  git(racine, "commit", "-qam", "met à jour l'intention");
  git(racine, "rm", "-q", FICHE);
  assert.deepEqual(intentsLeftBehind(racine, [FICHE]), [], "touchée par un commit précédent de la branche");
  git(racine, "reset", "-q", "--hard");
  git(racine, "rm", "-q", "docs/intentions/origine.md");
  git(racine, "commit", "-qm", "retire l'intention");
  git(racine, "rm", "-q", FICHE);
  assert.deepEqual(intentsLeftBehind(racine, [FICHE]), [], "intention retirée sur la branche");
});

test("QUA-074 : un index et des fiches incohérents sont refusés en un seul message, avec la correction en diff — rien n'est écrit sans --fix", () => {
  const index = [
    INDEX.trimEnd(),
    "- [x] [IA] Autre, cochée à tort — `docs/projects/autre.md`",
    "- [x] [IA] Deux fiches — `docs/projects/autre.md` `docs/projects/vieille.md`",
    "",
  ].join("\n");
  const racine = depot({ activite: "BUILD", index });
  ecrire(racine, {
    "docs/projects/autre.md": "# Autre\n\n**Statut** : terminé le 2026-10-01.\n",
    "docs/projects/vieille.md": "# Vieille\n\n**Statut** : en cours (2026-10-01)\n",
    "docs/recipes/r.md": "Voir `docs/intentions/retiree.md`.\n",
    "src/code.mjs": "// voir docs/projects/autre.md\n",
    "ci.yml": `# voir ${FICHE}\n`,
  });
  git(racine, "add", "-A");
  git(racine, "commit", "-q", "-m", "écarts");
  const avant = readFileSync(join(racine, "docs/projects/pending.md"), "utf8");
  const r = close(racine, { check: true });
  assert.equal(r.code, 1);
  assert.match(r.message, /pending\.md:3 : case ouverte mais la fiche docs\/projects\/autre\.md se dit déjà terminée/);
  assert.match(r.message, /src\/code\.mjs:1 cite la fiche de chantier docs\/projects\/autre\.md : réécrire ce commentaire/);
  assert.match(r.message, /r\.md:1 cite docs\/intentions\/retiree\.md, déjà retirée/);
  assert.match(r.message, /pending\.md:8 : .* — à corriger à la main \(la case dépend de plusieurs fiches/);
  assert.match(r.message, /ci\.yml:1 cite docs\/projects\/exemple\.md, qui sera supprimée/);
  assert.match(r.message, /Corrections proposées, rien n'est écrit/);
  assert.match(r.message, / {4}- - \[ \] \[IA\] Autre chantier — `docs\/projects\/autre\.md`\.\n {4}\+ - \[x\] \[IA\] Autre chantier/);
  assert.equal(readFileSync(join(racine, "docs/projects/pending.md"), "utf8"), avant);
  const corrige = close(racine, { check: true, fix: true });
  assert.match(corrige.message, /corrections appliquées : 2/);
  assert.match(readFileSync(join(racine, "docs/projects/pending.md"), "utf8"), /- \[x\] \[IA\] Autre chantier/);
  assert.equal(readFileSync(join(racine, "docs/recipes/r.md"), "utf8"), "Voir.\n");
  assert.equal(corrige.code, 1, "le code, à réécrire à la main, bloque encore");
  assert.doesNotMatch(corrige.message, /Corrections proposées/);
  assert.equal(close(racine, { check: true }).message.includes("case ouverte"), false);
});

test("QUA-074 : les messages de la clôture suivent la langue du projet (anglais)", () => {
  const index = [INDEX.trimEnd(), "- [x] [IA] Other — `docs/projects/autre.md`", ""].join("\n");
  const racine = depot({ activite: "BUILD", lang: "en", index });
  ecrire(racine, {
    "docs/projects/autre.md": "# Autre\n\n**Status**: closed 2026-10-01.\n",
    "docs/recipes/r.md": "See `docs/intentions/gone.md`.\n",
    "src/code.mjs": "// see docs/projects/autre.md\n",
  });
  git(racine, "add", "-A");
  git(racine, "commit", "-q", "-m", "gaps");
  const r = close(racine, { check: true });
  assert.match(r.message, /already removed|cites docs\/intentions\/gone\.md/);
  assert.match(r.message, /Proposed corrections/);
  assert.match(r.message, /workstream brief/);
  assert.match(close(racine, { check: true, fix: true }).message, /corrections applied: \d/);
});

test("QUA-077 : références à la fiche réorientées vers le journal, intention non touchée refusée, doublon d'intention seulement signalé", () => {
  const racine = depot();
  ecrire(racine, {
    "docs/projects/journal.md": "# Journal\n\n## exemple\n\nPreuve : `docs/preuves/exemple.md`.\n",
    "docs/recipes/r.md": "Fiche : `docs/projects/exemple.md`.\n",
    "docs/intentions/origine.md": "# Origine\n\nCite `src/a.mjs`.\n",
    "docs/projects/exemple.md": fiche("- Un critère — `QUA-001`").replace(
      "# Projet : Exemple",
      "# Projet : Exemple\n\n**Intention** : `docs/intentions/origine.md`",
    ),
  });
  git(racine, "add", "-A");
  git(racine, "commit", "-q", "-m", "origine");
  ecrireEvidence(racine);
  // L'intention d'origine existe avant le chantier : la base de comparaison est ce commit.
  process.env.DRWIL_BASE = git(racine, "rev-parse", "HEAD");
  ecrire(racine, { "docs/intentions/neuve.md": "# Neuve\n\nCite `src/a.mjs`.\n" });
  const r = close(racine, { logs: journaux() });
  assert.equal(r.code, 1);
  assert.match(r.message, /sans que son intention docs\/intentions\/origine\.md soit touchée/);
  assert.match(r.message, /r\.md:1 cite docs\/projects\/exemple\.md, qui sera supprimée : à réorienter vers le journal/);
  assert.match(
    r.message,
    /Avertissements \(non bloquants\) :\n {2}⚠ src\/a\.mjs : cité par docs\/intentions\/neuve\.md, déjà cité par docs\/intentions\/origine\.md/,
  );
  ecrire(racine, { "docs/intentions/origine.md": "# Origine mise à jour\n\nCite `src/a.mjs`.\n" });
  const fin = close(racine, { fix: true, logs: journaux() });
  assert.equal(fin.code, 0, fin.message);
  assert.equal(readFileSync(join(racine, "docs/recipes/r.md"), "utf8"), "Fiche : `docs/projects/journal.md`.\n");
});

test("QUA-076 : --fix est accepté par la ligne de commande, une option inconnue reste refusée", () => {
  const racine = depot({ activite: "BUILD" });
  const lancer = (...args) =>
    spawnSync(process.execPath, [SCRIPT, ...args], { encoding: "utf8", env: { ...process.env, DRWIL_ROOT: racine } });
  assert.equal(lancer("--check", "--fix").status, 0);
  assert.equal(lancer("--fixe").status, 2);
});

test("QUA-084 : la clôture écrit la preuve versionnée du chantier — critères, contrats, contrôles, commit vérifié et empreinte des fichiers couverts", () => {
  const racine = depot({ criteres: "- Un critère — `QUA-001`\n- Relu [humain] — `QUA-002`" });
  const head = git(racine, "rev-parse", "HEAD");
  const r = close(racine, { logs: journaux() });
  assert.equal(r.code, 0, r.message);
  assert.match(r.message, /^preuve de clôture écrite : docs\/preuves\/exemple\.md/);
  const preuve = readFileSync(join(racine, "docs/preuves/exemple.md"), "utf8");
  assert.match(preuve, /^# Preuve de clôture — exemple/);
  assert.match(preuve, new RegExp(`\\*\\*Commit vérifié\\*\\* : \`${head.slice(0, 10)}\` — verdict \`drwil verify\` : PASS`));
  assert.match(preuve, /\| Un critère \| `QUA-001` \| `tests-qua-001` \| `sha256:[0-9a-f]{16}` \(1 fichier\(s\)\) \|/);
  assert.match(preuve, /\| Relu \[humain\] \| `QUA-002` \| — \| — \|/, "un contrat absent de l'évidence : rien d'inventé");
  assert.ok(!existsSync(join(racine, FICHE)), "la fiche n'est supprimée qu'une fois la preuve écrite");
});

test("QUA-084 : sans évidence du commit vérifié, la clôture est refusée et la fiche reste ; l'entrée de journal doit citer la preuve", () => {
  const sansEvidence = depot({ evidence: false });
  const r = close(sansEvidence, { logs: journaux() });
  assert.equal(r.code, 1);
  assert.match(r.message, /^clôture refusée : la preuve de clôture ne peut pas être écrite — aucune évidence/);
  assert.ok(existsSync(join(sansEvidence, FICHE)), "aucune fiche supprimée sans sa preuve");
  assert.ok(!existsSync(join(sansEvidence, "docs/preuves/exemple.md")));

  const perimee = depot({ evidence: { commit: "0".repeat(40) } });
  assert.match(close(perimee, {}).message, /ne date pas de HEAD : la renouveler/);
  assert.ok(existsSync(join(perimee, FICHE)));

  const echouee = depot({ evidence: { statut: "fail" } });
  assert.match(close(echouee, {}).message, /le verdict de la dernière évidence est FAIL/);

  // Entrée de journal : la preuve se cite, sinon elle est introuvable depuis le journal.
  const racine = depot({ activite: "BUILD" });
  ecrire(racine, { "docs/projects/journal.md": "# Journal\n\n## exemple\n\nFait.\n" });
  assert.ok(
    closingSignals(racine, FICHE).some((s) => /ne cite pas `docs\/preuves\/exemple\.md`/.test(s)),
    "le journal qui ne cite pas la preuve ferait échouer la clôture",
  );
  ecrire(racine, { "docs/projects/journal.md": "# Journal\n\n## exemple\n\nPreuve : `docs/preuves/exemple.md`.\n" });
  assert.deepEqual(closingSignals(racine, FICHE), []);
});

test("QUA-084 : la preuve suit la langue du projet, dit quand il n'y a aucun critère, et refuse la clôture si elle ne peut pas être écrite", () => {
  const anglais = depot({ lang: "en", criteres: "- A criterion — `QUA-001`" });
  assert.equal(close(anglais, { logs: journaux() }).code, 0);
  const preuve = readFileSync(join(anglais, "docs/preuves/exemple.md"), "utf8");
  assert.match(preuve, /^# Closing proof — exemple/);
  assert.match(preuve, /\*\*Closed on\*\*: \d{4}-\d\d-\d\d/);
  assert.match(preuve, /\*\*Verified commit\*\*: `[0-9a-f]{10}` — `drwil verify` verdict: PASS/);
  assert.match(preuve, /\| Criterion \| Contract \| Check \| Fingerprint of the covered files \|/);
  assert.match(preuve, /\| A criterion \| `QUA-001` \| `tests-qua-001` \| `sha256:[0-9a-f]{16}` \(1 file\(s\)\) \|/);

  // Évidence sans tableau de contrats, et contrat prouvé sans contrôle ni couverture : rien d'inventé.
  const sansDetail = depot({ evidence: { contrats: [{ id: "QUA-001", status: "pass" }] } });
  assert.equal(close(sansDetail, { logs: journaux() }).code, 0);
  assert.match(readFileSync(join(sansDetail, "docs/preuves/exemple.md"), "utf8"), /\| Un critère \| `QUA-001` \| — \| — \|/);

  const horsTableau = depot({ evidence: { contrats: { "QUA-001": "pass" } } });
  assert.equal(close(horsTableau, { logs: journaux() }).code, 0);

  const sansVerdict = depot({ evidence: { statut: null } });
  assert.match(close(sansVerdict, {}).message, /le verdict de la dernière évidence est \?/);

  const sansCritere = depot({ criteres: "_rien_" });
  assert.equal(close(sansCritere, { logs: journaux() }).code, 0);
  assert.match(readFileSync(join(sansCritere, "docs/preuves/exemple.md"), "utf8"), /_aucun critère d'acceptation_/);

  // Dossier des preuves occupé par un fichier : la preuve ne peut pas être écrite, rien n'est supprimé.
  const bloque = depot({ lang: "en" });
  const reglages = { lang: "en", contractPrefixes: ["QUA"], dirs: { proofs: "occupe/preuves", projects: "docs/projects" } };
  ecrire(bloque, { ".drwil/ia-first.json": JSON.stringify(reglages), occupe: "x" });
  const r = close(bloque, { logs: journaux() });
  assert.equal(r.code, 1);
  assert.match(r.message, /^closing refused: the closing proof cannot be written — occupe\/preuves\/exemple\.md:/);
  assert.ok(existsSync(join(bloque, FICHE)), "aucune fiche supprimée quand sa preuve ne peut pas être écrite");

  const bloqueFr = depot({});
  const reglagesFr = { contractPrefixes: ["QUA"], dirs: { proofs: "occupe/preuves" } };
  ecrire(bloqueFr, { ".drwil/ia-first.json": JSON.stringify(reglagesFr), occupe: "x" });
  assert.match(
    close(bloqueFr, {}).message,
    /^clôture refusée : la preuve de clôture ne peut pas être écrite — occupe\/preuves\/exemple\.md :/,
  );

  const perimeeEn = depot({ lang: "en", evidence: { commit: "0".repeat(40) } });
  assert.match(close(perimeeEn, {}).message, /is not from HEAD: renew it/);
  const echoueeEn = depot({ lang: "en", evidence: { statut: "fail" } });
  assert.match(close(echoueeEn, {}).message, /the latest evidence's verdict is FAIL/);

  // Journal d'un projet anglais : la preuve s'y cite aussi.
  const journal = depot({ activite: "BUILD", lang: "en" });
  ecrire(journal, { "docs/projects/journal.md": "# Journal\n" });
  assert.ok(closingSignals(journal, FICHE).some((s) => /does not cite `docs\/preuves\/exemple\.md`/.test(s)));
});

/** Journaux de Claude Code avec `n` réponses sur la branche du chantier (le total d'un chantier rouvert grandit). */
function journauxDe(n) {
  const d = dossier();
  const usage = { input_tokens: 10, output_tokens: 100, cache_read_input_tokens: 1000, cache_creation_input_tokens: 50 };
  const lignes = Array.from({ length: n }, (_, i) => ({
    type: "assistant",
    requestId: `r${i}`,
    timestamp: `2026-10-18T10:0${i}:00Z`,
    gitBranch: "chantier/exemple",
    message: { model: "claude-opus-5-5", usage },
  }));
  writeFileSync(join(d, "s.jsonl"), lignes.map((l) => JSON.stringify(l)).join("\n") + "\n");
  return d;
}

const lignesDe = (racine, chantier) =>
  readFileSync(join(racine, ".drwil/usage.jsonl"), "utf8")
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l))
    .filter((l) => l.workstream === chantier);

/** Première clôture commitée, puis réouverture (fiche restaurée, correctif commité) et nouvelle évidence : état CLOSING rouvert. */
function depotRouvert(options) {
  const racine = depot(options);
  assert.equal(close(racine, { logs: journauxDe(1) }).code, 0);
  ecrire(racine, { "docs/projects/journal.md": "# Journal\n\n## exemple\n\nPreuve : `docs/preuves/exemple.md`.\n" });
  git(racine, "add", "-A");
  git(racine, "commit", "-q", "-m", "clôture");
  const premiere = readFileSync(join(racine, "docs/preuves/exemple.md"), "utf8");
  git(racine, "checkout", "-q", "HEAD~1", "--", FICHE);
  git(racine, "commit", "-q", "-m", "réouverture");
  ecrire(racine, { "src/a.mjs": "correctif\n" });
  git(racine, "add", "-A");
  git(racine, "commit", "-q", "-m", "correctif");
  const etat = { version: 1, activity: "CLOSING", active_brief: FICHE, active_request: null, since: null, reopened: { pr: 42 } };
  ecrire(racine, { ".drwil/state.json": JSON.stringify(etat) });
  ecrireEvidence(racine);
  return { racine, premiere };
}

test("QUA-118 : la nouvelle clôture d'un chantier rouvert remplace sa ligne de consommation et réécrit la preuve sur le nouveau commit vérifié", () => {
  const { racine, premiere } = depotRouvert();
  assert.equal(lignesDe(racine, "exemple")[0].requests, 1);
  const head = git(racine, "rev-parse", "HEAD");
  const r = close(racine, { logs: journauxDe(3) });
  assert.equal(r.code, 0, r.message);
  const lignes = lignesDe(racine, "exemple");
  assert.equal(lignes.length, 1, "une seule ligne de consommation, jamais doublée");
  assert.equal(lignes[0].requests, 3, "le nouveau total du chantier, journaux relus en entier");
  const preuve = readFileSync(join(racine, "docs/preuves/exemple.md"), "utf8");
  assert.notEqual(preuve, premiere);
  assert.match(preuve, new RegExp(`\\*\\*Commit vérifié\\*\\* : \`${head.slice(0, 10)}\``), "preuve réécrite sur le nouveau commit");
  assert.ok(!existsSync(join(racine, FICHE)));
  assert.match(r.message, /Rien ne ferait échouer la clôture/, "l'entrée de journal mise à jour, citée une fois");
});

test("QUA-118 : rien de mesuré, la ligne de consommation reste telle quelle ; hors réouverture, jamais remplacée", () => {
  const { racine } = depotRouvert();
  const avant = readFileSync(join(racine, ".drwil/usage.jsonl"), "utf8");
  close(racine, { logs: dossier() });
  assert.equal(readFileSync(join(racine, ".drwil/usage.jsonl"), "utf8"), avant, "journaux vides : la ligne précédente est gardée");

  const ordinaire = depot();
  close(ordinaire, { logs: journauxDe(1) });
  ecrire(ordinaire, { [FICHE]: fiche("- Un critère — `QUA-001`") });
  const r = close(ordinaire, { logs: journauxDe(3) });
  assert.match(r.message, /déjà une ligne pour « exemple »/);
  assert.equal(lignesDe(ordinaire, "exemple")[0].requests, 1);
});

test("QUA-118 : une seconde entrée de journal pour le même chantier fait échouer la clôture, en le disant — en anglais aussi", () => {
  const { racine } = depotRouvert();
  ecrire(racine, {
    "docs/projects/journal.md":
      "# Journal\n\n## exemple\n\nPreuve : `docs/preuves/exemple.md`.\n\n## autre\n\nRien.\n\n## exemple, rouvert\n\nPreuve : `docs/preuves/exemple.md`.\n",
  });
  git(racine, "add", "-A");
  git(racine, "commit", "-q", "-m", "journal doublé");
  ecrireEvidence(racine);
  const r = close(racine, { logs: journauxDe(2) });
  assert.equal(r.code, 1);
  assert.match(
    r.message,
    /docs\/projects\/journal\.md : 2 entrées citent `docs\/preuves\/exemple\.md` — un chantier rouvert met à jour son entrée de journal, il n'en ajoute pas une seconde/,
  );
  const en = depot({ lang: "en", activite: "BUILD" });
  ecrire(en, { "docs/projects/journal.md": "# J\n\n## a\n\n`docs/preuves/exemple.md`\n\n## b\n\n`docs/preuves/exemple.md`\n" });
  assert.ok(
    closingSignals(en, FICHE).some((s) =>
      /2 entries cite `docs\/preuves\/exemple\.md` — a reopened workstream updates its journal entry/.test(s),
    ),
  );
});

test("QUA-128 : --check regroupe les doublons possibles, une ligne par chemin cité ; les erreurs bloquantes restent toutes affichées", () => {
  const racine = depot({ activite: "BUILD" });
  ecrire(racine, {
    "docs/intentions/origine.md": "# Origine\n\nCite `src/a.mjs`.\n",
    "docs/recipes/r.md": "Fiche : `docs/projects/exemple.md`.\n",
    "docs/recipes/s.md": "Encore : `docs/projects/exemple.md`.\n",
  });
  git(racine, "add", "-A");
  git(racine, "commit", "-q", "-m", "origine");
  process.env.DRWIL_BASE = git(racine, "rev-parse", "HEAD");
  ecrire(racine, {
    "docs/intentions/une.md": "# Une\n\nCite `src/a.mjs` et `src/b.mjs`.\n",
    "docs/intentions/deux.md": "# Deux\n\nCite `src/a.mjs` et `src/b.mjs`.\n",
    "docs/intentions/trois.md": "# Trois\n\nCite `src/a.mjs`.\n",
  });
  const r = close(racine, { check: true });
  const avertissements = r.message.split("\n").filter((l) => l.startsWith("  ⚠") && /doublon possible/.test(l));
  assert.equal(avertissements.length, 2, r.message);
  assert.match(
    avertissements[0],
    /^ {2}⚠ src\/a\.mjs : cité par docs\/intentions\/(deux|trois|une)\.md, docs\/intentions\/(deux|trois|une)\.md, docs\/intentions\/(deux|trois|une)\.md, déjà cité par docs\/intentions\/origine\.md — doublon possible, à vérifier$/,
  );
  assert.match(
    avertissements[1],
    /^ {2}⚠ src\/b\.mjs : cité par docs\/intentions\/(deux|une)\.md, docs\/intentions\/(deux|une)\.md — doublon possible, à vérifier$/,
    "entre nouvelles seulement",
  );
  assert.equal(r.code, 1, "les erreurs bloquantes décident");
  assert.match(r.message, /r\.md:1 cite docs\/projects\/exemple\.md/);
  assert.match(r.message, /s\.md:1 cite docs\/projects\/exemple\.md/, "chaque erreur bloquante, aucune regroupée");
  const en = twinIntents(racine, { dirs: {} }, "en");
  assert.match(
    en[1],
    /^src\/b\.mjs: cited by docs\/intentions\/(deux|une)\.md, docs\/intentions\/(deux|une)\.md — possible duplicate, to check$/,
  );
  assert.match(en[0], /, already cited by docs\/intentions\/origine\.md — possible duplicate, to check$/);
});

test("QUA-137 : un hook modifié non déclaré est signalé à --check et en quittant BUILD, et refuse la clôture avant toute écriture ; déclaré, elle passe", async () => {
  const racine = depot({ activite: "BUILD" });
  git(racine, "checkout", "-q", "master");
  ecrire(racine, { ".githooks/lib.mjs": "export const v = 1;\n" });
  git(racine, "add", "-A");
  git(racine, "commit", "-q", "-m", "hook");
  git(racine, "checkout", "-q", "chantier/exemple");
  git(racine, "merge", "-q", "--no-edit", "master");
  ecrire(racine, { ".githooks/lib.mjs": "export const v = 2;\n" });
  git(racine, "add", "-A");
  git(racine, "commit", "-q", "-m", "hook modifié");
  const signal = /⚠ `\.githooks\/lib\.mjs` modifié par la branche sans être déclaré : .*la puce s'écrit sur le oui du demandeur/;
  const verif = close(racine, { check: true });
  assert.equal(verif.code, 1);
  assert.match(verif.message, signal);
  const m = await move(racine, { to: "EVIDENCE" });
  assert.equal(m.code, 0, m.message);
  assert.match(m.message, /Ce qui ferait échouer la clôture/);
  assert.match(m.message, signal);

  ecrire(racine, {
    ".drwil/state.json": JSON.stringify({ version: 1, activity: "CLOSING", active_brief: FICHE, active_request: null, since: null }),
  });
  ecrireEvidence(racine);
  const refus = close(racine, { logs: journaux() });
  assert.equal(refus.code, 1);
  assert.match(refus.message, /^Avant le commit, ce qui ferait échouer la clôture :\n {2}⚠ `\.githooks\/lib\.mjs` modifié/);
  assert.ok(existsSync(join(racine, FICHE)), "fiche gardée");
  assert.ok(!existsSync(join(racine, "docs/preuves/exemple.md")), "aucune preuve écrite");
  assert.match(readFileSync(join(racine, "docs/projects/pending.md"), "utf8"), /exemple/, "index intact");

  ecrire(racine, {
    [FICHE]: `${readFileSync(join(racine, FICHE), "utf8")}\n## Contrats modifiés\n\n- \`.githooks/lib.mjs\` — v2 (validé par le demandeur)\n`,
  });
  git(racine, "add", "-A");
  git(racine, "commit", "-q", "-m", "déclaration");
  ecrireEvidence(racine);
  const r = close(racine, { logs: journaux() });
  assert.doesNotMatch(r.message, /\.githooks\/lib\.mjs/, r.message);
  assert.ok(!existsSync(join(racine, FICHE)), "déclaré : la clôture passe");
});
