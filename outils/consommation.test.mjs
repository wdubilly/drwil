import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { agreger, dossierJournaux, dureeActive, formater, groupe, lireJournal, principal } from "./consommation.mjs";

const SCRIPT = fileURLToPath(new URL("./consommation.mjs", import.meta.url));
let dossiers = [];
afterEach(() => {
  for (const d of dossiers) rmSync(d, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  dossiers = [];
});
const dossier = () => {
  const d = mkdtempSync(join(tmpdir(), "drwil-consommation-"));
  dossiers.push(d);
  return d;
};

const SECRET = "contenu-de-conversation-a-ne-jamais-afficher";
/** Une ligne de journal de réponse d'agent, au format de Claude Code. */
const reponse = ({ id, t, branche = "chantier/a", modele = "claude-opus-5-5", u = [10, 100, 1000, 50] }) =>
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

test("lireJournal : seuls les champs de consommation, réponses d'agent seulement ; illisibles et synthétiques à part", () => {
  const texte = [
    reponse({ id: "r1", t: "2026-10-11T10:00:00Z" }),
    JSON.stringify({ type: "user", timestamp: "2026-10-11T10:00:00Z", message: { content: SECRET } }),
    reponse({ id: "r2", t: "2026-10-11T10:01:00Z", modele: "<synthetic>" }),
    JSON.stringify({ type: "assistant", timestamp: "2026-10-11T10:00:00Z", message: { id: "m1", usage: {} } }),
    "{ pas du json",
    "",
  ].join("\n");
  const { reponses, illisibles } = lireJournal(texte);
  assert.equal(illisibles, 1);
  assert.deepEqual(reponses, [
    {
      cle: "r1",
      horodatage: Date.parse("2026-10-11T10:00:00Z"),
      branche: "chantier/a",
      modele: "claude-opus-5-5",
      usage: { entree: 10, sortie: 100, cacheLu: 1000, cacheEcrit: 50 },
    },
    {
      cle: "m1",
      horodatage: Date.parse("2026-10-11T10:00:00Z"),
      branche: null,
      modele: "inconnu",
      usage: { entree: 0, sortie: 0, cacheLu: 0, cacheEcrit: 0 },
    },
  ]);
  assert.ok(!JSON.stringify(reponses).includes(SECRET), "aucun contenu de message extrait");
});

test("groupe : chantier, branche principale, autre branche, sans branche", () => {
  assert.equal(groupe("chantier/mesurer-consommation"), "mesurer-consommation");
  assert.equal(groupe("master"), "(branche principale : cadrages)");
  assert.equal(groupe("main"), "(branche principale : cadrages)");
  assert.equal(groupe("essai/x"), "(branche essai/x)");
  assert.equal(groupe(null), "(sans branche)");
});

test("dureeActive : pauses de plus de 15 minutes retirées, ordre indifférent", () => {
  const m = 60000;
  assert.equal(dureeActive([0, 5 * m, 10 * m]), 10 * m);
  assert.equal(dureeActive([40 * m, 0, 5 * m, 45 * m]), 10 * m, "la pause de 35 min ne compte pas");
  assert.equal(dureeActive([0, 15 * m]), 15 * m, "15 min pile comptent encore");
  assert.equal(dureeActive([0]), 0);
});

test("agreger : une requête comptée une fois, total pondéré, modèles, filtre --depuis, tri", () => {
  const { reponses } = lireJournal(
    [
      reponse({ id: "r1", t: "2026-10-11T10:00:00Z" }),
      reponse({ id: "r1", t: "2026-10-11T10:00:01Z" }),
      reponse({ id: "r2", t: "2026-10-11T10:05:00Z", modele: "claude-sonnet-5-5" }),
      reponse({ id: "r3", t: "2026-10-11T11:00:00Z", branche: "master", u: [1, 1, 1, 1] }),
      reponse({ id: "r0", t: "2026-10-10T09:00:00Z" }),
    ].join("\n"),
  );
  const lignes = agreger(reponses, { depuis: Date.parse("2026-10-11") });
  assert.deepEqual(lignes, [
    {
      groupe: "a",
      requetes: 2,
      entree: 20,
      sortie: 200,
      cacheLu: 2000,
      cacheEcrit: 100,
      pondere: 20 + 1000 + 200 + 125,
      modeles: ["claude-opus-5-5", "claude-sonnet-5-5"],
      dureeMin: 5,
    },
    {
      groupe: "(branche principale : cadrages)",
      requetes: 1,
      entree: 1,
      sortie: 1,
      cacheLu: 1,
      cacheEcrit: 1,
      pondere: 7,
      modeles: ["claude-opus-5-5"],
      dureeMin: 0,
    },
  ]);
  assert.equal(agreger(reponses).find((l) => l.groupe === "a").requetes, 3, "sans --depuis : tout l'historique");
});

test("formater : tableau aligné, grands nombres lisibles, mention du pondéré indicatif", () => {
  const sortie = formater([
    {
      groupe: "a",
      requetes: 2,
      entree: 20,
      sortie: 1500,
      cacheLu: 2_500_000,
      cacheEcrit: 100,
      pondere: 251_845,
      modeles: ["m"],
      dureeMin: 5,
    },
  ]);
  const [entete, ligne] = sortie.split("\n");
  assert.match(entete, /^chantier\s+requêtes\s+entrée\s+sortie\s+cache lu\s+cache écrit\s+pondéré\s+durée\s+modèles$/);
  assert.match(ligne, /^a\s+2\s+20\s+2 k\s+2,5 M\s+100\s+252 k\s+5 min\s+m$/);
  assert.match(sortie, /indicatif/);
});

test("dossierJournaux : chemin du projet encodé, CLAUDE_CONFIG_DIR respecté", () => {
  assert.equal(dossierJournaux("/home/x/projets/mon.app", { CLAUDE_CONFIG_DIR: "/cfg" }), "/cfg/projects/-home-x-projets-mon-app");
  assert.match(dossierJournaux("/p", {}), /\.claude[/\\]projects[/\\]-p$/);
});

test("principal : relevé texte et JSON, sous-dossiers lus, jamais de contenu ; non mesuré sans journal", () => {
  const journaux = dossier();
  mkdirSync(join(journaux, "session", "subagents"), { recursive: true });
  writeFileSync(join(journaux, "s1.jsonl"), `${reponse({ id: "r1", t: "2026-10-11T10:00:00Z" })}\nillisible\n`);
  writeFileSync(join(journaux, "session", "subagents", "s2.jsonl"), reponse({ id: "r2", t: "2026-10-11T10:02:00Z" }));
  writeFileSync(join(journaux, "notes.txt"), SECRET);
  const journal = { log: [], error: [] };
  const { log, error } = console;
  console.log = (m) => journal.log.push(m);
  console.error = (m) => journal.error.push(m);
  try {
    assert.equal(principal(["--journaux", journaux]), 0);
    assert.equal(principal(["--json", "--journaux", journaux]), 0);
    assert.equal(principal(["--journaux", journaux, "--depuis", "2027-01-01"]), 1);
    assert.equal(principal(["--depuis", "hier", "--journaux", journaux]), 2);
    assert.equal(principal([dossier()], { CLAUDE_CONFIG_DIR: dossier() }), 1);
  } finally {
    Object.assign(console, { log, error });
  }
  assert.match(journal.log[0], /^chantier .*\na\s+2\s/);
  const json = JSON.parse(journal.log[1]);
  assert.equal(json.version, 1);
  assert.equal(json.illisibles, 1);
  assert.equal(json.chantiers[0].requetes, 2);
  assert.ok(![...journal.log, ...journal.error].join("\n").includes(SECRET), "aucun contenu de conversation affiché");
  assert.deepEqual(
    journal.error.map((e) => e.replace(/ dans .* sur| dans .* —/, " …")),
    [
      "consommation : 1 ligne(s) de journal illisible(s), ignorée(s)",
      "consommation : aucune réponse d'agent … la période — non mesuré",
      "consommation : date de --depuis illisible (attendu AAAA-MM-JJ)",
      "consommation : aucun journal de session … non mesuré",
    ],
  );
});

test("ligne de commande : non mesuré (code 1) sans journal", () => {
  const r = spawnSync(process.execPath, [SCRIPT, dossier()], { encoding: "utf8", env: { ...process.env, CLAUDE_CONFIG_DIR: dossier() } });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /aucun journal de session .* non mesuré/);
});
