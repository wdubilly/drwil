import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { main, noteTexts, notePath, publishNote, renderNote } from "./recette-note.mjs";

// Voir scope-gate.test.mjs : des GIT_* hérités feraient agir les tests sur le dépôt qui les lance.
for (const nom of Object.keys(process.env)) if (nom.startsWith("GIT_")) delete process.env[nom];

const SCRIPT = fileURLToPath(new URL("./recette-note.mjs", import.meta.url));
let dossiers = [];
afterEach(() => {
  for (const d of dossiers) rmSync(d, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  dossiers = [];
});
const tmp = () => {
  const d = mkdtempSync(join(tmpdir(), "drwil-note-recette-"));
  dossiers.push(d);
  return d;
};
function git(racine, ...args) {
  const r = spawnSync("git", args, { cwd: racine, encoding: "utf8" });
  assert.equal(r.status, 0, `git ${args.join(" ")} : ${r.stderr}`);
  return r.stdout.trim();
}
/** Dépôt avec un origin nu local où master est poussée (la note part de la branche principale distante). */
function depot({ origine = true, branche = "master" } = {}) {
  const racine = tmp();
  git(racine, "init", "-q", "-b", branche);
  git(racine, "config", "user.email", "test@example.invalid");
  git(racine, "config", "user.name", "Test");
  git(racine, "config", "core.hooksPath", "/dev/null");
  writeFileSync(join(racine, "a.txt"), "a");
  git(racine, "add", "-A");
  git(racine, "commit", "-q", "-m", "a");
  let nu = null;
  if (origine) {
    nu = tmp();
    git(nu, "init", "-q", "--bare", "-b", branche);
    git(racine, "remote", "add", "origin", nu);
    git(racine, "push", "-q", "origin", branche);
  }
  return { racine, nu };
}
const FICHE = "# Fiche de recette — v1.1.0-rc.1\n\n## À valider\n\n- **v1.1.0-P1** — critère\n";
const TARBALLS = [{ name: "a-1.1.0.tgz", sha256: "f".repeat(64) }];
const VERDICT = {
  version: 1,
  tag: "v1.1.0-rc.1",
  verdict: "reserved",
  points: [
    { type: "reserve", id: "v1.1.0-P1", what: "Lisible", issue: "https://exemple.invalid/i/1" },
    { type: "reserve", id: "v1.1.0-P2", what: "Lente", issue: null },
    { type: "refusal", id: "v1.1.0-P3", what: "jamais là", issue: null },
  ],
  note: "à revoir",
  by: "recetteuse",
  at: "2026-10-19T10:00:00.000Z",
};
const base = {
  version: "v1.1.0",
  tag: "v1.1.0-rc.1",
  url: "https://exemple.invalid/r",
  sheet: FICHE,
  tarballs: TARBALLS,
  date: "2026-10-21",
};

/** gh simulé : enregistre les appels, `pr create` renvoie une URL (ou échoue). */
function ghSimule({ pr = true } = {}) {
  const appels = [];
  const run = (cmd, args) => {
    appels.push([cmd, ...args]);
    return cmd === "gh" && args[0] === "pr" && pr ? "https://exemple.invalid/pull/7\n" : null;
  };
  return { run, appels };
}

test("QUA-078 : note approuvée — verdict, auteur, date, empreinte, fiche reprise ; aucune réserve", () => {
  const T = noteTexts(tmp());
  const note = renderNote({ ...base, verdict: { ...VERDICT, verdict: "approved", points: [], note: null } }, T);
  assert.equal(notePath("v1.1.0"), "docs/recettes/v1.1.0.md");
  assert.match(note, /^# Note de recette de v1\.1\.0\n/);
  assert.match(note, /Candidate : \[v1\.1\.0-rc\.1\]\(https:\/\/exemple\.invalid\/r\)/);
  assert.match(note, /Verdict : approuvée, donné par @recetteuse le 2026-10-19T10:00:00\.000Z/);
  assert.doesNotMatch(note, /Réserves|sans verdict/);
  assert.match(note, /- `a-1\.1\.0\.tgz` — sha256 `f{64}`/);
  assert.match(note, /^## Fiche de recette — v1\.1\.0-rc\.1$/m);
  assert.match(note, /^### À valider$/m);
  assert.match(note, /\*\*v1\.1\.0-P1\*\* — critère/);
  assert.ok(note.endsWith("\n") && !note.endsWith("\n\n"));
});

test("QUA-078 : note avec réserves — réserves et issues listées, refus jamais repris, note du verdict reprise", () => {
  const note = renderNote({ ...base, verdict: VERDICT }, noteTexts(tmp()));
  assert.match(note, /Verdict : approuvée avec réserves, donné par @recetteuse/);
  assert.match(note, /### Réserves\n\n- v1\.1\.0-P1 : Lisible \(https:\/\/exemple\.invalid\/i\/1\)\n- v1\.1\.0-P2 : Lente\n/);
  assert.doesNotMatch(note, /jamais là/);
  assert.match(note, /Note du verdict : à revoir/);
});

test("QUA-079 : note sans verdict — mention « sans verdict », parties à compléter, changements, empreintes ; en anglais aussi", () => {
  const racine = tmp();
  const sans = { version: "v1.2.0", date: "2026-10-21", tarballs: TARBALLS, commits: ["feat: un", "fix: deux"] };
  const note = renderNote(sans, noteTexts(racine));
  assert.match(note, /Verdict : sans verdict — version publiée sans candidate ni verdict de recette ; à compléter par l'humain/);
  assert.match(note, /## À compléter\n\n- Ce qui a été validé : …\n- Par qui : …\n- Quand : …\n/);
  assert.match(note, /## Changements\n\n- feat: un\n- fix: deux\n/);
  assert.match(note, /Publiée le 2026-10-21/);
  assert.match(note, /sha256 `f{64}`/);
  assert.doesNotMatch(note, /Candidate/);
  assert.match(renderNote({ ...sans, tarballs: [] }, noteTexts(racine)), /aucun tarball/);
  mkdirSync(join(racine, ".drwil"));
  writeFileSync(join(racine, ".drwil", "ia-first.json"), JSON.stringify({ lang: "en" }));
  assert.match(
    renderNote(sans, noteTexts(racine)),
    /Verdict: no verdict — version published without a candidate or an acceptance verdict; to be completed by a human/,
  );
});

test("QUA-078 : --dry-run montre la note sans rien écrire ; la note est écrite sur une branche dédiée poussée, jamais sur master, avec une PR", () => {
  const { racine, nu } = depot();
  const avant = git(racine, "rev-parse", "master");
  const sec = publishNote(racine, { version: "v1.1.0", note: "# Note\n", dryRun: true }, ghSimule());
  assert.equal(sec.code, 0);
  assert.match(sec.message, /docs\/recettes\/v1\.1\.0\.md/);
  assert.match(sec.message, /# Note\n/);
  assert.equal(git(nu, "branch", "--list").includes("recette/"), false);

  const { run, appels } = ghSimule();
  const r = publishNote(racine, { version: "v1.1.0", note: "# Note\n" }, { run });
  assert.equal(r.code, 0, r.message);
  assert.match(r.message, /https:\/\/exemple\.invalid\/pull\/7/);
  assert.equal(git(nu, "show", "recette/v1.1.0:docs/recettes/v1.1.0.md"), "# Note");
  assert.equal(git(nu, "rev-parse", "recette/v1.1.0~1"), avant, "la branche part de la branche principale distante");
  assert.equal(git(nu, "rev-parse", "master"), avant, "master distante intacte");
  assert.equal(git(racine, "rev-parse", "master"), avant);
  assert.equal(git(racine, "status", "--porcelain"), "", "ni arbre ni index touchés");
  assert.equal(existsSync(join(racine, "docs")), false);
  const pr = appels.find((a) => a[1] === "pr");
  assert.deepEqual(pr.slice(0, 3), ["gh", "pr", "create"]);
  assert.equal(pr[pr.indexOf("--base") + 1], "master");
  assert.equal(pr[pr.indexOf("--head") + 1], "recette/v1.1.0");
  assert.match(git(nu, "log", "-1", "--format=%s", "recette/v1.1.0"), /^Note de recette de v1\.1\.0$/);
});

test("QUA-078 : branche principale `main` reconnue ; note déjà présente = rien à refaire", () => {
  const { racine, nu } = depot({ branche: "main" });
  const { run, appels } = ghSimule();
  assert.equal(publishNote(racine, { version: "v1.1.0", note: "n\n" }, { run }).code, 0);
  assert.equal(appels[0][appels[0].indexOf("--base") + 1], "main");
  git(racine, "fetch", "-q", "origin");
  git(racine, "merge", "-q", "--ff-only", "origin/recette/v1.1.0");
  git(racine, "push", "-q", "origin", "main");
  const encore = ghSimule();
  const r = publishNote(racine, { version: "v1.1.0", note: "n\n" }, encore);
  assert.equal(r.code, 0);
  assert.match(r.message, /déjà dans le dépôt/);
  assert.equal(encore.appels.length, 0);
  assert.equal(git(nu, "branch", "--list", "recette/*").split("\n").length, 1);
});

test("QUA-080 : échec de la branche ou de la PR — signalé avec la commande de rattrapage, la note gardée dans un fichier", () => {
  const sans = depot({ origine: false });
  let r = publishNote(sans.racine, { version: "v1.1.0", note: "# Note\n" }, ghSimule());
  assert.equal(r.code, 1);
  const fichier = /recette-note\.mjs v1\.1\.0 (\S+\.md)/.exec(r.message)?.[1];
  assert.ok(fichier, r.message);
  assert.equal(readFileSync(fichier, "utf8"), "# Note\n");
  assert.match(r.message, /la release publiée n'est pas défaite/);

  const { racine, nu } = depot();
  r = publishNote(racine, { version: "v1.1.0", note: "# Note\n" }, ghSimule({ pr: false }));
  assert.equal(r.code, 1);
  assert.match(
    r.message,
    /branche recette\/v1\.1\.0 poussée, mais la PR a échoué ; rattraper : gh pr create --base master --head recette\/v1\.1\.0/,
  );
  assert.ok(git(nu, "rev-parse", "recette/v1.1.0"));

  const sansFichier = publishNote(racine, { version: "v1.2.0", note: "n\n", file: join(tmp(), "absent.md") }, ghSimule());
  assert.equal(sansFichier.code, 1);
  assert.match(sansFichier.message, /branche recette\/v1\.2\.0 non créée ou non poussée : note non écrite/);

  const rejoue = publishNote(racine, { version: "v1.1.0", note: "# Autre\n" }, ghSimule());
  assert.equal(rejoue.code, 1, "branche distante déjà là : pas d'écrasement");
});

test("QUA-080 : push refusé — la sortie de git (raison du refus) est montrée, avec la commande de rattrapage", () => {
  const { racine, nu } = depot();
  const crochet = join(nu, "hooks", "pre-receive");
  writeFileSync(crochet, "#!/bin/sh\necho 'refus du distant : branche protégée' >&2\nexit 1\n");
  chmodSync(crochet, 0o755);
  const r = publishNote(racine, { version: "v1.3.0", note: "# Note\n" }, ghSimule());
  assert.equal(r.code, 1);
  assert.match(r.message, /branche recette\/v1\.3\.0 non créée ou non poussée : note non écrite\nsortie de git :\n {2}/);
  assert.match(r.message, /refus du distant : branche protégée/);
  assert.match(r.message, /rattraper la note : node \.githooks\/recette-note\.mjs v1\.3\.0 \S+\.md/);

  const sansFichier = publishNote(racine, { version: "v1.4.0", note: "n\n", file: join(tmp(), "absent.md") }, ghSimule());
  assert.match(sansFichier.message, /sortie de git :\n {2}git hash-object : /);
});

test("QUA-080 : ligne de commande — rattrape une note depuis son fichier ; usage ; --dry-run", () => {
  const { racine } = depot();
  const fichier = join(tmp(), "note.md");
  writeFileSync(fichier, "# Note\n");
  const sortie = [];
  const { log, error } = console;
  Object.assign(console, { log: (m) => sortie.push(m), error: (m) => sortie.push(m) });
  try {
    assert.equal(main([], racine), 2);
    assert.equal(main(["v1.1.0", join(tmp(), "absent.md")], racine), 2);
    assert.equal(main(["v1.1.0", fichier, "--dry-run"], racine, ghSimule()), 0);
    assert.equal(main(["v1.1.0", fichier], racine, ghSimule()), 0);
    assert.equal(main(["v1.1.0", fichier], depot({ origine: false }).racine, ghSimule()), 1);
  } finally {
    Object.assign(console, { log, error });
  }
  assert.match(sortie[0], /^usage : node \.githooks\/recette-note\.mjs/);
  assert.match(sortie.join("\n"), /✓ .*https:\/\/exemple\.invalid\/pull\/7/);
  assert.equal(spawnSync(process.execPath, [SCRIPT], { encoding: "utf8" }).status, 2);
});
