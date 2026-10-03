#!/usr/bin/env node
// Contrôle IA-first : chemins et contrats cités dans la doc.
// Lit .drwil/ia-first.json pour s'adapter aux couches, aux préfixes de contrats et à la langue.
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative } from "node:path";

const root = process.cwd();
const cfg = loadConfig();
const lang = cfg.lang === "en" ? "en" : "fr";
const T = {
  fr: {
    chemin: (c) => `chemin cité introuvable \`${c}\``,
    contrat: (id, f) => `contrat ${id} absent de ${f}`,
    bilan: (n, e) => `check-docs : ${n} fichiers scannés, ${e} erreur(s)`,
  },
  en: {
    chemin: (c) => `cited path not found \`${c}\``,
    contrat: (id, f) => `contract ${id} missing from ${f}`,
    bilan: (n, e) => `check-docs: ${n} files scanned, ${e} error(s)`,
  },
}[lang];

const CODE_RE = /`([^`\s]+)`/g;
const EXT_RE = /\.(md|mdc|mjs|cjs|js|ts|tsx|jsx|py|sh|json|ya?ml|toml|txt)$/;
// Une ligne qui déclare le fichier facultatif ne doit pas faire échouer le contrôle.
const OPTIONNEL_RE = /si présent|if present/i;

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

function ressembleAUnChemin(s) {
  if (/^(https?:\/\/|-|\$)/.test(s) || /[<>{}*?|=:@]/.test(s)) return false;
  return s.includes("/") || EXT_RE.test(s);
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
if (existsSync(contratsPath)) {
  for (const m of readFileSync(contratsPath, "utf8").matchAll(new RegExp(`^##\\s+(${idMotif})`, "gm"))) definis.add(m[1]);
}

const erreurs = [];
const docs = sources();
for (const doc of docs) {
  const rel = relative(root, doc);
  readFileSync(doc, "utf8").split(/\r?\n/).forEach((ligne, i) => {
    if (!OPTIONNEL_RE.test(ligne)) {
      for (const [, cite] of ligne.matchAll(CODE_RE)) {
        if (ressembleAUnChemin(cite) && !cheminExiste(doc, cite)) erreurs.push(`${rel}:${i + 1} : ${T.chemin(cite)}`);
      }
    }
    if (doc !== contratsPath) {
      for (const [id] of ligne.matchAll(new RegExp(idMotif, "g"))) {
        if (!definis.has(id)) erreurs.push(`${rel}:${i + 1} : ${T.contrat(id, relative(root, contratsPath))}`);
      }
    }
  });
}

for (const e of erreurs) console.log(`  ✗ ${e}`);
console.log(T.bilan(docs.length, erreurs.length));
process.exit(erreurs.length ? 1 : 0);
