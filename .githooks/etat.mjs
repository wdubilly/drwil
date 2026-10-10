#!/usr/bin/env node
// État de gouvernance runtime : .drwil/state.json (docs/ia-first.md, « État de gouvernance »).
//
// Seul lecteur et seul écrivain de l'état : le contexte réinjecté à l'agent
// (`node .githooks/etat.mjs`, hook SessionStart de Claude), les transitions
// (`node .githooks/etat.mjs passer <ACTIVITE>`, `drwil etat`) et, plus tard, le
// pre-commit l'importent. Aucun outil d'agent n'est requis.
// L'état est local (gitignoré) et ne contient que des références : le périmètre
// autorisé vit dans le bloc `cadrage` de la fiche active, versionnée.
// Fichier absent = CADRAGE neutre ; aucun état actif n'est jamais déduit.
// Un état invalide est ramené au neutre ET signalé : jamais masqué, jamais permissif.
// Clore (VERIFY → CLOTURE) exige l'évidence de `drwil verify --evidence` : ce
// fichier la lit, il n'exécute aucun contrôle (un seul moteur, ADR-003).
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
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

// fusion_autorisee : absent de l'état neutre, posé seulement par un lancement humain (`lancer`).
const CHAMPS = new Set([...Object.keys(ETAT_NEUTRE), "fusion_autorisee"]);
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
  if (etat.attente_active !== null && etat.attente_active !== undefined) problemes.push(...validerAttente(etat.attente_active, racine, etat.activite));
  if (etat.demande_active !== null && typeof etat.demande_active !== "string") problemes.push("demande_active : chaîne ou null attendu");
  if (etat.fusion_autorisee !== undefined && typeof etat.fusion_autorisee !== "boolean") problemes.push("fusion_autorisee : booléen attendu");
  else if (etat.fusion_autorisee === true && etat.activite === "CADRAGE") problemes.push("fusion_autorisee : jamais en CADRAGE (aucun chantier en cours)");
  if (etat.depuis !== null && !(typeof etat.depuis === "string" && ISO_RE.test(etat.depuis) && !Number.isNaN(Date.parse(etat.depuis)))) {
    problemes.push("depuis : horodatage ISO 8601 ou null attendu");
  }
  return problemes;
}

function validerAttente(attente, racine, activite) {
  if (typeof attente !== "string") return ["attente_active : chemin de fiche ou null attendu"];
  const chemin = posix.normalize(attente.replace(/\\/g, "/"));
  const dossier = DOSSIERS_FICHES.find((d) => chemin.startsWith(d));
  if (!dossier || !chemin.endsWith(".md")) return [`attente_active : fiche .md de ${DOSSIERS_FICHES.join(" ou ")} attendue (« ${attente} »)`];
  if (MODELE_RE.test(posix.basename(chemin))) return [`attente_active : « ${attente} » est un modèle, pas une fiche de chantier`];
  // En CLOTURE, la recette « Clôturer » supprime la fiche : son absence est l'issue normale, et
  // la refuser rendrait l'état invalide au moment même de revenir en CADRAGE.
  if (!existsSync(join(racine, chemin)) && activite !== "CLOTURE") return [`attente_active : fiche « ${attente} » introuvable`];
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

// Transitions qui ouvrent des droits : réservées à un humain en mode « humain » (défaut).
// Les autres resserrent les droits ou reviennent en arrière. Clore n'en fait plus partie
// (docs/ia-first.md, « Lancer et clore ») : clore retire des droits, exige l'évidence de
// verify, et l'acceptation reste la fusion de la PR, humaine.
const HUMAINES = new Set(["CADRAGE>ATTENTE", "DEMANDE>REALISATION"]);

export function exigeHumain(de, vers, mode) {
  return mode !== "agent" && HUMAINES.has(`${de}>${vers}`);
}

const RELANCER = "relancer `npx drwil verify --evidence`";

/**
 * Dernière évidence de verify (.drwil/evidence/verify-*.json, hors git) : `{ ok: true }`
 * si elle autorise la clôture, sinon `{ ok: false, raison }`. Verdict pass ou attested,
 * sur le commit HEAD, arbre propre au moment de verify et maintenant : sinon, ce qui
 * est clos ne serait pas ce qui a été vérifié.
 */
export function preuveVerify(racine) {
  const dossier = join(racine, ".drwil", "evidence");
  // Horodatage ISO dans le nom : l'ordre alphabétique est l'ordre chronologique.
  const noms = existsSync(dossier) ? readdirSync(dossier).filter((n) => /^verify-.+\.json$/.test(n)).sort() : [];
  if (!noms.length) return { ok: false, raison: `aucune évidence de verify : lancer \`npx drwil verify --evidence\`` };
  const nom = noms.at(-1);
  let ev;
  try {
    ev = JSON.parse(readFileSync(join(dossier, nom), "utf8"));
  } catch {
    return { ok: false, raison: `évidence ${nom} illisible : ${RELANCER}` };
  }
  const git = (...args) => {
    const r = spawnSync("git", args, { cwd: racine, encoding: "utf8" });
    return r.status === 0 ? r.stdout.trim() : null;
  };
  const head = git("rev-parse", "HEAD");
  if (!head) return { ok: false, raison: "commit HEAD introuvable : la clôture se juge sur un travail commité" };
  if (ev.commit !== head) return { ok: false, raison: `évidence ${nom} produite sur un autre commit que HEAD : ${RELANCER}` };
  if (ev.dirtyWorktree !== false || git("status", "--porcelain") !== "") {
    return { ok: false, raison: `arbre modifié (au moment de verify ou depuis) : commiter puis ${RELANCER}` };
  }
  if (ev.status === "pass" || ev.status === "attested") return { ok: true };
  if (ev.status === "manual") {
    return { ok: false, raison: "verdict MANUAL : un humain atteste (`npx drwil attest <ID>`), puis " + RELANCER };
  }
  if (ev.status === "fail" || ev.status === "error") {
    return { ok: false, raison: `verdict ${ev.status.toUpperCase()} : revenir en REALISATION (\`node .githooks/etat.mjs passer REALISATION\`) pour corriger` };
  }
  return { ok: false, raison: `évidence ${nom} sans verdict reconnu : ${RELANCER}` };
}

const STATUT_LIGNE_RE = /^\*\*(?:Statut|Status)\*\*\s*:\s*(.*)$/;

/**
 * « terminee », « reference » ou « ouverte » — seule définition, partagée avec check-docs.mjs.
 * Seul un marqueur explicite en tête du statut compte : un mot cherché n'importe où (« essai réel
 * fait », « fait (lot 1) » d'une fiche à plusieurs lots) donnait de faux « terminée ».
 */
export function statutFiche(texte) {
  const statut = texte.split(/\r?\n/).slice(0, 15).map((l) => STATUT_LIGNE_RE.exec(l)).find(Boolean)?.[1] ?? "";
  if (/^(?:terminé\s+le|done\s+on)\s+\d{4}-\d{2}-\d{2}\b/i.test(statut)) return "terminee";
  if (/^(?:référence|reference)\b/i.test(statut)) return "reference";
  return "ouverte";
}
const LANCABLE_DEPUIS = new Set(["CADRAGE", "ATTENTE", "DEMANDE"]);

const INDEX_DEFAUT = ["docs/projets/en-attente.md", "docs/projects/pending.md"];
const PRIORITE_DEFAUT = 2;

/** Priorité de chaque fiche citée par un sujet ouvert de l'index commité ([P0] à [P3], [P2] sans tag). */
function prioritesIndex(racine) {
  const priorites = new Map();
  for (const chemin of [config(racine).dirs?.index, ...INDEX_DEFAUT].filter(Boolean)) {
    const r = spawnSync("git", ["show", `HEAD:${chemin}`], { cwd: racine, encoding: "utf8" });
    if (r.status !== 0) continue;
    // Un sujet : sa ligne « - [ ] » et ses lignes de suite ; un point coché d'une fiche à plusieurs
    // lots ne dit rien de la priorité du travail restant.
    for (const sujet of r.stdout.split(/\r?\n(?=\s*- \[)/)) {
      if (!/^\s*- \[ \]/.test(sujet)) continue;
      const p = /\[P([0-3])\]/.exec(sujet)?.[1];
      for (const m of sujet.matchAll(/`((?:docs\/projets|docs\/projects)\/[^`]+\.md)`/g)) {
        if (!priorites.has(m[1])) priorites.set(m[1], p === undefined ? PRIORITE_DEFAUT : Number(p));
      }
    }
    break;
  }
  return priorites;
}

/** `[décision]` encore ouvertes dans la section « Points à trancher » (« Points to decide »). */
function decisionsOuvertes(texte) {
  let dans = false;
  let n = 0;
  for (const ligne of texte.split(/\r?\n/)) {
    if (/^##\s/.test(ligne)) dans = /^##\s*(\d+\.\s*)?(Points à trancher|Points to decide)\b/i.test(ligne);
    else if (dans && /^\s*-\s*\[(décision|decision)\]/i.test(ligne)) n++;
  }
  return n;
}

/**
 * Fiches qu'on peut lancer : fiches de docs/projets/ (ou docs/projects/), hors modèles, non
 * terminées, dont le bloc `cadrage` existe dans HEAD — le cadrage validé est le cadrage commité,
 * comme pour la barrière. `[{ chemin, titre, priorite, decisions, prete }]` : prêtes d'abord (aucune
 * décision ouverte), puis par priorité de l'index, puis par chemin.
 */
export function fichesCadrees(racine) {
  const priorites = prioritesIndex(racine);
  const fiches = [];
  for (const dossier of DOSSIERS_FICHES) {
    const abs = join(racine, dossier);
    if (!existsSync(abs)) continue;
    for (const nom of readdirSync(abs).sort()) {
      const chemin = dossier + nom;
      if (!nom.endsWith(".md") || MODELE_RE.test(nom)) continue;
      const r = spawnSync("git", ["show", `HEAD:${chemin}`], { cwd: racine, encoding: "utf8" });
      if (r.status !== 0 || !lireBloc(r.stdout).motifs.length) continue;
      // Une fiche de référence (mécanique du kit) garde son cadrage sans être un chantier à lancer.
      if (statutFiche(r.stdout) !== "ouverte") continue;
      const decisions = decisionsOuvertes(r.stdout);
      const priorite = priorites.get(chemin) ?? PRIORITE_DEFAUT;
      fiches.push({ chemin, titre: /^#\s+(.+)$/m.exec(r.stdout)?.[1]?.trim() ?? chemin, priorite: `P${priorite}`, decisions, prete: decisions === 0 });
    }
  }
  return fiches.sort((a, b) => Number(b.prete) - Number(a.prete) || a.priorite.localeCompare(b.priorite) || a.chemin.localeCompare(b.chemin));
}

/**
 * Lance un chantier en un geste : depuis CADRAGE, ATTENTE ou DEMANDE, passe directement en
 * REALISATION sur une fiche cadrée. En mode « humain » (défaut), `humain` doit être vrai : il
 * l'est seulement pour une réponse humaine à un sondage lue par le hook de l'outil, ou pour un
 * choix fait dans un terminal interactif. `{ code: 0 | 1, message }`.
 */
export function lancer(racine, fiche, { humain = false, demande, fusion = false, maintenant = new Date().toISOString() } = {}) {
  const lu = lireEtat(racine);
  const de = lu.etat.activite;
  if (!LANCABLE_DEPUIS.has(de)) return { code: 1, message: `lancement refusé : activité ${de} (lancer se fait depuis CADRAGE, ATTENTE ou DEMANDE)` };
  if (config(racine).transitions !== "agent" && !humain) {
    return { code: 1, message: "lancement refusé : c'est une décision humaine (sondage `/drwil-lancer`, ou terminal interactif)" };
  }
  const chemin = posix.normalize(String(fiche ?? "").trim().replace(/\\/g, "/"));
  if (!fichesCadrees(racine).some((f) => f.chemin === chemin)) {
    return { code: 1, message: `lancement refusé : « ${fiche} » n'est pas une fiche cadrée (bloc cadrage commité, fiche non terminée)` };
  }
  const etat = { version: 1, activite: "REALISATION", attente_active: chemin, demande_active: demande ?? null, depuis: maintenant };
  // Autoriser la fusion est une décision d'acceptation : humaine seulement, même en mode agent.
  if (fusion === true && humain) etat.fusion_autorisee = true;
  const problemes = validerEtat(etat, racine);
  if (problemes.length) return { code: 1, message: `lancement refusé : ${problemes.join(" ; ")}` };
  mkdirSync(join(racine, ".drwil"), { recursive: true });
  writeFileSync(join(racine, ".drwil", "state.json"), JSON.stringify(etat, null, 2) + "\n");
  return { code: 0, message: `${de} → REALISATION (lancé : ${chemin})${etat.fusion_autorisee ? " — fusion automatique autorisée" : ""}` };
}

/** Nouvel état après la transition `vers`, ou `{ erreur }` ; n'écrit rien. */
export function preparerTransition(lu, vers, { fiche, demande, maintenant }, racine) {
  const de = lu.etat.activite;
  if (!transitionAutorisee(de, vers)) {
    const permises = ACTIVITES.filter((a) => transitionAutorisee(de, a)).join(", ");
    return { erreur: `transition ${de} → ${vers} interdite (depuis ${de} : ${permises})` };
  }
  if (fiche !== undefined && vers !== "ATTENTE") return { erreur: "--fiche ne sert qu'à ouvrir une attente (CADRAGE → ATTENTE)" };
  let etat;
  if (vers === "CADRAGE") {
    etat = { ...ETAT_NEUTRE, depuis: maintenant };
  } else if (vers === "ATTENTE") {
    if (!fiche) return { erreur: "ouvrir une attente exige --fiche <docs/projets/….md>" };
    etat = { version: 1, activite: "ATTENTE", attente_active: posix.normalize(fiche.replace(/\\/g, "/")), demande_active: demande ?? null, depuis: maintenant };
  } else {
    etat = { ...lu.etat, activite: vers, demande_active: demande ?? lu.etat.demande_active, depuis: maintenant };
  }
  const problemes = validerEtat(etat, racine);
  return problemes.length ? { erreur: problemes.join(" ; ") } : { etat };
}

/**
 * Applique une transition et écrit l'état. `{ code: 0 | 1, message }`.
 * `confirmer(question)` n'est appelé que si un humain est requis, et seulement devant
 * un terminal interactif : sans terminal, une transition humaine est refusée.
 */
export async function passer(racine, { vers, fiche, demande }, { tty = false, confirmer, maintenant = new Date().toISOString() } = {}) {
  const lu = lireEtat(racine);
  const reprise = lu.problemes.length ? `état précédent invalide, repris depuis le neutre (${lu.problemes.join(" ; ")}) ; ` : "";
  const prep = preparerTransition(lu, vers, { fiche, demande, maintenant }, racine);
  if (prep.erreur) return { code: 1, message: reprise + prep.erreur };
  const de = lu.etat.activite;
  // Avant la confirmation humaine : inutile de demander une décision que la preuve refuse.
  // Vaut aussi en mode agent : le réglage « transitions » dit qui décide, pas sur quoi.
  if (vers === "CLOTURE") {
    const preuve = preuveVerify(racine);
    if (!preuve.ok) return { code: 1, message: `${reprise}clôture refusée : ${preuve.raison}` };
  }
  const ficheActive = lu.etat.attente_active && join(racine, lu.etat.attente_active);
  if (de === "CLOTURE" && vers === "CADRAGE" && ficheActive && existsSync(ficheActive) && statutFiche(readFileSync(ficheActive, "utf8")) === "terminee") {
    return { code: 1, message: `${reprise}retour en CADRAGE refusé : ${lu.etat.attente_active} se dit terminée mais est encore là — la condenser dans docs/projets/journal.md, la supprimer et retirer sa ligne de l'index (recette « Clôturer »)` };
  }
  if (exigeHumain(de, vers, config(racine).transitions)) {
    if (!tty || typeof confirmer !== "function") {
      return { code: 1, message: `${reprise}${de} → ${vers} est une décision humaine : terminal interactif requis (réglage « transitions » : humain)` };
    }
    if (!(await confirmer(`Pour passer de ${de} à ${vers}, retapez l'activité visée (${vers}) : `))) {
      return { code: 1, message: "confirmation refusée : état inchangé" };
    }
  }
  mkdirSync(join(racine, ".drwil"), { recursive: true });
  writeFileSync(join(racine, ".drwil", "state.json"), JSON.stringify(prep.etat, null, 2) + "\n");
  return { code: 0, message: `${reprise}${de} → ${vers}` };
}

const TEXTES = {
  fr: {
    entete: "[drwil] État de gouvernance, lu sur disque (.drwil/state.json) — ne pas le déduire de la conversation.",
    absent: "(.drwil/state.json absent : état neutre)",
    desactivee: "[drwil] Gouvernance désactivée (réglage « barriere » : off dans .drwil/ia-first.json) : aucune activité ni périmètre à suivre.",
    invalide: "⚠ État invalide, traité comme CADRAGE neutre :",
    activite: (a) => `Activité : ${a}`,
    attente: (a) => `Attente active : ${a ?? "aucune attente active"}`,
    demande: (d) => `Demande active : ${d ?? "aucune"}`,
    fusion: "Fusion automatique autorisée au lancement : en CLOTURE, après verify PASS et le push de la clôture, programmer `gh pr merge --auto --merge` (GitHub fusionne après les checks exigés).",
    perimetre: "Périmètre autorisé (bloc cadrage de la fiche) :",
    sansPerimetre: "  (aucun bloc cadrage : aucun fichier de code autorisé)",
    ficheSupprimee: "fiche supprimée (clôture)",
    regle: (r) => `Règle : ${r}`,
    rappel: (a, f, n) => `[drwil] Rappel : ${a}${f ? ` · ${f}` : " · aucune attente active"}${n === null ? "" : ` · périmètre : ${n} fichier(s) ou motif(s)`} (relire avec \`node .githooks/etat.mjs\`).`,
    rappelInvalide: "[drwil] Rappel : état invalide, traité comme CADRAGE neutre (détail : `node .githooks/etat.mjs`).",
    pied: "Ne jamais écrire .drwil/state.json à la main. Lancer un chantier : `/drwil-lancer` (sondage) ou `node .githooks/etat.mjs lancer` dans un terminal — décision humaine, sauf réglage « transitions » : agent. Changer d'activité : `node .githooks/etat.mjs passer <ACTIVITE>` ; clore est libre sur évidence de verify valide.",
    regles: {
      CADRAGE: "lire, analyser, cadrer ; ne modifier aucun fichier de code.",
      ATTENTE: "formaliser l'attente dans sa fiche ; ne modifier aucun fichier de code.",
      DEMANDE: "expliciter la demande de réalisation ; ne modifier encore aucun fichier de code.",
      REALISATION: "réaliser l'attente, en ne modifiant que les fichiers du périmètre (bloc cadrage de la fiche active).",
      PREUVES: "produire les preuves et lancer les contrôles ; un correctif demande de revenir en REALISATION.",
      VERIFY: "lancer `npx drwil verify --evidence` ; seul son verdict compte, pas l'affirmation de l'agent. PASS ou ATTESTED : clore ; FAIL ou ERROR : revenir en REALISATION ; MANUAL : attestation humaine (`npx drwil attest`), puis relancer.",
      CLOTURE: "fiche entièrement terminée : la condenser dans le journal puis la supprimer ; sinon mettre à jour statut et reprise ; puis revenir en CADRAGE.",
    },
  },
  en: {
    entete: "[drwil] Governance state, read from disk (.drwil/state.json) — do not infer it from the conversation.",
    absent: "(.drwil/state.json missing: neutral state)",
    desactivee: "[drwil] Governance disabled (\"barriere\" setting: off in .drwil/ia-first.json): no activity or scope to follow.",
    invalide: "⚠ Invalid state, treated as neutral CADRAGE:",
    activite: (a) => `Activity: ${a}`,
    attente: (a) => `Active expectation: ${a ?? "none"}`,
    demande: (d) => `Active request: ${d ?? "none"}`,
    fusion: "Automatic merge authorised at start: in CLOTURE, after verify PASS and pushing the closing commit, schedule `gh pr merge --auto --merge` (GitHub merges once the required checks pass).",
    perimetre: "Allowed scope (cadrage block of the fiche):",
    sansPerimetre: "  (no cadrage block: no code file allowed)",
    ficheSupprimee: "fiche deleted (closing)",
    regle: (r) => `Rule: ${r}`,
    rappel: (a, f, n) => `[drwil] Reminder: ${a}${f ? ` · ${f}` : " · no active expectation"}${n === null ? "" : ` · scope: ${n} file(s) or pattern(s)`} (read again with \`node .githooks/etat.mjs\`).`,
    rappelInvalide: "[drwil] Reminder: invalid state, treated as neutral CADRAGE (details: `node .githooks/etat.mjs`).",
    pied: "Never write .drwil/state.json by hand. Start a chantier: `/drwil-lancer` (poll) or `node .githooks/etat.mjs lancer` in a terminal — a human decision, unless the \"transitions\" setting is agent. Change activity: `node .githooks/etat.mjs passer <ACTIVITE>`; closing is free on valid verify evidence.",
    regles: {
      CADRAGE: "read, analyse, frame; do not modify any code file.",
      ATTENTE: "write down the expectation in its fiche; do not modify any code file.",
      DEMANDE: "make the implementation request explicit; do not modify any code file yet.",
      REALISATION: "implement the expectation, modifying only the files in the scope (cadrage block of the active fiche).",
      PREUVES: "produce evidence and run the checks; a fix means going back to REALISATION.",
      VERIFY: "run `npx drwil verify --evidence`; only its verdict counts, not the agent's claim. PASS or ATTESTED: close; FAIL or ERROR: go back to REALISATION; MANUAL: human attestation (`npx drwil attest`), then run it again.",
      CLOTURE: "fiche fully finished: condense it into the journal, then delete it; otherwise update status and hand-off; then go back to CADRAGE.",
    },
  },
};

function config(racine) {
  try {
    return JSON.parse(readFileSync(join(racine, ".drwil", "ia-first.json"), "utf8")) ?? {};
  } catch {
    return {};
  }
}

const langue = (racine) => (config(racine).lang === "en" ? "en" : "fr");

/** `barriere: off` coupe toute la gouvernance (barrière, trailer, contexte) : retrait sans rien supprimer. */
export const gouvernanceDesactivee = (racine) => config(racine).barriere === "off";

/** Contexte lisible à réinjecter à l'agent, construit uniquement depuis le disque. */
export function contexte(lu, racine) {
  const T = TEXTES[langue(racine)];
  if (gouvernanceDesactivee(racine)) return T.desactivee;
  const { etat, source, problemes } = lu;
  const lignes = [T.entete];
  if (source === "absent") lignes.push(T.absent);
  if (problemes.length) lignes.push(T.invalide, ...problemes.map((p) => `  - ${p}`));
  lignes.push(T.activite(etat.activite));
  let attente = etat.attente_active;
  let motifs = null;
  if (attente && !existsSync(join(racine, attente))) {
    attente = `${attente} — ${T.ficheSupprimee}`;
  } else if (attente) {
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
  if (etat.fusion_autorisee === true) lignes.push(T.fusion);
  if (motifs) lignes.push(T.perimetre, ...(motifs.length ? motifs.map((m) => `  - ${m}`) : [T.sansPerimetre]));
  lignes.push(T.regle(T.regles[etat.activite]), T.pied);
  return lignes.join("\n");
}

/** Rappel court (deux lignes) de l'état, pour l'injecter à chaque message ; null si la gouvernance est désactivée. */
export function rappelCourt(lu, racine) {
  const T = TEXTES[langue(racine)];
  if (gouvernanceDesactivee(racine)) return null;
  const { etat, problemes } = lu;
  const tete = problemes.length ? T.rappelInvalide : (() => {
    let n = null;
    if (etat.attente_active && !existsSync(join(racine, etat.attente_active))) {
      return T.rappel(etat.activite, `${etat.attente_active} (${T.ficheSupprimee})`, null);
    }
    if (etat.attente_active) {
      try {
        n = lireBloc(readFileSync(join(racine, etat.attente_active), "utf8")).motifs.length;
      } catch {
        n = 0;
      }
    }
    return T.rappel(etat.activite, etat.attente_active, n);
  })();
  return `${tete}\n${T.regle(T.regles[etat.activite])}`;
}

const FICHIER_RAPPEL = [".drwil", "rappel.json"];

/**
 * Le rappel seulement s'il a changé depuis le dernier injecté (empreinte dans .drwil/rappel.json,
 * local comme l'état) ; null sinon. Empreinte absente ou illisible : le rappel est injecté.
 */
export function rappelSiChange(racine) {
  const texte = rappelCourt(lireEtat(racine), racine);
  if (texte === null) return null;
  const empreinte = createHash("sha256").update(texte).digest("hex");
  const fichier = join(racine, ...FICHIER_RAPPEL);
  try {
    if (JSON.parse(readFileSync(fichier, "utf8")).empreinte === empreinte) return null;
  } catch {}
  try {
    mkdirSync(join(racine, ".drwil"), { recursive: true });
    writeFileSync(fichier, JSON.stringify({ empreinte }) + "\n");
  } catch {}
  return texte;
}

/** Valeur de l'option `--nom valeur` dans `args`, ou undefined. */
function option(args, nom) {
  const i = args.indexOf(nom);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : undefined;
}

/** Point d'entrée commun à `node .githooks/etat.mjs` et à `drwil etat`. Rend le code de sortie. */
export async function principal(args, racine) {
  if (args[0] === "fiches") {
    const fiches = fichesCadrees(racine);
    if (args.includes("--json")) console.log(JSON.stringify(fiches, null, 2));
    else console.log(fiches.length ? fiches.map((f, i) => `${i + 1}. ${f.chemin} — ${f.titre}`).join("\n") : "(aucune fiche cadrée : bloc cadrage commité et fiche non terminée)");
    return 0;
  }
  if (args[0] === "lancer") {
    const fiches = fichesCadrees(racine);
    const tty = Boolean(process.stdin.isTTY && process.stdout.isTTY);
    let choix = args[1];
    let humain = false;
    let fusion = false;
    if (tty) {
      // Un terminal interactif : l'humain choisit lui-même (jamais de choix présélectionné).
      const { createInterface } = await import("node:readline/promises");
      const rl = createInterface({ input: process.stdin, output: process.stdout });
      try {
        if (!choix) {
          console.log(fiches.map((f, i) => `${i + 1}. ${f.chemin} — ${f.titre} [${f.priorite}${f.prete ? "" : ` · non prête : ${f.decisions} décision(s) à trancher`}]`).join("\n"));
          const n = Number((await rl.question("Numéro de la fiche à lancer : ")).trim());
          choix = fiches[n - 1]?.chemin;
        }
        humain = choix !== undefined && (await rl.question(`Lancer ${choix} ? Retapez LANCER : `)).trim() === "LANCER";
        if (humain) fusion = (await rl.question("Fusion automatique à la fin du chantier ? Retapez FUSION, sinon Entrée : ")).trim() === "FUSION";
      } finally {
        rl.close();
      }
      if (!humain) {
        console.error("✗ lancement non confirmé : état inchangé");
        return 1;
      }
    }
    const r = lancer(racine, choix, { humain, fusion, demande: option(args, "--demande") });
    if (r.code === 0) console.log(`✓ ${r.message}\n\n${contexte(lireEtat(racine), racine)}`);
    else console.error(`✗ ${r.message}`);
    return r.code;
  }
  if (args[0] === "rappel") {
    // Hook de saisie (Claude Code : UserPromptSubmit) : n'écrit que si l'état a changé, ne casse jamais une saisie.
    try {
      const texte = rappelSiChange(racine);
      if (texte) console.log(texte);
    } catch {}
    return 0;
  }
  if (args[0] !== "passer") {
    // Lecture : ne casse jamais le démarrage de session d'un agent.
    try {
      const lu = lireEtat(racine);
      console.log(args.includes("--json") ? JSON.stringify(lu, null, 2) : contexte(lu, racine));
    } catch (e) {
      console.log(`[drwil] état de gouvernance illisible : ${e.message}`);
    }
    return 0;
  }
  const vers = args[1];
  if (!vers || vers.startsWith("--")) {
    console.error(`usage : node .githooks/etat.mjs passer <${ACTIVITES.join("|")}> [--fiche <docs/projets/….md>] [--demande <texte>] | lancer [<fiche>] | fiches [--json] | rappel`);
    return 2;
  }
  const tty = Boolean(process.stdin.isTTY && process.stdout.isTTY);
  const confirmer = async (question) => {
    const { createInterface } = await import("node:readline/promises");
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    try {
      return (await rl.question(question)).trim() === vers;
    } finally {
      rl.close();
    }
  };
  const r = await passer(racine, { vers, fiche: option(args, "--fiche"), demande: option(args, "--demande") }, { tty, confirmer });
  if (r.code === 0) console.log(`✓ ${r.message}\n\n${contexte(lireEtat(racine), racine)}`);
  else console.error(`✗ ${r.message}`);
  return r.code;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  // Racine = dossier courant, comme les autres hooks : aucune variable propre à un outil.
  process.exitCode = await principal(process.argv.slice(2), process.cwd());
}
