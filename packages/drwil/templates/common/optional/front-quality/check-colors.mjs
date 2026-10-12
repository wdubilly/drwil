// Optional "front quality" module (disabled by default, see
// docs/recipes/add-a-frontend-screen.md): no hard-coded colour (hexadecimal,
// rgb(), hsl()) nor Tailwind palette outside the style guide in the front's
// source folder, except its theme folder — go through the classes of the
// project's palette or its CSS variables.
//
// Generic: root and theme folder as arguments. Default Tailwind palette cited
// below (to adapt if the project renamed its families): sky, rose, emerald,
// amber, red, orange, yellow, lime, green, teal, cyan, blue, indigo, violet,
// purple, fuchsia, pink, gray, zinc, neutral, stone.
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

const TEXTS = {
  fr: {
    hardCoded: "couleur en dur",
    palette: "palette hors charte",
    title: "Couleurs hors charte (utiliser les classes de la palette du projet ou des variables CSS, voir docs/style-guide.md) :",
  },
  en: {
    hardCoded: "hard-coded colour",
    palette: "palette outside the style guide",
    title: "Colours outside the style guide (use the classes of the project's palette or CSS variables, see docs/style-guide.md):",
  },
};
let lang = "fr";
try {
  if (JSON.parse(readFileSync(join(".drwil", "ia-first.json"), "utf8")).lang === "en") lang = "en";
} catch {}
const T = TEXTS[lang];

const errors = [];
for (const path of sources(srcDir)) {
  readFileSync(path, "utf8")
    .split("\n")
    .forEach((line, i) => {
      for (const m of line.matchAll(COLOR)) errors.push(`${relative(root, path)}:${i + 1} : ${T.hardCoded} « ${m[0]} »`);
      for (const m of line.matchAll(PALETTE)) errors.push(`${relative(root, path)}:${i + 1} : ${T.palette} « ${m[0]} »`);
    });
}

if (errors.length) {
  console.error(`${T.title}\n  ${errors.join("\n  ")}`);
  process.exit(1);
}
