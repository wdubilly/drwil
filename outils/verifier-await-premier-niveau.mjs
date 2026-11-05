#!/usr/bin/env node
// Contrôle propre au dépôt drwil, jamais livré (QUA-249) : aucun hook du kit importé par un autre module
// ne fait d'await de premier niveau. Un module chargé à la demande qui réimporte un hook encore en
// évaluation attend qu'il finisse, et ce hook attend sa commande : Node sort avec le code 13 sans rien
// écrire (`state.mjs briefs`, PR #361). Un hook que rien n'importe n'est qu'un point d'entrée : son await
// est sans danger. L'arbre syntaxique vient de TypeScript (déjà dépendance du dépôt) : un await dans une
// chaîne, un commentaire ou une fonction n'est jamais compté. Aucun fichier lu est une erreur (QUA-013).
// Usage : node outils/verifier-await-premier-niveau.mjs [racine]
import { existsSync, readdirSync, readFileSync, realpathSync } from "node:fs";
import { join, posix, relative } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

/** Dossiers lus : les hooks du dépôt, ceux du gabarit et de ses modules optionnels. */
export const DOSSIERS = [".githooks", ".claude/hooks", "packages/drwil/templates"];

/** Fichiers `.mjs` sous `dossiers` (récursif, tests et node_modules écartés), en chemins relatifs à `racine`. */
export function fichiersLus(racine, dossiers = DOSSIERS) {
  const trouves = [];
  const parcourir = (dossier) => {
    for (const e of readdirSync(dossier, { withFileTypes: true })) {
      const chemin = join(dossier, e.name);
      if (e.isDirectory() && e.name !== "node_modules") parcourir(chemin);
      else if (e.isFile() && e.name.endsWith(".mjs") && !e.name.endsWith(".test.mjs")) trouves.push(chemin);
    }
  };
  for (const d of dossiers) if (existsSync(join(racine, d))) parcourir(join(racine, d));
  return trouves.map((f) => relative(racine, f).replaceAll("\\", "/")).sort();
}

const FONCTIONS = new Set([
  ts.SyntaxKind.FunctionDeclaration,
  ts.SyntaxKind.FunctionExpression,
  ts.SyntaxKind.ArrowFunction,
  ts.SyntaxKind.MethodDeclaration,
  ts.SyntaxKind.Constructor,
  ts.SyntaxKind.GetAccessor,
  ts.SyntaxKind.SetAccessor,
]);

/**
 * Lecture d'un module : `awaits`, lignes (à partir de 1, sans doublon) de ses await de premier niveau
 * (`await x`, `for await`) ; `imports`, ses spécifiers relatifs, statiques, réexportés ou dynamiques.
 */
export function lireModule(texte, nom = "module.mjs") {
  const source = ts.createSourceFile(nom, texte, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const awaits = new Set();
  const imports = [];
  const visiter = (noeud, dansFonction) => {
    const estAwait = noeud.kind === ts.SyntaxKind.AwaitExpression || (noeud.kind === ts.SyntaxKind.ForOfStatement && noeud.awaitModifier);
    if (estAwait && !dansFonction) awaits.add(source.getLineAndCharacterOfPosition(noeud.getStart(source)).line + 1);
    const cible =
      noeud.kind === ts.SyntaxKind.CallExpression && noeud.expression.kind === ts.SyntaxKind.ImportKeyword
        ? noeud.arguments[0]
        : noeud.moduleSpecifier;
    if (cible?.kind === ts.SyntaxKind.StringLiteral && cible.text.startsWith(".")) imports.push(cible.text);
    ts.forEachChild(noeud, (n) => visiter(n, dansFonction || FONCTIONS.has(noeud.kind)));
  };
  visiter(source, false);
  return { awaits: [...awaits], imports };
}

/** { problemes, lus } : un problème par await de premier niveau d'un hook qu'un autre importe, nommé par fichier et ligne. */
export function verifier(racine, dossiers = DOSSIERS) {
  const lus = fichiersLus(racine, dossiers);
  const modules = new Map(lus.map((f) => [f, lireModule(readFileSync(join(racine, f), "utf8"), f)]));
  const importes = new Map();
  for (const [f, m] of modules)
    for (const spec of m.imports) {
      const cible = posix.join(posix.dirname(f), spec);
      if (cible !== f && !importes.has(cible)) importes.set(cible, f);
    }
  const problemes = lus.flatMap((f) =>
    importes.has(f)
      ? modules
          .get(f)
          .awaits.map(
            (l) =>
              `${f}:${l} : await de premier niveau dans un hook importé par ${importes.get(f)} — lancer la commande par main(…).then(…)`,
          )
      : [],
  );
  return { problemes, lus: lus.length };
}

/** Rend le code de sortie : 0 sans await de premier niveau, 1 sinon ou si aucun fichier n'est lu. */
export function principal(racine) {
  const { problemes, lus } = verifier(racine);
  if (!lus) {
    console.error(`✗ await de premier niveau : aucun hook lu sous ${racine} — contrôle non exécuté`);
    return 1;
  }
  if (problemes.length) {
    console.error(`✗ ${problemes.join("\n✗ ")}`);
    return 1;
  }
  console.log(`✓ ${lus} hook(s) lus, aucun await de premier niveau`);
  return 0;
}

// Chemins réels comparés : un dossier en lien symbolique ne doit pas faire passer le contrôle à vide.
if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  process.exitCode = principal(process.argv[2] ?? process.cwd());
}
