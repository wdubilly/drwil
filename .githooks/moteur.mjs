// Moteur de contrôles unique (ADR-003 de docs/projets/drwil-v0-2-gouvernance-executable.md) :
// .githooks/run-checks.mjs (adaptateur git) et `drwil verify` l'utilisent tous les deux,
// aucun ne réimplémente un contrôle. Sans dépendance : les hooks restent autonomes.
//
// Chaque contrôle a un identifiant stable (cité par le champ **Contrôle** de
// docs/contrats.md) et rend un résultat parmi :
// - "ok" / "echec" ;
// - "non-execute" : il aurait dû tourner mais n'a pas pu (outil absent, reporté
//   au commit) — jamais un succès (QUA-013) ;
// - "non-applicable" : exclu par conception dans ce contexte (ex. QUA-017 en CI).
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { globEnRegex } from "./glob.mjs";
import { controlerPerimetre } from "./perimetre.mjs";

const TEXTES = {
  fr: {
    secrets: "secrets (gitleaks)",
    gitleaksAbsent: "gitleaks absent",
    pasDeGit: "pas de dépôt git",
    modeMinimal: "mode minimal",
    docs: "chemins et contrats cités dans la doc",
    perimetre: "périmètre de l'attente",
    branche: "branche principale (QUA-017)",
    brancheCi: "jamais en CI",
    brancheTags: "push de tags uniquement",
    brancheSansBranche: "push de tags ou de suppressions de branches uniquement",
    brancheProtegee: (b) => `travail direct sur la branche principale (${b}) : passer par une branche et une pull/merge request (voir docs/recettes/travailler-en-branche.md)`,
    testsControles: "tests des contrôles eux-mêmes",
    aucunTest: "tests propres au dépôt drwil, non livrés",
    couvertureCi: "couverture CI de chaque contrôle (QUA-013)",
    pasDeCi: "aucune CI configurée (ci: none) : pas de filet pour les contrôles dégradables",
    reporte: "aucun fichier indexé sous ses chemins : rejoué au push et en CI",
  },
  en: {
    secrets: "secrets (gitleaks)",
    gitleaksAbsent: "gitleaks not installed",
    pasDeGit: "not a git repository",
    modeMinimal: "minimal mode",
    docs: "paths and contracts cited in docs",
    perimetre: "expectation scope",
    branche: "main branch (QUA-017)",
    brancheCi: "never in CI",
    brancheTags: "tags-only push",
    brancheSansBranche: "push of tags or branch deletions only",
    brancheProtegee: (b) => `direct work on the main branch (${b}): go through a branch and a pull/merge request (see docs/recipes/working-with-branches.md)`,
    testsControles: "tests of the checks themselves",
    aucunTest: "tests owned by the drwil repository, not shipped",
    couvertureCi: "CI coverage of each check (QUA-013)",
    pasDeCi: "no CI configured (ci: none): no net for degradable checks",
    reporte: "no staged file under its paths: replayed on push and in CI",
  },
};

export function textes(lang) {
  return TEXTES[lang === "en" ? "en" : "fr"];
}

function trouverGitleaks() {
  for (const candidat of ["gitleaks", join(homedir(), ".local", "bin", "gitleaks")]) {
    if (!spawnSync(candidat, ["version"], { stdio: "ignore" }).error) return candidat;
  }
  return null;
}

/**
 * Contrôles du projet, dans l'ordre d'exécution des hooks : [{ id, nom, executer }].
 * `executer({ stdio, avantLancement })` rend { statut, detail?, message?, sortie? } (`message` :
 * explication d'un échec à afficher à la place du nom) ; `avantLancement`
 * est appelé juste avant de lancer réellement la commande (pas pour un contrôle sauté).
 * `indexes` (hook pre-commit seulement) : fichiers indexés, pour reporter un contrôle du
 * projet hors de ses `chemins` ; null partout ailleurs (rien n'est reporté).
 * `complet` : analyse le dépôt entier plutôt que les seuls fichiers indexés (CI, `drwil verify`).
 */
export function controles(root, { cfg = {}, env = process.env, indexes = null, complet = Boolean(env.CI) } = {}) {
  const T = textes(cfg.lang);
  const full = (cfg.mode ?? "full") === "full";
  const lancer = (cmd, args, { stdio = "inherit", avantLancement, ...opts } = {}, nom) => {
    avantLancement?.(nom);
    // NODE_TEST_CONTEXT se propage aux enfants : si le moteur tourne lui-même sous `node --test`
    // (le kit qui teste ses hooks, un harnais qui appelle verify…), un `node --test` lancé par un
    // contrôle serait silencieusement sauté (« called recursively ») et rendrait 0 : un faux PASS.
    const envControle = { ...(opts.env ?? env), NODE_TEST_CONTEXT: undefined };
    const r = spawnSync(cmd, args, { cwd: root, stdio, encoding: "utf8", ...opts, env: envControle });
    const sortie = stdio === "pipe" ? `${r.stdout ?? ""}${r.stderr ?? ""}` : undefined;
    // Une commande qui ne peut même pas se lancer est un échec, comme avant l'extraction du moteur.
    if (r.error) return { statut: "echec", detail: r.error.message, sortie };
    return { statut: r.status === 0 ? "ok" : "echec", sortie };
  };
  const liste = [];
  const ajouter = (id, nom, executer) => liste.push({ id, nom, executer: (o = {}) => executer(o, nom) });

  ajouter("secrets-fichiers", T.secrets, (o, nom) => {
    if (!full) return { statut: "non-applicable", detail: T.modeMinimal };
    const gitleaks = trouverGitleaks();
    if (!gitleaks) return { statut: "non-execute", detail: T.gitleaksAbsent };
    if (spawnSync("git", ["rev-parse", "--git-dir"], { cwd: root, stdio: "ignore" }).status !== 0) return { statut: "non-execute", detail: T.pasDeGit };
    // En CI (ou pour `drwil verify`) il n'y a rien d'indexé à juger : on analyse tout l'historique,
    // sinon une preuve de « pas de secret dans le dépôt » ne regarderait rien.
    const args = complet ? ["git", "--no-banner", "--redact", "."] : ["git", "--pre-commit", "--staged", "--no-banner", "--redact", "."];
    return lancer(gitleaks, args, o, nom);
  });

  ajouter("docs-references", T.docs, (o, nom) => lancer(process.execPath, [".githooks/check-docs.mjs"], o, nom));

  // Barrière de périmètre de l'attente (.githooks/perimetre.mjs) : au commit, l'état local ;
  // ailleurs (push, CI, verify), rejeu de chaque commit de la branche via son trailer.
  ajouter("perimetre-attente", T.perimetre, (o, nom) => {
    o.avantLancement?.(nom);
    const r = controlerPerimetre(root, { cfg, indexes, env });
    const sortie = r.problemes.map((p) => `  ${r.statut === "echec" ? "✗" : "⚠"} ${p}`).join("\n");
    if (sortie && o.stdio !== "pipe") console.log(sortie);
    return { statut: r.statut, message: r.message, detail: r.detail, sortie };
  });

  // QUA-017 : jamais de travail direct sur la branche principale, y compris le tout premier commit
  // (plus d'exception de bootstrap : `init()` crée systématiquement une branche de travail avant tout
  // commit, voir docs/projets/init-cree-une-branche.md). `symbolic-ref` (contrairement à
  // `rev-parse --abbrev-ref HEAD`) fonctionne même avant le premier commit (HEAD non encore créé).
  // Jamais en CI (env.CI) : la CI tourne aussi sur master après un merge légitime,
  // qu'il ne faut pas bloquer rétroactivement — seuls les hooks locaux (pre-commit/pre-push) l'appliquent.
  // Jamais non plus sur un push qui ne pousse que des tags (DRWIL_PUSH_TAGS_ONLY, positionné par
  // .githooks/pre-push d'après l'entrée standard du hook) : un tag ne modifie jamais une branche ;
  // ni une suppression de branche distante (DRWIL_PUSH_SANS_BRANCHE).
  ajouter("branche-principale", T.branche, () => {
    if (env.CI) return { statut: "non-applicable", detail: T.brancheCi };
    if (env.DRWIL_PUSH_TAGS_ONLY === "1") return { statut: "non-applicable", detail: T.brancheTags };
    if (env.DRWIL_PUSH_SANS_BRANCHE === "1") return { statut: "non-applicable", detail: T.brancheSansBranche };
    const branche = spawnSync("git", ["symbolic-ref", "--short", "HEAD"], { cwd: root, encoding: "utf8" });
    const nomBranche = branche.status === 0 ? branche.stdout.trim() : null;
    if (nomBranche && ["master", "main"].includes(nomBranche)) return { statut: "echec", message: T.brancheProtegee(nomBranche) };
    return { statut: "ok" };
  });

  ajouter("controles-autotest", T.testsControles, (o, nom) => {
    if (!full) return { statut: "non-applicable", detail: T.modeMinimal };
    const dossier = join(root, ".githooks");
    const tests = existsSync(dossier) ? readdirSync(dossier).filter((f) => f.endsWith(".test.mjs")) : [];
    // Ces tests éprouvent le code de drwil : ils restent dans son dépôt et ne ralentissent pas le
    // commit d'un projet équipé, qui ne les reçoit pas.
    if (!tests.length) return { statut: "non-applicable", detail: T.aucunTest };
    return lancer(process.execPath, ["--test", ...tests.map((f) => join(".githooks", f))], o, nom);
  });

  ajouter("couverture-ci", T.couvertureCi, (o, nom) => {
    if (!full) return { statut: "non-applicable", detail: T.modeMinimal };
    const ciFiles = Array.isArray(cfg.ciFiles) ? cfg.ciFiles : [];
    if (!ciFiles.length) return { statut: "non-execute", detail: T.pasDeCi };
    return lancer(process.execPath, [".githooks/check-control-coverage.mjs"], o, nom);
  });

  // Les contrôles propres à la stack (lint, typecheck, tests) sont déclarés par le projet, pas par le kit.
  // Au pre-commit seulement (`indexes` fourni), un contrôle qui déclare `chemins` est reporté si aucun
  // fichier indexé n'y correspond : un commit de doc ne relance pas toute la suite de tests. Il reste
  // « non exécuté » (QUA-013) et le pre-push comme la CI le rejouent toujours.
  for (const c of Array.isArray(cfg.checks) ? cfg.checks : []) {
    const nom = c.name ?? c.run;
    liste.push({
      id: c.id ?? `projet:${nom}`,
      nom,
      executer: (o = {}) => {
        if (indexes && Array.isArray(c.chemins) && c.chemins.length) {
          const motifs = c.chemins.map(globEnRegex);
          if (!indexes.some((f) => motifs.some((m) => m.test(f)))) return { statut: "non-execute", detail: T.reporte };
        }
        return lancer(c.run, [], { ...o, shell: true, cwd: c.cwd ? join(root, c.cwd) : root }, nom);
      },
    });
  }
  return liste;
}
