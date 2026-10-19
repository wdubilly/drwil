import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";
import { headerProblems, skillHeaderProblems } from "./skill-headers.mjs";

const RACINE = join(dirname(fileURLToPath(import.meta.url)), "..");
const SKILLS = join(RACINE, "packages", "drwil", "templates", "common", "tools", "claude", ".claude", "skills");
const enTete = (...lignes) => ["---", ...lignes, "---", "", "corps"].join("\n");

test("QUA-062 : chaque en-tête de skill livré se lit en YAML strict, et le contrôle est d'accord avec le vrai parseur", () => {
  const skills = readdirSync(SKILLS, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);
  assert.ok(skills.length > 10);
  for (const nom of skills) {
    const texte = readFileSync(join(SKILLS, nom, "SKILL.md"), "utf8");
    const brut = /^---\n([\s\S]*?)\n---/.exec(texte)[1];
    assert.doesNotThrow(() => parse(brut), nom);
    assert.deepEqual(headerProblems(texte), [], nom);
  }
});

test("QUA-062 : la description fautive de start-a-workstream est refusée par le contrôle comme par le parseur", () => {
  const fautif = "description: Lance un chantier — la réponse lue par l'outil (plusieurs fiches: la file) puis la suite.";
  assert.throws(() => parse(fautif));
  const [probleme, ...reste] = headerProblems(enTete(fautif));
  assert.equal(reste.length, 0);
  assert.match(probleme, /ligne 2 .*description.*entre guillemets/);
});

test("QUA-062 : une valeur entre guillemets, vide, en liste ou en suite indentée est acceptée ; commentaires et vides ignorés", () => {
  const texte = enTete(
    "# commentaire",
    "",
    'argument-hint: "[a|b]: c"',
    "name: 'drwil'",
    "tools:",
    "  - a: b",
    "liste: [a, b]",
    "objet: {a: 1}",
    "description: Une phrase simple, avec un tiret — et une apostrophe d'ici.",
  );
  assert.deepEqual(headerProblems(texte), []);
  assert.doesNotThrow(() => parse(texte.split("---")[1]));
});

test("QUA-062 : en-tête absent, jamais refermé, ligne illisible, guillemet ouvert, caractère réservé, « : » ou « # » : refusés", () => {
  assert.match(headerProblems("corps seul")[0], /absent/);
  assert.match(headerProblems("---\nname: x\ncorps")[0], /jamais refermé/);
  assert.match(headerProblems(enTete("pas une clé"))[0], /ligne 2 : ni/);
  assert.match(headerProblems(enTete('name: "ouvert'))[0], /guillemet mal refermé/);
  assert.match(headerProblems(enTete('name: "'))[0], /guillemet mal refermé/);
  assert.match(headerProblems(enTete("name: `code` suivi"))[0], /caractère réservé/);
  assert.match(headerProblems(enTete("name: a: b"))[0], /« : » ou « # »/);
  assert.match(headerProblems(enTete("name: fin:"))[0], /« : » ou « # »/);
  assert.match(headerProblems(enTete("name: a #b"))[0], /« : » ou « # »/);
  assert.deepEqual(headerProblems(enTete("name: a#b")), []);
});

test("QUA-062 : les messages existent en anglais, le français est le repli", () => {
  assert.match(headerProblems("corps", "en")[0], /missing YAML header/);
  assert.match(headerProblems("---\nx: y", "en")[0], /never closed/);
  assert.match(headerProblems(enTete("pas une clé"), "en")[0], /^line 2: neither/);
  assert.match(headerProblems(enTete('name: "x'), "en")[0], /unclosed quote/);
  assert.match(headerProblems(enTete("name: `x`"), "en")[0], /reserved character/);
  assert.match(headerProblems(enTete("name: a: b"), "en")[0], /quote it/);
  assert.match(headerProblems("corps", "de")[0], /absent/);
  assert.deepEqual(skillHeaderProblems("/introuvable", "de"), []);
});

test("QUA-062 : skillHeaderProblems nomme le fichier fautif, ignore un dossier sans SKILL.md et un projet sans skills", () => {
  const dossier = mkdtempSync(join(tmpdir(), "drwil-skill-headers-"));
  try {
    assert.deepEqual(skillHeaderProblems(dossier), []);
    const base = join(dossier, ".claude", "skills");
    for (const [nom, contenu] of [
      ["bon", enTete("name: bon")],
      ["mauvais", enTete("description: a: b")],
    ]) {
      mkdirSync(join(base, nom), { recursive: true });
      writeFileSync(join(base, nom, "SKILL.md"), contenu);
    }
    mkdirSync(join(base, "vide"));
    writeFileSync(join(base, "fichier.md"), "pas un dossier");
    const problemes = skillHeaderProblems(dossier, "en");
    assert.equal(problemes.length, 1);
    assert.match(problemes[0], /^\.claude\/skills\/mauvais\/SKILL\.md: line 2/);
    assert.match(skillHeaderProblems(dossier, "de")[0], /SKILL\.md : ligne 2/);
  } finally {
    rmSync(dossier, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
});
