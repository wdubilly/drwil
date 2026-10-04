#!/usr/bin/env node
import { pathToFileURL } from "node:url";

// Garde-fou des commandes shell de Claude Code (hook PreToolUse, matcher Bash).
//
// Filet propre à l'outil, en plus des contrôles git (docs/ia-first.md, section 4) :
// le hook voit la commande brute, que les règles de permission ne voient que
// découpée. Il ne bloque rien : sur une commande à risque, il fait demander
// l'accord de la personne (« ask ») avec la raison, puis elle décide.
//
// Volontairement étroit, pour ne pas lasser : des noms de fichiers de secrets
// (SEC-007), pas des mots (`process.env` passe), et le pipe vers un shell.

// Bord gauche : ni lettre, ni `$`, ni `\` (une regex `\.env` n'est pas un fichier).
const AVANT = "(?<![\\w$\\\\])";
const RISQUES = [
  // .env et .env.<suffixe>, mais pas .env.example ni .env.template (versionnés).
  [new RegExp(`${AVANT}\\.env(?:\\.(?!example\\b|template\\b)[\\w-]+)?(?![\\w.-])`), "fichier .env (secrets) : utiliser .env.example, versionné et sans secret"],
  // Clé SSH privée, nom complet (id_rsa_x compris), pas la clé publique.
  [/\bid_(?:rsa|ed25519|ecdsa|dsa)[\w-]*(?![\w-]|\.pub)/, "clé SSH privée"],
  [/[\w-]\.(?:pem|p12|pfx|jks)(?![\w.])/, "fichier de clé ou de certificat"],
  [new RegExp(`${AVANT}\\.(?:netrc|pgpass)(?![\\w.])`), "fichier d'identifiants"],
  [/\|\s*(?:sudo\s+)?(?:ba|z|da)?sh(?:\s|$)/, "pipe vers un shell (| sh, | bash)"],
];

function raison(commande) {
  const motifs = RISQUES.filter(([motif]) => motif.test(commande)).map(([, texte]) => texte);
  return motifs.length ? motifs.join(" ; ") : null;
}

/** Réponse JSON du hook, ou chaîne vide pour laisser les permissions décider. */
function main(entree) {
  let evenement;
  try {
    evenement = JSON.parse(entree);
  } catch {
    return "";
  }
  if (typeof evenement !== "object" || evenement === null || evenement.tool_name !== "Bash") return "";
  const motif = raison(String(evenement.tool_input?.command ?? ""));
  if (motif === null) return "";
  return JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "ask",
      permissionDecisionReason: `garde-fou : accord demandé — ${motif}`,
    },
  });
}

export { raison, main };

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  let entree = "";
  process.stdin.on("data", (d) => { entree += d; });
  process.stdin.on("end", () => {
    const sortie = main(entree);
    if (sortie) console.log(sortie);
  });
}
