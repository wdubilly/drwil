// Lecture et validation du registre des contrats (docs/contrats.md, source
// canonique : ADR-001 de docs/projets/drwil-v0-2-gouvernance-executable.md).
// Sans dépendance, partagé par les hooks et `drwil verify` (ADR-003).
//
// Deux formes lues :
// - sections (forme cible) : `## ID — titre` puis des champs `**Nom** : valeur` ;
// - tableau (forme historique) : `| ID | Règle | … |`, lu pour compatibilité.
// Champs propres à la vérification : `**Contrôle**` (identifiant(s) d'un
// contrôle connu du moteur, entre backticks) et `**Manuel**` (partie de la
// preuve qui reste humaine). La commande d'un contrôle ne vit jamais ici.

/** Identifiants des étapes de .githooks/run-checks.mjs. Les quatre premiers sont aussi ceux de SOCLE dans check-control-coverage.mjs. */
export const CONTROLES_SOCLE = ["secrets-fichiers", "docs-references", "perimetre-attente", "controles-autotest", "couverture-ci", "branche-principale"];

const ID_RE = /^[A-Z][A-Z0-9]*-\d+$/;
const CHAMP_CONTROLE = /^(contrôle|controle|check)$/i;
const CHAMP_MANUEL = /^(manuel|manual)$/i;
const CHAMP_REGLE = /^(règle|regle|rule)$/i;
const CHAMP_SEVERITE = /^(sévérité|severite|severity)$/i;

// DRWIL-020 : seuls les contrats bloquants décident du gate de `drwil verify` ; les autres sont
// exécutés et affichés sans changer le code de sortie. Défaut : bloquant (comportement P0).
export const SEVERITES = { bloquant: "bloquant", blocking: "bloquant", avertissement: "avertissement", warning: "avertissement", indicatif: "indicatif", advisory: "indicatif" };

/** Identifiants cités dans un champ Contrôle : ceux entre backticks, sinon la liste séparée par des virgules. */
function identifiants(valeur) {
  const entreBackticks = [...valeur.matchAll(/`([^`]+)`/g)].map((m) => m[1].trim());
  const liste = entreBackticks.length ? entreBackticks : valeur.split(/[,;]/);
  return liste.map((v) => v.trim()).filter(Boolean);
}

function cellules(ligne) {
  return ligne.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
}

/**
 * Contrats du texte, dans l'ordre : { id, titre, ligne, forme, regle, controles, manuel, severite, texte }.
 * `texte` : la section (ou la ligne de tableau) brute, base de l'empreinte d'une attestation.
 * Chaîne intention → exigence → preuve : **Raison** (intention humaine), **Règle**
 * (exigence explicite), **Contrôle** ou **Manuel** (preuve). Champ absent : null.
 */
export function lireContrats(texte) {
  const lignes = texte.split(/\r?\n/);
  const contrats = [];
  let courant = null;
  let entete = null;
  for (let i = 0; i < lignes.length; i++) {
    const ligne = lignes[i];
    const titre = /^##\s+([A-Z][A-Z0-9]*-\d+)\s*(?:[—–-]\s*(.*))?$/.exec(ligne);
    if (titre) {
      courant = { id: titre[1], titre: (titre[2] ?? "").trim(), ligne: i + 1, forme: "section", regle: null, controles: null, manuel: null, severite: "bloquant", severiteBrute: null, texte: ligne };
      contrats.push(courant);
      entete = null;
      continue;
    }
    if (/^##\s/.test(ligne)) {
      courant = null;
      entete = null;
      continue;
    }
    if (courant) courant.texte += `\n${ligne}`;
    // `**Nom** : valeur` ou `**Nom:** valeur` ; valeur éventuellement sur la ligne suivante.
    const champ = /^\*\*([^*:]+?)\s*:?\*\*\s*:?\s*(.*)$/.exec(ligne);
    if (courant && champ) {
      let valeur = champ[2].trim();
      if (!valeur) {
        let j = i + 1;
        while (j < lignes.length && !lignes[j].trim()) j++;
        if (j < lignes.length && !/^\s*(\*\*|#|\|)/.test(lignes[j])) valeur = lignes[j].trim();
      }
      if (CHAMP_CONTROLE.test(champ[1].trim())) courant.controles = identifiants(valeur);
      else if (CHAMP_MANUEL.test(champ[1].trim())) courant.manuel = valeur;
      else if (CHAMP_REGLE.test(champ[1].trim())) courant.regle = valeur;
      else if (CHAMP_SEVERITE.test(champ[1].trim())) {
        courant.severiteBrute = valeur.replace(/`/g, "").trim();
        courant.severite = SEVERITES[courant.severiteBrute.toLowerCase()] ?? null;
      }
      continue;
    }
    if (!/^\s*\|/.test(ligne)) {
      entete = null;
      continue;
    }
    const c = cellules(ligne);
    if (c.every((x) => /^:?-+:?$/.test(x))) continue;
    if (!ID_RE.test(c[0])) {
      entete = c;
      continue;
    }
    const col = (re) => (entete ? entete.findIndex((h) => re.test(h)) : -1);
    const iControle = col(CHAMP_CONTROLE);
    const iManuel = col(CHAMP_MANUEL);
    const iRegle = col(CHAMP_REGLE);
    const controle = iControle >= 0 && c[iControle] && c[iControle] !== "—" ? identifiants(c[iControle]) : null;
    const manuel = iManuel >= 0 && c[iManuel] && c[iManuel] !== "—" ? c[iManuel] : null;
    contrats.push({ id: c[0], titre: c[1] ?? "", ligne: i + 1, forme: "tableau", regle: iRegle >= 0 ? c[iRegle] || null : null, controles: controle, manuel, severite: "bloquant", severiteBrute: null, texte: ligne });
  }
  for (const k of contrats) k.texte = k.texte.split("\n").map((l) => l.trimEnd()).join("\n").trim();
  return contrats;
}

/**
 * Erreurs de configuration du registre, chacune `{ id, ligne, type, message }`
 * (type : doublon | controle-vide | inconnu | sans-regle | sans-preuve | severite) :
 * doublon, contrôle inconnu, contrat en section sans exigence (Règle) ou sans
 * aucune preuve déclarée : une obligation invérifiable n'est jamais acceptée en silence.
 * Un contrat en tableau sans Contrôle ni Manuel n'est pas une erreur : c'est
 * un contrat historique, traité comme MANUAL.
 */
export function validerContrats(contrats, idsConnus, lang = "fr") {
  const T = {
    fr: {
      doublon: (id) => `contrat ${id} défini plusieurs fois`,
      inconnu: (id, c, connus) => `${id} : contrôle inconnu « ${c} » (connus : ${connus})`,
      sansPreuve: (id) => `${id} : aucune preuve déclarée (champ Contrôle ou Manuel)`,
      sansRegle: (id) => `${id} : exigence absente (champ Règle)`,
      severite: (id, v) => `${id} : sévérité « ${v} » inconnue (bloquant, avertissement ou indicatif)`,
      controleVide: (id) => `${id} : champ Contrôle vide`,
    },
    en: {
      doublon: (id) => `contract ${id} defined more than once`,
      inconnu: (id, c, connus) => `${id}: unknown check "${c}" (known: ${connus})`,
      sansPreuve: (id) => `${id}: no declared proof (Check or Manual field)`,
      sansRegle: (id) => `${id}: missing requirement (Rule field)`,
      severite: (id, v) => `${id}: unknown severity "${v}" (blocking, warning or advisory)`,
      controleVide: (id) => `${id}: empty Check field`,
    },
  }[lang === "en" ? "en" : "fr"];
  const connus = new Set(idsConnus);
  const vus = new Set();
  const erreurs = [];
  for (const k of contrats) {
    if (vus.has(k.id)) erreurs.push({ id: k.id, ligne: k.ligne, type: "doublon", message: T.doublon(k.id) });
    vus.add(k.id);
    if (k.controles && !k.controles.length) erreurs.push({ id: k.id, ligne: k.ligne, type: "controle-vide", message: T.controleVide(k.id) });
    for (const c of k.controles ?? []) {
      if (!connus.has(c)) erreurs.push({ id: k.id, ligne: k.ligne, type: "inconnu", message: T.inconnu(k.id, c, [...connus].join(", ")) });
    }
    if (k.severite === null) erreurs.push({ id: k.id, ligne: k.ligne, type: "severite", message: T.severite(k.id, k.severiteBrute) });
    if (k.forme === "section" && !k.regle) erreurs.push({ id: k.id, ligne: k.ligne, type: "sans-regle", message: T.sansRegle(k.id) });
    if (k.forme === "section" && k.controles === null && k.manuel === null) erreurs.push({ id: k.id, ligne: k.ligne, type: "sans-preuve", message: T.sansPreuve(k.id) });
  }
  return erreurs;
}

/** Identifiants connus du moteur : socle + `id` des contrôles déclarés par le projet (.drwil/ia-first.json → checks). */
export function controlesConnus(cfg) {
  const projet = (Array.isArray(cfg?.checks) ? cfg.checks : []).map((c) => c.id).filter(Boolean);
  return [...CONTROLES_SOCLE, ...projet];
}
