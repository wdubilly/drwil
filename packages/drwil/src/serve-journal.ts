// Historique d'un projet pour `drwil serve`. Consommation par chantier (`.drwil/usage.jsonl`) : les champs
// retenus sont une liste fermée, une colonne ajoutée au fichier n'atteint jamais l'API (QUA-271).
const TOTALS = ["tokens", "output", "cache_read", "requests", "duration_min"] as const;
type Totals = Record<(typeof TOTALS)[number] | "increments", number> & { workstream: string; date: string };

function usageRows(usage: string): Totals[] {
  return usage
    .split("\n")
    .filter(Boolean)
    .flatMap((line) => {
      try {
        const row = JSON.parse(line) as Totals;
        return typeof row.workstream === "string" && typeof row.date === "string" ? [row] : [];
      } catch {
        return [];
      }
    });
}

/** Agrège par chantier ; un chantier compte pour la première version publiée à sa date ou après (`tagLines` : tag, date). */
export function summarizeUsage(usage: string, tagLines: string) {
  const byName = new Map<string, Totals>();
  for (const r of usageRows(usage)) {
    const w = byName.get(r.workstream) ?? {
      workstream: r.workstream,
      tokens: 0,
      output: 0,
      cache_read: 0,
      requests: 0,
      duration_min: 0,
      date: r.date,
      increments: 0,
    };
    for (const key of TOTALS) w[key] += r[key] ?? 0;
    if (r.date > w.date) w.date = r.date;
    w.increments++;
    byName.set(r.workstream, w);
  }
  const tags = tagLines
    .split("\n")
    .filter(Boolean)
    .map((l) => l.split("\x1f"))
    .map(([tag, date]) => ({ tag, date }));
  const workstreams = [...byName.values()].map((w) => ({ ...w, version: tags.find((t) => t.date >= w.date)?.tag ?? null }));
  return { workstreams: workstreams.sort((a, b) => b.date.localeCompare(a.date)), tags };
}
