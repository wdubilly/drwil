// Module optionnel front-quality (gabarit) : chemin principal de check-colors.mjs et de check-contrast.mjs,
// lancés comme un projet les lance, sur un front jetable. Mesurés par `npm run test:claude:coverage` (QUA-004).
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const MODULE = fileURLToPath(new URL("../templates/common/optional/front-quality/", import.meta.url));

/** Un front jetable : sources sous src/, palette sous src/theme/. */
function front(fichiers, lang = "fr") {
  const dir = mkdtempSync(join(tmpdir(), "drwil-front-"));
  mkdirSync(join(dir, ".drwil"), { recursive: true });
  writeFileSync(join(dir, ".drwil", "ia-first.json"), JSON.stringify({ lang }));
  for (const [rel, text] of Object.entries(fichiers)) {
    mkdirSync(join(dir, rel, ".."), { recursive: true });
    writeFileSync(join(dir, rel), text);
  }
  return dir;
}

const lancer = (dir, script, args = []) =>
  spawnSync(process.execPath, [join(MODULE, script), dir, ...args], { cwd: dir, encoding: "utf8" });

test("check-colors : une couleur en dur ou une palette hors charte échoue, le thème et les tests sont exemptés", () => {
  const dir = front({
    "src/App.tsx": 'const a = "#fff"; const b = "bg-red-500"; const c = "rgb(1,2,3)";\n',
    "src/theme/couleurs.css": "a { color: #000; }",
    "src/App.test.tsx": 'const t = "#abc";',
    "src/notes.md": "#fff",
  });
  const propre = front({ "src/App.tsx": 'const ok = "bg-primary-500";\n' }, "en");
  try {
    const r = lancer(dir, "check-colors.mjs");
    assert.equal(r.status, 1);
    assert.match(r.stderr, /Couleurs hors charte/);
    assert.match(r.stderr, /src[\\/]App\.tsx:1 : couleur en dur « #fff »/);
    assert.match(r.stderr, /palette hors charte « bg-red-500 »/);
    assert.doesNotMatch(r.stderr, /theme|test|notes/);
    const ok = lancer(propre, "check-colors.mjs");
    assert.equal(ok.status, 0);
    const en = front({ "src/App.tsx": 'x = "#fff"' }, "en");
    try {
      assert.match(lancer(en, "check-colors.mjs").stderr, /hard-coded colour/);
    } finally {
      rmSync(en, { recursive: true, force: true });
    }
  } finally {
    for (const d of [dir, propre]) rmSync(d, { recursive: true, force: true });
  }
});

const PALETTE = `export const slate = { 50: "#f8fafc", 100: "#f1f5f9", 900: "#0f172a", 950: "#020617" };
export const danger = { DEFAULT: "#dc2626", 700: { DEFAULT: "#b91c1c", fort: "#7f1d1d" }, 950: "#450a0a" };
export const clair = { 300: "#cbd5e1" };
`;

test("check-contrast : un contraste insuffisant échoue, un contraste suffisant et un texte sans classe passent", () => {
  const dir = front({
    "src/theme/palettes.js": PALETTE,
    "src/Mal.tsx": [
      'const a = "text-clair-300 bg-white";',
      `const b = \`text-clair-300 \${actif ? "font-bold" : ""}\`;`,
      "// contraste-fond: danger-950",
      'const c = "text-danger-700";',
      "// contraste-fond: page",
      'const d = "text-clair-300 dark:text-slate-950 dark:bg-slate-900";',
      "",
    ].join("\n"),
    "src/Mal.test.tsx": 'const t = "text-clair-300";',
  });
  const bon = front({
    "src/theme/palettes.js": PALETTE,
    "src/Bien.tsx": [
      'const a = "text-slate-900 bg-white";',
      'const b = "text-2xl text-clair-300 bg-danger-950/90";',
      'const c = "bg-slate-50";',
      'const d = "text-slate-900/80 dark:text-slate-100";',
      'const e = "text-xl font-bold text-danger-700-fort bg-white";',
      `const f = \`p-2 \${x}\`;`,
      'const g = "text-slate-900 dark:text-slate-100";',
      'const h = "text-slate-900  dark:text-slate-100";',
      "",
    ].join("\n"),
  });
  try {
    const r = lancer(dir, "check-contrast.mjs");
    assert.equal(r.status, 1);
    assert.match(r.stderr, /Contrastes insuffisants \(RGAA 3\.2.*— \d+ :/);
    assert.match(r.stderr, /Mal\.tsx : « text-clair-300 bg-white » — clair [\d.]+:1 < 4\.5/);
    assert.match(r.stderr, /sombre/);
    assert.doesNotMatch(r.stderr, /\.test\./);
    const ok = lancer(bon, "check-contrast.mjs");
    assert.equal(ok.status, 0, ok.stderr);
  } finally {
    for (const d of [dir, bon]) rmSync(d, { recursive: true, force: true });
  }
});

test("check-contrast : palette et jetons passés en arguments, messages anglais", () => {
  const dir = front({ "lib/pal.js": PALETTE, "src/A.tsx": 'x = "text-clair-300 dark:text-slate-900"' }, "en");
  const jetons = JSON.stringify({ light: { text: "slate-900", pages: ["white"] }, dark: { text: "slate-100", pages: ["slate-950"] } });
  try {
    const r = lancer(dir, "check-contrast.mjs", ["lib/pal.js", "src/theme", jetons]);
    assert.equal(r.status, 1);
    assert.match(r.stderr, /Insufficient contrasts/);
    assert.match(r.stderr, /light/);
    assert.match(r.stderr, /dark/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
