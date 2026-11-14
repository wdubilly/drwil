import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { inventaire, lireArguments, rendu } from "./inventaire-attestations.mjs";

const SCRIPT = fileURLToPath(new URL("./inventaire-attestations.mjs", import.meta.url));
let dossiers = [];
afterEach(() => {
  for (const d of dossiers) rmSync(d, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  dossiers = [];
});

const REGISTRE = [
  "# Contrats",
  "",
  "## QUA-001 — Couvre un fichier carrefour et un motif",
  "**Règle** : r.",
  "**Manuel** : m.",
  "**Couvre** : `src/carrefour.mjs`, `src/dedie/**`, `src/disparu.mjs`",
  "## QUA-002 — Ne couvre rien",
  "**Règle** : r.",
  "**Manuel** : m.",
  "**Couvre** : `aucun` — contrat de conduite",
  "## QUA-003 — Sans Couvre",
  "**Règle** : r.",
  "**Contrôle** : `c`",
  "## QUA-004 — Retiré",
  "**Règle** : r.",
  "**Retiré** : 2026-11-01 — remplacé",
  "",
].join("\n");

/** Dépôt git temporaire : registre, archive et trois commits datés (deux avant 2026-10-22, un après). */
function depot() {
  const racine = mkdtempSync(join(tmpdir(), "drwil-inventaire-"));
  dossiers.push(racine);
  const ecrire = (chemin, contenu) => {
    mkdirSync(dirname(join(racine, chemin)), { recursive: true });
    writeFileSync(join(racine, chemin), contenu);
  };
  const g = (args, date) =>
    spawnSync("git", args, {
      cwd: racine,
      encoding: "utf8",
      env: { ...process.env, GIT_AUTHOR_DATE: date, GIT_COMMITTER_DATE: date },
    });
  g(["init", "-q"]);
  g(["config", "user.email", "t@example.invalid"]);
  g(["config", "user.name", "t"]);
  g(["config", "commit.gpgsign", "false"]);
  ecrire("docs/contracts.md", REGISTRE);
  ecrire("src/carrefour.mjs", "1");
  ecrire("src/dedie/a.mjs", "1");
  ecrire("src/autre.mjs", "1");
  for (const f of [
    "QUA-001-2026-10-01T10-00-00-000Z.json",
    "QUA-001-2026-10-25T10-00-00-000Z.json",
    "QUA-0010-2026-10-01T10-00-00-000Z.json",
  ])
    ecrire(`.drwil/evidence/attestations/${f}`, "{}");
  g(["add", "-A"]);
  g(["commit", "-q", "-m", "un"], "2026-10-01T12:00:00Z");
  ecrire("src/carrefour.mjs", "2");
  ecrire("src/dedie/a.mjs", "2");
  g(["commit", "-qam", "deux"], "2026-10-10T12:00:00Z");
  ecrire("src/carrefour.mjs", "3");
  ecrire("src/autre.mjs", "3");
  g(["commit", "-qam", "trois"], "2026-10-30T12:00:00Z");
  return racine;
}

const etat = (racine) => [
  spawnSync("git", ["status", "--porcelain", "--ignored"], { cwd: racine, encoding: "utf8" }).stdout,
  readdirSync(racine, { recursive: true }).sort().join("\n"),
];

test("QUA-299 : par contrat qui déclare Couvre, ses fichiers couverts, ses attestations archivées et les commits de chaque fichier", () => {
  const racine = depot();
  const lignes = inventaire(racine);
  assert.deepEqual(
    lignes.map((l) => l.id),
    ["QUA-001"],
    "ni `aucun`, ni contrat sans Couvre, ni contrat retiré",
  );
  const [l] = lignes;
  assert.equal(l.attestations, 2, "QUA-0010 n'est pas une attestation de QUA-001");
  assert.deepEqual(l.fichiers, [
    { chemin: "src/carrefour.mjs", commits: 3 },
    { chemin: "src/dedie/a.mjs", commits: 2 },
  ]);
  assert.equal(l.commits, 3, "un commit qui change deux fichiers couverts compte une fois");
  assert.deepEqual(l.motifsVides, ["src/disparu.mjs"]);
});

test("QUA-299 : les commits se comptent depuis la date donnée", () => {
  const racine = depot();
  const [l] = inventaire(racine, { depuis: "2026-10-22" });
  assert.deepEqual(l.fichiers, [
    { chemin: "src/carrefour.mjs", commits: 1 },
    { chemin: "src/dedie/a.mjs", commits: 0 },
  ]);
  assert.equal(l.commits, 1);
  assert.equal(l.attestations, 2, "l'archive n'est pas filtrée par la date");
  const texte = rendu([l], "2026-10-22");
  assert.match(texte, /depuis le 2026-10-22/);
  assert.match(texte, /QUA-001 — Couvre un fichier carrefour/);
  assert.match(texte, /2 attestation\(s\) archivée\(s\) ; 1 commit\(s\)/);
  assert.match(texte, /src\/disparu\.mjs \(aucun fichier suivi\)/);
});

test("QUA-299 : la commande n'écrit rien, en texte comme en JSON", () => {
  const racine = depot();
  const avant = etat(racine);
  const texte = spawnSync(process.execPath, [SCRIPT, "--depuis", "2026-10-22", racine], { encoding: "utf8" });
  assert.equal(texte.status, 0, texte.stderr);
  assert.match(texte.stdout, /1 contrat\(s\) déclarent \*\*Couvre\*\*/);
  const json = spawnSync(process.execPath, [SCRIPT, "--json", racine], { encoding: "utf8" });
  assert.equal(json.status, 0, json.stderr);
  const lu = JSON.parse(json.stdout);
  assert.equal(lu.depuis, null);
  assert.equal(lu.contrats[0].commits, 3);
  assert.deepEqual(etat(racine), avant, "aucun fichier ni état git changé");
});

test("QUA-299 : une date mal formée ou une option inconnue est refusée, un registre absent est une erreur", () => {
  assert.match(lireArguments(["--depuis", "22/10/2026"]).erreur, /AAAA-MM-JJ/);
  assert.match(lireArguments(["--depuis"]).erreur, /reçu : rien/);
  assert.match(lireArguments(["--tout"]).erreur, /option inconnue/);
  const mauvaise = spawnSync(process.execPath, [SCRIPT, "--depuis", "hier"], { encoding: "utf8" });
  assert.equal(mauvaise.status, 2);
  const vide = mkdtempSync(join(tmpdir(), "drwil-inventaire-vide-"));
  dossiers.push(vide);
  const r = spawnSync(process.execPath, [SCRIPT, vide], { encoding: "utf8" });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /registre introuvable/);
});
