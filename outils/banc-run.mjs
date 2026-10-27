// Exécution du mini-banc (QUA-101 à QUA-108) : lancement des commandes et de l'agent, installation de drwil
// depuis son tarball, adoption fixe, copie jetable du projet de référence. Séparé de outils/banc.mjs
// (QUA-001, fichier de code plafonné), qui le réexporte. Propre à ce dépôt (QUA-018).
import { spawn, spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, readdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, sep } from "node:path";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";

export const RACINE = join(dirname(fileURLToPath(import.meta.url)), "..");
export const REFERENCE = join(RACINE, "bench", "reference");
const PAQUET = join(RACINE, "packages", "drwil");
const ENV_AGENT = ["PATH", "HOME", "USER", "LANG", "LC_ALL", "TMPDIR", "TERM", "SHELL", "CLAUDE_CODE_OAUTH_TOKEN"];

/**
 * Commande lancée sans variable GIT_* héritée (QUA-057) : elle ferait agir git sur le dépôt qui lance le banc ;
 * ni NODE_TEST_CONTEXT, qui ferait parler les tests jugés au lanceur de tests du banc au lieu de rendre leur TAP.
 */
export function lancer(commande, args, { cwd, timeout = 120000, env } = {}) {
  const base = env ?? Object.fromEntries(Object.entries(process.env).filter(([n]) => !n.startsWith("GIT_") && n !== "NODE_TEST_CONTEXT"));
  const r = spawnSync(commande, args, { cwd, env: base, encoding: "utf8", timeout, maxBuffer: 64 * 1024 * 1024 });
  return {
    code: r.status,
    sortie: `${r.stdout ?? ""}${r.stderr ?? ""}`,
    absent: r.error?.code === "ENOENT",
    delai: r.error?.code === "ETIMEDOUT",
  };
}

/**
 * Installation de drwil dans la copie comme chez un utilisateur (QUA-108) : le tarball de la version construite
 * dans ce dépôt (`npm pack`), à côté de la copie, en dépendance de développement, puis `init` par ce paquet ;
 * `npx drwil` s'y résout sur place, jamais sur le registre npm (drwil n'y est pas publié). CI GitHub déclarée,
 * comme un projet gouverné (sans elle, `verify` ne peut juger la couverture CI des contrôles, QUA-013, et le
 * signale avant tout travail de l'agent) ; son workflow ne tourne jamais dans le bac à sable. Gestes humains
 * délégués (transitions : agent).
 */
export function installerDrwil(dossier, executer = lancer, paquet = PAQUET) {
  const racine = dirname(dossier);
  const etape = (nom, r) => {
    if (r.code !== 0) throw new Error(`${nom} : ${r.sortie.trim().split("\n").slice(-2).join(" | ")}`);
  };
  etape("npm pack", executer("npm", ["pack", "--pack-destination", racine], { cwd: paquet, timeout: 300000 }));
  const tarball = readdirSync(racine).find((f) => /^drwil-.+\.tgz$/.test(f));
  if (!tarball) throw new Error("npm pack : aucun tarball drwil-*.tgz produit");
  const npm = ["install", "--save-dev", "--prefer-offline", "--no-audit", "--no-fund", `../${tarball}`];
  etape("npm install", executer("npm", npm, { cwd: dossier, timeout: 300000 }));
  const args = ["init", "--name", "boutique", "--lang", "fr", "--tools", "claude", "--ci", "github", "--layers", "", "--no-git"];
  etape("npx drwil init", executer("npx", ["--offline", "drwil", ...args], { cwd: dossier }));
  adopter(dossier);
}

/**
 * Adoption fixe, identique à chaque passage, après `init` (QUA-108), comme un utilisateur avant sa première tâche
 * (docs/recipes/adopt-the-kit.md, étapes 1 à 3) : `init` a déjà rattaché le code indexé à la fiche « code
 * existant » et cité ses dossiers dans la carte ; restent les rôles réels de la carte et les contrôles de la pile
 * (`npm test`). Aucune couche, aucune garantie obligatoire (forge protégée impossible dans le bac à sable). Un
 * texte attendu absent fait échouer la préparation : jamais une copie à moitié adoptée en silence.
 */
export function adopter(dossier) {
  const remplacer = (relatif, motif, texte) => {
    const fichier = join(dossier, relatif);
    const avant = readFileSync(fichier, "utf8");
    if (!motif.test(avant)) throw new Error(`adoption : ${relatif} sans ${motif}`);
    writeFileSync(fichier, avant.replace(motif, texte));
  };
  const description = JSON.parse(readFileSync(join(dossier, "package.json"), "utf8")).description;
  remplacer("docs/architecture.md", /^\((to describe|à décrire)[^)\n]*\)$/m, description);
  remplacer(
    "docs/architecture.md",
    /^(Dossiers de code indexés avant l'installation du kit[^;\n]*); le rôle[^\n]*$/m,
    "$1 : rôles décrits à l'adoption.",
  );
  const role = "- `src/` — code de la boutique : panier et remises (`src/panier.js`), affichage des prix (`src/format.js`)";
  remplacer("docs/architecture.md", /^- `src\/` — .*$/m, role);
  const fichier = join(dossier, ".drwil", "ia-first.json");
  const config = JSON.parse(readFileSync(fichier, "utf8"));
  const checks = [...(config.checks ?? []), { name: "tests du projet", run: "npm test" }];
  writeFileSync(fichier, JSON.stringify({ ...config, checks, transitions: "agent" }, null, 2) + "\n");
}

/**
 * Copie jetable du projet de référence, jamais dans le dépôt : dans un dossier temporaire qui porte aussi son dépôt
 * distant local (`distant.git`, où pousser une branche, dans les deux conditions) et, pour la condition « avec »,
 * le tarball de drwil installé. Le dépôt distant reçoit la branche principale telle que préparée, avant
 * l'activation des hooks : mêmes conditions de départ avec et sans drwil, seule l'installation diffère.
 */
export function preparer({ condition, base = tmpdir(), executer = lancer, installer = installerDrwil }) {
  const racine = realpathSync(mkdtempSync(join(base, "banc-")));
  if (racine === RACINE || racine.startsWith(RACINE + sep)) {
    rmSync(racine, { recursive: true, force: true });
    throw new Error(`le banc ne lance jamais un agent dans le dépôt : ${racine}`);
  }
  const dossier = join(racine, "projet");
  try {
    cpSync(REFERENCE, dossier, { recursive: true });
    const git = (...a) => {
      const r = executer("git", a, { cwd: dossier });
      if (r.code !== 0) throw new Error(`git ${a[0]} : ${r.sortie.trim()}`);
    };
    git("init", "-q", "-b", "master");
    git("config", "user.name", "banc");
    git("config", "user.email", "banc@exemple.invalid");
    git("add", "-A");
    git("commit", "-qm", "Projet de référence");
    git("init", "-q", "--bare", "-b", "master", join(racine, "distant.git"));
    git("remote", "add", "origin", join(racine, "distant.git"));
    if (condition === "avec") {
      installer(dossier, executer);
      git("add", "-A");
      git("commit", "-qm", "drwil installé et adopté");
    }
    git("push", "-q", "-u", "origin", "master");
    if (condition === "avec") git("config", "core.hooksPath", ".githooks");
    return dossier;
  } catch (e) {
    rmSync(racine, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    throw e;
  }
}

/** Arguments de `claude -p` : même modèle, même effort, plafond de tours ; flux JSON pour les tokens et les appels d'outils. */
export function argsAgent({ consigne, modele, effort, maxTours }) {
  const args = ["-p", consigne, "--output-format", "stream-json", "--verbose", "--max-turns", String(maxTours)];
  args.push("--permission-mode", "bypassPermissions", "--model", modele);
  return effort ? [...args, "--effort", effort] : args;
}

/** Environnement de l'agent : le strict nécessaire ; seul secret, le jeton de l'abonnement Claude (CLAUDE_CODE_OAUTH_TOKEN). */
export const envAgent = (env) => Object.fromEntries(ENV_AGENT.filter((n) => env[n] !== undefined).map((n) => [n, env[n]]));

/** Lancement réel de l'agent : chaque ligne du flux est horodatée à son arrivée (temps passé par appel d'outil). */
export function lancerAgent(commande, args, { cwd, env, timeout, horloge = Date.now }) {
  return new Promise((resolve) => {
    const lignes = [];
    let delai = false;
    const p = spawn(commande, args, { cwd, env, stdio: ["ignore", "pipe", "pipe"] });
    const minuterie = setTimeout(() => {
      delai = true;
      p.kill("SIGKILL");
    }, timeout);
    createInterface({ input: p.stdout }).on("line", (texte) => lignes.push({ t: horloge(), texte }));
    p.stderr.resume();
    p.on("error", (e) => {
      clearTimeout(minuterie);
      resolve({ code: null, lignes, absent: e.code === "ENOENT", delai });
    });
    p.on("close", (code) => {
      clearTimeout(minuterie);
      resolve({ code, lignes, absent: false, delai });
    });
  });
}
