#!/usr/bin/env node
// Garde-fou contre les fichiers géants (voir docs/recettes/refactorer-sans-casser.md).
// Point d'extension à adopter : un projet qui veut ce contrôle l'ajoute à
// .drwil/ia-first.json -> checks, par exemple :
//   { "name": "taille des fichiers", "run": "node .githooks/check-file-size.mjs frontend/src" }
// Racine, plafond et extensions en arguments (pas de dépendance à une stack).
// Les fichiers déjà trop gros avant l'adoption sont plafonnés à leur taille
// actuelle dans check-file-size.legacy.json (à côté) : ils ne peuvent que
// maigrir ; quand un refactor en réduit un, baisser ou retirer son plafond.
import { readdirSync, readFileSync, existsSync, realpathSync } from "node:fs";
import { join, relative, dirname } from "node:path";
import { fileURLToPath } from "node:url";

/** Plafonds hérités ({ fichier: lignes }) ; fichier absent ou illisible : aucun. */
export function lireHerites(chemin) {
  try {
    return JSON.parse(readFileSync(chemin, "utf8"));
  } catch {
    return {};
  }
}

const ignoreRe = /\.(test|spec)\.[^.]+$/;

function* sources(dir, extRe) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === "__pycache__" || entry.name.startsWith(".")) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* sources(path, extRe);
    else if (extRe.test(entry.name) && !ignoreRe.test(entry.name)) yield path;
  }
}

/** Fichiers trop gros sous `root` (chemins relatifs au dossier courant), un message par fichier. */
export function verifier({ root, maxLines, extensions, legacy }) {
  const extRe = new RegExp(`\\.(${extensions.join("|")})$`);
  const erreurs = [];
  if (!existsSync(root)) return erreurs;
  for (const path of sources(root, extRe)) {
    const fichier = relative(".", path).replace(/\\/g, "/");
    const lignes = readFileSync(path, "utf8").split("\n").length - 1;
    const plafond = legacy[fichier] ?? maxLines;
    if (lignes > plafond) {
      erreurs.push(
        legacy[fichier]
          ? `${fichier} : ${lignes} lignes, plafond hérité ${plafond} (ne doit plus grossir, extraire plutôt)`
          : `${fichier} : ${lignes} lignes, maximum ${maxLines} (découper)`,
      );
    }
  }
  return erreurs;
}

// Lancé en ligne de commande (pas importé par un test) : chemins réels comparés, sinon un
// .githooks/ en lien symbolique ferait passer le contrôle sans rien vérifier.
if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const erreurs = verifier({
    root: process.argv[2] ?? ".",
    maxLines: Number(process.argv[3] ?? 400),
    extensions: (process.argv[4] ?? "ts,tsx,js,jsx,py").split(","),
    legacy: lireHerites(join(dirname(fileURLToPath(import.meta.url)), "check-file-size.legacy.json")),
  });
  if (erreurs.length) {
    console.error("Fichiers trop gros :\n  " + erreurs.join("\n  "));
    process.exitCode = 1;
  }
}
