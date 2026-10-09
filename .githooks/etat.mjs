#!/usr/bin/env node
// État de gouvernance runtime : .drwil/state.json (docs/projets/gouvernance-attente-active.md).
//
// Seul lecteur de l'état : le contexte réinjecté à l'agent (hook SessionStart de
// Claude, `node .githooks/etat.mjs`) et, plus tard, le pre-commit l'importent.
// L'état est local (gitignoré) et ne contient que des références : le périmètre
// autorisé vit dans le bloc `cadrage` de la fiche active, versionnée.
// Fichier absent = CADRAGE neutre ; aucun état actif n'est jamais déduit.
// Un état invalide est ramené au neutre ET signalé : jamais masqué, jamais permissif.
import { existsSync, readFileSync } from "node:fs";
import { join, posix } from "node:path";
import { pathToFileURL } from "node:url";
import { lireBloc } from "./cadrage.mjs";

export const ACTIVITES = ["CADRAGE", "ATTENTE", "DEMANDE", "REALISATION", "PREUVES", "VERIFY", "CLOTURE"];

// Une activité à la fois ; retour à REALISATION après PREUVES ou VERIFY en échec ;
// abandon vers CADRAGE depuis toute activité (décision du 2026-10-09).
const SUIVANTES = {
  CADRAGE: ["ATTENTE"],
  ATTENTE: ["DEMANDE"],
  DEMANDE: ["REALISATION"],
  REALISATION: ["PREUVES"],
  PREUVES: ["VERIFY", "REALISATION"],
  VERIFY: ["CLOTURE", "REALISATION"],
  CLOTURE: ["CADRAGE"],
};

export const ETAT_NEUTRE = Object.freeze({ version: 1, activite: "CADRAGE", attente_active: null, demande_active: null, depuis: null });

const CHAMPS = new Set(Object.keys(ETAT_NEUTRE));
const DOSSIERS_FICHES = ["docs/projets/", "docs/projects/"];
const MODELE_RE = /^modele-|^model-/;
const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/;

export function transitionAutorisee(de, vers) {
  if (!ACTIVITES.includes(de) || !ACTIVITES.includes(vers) || de === vers) return false;
  return vers === "CADRAGE" || SUIVANTES[de].includes(vers);
}

/** Problèmes de l'état (messages en français, liste vide si valide). */
export function validerEtat(etat, racine) {
  if (typeof etat !== "object" || etat === null || Array.isArray(etat)) return ["state.json doit contenir un objet JSON"];
  const problemes = [];
  for (const cle of Object.keys(etat)) if (!CHAMPS.has(cle)) problemes.push(`champ inconnu « ${cle} » (l'état ne contient que des références)`);
  if (etat.version !== 1) problemes.push("version : 1 attendu");
  if (!ACTIVITES.includes(etat.activite)) {
    problemes.push(`activité inconnue « ${etat.activite} » (attendu : ${ACTIVITES.join(", ")})`);
  } else if (etat.activite === "CADRAGE") {
    if (etat.attente_active !== null || etat.demande_active !== null) problemes.push("en CADRAGE, aucune attente ni demande active");
  } else if (etat.attente_active === null || etat.attente_active === undefined) {
    problemes.push(`${etat.activite} : attente active requise`);
  }
  if (etat.attente_active !== null && etat.attente_active !== undefined) problemes.push(...validerAttente(etat.attente_active, racine));
  if (etat.demande_active !== null && typeof etat.demande_active !== "string") problemes.push("demande_active : chaîne ou null attendu");
  if (etat.depuis !== null && !(typeof etat.depuis === "string" && ISO_RE.test(etat.depuis) && !Number.isNaN(Date.parse(etat.depuis)))) {
    problemes.push("depuis : horodatage ISO 8601 ou null attendu");
  }
  return problemes;
}

function validerAttente(attente, racine) {
  if (typeof attente !== "string") return ["attente_active : chemin de fiche ou null attendu"];
  const chemin = posix.normalize(attente.replace(/\\/g, "/"));
  const dossier = DOSSIERS_FICHES.find((d) => chemin.startsWith(d));
  if (!dossier || !chemin.endsWith(".md")) return [`attente_active : fiche .md de ${DOSSIERS_FICHES.join(" ou ")} attendue (« ${attente} »)`];
  if (MODELE_RE.test(posix.basename(chemin))) return [`attente_active : « ${attente} » est un modèle, pas une fiche de chantier`];
  if (!existsSync(join(racine, chemin))) return [`attente_active : fiche « ${attente} » introuvable`];
  return [];
}

/** `{ etat, source: "absent" | "fichier", problemes }` ; un état invalide est remplacé par le neutre. */
export function lireEtat(racine) {
  const fichier = join(racine, ".drwil", "state.json");
  if (!existsSync(fichier)) return { etat: { ...ETAT_NEUTRE }, source: "absent", problemes: [] };
  let etat;
  try {
    etat = JSON.parse(readFileSync(fichier, "utf8"));
  } catch {
    return { etat: { ...ETAT_NEUTRE }, source: "fichier", problemes: ["state.json illisible (JSON invalide)"] };
  }
  const problemes = validerEtat(etat, racine);
  return problemes.length ? { etat: { ...ETAT_NEUTRE }, source: "fichier", problemes } : { etat, source: "fichier", problemes };
}

const TEXTES = {
  fr: {
    entete: "[drwil] État de gouvernance, lu sur disque (.drwil/state.json) — ne pas le déduire de la conversation.",
    absent: "(.drwil/state.json absent : état neutre)",
    invalide: "⚠ État invalide, traité comme CADRAGE neutre :",
    activite: (a) => `Activité : ${a}`,
    attente: (a) => `Attente active : ${a ?? "aucune attente active"}`,
    demande: (d) => `Demande active : ${d ?? "aucune"}`,
    perimetre: "Périmètre autorisé (bloc cadrage de la fiche) :",
    sansPerimetre: "  (aucun bloc cadrage : aucun fichier de code autorisé)",
    regle: (r) => `Règle : ${r}`,
    pied: "L'agent ne modifie jamais .drwil/state.json : changer d'activité est une décision humaine.",
    regles: {
      CADRAGE: "lire, analyser, cadrer ; ne modifier aucun fichier de code.",
      ATTENTE: "formaliser l'attente dans sa fiche ; ne modifier aucun fichier de code.",
      DEMANDE: "expliciter la demande de réalisation ; ne modifier encore aucun fichier de code.",
      REALISATION: "réaliser l'attente, en ne modifiant que les fichiers du périmètre ci-dessus.",
      PREUVES: "produire les preuves et lancer les contrôles ; un correctif demande de revenir en REALISATION.",
      VERIFY: "lancer la vérification drwil ; seul son verdict compte, pas l'affirmation de l'agent.",
      CLOTURE: "clore la fiche (statut, reprise), puis revenir en CADRAGE.",
    },
  },
  en: {
    entete: "[drwil] Governance state, read from disk (.drwil/state.json) — do not infer it from the conversation.",
    absent: "(.drwil/state.json missing: neutral state)",
    invalide: "⚠ Invalid state, treated as neutral CADRAGE:",
    activite: (a) => `Activity: ${a}`,
    attente: (a) => `Active expectation: ${a ?? "none"}`,
    demande: (d) => `Active request: ${d ?? "none"}`,
    perimetre: "Allowed scope (cadrage block of the fiche):",
    sansPerimetre: "  (no cadrage block: no code file allowed)",
    regle: (r) => `Rule: ${r}`,
    pied: "The agent never edits .drwil/state.json: changing activity is a human decision.",
    regles: {
      CADRAGE: "read, analyse, frame; do not modify any code file.",
      ATTENTE: "write down the expectation in its fiche; do not modify any code file.",
      DEMANDE: "make the implementation request explicit; do not modify any code file yet.",
      REALISATION: "implement the expectation, modifying only the files in the scope above.",
      PREUVES: "produce evidence and run the checks; a fix means going back to REALISATION.",
      VERIFY: "run drwil verification; only its verdict counts, not the agent's claim.",
      CLOTURE: "close the fiche (status, hand-off), then go back to CADRAGE.",
    },
  },
};

function langue(racine) {
  try {
    return JSON.parse(readFileSync(join(racine, ".drwil", "ia-first.json"), "utf8")).lang === "en" ? "en" : "fr";
  } catch {
    return "fr";
  }
}

/** Contexte lisible à réinjecter à l'agent, construit uniquement depuis le disque. */
export function contexte(lu, racine) {
  const T = TEXTES[langue(racine)];
  const { etat, source, problemes } = lu;
  const lignes = [T.entete];
  if (source === "absent") lignes.push(T.absent);
  if (problemes.length) lignes.push(T.invalide, ...problemes.map((p) => `  - ${p}`));
  lignes.push(T.activite(etat.activite));
  let attente = etat.attente_active;
  let motifs = null;
  if (attente) {
    try {
      const texte = readFileSync(join(racine, attente), "utf8");
      const titre = /^#\s+(.+)$/m.exec(texte)?.[1]?.trim();
      if (titre) attente = `${attente} — ${titre}`;
      motifs = lireBloc(texte).motifs;
    } catch {
      motifs = [];
    }
  }
  lignes.push(T.attente(attente), T.demande(etat.demande_active));
  if (motifs) lignes.push(T.perimetre, ...(motifs.length ? motifs.map((m) => `  - ${m}`) : [T.sansPerimetre]));
  lignes.push(T.regle(T.regles[etat.activite]), T.pied);
  return lignes.join("\n");
}

// Exécution directe : `node .githooks/etat.mjs [--json]`. Ne casse jamais la session de l'agent.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const racine = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  try {
    const lu = lireEtat(racine);
    console.log(process.argv.includes("--json") ? JSON.stringify(lu, null, 2) : contexte(lu, racine));
  } catch (e) {
    console.log(`[drwil] état de gouvernance illisible : ${e.message}`);
  }
}
