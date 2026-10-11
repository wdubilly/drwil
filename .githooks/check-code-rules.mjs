#!/usr/bin/env node
// Point d'extension des règles d'hygiène du code, vérifiées par machine
// (hook pré-commit et CI). Vide par défaut : ce contrôle est toujours vert
// tant que le projet n'y ajoute rien. Un projet qui l'adopte l'ajoute à
// .drwil/ia-first.json -> checks :
//   { "name": "règles d'hygiène", "run": "node .githooks/check-code-rules.mjs" }
//
// Chaque règle est une fonction (racine) => string[] d'erreurs. Exemples
// (désactivés, tirés de run-box-v2, à adapter ou retirer) :
//   - aucun import d'un nom privé (`_nom`) d'un autre module du même paquet ;
//   - un module de logique pure a son fichier de test à côté ;
//   - un export CSV passe par un point unique (échappement anti-injection) ;
//   - un sous-système isolé n'importe jamais un paquet d'un autre.
import { existsSync } from "node:fs";
import { pathToFileURL } from "node:url";

const regles = [
  // (racine) => { const erreurs = []; /* ... */ return erreurs; },
];

/** Applique `liste` (par défaut les règles ci-dessus) à `racine` ; affiche les erreurs, rend le code de sortie. */
export function controler(racine, liste = regles) {
  const erreurs = existsSync(racine) ? liste.flatMap((regle) => regle(racine)) : [];
  if (!erreurs.length) return 0;
  console.error("Règles d'hygiène du code :\n  " + erreurs.join("\n  "));
  return 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = controler(process.argv[2] ?? ".");
}
