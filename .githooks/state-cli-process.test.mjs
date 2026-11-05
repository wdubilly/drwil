import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { fill } from "./state-messages.mjs";
import { texts } from "./state-validate.mjs";

// Chaque sous-commande lancée comme un humain ou un agent la lance : un vrai processus `node state.mjs`.
// Les autres tests appellent main() dans leur processus, où state.mjs est déjà chargé : ils n'auraient
// pas vu l'import circulaire qui fait sortir Node en code 13 sans rien écrire (PR #361).

// Hérités d'un hook, GIT_DIR, GIT_INDEX_FILE… feraient agir les tests sur le dépôt qui les lance.
for (const nom of Object.keys(process.env)) if (nom.startsWith("GIT_")) delete process.env[nom];

const STATE = fileURLToPath(new URL("./state.mjs", import.meta.url));
const FICHE = "docs/projects/exemple.md";
const BRANCHE = "workstream/exemple";
const FICHE_TEXTE = `# Projet : Exemple

**Statut** : cadré le 2026-11-05.

<!-- scope
files:
  - src/exemple.js
-->

## Critères d'acceptation

- Exemple — contrat à créer

## 6. Increments

- **Lot 1 — lire** [IA] : détail.
- **Lot 2 — écrire** [IA] : détail.
`;

let dossiers = [];
afterEach(() => {
  for (const d of dossiers) rmSync(d, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  dossiers = [];
});

// La CI n'a pas d'identité git : chaque commit la reçoit explicitement.
function git(racine, ...args) {
  const r = spawnSync("git", ["-c", "user.name=t", "-c", "user.email=t@t.invalid", ...args], { cwd: racine, encoding: "utf8" });
  assert.equal(r.status, 0, `git ${args.join(" ")} : ${r.stderr}`);
  return r.stdout.trim();
}

/** Un dépôt `origin` nu et son clone `<parent>/projet`, une fiche cadrée à lots poussée sur master. */
function depot() {
  const parent = mkdtempSync(join(tmpdir(), "drwil-state-cli-"));
  dossiers.push(parent);
  const origine = join(parent, "origine.git");
  git(parent, "init", "-q", "--bare", "-b", "master", origine);
  const racine = join(parent, "projet");
  git(parent, "clone", "-q", origine, racine);
  git(racine, "checkout", "-q", "-b", "master");
  for (const [chemin, contenu] of Object.entries({
    [FICHE]: FICHE_TEXTE,
    ".drwil/ia-first.json": JSON.stringify({ lang: "fr" }),
    ".gitignore": ".drwil/state.json\n",
  })) {
    mkdirSync(dirname(join(racine, chemin)), { recursive: true });
    writeFileSync(join(racine, chemin), contenu);
  }
  git(racine, "add", "-A");
  git(racine, "commit", "-q", "-m", "initial");
  git(racine, "push", "-q", "origin", "master");
  return { parent, racine };
}

/** `node state.mjs <args>` dans un vrai processus, entrée standard fermée (aucun terminal). */
function lancer(racine, args, input = "") {
  return spawnSync(process.execPath, [STATE, ...args], {
    cwd: racine,
    encoding: "utf8",
    input,
    timeout: 60_000,
    env: { ...process.env, DRWIL_ROOT: racine },
  });
}

/** La commande a rendu la main d'elle-même, avec sa sortie : ni code 13, ni await en suspens, ni délai dépassé. */
function rendLaMain(r, args) {
  const nom = `state.mjs ${args.join(" ")}`;
  assert.equal(r.signal, null, `${nom} : tuée après le délai (${r.signal})`);
  assert.notEqual(r.status, 13, `${nom} : code 13 — ${r.stderr}`);
  assert.doesNotMatch(r.stderr, /unsettled top-level await/, nom);
  assert.ok(`${r.stdout}${r.stderr}`.trim(), `${nom} : aucune sortie`);
}

test("QUA-248 : chaque sous-commande de state.mjs, lancée dans un vrai processus, rend la main avec sa sortie", () => {
  const { racine } = depot();
  const commandes = [
    [[], 0],
    [["--json"], 0],
    [["briefs"], 0],
    [["briefs", "--json"], 0],
    [["resume"], 1],
    [["lot"], 0],
    [["reminder"], 0],
    [["copilot-start"], 0],
    [["copilot-message"], 0, JSON.stringify({ transformedPrompt: "bonjour" })],
    [["gemini-start"], 0],
    [["gemini-message"], 0],
    [["next"], 1],
    [["queue", "stop"], 0],
    [["reopen"], 1],
    [["accept"], 1],
    [["move"], 2],
    [["start", FICHE], 1],
  ];
  for (const [args, code, input] of commandes) {
    const r = lancer(racine, args, input);
    rendLaMain(r, args);
    assert.equal(r.status, code, `state.mjs ${args.join(" ")} : ${r.stdout}${r.stderr}`);
  }
  const briefs = JSON.parse(lancer(racine, ["briefs", "--json"]).stdout);
  assert.deepEqual(
    briefs.map((b) => b.path),
    [FICHE],
  );
});

test("QUA-248 : resume puis lot et lot next, en vrai processus, sur la branche du chantier", () => {
  const { racine } = depot();
  git(racine, "checkout", "-q", "-b", BRANCHE);
  for (const [args, attendu] of [
    [["resume"], /BUILD/],
    [["lot"], /Lot courant : 1/],
    [["lot", "next"], /Lot courant : 2|2 — écrire/],
  ]) {
    const r = lancer(racine, args);
    rendLaMain(r, args);
    assert.equal(r.status, 0, `state.mjs ${args.join(" ")} : ${r.stdout}${r.stderr}`);
    assert.match(r.stdout, attendu, `state.mjs ${args.join(" ")}`);
  }
  const etat = JSON.parse(readFileSync(join(racine, ".drwil", "state.json"), "utf8"));
  assert.equal(etat.activity, "BUILD");
  assert.equal(etat.active_brief, FICHE);
});

test("QUA-248 : start vers un nouveau worktree, réponses d'un terminal, rend la main et lance le chantier", async () => {
  const { parent, racine } = depot();
  const T = texts(racine);
  // Un terminal simulé : les questions ne se posent qu'à un humain devant son terminal.
  const tty = "data:text/javascript,process.stdin.isTTY=true;process.stdout.isTTY=true;";
  const enfant = spawn(process.execPath, ["--import", tty, STATE, "start", FICHE], {
    cwd: racine,
    env: { ...process.env, DRWIL_ROOT: racine },
  });
  // Chaque réponse part quand sa question est affichée : une ligne reçue avant serait perdue.
  const reponses = [
    [fill(T.confirmStart, FICHE), "START"],
    [T.askMerge, ""],
    [T.askWorktree, "WORKTREE"],
  ];
  let [sortie, erreurs] = ["", ""];
  enfant.stdout.on("data", (d) => {
    sortie += d;
    while (reponses.length && sortie.includes(reponses[0][0])) enfant.stdin.write(`${reponses.shift()[1]}\n`);
    if (!reponses.length) enfant.stdin.end();
  });
  enfant.stderr.on("data", (d) => {
    erreurs += d;
  });
  const minuterie = setTimeout(() => enfant.kill(), 60_000);
  const [status, signal] = await new Promise((fin) => enfant.on("close", (c, s) => fin([c, s])));
  clearTimeout(minuterie);
  rendLaMain({ status, signal, stdout: sortie, stderr: erreurs }, ["start", FICHE]);
  assert.equal(status, 0, `${sortie}${erreurs}`);
  const voisin = join(parent, "projet-exemple");
  assert.ok(existsSync(voisin), `worktree absent : ${sortie}`);
  const etat = JSON.parse(readFileSync(join(voisin, ".drwil", "state.json"), "utf8"));
  assert.equal(etat.activity, "BUILD");
  assert.equal(etat.active_brief, FICHE);
});
