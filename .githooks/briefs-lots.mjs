// Reading of the lots of a brief (split from briefs.mjs, which re-exports it): the bullets
// "- **Lot N — title** [IA|human]" of its "Increments" section.

const SECTION_RE = /^##\s*(\d+\.\s*)?(Increments?|Incréments?)\b/i;
const LOT_RE = /^\s*-\s*\*\*(?:Lot|Increment|Incrément)\s+(\d+)\s*(?:[—–:-]\s*)?([^*]*)\*\*\s*(?:\[([^\]]+)\])?/i;
const TAG_RE = /\[(IA|AI|humain|human)\]\s*$/i;

/**
 * Lots of a brief, in the order of its "Increments" section: `[{ n, title, kind }]`, `kind` "human" or "ia"
 * (the label [human] / [humain]; a lot without a label, or with another, is an "ia" lot: the agent does it).
 * A lot number cited twice counts once; no such section: no lot.
 */
export function readLots(text) {
  const lots = [];
  let inside = false;
  for (const line of text.split(/\r?\n/)) {
    if (/^##\s/.test(line)) {
      inside = SECTION_RE.test(line);
      continue;
    }
    const m = inside ? LOT_RE.exec(line) : null;
    if (!m || lots.some((l) => l.n === Number(m[1]))) continue;
    const inTitle = TAG_RE.exec(m[2].trim());
    const label = (m[3] ?? inTitle?.[1] ?? "").toLowerCase();
    lots.push({
      n: Number(m[1]),
      title: m[2].replace(TAG_RE, "").trim(),
      kind: label === "humain" || label === "human" ? "human" : "ia",
    });
  }
  return lots;
}
