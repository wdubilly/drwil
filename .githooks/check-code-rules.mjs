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

const regles = [
  // (racine) => { const erreurs = []; /* ... */ return erreurs; },
];

const racine = process.argv[2] ?? ".";
const erreurs = existsSync(racine) ? regles.flatMap((regle) => regle(racine)) : [];

if (erreurs.length) {
  console.error("Règles d'hygiène du code :\n  " + erreurs.join("\n  "));
  process.exit(1);
}
