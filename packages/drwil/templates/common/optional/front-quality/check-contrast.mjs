// Optional "front quality" module (disabled by default, see
// docs/recipes/add-a-frontend-screen.md): text / background contrast of every
// combination of classes actually written in the front's source folder, in
// light and dark mode. RGAA 4.1 threshold (criterion 3.2, = WCAG AA): 4.5:1,
// or 3:1 for large text.
//
// Method (deliberately simple, without a browser): each class string is
// evaluated alone, and each branch of a `${…}` template with the fixed part.
// Without a background in the string, the text is judged on the page
// backgrounds (configurable); a string without a text colour is not judged
// (badges, frames, backgrounds: their text, if any, carries its own class).
// States (hover:, disabled:…) are not evaluated: a disabled element is exempt
// under the RGAA.
//
// Fixed-background area (e.g. a banner that is always dark red): the comment
// `contraste-fond: <colour>` (e.g. `danger-950`) judges the background-less
// texts of the following lines on that colour, in light as in dark mode, until
// `contraste-fond: page`. The directive keeps its name: it lives in the
// project's code.
//
// Generic: root, palette module and theme folder as arguments. The palette
// module exports scales the Tailwind config way
// (e.g. { slate: { 50: "#...", 900: "#..." }, danger: { DEFAULT: "#..." } }).
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { pathToFileURL } from "node:url";

const root = process.argv[2] ?? ".";
const paletteModule = process.argv[3] ?? "src/theme/palettes.js";
const themeDir = join(root, process.argv[4] ?? "src/theme");
const srcDir = join(root, "src");
// Default light/dark tokens (Cobalt style guide): pass them as argv[5] (JSON)
// if the project's palette names its shades otherwise.
const tokens = process.argv[5]
  ? JSON.parse(process.argv[5])
  : { light: { text: "slate-900", pages: ["white", "slate-50"] }, dark: { text: "slate-100", pages: ["slate-950", "slate-900"] } };

const TEXTS = {
  fr: { light: "clair", dark: "sombre", title: (n) => `Contrastes insuffisants (RGAA 3.2, voir docs/style-guide.md) — ${n} :` },
  en: { light: "light", dark: "dark", title: (n) => `Insufficient contrasts (RGAA 3.2, see docs/style-guide.md) — ${n}:` },
};
let lang = "fr";
try {
  if (JSON.parse(readFileSync(join(".drwil", "ia-first.json"), "utf8")).lang === "en") lang = "en";
} catch {}
const T = TEXTS[lang];

const palettes = await import(pathToFileURL(join(root, paletteModule)).href);

const COLORS = { white: "#ffffff", black: "#000000" };
for (const [name, scale] of Object.entries(palettes)) {
  for (const [step, value] of Object.entries(scale)) {
    if (typeof value === "string") {
      COLORS[step === "DEFAULT" ? name : `${name}-${step}`] = value;
    } else {
      for (const [sub, v] of Object.entries(value)) {
        COLORS[sub === "DEFAULT" ? `${name}-${step}` : `${name}-${step}-${sub}`] = v;
      }
    }
  }
}

const LIGHT = { text: COLORS[tokens.light.text], pages: tokens.light.pages.map((p) => COLORS[p]) };
const DARK = { text: COLORS[tokens.dark.text], pages: tokens.dark.pages.map((p) => COLORS[p]) };

function rgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function mix(top, alpha, under) {
  const a = rgb(top);
  const b = rgb(under);
  return (
    "#" +
    a
      .map((c, i) =>
        Math.round(c * alpha + b[i] * (1 - alpha))
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
  );
}
function luminance(hex) {
  const [r, g, b] = rgb(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// Colour of a class (`text-danger-700`, `bg-danger-950/40`): [hex, alpha].
function color(cls, prefix) {
  const m = cls.match(new RegExp(`^${prefix}-([a-z]+(?:-\\d+)*)(?:/(\\d+))?$`));
  if (!m || !COLORS[m[1]]) return null;
  return [COLORS[m[1]], m[2] ? Number(m[2]) / 100 : 1];
}

function pick(tokens, variant, prefix) {
  let found = null;
  for (const t of tokens) {
    if (!t.startsWith(variant) || t.slice(variant.length).includes(":")) continue;
    found = color(t.slice(variant.length), prefix) ?? found;
  }
  return found;
}

function isLarge(tokens) {
  const bold = tokens.some((t) => /^font-(semibold|bold|extrabold|black)$/.test(t));
  return tokens.some((t) => /^text-(2xl|3xl|4xl|5xl|6xl)$/.test(t)) || (bold && tokens.includes("text-xl"));
}

function check(classes, zone) {
  const tokens = classes.split(/\s+/).filter(Boolean);
  const problems = [];
  const lightText = pick(tokens, "", "text");
  const lightBg = pick(tokens, "", "bg");
  const darkText = pick(tokens, "dark:", "text") ?? lightText;
  const darkBg = pick(tokens, "dark:", "bg") ?? lightBg;
  if (!lightText && !darkText) return problems;
  const min = isLarge(tokens) ? 3 : 4.5;
  for (const [mode, theme, text, bg] of [
    [T.light, LIGHT, lightText, lightBg],
    [T.dark, DARK, darkText, darkBg],
  ]) {
    const pages = zone ? [zone] : theme.pages;
    for (const page of bg ? [pages[0]] : pages) {
      const back = bg ? mix(bg[0], bg[1], page) : page;
      const fore = text ? mix(text[0], text[1], back) : theme.text;
      const ratio = contrast(fore, back);
      if (ratio < min) problems.push(`${mode} ${ratio.toFixed(2)}:1 < ${min}`);
    }
  }
  return [...new Set(problems)];
}

// Class strings of a file, with their area background: "…" literals and
// `…${…}…` templates (fixed part + each literal branch; the fixed part alone
// when there is no literal branch).
function classStrings(source) {
  const zones = [];
  let zone = null;
  for (const line of source.split("\n")) {
    const m = line.match(/contraste-fond: ([a-z]+(?:-\d+)*)/);
    if (m) zone = m[1] === "page" ? null : COLORS[m[1]];
    zones.push(zone);
  }
  const zoneAt = (index) => zones[source.slice(0, index).split("\n").length - 1];
  const out = [];
  for (const m of source.matchAll(/`([^`]*)`/g)) {
    const inner = [...m[1].matchAll(/"([^"]*)"/g)].map((x) => x[1]);
    const fixed = m[1].replace(/\$\{[\s\S]*?\}(?=[^{}]*(?:\$\{|$))/g, " ");
    const z = zoneAt(m.index);
    if (inner.length === 0) out.push([fixed, z]);
    for (const s of inner) out.push([`${fixed} ${s}`, z]);
  }
  const noTemplates = source.replace(/`[^`]*`/g, (t) => t.replace(/[^\n]/g, " "));
  for (const m of noTemplates.matchAll(/"([^"\n]*)"/g)) out.push([m[1], zoneAt(m.index)]);
  return out.filter(([s]) => /(^|\s)(dark:)?text-[a-z]/.test(s));
}

function* sources(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (path !== themeDir) yield* sources(path);
    } else if (/\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) {
      yield path;
    }
  }
}

const errors = [];
for (const path of sources(srcDir)) {
  const seen = new Set();
  for (const [s, zone] of classStrings(readFileSync(path, "utf8"))) {
    const key = s.trim().replace(/\s+/g, " ");
    if (seen.has(`${key}|${zone}`)) continue;
    seen.add(`${key}|${zone}`);
    const problems = check(key, zone);
    if (problems.length) errors.push(`${relative(root, path)} : « ${key} » — ${problems.join(", ")}`);
  }
}
if (errors.length) {
  console.error(`${T.title(errors.length)}\n  ${errors.join("\n  ")}`);
  process.exit(1);
}
