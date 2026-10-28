// Niveau de protection de `drwil doctor` (QUA-155).
import { after, test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { doctor, init } from "../dist/index.js";
import { diagnosisJson, formatDiagnosis } from "../dist/doctor.js";

for (const nom of Object.keys(process.env)) if (nom.startsWith("GIT_")) delete process.env[nom];

const OK = { status: 0, stdout: "" };
const json = (o) => ({ status: 0, stdout: JSON.stringify(o) });
const faux = (regles) => (cmd) => {
  for (const [motif, reponse] of regles) if (motif.test(cmd)) return reponse;
  return { status: 1, stdout: "" };
};
const FORGE = [
  [/^git rev-parse --is-inside-work-tree/, OK],
  [/^git symbolic-ref/, { status: 0, stdout: "refs/remotes/origin/main\n" }],
  [/^git remote get-url origin/, { status: 0, stdout: "git@github.com:x/y.git\n" }],
  [/^gh auth status/, OK],
  [/rules\/branches\/main/, json([{ ruleset_id: 7, type: "pull_request" }, { type: "required_status_checks" }])],
  [/rulesets\/7/, json({ bypass_actors: [] })],
];
const lire = (dir, f) => readFileSync(join(dir, f), "utf8");
const reglage = (dir, cle, valeur) =>
  writeFileSync(
    join(dir, ".drwil/ia-first.json"),
    `${JSON.stringify({ ...JSON.parse(lire(dir, ".drwil/ia-first.json")), [cle]: valeur })}\n`,
  );

const dossiers = [];
after(() => {
  for (const d of dossiers) rmSync(d, { recursive: true, force: true });
});

async function projet(lang = "fr") {
  const dir = mkdtempSync(join(tmpdir(), "drwil-protection-"));
  dossiers.push(dir);
  const { log, warn } = console;
  console.log = console.warn = () => {};
  try {
    await init({ lang, targetDir: dir, ci: "github", tools: "claude" });
  } finally {
    console.log = log;
    console.warn = warn;
  }
  return dir;
}
const niveau = async (dir, regles = []) => (await doctor({ targetDir: dir, exec: faux(regles) })).protection;
const etats = (p) => p.levels.map((l) => l.state);

test("QUA-155 : niveau 4 prouvé par la forge, 3 par la CI, 2 par les hooks et la barrière ; chaque trou arrête la montée et dit la commande suivante", async () => {
  const dir = await projet();
  let p = await niveau(dir, FORGE);
  assert.equal(p.level, 4);
  assert.deepEqual(etats(p), ["reached", "reached", "reached", "reached"]);
  assert.equal(p.next, null);

  // Contournement administrateur lisible : le niveau 4 est refusé, la commande est celle des garanties.
  p = await niveau(dir, [...FORGE.slice(0, 5), [/rulesets\/7/, json({ bypass_actors: [{ actor_type: "Team", actor_id: 1 }] })]]);
  assert.equal(p.level, 3);
  assert.equal(p.levels[3].state, "missing");
  assert.match(p.next, /drwil guarantees --protect/);

  // Barrière en avertissement : niveau 1, la commande durcit le réglage et marche.
  reglage(dir, "scopeGate", "warning");
  p = await niveau(dir, FORGE);
  assert.equal(p.level, 1);
  assert.match(p.levels[1].detail, /scopeGate\) en « warning »/);
  const durcir = /^node -e "(.+)"$/s.exec(p.next)[1];
  assert.equal(spawnSync(process.execPath, ["-e", durcir], { cwd: dir }).status, 0);
  assert.equal((await niveau(dir, FORGE)).level, 4);

  // Hooks débranchés : niveau 1, `git config core.hooksPath .githooks`.
  spawnSync("git", ["config", "core.hooksPath", "ailleurs"], { cwd: dir });
  p = await niveau(dir, FORGE);
  assert.equal(p.level, 1);
  assert.equal(p.next, "git config core.hooksPath .githooks");
  spawnSync("git", ["config", "core.hooksPath", ".githooks"], { cwd: dir });

  // CI qui ne rejoue pas les contrôles du hook : niveau 2 ; fichier absent : idem.
  writeFileSync(join(dir, ".github/workflows/ia-first.yml"), "name: ci\n");
  p = await niveau(dir, FORGE);
  assert.equal(p.level, 2);
  assert.match(p.levels[2].detail, /ne rejoue pas les contrôles du hook/);
  rmSync(join(dir, ".github"), { recursive: true });
  assert.match((await niveau(dir, FORGE)).levels[2].detail, /fichier de CI absent/);
  reglage(dir, "ciFiles", []);
  p = await niveau(dir, FORGE);
  assert.equal(p.levels[2].detail, "aucune CI déclarée");
  assert.match(p.next, /init --ci github/);
});

test("QUA-155 : sans forge lisible, le niveau 4 est « non vérifié », jamais atteint ; sans dépôt distant, non atteint", async () => {
  const dir = await projet();
  const sansGh = FORGE.filter(([motif]) => !/gh auth/.test(motif.source));
  let p = await niveau(dir, sansGh);
  assert.equal(p.level, 3);
  assert.equal(p.levels[3].state, "unverified");
  assert.match(p.levels[3].detail, /non vérifiée \(non exécuté\) : gh injoignable/);
  assert.match(p.next, /gh auth login/);
  // Ruleset lu sans bypass_actors (jeton non administrateur) : non vérifié aussi (QUA-115).
  p = await niveau(dir, [...FORGE.slice(0, 5), [/rulesets\/7/, json({})]]);
  assert.equal(p.levels[3].state, "unverified");
  assert.equal(p.level, 3);
  p = await niveau(dir, []);
  assert.equal(p.levels[3].state, "missing");
});

test("QUA-155 : doctor affiche le niveau en texte et en --json, en français et en anglais", async () => {
  const fr = await projet();
  let d = await doctor({ targetDir: fr, exec: faux(FORGE.filter(([m]) => !/gh auth/.test(m.source))) });
  const texte = formatDiagnosis(d);
  assert.match(texte, /Niveau de protection : 3\/4/);
  assert.match(texte, /\? 4 Protection de forge vérifiée — non vérifié/);
  assert.match(texte, /Niveau suivant : se connecter à la forge/);
  const j = diagnosisJson(d);
  assert.equal(j.protection.level, 3);
  assert.deepEqual(
    j.protection.levels.map((l) => [l.level, l.state]),
    [
      [1, "reached"],
      [2, "reached"],
      [3, "reached"],
      [4, "unverified"],
    ],
  );
  assert.match(j.protection.next, /gh auth login/);

  const en = await projet("en");
  reglage(en, "scopeGate", "warning");
  d = await doctor({ targetDir: en, exec: faux([]) });
  const english = formatDiagnosis(d);
  assert.match(english, /Protection level: 1\/4/);
  assert.match(english, /✗ 2 Local governance active — not reached : scope gate \(scopeGate\) is "warning", not blocking/);
  assert.match(english, /Next level: node -e/);
});
