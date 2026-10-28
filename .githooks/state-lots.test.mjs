import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { readLots } from "./briefs-lots.mjs";
import { lotStatus, nextLot } from "./state-lots.mjs";
import { context, main, move, readState, shortReminder, writeState } from "./state.mjs";

for (const nom of Object.keys(process.env)) if (nom.startsWith("GIT_")) delete process.env[nom];

let dossiers = [];
afterEach(() => {
  for (const d of dossiers) rmSync(d, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  dossiers = [];
});

const FICHE = "docs/projects/exemple.md";
const SECTION = `## 6. Increments

- **Lot 1 — lire les lots** [IA] : détail.
- **Lot 2 — étape humaine** [humain] : un humain fait.
- **Lot 3 — rappel** [IA] : détail.
- **Lot 4 — doc** [IA] : détail.
`;

/** Dépôt git à l'arbre propre, fiche (avec ses lots) commitée, état BUILD. */
function depot({ section = SECTION, activite = "BUILD", lang } = {}) {
  const racine = mkdtempSync(join(tmpdir(), "drwil-lots-"));
  dossiers.push(racine);
  mkdirSync(join(racine, "docs", "projects"), { recursive: true });
  mkdirSync(join(racine, ".drwil"), { recursive: true });
  writeFileSync(join(racine, ".gitignore"), ".drwil/\n");
  if (lang) writeFileSync(join(racine, ".drwil", "ia-first.json"), JSON.stringify({ lang }));
  writeFileSync(
    join(racine, FICHE),
    `# Projet : Exemple\n\n**Statut** : cadré le 2026-10-09.\n\n<!-- scope\nfiles:\n  - src/a.ts\n-->\n\n${section}`,
  );
  const git = (...args) => spawnSync("git", ["-c", "user.name=t", "-c", "user.email=t@t", ...args], { cwd: racine, encoding: "utf8" });
  git("init", "-q");
  git("add", "-A");
  git("commit", "-qm", "init");
  writeState(racine, { version: 1, activity: activite, active_brief: FICHE, active_request: null, since: "2026-10-09T10:00:00Z" });
  return racine;
}

const lire = (racine) => readState(racine);

test("QUA-166 : lecture des lots : puces de la section Increments, étiquette IA ou humain", () => {
  assert.deepEqual(
    readLots(SECTION).map((l) => [l.n, l.title, l.kind]),
    [
      [1, "lire les lots", "ia"],
      [2, "étape humaine", "human"],
      [3, "rappel", "ia"],
      [4, "doc", "ia"],
    ],
  );
  assert.deepEqual(readLots("## 1. Besoin\n\n- **Lot 1 — hors section** [IA]\n"), []);
  assert.equal(readLots("## Increments\n\n- **Lot 1 — a [humain]**\n")[0].kind, "human");
});

test("QUA-167 : lot : courant, faits et restants ; lot next exige l'arbre propre", () => {
  const racine = depot();
  const s = lotStatus(racine, lire(racine));
  assert.equal(s.current.n, 1);
  assert.deepEqual(
    s.left.map((l) => l.n),
    [1, 3, 4],
  );

  writeFileSync(join(racine, "src.txt"), "travail non commité");
  const refus = nextLot(racine, lire(racine));
  assert.equal(refus.code, 1);
  assert.match(refus.message, /lot 1 n'est pas commité/);
  assert.equal(lotStatus(racine, lire(racine)).current.n, 1);
});

test("QUA-169 : lot next : saute le lot [humain] et le nomme comme restant à faire", () => {
  const racine = depot();
  const suivant = nextLot(racine, lire(racine));
  assert.equal(suivant.code, 0);
  assert.match(suivant.message, /lot courant : 3 — rappel/);
  assert.match(suivant.message, /\[humain\].*2 — étape humaine/);
  writeState(racine, { ...lire(racine).state, activity: "CLOSING" });
  assert.match(context(lire(racine), racine), /à rappeler à la clôture.*2 — étape humaine/);
});

test("QUA-167 : lot next ne passe jamais à un lot au-delà du dernier", () => {
  const racine = depot();
  assert.equal(nextLot(racine, lire(racine)).code, 0);
  assert.equal(nextLot(racine, lire(racine)).code, 0);
  const dernier = nextLot(racine, lire(racine));
  assert.equal(dernier.code, 0);
  assert.match(dernier.message, /dernier lot \[IA\]/);
  const s = lotStatus(racine, lire(racine));
  assert.equal(s.current.n, 4);
  assert.deepEqual(s.left, []);
  assert.equal(nextLot(racine, lire(racine)).code, 1);
});

test("QUA-168 : rappel et contexte nomment le lot courant et les lots [humain]", () => {
  const racine = depot();
  assert.match(shortReminder(lire(racine), racine), /Lot courant : 1 — lire les lots — ne traiter que lui/);
  const ctx = context(lire(racine), racine);
  assert.match(ctx, /Lot courant : 1/);
  assert.match(ctx, /Lot\(s\) \[humain\] à faire.*2 — étape humaine/);
});

test("QUA-170 : clôture refusée tant qu'un lot [IA] n'est pas fait, un lot [humain] n'est que rappelé", async () => {
  const racine = depot({ activite: "VERIFY" });
  const refus = await move(racine, { to: "CLOSING" });
  assert.equal(refus.code, 1);
  assert.match(refus.message, /lot\(s\) \[IA\] pas faits : 1 — lire les lots ; 3 — rappel ; 4 — doc/);
  writeState(racine, { ...lire(racine).state, activity: "BUILD" });
  for (let i = 0; i < 3; i++) assert.equal(nextLot(racine, lire(racine)).code, 0);
  writeState(racine, { ...lire(racine).state, activity: "VERIFY" });
  // Plus refusée pour les lots : c'est l'évidence de verify, absente ici, qui la refuse.
  assert.match((await move(racine, { to: "CLOSING" })).message, /aucune évidence/);
});

test("QUA-170 : une fiche à un seul lot, ou sans lot, se comporte comme avant", async () => {
  for (const section of ["## 6. Increments\n\n- **Lot 1 — seul** [IA]\n", "## 6. Increments\n\nrien\n"]) {
    const racine = depot({ section, activite: "VERIFY" });
    assert.equal(lotStatus(racine, lire(racine)), null);
    assert.match((await move(racine, { to: "CLOSING" })).message, /aucune évidence/);
    assert.doesNotMatch(context(lire(racine), racine), /Lot courant/);
  }
});

test("QUA-170 : le lot courant est oublié au retour en SCOPING", async () => {
  const racine = depot();
  nextLot(racine, lire(racine));
  assert.ok(existsSync(join(racine, ".drwil", "lot.json")));
  assert.equal((await move(racine, { to: "SCOPING" })).code, 0);
  assert.ok(!existsSync(join(racine, ".drwil", "lot.json")));
});

test("QUA-166 : state.mjs lot : dit le lot courant, lot next passe au suivant", async () => {
  const racine = depot();
  const sortie = [];
  const log = console.log;
  console.log = (...a) => sortie.push(a.join(" "));
  try {
    assert.equal(await main(["lot"], racine), 0);
    assert.equal(await main(["lot", "next"], racine), 0);
  } finally {
    console.log = log;
  }
  assert.match(sortie[0], /Lot courant : 1 — lire les lots/);
  assert.match(sortie[1], /lot 1 fait → lot courant : 3 — rappel/);
});

test("QUA-171 : le mode d'emploi du lancement dit qu'un sous-agent neuf traite chaque lot", () => {
  const skill = readFileSync(
    new URL("../packages/drwil/templates/common/tools/claude/.claude/skills/start-a-workstream/SKILL.md", import.meta.url),
    "utf8",
  );
  assert.match(skill, /fresh subagent per lot/);
  assert.match(skill, /state\.mjs lot next/);
  assert.match(skill, /"Hand-off"|Reprise/);
});

const sortie = async (args, racine) => {
  const out = [];
  const [log, err] = [console.log, console.error];
  console.log = console.error = (...a) => out.push(a.join(" "));
  try {
    return { code: await main(args, racine), out: out.join("\n") };
  } finally {
    [console.log, console.error] = [log, err];
  }
};

test("QUA-166 : étiquette dans ou après le gras, lot sans étiquette = IA, numéro cité deux fois compté une fois", () => {
  const lots = readLots(
    "## Increments\n\n- **Lot 1 — a**\n- **Lot 1 — doublon** [humain]\n- **Lot 2 — b [humain]**\n- **Lot 3 — c** [IA]\n",
  );
  assert.deepEqual(
    lots.map((l) => [l.n, l.title, l.kind]),
    [
      [1, "a", "ia"],
      [2, "b", "human"],
      [3, "c", "ia"],
    ],
  );
});

test("QUA-167 : lot next refusé hors BUILD ou sans lots ; un enregistrement d'une autre fiche ou périmé ne compte rien", async () => {
  const racine = depot({ activite: "EVIDENCE" });
  assert.match(nextLot(racine, lire(racine)).message, /activité EVIDENCE/);
  const seul = depot({ section: "## Increments\n\n- **Lot 1 — seul** [IA]\n" });
  assert.match(nextLot(seul, lire(seul)).message, /aucun enchaînement/);
  assert.match((await sortie(["lot"], seul)).out, /aucun enchaînement/);
  assert.equal((await sortie(["lot", "next"], seul)).code, 1);
  const ancien = depot();
  writeFileSync(join(ancien, ".drwil", "lot.json"), JSON.stringify({ brief: "docs/projects/autre.md", current: 4, done: [1, 3, 4] }));
  assert.equal(lotStatus(ancien, lire(ancien)).current.n, 1);
  writeFileSync(join(ancien, ".drwil", "lot.json"), JSON.stringify({ brief: FICHE, current: 99, done: [1, 3, 4] }));
  const s = lotStatus(ancien, lire(ancien));
  assert.deepEqual([s.current.n, s.left.length], [4, 0]);
});

test("QUA-169 : sans lot [humain], rien n'est rappelé", async () => {
  const racine = depot({ section: "## Increments\n\n- **Lot 1 — a** [IA]\n- **Lot 2 — b** [IA]\n" });
  const r = await sortie(["lot"], racine);
  assert.doesNotMatch(r.out, /humain/);
  assert.doesNotMatch(nextLot(racine, lire(racine)).message, /humain/);
});

test("QUA-168 : en anglais, le rappel et le contexte nomment le lot courant et les lots [human]", async () => {
  const racine = depot({ lang: "en" });
  assert.match(shortReminder(lire(racine), racine), /Current lot: 1 — lire les lots — work on it only/);
  assert.match(context(lire(racine), racine), /\[human\] lot\(s\) to do.*2 — étape humaine/);
  assert.match((await sortie(["lot", "next"], racine)).out, /lot 1 done → current lot: 3/);
  nextLot(racine, lire(racine));
  assert.match(context(lire(racine), racine), /last \[IA\] lot/);
});

test("QUA-168 : au dernier lot [IA], le contexte dit de vérifier puis de clore", () => {
  const racine = depot();
  for (let i = 0; i < 2; i++) nextLot(racine, lire(racine));
  assert.match(context(lire(racine), racine), /Lot courant : 4 — doc.*dernier lot \[IA\]/);
});
