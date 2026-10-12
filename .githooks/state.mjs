#!/usr/bin/env node
// État de gouvernance runtime : .drwil/state.json (docs/ia-first.md, « État de gouvernance »).
//
// Seul lecteur et seul écrivain de l'état : le contexte réinjecté à l'agent
// (`node .githooks/state.mjs`, hook SessionStart de Claude), les transitions
// (`node .githooks/state.mjs move <ACTIVITE>`, `drwil etat`) et, plus tard, le
// pre-commit l'importent. Aucun outil d'agent n'est requis.
// L'état est local (gitignoré) et ne contient que des références : le périmètre
// autorisé vit dans le bloc `cadrage` de la fiche active, versionnée.
// Fichier absent = SCOPING neutre ; aucun état actif n'est jamais déduit.
// Un état invalide est ramené au neutre ET signalé : jamais masqué, jamais permissif.
// Clore (VERIFY → CLOSING) exige l'évidence de `drwil verify --evidence` : ce
// fichier la lit, il n'exécute aucun contrôle (un seul moteur, .githooks/engine.mjs).
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, posix } from "node:path";
import { pathToFileURL } from "node:url";
import { config, DOSSIERS_FICHES, fichesCadrees, MODELE_RE, statutFiche } from "./briefs.mjs";
import { contexte, rappelCourt } from "./state-texts.mjs";

// Interface inchangée pour les autres hooks, la CLI et les outils : tout ce qu'exportait ce fichier
// avant son découpage reste importable d'ici.
export { fichesCadrees, statutFiche } from "./briefs.mjs";
export { contexte, gouvernanceDesactivee, rappelCourt } from "./state-texts.mjs";

export const ACTIVITES = ["SCOPING", "EXPECTATION", "REQUEST", "BUILD", "EVIDENCE", "VERIFY", "CLOSING"];

// Une activité à la fois ; retour à BUILD après EVIDENCE ou VERIFY en échec ;
// abandon vers SCOPING depuis toute activité.
const SUIVANTES = {
  SCOPING: ["EXPECTATION"],
  EXPECTATION: ["REQUEST"],
  REQUEST: ["BUILD"],
  BUILD: ["EVIDENCE"],
  EVIDENCE: ["VERIFY", "BUILD"],
  VERIFY: ["CLOSING", "BUILD"],
  CLOSING: ["SCOPING"],
};

export const ETAT_NEUTRE = Object.freeze({ version: 1, activity: "SCOPING", active_brief: null, active_request: null, since: null });

// auto_merge : absent de l'état neutre, posé seulement par un lancement humain (`start`).
const CHAMPS = new Set([...Object.keys(ETAT_NEUTRE), "auto_merge"]);
const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/;

export function transitionAutorisee(de, vers) {
  if (!ACTIVITES.includes(de) || !ACTIVITES.includes(vers) || de === vers) return false;
  return vers === "SCOPING" || SUIVANTES[de].includes(vers);
}

/** Problèmes de l'état (messages en français, liste vide si valide). */
export function validerEtat(etat, racine) {
  if (typeof etat !== "object" || etat === null || Array.isArray(etat)) return ["state.json doit contenir un objet JSON"];
  const problemes = [];
  for (const cle of Object.keys(etat))
    if (!CHAMPS.has(cle)) problemes.push(`champ inconnu « ${cle} » (l'état ne contient que des références)`);
  if (etat.version !== 1) problemes.push("version : 1 attendu");
  if (!ACTIVITES.includes(etat.activity)) {
    problemes.push(`activité inconnue « ${etat.activity} » (attendu : ${ACTIVITES.join(", ")})`);
  } else if (etat.activity === "SCOPING") {
    if (etat.active_brief !== null || etat.active_request !== null) problemes.push("en SCOPING, aucune attente ni demande active");
  } else if (etat.active_brief === null || etat.active_brief === undefined) {
    problemes.push(`${etat.activity} : attente active requise`);
  }
  if (etat.active_brief !== null && etat.active_brief !== undefined)
    problemes.push(...validerAttente(etat.active_brief, racine, etat.activity));
  if (etat.active_request !== null && typeof etat.active_request !== "string") problemes.push("active_request : chaîne ou null attendu");
  if (etat.auto_merge !== undefined && typeof etat.auto_merge !== "boolean") problemes.push("auto_merge : booléen attendu");
  else if (etat.auto_merge === true && etat.activity === "SCOPING")
    problemes.push("auto_merge : jamais en SCOPING (aucun chantier en cours)");
  if (etat.since !== null && !(typeof etat.since === "string" && ISO_RE.test(etat.since) && !Number.isNaN(Date.parse(etat.since)))) {
    problemes.push("since : horodatage ISO 8601 ou null attendu");
  }
  return problemes;
}

function validerAttente(attente, racine, activite) {
  if (typeof attente !== "string") return ["active_brief : chemin de fiche ou null attendu"];
  const chemin = posix.normalize(attente.replace(/\\/g, "/"));
  const dossier = DOSSIERS_FICHES.find((d) => chemin.startsWith(d));
  if (!dossier || !chemin.endsWith(".md")) return [`active_brief : fiche .md de ${DOSSIERS_FICHES.join(" ou ")} attendue (« ${attente} »)`];
  if (MODELE_RE.test(posix.basename(chemin))) return [`active_brief : « ${attente} » est un modèle, pas une fiche de chantier`];
  // En CLOSING, la recette « Clôturer » supprime la fiche : son absence est l'issue normale, et
  // la refuser rendrait l'état invalide au moment même de revenir en SCOPING.
  if (!existsSync(join(racine, chemin)) && activite !== "CLOSING") return [`active_brief : fiche « ${attente} » introuvable`];
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
const HUMAINES = new Set(["SCOPING>EXPECTATION", "REQUEST>BUILD"]);

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
  const noms = existsSync(dossier)
    ? readdirSync(dossier)
        .filter((n) => /^verify-.+\.json$/.test(n))
        .sort()
    : [];
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
    return {
      ok: false,
      raison: `verdict ${ev.status.toUpperCase()} : revenir en BUILD (\`node .githooks/state.mjs move BUILD\`) pour corriger`,
    };
  }
  return { ok: false, raison: `évidence ${nom} sans verdict reconnu : ${RELANCER}` };
}

const LANCABLE_DEPUIS = new Set(["SCOPING", "EXPECTATION", "REQUEST"]);

/**
 * Lance un chantier en un geste : depuis SCOPING, EXPECTATION ou REQUEST, passe directement en
 * BUILD sur une fiche cadrée. En mode « humain » (défaut), `humain` doit être vrai : il
 * l'est seulement pour une réponse humaine à un sondage lue par le hook de l'outil, ou pour un
 * choix fait dans un terminal interactif. `{ code: 0 | 1, message }`.
 */
export function lancer(racine, fiche, { humain = false, demande, fusion = false, maintenant = new Date().toISOString() } = {}) {
  const lu = lireEtat(racine);
  const de = lu.etat.activity;
  if (!LANCABLE_DEPUIS.has(de))
    return { code: 1, message: `lancement refusé : activité ${de} (lancer se fait depuis SCOPING, EXPECTATION ou REQUEST)` };
  if (config(racine).transitions !== "agent" && !humain) {
    return { code: 1, message: "lancement refusé : c'est une décision humaine (sondage `/drwil-lancer`, ou terminal interactif)" };
  }
  const chemin = posix.normalize(
    String(fiche ?? "")
      .trim()
      .replace(/\\/g, "/"),
  );
  if (!fichesCadrees(racine).some((f) => f.chemin === chemin)) {
    return { code: 1, message: `lancement refusé : « ${fiche} » n'est pas une fiche cadrée (bloc cadrage commité, fiche non terminée)` };
  }
  const etat = { version: 1, activity: "BUILD", active_brief: chemin, active_request: demande ?? null, since: maintenant };
  // Autoriser la fusion est une décision d'acceptation : humaine seulement, même en mode agent.
  if (fusion === true && humain) etat.auto_merge = true;
  const problemes = validerEtat(etat, racine);
  if (problemes.length) return { code: 1, message: `lancement refusé : ${problemes.join(" ; ")}` };
  mkdirSync(join(racine, ".drwil"), { recursive: true });
  writeFileSync(join(racine, ".drwil", "state.json"), JSON.stringify(etat, null, 2) + "\n");
  return { code: 0, message: `${de} → BUILD (lancé : ${chemin})${etat.auto_merge ? " — fusion automatique autorisée" : ""}` };
}

/** Nouvel état après la transition `vers`, ou `{ erreur }` ; n'écrit rien. */
export function preparerTransition(lu, vers, { fiche, demande, maintenant }, racine) {
  const de = lu.etat.activity;
  if (!transitionAutorisee(de, vers)) {
    const permises = ACTIVITES.filter((a) => transitionAutorisee(de, a)).join(", ");
    return { erreur: `transition ${de} → ${vers} interdite (depuis ${de} : ${permises})` };
  }
  if (fiche !== undefined && vers !== "EXPECTATION") return { erreur: "--fiche ne sert qu'à ouvrir une attente (SCOPING → EXPECTATION)" };
  let etat;
  if (vers === "SCOPING") {
    etat = { ...ETAT_NEUTRE, since: maintenant };
  } else if (vers === "EXPECTATION") {
    if (!fiche) return { erreur: "ouvrir une attente exige --fiche <docs/projects/….md>" };
    etat = {
      version: 1,
      activity: "EXPECTATION",
      active_brief: posix.normalize(fiche.replace(/\\/g, "/")),
      active_request: demande ?? null,
      since: maintenant,
    };
  } else {
    etat = { ...lu.etat, activity: vers, active_request: demande ?? lu.etat.active_request, since: maintenant };
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
  const de = lu.etat.activity;
  // Avant la confirmation humaine : inutile de demander une décision que la preuve refuse.
  // Vaut aussi en mode agent : le réglage « transitions » dit qui décide, pas sur quoi.
  if (vers === "CLOSING") {
    const preuve = preuveVerify(racine);
    if (!preuve.ok) return { code: 1, message: `${reprise}clôture refusée : ${preuve.raison}` };
  }
  const ficheActive = lu.etat.active_brief && join(racine, lu.etat.active_brief);
  if (
    de === "CLOSING" &&
    vers === "SCOPING" &&
    ficheActive &&
    existsSync(ficheActive) &&
    statutFiche(readFileSync(ficheActive, "utf8")) === "terminee"
  ) {
    return {
      code: 1,
      message: `${reprise}retour en SCOPING refusé : ${lu.etat.active_brief} se dit terminée mais est encore là — la condenser dans docs/projects/journal.md, la supprimer et retirer sa ligne de l'index (recette « Clôturer »)`,
    };
  }
  if (exigeHumain(de, vers, config(racine).transitions)) {
    if (!tty || typeof confirmer !== "function") {
      return {
        code: 1,
        message: `${reprise}${de} → ${vers} est une décision humaine : terminal interactif requis (réglage « transitions » : human)`,
      };
    }
    if (!(await confirmer(`Pour passer de ${de} à ${vers}, retapez l'activité visée (${vers}) : `))) {
      return { code: 1, message: "confirmation refusée : état inchangé" };
    }
  }
  mkdirSync(join(racine, ".drwil"), { recursive: true });
  writeFileSync(join(racine, ".drwil", "state.json"), JSON.stringify(prep.etat, null, 2) + "\n");
  return { code: 0, message: `${reprise}${de} → ${vers}` };
}

const FICHIER_RAPPEL = [".drwil", "reminder.json"];

/**
 * Le rappel seulement s'il a changé depuis le dernier injecté (empreinte dans .drwil/reminder.json,
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

/** Point d'entrée commun à `node .githooks/state.mjs` et à `drwil etat`. Rend le code de sortie. */
export async function principal(args, racine) {
  if (args[0] === "briefs") {
    const fiches = fichesCadrees(racine);
    if (args.includes("--json")) console.log(JSON.stringify(fiches, null, 2));
    else
      console.log(
        fiches.length
          ? fiches.map((f, i) => `${i + 1}. ${f.chemin} — ${f.titre}`).join("\n")
          : "(aucune fiche cadrée : bloc cadrage commité et fiche non terminée)",
      );
    return 0;
  }
  if (args[0] === "start") {
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
          console.log(
            fiches
              .map(
                (f, i) =>
                  `${i + 1}. ${f.chemin} — ${f.titre} [${f.priorite}${f.prete ? "" : ` · non prête : ${f.decisions} décision(s) à trancher`}]`,
              )
              .join("\n"),
          );
          const n = Number((await rl.question("Numéro de la fiche à lancer : ")).trim());
          choix = fiches[n - 1]?.chemin;
        }
        humain = choix !== undefined && (await rl.question(`Lancer ${choix} ? Retapez LANCER : `)).trim() === "LANCER";
        if (humain)
          fusion = (await rl.question("Fusion automatique à la fin du chantier ? Retapez FUSION, sinon Entrée : ")).trim() === "FUSION";
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
  if (args[0] === "reminder") {
    // Hook de saisie (Claude Code : UserPromptSubmit) : n'écrit que si l'état a changé, ne casse jamais une saisie.
    try {
      const texte = rappelSiChange(racine);
      if (texte) console.log(texte);
    } catch {}
    return 0;
  }
  if (args[0] !== "move") {
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
    console.error(
      `usage : node .githooks/state.mjs move <${ACTIVITES.join("|")}> [--fiche <docs/projects/….md>] [--demande <texte>] | start [<fiche>] | briefs [--json] | reminder`,
    );
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
