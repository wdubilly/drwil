// Grammaire du bloc `cadrage` des fiches de chantier (docs/projets/*.md).
//
// Seule source de la grammaire : le contrôle au commit (check-docs.mjs) et le
// rappel à l'agent (.claude/hooks/rappel-cadrage.mjs) l'importent tous deux.
// Une fiche de docs/projets/ peut porter, dans un commentaire HTML :
//
//     <!-- cadrage
//     fichiers:
//       - backend/app/routers/scripts.py
//       - frontend/src/components/Script*
//     -->
//
// Un fichier de code est couvert s'il correspond à un motif (façon fnmatch)
// d'une fiche, livrée ou non. Rien ici ne lève d'exception sur une fiche
// illisible : le mécanisme aide, il ne doit jamais casser.

const BLOC_RE = /<!--[ \t]*cadrage[ \t]*\n([\s\S]*?)-->/;
const ENTREE_RE = /^-[ \t]+(\S+)$/;
const JOKERS = new Set(["*", "?", "["]);

/** Chemin relatif à la racine, séparateurs `/`, sans `./` de tête. */
export function normaliser(chemin) {
  let c = String(chemin).replace(/\\/g, "/").trim();
  while (c.startsWith("./")) c = c.slice(2);
  return c;
}

/**
 * Le périmètre du rappel : le code du projet et sa configuration ; jamais
 * docs/ ni un .md, pour que l'agent puisse toujours écrire sa fiche.
 * Lu depuis la config du projet (.drwil/ia-first.json) : couches, dossiers de
 * code génériques, fichiers et motifs supplémentaires, fichiers de CI.
 */
export function estDuCode(chemin, cfg = {}) {
  const c = normaliser(chemin);
  if (!c || c.startsWith("docs/") || /\.md$/i.test(c)) return false;
  const prefixes = [...(cfg.layers ?? []), ...(cfg.layerPrefixes ?? []), ...(cfg.codePrefixes ?? [])].map((p) => `${p}/`);
  if (prefixes.some((p) => c.startsWith(p))) return true;
  if ((cfg.extraCodeFiles ?? []).includes(c)) return true;
  if ((cfg.ciFiles ?? []).includes(c)) return true;
  return (cfg.extraCodeGlobs ?? []).some((m) => fnmatch(c, m));
}

/** Façon fnmatch : `*` et `?` traversent les `/`, le reste est littéral. */
export function fnmatch(chemin, motif) {
  const re = motif.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".");
  return new RegExp(`^${re}$`).test(chemin);
}

/** Un motif doit nommer au moins deux dossiers avant son premier joker
 * (`backend/app/x*` oui, `backend/*` ou `**` non) : sinon il couvre tout un
 * arbre et le rappel ne dit plus rien. */
export function tropLarge(motif) {
  if (motif.includes("**")) return true;
  const premier = [...motif].findIndex((c) => JOKERS.has(c));
  if (premier === -1) return false;
  return (motif.slice(0, premier).match(/\//g) ?? []).length < 2;
}

/**
 * Motifs valides et problèmes du bloc `cadrage` d'une fiche. Pas de bloc :
 * `{ motifs: [], problemes: [] }`. Un motif trop large est signalé et retiré
 * des motifs valides.
 */
export function lireBloc(texte) {
  const m = BLOC_RE.exec(texte);
  if (!m) return { motifs: [], problemes: [] };
  const motifs = [];
  const problemes = [];
  let entete = false;
  for (const brute of m[1].split(/\r?\n/)) {
    const ligne = brute.trim();
    if (!ligne) continue;
    if (!entete) {
      if (ligne === "fichiers:") entete = true;
      else problemes.push({ kind: "entete", ligne });
      continue;
    }
    const entree = ENTREE_RE.exec(ligne);
    if (entree) motifs.push(normaliser(entree[1]));
    else problemes.push({ kind: "ligne", ligne });
  }
  if (!entete && problemes.length === 0) problemes.push({ kind: "entete", ligne: "" });
  const valides = [];
  for (const motif of motifs) {
    if (tropLarge(motif)) problemes.push({ kind: "large", motif });
    else valides.push(motif);
  }
  return { motifs: valides, problemes };
}

/** `{ fiche (chemin relatif) : motifs }` pour les fiches dont le bloc se lit sans erreur de forme. */
export function motifsDuDepot(fichesTexte) {
  const resultat = new Map();
  for (const [rel, texte] of fichesTexte) {
    const { motifs } = lireBloc(texte);
    if (motifs.length) resultat.set(rel, motifs);
  }
  return resultat;
}

export function fichesCouvrant(chemin, motifsParFiche) {
  const c = normaliser(chemin);
  const fiches = [];
  for (const [fiche, motifs] of motifsParFiche) if (motifs.some((m) => fnmatch(c, m))) fiches.push(fiche);
  return fiches;
}

/** Fichiers de code de `chemins` qu'aucune fiche ne couvre, triés. */
export function horsFiche(chemins, motifsParFiche, cfg) {
  const set = new Set();
  for (const c of chemins) {
    const n = normaliser(c);
    if (estDuCode(n, cfg) && fichesCouvrant(n, motifsParFiche).length === 0) set.add(n);
  }
  return [...set].sort();
}
