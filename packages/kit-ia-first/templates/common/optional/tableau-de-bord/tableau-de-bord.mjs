#!/usr/bin/env node
// Génère un tableau de bord HTML statique (un seul fichier, sans serveur ni
// dépendance) : avancement des chantiers et couverture des contrats, lus
// directement dans les .md existants. N'invente aucun état : affiche la
// ligne « Statut » et les lots tels qu'écrits dans chaque fiche (une
// information, une seule source — docs/ia-first.md). Opt-in, lancé à la
// main : `node .githooks/tableau-de-bord.mjs [chemin-de-sortie]`.
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();
const cfg = loadConfig();
const lang = cfg.lang === "en" ? "en" : "fr";
const CATALOGUE = { fr: "docs/catalogue-contrats.md", en: "docs/contracts-catalog.md" }[lang];
const T = {
  fr: {
    titre: (p) => `Tableau de bord — ${p}`,
    genere: (d) => `Généré le ${d} depuis les fichiers du dépôt (rien n'est recalculé : statuts et lots affichés tels qu'écrits dans chaque fiche).`,
    enAttente: "Chantiers en attente",
    chantiers: "Chantiers (fiches de docs/projets/)",
    contrats: "Contrats",
    pasDeStatut: "(pas de ligne Statut)",
    statut: (s) => `Statut : ${s}`,
    absent: "(absent)",
    aucuneCase: "(aucune case trouvée)",
    aucuneFiche: "(aucune fiche)",
    aucun: "(aucun)",
    installes: (f) => `Installés (${f} — socle du projet)`,
    catalogue: (f) => `Au catalogue, non installés (${f})`,
    colonnesSimples: ["ID", "Règle"],
    consommation: "Consommation (.drwil/usage.jsonl)",
    colonnesConso: ["Chantier", "Tokens (total)", "Durée (min)", "Modèles employés"],
    pasDeConso: "(.drwil/usage.jsonl absent — aucune donnée de consommation)",
  },
  en: {
    titre: (p) => `Dashboard — ${p}`,
    genere: (d) => `Generated on ${d} from the repository files (nothing is recomputed: statuses and lots are shown as written in each fiche).`,
    enAttente: "Pending work",
    chantiers: "Projects (docs/projects/ fiches)",
    contrats: "Contracts",
    pasDeStatut: "(no Status line)",
    statut: (s) => `Status: ${s}`,
    absent: "(missing)",
    aucuneCase: "(no checkbox found)",
    aucuneFiche: "(no fiche)",
    aucun: "(none)",
    installes: (f) => `Installed (${f} — project baseline)`,
    catalogue: (f) => `In the catalogue, not installed (${f})`,
    colonnesSimples: ["ID", "Rule"],
    consommation: "Consumption (.drwil/usage.jsonl)",
    colonnesConso: ["Project", "Tokens (total)", "Duration (min)", "Models used"],
    pasDeConso: "(.drwil/usage.jsonl missing — no consumption data)",
  },
}[lang];
const MODELE_RE = /^modele-|^model-/;
// Extraction tolérante : check-docs.mjs exige juste la présence de la ligne (voir sa propre STATUT_RE) ;
// ici on capture le texte, même si une parenthèse (date, etc.) sépare « Statut » des deux-points.
const STATUT_LIGNE_RE = /^\*{0,2}(Statut|Status)\*{0,2}[^:]*:\s*(.*)$/i;
// Titre de section flexible : le modèle dit « ## 6. Lots », une fiche réelle peut dire « ## 4. Lots proposés ».
const LOTS_RE = /^#{1,4}\s*\d*\.?\s*(Lots|Batches)\b/i;
const LOT_LIGNE_RE = /^-\s+\*\*(.+?)\*\*\s*\[([^\]]+)\]\s*:?\s*(.*)$/;
const MARQUEUR_RE = /\b(IA|AI|humain|human|décision|decision)\b/i;
// Un ID de contrat (socle ou catalogue) : lettres-chiffres, avec un préfixe facultatif (« catalogue: »,
// « autre-dépôt: ») — on reste permissif plutôt que de dépendre de cfg.contractPrefixes, pour couvrir
// aussi bien le registre du projet que des conventions de préfixe différentes.
const ID_RE = /^(?:[a-z][\w-]*:)?[A-Z]{2,6}-\d{2,4}$/;

function loadConfig() {
  try {
    return JSON.parse(readFileSync(join(root, ".drwil", "ia-first.json"), "utf8"));
  } catch {
    return {};
  }
}

function lireFiches() {
  const projetsDir = join(root, cfg.dirs?.projects ?? "docs/projets");
  const indexPath = join(root, cfg.dirs?.index ?? "docs/projets/en-attente.md");
  if (!existsSync(projetsDir)) return { index: null, fiches: [] };
  const fichiers = readdirSync(projetsDir, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith(".md") && !MODELE_RE.test(e.name))
    .map((e) => join(projetsDir, e.name));
  const index = existsSync(indexPath) ? readFileSync(indexPath, "utf8") : null;
  const fiches = fichiers
    .filter((f) => f !== indexPath)
    .map((f) => analyserFiche(f, readFileSync(f, "utf8")));
  return { index, fiches };
}

function analyserFiche(chemin, texte) {
  const lignes = texte.split(/\r?\n/);
  const titre = (lignes.find((l) => l.startsWith("# ")) ?? "# ?").replace(/^#\s*/, "");
  const ligneStatut = lignes.slice(0, 15).find((l) => STATUT_LIGNE_RE.test(l));
  const statut = ligneStatut ? ligneStatut.match(STATUT_LIGNE_RE)[2].trim() : null;
  const debutLots = lignes.findIndex((l) => LOTS_RE.test(l));
  const lots = [];
  if (debutLots !== -1) {
    for (let i = debutLots + 1; i < lignes.length && !/^#{1,4}\s/.test(lignes[i]); i++) {
      const m = lignes[i].match(LOT_LIGNE_RE);
      if (m) lots.push({ titre: m[1], marqueur: m[2].match(MARQUEUR_RE)?.[1] ?? m[2], texte: m[3] });
    }
  }
  return { chemin: relative(root, chemin), titre, statut, lots };
}

function ligneDeTableau(ligne) {
  if (!/^\|.*\|$/.test(ligne.trim())) return null;
  const cols = ligne.trim().slice(1, -1).split("|").map((c) => c.trim());
  if (cols.every((c) => /^:?-+:?$/.test(c))) return null; // ligne de séparation du tableau markdown
  return cols;
}

function lireContrats(chemin) {
  if (!existsSync(chemin)) return [];
  const lignes = readFileSync(chemin, "utf8").split(/\r?\n/);
  const out = [];
  for (let i = 0; i < lignes.length; i++) {
    // Un ID se définit soit en titre (## ID — ...), soit en première cellule d'une ligne de tableau
    // (même détection que .githooks/check-docs.mjs : ^(?:##\s+|\|\s*)(ID)).
    const titre = lignes[i].match(/^##\s+(\S+)/);
    if (titre && ID_RE.test(titre[1])) {
      let regle = "";
      for (let j = i + 1; j < lignes.length && !/^##\s/.test(lignes[j]); j++) {
        const rm = lignes[j].match(/^\*{0,2}(Règle|Rule)\*{0,2}\s?:\s?(.*)$/i);
        if (rm) { regle = rm[2].trim(); break; }
      }
      out.push({ id: titre[1], regle });
      continue;
    }
    const cellules = ligneDeTableau(lignes[i]);
    if (cellules && ID_RE.test(cellules[0])) out.push({ id: cellules[0], regle: cellules[1] ?? "" });
  }
  return out;
}

function echapper(s) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Lecture tolérante : une ligne mal formée (JSON invalide, champ manquant) est ignorée plutôt que
// de faire planter tout le tableau de bord — le fichier reste alimenté à la main ou par l'IA.
function lireUsage(chemin) {
  if (!existsSync(chemin)) return [];
  return readFileSync(chemin, "utf8").split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => { try { return JSON.parse(l); } catch { return null; } })
    .filter((e) => e && typeof e.chantier === "string");
}

function agregerUsage(entrees) {
  const parChantier = new Map();
  for (const e of entrees) {
    const acc = parChantier.get(e.chantier) ?? { tokens: 0, dureeMin: 0, modeles: new Set() };
    acc.tokens += Number(e.tokens) || 0;
    acc.dureeMin += Number(e.duree_min) || 0;
    if (e.modele) acc.modeles.add(String(e.modele));
    parChantier.set(e.chantier, acc);
  }
  return parChantier;
}

function rendreLots(lots) {
  if (!lots.length) return "";
  return `<ul class="lots">${lots.map((l) =>
    `<li><span class="marqueur">[${echapper(l.marqueur)}]</span> <strong>${echapper(l.titre)}</strong> — ${echapper(l.texte)}</li>`,
  ).join("")}</ul>`;
}

function rendreIndex(texte) {
  if (!texte) return `<p>${T.absent}</p>`;
  const lignes = texte.split(/\r?\n/).filter((l) => /^\s*-\s*\[[ xX]\]/.test(l));
  if (!lignes.length) return `<p>${T.aucuneCase}</p>`;
  return `<ul class="index">${lignes.map((l) => {
    const coche = /^\s*-\s*\[[xX]\]/.test(l);
    const contenu = l.replace(/^\s*-\s*\[[ xX]\]\s*/, "");
    return `<li class="${coche ? "fait" : "ouvert"}">${coche ? "☑" : "☐"} ${echapper(contenu)}</li>`;
  }).join("")}</ul>`;
}

function rendreContrats(titre, contrats) {
  if (!contrats.length) return `<h3>${echapper(titre)}</h3><p>${T.aucun}</p>`;
  return `<h3>${echapper(titre)}</h3><table><thead><tr>${T.colonnesSimples.map((c) => `<th>${echapper(c)}</th>`).join("")}</tr></thead>` +
    `<tbody>${contrats.map((c) => `<tr><td><code>${echapper(c.id)}</code></td><td>${echapper(c.regle)}</td></tr>`).join("")}</tbody></table>`;
}

function rendreConsommation(parChantier) {
  if (!parChantier.size) return `<p>${T.pasDeConso}</p>`;
  const lignes = [...parChantier.entries()].map(([chantier, acc]) =>
    `<tr><td><code>${echapper(chantier)}</code></td><td>${acc.tokens}</td><td>${acc.dureeMin}</td><td>${echapper([...acc.modeles].join(", "))}</td></tr>`,
  ).join("");
  return `<table><thead><tr>${T.colonnesConso.map((c) => `<th>${echapper(c)}</th>`).join("")}</tr></thead><tbody>${lignes}</tbody></table>`;
}

const { index, fiches } = lireFiches();
const cheminContrats = cfg.dirs?.contracts ?? "docs/contrats.md";
const registre = lireContrats(join(root, cheminContrats));
const catalogue = lireContrats(join(root, CATALOGUE));
const usageParChantier = agregerUsage(lireUsage(join(root, ".drwil", "usage.jsonl")));
const nomProjet = cfg.projectName ?? root;

const html = `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<title>${echapper(T.titre(nomProjet))}</title>
<style>
body { font: 14px/1.5 system-ui, sans-serif; max-width: 960px; margin: 2rem auto; padding: 0 1rem; color: #1a1a2e; }
h1 { font-size: 1.4rem; } h2 { margin-top: 2.5rem; border-bottom: 2px solid #ddd; padding-bottom: .3rem; }
.fiche { border: 1px solid #ddd; border-radius: 6px; padding: 1rem; margin: 1rem 0; }
.fiche .statut { color: #444; font-style: italic; }
.lots { padding-left: 1.2rem; } .marqueur { font-family: monospace; color: #0b5; }
.index { list-style: none; padding: 0; } .index li.fait { color: #888; text-decoration: line-through; }
table { border-collapse: collapse; width: 100%; margin: .5rem 0 1.5rem; }
th, td { border: 1px solid #ddd; padding: .4rem .6rem; text-align: left; vertical-align: top; font-size: .85rem; }
th { background: #f4f4f8; }
.genere { color: #888; font-size: .8rem; }
</style>
</head>
<body>
<h1>${echapper(T.titre(nomProjet))}</h1>
<p class="genere">${echapper(T.genere(new Date().toISOString().slice(0, 16).replace("T", " ")))}</p>

<h2>${echapper(T.enAttente)}</h2>
${rendreIndex(index)}

<h2>${echapper(T.chantiers)}</h2>
${fiches.map((f) => `<div class="fiche">
  <h3>${echapper(f.titre)} <small>(<code>${echapper(f.chemin)}</code>)</small></h3>
  <p class="statut">${f.statut ? echapper(T.statut(f.statut)) : echapper(T.pasDeStatut)}</p>
  ${rendreLots(f.lots)}
</div>`).join("") || `<p>${T.aucuneFiche}</p>`}

<h2>${echapper(T.contrats)}</h2>
${rendreContrats(T.installes(cheminContrats), registre)}
${rendreContrats(T.catalogue(CATALOGUE), catalogue)}

<h2>${echapper(T.consommation)}</h2>
${rendreConsommation(usageParChantier)}
</body>
</html>
`;

const sortie = process.argv[2] ?? "docs/tableau-de-bord.html";
writeFileSync(join(root, sortie), html);
console.log(`Tableau de bord généré : ${sortie}`);
