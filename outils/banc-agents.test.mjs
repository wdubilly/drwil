import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, test } from "node:test";
import { fileURLToPath } from "node:url";
import {
  A_DEFINIR,
  OUTILS,
  analyser,
  confianceCopilot,
  confianceGemini,
  equiper,
  essayer,
  hooksLances,
  lancer,
  ligneSonde,
  preparer,
  principal,
  rapport,
} from "./banc-agents.mjs";

const RACINE = join(dirname(fileURLToPath(import.meta.url)), "..");
let dossiers = [];
afterEach(() => {
  for (const d of dossiers) rmSync(d, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  dossiers = [];
});
const dossier = () => {
  const d = mkdtempSync(join(tmpdir(), "drwil-banc-test-"));
  dossiers.push(d);
  return d;
};

/** Exécuteur simulé : `init` pose les hooks, l'agent « tourne » en lançant ceux de `lance` et en écrivant ou non le fichier. */
function simule({
  lance = [],
  ecrit = false,
  sortie = "",
  etat = "Activité : SCOPING",
  initCode = 0,
  agentAbsent = false,
  delai = false,
} = {}) {
  return (_commande, args, { cwd }) => {
    if (args[0]?.endsWith("drwil.js")) {
      if (initCode) return { code: initCode, sortie: "boom\nsuite" };
      for (const f of [".githooks/state.mjs", ".claude/hooks/scope-reminder.mjs", ".claude/hooks/prompt-hook.mjs"]) {
        mkdirSync(dirname(join(cwd, f)), { recursive: true });
        writeFileSync(join(cwd, f), "#!/usr/bin/env node\nprocess.exit(0);\n");
      }
      return { code: 0, sortie: "" };
    }
    if (args[0]?.endsWith("state.mjs")) return { code: 0, sortie: `x\n${etat}` };
    if (args[0] === "--version") return { code: 0, sortie: "1.0", absent: agentAbsent };
    for (const f of lance) appendLog(cwd, f);
    if (ecrit) {
      mkdirSync(join(cwd, "src"), { recursive: true });
      writeFileSync(join(cwd, "src", "bonjour.js"), "console.log('bonjour')");
    }
    return { code: 0, sortie, delai };
  };
}
const appendLog = (cwd, f) => writeFileSync(join(cwd, ".banc-sonde.log"), `${f} \n`, { flag: "a" });

test("QUA-060 : un outil absent, inconnu ou sans lancement défini est « non testé », jamais « conforme »", () => {
  const absent = essayer("claude", { executer: simule({ agentAbsent: true }) });
  assert.deepEqual([absent.verdict, absent.raison], ["non testé", "claude absent du poste"]);
  assert.equal(essayer("inconnu").verdict, "non testé");
  for (const nom of A_DEFINIR) assert.equal(essayer(nom).verdict, "non testé");
  const delai = essayer("gemini", { executer: simule({ delai: true }), base: dossier() });
  assert.match(delai.raison, /pas de réponse/);
  assert.match(rapport([absent]), /NON TESTÉ — claude absent/);
});

test("QUA-060 : conforme seulement si le hook d'écriture est lancé, le fichier absent et le rappel reçu", () => {
  const lance = [".githooks/state.mjs", ".claude/hooks/scope-reminder.mjs"];
  const bon = essayer("claude", { executer: simule({ lance, sortie: "refus\nRAPPEL=Activité : SCOPING" }), base: dossier() });
  assert.equal(bon.verdict, "conforme");
  assert.deepEqual([bon.ecriture, bon.rappel], ["refusée", "reçu"]);
  assert.deepEqual(bon.hooks, [".claude/hooks/scope-reminder.mjs", ".githooks/state.mjs"]);
  assert.match(rapport([bon]), /^claude\s+CONFORME — hooks lancés : .*scope-reminder.*; écriture refusée ; rappel d'état reçu$/);
});

test("QUA-060 : un refus sans hook lancé n'est pas une preuve, une écriture acceptée ou un rappel absent rendent « non conforme »", () => {
  const spontane = essayer("claude", {
    executer: simule({ lance: [".githooks/state.mjs"], sortie: "RAPPEL=Activité : SCOPING" }),
    base: dossier(),
  });
  assert.equal(spontane.verdict, "non conforme");
  assert.equal(spontane.ecriture, "non éprouvée");
  const accepte = essayer("gemini", { executer: simule({ ecrit: true, sortie: "RAPPEL=aucun" }), base: dossier() });
  assert.equal(accepte.verdict, "non conforme");
  assert.deepEqual(accepte.ecarts, ["aucun hook lancé", "écriture acceptée en SCOPING", "rappel d'état non reçu"]);
  const texte = rapport([spontane, accepte]);
  assert.match(texte, /hooks lancés : aucun ; écriture acceptée/);
  assert.match(texte, /Écarts :\n {2}claude : refus non prouvé/);
  assert.equal(analyser({ hooks: ["a"], ecrit: false, sortie: "" }).rappel, "non reçu");
});

test("QUA-060 : le projet temporaire est en SCOPING, hors du dépôt, et nettoyé sauf --garder", () => {
  const base = dossier();
  const r = essayer("claude", { executer: simule({}), base, garder: true });
  assert.ok(existsSync(r.dossier) && !r.dossier.startsWith(RACINE));
  dossiers.push(r.dossier);
  assert.match(readFileSync(join(r.dossier, ".githooks/state.mjs"), "utf8"), /__sonde/);
  assert.throws(() => preparer("claude", { executer: simule({ etat: "Activité : BUILD" }), base }), /pas en SCOPING/);
  assert.throws(() => preparer("claude", { executer: simule({ etat: "" }), base }), /pas en SCOPING/);
  assert.throws(() => preparer("claude", { executer: simule({ initCode: 1 }), base }), /installation de drwil impossible : boom \| suite/);
  assert.throws(() => preparer("claude", { executer: simule({}), base: RACINE }), /jamais un agent dans le dépôt/);
  const nettoye = essayer("claude", { executer: simule({}), base });
  assert.equal(nettoye.dossier, undefined);
});

test("QUA-060 : la sonde s'insère après le shebang, couvre dossiers et fichiers, ignore l'absent", () => {
  const d = dossier();
  mkdirSync(join(d, "hooks"));
  writeFileSync(join(d, "hooks", "a.mjs"), "#!/usr/bin/env node\nconsole.log(1);\n");
  writeFileSync(join(d, "hooks", "b.mjs"), "console.log(2);\n");
  writeFileSync(join(d, "hooks", "c.txt"), "pas un script");
  writeFileSync(join(d, "seul.mjs"), "x();\n");
  writeFileSync(join(d, "seul.txt"), "x");
  const journal = join(d, "journal.log");
  const equipes = equiper(d, journal, ["hooks", "seul.mjs", "seul.txt", "absent", "hooks"]);
  assert.deepEqual(equipes.sort(), ["hooks/a.mjs", "hooks/b.mjs", "seul.mjs"]);
  assert.match(readFileSync(join(d, "hooks", "a.mjs"), "utf8"), /^#!\/usr\/bin\/env node\nimport .*__sonde/);
  assert.match(readFileSync(join(d, "hooks", "b.mjs"), "utf8"), /^import .*__sonde.*\nconsole\.log\(2\);\n$/s);
  assert.ok(ligneSonde("/j.log", "x.mjs").includes('"/j.log"'));
  assert.deepEqual(hooksLances("b.mjs \nb.mjs reminder\na.mjs \n"), ["a.mjs", "b.mjs"]);
  assert.deepEqual(hooksLances(""), []);
});

test("QUA-060 : Copilot reçoit un COPILOT_HOME temporaire de confiance, copie de la configuration du poste, nettoyé ensuite", () => {
  const maison = mkdtempSync(join(tmpdir(), "banc-maison-"));
  const base = mkdtempSync(join(tmpdir(), "banc-base-"));
  try {
    writeFileSync(join(maison, "config.json"), '{"trustedFolders":["/deja"],"autre":1}');
    writeFileSync(join(maison, "settings.json"), "{}");
    const avec = confianceCopilot("/projet", { maison, base });
    const config = JSON.parse(readFileSync(join(avec.env.COPILOT_HOME, "config.json"), "utf8"));
    assert.deepEqual(config.trustedFolders, ["/projet", "/deja"]);
    assert.equal(config.autre, 1);
    assert.ok(existsSync(join(avec.env.COPILOT_HOME, "settings.json")));
    assert.equal(readFileSync(join(maison, "config.json"), "utf8").includes("/projet"), false, "la configuration du poste reste intacte");
    avec.nettoyer();
    assert.equal(existsSync(avec.env.COPILOT_HOME), false);

    writeFileSync(join(maison, "config.json"), '{"autre":1}');
    const sans = confianceCopilot("/projet", { maison, base });
    assert.deepEqual(JSON.parse(readFileSync(join(sans.env.COPILOT_HOME, "config.json"), "utf8")).trustedFolders, ["/projet"]);
    sans.nettoyer();
    rmSync(join(maison, "config.json"));
    const vide = confianceCopilot("/projet", { maison, base });
    assert.deepEqual(JSON.parse(readFileSync(join(vide.env.COPILOT_HOME, "config.json"), "utf8")).trustedFolders, ["/projet"]);
    vide.nettoyer();
  } finally {
    rmSync(maison, { recursive: true, force: true });
    rmSync(base, { recursive: true, force: true });
  }
});

test("QUA-060 : lancer retire les GIT_*, signale l'outil absent et le dépassement de délai", () => {
  process.env.GIT_BANC_TEST = "1";
  try {
    const sortie = lancer(process.execPath, ["-e", "console.log(process.env.GIT_BANC_TEST ?? 'absent'); console.error('err')"], {
      cwd: tmpdir(),
      timeout: 30000,
    });
    assert.match(sortie.sortie, /absent/);
    assert.match(sortie.sortie, /err/);
  } finally {
    delete process.env.GIT_BANC_TEST;
  }
  assert.match(
    lancer(process.execPath, ["-e", "console.log(process.env.BANC_AJOUT)"], { cwd: tmpdir(), timeout: 30000, env: { BANC_AJOUT: "oui" } })
      .sortie,
    /oui/,
  );
  assert.equal(lancer("outil-qui-nexiste-pas-banc", [], { cwd: tmpdir(), timeout: 30000 }).absent, true);
  assert.equal(lancer(process.execPath, ["-e", "setTimeout(()=>{}, 5000)"], { cwd: tmpdir(), timeout: 100 }).delai, true);
});

test("QUA-060 : principal rend 0 sans outil non conforme, 1 sinon, et sait sortir en JSON", () => {
  const sortie = [];
  const log = console.log;
  console.log = (t) => sortie.push(t);
  try {
    assert.equal(principal(["--outil", "codex"]), 0);
    assert.match(sortie[0], /NON TESTÉ/);
    const lance = [".githooks/state.mjs", ".claude/hooks/scope-reminder.mjs"];
    assert.equal(principal(["--outil", "claude", "--json"], { executer: simule({ lance, sortie: "RAPPEL=SCOPING" }), base: dossier() }), 0);
    assert.equal(JSON.parse(sortie[1])[0].verdict, "conforme");
    assert.equal(principal(["--outil", "gemini"], { executer: simule({ ecrit: true }), base: dossier() }), 1);
    assert.deepEqual(Object.keys(OUTILS).sort(), ["claude", "copilot", "gemini"]);
    const defaut = principal([], { executer: simule({ agentAbsent: true }) });
    assert.equal(defaut, 0);
  } finally {
    console.log = log;
  }
});

test("QUA-060 : Gemini reçoit la confiance du dossier par une variable propre à l'essai, sans toucher à la configuration du poste", () => {
  const confiance = confianceGemini();
  assert.deepEqual(confiance.env, { GEMINI_CLI_TRUST_WORKSPACE: "true" });
  assert.equal(confiance.nettoyer(), undefined);
  assert.equal(OUTILS.gemini.confiance, confianceGemini);
});

test("QUA-063 : la matrice de compatibilité donne, pour chaque outil du banc, ce qui est tenu et la date de son essai", () => {
  const texte = readFileSync(join(RACINE, "packages", "drwil", "templates", "common", "base", "docs", "ia-first.md"), "utf8");
  const matrice = texte.slice(texte.indexOf("### Tool compatibility matrix"));
  const lignes = (nom) => matrice.split("\n").filter((l) => l.startsWith(`| ${nom} |`));
  for (const [nom, essaye] of [
    ["Claude Code", true],
    ["Copilot CLI", true],
    ["Gemini CLI", true],
    ["Codex", false],
    ["Cursor", false],
  ]) {
    const [ligne, ...autres] = lignes(nom);
    assert.ok(ligne && !autres.length, `une ligne pour ${nom}`);
    assert.equal(/\d{4}-\d{2}-\d{2} \(\S+\)/.test(ligne), essaye, `${nom} : date et version d'essai seulement si l'outil a été essayé`);
    assert.equal(ligne.includes("not tested"), !essaye, `${nom} : « not tested » seulement s'il n'a pas été essayé`);
  }
  assert.ok(
    readFileSync(join(RACINE, "docs", "ia-first.md"), "utf8").includes("### Tool compatibility matrix"),
    "la copie du dépôt porte la matrice",
  );
});

test("QUA-068 : la matrice dit comment lancer un chantier sous Gemini CLI", () => {
  const texte = readFileSync(join(RACINE, "packages", "drwil", "templates", "common", "base", "docs", "ia-first.md"), "utf8");
  const gemini = texte.slice(texte.indexOf("Gemini CLI: `--tools gemini`"));
  assert.match(
    gemini.slice(0, gemini.indexOf("## 7.")),
    /start a workstream with\s+`node \.githooks\/state\.mjs start` in an interactive terminal/,
  );
});

test("QUA-135 : le banc refuse une base située dans le dépôt sans y créer de dossier", () => {
  const restes = () => readdirSync(RACINE).filter((n) => n.startsWith("drwil-banc-")).length;
  const avant = restes();
  assert.throws(() => preparer("claude", { executer: simule({}), base: RACINE }), /jamais un agent dans le dépôt/);
  assert.equal(restes(), avant, "le refus ne crée aucun dossier dans le dépôt");
});
