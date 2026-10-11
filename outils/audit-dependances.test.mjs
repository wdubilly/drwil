import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { analyser, principal } from "./audit-dependances.mjs";

const SCRIPT = fileURLToPath(new URL("./audit-dependances.mjs", import.meta.url));

/** Sortie de `npm audit --json` (forme relevée avec npm 11) pour les failles données. */
function rapport(failles) {
  const comptes = { info: 0, low: 0, moderate: 0, high: 0, critical: 0 };
  for (const g of Object.values(failles)) comptes[g]++;
  const vulnerabilities = Object.fromEntries(Object.entries(failles).map(([nom, severity]) => [nom, { name: nom, severity }]));
  return JSON.stringify({ auditReportVersion: 2, vulnerabilities, metadata: { vulnerabilities: { ...comptes, total: Object.keys(failles).length } } });
}

test("aucune faille, ou seulement moderate et low : vert, résumé affiché", () => {
  assert.deepEqual(analyser(rapport({})), { statut: "ok", message: "audit des dépendances : aucune faille high ou critical (0 critical, 0 high, 0 moderate, 0 low)" });
  const r = analyser(rapport({ a: "moderate", b: "low", c: "info" }));
  assert.equal(r.statut, "ok");
  assert.match(r.message, /\(0 critical, 0 high, 1 moderate, 1 low\)$/);
});

test("une faille high ou critical bloque, paquets nommés", () => {
  const r = analyser(rapport({ zeta: "high", alpha: "critical", m: "moderate" }));
  assert.equal(r.statut, "echec");
  assert.equal(r.message, "audit des dépendances : 2 faille(s) high ou critical — alpha (critical), zeta (high) (1 critical, 1 high, 1 moderate, 0 low)");
});

test("registre injoignable ou sortie illisible : non exécuté, jamais vert (QUA-013)", () => {
  const horsLigne = JSON.stringify({ message: "request to http://127.0.0.1:9/-/npm/v1/security/advisories/bulk failed, reason: connect ECONNREFUSED 127.0.0.1:9", error: { summary: "", detail: "" } });
  assert.deepEqual(analyser(horsLigne), { statut: "non-execute", message: "audit non exécuté : registre injoignable (request to http://127.0.0.1:9/-/npm/v1/security/advisories/bulk failed, reason: connect ECONNREFUSED 127.0.0.1:9)" });
  assert.match(analyser(JSON.stringify({ error: { summary: "ENOTFOUND" } })).message, /registre injoignable \(ENOTFOUND\)/);
  assert.match(analyser("{}").message, /registre injoignable \(pas de résultat d'audit\)/);
  assert.equal(analyser("pas du json").message, "audit non exécuté : sortie de npm audit illisible");
  assert.equal(analyser(JSON.stringify({ metadata: { vulnerabilities: {} } })).statut, "ok", "comptes absents : zéro");
});

test("principal : code de sortie et canal selon le résultat ; npm introuvable = non exécuté", () => {
  const journal = { log: [], error: [] };
  const { log, error } = console;
  console.log = (m) => journal.log.push(m);
  console.error = (m) => journal.error.push(m);
  try {
    assert.equal(principal(() => ({ status: 0, stdout: rapport({}) })), 0);
    assert.equal(principal(() => ({ status: 1, stdout: rapport({ x: "critical" }) })), 1);
    assert.equal(principal(() => ({ error: new Error("spawn npm ENOENT") })), 1);
    assert.equal(principal(() => ({ status: 1 })), 1, "pas de sortie : illisible, non exécuté");
  } finally {
    Object.assign(console, { log, error });
  }
  assert.match(journal.log[0], /^audit des dépendances : aucune faille/);
  assert.match(journal.error[0], /^✗ audit des dépendances : 1 faille\(s\) high ou critical — x \(critical\)/);
  assert.equal(journal.error[1], "✗ audit non exécuté : npm introuvable (spawn npm ENOENT)");
  assert.equal(journal.error[2], "✗ audit non exécuté : sortie de npm audit illisible");
});

test("ligne de commande : sans npm joignable, échec explicite, jamais vert", () => {
  const r = spawnSync(process.execPath, [SCRIPT], { encoding: "utf8", env: { ...process.env, PATH: "" } });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /✗ audit non exécuté/);
});
