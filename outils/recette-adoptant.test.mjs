import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { BRANCHE_MAJ, adoptantsParDefaut, copier, derouler, jugerMiseAJour, lireArguments } from "./recette-adoptant.mjs";

let dossiers = [];
afterEach(() => {
  for (const d of dossiers) rmSync(d, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  dossiers = [];
});
const dossier = () => {
  const d = mkdtempSync(join(tmpdir(), "drwil-recette-test-"));
  dossiers.push(d);
  return d;
};
const MESSAGE = "Mise à jour du kit drwil: 0.11.1 → 0.12.0\n\nDrwil-Kit-Update: 0.12.0\n";

test("QUA-331 : sans chemin, la recette vise des copies de marinade-poulet et de drwil_walk ; --garder garde le dossier", () => {
  assert.deepEqual(adoptantsParDefaut("/h"), [join("/h", "projects", "marinade-poulet"), join("/h", "projects", "drwil_walk")]);
  assert.deepEqual(lireArguments([], "/h"), { garder: false, adoptants: adoptantsParDefaut("/h") });
  const a = lireArguments(["--garder", "/x/projet"], "/h");
  assert.equal(a.garder, true);
  assert.deepEqual(a.adoptants, ["/x/projet"]);
});

test("QUA-331 : la mise à jour est jugée — commit sur sa branche avec le trailer, arbre propre, aucune clé format", () => {
  const bon = {
    init: { status: 0, stdout: "Première passe complète, puis reprise des verdicts" },
    branche: BRANCHE_MAJ,
    message: MESSAGE,
    statut: "",
    config: { checks: [] },
  };
  assert.deepEqual(jugerMiseAJour(bon).problemes, []);
  assert.equal(jugerMiseAJour(bon).premierePasse, true);
  assert.equal(jugerMiseAJour({ ...bon, init: { status: 0, stdout: "" } }).premierePasse, false);
  const p = (x) => jugerMiseAJour({ ...bon, ...x }).problemes.join("\n");
  assert.match(p({ init: { status: 1, stderr: "Mise à jour refusée" } }), /drwil init.*code 1.*refusée/s);
  assert.match(p({ branche: "master" }), /aucun commit de mise à jour/);
  assert.match(p({ message: "autre chose" }), /Drwil-Kit-Update/);
  assert.match(p({ statut: " M src/a.js" }), /arbre de travail/);
  assert.match(p({ config: { format: {} } }), /clé `format`/);
});

/** Simule git, npm et la CLI installée ; `remplacer[etape]` change le résultat d'une étape. */
function simulateur(remplacer = {}) {
  const appels = [];
  const lancer = (cmd, args, { cwd }) => {
    const etape = args[0] === "-C" ? args[2] : args[0];
    appels.push({ cmd, args, cwd, etape });
    if (remplacer[etape]) return remplacer[etape]({ args, cwd });
    if (etape === "pack")
      return { status: 0, stdout: `> prepack\n${JSON.stringify([{ filename: "drwil-0.12.0.tgz", version: "0.12.0" }])}` };
    if (etape === "install") {
      mkdirSync(join(cwd, "node_modules", ".bin"), { recursive: true });
      for (const f of ["drwil", "drwil.cmd"]) writeFileSync(join(cwd, "node_modules", ".bin", f), "");
      return { status: 0 };
    }
    if (etape === "clone") {
      const copie = args.at(-1);
      mkdirSync(join(copie, ".drwil"), { recursive: true });
      writeFileSync(join(copie, "package-lock.json"), "{}");
      writeFileSync(join(copie, ".drwil", "ia-first.json"), '{ "checks": [] }');
      return { status: 0 };
    }
    if (etape === "for-each-ref") return { status: 0, stdout: "master\nworkstream/en-cours\n" };
    if (etape === "symbolic-ref") return { status: 0, stdout: `${BRANCHE_MAJ}\n` };
    if (etape === "log") return { status: 0, stdout: MESSAGE };
    if (etape === "status") return { status: 0, stdout: "" };
    if (etape === "init") return { status: 0, stdout: "Première passe complète, puis reprise des verdicts" };
    if (etape === "config" && args.includes("--get")) return { status: 1, stdout: "" };
    return { status: 0, stdout: "" };
  };
  return { appels, lancer };
}

test("QUA-331 : tarball construit, copie clonée sans remote, hooks actifs, mise à jour par la CLI installée ; rien hors du dossier temporaire", () => {
  const temp = dossier();
  const { appels, lancer } = simulateur();
  const r = derouler({ paquet: "/depot/packages/drwil", adoptants: ["/src/marinade-poulet"], temp, lancer, existe: () => true });
  assert.equal(r.statut, "ok", JSON.stringify(r));
  assert.equal(r.adoptants[0].statut, "ok");
  assert.match(r.adoptants[0].message, /première passe complète annoncée/);
  const ordre = appels.map((a) => a.etape);
  for (const [avant, apres] of [
    ["pack", "install"],
    ["clone", "remote"],
    ["remote", "init"],
    ["ci", "init"],
  ])
    assert.ok(ordre.indexOf(avant) < ordre.indexOf(apres), `${avant} avant ${apres} : ${ordre.join(" ")}`);
  assert.ok(appels.some((a) => a.etape === "remote" && a.args.join(" ") === "remote remove origin"));
  assert.ok(appels.some((a) => a.etape === "config" && a.args.join(" ") === "config core.hooksPath .githooks"));
  assert.ok(
    appels.some((a) => a.etape === "branch" && a.args.includes("workstream/en-cours")),
    "branches autres que la principale retirées de la copie",
  );
  assert.ok(!ordre.includes("push"), "jamais de push");
  const init = appels.find((a) => a.etape === "init");
  assert.equal(init.cmd, join(temp, "installe", "node_modules", ".bin", process.platform === "win32" ? "drwil.cmd" : "drwil"));
  for (const a of appels.filter((x) => x.etape !== "pack"))
    assert.ok(a.cwd.startsWith(temp), `${a.etape} lancé hors du dossier temporaire : ${a.cwd}`);
});

test("QUA-331 : un adoptant absent ou un registre injoignable est « non exécuté », jamais vert", () => {
  const { lancer } = simulateur();
  const r = derouler({ paquet: "/p", adoptants: [join(dossier(), "absent")], temp: dossier(), lancer, existe: () => false });
  assert.equal(r.statut, "non-execute");
  const reseau = simulateur({ ci: () => ({ status: 1, stderr: "npm error code ENOTFOUND" }) });
  const r2 = derouler({ paquet: "/p", adoptants: ["/src/walk"], temp: dossier(), lancer: reseau.lancer, existe: () => true });
  assert.equal(r2.adoptants[0].statut, "non-execute");
  const casse = simulateur({ init: () => ({ status: 1, stderr: "Mise à jour refusée" }) });
  const r3 = derouler({ paquet: "/p", adoptants: ["/src/walk"], temp: dossier(), lancer: casse.lancer, existe: () => true });
  assert.equal(r3.statut, "echec");
});

test("QUA-331 : la copie part du commit de la branche principale, sans remote ; le dépôt d'origine reste intact", () => {
  const source = dossier();
  const git = (...args) => execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@t", ...args], { cwd: source, encoding: "utf8" });
  git("init", "--quiet", "-b", "master");
  writeFileSync(join(source, "a.txt"), "principale\n");
  git("add", "a.txt");
  git("commit", "--quiet", "-m", "un");
  git("checkout", "--quiet", "-b", "workstream/en-cours");
  writeFileSync(join(source, "a.txt"), "travail en cours, non commité\n");
  const avant = git("status", "--porcelain");
  const copie = join(dossier(), "copie");
  const lancer = (cmd, args, opts) => spawnSync(cmd, args, { encoding: "utf8", ...opts });
  assert.equal(copier(source, copie, lancer), null);
  assert.equal(readFileSync(join(copie, "a.txt"), "utf8"), "principale\n");
  const dans = (...args) => execFileSync("git", args, { cwd: copie, encoding: "utf8" }).trim();
  assert.equal(dans("remote"), "");
  assert.equal(dans("branch", "--show-current"), "master");
  assert.equal(dans("for-each-ref", "--format=%(refname:short)", "refs/heads"), "master");
  assert.equal(dans("config", "core.hooksPath"), ".githooks");
  assert.equal(git("status", "--porcelain"), avant);
  assert.equal(git("branch", "--show-current").trim(), "workstream/en-cours");
  assert.ok(existsSync(join(source, ".git")));
});
