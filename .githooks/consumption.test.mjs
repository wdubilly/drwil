import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  activeTime,
  aggregate,
  copilotFolder,
  format,
  group,
  logsFolder,
  main,
  PAUSE_MS,
  readCopilotLog,
  readLog,
  usageLine,
} from "./consumption.mjs";
import { TEXTS as STATE_TEXTS } from "./state-context-texts.mjs";

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

/** Un dossier de sessions de Copilot CLI (COPILOT_HOME), une session par texte ; vide sans texte. */
function copilotHome(sessions = []) {
  const home = dossier();
  sessions.forEach((texte, i) => {
    mkdirSync(join(home, "session-state", `s${i}`), { recursive: true });
    writeFileSync(join(home, "session-state", `s${i}`, "events.jsonl"), texte);
  });
  return home;
}
/** Environnement isolé : jamais les sessions réelles de l'utilisateur. */
const ENV = () => ({ COPILOT_HOME: copilotHome(), CLAUDE_CONFIG_DIR: dossier() });

/** Un projet avec un dossier de journaux ; rend { racine, journaux, lancer }. */
function projet(lignes, { lang, env = ENV() } = {}) {
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
    const code = main([...args, "--logs", journaux], { env, root: racine, log: (l) => out.push(l), err: (l) => err.push(l), now });
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
    cacheReadPerRequest: 10,
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
  assert.match(fr.out, /^chantier +requêtes +entrée +sortie +cache lu +cache écrit +cache lu\/req/);
  assert.match(fr.out, /^a +2 +2 k +3,0 M +1 k +50 +500 +15,0 M +1 min +claude-opus-5-5$/m, "cache lu moyen par requête : 1000 / 2");
  assert.match(fr.out, /pondéré : indicatif/);
  assert.match(fr.out, /^\(branche fix\/x\) /m);
  assert.match(fr.err, /1 ligne\(s\) de journal illisible/);
  const en = projet(lignes, { lang: "en" }).lancer([]);
  assert.match(en.out, /^workstream +requests/);
  assert.match(en.out, /3\.0 M/);
  assert.match(en.out, /cache write +cache read\/req/);
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
  assert.equal(main(["--logs", join(racine, "absent")], { env: ENV(), root: racine, err: (l) => sansJournal.push(l) }), 0);
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
    const env = ENV();
    const lancer = (args) => main(args, { env, root: racine, err: (l) => err.push(l), log: () => {} });
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
  main(["--logs", join(nulle, "absent")], { env: ENV(), root: nulle, err: (l) => err.push(l) });
  assert.match(err[0], /^consommation :/);
});

test("QUA-042 : --record ajoute une ligne au format de la recette dans .drwil/usage.jsonl, jamais deux pour le même chantier", () => {
  const p = projet([
    reponse({ id: "r1", t: "2026-10-16T10:00:00Z" }),
    reponse({ id: "r2", t: "2026-10-16T10:05:00Z", branche: "workstream/b" }),
  ]);
  const premier = p.lancer(["--record", "a"]);
  assert.equal(premier.code, 0);
  assert.match(premier.out, /« a » consigné dans \.drwil\/usage\.jsonl \(673 tokens pondérés, cache lu moyen par requête : 1 k\)/);
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
    activities: parts(0, 0, 0, 1),
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
  assert.match(en.lancer(["--record", "a"]).out, /"a" recorded in .*\(673 weighted tokens, average cache read per request: 1 k\)/);
  assert.match(en.lancer(["--record", "a"]).out, /already has a line for "a"/);
});

test("QUA-042 : dossier des journaux de Claude Code ; ligne de commande, directe ou par un lien symbolique", () => {
  assert.equal(
    logsFolder("/a/b.c", { CLAUDE_CONFIG_DIR: "/conf" }),
    join("/conf", "projects", resolve("/a/b.c").replace(/[^A-Za-z0-9]/g, "-")),
  );
  assert.match(logsFolder("/a", {}), /\.claude/);
  const racine = dossier();
  const env = { ...process.env, ...ENV() };
  const direct = spawnSync(process.execPath, [SCRIPT], { cwd: racine, encoding: "utf8", env });
  assert.equal(direct.status, 0);
  assert.match(direct.stderr, /non mesuré/);
  const lien = join(racine, "lien.mjs");
  symlinkSync(SCRIPT, lien);
  assert.equal(spawnSync(process.execPath, [lien], { cwd: racine, encoding: "utf8", env }).status, 0);
});

/** Événements d'une session de Copilot CLI (events.jsonl), au format relevé le 2026-11-15 sur Copilot CLI. */
const copilot = {
  debut: ({ cwd, gitRoot, branche, t = "2026-10-16T09:59:00Z" }) =>
    JSON.stringify({ type: "session.start", timestamp: t, data: { sessionId: "s", context: { cwd, gitRoot, branch: branche } } }),
  contexte: ({ cwd, gitRoot, branche, t }) =>
    JSON.stringify({ type: "session.context_changed", timestamp: t, data: { cwd, gitRoot, branch: branche } }),
  appel: ({ id, t, modele = "claude-sonnet-5.5", u = [1160, 100, 1000, 50], agent }) =>
    JSON.stringify({
      type: "session.usage_record",
      timestamp: t,
      id: `e-${id}`,
      ...(agent ? { agentId: agent } : {}),
      data: {
        usage: {
          model: modele,
          inputTokens: u[0],
          outputTokens: u[1],
          cacheReadTokens: u[2],
          cacheWriteTokens: u[3],
          apiCallId: `api-${id}`,
          accounting: { sourceSessionId: agent ?? "s", usageId: id },
        },
      },
    }),
};

test("QUA-042 : Copilot CLI : jetons, modèle et branche des appels du projet ; l'entrée sans le cache ; aucun contenu lu", () => {
  const racine = resolve("/projets/app");
  const texte = [
    copilot.debut({ cwd: join(racine, "sous"), gitRoot: racine, branche: "workstream/a" }),
    JSON.stringify({ type: "user.message", timestamp: "2026-10-16T10:00:00Z", data: { content: SECRET } }),
    JSON.stringify({ type: "assistant.message", timestamp: "2026-10-16T10:00:00Z", data: { content: SECRET, model: "x" } }),
    copilot.appel({ id: "c1", t: "2026-10-16T10:00:00Z" }),
    copilot.appel({ id: "c2", t: "2026-10-16T10:05:00Z", agent: "sous-agent", modele: "gpt-6", u: [10, 1, 20, 0] }),
    copilot.contexte({ cwd: racine, gitRoot: racine, branche: "scoping/b", t: "2026-10-16T10:06:00Z" }),
    copilot.appel({ id: "c3", t: "2026-10-16T10:07:00Z" }),
    copilot.contexte({
      cwd: resolve("/projets/autre"),
      gitRoot: resolve("/projets/autre"),
      branche: "workstream/a",
      t: "2026-10-16T10:08:00Z",
    }),
    copilot.appel({ id: "c4", t: "2026-10-16T10:09:00Z" }),
    copilot.contexte({ cwd: resolve("/projets/app-bis"), branche: "workstream/a", t: "2026-10-16T10:10:00Z" }),
    copilot.appel({ id: "c5", t: "2026-10-16T10:11:00Z" }),
    copilot.contexte({ cwd: join(racine, "x"), t: "2026-10-16T10:12:00Z" }),
    JSON.stringify({ type: "session.usage_record", timestamp: "2026-10-16T10:13:00Z", id: "e6", data: { usage: {} } }),
    JSON.stringify({ type: "session.usage_record", data: { usage: { inputTokens: 5 } } }),
    "",
    JSON.stringify({ type: "session.context_changed", timestamp: "2026-10-16T10:14:00Z", data: {} }),
    copilot.appel({ id: "c7", t: "2026-10-16T10:15:00Z" }),
    "{pas du json",
  ].join("\n");
  const { answers, unreadable } = readCopilotLog(texte, racine);
  assert.equal(unreadable, 1);
  assert.deepEqual(answers, [
    {
      key: "c1",
      time: Date.parse("2026-10-16T10:00:00Z"),
      branch: "workstream/a",
      model: "claude-sonnet-5.5",
      usage: { input: 110, output: 100, cacheRead: 1000, cacheWrite: 50 },
    },
    {
      key: "c2",
      time: Date.parse("2026-10-16T10:05:00Z"),
      branch: "workstream/a",
      model: "gpt-6",
      usage: { input: 0, output: 1, cacheRead: 20, cacheWrite: 0 },
    },
    {
      key: "c3",
      time: Date.parse("2026-10-16T10:07:00Z"),
      branch: "scoping/b",
      model: "claude-sonnet-5.5",
      usage: { input: 110, output: 100, cacheRead: 1000, cacheWrite: 50 },
    },
    {
      key: "e6",
      time: Date.parse("2026-10-16T10:13:00Z"),
      branch: null,
      model: "unknown",
      usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    },
  ]);
  assert.doesNotMatch(JSON.stringify(answers), new RegExp(SECRET));
  // Sans projet donné, tous les appels ; sans contexte connu, aucun appel attribué au projet.
  assert.equal(readCopilotLog(texte).answers.length, 7);
  assert.deepEqual(readCopilotLog(copilot.appel({ id: "c1", t: "2026-10-16T10:00:00Z" }), racine).answers, []);
  // Un appel compté une fois, même relu ; temps actif et regroupement comme pour Claude Code.
  const [a, b] = aggregate([...answers, ...answers]);
  assert.deepEqual(
    [a.workstream, a.requests, a.input, a.cacheRead, a.minutes, a.models, b.workstream, b.requests],
    ["a", 2, 110, 1020, 5, ["claude-sonnet-5.5", "gpt-6"], "b", 1],
  );
});

test("QUA-042 : Copilot CLI : dossier des sessions, sous COPILOT_HOME ou ~/.copilot", () => {
  assert.equal(copilotFolder({ COPILOT_HOME: "/conf" }), join("/conf", "session-state"));
  assert.match(copilotFolder({}), /\.copilot[\\/]session-state$/);
});

test("QUA-042 : Copilot CLI lu par le relevé et --record, seul ou avec Claude Code : parts additionnées, chaque outil nommé, rien compté deux fois", () => {
  const racine = dossier();
  const ici = (branche, t = "2026-10-16T10:04:00Z") => copilot.debut({ cwd: racine, gitRoot: racine, branche, t });
  const session = [ici("workstream/a"), copilot.appel({ id: "c1", t: "2026-10-16T10:05:00Z" }), "{illisible"].join("\n");
  const ailleurs = [
    copilot.debut({ cwd: dossier(), branche: "workstream/a" }),
    copilot.appel({ id: "x1", t: "2026-10-16T10:05:00Z" }),
    "{illisible",
    JSON.stringify({ type: "user.message", data: { content: SECRET } }),
  ].join("\n");
  const lancer = (args, sessions, claude = join(racine, "absent")) => {
    const out = [];
    const err = [];
    const env = { COPILOT_HOME: copilotHome(sessions), CLAUDE_CONFIG_DIR: dossier() };
    const code = main([...args, "--logs", claude], {
      env,
      root: racine,
      log: (l) => out.push(l),
      err: (l) => err.push(l),
      now: new Date("2026-10-16T12:00:00Z"),
    });
    return { code, out: out.join("\n"), err: err.join("\n") };
  };
  const usage = () =>
    readFileSync(join(racine, ".drwil", "usage.jsonl"), "utf8")
      .trim()
      .split("\n")
      .map((l) => JSON.parse(l));

  // Copilot CLI seul (aucun journal de Claude Code) ; la session d'un autre projet n'est même pas lue.
  const seul = lancer(["--json"], [session, ailleurs]);
  assert.equal(seul.code, 0, seul.err);
  const json = JSON.parse(seul.out);
  assert.equal(json.unreadable, 1, "seules les sessions du projet sont lues");
  assert.deepEqual(
    json.workstreams.map((w) => [w.workstream, w.requests, w.input, Object.keys(w.tools)]),
    [["a", 1, 110, ["copilot-cli"]]],
  );
  assert.match(lancer([], [session]).out, /^a +1 +110 /m);
  // --copilot-logs : un autre dossier de sessions ; un dossier de session sans events.jsonl est ignoré.
  const autre = join(copilotHome([session]), "session-state");
  mkdirSync(join(autre, "sans-journal"));
  const out = [];
  main(["--logs", join(racine, "absent"), "--copilot-logs", autre, "--json"], { env: ENV(), root: racine, log: (l) => out.push(l) });
  assert.equal(JSON.parse(out[0]).workstreams[0].requests, 1);
  assert.equal(lancer(["--record", "a"], [session, session]).code, 0);
  assert.deepEqual(usage()[0], {
    workstream: "a",
    increment: "all",
    tokens: 773,
    input: 110,
    output: 100,
    cache_read: 1000,
    cache_write: 50,
    requests: 1,
    model: "claude-sonnet-5.5",
    duration_min: 0,
    date: "2026-10-16",
    source: "copilot-cli-logs",
    activities: parts(0, 0, 0, 1, 772.5),
  });

  // Commencé sous Claude Code, repris sous Copilot CLI : une ligne, les deux parts, chaque outil nommé.
  const journaux = join(dossier(), "journaux");
  mkdirSync(journaux);
  writeFileSync(join(journaux, "s.jsonl"), [reponse({ id: "c1", t: "2026-10-16T10:00:00Z", branche: "workstream/b" })].join("\n"));
  const repris = [ici("workstream/b", "2026-10-16T10:01:00Z"), copilot.appel({ id: "c1", t: "2026-10-16T10:05:00Z" })].join("\n");
  const deux = lancer(["--record", "b"], [repris, repris], journaux);
  assert.equal(deux.code, 0, deux.err);
  assert.match(
    deux.out,
    /^consommation : « b » consigné dans \.drwil\/usage\.jsonl \(1445 tokens pondérés, cache lu moyen par requête : 1 k\) — Claude Code : 673 ; Copilot CLI : 773$/m,
  );
  const ligne = usage()[1];
  assert.deepEqual(ligne, {
    workstream: "b",
    increment: "all",
    tokens: 1445,
    input: 120,
    output: 200,
    cache_read: 2000,
    cache_write: 100,
    requests: 2,
    model: "claude-opus-5-5, claude-sonnet-5.5",
    duration_min: 5,
    date: "2026-10-16",
    source: "claude-code-logs+copilot-cli-logs",
    tools: {
      "claude-code": {
        tokens: 673,
        input: 10,
        output: 100,
        cache_read: 1000,
        cache_write: 50,
        requests: 1,
        model: "claude-opus-5-5",
        duration_min: 0,
      },
      "copilot-cli": {
        tokens: 773,
        input: 110,
        output: 100,
        cache_read: 1000,
        cache_write: 50,
        requests: 1,
        model: "claude-sonnet-5.5",
        duration_min: 0,
      },
    },
    activities: { ...parts(0, 0, 0, 0), unattributed: { tokens: 1445, requests: 2 } },
  });

  // Ni l'un ni l'autre : non mesuré, les deux dossiers nommés, jamais bloquant.
  const rien = lancer([], [ailleurs]);
  assert.equal(rien.code, 0);
  assert.match(rien.err, /aucun journal de session lisible pour ce projet .*absent.*session-state .*— non mesuré/);
  for (const r of [seul, deux, rien]) assert.doesNotMatch(r.out + r.err, new RegExp(SECRET));
  assert.doesNotMatch(readFileSync(join(racine, ".drwil", "usage.jsonl"), "utf8"), new RegExp(SECRET));
});

test("QUA-042 : --recorded compare les chantiers consignés par leur cache lu moyen par requête, sans journal de session", () => {
  const p = projet([], { lang: "fr" });
  const usage = join(p.racine, ".drwil", "usage.jsonl");
  const vide = main(["--recorded"], {
    root: p.racine,
    log: () => assert.fail("rien à afficher"),
    err: (l) => assert.match(l, /aucune ligne/),
  });
  assert.equal(vide, 0, "sans usage.jsonl : dit, jamais bloquant");
  writeFileSync(
    usage,
    [
      JSON.stringify({ workstream: "avant", date: "2026-10-24", requests: 147, cache_read: 24_900_000 }),
      "{illisible",
      "null",
      JSON.stringify({ autre: 1 }),
      JSON.stringify({ workstream: "estime", source: "estimate", tokens: 5 }),
      JSON.stringify({ workstream: "apres", date: "2026-10-30", requests: 100, cache_read: 9_000_000 }),
      "",
    ].join("\n"),
  );
  const out = [];
  assert.equal(main(["--recorded"], { root: p.racine, log: (l) => out.push(l), err: () => assert.fail("aucune erreur") }), 0);
  const lignes = out.join("\n").split("\n");
  assert.match(lignes[0], /^chantier\s+date\s+requêtes\s+cache lu\s+cache lu\/req$/);
  assert.match(lignes[1], /^avant\s+2026-10-24\s+147\s+24,9 M\s+169 k$/, "le plus ancien d'abord, comme écrit");
  assert.match(lignes[2], /^estime\s+—\s+—\s+—\s+—$/, "estimation sans requêtes : non mesurée, jamais 0");
  assert.match(lignes[3], /^apres\s+2026-10-30\s+100\s+9,0 M\s+90 k$/);
  assert.match(lignes[4], /^chantiers répartis dans \.drwil\/usage\.jsonl : 0 sur les 10 attendus avant le bilan$/);
  assert.equal(lignes.length, 5, "lignes illisibles ou sans chantier ignorées");
  const en = projet([], { lang: "en" });
  mkdirSync(join(en.racine, ".drwil"), { recursive: true });
  writeFileSync(join(en.racine, ".drwil", "usage.jsonl"), `${JSON.stringify({ workstream: "w", requests: 2, cache_read: 1500 })}\n`);
  const anglais = [];
  main(["--recorded"], { root: en.racine, log: (l) => anglais.push(l) });
  assert.match(anglais[0], /^workstream\s+date\s+requests\s+cache read\s+cache read\/req\nw\s+—\s+2\s+2 k\s+750$/);
  const errs = [];
  main(["--recorded"], { root: dossier(), err: (l) => errs.push(l) });
  assert.match(errs[0], /aucune ligne dans \.drwil\/usage\.jsonl/);
});

test("QUA-042 : le rappel CLOSING nomme les deux outils lus (Claude Code, Copilot CLI), les autres estimés à la main, en anglais aussi", () => {
  assert.match(STATE_TEXTS.fr.rules.CLOSING, /journaux de Claude Code et de Copilot CLI ; autre outil : estimer à la main/);
  assert.match(STATE_TEXTS.en.rules.CLOSING, /Claude Code and Copilot CLI logs; another tool: estimate by hand/);
});

// Répartition par activité (production, vérification, gouvernance, non attribuée).
const POIDS_REPONSE = 10 + 100 * 5 + 1000 * 0.1 + 50 * 1.25;
const parts = (p, v, g, n, poids = POIDS_REPONSE) => ({
  production: { tokens: Math.round(p * poids), requests: p },
  verification: { tokens: Math.round(v * poids), requests: v },
  governance: { tokens: Math.round(g * poids), requests: g },
  unattributed: { tokens: Math.round(n * poids), requests: n },
});
/** L'état de gouvernance d'un projet d'essai, avec l'historique donné du chantier `brief`. */
function etat(racine, history, { brief = "a", activity = "CLOSING" } = {}) {
  mkdirSync(join(racine, ".drwil"), { recursive: true });
  const state = { version: 1, activity, active_brief: `docs/projects/${brief}.md`, active_request: null, since: "2026-10-16T11:10:00Z" };
  writeFileSync(join(racine, ".drwil", "state.json"), JSON.stringify(history === undefined ? state : { ...state, history }));
}
const HISTORIQUE = [
  { activity: "BUILD", at: "2026-10-16T10:00:00Z" },
  { activity: "EVIDENCE", at: "2026-10-16T10:10:00Z" },
  { activity: "VERIFY", at: "2026-10-16T10:20:00Z" },
  { activity: "BUILD", at: "2026-10-16T10:30:00Z" },
  { activity: "CLOSING", at: "2026-10-16T10:40:00Z" },
  { activity: "BUILD", at: "2026-10-16T10:50:00Z", reopened: true },
  { activity: "EVIDENCE", at: "2026-10-16T11:00:00Z" },
  { activity: "BUILD", at: "2026-10-16T11:05:00Z" },
  { activity: "CLOSING", at: "2026-10-16T11:10:00Z" },
];
const REPONSES = [
  reponse({ id: "c0", t: "2026-10-16T09:00:00Z", branche: "scoping/a" }),
  reponse({ id: "r0", t: "2026-10-16T09:55:00Z" }),
  reponse({ id: "r1", t: "2026-10-16T10:05:00Z" }),
  reponse({ id: "r1", t: "2026-10-16T10:05:00Z" }),
  reponse({ id: "r2", t: "2026-10-16T10:15:00Z" }),
  reponse({ id: "r3", t: "2026-10-16T10:25:00Z" }),
  reponse({ id: "r4", t: "2026-10-16T10:35:00Z" }),
  reponse({ id: "r5", t: "2026-10-16T10:45:00Z" }),
  reponse({ id: "r6", t: "2026-10-16T10:55:00Z" }),
  reponse({ id: "r7", t: "2026-10-16T11:02:00Z" }),
  reponse({ id: "r8", t: "2026-10-16T11:07:00Z" }),
  reponse({ id: "r9", t: "2026-10-16T11:15:00Z" }),
  reponse({ id: "b1", t: "2026-10-16T10:05:00Z", branche: "workstream/b" }),
];
const lireUsage = (racine) =>
  readFileSync(join(racine, ".drwil", "usage.jsonl"), "utf8")
    .trim()
    .split("\n")
    .map((l) => JSON.parse(l));

test("QUA-306 : chaque requête du chantier va à l'activité de l'état à son instant ; avant le lancement ou sans historique : non attribuée, dite", () => {
  const p = projet(REPONSES);
  etat(p.racine, HISTORIQUE);
  const releve = p.lancer([]);
  assert.equal(releve.code, 0, releve.err);
  // production : r1, r4 ; vérification : r2, r3, r7 (EVIDENCE après la réouverture) ; gouvernance : cadrage, CLOSING,
  // tout BUILD après la réouverture (r6, r8) et CLOSING (r5, r9) ; non attribuée : r0, avant le lancement.
  assert.match(
    releve.out,
    /^répartition de « a » : production 1 k \(2 req\.\) ; vérification 2 k \(3 req\.\) ; gouvernance 3 k \(5 req\.\) ; non attribuée 673 \(1 req\.\)$/m,
  );
  const json = JSON.parse(p.lancer(["--json"]).out);
  assert.deepEqual(json.workstreams.find((w) => w.workstream === "a").activities, parts(2, 3, 5, 1));
  // Un autre chantier que celui de l'état : son historique n'est pas le sien, rien n'est deviné.
  assert.deepEqual(json.workstreams.find((w) => w.workstream === "b").activities, parts(0, 0, 0, 1));
  // Sans historique (état antérieur), état d'un autre chantier, sans état, ou historique mal formé : non attribuée,
  // seul le cadrage reste de la gouvernance (sa branche le dit).
  for (const prepare of [
    (r) => etat(r, undefined),
    (r) => etat(r, HISTORIQUE, { brief: "b" }),
    () => {},
    (r) => etat(r, [{ activity: "BUILD", at: "hier" }]),
  ]) {
    const q = projet(REPONSES);
    prepare(q.racine);
    const a = JSON.parse(q.lancer(["--json"]).out).workstreams.find((w) => w.workstream === "a");
    assert.deepEqual(a.activities, parts(0, 0, 1, 10));
  }
  // Une branche qui n'est pas celle d'une fiche n'est pas répartie ; --since s'applique à la répartition aussi.
  const q = projet([...REPONSES, reponse({ id: "x", t: "2026-10-16T10:05:00Z", branche: "fix/x" })]);
  etat(q.racine, HISTORIQUE);
  const tout = JSON.parse(q.lancer(["--json", "--since", "2026-10-16"]).out).workstreams;
  assert.equal(tout.find((w) => w.workstream === "(branche fix/x)").activities, undefined);
  const ici = JSON.parse(q.lancer(["--json", "--since", "2026-10-16T10:30:00Z"]).out).workstreams;
  assert.deepEqual(ici.find((w) => w.workstream === "a").activities, parts(1, 1, 4, 0));
  // En anglais ; jamais un contenu de message.
  const en = projet(REPONSES, { lang: "en" });
  etat(en.racine, HISTORIQUE);
  const anglais = en.lancer([]);
  assert.match(
    anglais.out,
    /^split of "a": production 1 k \(2 req\.\); verification 2 k \(3 req\.\); governance 3 k \(5 req\.\); unattributed 673 \(1 req\.\)$/m,
  );
  for (const r of [releve, anglais]) assert.doesNotMatch(r.out + r.err, new RegExp(SECRET));
});

test("QUA-307 : --record écrit la répartition en nouveaux champs de la ligne, les champs existants inchangés", () => {
  const p = projet(REPONSES);
  etat(p.racine, HISTORIQUE);
  const r = p.lancer(["--record", "a"]);
  assert.equal(r.code, 0, r.err);
  assert.match(r.out, /^répartition de « a » : production 1 k \(2 req\.\) ; .* non attribuée 673 \(1 req\.\)$/m);
  const [ligne] = lireUsage(p.racine);
  const { activities, ...existants } = ligne;
  assert.deepEqual(activities, parts(2, 3, 5, 1));
  assert.deepEqual(Object.keys(existants), [
    "workstream",
    "increment",
    "tokens",
    "input",
    "output",
    "cache_read",
    "cache_write",
    "requests",
    "model",
    "duration_min",
    "date",
    "source",
  ]);
  assert.equal(existants.requests, 11);
  assert.equal(existants.tokens, Math.round(11 * POIDS_REPONSE));
  assert.equal(Object.keys(ligne).at(-1), "activities", "les nouveaux champs viennent après les anciens");
  assert.doesNotMatch(readFileSync(join(p.racine, ".drwil", "usage.jsonl"), "utf8"), new RegExp(SECRET));
});

test("QUA-309 : Copilot CLI réparti de même ; un appel sans horodatage est compté, en part non attribuée", () => {
  const racine = dossier();
  const ici = copilot.debut({ cwd: racine, gitRoot: racine, branche: "workstream/a", t: "2026-10-16T09:58:00Z" });
  const sansHeure = JSON.parse(copilot.appel({ id: "c9", t: "x" }));
  delete sansHeure.timestamp;
  const session = [
    ici,
    copilot.appel({ id: "c1", t: "2026-10-16T10:05:00Z" }),
    copilot.appel({ id: "c2", t: "2026-10-16T10:15:00Z" }),
    copilot.appel({ id: "c3", t: "2026-10-16T10:45:00Z" }),
    JSON.stringify(sansHeure),
  ].join("\n");
  const { answers } = readCopilotLog(session, racine);
  assert.deepEqual(
    answers.map((a) => [a.key, a.time]),
    [
      ["c1", Date.parse("2026-10-16T10:05:00Z")],
      ["c2", Date.parse("2026-10-16T10:15:00Z")],
      ["c3", Date.parse("2026-10-16T10:45:00Z")],
      ["c9", null],
    ],
  );
  etat(racine, HISTORIQUE);
  const out = [];
  const env = { COPILOT_HOME: copilotHome([session]), CLAUDE_CONFIG_DIR: dossier() };
  const code = main(["--record", "a", "--logs", join(racine, "absent")], {
    env,
    root: racine,
    log: (l) => out.push(l),
    err: (l) => out.push(l),
    now: new Date("2026-10-16T12:00:00Z"),
  });
  assert.equal(code, 0, out.join("\n"));
  const [ligne] = lireUsage(racine);
  assert.equal(ligne.requests, 4);
  assert.equal(ligne.duration_min, 10, "un appel sans instant ne compte pas dans le temps actif (pause de 30 min exclue)");
  assert.deepEqual(ligne.activities, parts(1, 1, 1, 1, 1160 - 1050 + 100 * 5 + 1000 * 0.1 + 50 * 1.25));
  // Avec --since, un appel sans instant ne peut être dit de la période : il n'en est pas.
  const depuis = [];
  main(["--json", "--since", "2026-10-01", "--logs", join(racine, "absent")], { env, root: racine, log: (l) => depuis.push(l) });
  assert.equal(JSON.parse(depuis[0]).workstreams[0].requests, 3);
  // Un appel sans aucune clé ne peut être dédoublonné : jamais compté (un appel compté une fois, QUA-042).
  const sansCle = JSON.parse(copilot.appel({ id: "c8", t: "2026-10-16T10:05:00Z" }));
  delete sansCle.id;
  delete sansCle.data.usage.apiCallId;
  delete sansCle.data.usage.accounting;
  assert.deepEqual(readCopilotLog([ici, JSON.stringify(sansCle)].join("\n"), racine).answers, []);
});

test("QUA-310 : le compte des chantiers répartis vers le bilan des 10, puis la part moyenne de chaque activité ; jamais un refus", () => {
  const p = projet([reponse({ id: "r1", t: "2026-10-16T10:00:00Z" })]);
  const usage = join(p.racine, ".drwil", "usage.jsonl");
  mkdirSync(join(p.racine, ".drwil"), { recursive: true });
  const reparti = (nom, p0, v, g, n) =>
    JSON.stringify({
      workstream: nom,
      requests: 1,
      cache_read: 1,
      activities: {
        production: { tokens: p0, requests: 1 },
        verification: { tokens: v, requests: 1 },
        governance: { tokens: g, requests: 1 },
        unattributed: { tokens: n, requests: n ? 1 : 0 },
      },
    });
  const ancienne = JSON.stringify({ workstream: "ancien", requests: 2, cache_read: 10 });
  const rienAttribue = JSON.stringify({
    workstream: "inconnu",
    activities: {
      production: { tokens: 0, requests: 0 },
      verification: { tokens: 0, requests: 0 },
      governance: { tokens: 0, requests: 0 },
      unattributed: { tokens: 9, requests: 3 },
    },
  });
  const bizarre = JSON.stringify({ workstream: "bizarre", activities: "oui" });
  writeFileSync(usage, [ancienne, rienAttribue, bizarre, reparti("w1", 50, 30, 20, 0), "{illisible", ""].join("\n"));
  const releve = p.lancer([]);
  assert.equal(releve.code, 0);
  assert.match(releve.out, /^chantiers répartis dans \.drwil\/usage\.jsonl : 1 sur les 10 attendus avant le bilan$/m);
  const consignes = [];
  assert.equal(main(["--recorded"], { root: p.racine, log: (l) => consignes.push(l) }), 0);
  assert.match(consignes.join("\n"), /chantiers répartis dans \.drwil\/usage\.jsonl : 1 sur les 10 attendus avant le bilan/);
  // À partir de 10 : la part moyenne (moyenne des parts de chaque chantier, en tokens pondérés), aucun seuil.
  const dix = [ancienne, ...Array.from({ length: 9 }, (_, i) => reparti(`w${i}`, 50, 30, 20, 0)), reparti("w9", 20, 30, 40, 10)];
  writeFileSync(usage, dix.join("\n"));
  const bilan = p.lancer([]);
  assert.equal(bilan.code, 0);
  assert.match(
    bilan.out,
    /^chantiers répartis dans \.drwil\/usage\.jsonl : 10 — part moyenne : production 47 % ; vérification 30 % ; gouvernance 22 % ; non attribuée 1 %$/m,
  );
  const json = JSON.parse(p.lancer(["--json"]).out);
  assert.deepEqual(json.split, { count: 10, expected: 10, mean: { production: 47, verification: 30, governance: 22, unattributed: 1 } });
  // En anglais ; sans usage.jsonl : 0 sur 10, jamais une erreur.
  const en = projet([reponse({ id: "r1", t: "2026-10-16T10:00:00Z" })], { lang: "en" });
  assert.match(en.lancer([]).out, /^workstreams split in \.drwil\/usage\.jsonl: 0 of the 10 expected before the review$/m);
  mkdirSync(join(en.racine, ".drwil"), { recursive: true });
  writeFileSync(join(en.racine, ".drwil", "usage.jsonl"), dix.join("\n"));
  assert.match(
    en.lancer([]).out,
    /^workstreams split in \.drwil\/usage\.jsonl: 10 — mean share: production 47 %; verification 30 %; governance 22 %; unattributed 1 %$/m,
  );
});
