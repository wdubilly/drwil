// Tables and the usage.jsonl line of the consumption (split from consumption.mjs, which re-exports it).
import { TEXTS } from "./consumption-texts.mjs";

export const readable = (n, fr) => {
  const s = n >= 1e6 ? `${(n / 1e6).toFixed(1)} M` : n >= 1e3 ? `${Math.round(n / 1e3)} k` : String(n);
  return fr ? s.replace(".", ",") : s;
};

const table = (columns, body) => {
  const widths = columns.map((e, i) => Math.max(e.length, ...body.map((c) => c[i].length)));
  const line = (c) =>
    c
      .map((v, i) => (i === 0 || i === c.length - 1 ? v.padEnd(widths[i]) : v.padStart(widths[i])))
      .join("  ")
      .trimEnd();
  return [line(columns), ...body.map(line)];
};

/**
 * The indicator compared across workstreams: each line of usage.jsonl (oldest first, as written) with
 * its average cache read per request — « — » for a line that does not give both (an estimate).
 */
export function formatRecorded(text, T = TEXTS.en) {
  const fr = T === TEXTS.fr;
  const body = [];
  for (const l of text.split("\n")) {
    let j;
    try {
      j = JSON.parse(l);
    } catch {
      continue;
    }
    if (!j?.workstream) continue;
    const measured = j.requests > 0 && Number.isFinite(j.cache_read);
    body.push([
      String(j.workstream),
      String(j.date ?? "—"),
      measured ? String(j.requests) : "—",
      measured ? readable(j.cache_read, fr) : "—",
      measured ? readable(Math.round(j.cache_read / j.requests), fr) : "—",
    ]);
  }
  return body.length ? table(T.recordedColumns, body).join("\n") : null;
}

/** Readable table of the measure. */
export function format(rows, T = TEXTS.en) {
  const fr = T === TEXTS.fr;
  const body = rows.map((l) => [
    l.workstream,
    String(l.requests),
    readable(l.input, fr),
    readable(l.output, fr),
    readable(l.cacheRead, fr),
    readable(l.cacheWrite, fr),
    readable(l.cacheReadPerRequest, fr),
    readable(l.weighted, fr),
    `${l.minutes} min`,
    l.models.join(", "),
  ]);
  return [...table(T.columns, body), "", T.weighted].join("\n");
}

/** The usage.jsonl line of a workstream, in the recipe's format (dashboard: workstream, tokens, model…). */
export function usageLine(row, date) {
  return {
    workstream: row.workstream,
    increment: "all",
    tokens: row.weighted,
    input: row.input,
    output: row.output,
    cache_read: row.cacheRead,
    cache_write: row.cacheWrite,
    requests: row.requests,
    model: row.models.length === 1 ? row.models[0] : row.models.join(", "),
    duration_min: row.minutes,
    date,
    source: "claude-code-logs",
  };
}
