// Module optionnel « qualité front » (désactivé par défaut, voir
// docs/recettes/ajouter-un-ecran-front.md) : aucune couleur en dur
// (hexadécimale, rgb(), hsl()) ni palette Tailwind hors charte dans le
// dossier source du front, hors son dossier de thème — on passe par les
// classes de la palette du projet ou ses variables CSS.
//
// Générique : racine et dossier de thème en arguments. Palette Tailwind par
// défaut citée ci-dessous (à adapter si le projet a renommé ses familles) :
// sky, rose, emerald, amber, red, orange, yellow, lime, green, teal, cyan,
// blue, indigo, violet, purple, fuchsia, pink, gray, zinc, neutral, stone.
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

const COLOR = /#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?)\(/g;
const PALETTE =
  /(?<![\w-])(?:[a-z0-9-]+:)*[a-z]+(?:-[a-z]+)?-(?:sky|rose|emerald|amber|red|orange|yellow|lime|green|teal|cyan|blue|indigo|violet|purple|fuchsia|pink|gray|zinc|neutral|stone)-\d{2,3}\b/g;

const root = process.argv[2] ?? ".";
const themeDir = join(root, process.argv[3] ?? "src/theme");
const srcDir = join(root, "src");

function* sources(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (path !== themeDir) yield* sources(path);
    } else if (/\.(ts|tsx|css)$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) {
      yield path;
    }
  }
}

const erreurs = [];
for (const path of sources(srcDir)) {
  readFileSync(path, "utf8")
    .split("\n")
    .forEach((ligne, i) => {
      for (const m of ligne.matchAll(COLOR)) erreurs.push(`${relative(root, path)}:${i + 1} : couleur en dur « ${m[0]} »`);
      for (const m of ligne.matchAll(PALETTE)) erreurs.push(`${relative(root, path)}:${i + 1} : palette hors charte « ${m[0]} »`);
    });
}

if (erreurs.length) {
  console.error(
    `Couleurs hors charte (utiliser les classes de la palette du projet ou des variables CSS, voir docs/charte-graphique.md) :\n  ` +
      erreurs.join("\n  ")
  );
  process.exit(1);
}
