import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PassThrough } from "node:stream";
import { fileURLToPath } from "node:url";
import { renderSheet, sheetTexts } from "./acceptance-sheet.mjs";
import { asset, main, parseArgs, record, sheetAsset, VERDICT_ASSET } from "./release-verdict.mjs";
import * as sondage from "./release-verdict-poll.mjs";

const SCRIPT = fileURLToPath(new URL("./release-verdict.mjs", import.meta.url));
const SCRIPT_SONDAGE = fileURLToPath(new URL("./release-verdict-poll.mjs", import.meta.url));
let dossiers = [];
afterEach(() => {
  for (const d of dossiers) rmSync(d, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  dossiers = [];
});
const tmp = () => {
  const d = mkdtempSync(join(tmpdir(), "drwil-verdict-"));
  dossiers.push(d);
  return d;
};
const TAG = "v1.1.0-rc.1";
const FICHE = renderSheet(
  {
    tag: TAG,
    version: "v1.1.0",
    commit: "0123456789",
    from: "v1.0.0",
    repo: null,
    points: [
      { id: "v1.1.0-P1", kind: "human", what: "Lisible", how: "Lire", work: null },
      { id: "v1.1.0-P2", kind: "limit", what: "Lente", how: "Juger", work: null },
    ],
    verdict: null,
    proven: [],
    os: [],
    tarballs: null,
    packages: null,
  },
  sheetTexts(tmpdir()),
);

/** gh simulé : release view, téléchargement d'assets, identité, issues, envoi et édition de la release. */
function gh({
  view = { isPrerelease: true, url: "https://exemple.invalid/r", body: "corps" },
  assets = {},
  login = "recetteuse",
  issue = "https://exemple.invalid/i/1",
  upload = true,
  edit = true,
} = {}) {
  const appels = [];
  const run = (cmd, args) => {
    assert.equal(cmd, "gh");
    appels.push(args);
    const [a, b] = args;
    if (a === "release" && b === "view") return view ? JSON.stringify(view) : null;
    if (a === "release" && b === "download") {
      const nom = args[args.indexOf("--pattern") + 1];
      if (!(nom in assets)) return null;
      if (assets[nom] !== null) writeFileSync(join(args[args.indexOf("--dir") + 1], nom), assets[nom]);
      return "";
    }
    if (a === "api") return login;
    if (a === "issue") return issue;
    if (b === "upload") {
      appels.verdict = JSON.parse(readFileSync(args[3], "utf8"));
      return upload ? "" : null;
    }
    appels.notes = readFileSync(args[4], "utf8");
    return edit ? "" : null;
  };
  return { run, appels };
}
const oui = async (question, attendu) => {
  oui.question = question;
  return attendu === TAG;
};
const now = new Date("2026-10-19T10:00:00Z");
const avec = { [sheetAsset(TAG)]: FICHE };

test("QUA-053 : options — approuvée, réserves, refus, note ; incohérentes = usage", () => {
  assert.deepEqual(parseArgs([TAG, "--approve"]), { tag: TAG, approve: true, reserves: [], refusals: [], note: null });
  assert.deepEqual(parseArgs([TAG, "--reserve", "P1", "--refuse", "P2", "--note", "n"]), {
    tag: TAG,
    approve: false,
    reserves: ["P1"],
    refusals: ["P2"],
    note: "n",
  });
  for (const args of [[], ["--approve"], [TAG], [TAG, "--approve", "--reserve", "P1"], [TAG, "--reserve"], [TAG, "--inconnu"]])
    assert.deepEqual(parseArgs(args), { error: "usage" });
});

test("QUA-053 : un agent ne l'exécute jamais — terminal interactif et confirmation exigés ; refus avant toute écriture", async () => {
  const racine = tmp();
  const opts = parseArgs([TAG, "--approve"]);
  assert.match((await record(racine, { ...opts, tag: "v1.1.0" })).message, /n'est pas une candidate/);
  const { run, appels } = gh({ assets: avec });
  assert.match((await record(racine, opts, { run })).message, /geste humain.*un agent ne l'exécute jamais/);
  assert.match((await record(racine, opts, { tty: true, run })).message, /geste humain/);
  assert.equal(appels.length, 0);
  const non = await record(racine, opts, { tty: true, confirm: async () => false, run });
  assert.match(non.message, /verdict non donné/);
  assert.ok(!appels.some((a) => a[1] === "upload"));
  assert.match((await record(racine, opts, { tty: true, confirm: oui, run: gh({ view: null }).run })).message, /pré-release introuvable/);
  assert.match(
    (await record(racine, opts, { tty: true, confirm: oui, run: gh({ view: { isPrerelease: false } }).run })).message,
    /n'est pas une pré-release/,
  );
  const deja = gh({ assets: { ...avec, [VERDICT_ASSET]: "{}" } }).run;
  assert.match((await record(racine, opts, { tty: true, confirm: oui, run: deja })).message, /a déjà un verdict/);
  assert.match(
    (await record(racine, opts, { tty: true, confirm: oui, run: gh().run })).message,
    /fiche de recette introuvable \(recette-v1\.1\.0-rc\.1\.md\)/,
  );
  const inconnu = await record(racine, parseArgs([TAG, "--reserve", "P9"]), { tty: true, confirm: oui, run });
  assert.match(inconnu.message, /point inconnu de la fiche de v1\.1\.0-rc\.1 : v1\.1\.0-P9/);
  assert.match(
    (await record(racine, opts, { tty: true, confirm: oui, run: gh({ assets: avec, login: null }).run })).message,
    /identité GitHub introuvable/,
  );
});

test("QUA-053 : approuvée — qui et quand gardés, enregistré sur la pré-release (asset et note), sans issue", async () => {
  const racine = tmp();
  const { run, appels } = gh({ assets: avec });
  const r = await record(racine, parseArgs([TAG, "--approve"]), { tty: true, confirm: oui, run, now });
  assert.equal(r.code, 0, r.message);
  assert.match(oui.question, /Verdict « approuvée » sur v1\.1\.0-rc\.1 — taper « v1\.1\.0-rc\.1 » pour confirmer/);
  assert.deepEqual(appels.verdict, {
    version: 1,
    tag: TAG,
    verdict: "approved",
    points: [],
    note: null,
    by: "recetteuse",
    at: "2026-10-19T10:00:00.000Z",
  });
  assert.ok(!appels.some((a) => a[0] === "issue"));
  assert.match(appels.notes, /^corps\n\n## Verdict de recette\n\n« approuvée », donné par @recetteuse le 2026-10-19T10:00:00\.000Z\.\n$/);
  assert.match(r.message, /verdict « approuvée » enregistré sur v1\.1\.0-rc\.1 par recetteuse/);
});

test("QUA-053 : réserves et refus cités par leur point ; chacun devient une issue", async () => {
  const racine = tmp();
  const { run, appels } = gh({ assets: avec });
  const r = await record(racine, parseArgs([TAG, "--reserve", "p1", "--note", "vu en recette"]), { tty: true, confirm: oui, run, now });
  assert.equal(r.code, 0, r.message);
  assert.equal(appels.verdict.verdict, "reserved");
  assert.deepEqual(appels.verdict.points, [{ type: "reserve", id: "v1.1.0-P1", what: "Lisible", issue: "https://exemple.invalid/i/1" }]);
  const issue = appels.find((a) => a[0] === "issue");
  assert.equal(issue[3], "v1.1.0-P1 (réserve) — Lisible");
  assert.match(issue[5], /Point v1\.1\.0-P1 .*Lisible\.\n\nNote : vu en recette\n\nÀ ranger .*défaut à corriger .*intention/);
  assert.match(appels.notes, /- v1\.1\.0-P1 \(réserve\) : https:\/\/exemple\.invalid\/i\/1\n\nNote : vu en recette\n$/);
  assert.match(r.message, /issue ouverte pour v1\.1\.0-P1/);

  const sansIssue = gh({ assets: avec, issue: null, edit: false, view: { isPrerelease: true, url: "u" } });
  const refus = await record(racine, parseArgs([TAG, "--reserve", "v1.1.0-P1", "--refuse", "P2"]), {
    tty: true,
    confirm: oui,
    run: sansIssue.run,
    now,
  });
  assert.equal(refus.code, 0, refus.message);
  assert.equal(sansIssue.appels.verdict.verdict, "refused");
  assert.deepEqual(
    sansIssue.appels.verdict.points.map((p) => [p.type, p.id, p.issue]),
    [
      ["reserve", "v1.1.0-P1", null],
      ["refusal", "v1.1.0-P2", null],
    ],
  );
  assert.match(sansIssue.appels.notes, /^\n\n## Verdict de recette\n\n« refusée »[\s\S]*- v1\.1\.0-P2 \(refus\) : Lente/);
  assert.match(refus.message, /issue non ouverte pour v1\.1\.0-P2[\s\S]*note de v1\.1\.0-rc\.1 non mise à jour/);

  const echec = await record(racine, parseArgs([TAG, "--approve"]), {
    tty: true,
    confirm: oui,
    run: gh({ assets: avec, upload: false }).run,
    now,
  });
  assert.equal(echec.code, 1);
  assert.match(echec.message, /verdict non enregistré sur v1\.1\.0-rc\.1/);
});

test("QUA-053 : asset — téléchargé, absent, ou annoncé sans fichier", () => {
  const dir = tmp();
  const { run } = gh({ assets: { "a.json": "x", "vide.json": null } });
  assert.equal(asset(run, TAG, "a.json", dir), "x");
  assert.equal(asset(run, TAG, "b.json", dir), null);
  assert.equal(asset(run, TAG, "vide.json", dir), null);
});

async function capturer(fn) {
  const { log, error } = console;
  const sortie = [];
  const erreurs = [];
  Object.assign(console, { log: (m) => sortie.push(m), error: (m) => erreurs.push(m) });
  try {
    return { code: await fn(), sortie: sortie.join("\n"), erreurs: erreurs.join("\n") };
  } finally {
    Object.assign(console, { log, error });
  }
}
/** Simule un terminal interactif : chaque invite (écriture se terminant par « : ») reçoit la réponse suivante. */
async function avecTerminal(reponses, fn) {
  const entree = new PassThrough();
  entree.isTTY = true;
  const descripteur = Object.getOwnPropertyDescriptor(process, "stdin");
  Object.defineProperty(process, "stdin", { value: entree, configurable: true });
  const { isTTY } = process.stdout;
  const ecrire = process.stdout.write;
  process.stdout.isTTY = true;
  process.stdout.write = (morceau, ...reste) => {
    if (/: $/.test(String(morceau))) {
      setImmediate(() => entree.write(`${reponses.shift() ?? ""}\n`));
      return true;
    }
    return ecrire.call(process.stdout, morceau, ...reste);
  };
  try {
    return await fn();
  } finally {
    process.stdout.write = ecrire;
    process.stdout.isTTY = isTTY;
    Object.defineProperty(process, "stdin", descripteur);
  }
}

test("QUA-053 : ligne de commande — usage, terminal interactif, en anglais ; lancé sans terminal, refusé", async () => {
  const racine = tmp();
  let r = await capturer(() => main([], racine));
  assert.equal(r.code, 2);
  assert.match(r.erreurs, /^usage : node \.githooks\/release-verdict\.mjs/);
  r = await capturer(() => main([TAG, "--approve"], racine));
  assert.equal(r.code, 1);
  assert.match(r.erreurs, /^✗ le verdict de recette est un geste humain/);
  mkdirSync(join(racine, ".drwil"));
  writeFileSync(join(racine, ".drwil", "ia-first.json"), JSON.stringify({ lang: "en" }));
  const { run } = gh({ assets: avec });
  r = await avecTerminal(["non"], () => capturer(() => main([TAG, "--approve"], racine, { run })));
  assert.match(r.erreurs, /^✗ verdict not given/);
  r = await avecTerminal([TAG], () => capturer(() => main([TAG, "--approve"], racine, { run, now })));
  assert.equal(r.code, 0, r.erreurs);
  assert.match(r.sortie, /^✓ verdict "approved" recorded on v1\.1\.0-rc\.1 by recetteuse on 2026-10-19/);
  const lance = spawnSync(process.execPath, [SCRIPT, TAG, "--approve"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  assert.equal(lance.status, 1);
  assert.match(lance.stderr, /geste humain|human gesture/);
});

test("QUA-053 : sondage drwil-verdict — préparé avec les contrôles du terminal, sans rien écrire ; arguments relus de sa première ligne", () => {
  const racine = tmp();
  const { run, appels } = gh({ assets: avec });
  const r = sondage.verdictPoll(racine, [TAG, "--note", "vu en recette", "--refuse", "P2", "--reserve", "p1"], { run });
  assert.equal(r.code, 0, r.message);
  const [q] = r.poll.questions;
  assert.equal(r.poll.questions.length, 1);
  assert.equal(q.header, "drwil-verdict");
  assert.ok(!("multiSelect" in q), "multiSelect:false n'est jamais écrit : Claude Code le retire avant le hook");
  assert.equal(
    q.question,
    [
      `drwil-verdict ${TAG} ["--reserve","p1","--refuse","P2","--note","vu en recette"]`,
      "Verdict de recette « refusée » sur v1.1.0-rc.1 — https://exemple.invalid/r",
      "- v1.1.0-P1 (réserve) : Lisible",
      "- v1.1.0-P2 (refus) : Lente",
      "Note : vu en recette",
      "",
      "Donner ce verdict ? Il est enregistré sur la pré-release avec votre identité GitHub (gh) et l'heure ; chaque réserve et chaque refus devient une issue.",
    ].join("\n"),
  );
  assert.deepEqual(
    q.options.map((o) => o.label),
    ["Donner le verdict", "Ne pas le donner"],
  );
  assert.ok(!q.options.some((o) => /recommand/i.test(o.label + o.description)), "aucune option recommandée");
  assert.deepEqual(r.data.args, [TAG, "--reserve", "p1", "--refuse", "P2", "--note", "vu en recette"]);
  assert.match(r.data.sheet, /^sha256:[0-9a-f]{64}$/);
  assert.ok(!appels.some((a) => a[0] === "issue" || a[1] === "upload" || a[1] === "edit" || a[0] === "api"), "la préparation n'écrit rien");
  // Le hook refait la préparation depuis la première ligne du sondage posé : le même sondage.
  const [, tag, json] = /^drwil-verdict (\S+) (\[.*\])\n/.exec(q.question);
  assert.deepEqual(sondage.verdictPoll(racine, sondage.pollArgs(tag, json), { run }).poll, r.poll);
  const approuvee = sondage.verdictPoll(racine, [TAG, "--approve"], { run });
  assert.match(approuvee.poll.questions[0].question, /^drwil-verdict v1\.1\.0-rc\.1 \["--approve"\]\nVerdict de recette « approuvée » sur/);
  // Refus du terminal repris tels quels.
  assert.match(sondage.verdictPoll(racine, ["v1.1.0", "--approve"], { run }).message, /n'est pas une candidate/);
  assert.match(sondage.verdictPoll(racine, [TAG, "--reserve", "P9"], { run }).message, /point inconnu de la fiche/);
  const deja = gh({ assets: { ...avec, [VERDICT_ASSET]: "{}" } }).run;
  assert.match(sondage.verdictPoll(racine, [TAG, "--approve"], { run: deja }).message, /a déjà un verdict/);
  for (const args of [null, [TAG], [TAG, "--approve", "--refuse", "P1"]]) {
    const u = sondage.verdictPoll(racine, args, { run });
    assert.equal(u.code, 2);
    assert.match(u.message, /^usage : node \.githooks\/release-verdict-poll\.mjs/);
  }
  assert.deepEqual(sondage.pollArgs(TAG, '["--approve"]'), [TAG, "--approve"]);
  for (const json of ["{}", "[1]", "[", '"--approve"']) assert.equal(sondage.pollArgs(TAG, json), null, json);
});

test("QUA-053 : verdict depuis le sondage — enregistré sur la candidate comme au terminal ; fiche changée ou refus du terminal, rien d'écrit", () => {
  const racine = tmp();
  const prepare = sondage.verdictPoll(racine, [TAG, "--reserve", "P1"], { run: gh({ assets: avec }).run });
  const { run, appels } = gh({ assets: avec });
  const r = sondage.verdictFromPoll(racine, prepare.data, { run, now });
  assert.equal(r.code, 0, r.message);
  assert.equal(appels.verdict.verdict, "reserved");
  assert.equal(appels.verdict.by, "recetteuse");
  assert.equal(appels.verdict.at, "2026-10-19T10:00:00.000Z");
  assert.deepEqual(
    appels.verdict.points.map((p) => p.id),
    ["v1.1.0-P1"],
  );
  assert.match(appels.notes, /## Verdict de recette\n\n« approuvée avec réserves », donné par @recetteuse/);
  assert.match(r.message, /verdict « approuvée avec réserves » enregistré sur v1\.1\.0-rc\.1 par recetteuse/);
  // La fiche de la candidate a changé pendant la question : rien n'est écrit.
  const autre = gh({ assets: { [sheetAsset(TAG)]: FICHE.replace("Lisible", "Illisible") } });
  assert.equal(sondage.verdictFromPoll(racine, prepare.data, { run: autre.run, now }), null);
  assert.ok(!autre.appels.some((a) => a[0] === "issue" || a[1] === "upload"));
  // Un verdict donné entre-temps : refusé, cause dite, rien d'écrit.
  const deja = gh({ assets: { ...avec, [VERDICT_ASSET]: "{}" } });
  assert.match(sondage.verdictFromPoll(racine, prepare.data, { run: deja.run, now }).message, /a déjà un verdict/);
  assert.ok(!deja.appels.some((a) => a[1] === "upload"));
  for (const data of [undefined, {}, { args: [TAG] }]) assert.equal(sondage.verdictFromPoll(racine, data, { run, now }), null);
});

test("QUA-053 : préparation du sondage en ligne de commande — JSON sur la sortie, refus et usage, en anglais", () => {
  const racine = tmp();
  let r = capturerSync(() => sondage.main([TAG, "--approve"], racine, { run: gh({ assets: avec }).run }));
  assert.equal(r.code, 0, r.erreurs);
  assert.equal(JSON.parse(r.sortie).questions[0].header, "drwil-verdict");
  r = capturerSync(() => sondage.main([TAG, "--approve"], racine, { run: gh({ view: null }).run }));
  assert.equal(r.code, 1);
  assert.match(r.erreurs, /^✗ v1\.1\.0-rc\.1 : pré-release introuvable/);
  mkdirSync(join(racine, ".drwil"));
  writeFileSync(join(racine, ".drwil", "ia-first.json"), JSON.stringify({ lang: "en" }));
  r = capturerSync(() => sondage.main([TAG, "--approve"], racine, { run: gh({ assets: avec }).run }));
  const q = JSON.parse(r.sortie).questions[0];
  assert.match(q.question, /\nAcceptance verdict "approved" on v1\.1\.0-rc\.1 — /);
  assert.deepEqual(
    q.options.map((o) => o.label),
    ["Give the verdict", "Do not give it"],
  );
  r = capturerSync(() => sondage.main([], racine));
  assert.equal(r.code, 2);
  assert.match(r.erreurs, /^usage: node \.githooks\/release-verdict-poll\.mjs/);
  const lance = spawnSync(process.execPath, [SCRIPT_SONDAGE], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  assert.equal(lance.status, 2, "sans argument, l'usage, sans appeler gh");
});

function capturerSync(fn) {
  const { log, error } = console;
  const sortie = [];
  const erreurs = [];
  Object.assign(console, { log: (m) => sortie.push(m), error: (m) => erreurs.push(m) });
  try {
    return { code: fn(), sortie: sortie.join("\n"), erreurs: erreurs.join("\n") };
  } finally {
    Object.assign(console, { log, error });
  }
}
