// Tests du paquet : parité des CI livrées (GitHub, GitLab) et saut GitLab du pipeline de la branche principale déjà prouvé.
// Hors des fichiers kit-*.test.mjs, dont les tests sont figés par l'inventaire de leur découpe (QUA-315).
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, mkdirSync, chmodSync, rmSync } from "node:fs";
import { join } from "node:path";
import { parseAllDocuments } from "yaml";
import { tmp, git, read, DEPOT } from "./kit-commun.mjs";

const GABARIT_CI = {
  github: join(DEPOT, "packages/drwil/templates/common/ci/github/.github/workflows/ia-first.yml"),
  gitlab: join(DEPOT, "packages/drwil/templates/common/ci/gitlab/.gitlab-ci.yml"),
};
// Chaque optimisation de la CI livrée, avec sa forme GitHub et sa forme GitLab : l'une sans l'autre fait échouer le test.
const OPTIMISATIONS = [
  [
    "une seule passe par push (QUA-263)",
    /Push skipped: the open pull request/,
    /CI_PIPELINE_SOURCE == "merge_request_event"\n\s+when: never/,
  ],
  [
    "gitleaks retenté, caché, vérifié",
    /gitleaks-8\.21\.2-linux-x64[\s\S]*--retry-all-errors/,
    /gitleaks-8\.21\.2-linux-x64[\s\S]*--retry-all-errors/,
  ],
  ["tranches planifiées et agrégées", /--shard-plan[\s\S]*--aggregate-shards/, /--shard-plan[\s\S]*--aggregate-shards/],
  ["verdicts lents de la passe précédente", /run-checks\.mjs --pr-previous/, /run-checks\.mjs --pr-previous/],
  [
    "verdicts de la branche principale repris (QUA-250)",
    /cache\/restore@[\s\S]*DRWIL_CI_REUSE/,
    /jobs\/artifacts\/\$CI_DEFAULT_BRANCH\/raw\/\$verdicts[\s\S]*DRWIL_CI_REUSE=1/,
  ],
  [
    "âge des verdicts restaurés dit (QUA-297)",
    /verdicts cache: commit/,
    /Verdicts cache: the main branch's last successful pipeline, run at/,
  ],
  [
    "rejeu avec les hooks de la branche principale (QUA-113)",
    /git show "\$base:\.githooks\/base-checks\.mjs"/,
    /git show "\$base:\.githooks\/base-checks\.mjs"/,
  ],
  [
    "verdicts de la passe gardés avant le rejeu (QUA-296)",
    /cp \.drwil\/evidence\/run-checks-verdicts\.json "\$RUNNER_TEMP\/"/,
    /cp \.drwil\/evidence\/run-checks-verdicts\.json \.drwil\/evidence\/pr-verdicts\//,
  ],
  [
    "arbre prouvé posé en dernier (QUA-296)",
    /git rev-parse 'HEAD\^\{tree\}' > "\$RUNNER_TEMP\/proven-tree\.txt"/,
    /git rev-parse "HEAD\^\{tree\}" > \.drwil\/evidence\/pr-verdicts\/proven-tree\.txt/,
  ],
  [
    "push prouvé sauté, verdicts gardés (QUA-296)",
    /Checks not replayed: tree \$tree[\s\S]*proven-verdicts/,
    /Checks not replayed: tree \$tree[\s\S]*proven: \{ tree, branch, verdicts/,
  ],
  ["alerte de CI cassée sur la branche principale", /CI broken on the main branch/, /CI broken on the main branch/],
];
// Écarts déclarés : un contrat cité par une seule des deux CI, avec sa raison.
const ECARTS = {
  "QUA-251": "GitLab : aucune protection n'exige un job par son nom (fusion sans condition sur un plan équivalent), l'alerte seule",
};

test("QUA-319 : les CI GitHub et GitLab livrées sont iso, chaque optimisation de l'une a son équivalent dans l'autre ou un écart déclaré", () => {
  const ci = { github: readFileSync(GABARIT_CI.github, "utf8"), gitlab: readFileSync(GABARIT_CI.gitlab, "utf8") };
  for (const [nom, gh, gl] of OPTIMISATIONS) {
    assert.match(ci.github, gh, `GitHub : ${nom}`);
    assert.match(ci.gitlab, gl, `GitLab : ${nom}`);
  }
  // Étape par étape : un contrat cité par une CI seule est un écart déclaré, jamais un oubli ; un écart qui n'en est plus un est retiré.
  const ids = (t) => new Set(t.match(/QUA-\d+/g));
  const [gh, gl] = [ids(ci.github), ids(ci.gitlab)];
  const seuls = new Set([...gh, ...gl].filter((id) => !(gh.has(id) && gl.has(id))));
  assert.deepEqual([...seuls].sort(), Object.keys(ECARTS).sort());
});

test("QUA-296 : CI GitLab livrée — un pipeline de la branche principale dont l'arbre est prouvé par la branche fusionnée saute ses contrôles et garde ses verdicts", (t) => {
  if (process.platform === "win32") return t.skip("scripts bash de la CI GitLab");
  const ci = parseAllDocuments(readFileSync(GABARIT_CI.gitlab, "utf8"))[0].toJS();
  const plan = ci.plan.script.find((l) => l.includes("proven: {"));
  const reprise = ci.checks.script.find((l) => l.includes("DRWIL_CI_REUSE"));
  const [garde, preuveMr] = ci.checks.script.filter((l) => l.includes("pr-verdicts/"));
  const [origine, dir, outils, preuves] = [tmp(), tmp(), tmp(), tmp()];
  git(origine, "init", "-q", "--bare", "-b", "main");
  git(dir, "init", "-q", "-b", "main");
  const commit = (f, m) => {
    writeFileSync(join(dir, f), `${m}\n`);
    git(dir, "add", f);
    git(dir, "commit", "-qm", m);
  };
  commit("a.txt", "a");
  git(dir, "remote", "add", "origin", origine);
  git(dir, "push", "-q", "origin", "main");
  git(dir, "checkout", "-qb", "wip/x");
  commit("b.txt", "b");
  git(dir, "push", "-q", "origin", "wip/x");
  git(dir, "checkout", "-q", "main");
  git(dir, "merge", "-q", "--no-ff", "wip/x", "-m", "Merge branch 'wip/x' into 'main'");
  const arbre = git(dir, "rev-parse", "HEAD^{tree}").stdout.trim();
  // curl factice : sert le fichier de preuve d'une branche (`<preuves>/<branche encodée>/<fichier>`), sinon une erreur HTTP.
  const motif = "s|.*/jobs/artifacts/\\([^/]*\\)/raw/.drwil/evidence/pr-verdicts/\\([^?]*\\)?job=checks|\\1/\\2|p";
  writeFileSync(
    join(outils, "curl"),
    `#!/bin/sh\nwhile [ $# -gt 0 ]; do case "$1" in -o) out="$2"; shift;; --header) shift;; -*) ;; *) url="$1";; esac; shift; done\n` +
      `f="${preuves}/$(printf %s "$url" | sed -n '${motif}')"\n[ -s "$f" ] || exit 22\ncp "$f" "$out"\n`,
  );
  // node factice : une passe des contrôles (hook du kit) laisse une marque ; tout autre script est joué par le vrai node.
  const joue = join(outils, "joue");
  writeFileSync(
    join(outils, "node"),
    `#!/bin/sh\ncase "$1" in .githooks/*) touch "${joue}"; exit 0;; esac\nexec "${process.execPath}" "$@"\n`,
  );
  for (const f of ["curl", "node"]) chmodSync(join(outils, f), 0o755);
  const preuve = (arbreProuve, verdicts) => {
    mkdirSync(join(preuves, "wip%2Fx"), { recursive: true });
    writeFileSync(join(preuves, "wip%2Fx/proven-tree.txt"), `${arbreProuve}\n`);
    writeFileSync(join(preuves, "wip%2Fx/run-checks-verdicts.json"), verdicts);
  };
  const evidence = join(dir, ".drwil/evidence");
  const jouer = (script, branche = "main") => {
    mkdirSync(evidence, { recursive: true });
    const env = {
      ...process.env,
      PATH: `${outils}:${process.env.PATH}`,
      CI_COMMIT_BRANCH: branche,
      CI_DEFAULT_BRANCH: "main",
      CI_COMMIT_TAG: "",
    };
    Object.assign(env, {
      CI_COMMIT_SHA: git(dir, "rev-parse", "HEAD").stdout.trim(),
      CI_API_V4_URL: "https://gl.test/api/v4",
      CI_PROJECT_ID: "7",
    });
    const r = spawnSync("bash", ["-eo", "pipefail", "-c", script], { cwd: dir, encoding: "utf8", env: { ...env, CI_JOB_TOKEN: "j" } });
    assert.equal(r.status, 0, r.stdout + r.stderr);
    return r.stdout;
  };
  const planifier = (branche) => {
    mkdirSync(evidence, { recursive: true });
    writeFileSync(join(evidence, "shard-plan.json"), '{"include":[{"index":1}]}');
    return { sortie: jouer(plan, branche), plan: JSON.parse(read(evidence, "shard-plan.json")) };
  };
  preuve(arbre, '{"checks":{"lint":{"status":"ok"}}}');
  let p = planifier();
  assert.match(p.sortie, new RegExp(`Checks not replayed: tree ${arbre} is the one the green pipeline of wip/x proved`));
  assert.deepEqual(p.plan.include, [], "aucune tranche");
  assert.equal(p.plan.proven.verdicts.checks.lint.status, "ok");
  // La passe n'est pas jouée, les verdicts de la preuve deviennent ceux du pipeline (son artefact).
  assert.match(jouer(reprise), /Checks not replayed: this tree is proven/);
  assert.equal(existsSync(joue), false);
  assert.match(read(evidence, "run-checks-verdicts.json"), /"lint"/);
  // Branche supprimée à la fusion : retrouvée par le message de fusion par défaut.
  git(dir, "push", "-q", "origin", "--delete", "wip/x");
  assert.match(planifier().sortie, /green pipeline of wip\/x proved/);
  // Verdicts illisibles : saut gardé, sauvegarde impossible dite, aucun verdict écrit.
  preuve(arbre, "pas du json");
  p = planifier();
  assert.match(p.sortie, /WARNING: no readable verdict in the proof of wip\/x/);
  assert.equal(p.plan.proven.verdicts, null);
  rmSync(join(evidence, "run-checks-verdicts.json"));
  jouer(reprise);
  assert.equal(existsSync(join(evidence, "run-checks-verdicts.json")) || existsSync(joue), false);
  // Autre arbre : tout rejoué ; pipeline d'une branche : aucune preuve lue.
  preuve("0".repeat(40), "{}");
  p = planifier();
  assert.match(p.sortie, /Tree not proven by a green pipeline of the merged branch: everything is replayed/);
  assert.deepEqual(p.plan, { include: [{ index: 1 }] });
  preuve(arbre, "{}");
  p = planifier("wip/x");
  assert.equal(p.sortie, "");
  assert.deepEqual(p.plan, { include: [{ index: 1 }] });
  // Un plan qui prouve un autre arbre que celui du job ne saute rien : la passe est jouée.
  writeFileSync(join(evidence, "shard-plan.json"), JSON.stringify({ include: [], proven: { tree: "0".repeat(40), verdicts: null } }));
  jouer(reprise);
  assert.equal(existsSync(joue), true);
  // Pipeline d'une branche : verdicts de sa passe gardés, puis l'arbre prouvé posé ; jamais sur la branche principale.
  rmSync(join(evidence, "pr-verdicts"), { recursive: true, force: true });
  writeFileSync(join(evidence, "run-checks-verdicts.json"), '{"checks":{}}');
  jouer(`${garde}\n${preuveMr}`);
  assert.equal(existsSync(join(evidence, "pr-verdicts/proven-tree.txt")), false, "branche principale");
  jouer(`${garde}\n${preuveMr}`, "wip/x");
  assert.equal(read(evidence, "pr-verdicts/proven-tree.txt").trim(), arbre);
  assert.equal(read(evidence, "pr-verdicts/run-checks-verdicts.json"), read(evidence, "run-checks-verdicts.json"));
});
