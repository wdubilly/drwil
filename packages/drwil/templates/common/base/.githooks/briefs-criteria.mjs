// Acceptance criteria and declared contracts of a brief (split from briefs.mjs, which re-exports them).

/**
 * Acceptance criteria of a brief: one bullet per criterion in the "Critères d'acceptation" section.
 * `[{ text, link, human }]`: `link` is the backticked contract or check ID of the line (null when
 * absent: a criterion without proof, for the evaluation to refuse), `human` is set by `[humain]`.
 */
export function acceptanceCriteria(text) {
  // A criterion wrapped over several lines keeps its proof at the end: read each bullet whole.
  const items = [];
  let inside = false;
  let open = false;
  for (const line of text.split(/\r?\n/)) {
    if (/^##\s/.test(line)) {
      inside = /^##\s*(\d+\.\s*)?(Critères d'acceptation|Acceptance criteria)\b/i.test(line);
      open = false;
      continue;
    }
    const item = inside ? /^\s*-\s+(.+)$/.exec(line) : null;
    if (item) items.push(item[1]);
    else if (open && /^\s+\S/.test(line)) items[items.length - 1] += ` ${line.trim()}`;
    open = Boolean(item) || (open && /^\s+\S/.test(line));
  }
  const criteria = [];
  for (const item of items) {
    const human = /\[(humain|human)\]/i.test(item);
    // The proof is the last backticked ID: code quoted earlier in the sentence (`init`) is not one.
    const proof = /`([A-Za-z][\w.:-]*)`[^`]*$/.exec(item);
    const link = proof?.[1] ?? null;
    const label = (proof ? item.slice(0, proof.index) + item.slice(proof.index + proof[1].length + 2) : item)
      .replace(/\[(humain|human)\]/gi, "")
      .replace(/`([^`]*)`/g, "$1")
      .replace(/\s*[—–:-]\s*$/, "")
      .replace(/\s+/g, " ")
      .trim();
    if (label) criteria.push({ text: label, link, human });
  }
  return criteria;
}

/**
 * Contracts the brief declares as changed on purpose (« Contrats modifiés » section): the ID in backticks
 * at the head of each bullet. A contract modified in the branch without this declaration is refused.
 */
export function declaredContracts(text) {
  const ids = [];
  let inside = false;
  for (const line of text.split(/\r?\n/)) {
    if (/^##\s/.test(line)) inside = /^##\s*(\d+\.\s*)?(Contrats modifiés|Modified contracts)\b/i.test(line);
    else if (inside) {
      const id = /^\s*-\s+`([A-Za-z][\w.:-]*)`/.exec(line)?.[1];
      if (id) ids.push(id);
    }
  }
  return ids;
}
