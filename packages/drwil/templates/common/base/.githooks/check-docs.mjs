#!/usr/bin/env node
// Contrôle IA-first : chemins et contrats cités dans la doc.
// Lit .drwil/ia-first.json pour s'adapter aux couches, aux préfixes de contrats et à la langue.
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { execFileSync } from "node:child_process";
import * as cadrage from "./cadrage.mjs";
import { controlesConnus, lireContrats, validerContrats } from "./contrats.mjs";
import { verifierRisque } from "./risque.mjs";
import { statutFiche } from "./etat.mjs";

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
    cadrageAvertissement: (n) => `check-docs : ${n} avertissement(s) de cadrage (QUA-016, non bloquant — réglage "cadrage" de .drwil/ia-first.json)`,
    coherenceOuverte: (fiche) => `case ouverte mais la fiche ${fiche} se dit déjà terminée (QUA-015)`,
    coherenceCochee: (fiche) => `case cochée mais la fiche ${fiche} ne se dit pas terminée (QUA-015)`,
    ficheTerminee: (fiche) => `${fiche} : fiche terminée encore présente — la condenser dans docs/projets/journal.md, la supprimer et retirer sa ligne de l'index (QUA-015)`,
    coherenceAvertissement: (n) => `check-docs : ${n} avertissement(s) de cohérence case/statut (QUA-015, non bloquant)`,
    risqueAvertissement: (n) => `check-docs : ${n} avertissement(s) de niveau de risque (DRWIL-012, non bloquant)`,
    ignoreParGit: "fichier ignoré par Git : absent en CI (ajouter « (si présent) »)",
    nouveauxAvertissement: (n) => `check-docs : ${n} avertissement(s) d'exigence récente (réglage « nouvellesExigences » : avertissement ; « bloquant » pour l'imposer)`,
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
    cadrageAvertissement: (n) => `check-docs: ${n} cadrage warning(s) (QUA-016, non-blocking — "cadrage" setting in .drwil/ia-first.json)`,
    coherenceOuverte: (fiche) => `item unchecked but ${fiche} already says it is done (QUA-015)`,
    coherenceCochee: (fiche) => `item checked but ${fiche} does not say it is done (QUA-015)`,
    ficheTerminee: (fiche) => `${fiche}: finished card still present — condense it into docs/projects/journal.md, delete it and remove its index line (QUA-015)`,
    coherenceAvertissement: (n) => `check-docs: ${n} checkbox/status consistency warning(s) (QUA-015, non-blocking)`,
    risqueAvertissement: (n) => `check-docs: ${n} risk level warning(s) (DRWIL-012, non-blocking)`,
    ignoreParGit: "file ignored by Git: missing in CI (add \"(if present)\")",
    nouveauxAvertissement: (n) => `check-docs: ${n} recent-requirement warning(s) (setting "nouvellesExigences": avertissement; "bloquant" to enforce it)`,
  },
}[lang];

const CITATION_FICHE_RE = /`((?:docs\/projets|docs\/projects|docs\/intentions)\/[^`]+\.md)`/g;

// Sévérité du rappel de cadrage (QUA-016 seul ; le reste de check-docs reste toujours bloquant) :
// "bloquant" (défaut historique), "avertissement" (jamais bloquant, juste affiché) ou "off" (désactivé).
const CADRAGE_NIVEAUX = new Set(["bloquant", "avertissement", "off"]);
const niveauCadrage = CADRAGE_NIVEAUX.has(cfg.cadrage) ? cfg.cadrage : "avertissement";

const CODE_RE = /`([^`\s]+)`/g;
const EXT_RE = /\.(md|mdc|mjs|cjs|js|ts|tsx|jsx|py|sh|json|ya?ml|toml|txt)$/;
// Une ligne qui déclare le fichier facultatif ne doit pas faire échouer le contrôle.
const OPTIONNEL_RE = /si présent|if present/i;
// Un chemin prévu mais pas encore créé, marqué juste après la citation, n'est pas une erreur.
const CREER_RE = /^\s*\(à créer\)|^\s*\(to create\)/i;
const MARQUEURS_RE = /\[(IA|humain|décision|AI|human|decision)\]/i;
// tolère une date entre parenthèses juste après le mot (ex. « **Statut** (2026-10-04) : »).
const STATUT_RE = /^\*{0,2}(Statut|Status)\*{0,2}\s?(\([^)]*\))?\s?:/;
const DATE_RE = /\b\d{4}-\d{2}-\d{2}\b/;
const SECTIONS_INTENTION_FR = ["## Besoin", "## Existant", "## Questions à trancher"];
const SECTIONS_INTENTION_EN = ["## Need", "## Current state", "## Open questions"];
// Modèles à copier et fiche permanente : pas des chantiers à lots, exemptés du contrôle QUA-015.
const EXEMPTS_RE = /^modele-|^model-|^entretien-courant\.md$|^routine-maintenance\.md$|^journal\.md$/;
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

// Un chemin peut être relatif à la racine du dépôt ou au fichier qui le cite.
const cheminsTrouves = (doc, cite) => [join(root, cite), join(dirname(doc), cite)].filter((p) => existsSync(p));

/**
 * Parmi ces chemins, ceux qu'ignore Git (un seul appel). Présents sur le poste mais absents en CI,
 * ils ne prouvent pas une citation : sans ça, le contrôle local passait et la CI échouait. Par
 * défaut, `check-ignore` ne signale pas un fichier suivi. Hors dépôt Git : aucun.
 */
// Chemins relatifs au format « / » : Git, même sous Windows, ne reconnaît pas comme ignoré un
// chemin écrit avec des barres obliques inversées (CI Windows de la PR #26).
const relPosix = (p) => relative(root, p).split(sep).join("/");

function ignoresParGit(chemins) {
  const rels = [...new Set(chemins.map(relPosix))].filter((r) => r && !r.startsWith(".."));
  if (!rels.length) return new Set();
  try {
    const sortie = execFileSync("git", ["check-ignore", "--stdin"], { cwd: root, input: rels.join("\n"), stdio: ["pipe", "pipe", "ignore"] });
    return new Set(sortie.toString().split(/\r?\n/).filter(Boolean));
  } catch {
    return new Set(); // code 1 : rien d'ignoré ; ou pas de dépôt git.
  }
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
  // DRWIL-002 : un contrat mal formé (contrôle inconnu, Règle ou preuve absente) est refusé dès le
  // commit, avec le même lecteur que `drwil verify` ; les doublons sont déjà signalés ci-dessus.
  for (const e of validerContrats(lireContrats(readFileSync(contratsPath, "utf8")), controlesConnus(cfg), lang)) {
    if (e.type !== "doublon") erreurs.push(`${relative(root, contratsPath)}:${e.ligne} : ${e.message}`);
  }
}

const docs = sources();
const citations = [];
for (const doc of docs) {
  const rel = relative(root, doc);
  const lignesDoc = readFileSync(doc, "utf8").split(/\r?\n/);
  lignesDoc.forEach((ligne, i) => {
    // « (si présent) » peut tomber sur la ligne suivante après un retour à la ligne.
    if (!OPTIONNEL_RE.test(ligne) && !OPTIONNEL_RE.test(lignesDoc[i + 1] ?? "")) {
      for (const m of ligne.matchAll(CODE_RE)) {
        const cite = m[1];
        if (ressembleAUnChemin(cite) && !CREER_RE.test(ligne.slice(m.index + m[0].length))) {
          citations.push({ lieu: `${rel}:${i + 1}`, cite, trouves: cheminsTrouves(doc, cite) });
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

const ignores = ignoresParGit(citations.flatMap((c) => c.trouves));
// Exigence ajoutée après l'installation de projets déjà équipés : un fichier ignoré ne prouve plus
// une citation. Bloquante seulement si le projet l'a (`nouvellesExigences` : "bloquant", défaut
// des installations neuves) ; sinon signalée sans casser un commit qui passait.
const nouvellesBloquantes = cfg.nouvellesExigences === "bloquant";
const avertissementsNouveaux = [];
for (const c of citations) {
  if (!c.trouves.length) erreurs.push(`${c.lieu} : ${T.chemin(c.cite)}`);
  else if (!c.trouves.some((p) => !ignores.has(relPosix(p)))) (nouvellesBloquantes ? erreurs : avertissementsNouveaux).push(`${c.lieu} : ${T.chemin(c.cite)} — ${T.ignoreParGit}`);
}

erreurs.push(...checkChantiers());

// DRWIL-012 : niveau de risque des fiches de projet (ADR-004) ; la traçabilité QUA-016 ne change pas.
const avertissementsRisque = [];
{
  const projetsDir = join(root, cfg.dirs?.projects ?? "docs/projets");
  const indexPath = join(root, cfg.dirs?.index ?? "docs/projets/en-attente.md");
  // La fiche de mécanique du kit est livrée à chaque installation et ne décrit pas un chantier :
  // l'avertir dès l'installation de tout projet serait du bruit, pas un signal.
  const mecanique = /^mecanique-ia-first\.md$|^kit-mechanics\.md$/;
  for (const fiche of mdRecursif(projetsDir).filter((p) => p !== indexPath && !EXEMPTS_RE.test(relative(projetsDir, p)) && !mecanique.test(relative(projetsDir, p)))) {
    const r = verifierRisque(readFileSync(fiche, "utf8"), { idMotif, lang, ...(cfg.risque?.cheminsSensibles ? { sensibles: cfg.risque.cheminsSensibles } : {}) });
    for (const e of r.erreurs) erreurs.push(`${relative(root, fiche)} : ${e}`);
    for (const a of r.avertissements) avertissementsRisque.push(`${relative(root, fiche)} : ${a}`);
  }
}

const problemesCadrage = niveauCadrage === "off" ? [] : checkCadrage();
if (niveauCadrage === "bloquant") erreurs.push(...problemesCadrage);

for (const e of erreurs) console.log(`  ✗ ${e}`);
console.log(T.bilan(docs.length, erreurs.length));
if (niveauCadrage === "avertissement" && problemesCadrage.length) {
  for (const e of problemesCadrage) console.log(`  ⚠ ${e}`);
  console.log(T.cadrageAvertissement(problemesCadrage.length));
}
const problemesCoherence = checkCoherenceCaseStatut();
if (problemesCoherence.length) {
  for (const e of problemesCoherence) console.log(`  ⚠ ${e}`);
  console.log(T.coherenceAvertissement(problemesCoherence.length));
}
if (avertissementsRisque.length) {
  for (const e of avertissementsRisque) console.log(`  ⚠ ${e}`);
  console.log(T.risqueAvertissement(avertissementsRisque.length));
}
if (avertissementsNouveaux.length) {
  for (const e of avertissementsNouveaux) console.log(`  ⚠ ${e}`);
  console.log(T.nouveauxAvertissement(avertissementsNouveaux.length));
}
process.exit(erreurs.length ? 1 : 0);

// QUA-015 (extension) : la case ([ ]/[x]) d'une ligne d'index doit refléter le statut réel de
// la fiche qu'elle cite — avertissement non bloquant (même famille que QUA-016), car le texte de
// « Statut » reste libre (prose), pas un champ structuré vérifiable à coup sûr.
function checkCoherenceCaseStatut() {
  const avertissements = [];
  const indexPath = join(root, cfg.dirs?.index ?? "docs/projets/en-attente.md");
  if (!existsSync(indexPath)) return avertissements;
  const relIndex = relative(root, indexPath);
  const lignes = readFileSync(indexPath, "utf8").split(/\r?\n/);
  // regroupe chaque puce (une entrée peut s'étaler sur plusieurs lignes indentées, le markdown
  // enveloppant les lignes longues) : une nouvelle puce commence à « - [ ] » ou « - [x] ».
  let bullet = null;
  const bullets = [];
  for (let i = 0; i < lignes.length; i++) {
    const m = /^\s*-\s*\[( |x|X)\]/.exec(lignes[i]);
    if (m) {
      bullet = { coche: m[1].toLowerCase() === "x", ligne: i + 1, texte: lignes[i] };
      bullets.push(bullet);
    } else if (bullet && lignes[i].trim() !== "" && /^\s+\S/.test(lignes[i])) {
      bullet.texte += "\n" + lignes[i];
    } else {
      bullet = null;
    }
  }
  for (const b of bullets) {
    for (const m of b.texte.matchAll(CITATION_FICHE_RE)) {
      const fichePath = join(root, m[1]);
      if (!existsSync(fichePath)) continue; // signalé par ailleurs (chemin cité introuvable).
      const fcTexte = readFileSync(fichePath, "utf8");
      if (!fcTexte.split(/\r?\n/).slice(0, 15).some((l) => STATUT_RE.test(l))) continue; // signalé par ailleurs (pas de ligne Statut).
      const termine = statutFiche(fcTexte) === "terminee";
      if (!b.coche && termine) avertissements.push(`${relIndex}:${b.ligne} : ${T.coherenceOuverte(m[1])}`);
      else if (b.coche && !termine) avertissements.push(`${relIndex}:${b.ligne} : ${T.coherenceCochee(m[1])}`);
    }
  }
  return avertissements;
}

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

// Rappel de cadrage : un fichier de code indexé doit être couvert par le bloc `cadrage` d'une
// fiche de docs/projets/ (dont la fiche permanente « entretien courant » pour les petites tâches).
// Sévérité réglable par projet (clé "cadrage" de .drwil/ia-first.json, défaut "avertissement") :
// "bloquant" fait échouer le commit comme avant (choix initial du 2026-10-03, différent de
// run-box qui le voulait non bloquant) ; "avertissement" affiche sans jamais bloquer ;
// "off" désactive le contrôle. Ce réglage ne touche que ce contrôle, jamais le reste de check-docs.
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
  const texte = readFileSync(fiche, "utf8");
  const lignes = texte.split(/\r?\n/);
  const debut = lignes.slice(0, 15).findIndex((l) => STATUT_RE.test(l));
  if (debut === -1 || !DATE_RE.test(lignes.slice(debut, debut + 4).join(" "))) erreurs.push(T.statut(rel));
  if (estProjet) {
    if (statutFiche(texte) === "terminee") erreurs.push(T.ficheTerminee(rel));
    // le modèle numérote ses sections (« ## 7. Reprise ») : la détection doit tolérer ce préfixe.
    if (!lignes.some((l) => /^##\s*(\d+\.\s*)?(Reprise|Hand-off)\b/.test(l))) erreurs.push(T.reprise(rel));
  } else {
    for (const s of lang === "en" ? SECTIONS_INTENTION_EN : SECTIONS_INTENTION_FR) {
      if (!lignes.some((l) => l.startsWith(s))) erreurs.push(T.section(rel, s.slice(3)));
    }
  }
}
