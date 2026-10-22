import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { recordedReasons, reviewDocuments, sinceTag } from "./release-review.mjs";

for (const nom of Object.keys(process.env)) if (nom.startsWith("GIT_")) delete process.env[nom];

let dossiers = [];
afterEach(() => {
  for (const d of dossiers) rmSync(d, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  dossiers = [];
});
function git(racine, ...args) {
  const r = spawnSync("git", args, { cwd: racine, encoding: "utf8" });
  assert.equal(r.status, 0, `git ${args.join(" ")} : ${r.stderr}`);
}
function ecrire(racine, chemin, contenu) {
  mkdirSync(dirname(join(racine, chemin)), { recursive: true });
  writeFileSync(join(racine, chemin), contenu);
}
function commit(racine, fichiers, message) {
  for (const [chemin, contenu] of Object.entries(fichiers)) ecrire(racine, chemin, contenu);
  git(racine, "add", "-A");
  git(racine, "commit", "-qm", message);
}
/** Dépôt tagué v1.0.0 avec les trois documents rédigés. */
function depot() {
  const racine = mkdtempSync(join(tmpdir(), "drwil-review-"));
  dossiers.push(racine);
  git(racine, "init", "-q", "-b", "master");
  git(racine, "config", "user.email", "test@example.invalid");
  git(racine, "config", "user.name", "Test");
  commit(racine, { "README.md": "# Produit\n", "docs/features.md": "# F\n", "docs/architecture.md": "# A\n" }, "init");
  git(racine, "tag", "v1.0.0");
  return racine;
}

test("QUA-098 examen avant le tag : un document inchangé sans raison bloque, la raison enregistrée le libère", () => {
  const racine = depot();
  commit(
    racine,
    { "src/a.js": "1", "README.md": "# Produit v2\n", "docs/projects/journal.md": "# J\n\n## 2026-10-22 — Chantier X\n" },
    "feat",
  );
  let r = reviewDocuments(racine, { tag: "v1.0.0", version: "v1.1.0" });
  assert.equal(r.ok, false);
  assert.match(r.lines.join("\n"), /chantiers clos : 2026-10-22 — Chantier X ; fichiers de code touchés : 1/);
  assert.match(r.lines.join("\n"), /✓ README\.md : modifié depuis le dernier tag/);
  assert.match(r.lines.join("\n"), /✗ docs\/features\.md : inchangé depuis le dernier tag, sans raison enregistrée/);
  assert.match(r.lines.at(-1), /docs\/release-review\.md la ligne : - v1\.1\.0 — `<fichier>` — inchangé : <raison>/);
  assert.equal(r.refused, "examen des documents non fait : v1.1.0");
  ecrire(
    racine,
    "docs/release-review.md",
    "# Examen\n\n- v1.1.0 — `docs/features.md` — inchangé : aucun écran nouveau\n- v1.1.0 — `docs/architecture.md` — unchanged: same layers\n- v1.0.0 — `README.md` — inchangé : autre version\n",
  );
  r = reviewDocuments(racine, { tag: "v1.0.0", version: "v1.1.0", lang: "en" });
  assert.equal(r.ok, true, r.lines.join("\n"));
  assert.match(r.lines.join("\n"), /✓ docs\/features\.md: unchanged — aucun écran nouveau/);
});

test("QUA-098 examen avant le tag : le texte du squelette bloque toujours ; sans tag, tout est nouveau", () => {
  const racine = depot();
  commit(racine, { "docs/features.md": "*(template to fill in by the project)*\n" }, "squelette");
  let r = reviewDocuments(racine, { tag: null, version: "v0.1.0" });
  assert.equal(r.ok, false);
  assert.match(r.lines.join("\n"), /✗ docs\/features\.md : texte du squelette encore présent/);
  assert.match(r.lines[0], /depuis —/);
  rmSync(join(racine, "docs", "features.md"));
  r = reviewDocuments(racine, { tag: null, version: "v0.1.0" });
  assert.equal(r.ok, true, "un document absent n'est pas examiné");
  assert.deepEqual(sinceTag(join(racine, "absent"), "v1.0.0"), { closed: [], code: [] }, "git en échec : rien");
  assert.deepEqual([...recordedReasons("- v1.0.0 — `README.md` — inchangé :   \n", "v1.0.0")], [], "raison vide refusée");
});
