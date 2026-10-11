#!/usr/bin/env node
// La CLI telle que la reçoit un utilisateur (docs/projets/tester-tarball.md). Propre à ce dépôt : les
// tests du paquet exercent le code depuis le dépôt ; ici on construit le tarball (`npm pack`), on compare
// son contenu à la liste attendue, on l'installe dans un projet vierge, puis on lance la CLI installée :
// `drwil --version`, `drwil init` (CI GitHub, cas courant) et `drwil verify` dans un projet temporaire.
// L'installation tire `commander` du registre : sans réseau, « non exécuté », jamais vert (QUA-013).
// Usage : node outils/tester-tarball.mjs [racine]
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

/** Contenu attendu du paquet : chaque fichier livré correspond à un motif, chaque motif à un fichier au moins. */
export const ATTENDUS = [
  /^LICENSE$/,
  /^README\.md$/,
  /^package\.json$/,
  /^bin\/drwil\.js$/,
  /^dist\/[^/]+\.(js|d\.ts)(\.map)?$/,
  /^templates\/common\/.+$/,
  /^templates\/fr\/.+$/,
  /^templates\/en\/.+$/,
];

/** Écarts entre les fichiers du tarball et la liste attendue. */
export function comparerContenu(fichiers, attendus = ATTENDUS) {
  const problemes = fichiers.filter((f) => !attendus.some((m) => m.test(f))).map((f) => `fichier inattendu dans le paquet : ${f}`);
  for (const m of attendus) if (!fichiers.some((f) => m.test(f))) problemes.push(`aucun fichier du paquet ne correspond à ${m}`);
  return problemes;
}

const RESEAU = /E(NOTFOUND|AI_AGAIN|CONNREFUSED|CONNRESET|TIMEDOUT|NETUNREACH)|network|fetch failed/i;

/** Échec d'installation : registre injoignable (non exécuté) ou paquet cassé (échec). */
export function causeInstallation(sortie) {
  return RESEAU.test(sortie) ? "non-execute" : "echec";
}

/**
 * Lit la sortie de `drwil verify --json` dans un projet tout juste initialisé : rend un problème, ou null.
 * Un projet neuf a des contrats à attester (MANUAL, code 1) ; un FAIL ou un ERROR y signale un paquet cassé.
 */
export function lireVerdict(r) {
  let j;
  try {
    j = JSON.parse(r.stdout ?? "");
  } catch {
    return `drwil verify : sortie JSON illisible (code ${r.status}) ${(r.stderr ?? "").trim()}`;
  }
  const c = j.contracts ?? {};
  if (j.version !== 1 || j.exitCode !== r.status) return `drwil verify : pas de verdict (code ${r.status})`;
  if (!(c.total > 0)) return "drwil verify : aucun contrat lu dans le projet initialisé";
  const rates = (j.results ?? []).filter((x) => ["fail", "error"].includes(x.status)).map((x) => x.id);
  if (c.failed || c.error || j.errors?.length)
    return `drwil verify : ${j.status} sur un projet neuf — ${[...rates, ...(j.errors ?? [])].join(", ")}`;
  return null;
}

const lancerReel = (cmd, args, opts) =>
  // Sous Windows, npm et la CLI installée sont des scripts .cmd : ils ne se lancent que par le shell.
  spawnSync(cmd, args, { encoding: "utf8", shell: process.platform === "win32", timeout: 300_000, ...opts });

/**
 * Déroule les étapes dans `temp` ; rend { statut: "ok" | "echec" | "non-execute", message }.
 * `lancer(cmd, args, { cwd })` est injectable pour les tests.
 */
export function derouler({ paquet, temp, lancer = lancerReel }) {
  // Les premières lignes suffisent à la cause ; npm y ajoute pile d'appels et chemin de journal.
  const sortie = (r) => `${r.stdout ?? ""}${r.stderr ?? ""}`.trim().split("\n").slice(0, 4).join("\n");
  const echec = (message) => ({ statut: "echec", message });
  const [archives, installe, projet] = ["archives", "installe", "projet"].map((d) => join(temp, d));
  for (const d of [archives, installe, projet]) mkdirSync(d, { recursive: true });

  const pack = lancer("npm", ["pack", "--json", "--pack-destination", archives], { cwd: paquet });
  if (pack.error) return { statut: "non-execute", message: `npm introuvable (${pack.error.message})` };
  if (pack.status !== 0) return echec(`npm pack a échoué : ${sortie(pack)}`);
  let info;
  try {
    // Le script prepack (build) écrit aussi sur la sortie standard : le JSON commence au premier « [ ».
    info = JSON.parse(pack.stdout.slice(pack.stdout.indexOf("[")))[0];
  } catch {
    return echec("npm pack : sortie JSON illisible");
  }
  const problemes = comparerContenu(info.files.map((f) => f.path));
  if (problemes.length) return echec(problemes.join("\n  ✗ "));

  writeFileSync(join(installe, "package.json"), '{ "private": true }\n');
  const install = lancer("npm", ["install", "--no-audit", "--no-fund", join(archives, info.filename)], {
    cwd: installe,
  });
  if (install.status !== 0) {
    const statut = causeInstallation(sortie(install));
    return { statut, message: `installation du tarball impossible : ${sortie(install)}` };
  }

  const bin = join(installe, "node_modules", ".bin", process.platform === "win32" ? "drwil.cmd" : "drwil");
  if (!existsSync(bin)) return echec("la commande drwil n'est pas installée (champ bin du manifeste)");
  const version = lancer(bin, ["--version"], { cwd: projet });
  if (version.status !== 0 || version.stdout.trim() !== info.version)
    return echec(`drwil --version : « ${sortie(version)} », attendu ${info.version}`);

  const init = lancer(bin, ["init", "--name", "essai-tarball", "--ci", "github"], { cwd: projet });
  if (init.status !== 0) return echec(`drwil init a échoué (code ${init.status}) : ${sortie(init)}`);
  const probleme = lireVerdict(lancer(bin, ["verify", "--json"], { cwd: projet }));
  if (probleme) return echec(probleme);
  return {
    statut: "ok",
    message: `tarball ${info.filename} : ${info.files.length} fichier(s) attendus, installé, --version, init et verify OK`,
  };
}

/** Prépare un dossier temporaire, déroule, le supprime même en cas d'échec ; rend le code de sortie. */
export function principal(racine, lancer = lancerReel) {
  const paquet = join(racine, "packages", "drwil");
  if (!existsSync(join(paquet, "package.json"))) {
    console.error(`✗ tarball : paquet ${paquet} introuvable — contrôle non exécuté`);
    return 1;
  }
  const temp = mkdtempSync(join(tmpdir(), "drwil-tarball-"));
  let r;
  try {
    r = derouler({ paquet, temp, lancer });
  } finally {
    rmSync(temp, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
  if (r.statut === "ok") {
    console.log(r.message);
    return 0;
  }
  console.error(`✗ tarball : ${r.message}${r.statut === "non-execute" ? " — contrôle non exécuté" : ""}`);
  return 1;
}

// Chemins réels comparés : un dossier en lien symbolique ne doit pas faire passer le contrôle à vide.
if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = principal(process.argv[2] ?? process.cwd());
}
