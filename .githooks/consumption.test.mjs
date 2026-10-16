import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { activeTime, aggregate, format, group, logsFolder, main, PAUSE_MS, readLog, usageLine } from "./consumption.mjs";

const SCRIPT = fileURLToPath(new URL("./consumption.mjs", import.meta.url));
let dossiers = [];
afterEach(() => {
  for (const d of dossiers) rmSync(d, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  dossiers = [];
});
const dossier = () => {
  const d = mkdtempSync(join(tmpdir(), "drwil-conso-"));
  dossiers.push(d);
  return d;
};

const SECRET = "contenu-de-conversation-a-ne-jamais-afficher";
/** Une ligne de journal de réponse d'agent, au format de Claude Code. */
const reponse = ({ id, t, branche = "workstream/a", modele = "claude-opus-5-5", u = [10, 100, 1000, 50] }) =>
  JSON.stringify({
    type: "assistant",
    requestId: id,
    timestamp: t,
    gitBranch: branche,
    message: {
      model: modele,
      content: [{ type: "text", text: SECRET }],
      usage: { input_tokens: u[0], output_tokens: u[1], cache_read_input_tokens: u[2], cache_creation_input_tokens: u[3] },
    },
  });

/** Un projet avec un dossier de journaux ; rend { racine, journaux, lancer }. */
function projet(lignes, { lang } = {}) {
  const racine = dossier();
  const journaux = join(dossier(), "journaux");
  mkdirSync(join(journaux, "sous"), { recursive: true });
  writeFileSync(join(journaux, "s1.jsonl"), lignes.slice(0, 1).join("\n"));
  writeFileSync(join(journaux, "sous", "s2.jsonl"), lignes.slice(1).join("\n"));
  writeFileSync(join(journaux, "notes.txt"), SECRET);
  if (lang) {
    mkdirSync(join(racine, ".drwil"));
    writeFileSync(join(racine, ".drwil", "ia-first.json"), JSON.stringify({ lang }));
  }
  const lancer = (args, now = new Date("2026-10-16T12:00:00Z")) => {
    const out = [];
    const err = [];
    const code = main([...args, "--logs", journaux], { root: racine, log: (l) => out.push(l), err: (l) => err.push(l), now });
    return { code, out: out.join("\n"), err: err.join("\n") };
  };
  return { racine, journaux, lancer };
}

test("QUA-042 : lecture : seuls les champs de consommation des réponses d'agent ; illisibles comptées, synthétiques ignorées", () => {
  const texte = [
    reponse({ id: "r1", t: "2026-10-16T10:00:00Z" }),
    JSON.stringify({ type: "user", timestamp: "2026-10-16T10:00:00Z", message: { content: SECRET } }),
    JSON.stringify({ type: "assistant", timestamp: "2026-10-16T10:00:00Z", message: { model: "<synthetic>", usage: {} } }),
    JSON.stringify({ type: "assistant", timestamp: "2026-10-16T10:00:00Z", message: { content: SECRET } }),
    JSON.stringify({ type: "assistant", message: { usage: {} } }),
    JSON.stringify({ type: "assistant", uuid: "u1", timestamp: "2026-10-16T10:01:00Z", message: { usage: {} } }),
    JSON.stringify({ type: "assistant", timestamp: "2026-10-16T10:02:00Z", message: { id: "m1", model: "x", usage: {} } }),
    "{pas du json",
    "",
  ].join("\n");
  const { answers, unreadable } = readLog(texte);
  assert.equal(unreadable, 1);
  assert.deepEqual(answers, [
    {
      key: "r1",
      time: Date.parse("2026-10-16T10:00:00Z"),
      branch: "workstream/a",
      model: "claude-opus-5-5",
      usage: { input: 10, output: 100, cacheRead: 1000, cacheWrite: 50 },
    },
    {
      key: "u1",
      time: Date.parse("2026-10-16T10:01:00Z"),
      branch: null,
      model: "unknown",
      usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    },
    {
      key: "m1",
      time: Date.parse("2026-10-16T10:02:00Z"),
      branch: null,
      model: "x",
      usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    },
  ]);
  assert.doesNotMatch(JSON.stringify(answers), new RegExp(SECRET));
});

test("QUA-042 : regroupement : le cadrage et le chantier d'une fiche ensemble ; temps actif sans les pauses", () => {
  assert.equal(group("workstream/a"), "a");
  assert.equal(group("scoping/a"), "a");
  assert.equal(group("cadrage/a"), "a");
  assert.equal(group("chantier/a"), "a");
  assert.equal(group("main"), "(main branch)");
  assert.equal(group("master"), "(main branch)");
  assert.equal(group(null), "(no branch)");
  assert.equal(group("fix/x"), "(branch fix/x)");
  assert.equal(activeTime([0, 60000, 60000 + PAUSE_MS + 1, 60000 + PAUSE_MS + 60001]), 120000);
  assert.equal(activeTime([]), 0);
  const r = (key, branch, time, model = "m1") => ({
    key,
    branch,
    time,
    model,
    usage: { input: 1, output: 1, cacheRead: 10, cacheWrite: 4 },
  });
  const rows = aggregate(
    [
      r("1", "cadrage/a", 0),
      r("2", "workstream/a", 60000, "m2"),
      r("2", "workstream/a", 60000),
      r("3", "workstream/b", 0),
      r("4", "workstream/c", -1),
    ],
    {
      since: 0,
    },
  );
  assert.deepEqual(rows[0], {
    workstream: "a",
    requests: 2,
    input: 2,
    output: 2,
    cacheRead: 20,
    cacheWrite: 8,
    weighted: 24,
    models: ["m1", "m2"],
    minutes: 1,
  });
  assert.deepEqual(
    rows.map((x) => x.workstream),
    ["a", "b"],
  );
  assert.deepEqual(
    aggregate([r("1", "b", 0), r("2", "a", 0)]).map((x) => x.workstream),
    ["(branch a)", "(branch b)"],
    "à poids égal, ordre alphabétique",
  );
});

test("QUA-042 : relevé lisible ou JSON, dans la langue du projet ; aucun contenu de conversation", () => {
  const lignes = [
    reponse({ id: "r1", t: "2026-10-16T10:00:00Z", u: [2000, 3_000_000, 0, 0] }),
    reponse({ id: "r2", t: "2026-10-16T10:01:00Z", branche: "cadrage/a" }),
    reponse({ id: "r3", t: "2026-10-16T10:02:00Z", branche: "fix/x", u: [1, 1, 1, 1] }),
    "{illisible",
  ];
  const fr = projet(lignes).lancer([]);
  assert.equal(fr.code, 0);
  assert.match(fr.out, /^chantier +requêtes/);
  assert.match(fr.out, /^a +2 +2 k +3,0 M +1 k +50 +15,0 M +1 min +claude-opus-5-5$/m);
  assert.match(fr.out, /pondéré : indicatif/);
  assert.match(fr.out, /^\(branche fix\/x\) /m);
  assert.match(fr.err, /1 ligne\(s\) de journal illisible/);
  const en = projet(lignes, { lang: "en" }).lancer([]);
  assert.match(en.out, /^workstream +requests/);
  assert.match(en.out, /3\.0 M/);
  const json = JSON.parse(projet(lignes).lancer(["--json"]).out);
  assert.equal(json.version, 1);
  assert.equal(json.unreadable, 1);
  assert.equal(json.workstreams[0].workstream, "a");
  for (const r of [fr, en]) assert.doesNotMatch(r.out + r.err, new RegExp(SECRET));
  assert.equal(format([], undefined).split("\n")[0].trim().split(/ +/)[0], "workstream");
});

test("QUA-042 : jamais bloquant : sans journal ou sans réponse, il le dit et sort en succès ; argument illisible : 2", () => {
  const racine = dossier();
  const sansJournal = [];
  assert.equal(main(["--logs", join(racine, "absent")], { root: racine, err: (l) => sansJournal.push(l) }), 0);
  assert.match(sansJournal[0], /aucun journal de session lisible .* — non mesuré ; autre outil IA : estimer à la main/);
  const p = projet([reponse({ id: "r1", t: "2026-10-16T10:00:00Z" })], { lang: "en" });
  const vide = p.lancer(["--since", "2027-01-01"]);
  assert.equal(vide.code, 0);
  assert.match(vide.err, /no agent answer .* not measured/);
  assert.equal(p.lancer(["--since", "pas-une-date"]).code, 2);
  assert.match(p.lancer(["--record"]).err, /--record expects the brief's name/);
  assert.equal(p.lancer(["--record", "../a"]).code, 2);
  assert.match(projet([]).lancer(["--since", "x"]).err, /date de --since illisible/);
});

test("QUA-042 : messages dans les deux langues ; fiche manquante en fin de ligne, option inconnue ignorée, configuration nulle", () => {
  for (const lang of ["fr", "en"]) {
    const racine = dossier();
    mkdirSync(join(racine, ".drwil"));
    writeFileSync(join(racine, ".drwil", "ia-first.json"), JSON.stringify({ lang }));
    const err = [];
    const lancer = (args) => main(args, { root: racine, err: (l) => err.push(l), log: () => {} });
    assert.equal(lancer(["--logs", join(racine, "absent"), "--inconnue"]), 0);
    const journaux = join(racine, "j");
    mkdirSync(journaux);
    writeFileSync(join(journaux, "s.jsonl"), "{illisible\n");
    assert.equal(lancer(["--logs", journaux]), 0);
    assert.equal(lancer(["--logs", journaux, "--record"]), 2);
    assert.equal(lancer(["--since", "x"]), 2);
    assert.equal(err.length, 5, err.join("\n"));
  }
  const nulle = dossier();
  mkdirSync(join(nulle, ".drwil"));
  writeFileSync(join(nulle, ".drwil", "ia-first.json"), "null");
  const err = [];
  main(["--logs", join(nulle, "absent")], { root: nulle, err: (l) => err.push(l) });
  assert.match(err[0], /^consommation :/);
});

test("QUA-042 : --record ajoute une ligne au format de la recette dans .drwil/usage.jsonl, jamais deux pour le même chantier", () => {
  const p = projet([
    reponse({ id: "r1", t: "2026-10-16T10:00:00Z" }),
    reponse({ id: "r2", t: "2026-10-16T10:05:00Z", branche: "workstream/b" }),
  ]);
  const premier = p.lancer(["--record", "a"]);
  assert.equal(premier.code, 0);
  assert.match(premier.out, /« a » consigné dans \.drwil\/usage\.jsonl \(673 tokens pondérés\)/);
  const usage = join(p.racine, ".drwil", "usage.jsonl");
  writeFileSync(usage, `${readFileSync(usage, "utf8")}{illisible\n`);
  assert.match(p.lancer(["--record", "a"]).out, /a déjà une ligne pour « a »/);
  assert.equal(p.lancer(["--record", "b"]).code, 0);
  const lignes = readFileSync(usage, "utf8").trim().split("\n");
  assert.equal(lignes.length, 3);
  assert.deepEqual(JSON.parse(lignes[0]), {
    workstream: "a",
    increment: "all",
    tokens: 673,
    input: 10,
    output: 100,
    cache_read: 1000,
    cache_write: 50,
    requests: 1,
    model: "claude-opus-5-5",
    duration_min: 0,
    date: "2026-10-16",
    source: "claude-code-logs",
  });
  assert.match(projet([], { lang: "en" }).lancer(["--record", "z"]).err, /no agent answer/);
  assert.equal(
    usageLine(
      { workstream: "x", weighted: 0, input: 0, output: 0, cacheRead: 0, cacheWrite: 0, requests: 0, models: ["m1", "m2"], minutes: 0 },
      "d",
    ).model,
    "m1, m2",
  );
  const en = projet([reponse({ id: "r1", t: "2026-10-16T10:00:00Z" })], { lang: "en" });
  assert.match(en.lancer(["--record", "a"]).out, /"a" recorded in/);
  assert.match(en.lancer(["--record", "a"]).out, /already has a line for "a"/);
});

test("QUA-042 : dossier des journaux de Claude Code ; ligne de commande, directe ou par un lien symbolique", () => {
  assert.equal(
    logsFolder("/a/b.c", { CLAUDE_CONFIG_DIR: "/conf" }),
    join("/conf", "projects", resolve("/a/b.c").replace(/[^A-Za-z0-9]/g, "-")),
  );
  assert.match(logsFolder("/a", {}), /\.claude/);
  const racine = dossier();
  const env = { ...process.env, CLAUDE_CONFIG_DIR: dossier() };
  const direct = spawnSync(process.execPath, [SCRIPT], { cwd: racine, encoding: "utf8", env });
  assert.equal(direct.status, 0);
  assert.match(direct.stderr, /non mesuré/);
  const lien = join(racine, "lien.mjs");
  symlinkSync(SCRIPT, lien);
  assert.equal(spawnSync(process.execPath, [lien], { cwd: racine, encoding: "utf8", env }).status, 0);
});
