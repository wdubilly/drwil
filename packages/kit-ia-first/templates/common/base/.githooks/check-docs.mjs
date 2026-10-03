#!/usr/bin/env node
// Contrôle IA-first : chemins et contrats cités dans la doc.
// Lit .drwil/ia-first.json pour s'adapter aux couches, aux préfixes de contrats et à la langue.
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { execFileSync } from "node:child_process";
import * as cadrage from "./cadrage.mjs";

const root = process.cwd();
const cfg = loadConfig();
const lang = cfg.lang === "en" ? "en" : "fr";
const T = {
  fr: {
    chemin: (c) => `chemin cité introuvable \`${c}\``,
    contrat: (id, f) => `contrat ${id} absent de ${f}`,
    doublon: (id, f) => `${f} : contrat ${id} défini plusieurs fois`,
    marqueur: () => `case ouverte sans marqueur [IA], [humain] ou [décision]`,
    statut: (f) => `${f} : pas de ligne « Statut » datée (AAAA-MM-JJ) en tête`,
    reprise: (f) => `${f} : section « Reprise » absente (passation)`,
    section: (f, s) => `${f} : section « ${s} » absente`,
    horsFiche: (c) => `\`${c}\` : fichier de code hors de toute fiche de docs/projets/ (bloc cadrage)`,
    cadrageEntete: (f) => `${f} : bloc cadrage sans ligne « fichiers: »`,
    cadrageLigne: (f, l) => `${f} : ligne de cadrage non comprise « ${l} »`,
    cadrageLarge: (f, m) => `${f} : motif de cadrage trop large « ${m} »`,
    bilan: (n, e) => `check-docs : ${n} fichiers scannés, ${e} erreur(s)`,
  },
  en: {
    chemin: (c) => `cited path not found \`${c}\``,
    contrat: (id, f) => `contract ${id} missing from ${f}`,
    doublon: (id, f) => `${f}: contract ${id} defined more than once`,
    marqueur: () => `open item without an [AI], [human] or [decision] marker`,
    statut: (f) => `${f}: no dated « Status » line (YYYY-MM-DD) at the top`,
    reprise: (f) => `${f}: missing « Hand-off » section`,
    section: (f, s) => `${f}: missing « ${s} » section`,
    horsFiche: (c) => `\`${c}\`: code file outside any docs/projets/ fiche (cadrage block)`,
    cadrageEntete: (f) => `${f}: cadrage block without a « fichiers: » line`,
    cadrageLigne: (f, l) => `${f}: cadrage line not understood « ${l} »`,
    cadrageLarge: (f, m) => `${f}: cadrage pattern too broad « ${m} »`,
    bilan: (n, e) => `check-docs: ${n} files scanned, ${e} error(s)`,
  },
}[lang];

const CODE_RE = /`([^`\s]+)`/g;
const EXT_RE = /\.(md|mdc|mjs|cjs|js|ts|tsx|jsx|py|sh|json|ya?ml|toml|txt)$/;
// Une ligne qui déclare le fichier facultatif ne doit pas faire échouer le contrôle.
const OPTIONNEL_RE = /si présent|if present/i;
// Un chemin prévu mais pas encore créé, marqué juste après la citation, n'est pas une erreur.
const CREER_RE = /^\s*\(à créer\)|^\s*\(to create\)/i;
const MARQUEURS_RE = /\[(IA|humain|décision|AI|human|decision)\]/i;
const STATUT_RE = /^\*{0,2}(Statut|Status)\*{0,2}\s?:/;
const DATE_RE = /\b\d{4}-\d{2}-\d{2}\b/;
const SECTIONS_INTENTION_FR = ["## Besoin", "## Existant", "## Questions à trancher"];
const SECTIONS_INTENTION_EN = ["## Need", "## Current state", "## Open questions"];
// Modèles à copier et fiche permanente : pas des chantiers à lots, exemptés du contrôle QUA-015.
const EXEMPTS_RE = /^modele-|^model-|^entretien-courant\.md$/;
// Modèles à copier : jamais une vraie source de cadrage (leur bloc, s'il y en a un, n'est qu'un exemple).
const MODELE_RE = /^modele-|^model-/;

function loadConfig() {
  try {
    return JSON.parse(readFileSync(join(root, ".drwil", "ia-first.json"), "utf8"));
  } catch {
    return {};
  }
}

function mdRecursif(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    if (e.isDirectory()) return mdRecursif(p);
    return e.name.endsWith(".md") ? [p] : [];
  }).sort();
}

function sources() {
  const found = ["AGENTS.md", "CLAUDE.md", "GEMINI.md", "README.md", "INSTALL.md"].map((f) => join(root, f));
  for (const layer of cfg.layers ?? []) found.push(join(root, layer, "AGENTS.md"));
  found.push(...mdRecursif(join(root, "docs")));
  found.push(...mdRecursif(join(root, ".claude", "skills")));
  return [...new Set(found)].filter((p) => existsSync(p));
}

// Préfixes connus (racine + couches du projet) : une citation hors de ces préfixes et sans
// extension reconnue n'est pas prise pour un chemin (ex. une alternative « minimal/complet »).
const PREFIXES_RACINE = [
  "docs/", ".githooks/", ".claude/", ".github/", ".cursor/", ".drwil/", "scripts/",
  "AGENTS.md", "README.md", "INSTALL.md", "CLAUDE.md", "GEMINI.md",
  ".gitlab-ci.yml", ".gitignore", ".env.example", "docker-compose.yml",
];
const prefixesConnus = [...PREFIXES_RACINE, ...(cfg.layers ?? []).map((l) => `${l}/`), ...(cfg.layerPrefixes ?? []).map((p) => `${p}/`)];

function ressembleAUnChemin(s) {
  if (/^(https?:\/\/|-|\$)/.test(s) || /[<>{}*?|=:@]/.test(s)) return false;
  if (EXT_RE.test(s)) return true;
  return prefixesConnus.some((p) => s.startsWith(p));
}

function cheminExiste(doc, cite) {
  // Un chemin peut être relatif à la racine du dépôt ou au fichier qui le cite.
  return existsSync(join(root, cite)) || existsSync(join(dirname(doc), cite));
}

const prefixes = cfg.contractPrefixes ?? ["SEC", "QUA"];
// « autre-depot:QUA-011 » cite le contrat d'un autre dépôt : il n'est pas cherché dans ce registre.
const idMotif = `(?<![\\w:-])(?:${prefixes.map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})-\\d{3}\\b`;
const contratsPath = join(root, cfg.dirs?.contracts ?? "docs/contrats.md");
const definis = new Set();
const erreurs = [];
if (existsSync(contratsPath)) {
  // Un ID se définit soit en titre (## ID — ...), soit en première cellule d'une ligne de tableau (| ID | ...).
  const comptes = new Map();
  for (const m of readFileSync(contratsPath, "utf8").matchAll(new RegExp(`^(?:##\\s+|\\|\\s*)(${idMotif})`, "gm"))) {
    definis.add(m[1]);
    comptes.set(m[1], (comptes.get(m[1]) ?? 0) + 1);
  }
  for (const [id, n] of comptes) if (n > 1) erreurs.push(T.doublon(id, relative(root, contratsPath)));
}

const docs = sources();
for (const doc of docs) {
  const rel = relative(root, doc);
  readFileSync(doc, "utf8").split(/\r?\n/).forEach((ligne, i) => {
    if (!OPTIONNEL_RE.test(ligne)) {
      for (const m of ligne.matchAll(CODE_RE)) {
        const cite = m[1];
        if (ressembleAUnChemin(cite) && !CREER_RE.test(ligne.slice(m.index + m[0].length)) && !cheminExiste(doc, cite)) {
          erreurs.push(`${rel}:${i + 1} : ${T.chemin(cite)}`);
        }
      }
    }
    if (doc !== contratsPath) {
      for (const [id] of ligne.matchAll(new RegExp(idMotif, "g"))) {
        if (!definis.has(id)) erreurs.push(`${rel}:${i + 1} : ${T.contrat(id, relative(root, contratsPath))}`);
      }
    }
  });
}

erreurs.push(...checkChantiers());
erreurs.push(...checkCadrage());

for (const e of erreurs) console.log(`  ✗ ${e}`);
console.log(T.bilan(docs.length, erreurs.length));
process.exit(erreurs.length ? 1 : 0);

// QUA-015 : chaque chantier se reprend à froid (marqueurs, statut daté, sections, Reprise).
function checkChantiers() {
  const erreurs = [];
  const indexPath = join(root, cfg.dirs?.index ?? "docs/projets/en-attente.md");
  if (existsSync(indexPath)) {
    const relIndex = relative(root, indexPath);
    readFileSync(indexPath, "utf8").split(/\r?\n/).forEach((ligne, i) => {
      if (/^\s*-\s*\[ \]/.test(ligne) && !MARQUEURS_RE.test(ligne)) erreurs.push(`${relIndex}:${i + 1} : ${T.marqueur()}`);
    });
  }
  const projetsDir = join(root, cfg.dirs?.projects ?? "docs/projets");
  const fiches = mdRecursif(projetsDir).filter((p) => p !== indexPath && !EXEMPTS_RE.test(relative(projetsDir, p)));
  for (const fiche of fiches) checkFiche(fiche, erreurs, true);
  const intentionsDir = join(root, cfg.dirs?.intentions ?? "docs/intentions");
  const intentions = mdRecursif(intentionsDir).filter((p) => relative(intentionsDir, p) !== "README.md");
  for (const fiche of intentions) checkFiche(fiche, erreurs, false);
  return erreurs;
}

// Rappel de cadrage, bloquant au commit (décision du demandeur, différente de run-box qui le
// voulait non bloquant) : un fichier de code indexé doit être couvert par le bloc `cadrage` d'une
// fiche de docs/projets/ (dont la fiche permanente « entretien courant » pour les petites tâches).
function checkCadrage() {
  const erreurs = [];
  let indexes;
  try {
    indexes = execFileSync("git", ["ls-files"], { cwd: root, stdio: ["ignore", "pipe", "ignore"] })
      .toString().split(/\r?\n/).filter(Boolean);
  } catch {
    return erreurs; // pas de dépôt git, ou git introuvable : rien à vérifier.
  }
  const projetsDir = join(root, cfg.dirs?.projects ?? "docs/projets");
  const fiches = mdRecursif(projetsDir).filter((p) => !MODELE_RE.test(relative(projetsDir, p)));
  const fichesTexte = fiches.map((f) => [relative(root, f), readFileSync(f, "utf8")]);
  for (const [rel, texte] of fichesTexte) {
    const { problemes } = cadrage.lireBloc(texte);
    for (const p of problemes) {
      if (p.kind === "entete") erreurs.push(T.cadrageEntete(rel));
      else if (p.kind === "ligne") erreurs.push(T.cadrageLigne(rel, p.ligne));
      else if (p.kind === "large") erreurs.push(T.cadrageLarge(rel, p.motif));
    }
  }
  const motifsParFiche = cadrage.motifsDuDepot(fichesTexte);
  for (const c of cadrage.horsFiche(indexes, motifsParFiche, cfg)) erreurs.push(T.horsFiche(c));
  return erreurs;
}

function checkFiche(fiche, erreurs, estProjet) {
  const rel = relative(root, fiche);
  const lignes = readFileSync(fiche, "utf8").split(/\r?\n/);
  const debut = lignes.slice(0, 15).findIndex((l) => STATUT_RE.test(l));
  if (debut === -1 || !DATE_RE.test(lignes.slice(debut, debut + 4).join(" "))) erreurs.push(T.statut(rel));
  if (estProjet) {
    if (!lignes.some((l) => l.startsWith("## Reprise") || l.startsWith("## Hand-off"))) erreurs.push(T.reprise(rel));
  } else {
    for (const s of lang === "en" ? SECTIONS_INTENTION_EN : SECTIONS_INTENTION_FR) {
      if (!lignes.some((l) => l.startsWith(s))) erreurs.push(T.section(rel, s.slice(3)));
    }
  }
}
