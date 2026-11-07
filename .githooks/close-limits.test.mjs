import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { close } from "./close.mjs";
import { limitProblems } from "./close-limits.mjs";
import { move } from "./state.mjs";

// Voir scope-gate.test.mjs : des GIT_* hérités feraient agir les tests sur le dépôt qui les lance.
for (const nom of Object.keys(process.env)) if (nom.startsWith("GIT_")) delete process.env[nom];

let dossiers = [];
afterEach(() => {
  for (const d of dossiers) rmSync(d, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  dossiers = [];
});
const dossier = () => {
  const d = mkdtempSync(join(tmpdir(), "drwil-limites-"));
  dossiers.push(d);
  return d;
};

const FICHE = "docs/projects/exemple.md";
const LIMITE = "docs/intentions/limite-a.md";
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
const fiche = (intention = "") =>
  `# Projet : Exemple\n\n**Statut** : cadré le 2026-11-07.\n${intention}\n<!-- scope\nfiles:\n  - src/a.mjs\n-->\n\n## Critères d'acceptation\n\n- Un critère — \`QUA-001\`\n\n## 6. Increments\n\n- **Lot 1** [IA] : tout.\n\n## 7. Reprise\n\nRien.\n`;
const INTENTION = (titre) => `# Intention : ${titre}\n\n**Statut** : relevé le 2026-11-07.\n`;
const etat = (racine, activite, limits) =>
  ecrire(racine, {
    ".drwil/state.json": JSON.stringify({
      version: 1,
      activity: activite,
      active_brief: FICHE,
      active_request: null,
      since: null,
      ...(limits ? { limits } : {}),
    }),
  });

/**
 * Dépôt temporaire : master avec un contrat et une intention, branche chantier/exemple avec la fiche, l'index et
 * une fiche d'intention `LIMITE` ajoutée par la branche (commitée), état `activite` avec les réponses `limits`.
 */
function depot({ activite = "CLOSING", limits, lang, intention = "" } = {}) {
  const racine = dossier();
  git(racine, "init", "-q", "-b", "master");
  ecrire(racine, {
    ".drwil/ia-first.json": JSON.stringify({ ...(lang ? { lang } : {}), contractPrefixes: ["QUA"] }),
    ".gitignore": ".drwil/state.json\n.drwil/evidence/\n",
    "docs/contracts.md": "# Contrats\n\n## QUA-001 — Un\n",
    "docs/intentions/ancienne.md": INTENTION("ancienne"),
  });
  git(racine, "add", "-A");
  git(racine, "commit", "-q", "-m", "initial");
  git(racine, "checkout", "-q", "-b", "chantier/exemple");
  ecrire(racine, {
    [FICHE]: fiche(intention),
    "docs/projects/pending.md": "# Index\n\n- [ ] [IA] Exemple — `docs/projects/exemple.md`.\n",
    [LIMITE]: INTENTION("limite a"),
  });
  git(racine, "add", "-A");
  git(racine, "commit", "-q", "-m", "cadrage et limite");
  etat(racine, activite, limits);
  return racine;
}

/** Évidence de verify pour HEAD : ce que la clôture complète exige. */
function evidence(racine) {
  const contenu = {
    status: "pass",
    commit: git(racine, "rev-parse", "HEAD"),
    dirtyWorktree: false,
    evidence: [{ id: "QUA-001", status: "pass", checks: [{ id: "tests-qua-001", status: "ok", summary: "ok" }], manual: null }],
  };
  ecrire(racine, { ".drwil/evidence/verify-2026-11-07T10-00-00-000Z.json": JSON.stringify(contenu) });
}

/** Dossier de journaux de Claude Code vide : la clôture n'en mesure rien. */
const journaux = () => dossier();

test("QUA-264 : une fiche d'intention ajoutée par la branche sans réponse « Noter en intention » refuse la clôture avant toute écriture, en nommant la limite et le sondage", () => {
  const racine = depot();
  const refus = close(racine, { logs: journaux() });
  assert.equal(refus.code, 1);
  assert.match(
    refus.message,
    /^Avant le commit, ce qui ferait échouer la clôture :\n {2}⚠ `docs\/intentions\/limite-a\.md` : fiche d'intention/,
  );
  assert.match(refus.message, /sans réponse « Noter en intention » de l'humain/);
  assert.match(refus.message, /sondage des limites \(en-tête `drwil-limite`, une question nommant ce chemin/);
  assert.ok(existsSync(join(racine, FICHE)), "fiche gardée");
  assert.match(readFileSync(join(racine, "docs/projects/pending.md"), "utf8"), /exemple/, "index intact");
  assert.ok(!existsSync(join(racine, "docs/preuves/exemple.md")), "aucune preuve écrite");
  assert.ok(!existsSync(join(racine, ".drwil/usage.jsonl")), "aucune consommation consignée");

  const verif = close(racine, { check: true });
  assert.equal(verif.code, 1);
  assert.match(verif.message, /⚠ `docs\/intentions\/limite-a\.md` : fiche d'intention ajoutée par la branche/);
});

test("QUA-264 : une limite répondue « Traiter maintenant » qui finit en fiche d'intention refuse la clôture ; répondue « Noter en intention », elle passe", () => {
  const racine = depot({ limits: [{ intent: LIMITE, choice: "now" }] });
  const refus = close(racine, { logs: journaux() });
  assert.equal(refus.code, 1);
  assert.match(
    refus.message,
    /`docs\/intentions\/limite-a\.md` : limite répondue « Traiter maintenant » par l'humain, devenue fiche d'intention/,
  );
  assert.match(refus.message, /`drwil-limite`/);
  assert.ok(existsSync(join(racine, FICHE)), "fiche gardée");

  etat(racine, "CLOSING", [{ intent: LIMITE, choice: "note" }]);
  assert.deepEqual(limitProblems(racine, readFileSync(join(racine, FICHE), "utf8")), []);
  evidence(racine);
  const r = close(racine, { logs: journaux() });
  assert.doesNotMatch(r.message, /limite-a/, r.message);
  assert.ok(!existsSync(join(racine, FICHE)), "réponse « Noter en intention » : la clôture passe");
});

test("QUA-264 : l'intention d'origine de la fiche, le README, les notes, une intention venue de la branche principale ne comptent pas ; une fiche non commitée compte", () => {
  const racine = depot({ intention: "**Intention** : `docs/intentions/origine.md`\n", limits: [{ intent: LIMITE, choice: "note" }] });
  git(racine, "checkout", "-q", "master");
  ecrire(racine, { "docs/intentions/venue-de-master.md": INTENTION("venue de master") });
  git(racine, "add", "-A");
  git(racine, "commit", "-q", "-m", "intention sur master");
  git(racine, "checkout", "-q", "chantier/exemple");
  git(racine, "merge", "-q", "--no-edit", "master");
  ecrire(racine, {
    "docs/intentions/origine.md": INTENTION("origine"),
    "docs/intentions/README.md": "# Intentions\n",
    "docs/intentions/notes.md": INTENTION("notes"),
  });
  git(racine, "add", "-A");
  git(racine, "commit", "-q", "-m", "origine, readme, notes");
  const texte = readFileSync(join(racine, FICHE), "utf8");
  assert.deepEqual(limitProblems(racine, texte), []);

  ecrire(racine, { "docs/intentions/non-commitee.md": INTENTION("non commitée") });
  const signaux = limitProblems(racine, texte);
  assert.equal(signaux.length, 1);
  assert.match(signaux[0], /^`docs\/intentions\/non-commitee\.md` : fiche d'intention ajoutée par la branche/);
});

test("QUA-264 : le refus est dit en quittant BUILD (ce qui ferait échouer la clôture), et en anglais", async () => {
  const racine = depot({ activite: "BUILD" });
  const m = await move(racine, { to: "EVIDENCE" });
  assert.equal(m.code, 0, m.message);
  assert.match(m.message, /Ce qui ferait échouer la clôture/);
  assert.match(m.message, /`docs\/intentions\/limite-a\.md` : fiche d'intention ajoutée par la branche/);

  const en = depot({ lang: "en", limits: [{ intent: LIMITE, choice: "now" }] });
  const refus = close(en, { logs: journaux() });
  assert.equal(refus.code, 1);
  assert.match(refus.message, /`docs\/intentions\/limite-a\.md`: limit answered « Handle now » by the human, turned into an intent brief/);
  const sans = depot({ lang: "en" });
  assert.match(close(sans, { check: true }).message, /intent brief added by the branch without the human's « Record as intent » answer/);
});
