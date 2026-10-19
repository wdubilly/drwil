import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
  buildSheet,
  ciOs,
  knownLimits,
  points,
  provenByTest,
  readFingerprints,
  readPoints,
  realTrials,
  releaseVerdict,
  renderSheet,
  repoUrl,
  runner,
  sections,
  sha256,
  sheetTexts,
  verifyJson,
  workstreams,
} from "./acceptance-sheet.mjs";

// Voir scope-gate.test.mjs : des GIT_* hérités feraient agir les tests sur le dépôt qui les lance.
for (const nom of Object.keys(process.env)) if (nom.startsWith("GIT_")) delete process.env[nom];

let dossiers = [];
afterEach(() => {
  for (const d of dossiers) rmSync(d, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  dossiers = [];
});
const tmp = () => {
  const d = mkdtempSync(join(tmpdir(), "drwil-fiche-recette-"));
  dossiers.push(d);
  return d;
};
const ecrire = (racine, fichiers) => {
  for (const [chemin, contenu] of Object.entries(fichiers)) {
    mkdirSync(dirname(join(racine, chemin)), { recursive: true });
    writeFileSync(join(racine, chemin), contenu);
  }
};
function git(racine, ...args) {
  const r = spawnSync("git", args, { cwd: racine, encoding: "utf8" });
  assert.equal(r.status, 0, `git ${args.join(" ")} : ${r.stderr}`);
  return r.stdout.trim();
}
/** Dépôt temporaire avec une identité locale (la CI n'en a pas de globale) et sans hooks. */
function depot() {
  const racine = tmp();
  git(racine, "init", "-q", "-b", "master");
  git(racine, "config", "user.email", "test@example.invalid");
  git(racine, "config", "user.name", "Test");
  git(racine, "config", "core.hooksPath", "/dev/null");
  return racine;
}
const commit = (racine, fichiers, message, fiche = null) => {
  ecrire(racine, fichiers);
  git(racine, "add", "-A");
  git(racine, "commit", "-q", "-m", message, ...(fiche ? ["-m", `Drwil-Brief: ${fiche}`] : []));
};

const FICHE_A = `# Projet : une fiche de recette

## Critères d'acceptation

- [humain] La fiche se lit en quelques minutes \`QUA-900\`
- Le verdict est enregistré \`QUA-901\`

## 6. Increments

- Lot 1 : la fiche. Éprouvé en réel sur la release 1.1.0.
`;
const JOURNAL0 = "# Journal\n\n## 2026-01-01 — Ancien chantier\n\n- **Limites connues** : vieille limite.\n";
const ENTREE_A =
  "\n## 2026-02-01 — Une fiche de recette\n\n- **Doc** : à jour ; l'essai réel viendra plus tard.\n- **Limites connues** : aucune non traitée ; la vue HTML\n  manque — `docs/intentions/x.md` ; rien publié en réel ; une autre limite.\n- **Clôturé par** : la PR #12 (branche `chantier/recette`).\n";
const ENTREE_B =
  "\n## 2026-02-02 — Un correctif écrasé\n\n- **Limites connues** : aucune.\n- **Clôturé par** : la branche `chantier/correctif`.\n";
const ENTREE_C = "\n## 2026-02-03 — Entretien\n\n- **Clôturé par** : la PR #14.\n";

/** Plage v1.0.0..HEAD : un chantier fusionné par PR (fiche supprimée à la clôture), un par squash, une entrée sans fiche. */
function historique() {
  const racine = depot();
  commit(racine, { "docs/projects/journal.md": JOURNAL0 }, "initial");
  git(racine, "tag", "v1.0.0");
  git(racine, "checkout", "-q", "-b", "chantier/recette");
  commit(racine, { "docs/projects/recette.md": FICHE_A, "a.txt": "a" }, "Fiche de recette", "docs/projects/recette.md");
  git(racine, "rm", "-q", "docs/projects/recette.md");
  commit(racine, { "docs/projects/journal.md": JOURNAL0 + ENTREE_A }, "Clôture", "docs/projects/recette.md");
  git(racine, "checkout", "-q", "master");
  git(racine, "merge", "-q", "--no-ff", "chantier/recette", "-m", "Merge pull request #12 from x/chantier/recette");
  commit(
    racine,
    { "docs/projects/journal.md": JOURNAL0 + ENTREE_A + ENTREE_B, "b.txt": "b" },
    "Correctif (#13)",
    "docs/projects/correctif.md",
  );
  commit(racine, { "docs/projects/journal.md": JOURNAL0 + ENTREE_A + ENTREE_B + ENTREE_C }, "Entretien");
  return racine;
}

test("QUA-052 : chantiers de la plage — fiche d'avant sa suppression, PR par le trailer Drwil-Brief, entrée de journal", () => {
  const racine = historique();
  const run = runner(racine);
  const w = workstreams(run, "v1.0.0", "HEAD");
  assert.deepEqual(
    w.map((x) => [x.brief, x.title, x.pr, x.entry?.heading ?? null]),
    [
      ["docs/projects/recette.md", "une fiche de recette", "12", "2026-02-01 — Une fiche de recette"],
      ["docs/projects/correctif.md", "Un correctif écrasé", "13", "2026-02-02 — Un correctif écrasé"],
      [null, "Entretien", "14", "2026-02-03 — Entretien"],
    ],
  );
  // Sans tag de départ, tout le dépôt : l'ancienne entrée du journal compte aussi.
  const tout = workstreams(run, null, "HEAD");
  const ancien = tout.find((x) => x.title === "Ancien chantier");
  assert.deepEqual([ancien.brief, ancien.pr], [null, null]);
  // Une fiche citée par un trailer mais jamais commitée : titre pris au trailer.
  commit(racine, { "c.txt": "c" }, "Sans fiche", "docs/projects/fantome.md");
  assert.equal(workstreams(run, "v1.0.0", "HEAD").find((x) => x.brief === "docs/projects/fantome.md").title, "docs/projects/fantome.md");
});

test("QUA-052 : points à valider — critères [humain], limites connues (essai réel s'il y est déclaré), attestations à refaire ; numéros stables", () => {
  const racine = historique();
  const T = sheetTexts(racine);
  const verdict = {
    results: [
      { id: "QUA-902", title: "Relu", status: "manual", attestable: true, manual: "relecture" },
      { id: "QUA-903", title: "Pas attestable", status: "manual", attestable: false, manual: "x" },
    ],
  };
  const p = points("v1.1.0", workstreams(runner(racine), "v1.0.0", "HEAD"), verdict, T);
  assert.deepEqual(
    p.map((x) => [x.id, x.kind, x.what]),
    [
      ["v1.1.0-P1", "human", "La fiche se lit en quelques minutes"],
      ["v1.1.0-P2", "limit", "la vue HTML manque — `docs/intentions/x.md`"],
      ["v1.1.0-P3", "real", "rien publié en réel"],
      ["v1.1.0-P4", "limit", "une autre limite"],
      ["v1.1.0-P5", "attest", "QUA-902 — Relu"],
    ],
  );
  assert.match(p.at(-1).how, /relecture.*drwil attest QUA-902/);
  assert.deepEqual(points("v1.1.0", [], null, T), []);
});

test("QUA-052 : sources unitaires — dépôt GitHub, sections, essais en réel, limites", () => {
  const racine = depot();
  const run = runner(racine);
  assert.equal(repoUrl(run), null);
  git(racine, "remote", "add", "origin", "git@github.com:org/projet.git");
  assert.equal(repoUrl(run), "https://github.com/org/projet");
  git(racine, "remote", "set-url", "origin", "https://github.com/org/projet");
  assert.equal(repoUrl(run), "https://github.com/org/projet");
  git(racine, "remote", "set-url", "origin", "https://gitlab.com/org/projet.git");
  assert.equal(repoUrl(run), null);
  assert.deepEqual(sections("titre\n## A\ncorps\n## B"), [
    { heading: "A", body: "corps\n" },
    { heading: "B", body: "" },
  ]);
  assert.deepEqual(realTrials("Rien. Testé for real ici; puis `real-world` aussi."), ["Testé for real ici;", "puis real-world aussi."]);
  assert.deepEqual(knownLimits("- **Known limits**: none.\n"), []);
  assert.deepEqual(knownLimits("- **Doc** : x\n"), []);
  assert.deepEqual(knownLimits("- **Limites connues** : une.\n\n- autre\n"), ["une"]);
});

test("QUA-052 : non-régression — verify, contrats prouvés par un test, OS de la CI, empreintes", () => {
  const racine = depot();
  const run = runner(racine);
  assert.equal(verifyJson(racine, run), null);
  ecrire(racine, { "node_modules/drwil/bin/drwil.js": "console.log('pas du json'); process.exit(1);" });
  assert.equal(verifyJson(racine, run), null);
  ecrire(racine, { "node_modules/drwil/bin/drwil.js": "console.log(JSON.stringify({ status: 'fail' })); process.exit(1);" });
  assert.deepEqual(verifyJson(racine, run), { status: "fail" });
  const verdict = {
    results: [
      { id: "QUA-001", title: "Testé", status: "pass" },
      { id: "QUA-002", title: "Sans test", status: "pass" },
      { id: "QUA-003", title: "Testé mais rouge", status: "fail" },
    ],
  };
  assert.deepEqual(provenByTest(racine, verdict), []);
  assert.deepEqual(provenByTest(racine, null), []);
  ecrire(racine, {
    "docs/contracts.md":
      "# C\n\n## QUA-001 — Testé\n**Règle** : r\n**Contrôle** : `x`\n**Tests** : `t.mjs`\n\n## QUA-002 — Sans test\n**Règle** : r\n**Contrôle** : `x`\n\n## QUA-003 — Rouge\n**Règle** : r\n**Contrôle** : `x`\n**Tests** : `t.mjs`\n",
  });
  assert.deepEqual(provenByTest(racine, verdict), [{ id: "QUA-001", title: "Testé" }]);
  const gh = (reponses) => (_cmd, args) => reponses[args.join(" ")] ?? null;
  assert.deepEqual(ciOs(gh({}), "abc"), []);
  assert.deepEqual(ciOs(gh({ "run list --commit abc --json databaseId --limit 50": "{}" }), "abc"), []);
  const reponses = {
    "run list --commit abc --json databaseId --limit 50": JSON.stringify([{ databaseId: 1 }, { databaseId: 2 }, { databaseId: 3 }]),
    "api repos/{owner}/{repo}/actions/runs/1/jobs": JSON.stringify({
      jobs: [
        { conclusion: "success", labels: ["ubuntu-latest"] },
        { conclusion: "failure", labels: ["windows-latest"] },
        { conclusion: "success" },
      ],
    }),
    "api repos/{owner}/{repo}/actions/runs/2/jobs": JSON.stringify({
      jobs: [{ conclusion: "success", labels: ["macos-latest", "ubuntu-latest"] }],
    }),
    "api repos/{owner}/{repo}/actions/runs/3/jobs": "{}",
  };
  assert.deepEqual(ciOs(gh(reponses), "abc"), ["macos-latest", "ubuntu-latest"]);
  ecrire(racine, { "x.tgz": "contenu" });
  assert.match(sha256(join(racine, "x.tgz")), /^[0-9a-f]{64}$/);
});

test("QUA-052 : rendu de la fiche — à valider en tête, non-régression dessous ; relue par le verdict et la promotion", () => {
  const T = sheetTexts(tmp());
  const work = { title: "Chantier", pr: "7" };
  const base = {
    tag: "v1.1.0-rc.1",
    version: "v1.1.0",
    commit: "0123456789abcdef",
    from: "v1.0.0",
    repo: "https://github.com/o/r",
    points: [
      { id: "v1.1.0-P1", kind: "human", what: "Lisible", how: "Lire", work },
      { id: "v1.1.0-P2", kind: "limit", what: "Lente", how: "Juger", work: { title: "Sans PR", pr: null } },
      { id: "v1.1.0-P3", kind: "attest", what: "QUA-9 — x", how: "Relire", work: null },
    ],
    verdict: { status: "pass" },
    proven: [{ id: "QUA-1", title: "Un" }],
    os: ["ubuntu-latest"],
    tarballs: [{ name: "p-1.1.0.tgz", sha256: "a".repeat(64) }],
    packages: ["p"],
  };
  const fiche = renderSheet(base, T);
  assert.ok(fiche.indexOf("## À valider") < fiche.indexOf("## Non-régression"));
  assert.match(
    fiche,
    /^# Fiche de recette — v1\.1\.0-rc\.1\n\nVersion candidate v1\.1\.0-rc\.1 \(commit `0123456`\), du dernier tag définitif v1\.0\.0/,
  );
  assert.match(fiche, /release-verdict\.mjs v1\.1\.0-rc\.1 --approve/);
  assert.match(
    fiche,
    /- \*\*v1\.1\.0-P1\*\* — critère humain — Chantier \(\[PR #7\]\(https:\/\/github\.com\/o\/r\/pull\/7\)\)\n {2}- Quoi : Lisible\n {2}- Comment : Lire/,
  );
  assert.match(fiche, /- \*\*v1\.1\.0-P2\*\* — limite connue — Sans PR \(PR non retrouvée\)/);
  assert.match(fiche, /- \*\*v1\.1\.0-P3\*\* — attestation à refaire\n/);
  assert.match(
    fiche,
    /Verdict de `drwil verify` : PASS\n- Contrats prouvés par un test : 1\n {2}- QUA-1 — Un\n- OS testés par la CI .* : ubuntu-latest/,
  );
  assert.deepEqual(readFingerprints(fiche), { "p-1.1.0.tgz": "a".repeat(64) });
  assert.deepEqual(
    readPoints(fiche).map((p) => [p.id, p.what]),
    [
      ["v1.1.0-P1", "Lisible"],
      ["v1.1.0-P2", "Lente"],
      ["v1.1.0-P3", "QUA-9 — x"],
    ],
  );
  const vide = renderSheet({ ...base, from: null, repo: null, points: [], verdict: null, os: [], tarballs: null }, T);
  assert.match(vide, /du dernier tag définitif le début du dépôt/);
  assert.match(vide, /Aucun point à valider à la main/);
  assert.match(vide, /non disponible \(verify non exécuté : ce n'est pas un succès\)\n- OS testés .*aucun job réussi trouvé/);
  assert.doesNotMatch(vide, /Contrats prouvés/);
  assert.match(vide, /calculée à la création du tarball/);
  assert.match(renderSheet({ ...base, repo: null, packages: null }, T), /PR #7\)[\s\S]*pas de tarball/);
});

test("QUA-052 : fiche complète sur un vrai dépôt, en anglais ; commande absente ou en échec : null", () => {
  const racine = historique();
  ecrire(racine, {
    ".drwil/ia-first.json": JSON.stringify({ lang: "en" }),
    "node_modules/drwil/bin/drwil.js": "console.log(JSON.stringify({ status: 'pass', results: [] }));",
    "p.tgz": "tarball",
  });
  const vrai = runner(racine);
  const run = (cmd, args, o) => (cmd === "gh" ? null : vrai(cmd, args, o));
  const fiche = buildSheet(
    racine,
    { tag: "v1.1.0-rc.1", version: "v1.1.0", from: "v1.0.0", tarballs: [join(racine, "p.tgz")], packages: ["."] },
    run,
  );
  assert.match(fiche, /^# Acceptance sheet — v1\.1\.0-rc\.1/);
  assert.match(fiche, /\*\*v1\.1\.0-P1\*\* — human criterion — une fiche de recette \(PR #12\)/);
  assert.match(fiche, /`drwil verify` verdict: PASS\n- Contracts proven by a test: 0/);
  assert.match(fiche, new RegExp(`\`p\\.tgz\` — sha256 \`${sha256(join(racine, "p.tgz"))}\``));
  assert.equal(vrai("git", ["inconnue"]), null);
  assert.equal(vrai("commande-absente-drwil", []), null);
  assert.equal(vrai(process.execPath, ["-e", "process.exit(3)"], { any: true }), null);
  assert.equal(vrai(process.execPath, ["-e", "console.log('x'); process.exit(3)"], { any: true }), "x\n");
  // Exécuteur par défaut : sans gh ni verify, rien n'échoue.
  assert.match(
    buildSheet(depotVide(), { tag: "v0.1.0-rc.1", version: "v0.1.0", from: null, tarballs: null, packages: null }),
    /Fiche de recette/,
  );
});

function depotVide() {
  const racine = depot();
  commit(racine, { "a.txt": "a" }, "initial");
  return racine;
}

test("QUA-052 : sources muettes — git en échec, merge sans second parent, chantier sans entrée, registre déplacé", () => {
  const muet = () => null;
  assert.deepEqual(workstreams(muet, "v1.0.0", "HEAD"), []);
  const S = "\x1f";
  const enregistrements = [
    `a${S}p0 p1${S}Merge pull request #5 from x/y${S}${S}\x1e`,
    `b${S}p0${S}Merge pull request #6 sans fusion${S}docs/projects/f.md${S}\x1e`,
  ].join("\n");
  const run = (_cmd, args) => (args[0] === "log" && args[1] === "--reverse" ? enregistrements : null);
  assert.deepEqual(
    workstreams(run, null, "HEAD").map((w) => [w.brief, w.pr, w.title]),
    [["docs/projects/f.md", null, "docs/projects/f.md"]],
  );
  const T = sheetTexts(tmp());
  assert.deepEqual(points("v1", [{ text: "", entry: null }], { results: [] }, T), []);
  const racine = depot();
  ecrire(racine, { "node_modules/drwil/bin/drwil.js": "" });
  assert.equal(verifyJson(racine, muet), null);
  ecrire(racine, {
    ".drwil/ia-first.json": JSON.stringify({ dirs: { contracts: "regles.md" } }),
    "regles.md": "# C\n\n## QUA-001 — Testé\n**Règle** : r\n**Contrôle** : `x`\n**Tests** : `t.mjs`\n",
  });
  assert.deepEqual(provenByTest(racine, { results: [{ id: "QUA-001", title: "Testé", status: "pass" }] }), [
    { id: "QUA-001", title: "Testé" },
  ]);
  assert.match(
    buildSheet(racine, { tag: "v1.0.0-rc.1", version: "v1.0.0", from: null, tarballs: null, packages: null }, muet),
    /commit ``/,
  );
});

// Cas réel de la v0.6.5-rc.1 : la fiche, cadrée sur la branche principale, corrigée sur la branche
// du chantier (critère rattaché à son contrat), puis supprimée à la clôture ; une phrase de décision
// ou de besoin parlant d'essai réel ; verify en échec pour la seule règle de la branche principale.
const FICHE_V1 = `# Projet : release 0.6.5

## 1. Besoin

Publier la 0.6.5 par le parcours de recette, premier essai réel.

## Critères d'acceptation

- [humain] La candidate est publiée avec sa fiche — contrat à créer

## 5. Décisions

- 2026-10-19 (demandeur) : publier par le parcours de recette, premier essai réel.
`;
const FICHE_V2 = FICHE_V1.replace("— contrat à créer", "— `QUA-051`");

test("QUA-052 : chaque fiche lue dans sa dernière version avant sa suppression, même cadrée sur la branche principale", () => {
  const racine = depot();
  commit(racine, { "docs/projects/journal.md": JOURNAL0 }, "initial");
  git(racine, "tag", "v1.0.0");
  commit(racine, { "docs/projects/release.md": FICHE_V1 }, "Cadrage");
  git(racine, "checkout", "-q", "-b", "chantier/release");
  commit(racine, { "docs/projects/release.md": FICHE_V2 }, "Critère rattaché", "docs/projects/release.md");
  git(racine, "checkout", "-q", "master");
  commit(racine, { "autre.txt": "x" }, "Cadrage d'un autre chantier");
  git(racine, "checkout", "-q", "chantier/release");
  git(racine, "merge", "-q", "--no-ff", "master", "-m", "Fusion de master");
  git(racine, "rm", "-q", "docs/projects/release.md");
  commit(
    racine,
    { "docs/projects/journal.md": `${JOURNAL0}\n## 2026-10-19 — Release\n\n- **Clôturé par** : la PR #20.\n` },
    "Clôture",
    "docs/projects/release.md",
  );
  git(racine, "checkout", "-q", "master");
  git(racine, "merge", "-q", "--no-ff", "chantier/release", "-m", "Merge pull request #20 from x/chantier/release");
  const w = workstreams(runner(racine), "v1.0.0", "HEAD");
  assert.equal(w[0].text, FICHE_V2);
  const p = points("v1.1.0", w, null, sheetTexts(racine));
  assert.deepEqual(
    p.map((x) => [x.kind, x.what]),
    [["human", "La candidate est publiée avec sa fiche"]],
  );
  // Fiche encore présente au commit de la candidate : lue telle quelle.
  commit(racine, { "docs/projects/suivante.md": FICHE_V1 }, "Cadrage suivant", "docs/projects/suivante.md");
  assert.equal(workstreams(runner(racine), "v1.0.0", "HEAD").find((x) => x.brief === "docs/projects/suivante.md").text, FICHE_V1);
});

test("QUA-052 : créée sur la branche principale, la fiche ne fait pas tomber verify pour la seule règle de cette branche, et le dit", () => {
  const T = sheetTexts(tmp());
  const principale = {
    id: "QUA-017",
    title: "Pas de travail direct sur la branche principale",
    status: "fail",
    severity: "blocking",
    checks: [
      { id: "main-branch", status: "fail" },
      { id: "tests-qua-017", status: "ok" },
    ],
  };
  const autres = [
    { id: "QUA-001", title: "Un", status: "pass", severity: "blocking", checks: [] },
    { id: "QUA-002", title: "Deux", status: "manual", severity: "warning" },
  ];
  const verdict = { status: "fail", results: [principale, ...autres], errors: [] };
  assert.deepEqual(releaseVerdict(verdict), { status: "pass", excused: [principale] });
  const base = { tag: "v1.1.0-rc.1", commit: "0123456", from: "v1.0.0", points: [], proven: [], os: [], tarballs: null, packages: null };
  assert.match(
    renderSheet({ ...base, verdict }, T),
    /Verdict de `drwil verify` : PASS — sans compter QUA-017 \(Pas de travail direct sur la branche principale\), qui refuse le travail sur la branche principale, où toute release se crée\n/,
  );
  // Un autre échec, une erreur de configuration ou un critère ouvert : le verdict reste celui de verify.
  const rouge = { id: "QUA-003", title: "Rouge", status: "fail", checks: [{ id: "x", status: "fail" }] };
  assert.deepEqual(releaseVerdict({ ...verdict, results: [principale, rouge] }), { status: "fail", excused: [principale] });
  assert.equal(releaseVerdict({ ...verdict, errors: ["registre illisible"] }).status, "error");
  assert.equal(releaseVerdict({ ...verdict, results: [principale, { ...autres[1], severity: "blocking" }] }).status, "manual");
  assert.deepEqual(releaseVerdict({ ...verdict, criteria: [{ status: "not-pass" }] }), { status: "fail", excused: [] });
  assert.deepEqual(releaseVerdict({ status: "fail", results: [rouge] }), { status: "fail", excused: [] });
  assert.deepEqual(releaseVerdict({ status: "pass" }), { status: "pass", excused: [] });
  assert.match(renderSheet({ ...base, verdict: { status: "fail", results: [rouge] } }, T), /Verdict de `drwil verify` : FAIL\n/);
  const en = tmp();
  ecrire(en, { ".drwil/ia-first.json": JSON.stringify({ lang: "en" }) });
  assert.match(renderSheet({ ...base, verdict }, sheetTexts(en)), /verdict: PASS — not counting QUA-017 \(Pas de travail direct/);
});
