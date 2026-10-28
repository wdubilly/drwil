// Order in which the poll offers the scoped briefs: the realisation order of the index's "Fiches
// cadrées" section (open items, top to bottom), then the briefs it does not cite.

const MATURITY_RANK = { ready: 0, "in-progress": 1, unset: 1, refine: 2 };
const SECTION_RE = /^##\s+(Fiches cadrées|Scoped briefs|Framed briefs)\b/i;

/** Position of each brief cited by an open item of the index's "Fiches cadrées" section. */
export function cadredOrder(indexText) {
  const order = new Map();
  let inside = false;
  const lines = [];
  for (const line of indexText.split(/\r?\n/)) {
    if (/^##\s/.test(line)) inside = SECTION_RE.test(line);
    if (inside) lines.push(line);
  }
  for (const item of lines.join("\n").split(/\n(?=\s*- \[)/)) {
    if (!/^\s*- \[ \]/.test(item)) continue;
    for (const m of item.matchAll(/`(docs\/projects\/[^`]+\.md)`/g)) {
      if (!order.has(m[1])) order.set(m[1], order.size);
    }
  }
  return order;
}

/** Comparator of the poll: indexed briefs in the index's order, then the others (ready, maturity, priority, path). */
export function pollComparator(order) {
  const rank = (brief) => order.get(brief.path) ?? Infinity;
  return (a, b) =>
    // Two unindexed briefs give Infinity - Infinity = NaN, falsy: the old order decides.
    rank(a) - rank(b) ||
    Number(b.ready) - Number(a.ready) ||
    MATURITY_RANK[a.maturity] - MATURITY_RANK[b.maturity] ||
    a.priority.localeCompare(b.priority) ||
    a.path.localeCompare(b.path);
}
