import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { main, note, notesPath } from "./note.mjs";

for (const nom of Object.keys(process.env)) if (nom.startsWith("GIT_")) delete process.env[nom];

const SCRIPT = fileURLToPath(new URL("./note.mjs", import.meta.url));
let dossiers = [];
afterEach(() => {
  for (const d of dossiers) rmSync(d, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  dossiers = [];
});

/** Dépôt git temporaire en BUILD sur une fiche : l'état et la fiche doivent rester tels quels. */
function depot(config = {}) {
  const racine = mkdtempSync(join(tmpdir(), "drwil-note-"));
  dossiers.push(racine);
  mkdirSync(join(racine, ".drwil"));
  mkdirSync(join(racine, "docs/projects"), { recursive: true });
  writeFileSync(join(racine, ".drwil/ia-first.json"), JSON.stringify(config));
  writeFileSync(join(racine, ".drwil/state.json"), '{"version":1,"activity":"BUILD","active_brief":"docs/projects/f.md"}');
  writeFileSync(join(racine, "docs/projects/f.md"), "# Projet : F\n");
  spawnSync("git", ["init", "-q"], { cwd: racine });
  return racine;
}
const lire = (racine, f) => readFileSync(join(racine, f), "utf8");
const JOUR = new Date("2026-10-20T15:00:00Z");

test("QUA-071 : une note ajoute une ligne datée au fichier de notes, créé au besoin, sans toucher à l'état, à la fiche ni à git", () => {
  const racine = depot();
  const avant = [lire(racine, ".drwil/state.json"), lire(racine, "docs/projects/f.md")];
  const r = note(racine, "  une idée\n  sur deux lignes ", { now: JOUR });
  assert.equal(r.code, 0, r.message);
  assert.match(r.message, /note ajoutée à docs\/intentions\/notes\.md/);
  const notes = lire(racine, "docs/intentions/notes.md");
  assert.match(notes, /^# Intention : notes en vrac\n\n\*\*Statut\*\* : ouverte en permanence — dernière note le 2026-10-20\./);
  for (const titre of ["## Besoin", "## Existant", "## Questions à trancher", "## Notes"]) assert.ok(notes.includes(titre), titre);
  assert.ok(notes.endsWith("\n- 2026-10-20 — une idée sur deux lignes\n"));
  note(racine, "autre", { now: new Date("2026-11-02T09:00:00Z") });
  const suite = lire(racine, "docs/intentions/notes.md");
  assert.ok(suite.endsWith("- 2026-10-20 — une idée sur deux lignes\n- 2026-11-02 — autre\n"));
  assert.match(suite, /dernière note le 2026-11-02\./, "le Statut suit la dernière note");
  assert.deepEqual([lire(racine, ".drwil/state.json"), lire(racine, "docs/projects/f.md")], avant, "ni état ni fiche touchés");
  assert.equal(spawnSync("git", ["diff", "--cached", "--name-only"], { cwd: racine, encoding: "utf8" }).stdout, "", "rien d'indexé");
  assert.equal(spawnSync("git", ["log", "-1"], { cwd: racine }).status !== 0, true, "rien commité");
});

test("QUA-071 : une note vide est refusée sans rien écrire ; en anglais et dossier réglé ; ligne de commande", () => {
  const racine = depot({ lang: "en", dirs: { intentions: "idees" } });
  assert.equal(notesPath(racine), "idees/notes.md");
  const vide = note(racine, "   ");
  assert.equal(vide.code, 2);
  assert.equal(vide.message, "empty note: nothing written");
  assert.ok(!existsSync(join(racine, "idees/notes.md")));
  const lancer = (...args) =>
    spawnSync(process.execPath, [SCRIPT, ...args], { encoding: "utf8", env: { ...process.env, DRWIL_ROOT: racine } });
  assert.match(lancer().stderr, /^usage: node \.githooks\/note\.mjs/);
  assert.equal(lancer("--x").status, 2);
  const ok = lancer("une", "idée");
  assert.equal(ok.status, 0, ok.stderr);
  assert.match(ok.stdout, /note added to idees\/notes\.md/);
  assert.match(lire(racine, "idees/notes.md"), /^\*\*Status\*\*: open permanently — last note on \d{4}-\d{2}-\d{2}\.$/m);
  assert.match(lire(racine, "idees/notes.md"), /— une idée\n$/);
  const sortie = [];
  const { error } = console;
  console.error = (m) => sortie.push(m);
  try {
    assert.equal(main([], racine), 2);
  } finally {
    console.error = error;
  }
  assert.match(sortie[0], /^usage: /);
});

test("QUA-071 : un fichier de notes sans retour à la ligne final reçoit la note sur sa propre ligne ; usage en français", () => {
  const racine = depot();
  mkdirSync(join(racine, "docs/intentions"), { recursive: true });
  writeFileSync(join(racine, "docs/intentions/notes.md"), "# Intention : notes\n\n## Notes\n- 2026-01-01 — ancienne");
  assert.equal(note(racine, "nouvelle", { now: JOUR }).code, 0);
  assert.ok(lire(racine, "docs/intentions/notes.md").endsWith("— ancienne\n- 2026-10-20 — nouvelle\n"));
  const { error } = console;
  const sortie = [];
  console.error = (m) => sortie.push(m);
  try {
    assert.equal(main([], racine), 2);
  } finally {
    console.error = error;
  }
  assert.match(sortie[0], /^usage : /);
});
