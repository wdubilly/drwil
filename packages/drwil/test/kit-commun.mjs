// Helpers partagés par les tests du kit (kit.test.mjs et les fichiers kit-<thème>.test.mjs nés de sa découpe) :
// dossiers temporaires et leur nettoyage, git et run-checks à l'abri de l'environnement qui lance la suite, lecture
// des consignes, projet verify, CLI. Importé avant tout test : ses hooks after/afterEach valent pour le fichier qui l'importe.
import { after, afterEach } from "node:test";
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, mkdtempSync, readFileSync, writeFileSync, mkdirSync, statSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { init } from "../dist/index.js";
import { createHash } from "node:crypto";

// Un hook lancé par `git commit -a` ou depuis un worktree reçoit GIT_INDEX_FILE, GIT_DIR… :
// hérités, ils font agir les projets de test (et leurs hooks) sur le dépôt qui lance la suite.
for (const nom of Object.keys(process.env)) if (nom.startsWith("GIT_")) delete process.env[nom];

// Chaque dossier temporaire est supprimé après son test : sans ça, la suite (lancée à chaque
// commit par le hook) en laissait ~70 par passage et finissait par épuiser les inodes de /tmp.
// Ceux d'un test en échec sont gardés (et affichés) pour le diagnostic.
const tmpReel = tmpdir();
// Les hooks lancés par les projets de test gardent le dossier temporaire de leurs contrôles en échec (QUA-133) :
// dans une racine propre à ce fichier, supprimée à la fin, pour qu'ils ne s'accumulent pas dans /tmp.
const racineHooks = mkdtempSync(join(tmpReel, "drwil-kit-racine-"));
process.env.TMPDIR = racineHooks;
after(() => rmSync(racineHooks, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }));
let dossiersDuTest = [];
export const tmp = () => {
  const dir = mkdtempSync(join(tmpReel, "drwil-"));
  dossiersDuTest.push(dir);
  return dir;
};
afterEach((t) => {
  if (t.passed === false) console.error(`dossiers gardés pour diagnostic (${t.name}) : ${dossiersDuTest.join(", ")}`);
  else {
    for (const dir of dossiersDuTest) {
      // macOS (CI) : ENOTEMPTY quand un fichier finit de s'écrire pendant la suppression ; rmSync
      // réessaie. Un dossier temporaire résiduel ne doit pas faire échouer un test réussi : signalé.
      try {
        rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
      } catch (e) {
        console.error(`dossier temporaire non supprimé (${t.name}) : ${dir} — ${e.code ?? e.message}`);
      }
    }
  }
  dossiersDuTest = [];
});
export const quiet = async (fn) => {
  const log = console.log,
    warn = console.warn;
  console.log = console.warn = () => {};
  try {
    return await fn();
  } finally {
    console.log = log;
    console.warn = warn;
  }
};
export const capture = async (fn) => {
  const log = console.log,
    lines = [];
  console.log = (...a) => lines.push(a.join(" "));
  try {
    await fn();
    return lines;
  } finally {
    console.log = log;
  }
};
// CI et DRWIL_PUSH_TAGS_ONLY retirés explicitement : un commit/push simulé représente
// toujours un geste développeur local isolé, même quand la suite elle-même tourne
// dans une vraie CI (CI=true désactiverait à tort QUA-017) ou est déclenchée par le
// vrai hook pre-push lors d'un vrai push de tag (DRWIL_PUSH_TAGS_ONLY=1 fuirait sinon
// dans tous les commits/push simulés par les tests, qui doivent rester indépendants
// du contexte qui a lancé la suite). DRWIL_HOOK de même : le vrai pre-commit du dépôt
// drwil lance cette suite, ses contrôles ne doivent pas hériter du report au commit.
export const envTest = { ...process.env, CI: "" };
delete envTest.DRWIL_PUSH_TAGS_ONLY;
delete envTest.DRWIL_PUSH_NO_BRANCH;
delete envTest.DRWIL_PUSH_REFS;
delete envTest.DRWIL_HOOK;
// Les tests qui jouent le moteur dans ce processus lisent process.env, pas envTest : sans ce retrait, la
// suite lancée par le pre-push se croirait au push (runAt) et échouerait.
for (const k of ["DRWIL_PUSH_REFS", "DRWIL_PUSH_REMOTE", "DRWIL_PUSH_TAGS_ONLY", "DRWIL_PUSH_NO_BRANCH"]) delete process.env[k];
// run-checks n'affiche que ses échecs et un résumé (QUA-126) : le rapport complet, écrit à côté, s'y ajoute
// pour que les attentes sur un avertissement ou une annonce gardent leur sens.
const withDetail = (r, dir) => {
  const detail = join(dir, ".drwil/evidence/run-checks.log");
  return { ...r, stdout: r.stdout + (existsSync(detail) ? readFileSync(detail, "utf8") : "") };
};
export const checks = (dir) =>
  withDetail(spawnSync(process.execPath, [".githooks/run-checks.mjs"], { cwd: dir, encoding: "utf8", env: envTest }), dir);
export const git = (dir, ...args) =>
  spawnSync("git", ["-c", "user.email=t@t", "-c", "user.name=t", ...args], { cwd: dir, encoding: "utf8", env: envTest });
export const read = (dir, f) => readFileSync(join(dir, f), "utf8");
// docs/ia-first.md est un sommaire : chaque section est un fichier de docs/ia-first/ qu'il cite. Une règle se
// cherche dans le sommaire et ses sections, jamais à une position fixe d'un seul fichier.
export const sectionsIaFirst = (racine) => {
  const sommaire = readFileSync(join(racine, "docs/ia-first.md"), "utf8");
  const chemins = [...new Set([...sommaire.matchAll(/`(docs\/ia-first\/[^`]+\.md)`/g)].map((m) => m[1]))];
  return { sommaire, sections: chemins.map((chemin) => ({ chemin, texte: readFileSync(join(racine, chemin), "utf8") })) };
};
const iaFirst = (racine) => {
  const { sommaire, sections } = sectionsIaFirst(racine);
  return [sommaire, ...sections.map((s) => s.texte)].join("\n");
};
// La section du sommaire dont le titre (première ligne) correspond au motif.
export const sectionIaFirst = (racine, titre) => sectionsIaFirst(racine).sections.find((s) => titre.test(s.texte.split("\n")[0]));
// AGENTS.md est un aiguillage court : le texte complet des règles est dans la section 8 de docs/ia-first.md.
export const consignes = (dir) => `${read(dir, "AGENTS.md")}\n${iaFirst(dir)}`;
export const config = (dir) => JSON.parse(read(dir, ".drwil/ia-first.json"));
// Une installation neuve a la barrière de périmètre bloquante, qui refuse le commit du kit en SCOPING : les tests
// qui commitent l'installation sans lancer de chantier la règlent en avertissement.
export const enAvertissement = (dir) =>
  writeFileSync(join(dir, ".drwil/ia-first.json"), `${JSON.stringify({ ...config(dir), scopeGate: "warning" }, null, 2)}\n`);
// NTFS n'a pas de bit d'exécution : sous Windows chmod est un no-op, donc ce contrôle
// (déjà fait sur Linux/macOS par le test "lot 4 : commit-msg livré désactivé") n'a pas de sens.
export const executable = (dir, f) => process.platform === "win32" || Boolean(statSync(join(dir, f)).mode & 0o100);

export const GABARIT = fileURLToPath(new URL("../templates/common/", import.meta.url));
export const DEPOT = fileURLToPath(new URL("../../../", import.meta.url));

// Copie tous les scripts d'un module optionnel dans .githooks/ (un module tient en plusieurs fichiers, QUA-001).
// `fichiers` restreint la copie aux scripts d'un seul chantier de test (le reste du module n'est pas cadré).
export const copierModule = (dir, nom, fichiers = null) => {
  const src = fileURLToPath(new URL(`../templates/common/optional/${nom}/`, import.meta.url));
  mkdirSync(join(dir, ".githooks"), { recursive: true });
  for (const f of readdirSync(src).filter((x) => x.endsWith(".mjs") && (!fichiers || fichiers.includes(x))))
    writeFileSync(join(dir, ".githooks", f), readFileSync(join(src, f), "utf8"));
};

// DRWIL-003 : verify = primitive de validation du travail. Contrôles déterministes `ok`/`ko`
// (pas de gitleaks, absent de certains postes) : seul le verdict est testé, pas les outils.
export async function projetVerify(contrats, reglages = {}) {
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir, git: false, ci: "none" }));
  const cfg = { ...config(dir), ...reglages };
  cfg.checks = [
    { id: "ok", name: "toujours vert", run: 'node -e "process.exit(0)"' },
    { id: "ko", name: "toujours rouge", run: "node -e \"console.log('cause du rouge'); process.exit(1)\"" },
  ];
  writeFileSync(join(dir, ".drwil/ia-first.json"), JSON.stringify(cfg));
  writeFileSync(join(dir, "docs/contracts.md"), `# Contrats\n\n${contrats}\n`);
  return dir;
}
export const contrat = (id, champs) => `## ${id} — titre ${id}\n**Règle** : exigence ${id}.\n${champs}\n`;

export const cli = (dir, ...args) =>
  spawnSync(process.execPath, [fileURLToPath(new URL("../bin/drwil.js", import.meta.url)), ...args], {
    cwd: dir,
    encoding: "utf8",
    env: envTest,
  });

export const empreinte = (contenu) => createHash("sha256").update(contenu).digest("hex");
