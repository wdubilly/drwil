#!/usr/bin/env node
// Outil propre au dépôt drwil, jamais livré (QUA-018, QUA-299) : par contrat qui déclare `**Couvre**`, ses
// fichiers couverts, ses attestations archivées et le nombre de commits qui ont changé chaque fichier couvert.
// Il désigne les `**Couvre**` trop larges, qui font retomber une attestation (QUA-081) pour un fichier carrefour
// sans rapport avec ce qu'elle juge. Lecture seule : il n'écrit rien, ni fichier ni état git.
// Les motifs passent à git en pathspec `:(glob)` : le même sens de `**` et `*` que les motifs du registre.
// Usage : node outils/inventaire-attestations.mjs [--depuis AAAA-MM-JJ] [--json] [racine]
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, realpathSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { readContracts } from "../.githooks/contracts.mjs";

export const REGISTRE = "docs/contracts.md";
export const ARCHIVE = ".drwil/evidence/attestations";

function git(racine, args) {
  const r = spawnSync("git", args, { cwd: racine, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0) throw new Error(`git ${args[0]} : ${(r.stderr || r.error?.message || "").trim()}`);
  return r.stdout;
}

/** Fichiers suivis par git sous `motif`, triés. */
export function fichiersDuMotif(racine, motif) {
  return git(racine, ["ls-files", "-z", "--", `:(glob)${motif}`])
    .split("\0")
    .filter(Boolean)
    .sort();
}

/** Nombre de commits (fusions exclues) qui ont changé l'un de `fichiers`, depuis `depuis` si donné. */
export function commitsSur(racine, fichiers, depuis) {
  if (!fichiers.length) return 0;
  const args = ["log", "--no-merges", "--format=%H"];
  if (depuis) args.push(`--since=${depuis}T00:00:00`);
  return git(racine, [...args, "--", ...fichiers])
    .split("\n")
    .filter(Boolean).length;
}

/** Nombre d'attestations archivées de `id` (fichiers `<id>-<horodatage>.json`). */
export function attestationsArchivees(racine, id) {
  const dossier = join(racine, ARCHIVE);
  if (!existsSync(dossier)) return 0;
  const re = new RegExp(`^${id}-\\d{4}-.*\\.json$`);
  return readdirSync(dossier).filter((f) => re.test(f)).length;
}

/**
 * Inventaire : [{ id, titre, couvre, attestations, commits, fichiers: [{ chemin, commits }], motifsVides }].
 * Seuls les contrats qui déclarent `**Couvre**` avec au moins un motif (ni `aucun`, ni retirés) y figurent.
 * `commits` : commits qui ont changé au moins un fichier couvert (un commit qui en change deux compte une fois).
 */
export function inventaire(racine, { depuis = null } = {}) {
  const registre = join(racine, REGISTRE);
  if (!existsSync(registre)) throw new Error(`registre introuvable : ${REGISTRE}`);
  const contrats = readContracts(readFileSync(registre, "utf8")).filter((c) => !c.retired && c.covers?.length && c.covers[0] !== "aucun");
  return contrats.map((c) => {
    const motifsVides = [];
    const tous = new Set();
    for (const motif of c.covers) {
      const trouves = fichiersDuMotif(racine, motif);
      if (!trouves.length) motifsVides.push(motif);
      for (const f of trouves) tous.add(f);
    }
    const fichiers = [...tous].sort().map((chemin) => ({ chemin, commits: commitsSur(racine, [chemin], depuis) }));
    return {
      id: c.id,
      titre: c.title,
      couvre: c.covers,
      attestations: attestationsArchivees(racine, c.id),
      commits: commitsSur(racine, [...tous], depuis),
      fichiers,
      motifsVides,
    };
  });
}

/** Rendu texte de l'inventaire. */
export function rendu(lignes, depuis) {
  const sortie = [
    `Inventaire des attestations : ${lignes.length} contrat(s) déclarent **Couvre** ; commits ${depuis ? `depuis le ${depuis}` : "depuis le début de l'historique"} (fusions exclues).`,
  ];
  for (const l of lignes) {
    sortie.push("", `${l.id} — ${l.titre}`);
    sortie.push(`  ${l.attestations} attestation(s) archivée(s) ; ${l.commits} commit(s) sur l'ensemble des fichiers couverts`);
    for (const f of l.fichiers) sortie.push(`  ${String(f.commits).padStart(4)}  ${f.chemin}`);
    for (const m of l.motifsVides) sortie.push(`     —  ${m} (aucun fichier suivi)`);
  }
  return sortie.join("\n");
}

/** Lit les arguments : { depuis, json, racine } ou { erreur }. */
export function lireArguments(argv) {
  const opts = { depuis: null, json: false, racine: process.cwd() };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--json") opts.json = true;
    else if (a === "--depuis") {
      const v = argv[++i];
      if (!/^\d{4}-\d{2}-\d{2}$/.test(v ?? "") || Number.isNaN(Date.parse(v)))
        return { erreur: `date attendue AAAA-MM-JJ après --depuis, reçu : ${v ?? "rien"}` };
      opts.depuis = v;
    } else if (a.startsWith("--")) return { erreur: `option inconnue : ${a}` };
    else opts.racine = a;
  }
  return opts;
}

function main(argv) {
  const opts = lireArguments(argv);
  if (opts.erreur) {
    console.error(
      `inventaire-attestations : ${opts.erreur}\nUsage : node outils/inventaire-attestations.mjs [--depuis AAAA-MM-JJ] [--json] [racine]`,
    );
    return 2;
  }
  try {
    const lignes = inventaire(opts.racine, opts);
    console.log(opts.json ? JSON.stringify({ depuis: opts.depuis, contrats: lignes }, null, 2) : rendu(lignes, opts.depuis));
    return 0;
  } catch (e) {
    console.error(`inventaire-attestations : ${e.message}`);
    return 1;
  }
}

if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  process.exitCode = main(process.argv.slice(2));
}
