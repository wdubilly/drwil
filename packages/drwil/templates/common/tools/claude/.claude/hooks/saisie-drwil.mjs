#!/usr/bin/env node
// Lancer un chantier depuis le chat (`/drwil-lancer`, docs/ia-first.md, « Lancer et clore ») :
// la décision humaine est la réponse à un sondage, lue par l'outil, jamais par le modèle.
// - PreToolUse (sondage) : refuse un sondage de lancement qui arrive avec une réponse déjà
//   remplie ou une valeur par défaut — le modèle ne répond pas à la place de l'humain et ne
//   présélectionne rien (sa recommandation passe par le libellé « (Recommandé) »).
// - PostToolUse (sondage) : lit la réponse de l'humain et lance la fiche choisie
//   (`.githooks/etat.mjs`, seule logique, valable pour tout outil).
// Les mêmes hooks servent Claude Code et Copilot CLI, qui lit ce fichier de réglages ; seuls
// les formats du sondage diffèrent. Un sondage qui n'est pas celui de drwil passe sans rien.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const MARQUE = "drwil-lancer";
// Seconde question facultative du même sondage (Claude Code) : autoriser la fusion automatique.
const MARQUE_FUSION = "drwil-fusion";
const FUSION_OUI_RE = /^(fusion automatique|automatic merge)\b/i;
// L'outil invoque le hook avec le dossier du projet en cwd.
const RACINE = process.cwd();

/** Le sondage de lancement, sous l'une des deux formes connues ; null sinon. */
export function sondageLancement(entree) {
  const e = entree?.tool_input ?? {};
  // Claude Code : questions[{ question, header, options }], réponses dans `answers`.
  const q = Array.isArray(e.questions) ? e.questions.find((x) => x?.header === MARQUE) : null;
  const qFusion = q ? e.questions.find((x) => x?.header === MARQUE_FUSION) : null;
  if (q) return { forme: "claude", question: q.question, questionFusion: qFusion?.question ?? null, prerempli: Boolean(e.answers && Object.keys(e.answers).length) };
  // Copilot CLI : message + requestedSchema (options en `enum`), réponse en texte libre.
  if (typeof e.message === "string" && e.message.startsWith(MARQUE)) {
    const proprietes = Object.values(e.requestedSchema?.properties ?? {});
    return { forme: "copilot", prerempli: proprietes.some((p) => p && "default" in p) };
  }
  return null;
}

/** La réponse de l'humain, lue après le sondage ; null si absente. */
export function reponseHumaine(entree, sondage) {
  if (sondage.forme === "claude") return entree?.tool_response?.answers?.[sondage.question] ?? null;
  const texte = entree?.tool_result?.text_result_for_llm;
  const m = typeof texte === "string" ? /User responded:\s*(.+)\s*$/s.exec(texte) : null;
  return m ? m[1].trim() : null;
}

/** Fusion automatique autorisée par la réponse humaine à la seconde question (Claude Code seul). */
export function fusionAutorisee(entree, sondage) {
  if (sondage.forme !== "claude" || !sondage.questionFusion) return false;
  return FUSION_OUI_RE.test(String(entree?.tool_response?.answers?.[sondage.questionFusion] ?? ""));
}

async function principal() {
  let entree;
  try {
    entree = JSON.parse(readFileSync(0, "utf8"));
  } catch {
    return 0;
  }
  const sondage = sondageLancement(entree);
  if (!sondage) return 0;
  const evenement = entree.hook_event_name;
  if (evenement === "PreToolUse") {
    if (!sondage.prerempli) return 0;
    // Code 2 : l'outil bloque l'appel et rend ce message au modèle.
    console.error("drwil : sondage de lancement refusé — il ne doit contenir ni réponse ni valeur par défaut ; c'est l'humain qui choisit.");
    return 2;
  }
  if (evenement !== "PostToolUse") return 0;
  const choix = reponseHumaine(entree, sondage);
  if (!choix) return 0;
  const { lancer } = await import(pathToFileURL(join(RACINE, ".githooks", "etat.mjs")).href);
  const r = lancer(RACINE, choix, { humain: true, fusion: fusionAutorisee(entree, sondage) });
  console.log(JSON.stringify({ hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: `[drwil] ${r.code === 0 ? "✓" : "✗"} ${r.message}` } }));
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    process.exitCode = await principal();
  } catch {
    // Une erreur ne bloque jamais l'outil : l'état reste inchangé, la barrière Git demeure.
    process.exitCode = 0;
  }
}
