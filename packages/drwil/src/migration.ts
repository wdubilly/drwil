import { existsSync, readFileSync, readdirSync } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { purgerDossiersVides, sha256 } from "./manifeste.js";
import {
  ACTIVITES,
  ANCIENS_DU_KIT,
  BLOC,
  CHAMPS_ETAT,
  CHAMPS_USAGE,
  CLES_CONFIG,
  CLES_CONFIG_IMBRIQUEES,
  DEPLACES,
  DOSSIER_FICHES,
  HOOKS,
  MECANIQUE,
  SOUS_COMMANDES,
  VALEURS_CONFIG,
} from "./migration-table.js";

/** Ce que la migration fait (ou ferait, en simulation) d'un projet équipé à l'ancien format. */
export interface PlanMigration {
  /** Contenu du projet déplacé vers son nom anglais. */
  deplaces: { de: string; vers: string }[];
  /** Fichiers du kit inchangés depuis l'installation : supprimés, l'installation les réécrit. */
  supprimes: string[];
  /** Anciens fichiers du kit modifiés depuis l'installation : gardés, à reprendre à la main. */
  gardes: string[];
  /** Déplacements impossibles : la cible existe déjà et a été modifiée. Rien n'est touché. */
  conflits: { de: string; vers: string }[];
  /** Fichiers dont le contenu change (références, bloc, config, état, journal de consommation). */
  reecrits: string[];
}

const IGNORES = new Set([".git", "node_modules", "dist", "build", "coverage", ".venv", "venv", "vendor", "target"]);
const EXTENSIONS_TEXTE = [".md", ".mdc", ".json", ".yml", ".yaml", ".toml"];
// Scripts de la mécanique (hooks .mjs, hooks git sans extension) : un autre fichier sous
// `.githooks/` (cache Python, binaire) n'est jamais lu comme du texte.
const SCRIPT_RE = /(\.m?js|\.cjs|\.sh|\/[^./]+)$/;
// Lus et réécrits à part, champ par champ : jamais par simple remplacement de texte.
const A_PART = new Set([
  ".drwil/ia-first.json",
  ".drwil/state.json",
  ".drwil/usage.jsonl",
  ".drwil/fichiers-installes.json",
  ".drwil/installed-files.json",
]);

function fichiers(racine: string, rel = ""): string[] {
  const dossier = join(racine, rel);
  if (!existsSync(dossier)) return [];
  const sortie: string[] = [];
  for (const e of readdirSync(dossier, { withFileTypes: true })) {
    const chemin = rel ? `${rel}/${e.name}` : e.name;
    if (e.isDirectory()) {
      if (!IGNORES.has(e.name) && chemin !== ".drwil/evidence") sortie.push(...fichiers(racine, chemin));
    } else if (e.isFile()) sortie.push(chemin);
  }
  return sortie;
}

const lire = (racine: string, rel: string) => readFileSync(join(racine, rel), "utf8");

function lireJson(racine: string, rel: string): Record<string, unknown> | null {
  try {
    return JSON.parse(lire(racine, rel));
  } catch {
    return null;
  }
}

/** Paires ancien → nouveau des références, la plus longue d'abord : `docs/projets/en-attente.md`
 * doit l'emporter sur `docs/projets/`. */
function paires(): [string, string][] {
  const p: Record<string, string> = {
    ...DEPLACES,
    ...ANCIENS_DU_KIT,
    [DOSSIER_FICHES[0]]: DOSSIER_FICHES[1],
    // Valeurs de `dirs` dans la config, sans barre finale.
    "docs/projets": "docs/projects",
    "docs/recettes": "docs/recipes",
    // Motif de .gitleaks.toml, point échappé.
    "fichiers-installes\\.json": "installed-files\\.json",
  };
  for (const [ancien, nouveau] of Object.entries(ANCIENS_DU_KIT)) {
    if (ancien.startsWith(".claude/skills/")) p[`${dirname(ancien)}/`] = `${dirname(nouveau)}/`;
  }
  for (const [ancien, nouveau] of Object.entries(HOOKS)) {
    // Imports entre hooks (`./etat.mjs`) et appels depuis un script (`$(dirname "$0")/perimetre.mjs`).
    p[`/${basename(ancien)}`] = `/${basename(nouveau)}`;
  }
  return Object.entries(p).sort((a, b) => b[0].length - a[0].length);
}

function remplaceur(): (texte: string) => string {
  const liste = paires();
  const table = new Map(liste);
  const echappe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(liste.map(([a]) => echappe(a)).join("|"), "g");
  const sousCommande = new RegExp(`(state\\.mjs(?:\\\\")?) (${Object.keys(SOUS_COMMANDES).join("|")})\\b`, "g");
  // Une seule passe par table : un nom déjà remplacé ne l'est jamais une seconde fois. Les
  // sous-commandes suivent le nom du script, déjà anglais (y compris échappé dans un JSON : `\"`).
  return (texte) =>
    texte
      .replace(re, (m) => table.get(m) ?? m)
      .replace(sousCommande, (_m, script: string, sc: string) => `${script} ${SOUS_COMMANDES[sc]}`);
}

/** Bloc de périmètre et section des lots d'une fiche ou d'une intention. */
function migrerFiche(texte: string, estFiche: boolean): string {
  // Le bloc ouvre une ligne : un `<!-- cadrage` cité dans la prose n'est pas un bloc.
  let t = texte.replace(/^<!--\s*cadrage[ \t]*\r?\n([\s\S]*?)-->/gm, (_m, corps: string) => {
    return `${BLOC.nouveau}\n${corps.replace(new RegExp(`^(\\s*)${BLOC.cleAncienne}`, "m"), `$1${BLOC.cleNouvelle}`)}-->`;
  });
  if (estFiche) t = t.replace(/^(#{1,4}\s*\d*\.?\s*)Lots\b/gm, "$1Increments");
  return t;
}

function valeur(v: unknown, remplacer: (t: string) => string): unknown {
  if (typeof v === "string") return VALEURS_CONFIG[v] ?? remplacer(v);
  if (Array.isArray(v)) return v.map((x) => valeur(x, remplacer));
  return v;
}

function renommerCles(objet: Record<string, unknown>, cles: Record<string, string>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(objet).map(([k, v]) => [cles[k] ?? k, v]));
}

function migrerConfig(config: Record<string, unknown>, remplacer: (t: string) => string): Record<string, unknown> {
  const sortie = renommerCles(config, CLES_CONFIG);
  for (const [cle, sousCles] of Object.entries(CLES_CONFIG_IMBRIQUEES)) {
    const v = sortie[cle];
    if (Array.isArray(v))
      sortie[cle] = v.map((x) => (x && typeof x === "object" ? renommerCles(x as Record<string, unknown>, sousCles) : x));
    else if (v && typeof v === "object") sortie[cle] = renommerCles(v as Record<string, unknown>, sousCles);
  }
  for (const cle of ["scopeGate", "scopeReminder", "newRequirements", "transitions"]) sortie[cle] = valeur(sortie[cle], remplacer);
  for (const cle of ["dirs", "risk"]) {
    const v = sortie[cle];
    if (v && typeof v === "object") sortie[cle] = Object.fromEntries(Object.entries(v).map(([k, x]) => [k, valeur(x, remplacer)]));
  }
  if (Array.isArray(sortie.outOfScope)) sortie.outOfScope = valeur(sortie.outOfScope, remplacer);
  if (Array.isArray(sortie.checks)) {
    sortie.checks = sortie.checks.map((c) =>
      c && typeof c === "object" && "paths" in c ? { ...c, paths: valeur(c.paths, remplacer) } : c,
    );
  }
  for (const cle of Object.keys(sortie)) if (sortie[cle] === undefined) delete sortie[cle];
  return sortie;
}

function migrerEtat(etat: Record<string, unknown>, remplacer: (t: string) => string): Record<string, unknown> {
  const sortie = renommerCles(etat, CHAMPS_ETAT);
  if (typeof sortie.activity === "string") sortie.activity = ACTIVITES[sortie.activity] ?? sortie.activity;
  if (typeof sortie.active_brief === "string") sortie.active_brief = remplacer(sortie.active_brief);
  return sortie;
}

function migrerUsage(texte: string): string {
  return texte
    .split("\n")
    .map((ligne) => {
      try {
        const e = JSON.parse(ligne);
        const aRenommer = e && typeof e === "object" && !Array.isArray(e) && Object.keys(e).some((k) => k in CHAMPS_USAGE);
        return aRenommer ? JSON.stringify(renommerCles(e, CHAMPS_USAGE)) : ligne;
      } catch {
        return ligne; // ligne vide ou illisible : gardée telle quelle, jamais perdue.
      }
    })
    .join("\n");
}

const json = (v: unknown) => JSON.stringify(v, null, 2) + "\n";

/** Réécrit un JSON seulement si son contenu change : sa mise en forme seule ne compte pas. */
function reecrireJson(
  racine: string,
  rel: string,
  migrerObjet: (o: Record<string, unknown>) => Record<string, unknown>,
  plan: PlanMigration,
  ecritures: Map<string, string>,
): void {
  const objet = lireJson(racine, rel);
  if (!objet) return;
  const migre = migrerObjet(objet);
  if (JSON.stringify(migre) === JSON.stringify(objet)) return;
  ecritures.set(rel, json(migre));
  plan.reecrits.push(rel);
}

/**
 * Migre en une fois un projet équipé par une version française du kit (sans alias, décision du
 * 2026-10-12) ; idempotente : sur un projet déjà migré, rien à faire. Le contenu du projet
 * (fiches, contrats, journal) n'est jamais supprimé ; un fichier du kit modifié à la main non plus.
 */
export async function migrer(racine: string, { simulation = false } = {}): Promise<PlanMigration> {
  const plan: PlanMigration = { deplaces: [], supprimes: [], gardes: [], conflits: [], reecrits: [] };
  const cheminManifeste = [".drwil/installed-files.json", ".drwil/fichiers-installes.json"].find((f) => existsSync(join(racine, f)));
  const manifeste = (cheminManifeste && (lireJson(racine, cheminManifeste) as Record<string, string>)) || {};
  const inchange = (rel: string) => existsSync(join(racine, rel)) && manifeste[rel] === sha256(lire(racine, rel));
  const remplacer = remplaceur();

  const tous = fichiers(racine);
  const versDe = (rel: string) => DEPLACES[rel] ?? rel.replace(DOSSIER_FICHES[0], DOSSIER_FICHES[1]);
  const aDeplacer = tous.filter((f) => f.startsWith(DOSSIER_FICHES[0]) || DEPLACES[f]);
  const retraits = new Set<string>();
  const ecritures = new Map<string, string>();
  for (const de of aDeplacer) {
    const vers = versDe(de);
    if (existsSync(join(racine, vers)) && !inchange(vers) && lire(racine, vers) !== lire(racine, de)) {
      plan.conflits.push({ de, vers });
      continue;
    }
    plan.deplaces.push({ de, vers });
    retraits.add(de);
    ecritures.set(vers, lire(racine, de));
  }
  for (const ancien of Object.keys(ANCIENS_DU_KIT)) {
    if (!existsSync(join(racine, ancien))) continue;
    if (inchange(ancien)) {
      plan.supprimes.push(ancien);
      retraits.add(ancien);
    } else plan.gardes.push(ancien);
  }

  // Contenu final de chaque fichier texte, à son emplacement final.
  const restants = tous.filter((f) => !retraits.has(f) || ecritures.has(versDe(f)));
  for (const f of restants) {
    const ici = retraits.has(f) ? versDe(f) : f;
    if (A_PART.has(ici) || A_PART.has(f)) continue;
    const texte = ecritures.get(ici) ?? lire(racine, f);
    const estTexte =
      EXTENSIONS_TEXTE.some((e) => f.endsWith(e)) ||
      basename(f) === ".gitignore" ||
      (MECANIQUE.some((m) => f.startsWith(m)) && SCRIPT_RE.test(f));
    if (!estTexte) continue;
    let nouveau = remplacer(texte);
    if (ici.startsWith(DOSSIER_FICHES[1]) || ici.startsWith("docs/intentions/"))
      nouveau = migrerFiche(nouveau, ici.startsWith(DOSSIER_FICHES[1]));
    if (nouveau !== texte) {
      ecritures.set(ici, nouveau);
      plan.reecrits.push(ici);
    }
  }

  reecrireJson(racine, ".drwil/ia-first.json", (o) => migrerConfig(o, remplacer), plan, ecritures);
  reecrireJson(racine, ".drwil/state.json", (o) => migrerEtat(o, remplacer), plan, ecritures);
  if (existsSync(join(racine, ".drwil/usage.jsonl"))) {
    const avant = lire(racine, ".drwil/usage.jsonl");
    const apres = migrerUsage(avant);
    if (apres !== avant) {
      ecritures.set(".drwil/usage.jsonl", apres);
      plan.reecrits.push(".drwil/usage.jsonl");
    }
  }

  // Un conflit ou un fichier gardé reste signalé à chaque passage, sans relancer la migration.
  const aMigrer = plan.deplaces.length + plan.supprimes.length + plan.reecrits.length > 0;
  if (aMigrer) {
    // La mécanique inchangée appelle les hooks sous leurs anciens noms : retirée pour être réécrite à neuf.
    for (const rel of Object.keys(manifeste)) {
      if (retraits.has(rel) || !MECANIQUE.some((m) => rel.startsWith(m)) || !inchange(rel)) continue;
      plan.supprimes.push(rel);
      retraits.add(rel);
      if (ecritures.delete(rel)) plan.reecrits = plan.reecrits.filter((r) => r !== rel);
    }
  }
  if (cheminManifeste && aMigrer) {
    const nouveau: Record<string, string> = {};
    for (const [rel, h] of Object.entries(manifeste)) if (!retraits.has(rel)) nouveau[rel] = h;
    // Un fichier déplacé garde l'empreinte de son installation, même s'il remplace une cible du kit.
    for (const { de } of plan.deplaces) if (manifeste[de]) nouveau[versDe(de)] = manifeste[de];
    for (const rel of plan.supprimes) delete nouveau[rel];
    ecritures.set(".drwil/installed-files.json", json(nouveau));
    if (cheminManifeste !== ".drwil/installed-files.json") retraits.add(cheminManifeste);
  }

  if (simulation) return plan;
  for (const [rel, contenu] of ecritures) {
    await mkdir(dirname(join(racine, rel)), { recursive: true });
    await writeFile(join(racine, rel), contenu);
  }
  const aRetirer = [...retraits].filter((r) => !ecritures.has(r));
  for (const rel of aRetirer) await rm(join(racine, rel), { force: true });
  await purgerDossiersVides(racine, aRetirer);
  return plan;
}

/** Résumé d'une migration de l'ancien format (vide si rien à migrer), partagé avec l'aperçu d'`apply`. */
export function formaterMigration(p: PlanMigration, simulation = false): string[] {
  const l: string[] = [];
  const titre = (t: string, n: number) => l.push(`${t} (${n}) :`);
  if (p.deplaces.length) titre(simulation ? "Serait déplacé vers son nom anglais" : "Déplacé vers son nom anglais", p.deplaces.length);
  for (const d of p.deplaces) l.push(`  ${d.de} → ${d.vers}`);
  if (p.supprimes.length)
    titre(simulation ? "Ancien fichier du kit, inchangé, serait retiré" : "Ancien fichier du kit, inchangé, retiré", p.supprimes.length);
  for (const s of p.supprimes) l.push(`  - ${s}`);
  if (p.reecrits.length) titre(simulation ? "Serait réécrit aux noms anglais" : "Réécrit aux noms anglais", p.reecrits.length);
  for (const r of p.reecrits) l.push(`  ~ ${r}`);
  if (p.gardes.length) titre("⚠ Ancien fichier du kit modifié à la main, gardé : à reprendre", p.gardes.length);
  for (const g of p.gardes) l.push(`  ! ${g}`);
  if (p.conflits.length) titre("⚠ Déplacement impossible, la cible existe et a été modifiée : rien touché", p.conflits.length);
  for (const c of p.conflits) l.push(`  ! ${c.de} → ${c.vers}`);
  if (l.length) l.unshift(simulation ? "Migration de l'ancien format (simulation, rien d'écrit) :" : "Migration de l'ancien format :");
  return l;
}
