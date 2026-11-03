import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { randomUUID, createHash } from "node:crypto";
import { mkdirSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { report } from "../dist/index.js";

const cli = fileURLToPath(new URL("../bin/drwil.js", import.meta.url));
const cache = fileURLToPath(new URL("../../../node_modules/.cache", import.meta.url));
function fixture(fn) {
  const root = join(cache, `report-${randomUUID()}`);
  mkdirSync(join(root, ".drwil", "evidence"), { recursive: true });
  const write = (file, value) => writeFileSync(join(root, file), JSON.stringify(value));
  write(".drwil/ia-first.json", { lang: "fr" });
  write(".drwil/install.json", { version: "0.10.0" });
  try {
    fn(root, write);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function snapshot(root) {
  return readdirSync(root, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => {
      const file = join(entry.parentPath, entry.name);
      return [file, createHash("sha256").update(readFileSync(file)).digest("hex")];
    });
}

test("QUA-231 : CLI publique, échec du kit sans donnée ni effet de bord", () =>
  fixture((root, write) => {
    const privateData = [
      "/home/client/projet-confidentiel",
      "C:\\clients\\dossier-prive",
      "depot-prive-fictif",
      "password=faux-mot-de-passe",
      "secret-fictif-sans-format-standard",
      "personne@example.invalid",
      "\u001b[31mtexte-prive",
      "https://forge.invalid/depot-prive",
    ];
    write(".drwil/evidence/run-checks-verdicts.json", {
      ranAt: privateData.join(" "),
      fingerprint: privateData.join(" "),
      checks: {
        "docs-references": { status: "fail", output: privateData.join("\n"), message: privateData[4] },
        "architecture-map": { status: "ok", output: privateData[0] },
        [privateData[2]]: { status: "fail", output: privateData[4] },
      },
    });
    mkdirSync(join(root, ".githooks"));
    writeFileSync(join(root, ".githooks/run-checks.mjs"), "throw new Error('NE DOIT PAS TOURNER');");
    const before = snapshot(root);
    const result = spawnSync(process.execPath, [cli, "report"], { cwd: root, encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stderr, "");
    assert.match(result.stdout, /Version du kit installé: 0\.10\.0/);
    assert.match(result.stdout, /Version de la CLI: \d+\.\d+\.\d+/);
    assert.match(result.stdout, /docs-references: FAIL — le contrôle des références documentaires et contrats cités a échoué/);
    assert.match(result.stdout, /état actuel non vérifié/);
    assert.match(result.stdout, /node \.githooks\/run-checks\.mjs/);
    assert.doesNotMatch(result.stdout, /architecture-map/);
    for (const value of [...privateData, root]) assert.equal(result.stdout.includes(value), false);
    assert.deepEqual(snapshot(root), before);
  }));

test("QUA-231 : absences, JSON invalides et formes inattendues ne donnent ni détail privé ni succès", () =>
  fixture((root, write) => {
    for (const value of [null, [], {}, { checks: [] }, { checks: null }, { checks: { "docs-references": null } }]) {
      write(".drwil/evidence/run-checks-verdicts.json", value);
      write(".drwil/install.json", value);
      const text = report({ targetDir: root });
      assert.match(text, /non lue/);
      assert.match(text, /cela ne signifie pas que les contrôles passent/);
    }
    writeFileSync(join(root, ".drwil/evidence/run-checks-verdicts.json"), "JSON privé invalide");
    writeFileSync(join(root, ".drwil/install.json"), "JSON privé invalide");
    assert.match(report({ targetDir: root }), /Instantané non lu/);
    rmSync(join(root, ".drwil"), { recursive: true });
    assert.match(report({ targetDir: root }), /Snapshot not read/);
  }));

test("QUA-232 : versions et champs libres exclus, identifiants strictement fermés, sortie anglaise", () =>
  fixture((root, write) => {
    const privateData = [root, "C:\\clients\\dossier-prive", "secret-fictif-hors-format", "personne@example.invalid"];
    write(".drwil/ia-first.json", { lang: "en" });
    write(".drwil/install.json", { version: "0.10.0-secret-fictif" });
    write(".drwil/evidence/run-checks-verdicts.json", {
      ranAt: privateData.join(" "),
      fingerprint: privateData.join(" "),
      checks: {
        "docs-references": { status: "not-run" },
        secrets: { status: "fail", output: privateData.join("\n"), message: privateData[2], detail: privateData[3] },
        "scope-gate": { status: "fail" },
        "main-branch": { status: "fail" },
        "contract-tests": { status: "fail" },
        "architecture-map": { status: "fail" },
        "checks-self-test": { status: "fail" },
        "ci-coverage": { status: "fail" },
        "project:client-prive": { status: "fail" },
      },
    });
    const text = report({ targetDir: root });
    assert.match(text, /Installed kit version: not read/);
    assert.match(text, /secrets: FAIL/);
    assert.doesNotMatch(text, /secret-fictif|client-prive|docs-references: FAIL/);
    for (const value of privateData) assert.equal(text.includes(value), false);
    assert.match(text, /Normalized kit messages/);
  }));

test("QUA-232 : liens symboliques et fichiers volumineux refusés sans exécuter de programme", () =>
  fixture((root, write) => {
    write("externe.json", { checks: { "docs-references": { status: "fail" } } });
    const evidence = join(root, ".drwil/evidence/run-checks-verdicts.json");
    symlinkSync(join(root, "externe.json"), evidence);
    assert.match(report({ targetDir: root }), /Instantané non lu/);
    rmSync(evidence);
    writeFileSync(evidence, "x".repeat(1024 * 1024 + 1));
    assert.match(report({ targetDir: root }), /Instantané non lu/);
    rmSync(join(root, ".drwil/evidence"), { recursive: true });
    symlinkSync(root, join(root, ".drwil/evidence"), "dir");
    assert.match(report({ targetDir: root }), /Instantané non lu/);
    rmSync(join(root, ".drwil"), { recursive: true });
    symlinkSync(root, join(root, ".drwil"), "dir");
    assert.match(report({ targetDir: root }), /Snapshot not read/);
  }));

test("QUA-233 : la CLI ne modifie aucun fichier et ne lance ni contrôle ni client de forge", () =>
  fixture((root, write) => {
    write(".drwil/evidence/run-checks-verdicts.json", { checks: { "docs-references": { status: "fail" } } });
    mkdirSync(join(root, ".githooks"));
    writeFileSync(
      join(root, ".githooks/run-checks.mjs"),
      "require('node:fs').writeFileSync(process.env.DRWIL_REPORT_SENTINEL, 'controle');",
    );
    const tools = join(root, "tools");
    mkdirSync(tools);
    for (const name of ["gh", "glab", "git", "curl", "wget"]) {
      writeFileSync(join(tools, name), '#!/bin/sh\nprintf invoked > "$DRWIL_REPORT_SENTINEL"\nexit 1\n', { mode: 0o755 });
    }
    const before = snapshot(root);
    const result = spawnSync(process.execPath, [cli, "report"], {
      cwd: root,
      encoding: "utf8",
      env: { ...process.env, PATH: tools, DRWIL_REPORT_SENTINEL: join(root, "invocation-interdite") },
    });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stderr, "");
    assert.deepEqual(snapshot(root), before);
  }));

test("QUA-234 : le rapport borne la reproduction à une instruction et demande un exemple fictif", () =>
  fixture((root, write) => {
    write(".drwil/evidence/run-checks-verdicts.json", { checks: { "docs-references": { status: "fail" } } });
    const text = report({ targetDir: root });
    assert.match(text, /docs-references: FAIL/);
    assert.match(text, /dernier instantané local.*état actuel non vérifié/);
    assert.match(text, /cette commande n'a pas été exécutée par report/);
    assert.match(text, /node \.githooks\/run-checks\.mjs/);
    assert.match(text, /résultat attendu et un exemple minimal avec des données fictives uniquement/);
    assert.match(text, /Ne pas joindre de log ni de fichier du projet/);
  }));
