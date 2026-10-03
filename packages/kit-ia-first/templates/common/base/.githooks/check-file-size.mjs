#!/usr/bin/env node
// Garde-fou contre les fichiers géants (voir docs/recettes/refactorer-sans-casser.md).
// Point d'extension à adopter : un projet qui veut ce contrôle l'ajoute à
// .drwil/ia-first.json -> checks, par exemple :
//   { "name": "taille des fichiers", "run": "node .githooks/check-file-size.mjs frontend/src" }
// Racine, plafond et extensions en arguments (pas de dépendance à une stack).
// Les fichiers déjà trop gros avant l'adoption sont plafonnés à leur taille
// actuelle dans check-file-size.legacy.json (à côté) : ils ne peuvent que
// maigrir ; quand un refactor en réduit un, baisser ou retirer son plafond.
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, relative, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = process.argv[2] ?? ".";
const maxLines = Number(process.argv[3] ?? 400);
const extensions = (process.argv[4] ?? "ts,tsx,js,jsx,py").split(",");
const legacyPath = join(dirname(fileURLToPath(import.meta.url)), "check-file-size.legacy.json");
let legacy = {};
try {
  legacy = JSON.parse(readFileSync(legacyPath, "utf8"));
} catch {}

const extRe = new RegExp(`\\.(${extensions.join("|")})$`);
const ignoreRe = /\.(test|spec)\.[^.]+$/;

function* sources(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === "__pycache__" || entry.name.startsWith(".")) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* sources(path);
    else if (extRe.test(entry.name) && !ignoreRe.test(entry.name)) yield path;
  }
}

const erreurs = [];
if (existsSync(root)) {
  for (const path of sources(root)) {
    const fichier = relative(".", path);
    const lignes = readFileSync(path, "utf8").split("\n").length - 1;
    const plafond = legacy[fichier] ?? maxLines;
    if (lignes > plafond) {
      erreurs.push(
        legacy[fichier]
          ? `${fichier} : ${lignes} lignes, plafond hérité ${plafond} (ne doit plus grossir, extraire plutôt)`
          : `${fichier} : ${lignes} lignes, maximum ${maxLines} (découper)`
      );
    }
  }
}

if (erreurs.length) {
  console.error("Fichiers trop gros :\n  " + erreurs.join("\n  "));
  process.exit(1);
}
