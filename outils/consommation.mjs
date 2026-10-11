#!/usr/bin/env node
// Consommation de tokens par chantier, sans saisie (docs/projets/mesurer-consommation.md). Propre à ce
// dépôt pour l'instant. Source : les journaux de session de Claude Code
// (~/.claude/projects/<chemin du projet, caractères non alphanumériques en « - »>/*.jsonl), où chaque
// réponse de l'agent porte ses tokens, son modèle, son horodatage et la branche git du moment ; une
// branche `chantier/<fiche>` par chantier suffit à attribuer la consommation.
// Les journaux contiennent toute la conversation : seuls les champs de consommation sont lus, jamais un
// contenu de message n'est affiché ni écrit.
// Usage : node outils/consommation.mjs [--depuis AAAA-MM-JJ (UTC)] [--json] [--journaux <dossier>] [racine]
import { existsSync, readdirSync, readFileSync, realpathSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** Pause au-delà de laquelle le temps n'est plus compté comme actif (décision du 2026-10-11). */
export const PAUSE_MS = 15 * 60 * 1000;

/**
 * Poids indicatifs, en équivalent tokens d'entrée (rapports de prix publiés par Anthropic : sortie ×5,
 * cache lu ×0,1, cache écrit ×1,25 pour une durée de 5 minutes). Les tarifs changent : le total pondéré
 * n'est qu'un ordre de grandeur, les quatre catégories restent la mesure.
 */
export const POIDS = { entree: 1, sortie: 5, cacheLu: 0.1, cacheEcrit: 1.25 };

/** Dossier des journaux d'un projet : chemin absolu, caractères non alphanumériques remplacés par « - ». */
export function dossierJournaux(racine, env = process.env) {
  const base = env.CLAUDE_CONFIG_DIR ?? join(homedir(), ".claude");
  return join(base, "projects", resolve(racine).replace(/[^A-Za-z0-9]/g, "-"));
}

/**
 * Réponses de l'agent d'un texte de journal : [{ cle, horodatage, branche, modele, usage }].
 * Seuls ces champs sont extraits ; une ligne illisible est comptée, jamais devinée.
 */
export function lireJournal(texte) {
  const reponses = [];
  let illisibles = 0;
  for (const ligne of texte.split("\n")) {
    if (!ligne.trim()) continue;
    let j;
    try {
      j = JSON.parse(ligne);
    } catch {
      illisibles++;
      continue;
    }
    const usage = j?.message?.usage;
    // « <synthetic> » : message produit par l'outil lui-même (erreur, interruption), sans appel au modèle.
    if (j?.type !== "assistant" || !usage || !j.timestamp || j.message.model === "<synthetic>") continue;
    reponses.push({
      cle: j.requestId ?? j.message.id ?? j.uuid,
      horodatage: Date.parse(j.timestamp),
      branche: j.gitBranch || null,
      modele: j.message.model ?? "inconnu",
      usage: {
        entree: usage.input_tokens ?? 0,
        sortie: usage.output_tokens ?? 0,
        cacheLu: usage.cache_read_input_tokens ?? 0,
        cacheEcrit: usage.cache_creation_input_tokens ?? 0,
      },
    });
  }
  return { reponses, illisibles };
}

/** Groupe d'une branche : le chantier pour `chantier/<fiche>`, sinon la branche elle-même. */
export function groupe(branche) {
  if (!branche) return "(sans branche)";
  if (["master", "main"].includes(branche)) return "(branche principale : cadrages)";
  return branche.startsWith("chantier/") ? branche.slice("chantier/".length) : `(branche ${branche})`;
}

/** Temps actif : somme des écarts entre réponses successives, sans les pauses de plus de PAUSE_MS. */
export function dureeActive(horodatages) {
  const t = [...horodatages].sort((a, b) => a - b);
  let total = 0;
  for (let i = 1; i < t.length; i++) if (t[i] - t[i - 1] <= PAUSE_MS) total += t[i] - t[i - 1];
  return total;
}

/**
 * Agrège des réponses : une requête comptée une fois (un journal répète une réponse en plusieurs blocs,
 * chacun avec l'usage de la requête). Rend [{ groupe, requetes, entree, sortie, cacheLu, cacheEcrit,
 * pondere, modeles, dureeMin }], du plus pondéré au moins pondéré.
 */
export function agreger(reponses, { depuis = null } = {}) {
  const vues = new Set();
  const groupes = new Map();
  for (const r of reponses) {
    if (depuis !== null && r.horodatage < depuis) continue;
    if (vues.has(r.cle)) continue;
    vues.add(r.cle);
    const nom = groupe(r.branche);
    const g = groupes.get(nom) ?? { requetes: 0, entree: 0, sortie: 0, cacheLu: 0, cacheEcrit: 0, modeles: new Set(), t: [] };
    groupes.set(nom, g);
    g.requetes++;
    for (const k of Object.keys(POIDS)) g[k] += r.usage[k];
    g.modeles.add(r.modele);
    g.t.push(r.horodatage);
  }
  return [...groupes]
    .map(([nom, g]) => ({
      groupe: nom,
      requetes: g.requetes,
      entree: g.entree,
      sortie: g.sortie,
      cacheLu: g.cacheLu,
      cacheEcrit: g.cacheEcrit,
      pondere: Math.round(Object.entries(POIDS).reduce((s, [k, p]) => s + g[k] * p, 0)),
      modeles: [...g.modeles].sort(),
      dureeMin: Math.round(dureeActive(g.t) / 60000),
    }))
    .sort((a, b) => b.pondere - a.pondere || a.groupe.localeCompare(b.groupe));
}

const fichiersJsonl = (dossier) =>
  readdirSync(dossier).flatMap((nom) => {
    const chemin = join(dossier, nom);
    if (statSync(chemin).isDirectory()) return fichiersJsonl(chemin);
    return nom.endsWith(".jsonl") ? [chemin] : [];
  });

const lisible = (n) => (n >= 1e6 ? `${(n / 1e6).toFixed(1).replace(".", ",")} M` : n >= 1e3 ? `${Math.round(n / 1e3)} k` : String(n));

/** Tableau lisible du relevé. */
export function formater(lignes) {
  const entete = ["chantier", "requêtes", "entrée", "sortie", "cache lu", "cache écrit", "pondéré", "durée", "modèles"];
  const corps = lignes.map((l) => [
    l.groupe,
    String(l.requetes),
    lisible(l.entree),
    lisible(l.sortie),
    lisible(l.cacheLu),
    lisible(l.cacheEcrit),
    lisible(l.pondere),
    `${l.dureeMin} min`,
    l.modeles.join(", "),
  ]);
  const largeurs = entete.map((e, i) => Math.max(e.length, ...corps.map((c) => c[i].length)));
  const ligne = (c) =>
    c
      .map((v, i) => (i === 0 || i === c.length - 1 ? v.padEnd(largeurs[i]) : v.padStart(largeurs[i])))
      .join("  ")
      .trimEnd();
  return [
    ligne(entete),
    ...corps.map(ligne),
    "",
    "pondéré : indicatif, en équivalent tokens d'entrée (sortie ×5, cache lu ×0,1, cache écrit ×1,25).",
  ].join("\n");
}

/** Lit les arguments, les journaux, affiche ; rend le code de sortie. */
export function principal(args, env = process.env) {
  const opt = { json: false, depuis: null, journaux: null, racine: process.cwd() };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--json") opt.json = true;
    else if (args[i] === "--depuis") opt.depuis = Date.parse(args[++i]);
    else if (args[i] === "--journaux") opt.journaux = args[++i];
    else opt.racine = args[i];
  }
  if (Number.isNaN(opt.depuis)) {
    console.error("consommation : date de --depuis illisible (attendu AAAA-MM-JJ)");
    return 2;
  }
  const dossier = opt.journaux ?? dossierJournaux(opt.racine, env);
  // Sans journal, rien n'est mesuré : jamais « 0 token » (QUA-013).
  if (!existsSync(dossier)) {
    console.error(`consommation : aucun journal de session dans ${dossier} — non mesuré`);
    return 1;
  }
  const reponses = [];
  let illisibles = 0;
  for (const f of fichiersJsonl(dossier)) {
    const r = lireJournal(readFileSync(f, "utf8"));
    reponses.push(...r.reponses);
    illisibles += r.illisibles;
  }
  const lignes = agreger(reponses, { depuis: opt.depuis });
  if (!lignes.length) {
    console.error(`consommation : aucune réponse d'agent dans ${dossier} sur la période — non mesuré`);
    return 1;
  }
  console.log(opt.json ? JSON.stringify({ version: 1, illisibles, chantiers: lignes }, null, 2) : formater(lignes));
  if (illisibles && !opt.json) console.error(`consommation : ${illisibles} ligne(s) de journal illisible(s), ignorée(s)`);
  return 0;
}

// Chemins réels comparés : un dossier en lien symbolique ne doit pas faire passer le contrôle à vide.
if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = principal(process.argv.slice(2));
}
