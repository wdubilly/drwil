// Recognition and annotation of the identifiers cited in a text (split from glossary.mjs, which re-exports it).

const MAX = 15;

export const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** Pattern of an identifier as it is written in a text (lots and points in either language, any case). */
function pattern(id) {
  const m = /^(lot|point) (.+)$/.exec(id);
  if (m) return new RegExp(`\\b(?:${m[1] === "lot" ? "lot|increment" : "point"})\\s+${escapeRe(m[2])}\\b`, "i");
  // Not inside a longer ID, nor inside a catalog reference (« catalog:QUA-004 » is the catalog's line).
  return new RegExp(`(?<![A-Za-z0-9:-])${escapeRe(id)}(?![0-9])`);
}

/** The known identifiers cited in `text`, each with its label: `[{ id, label }]`, at most fifteen. */
export function cited(text, labels) {
  const found = [];
  for (const [id, label] of labels) {
    if (pattern(id).test(text)) found.push({ id, label });
    if (found.length >= MAX) break;
  }
  return found;
}

// A gloss right after the ID, on the same line: a parenthesis, a dash, a colon, or the next table cell
// (code or bold marks around the ID allowed).
const GLOSS = /^[`*]*\s*[(—–:|]/;

/**
 * The known identifiers of `text` cited bare: an ID whose mentions are not glossed (GLOSS) before a
 * glossed one — once labelled, later bare mentions are fine. `[{ id, label }]`, at most fifteen.
 */
export function unlabelled(text, labels) {
  const found = [];
  for (const [id, label] of labels) {
    // Only the first mention matters: glossed, the later ones are fine; bare, the ID is bare.
    const m = pattern(id).exec(text);
    if (m && !GLOSS.test(text.slice(m.index + m[0].length))) found.push({ id, label });
    if (found.length >= MAX) break;
  }
  return found;
}

/** `text` with the first mention of each known identifier followed by its label, unless it already is. */
export function annotate(text, labels) {
  let out = text;
  for (const { id, label } of cited(text, labels)) {
    // `cited` found it in `text`, and an annotation never removes an ID: it is still there.
    const m = pattern(id).exec(out);
    const end = m.index + m[0].length;
    if (out.slice(end, end + label.length + 6).includes(label.slice(0, 20))) continue;
    // Already inside parentheses (« (QUA-004) »): a dash, not nested parentheses.
    out = `${out.slice(0, end)}${out[end] === ")" ? ` — ${label}` : ` (${label})`}${out.slice(end)}`;
  }
  return out;
}
