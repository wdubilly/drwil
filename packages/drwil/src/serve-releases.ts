// Releases de `drwil serve` : chaque tag, sa section du journal des changements, ses PR ou MR, ses chantiers.
import type { ForgeReader, Pr } from "./serve-forge.js";
import { natureOf } from "./serve-forge.js";
import type { Reader } from "./serve-read.js";

const short = (date: string) => date.slice(0, 10);

export async function tags(reader: Reader) {
  const out = await reader.git("tag", "--list", "v*", "--sort=-creatordate", "--format=%(refname:short)%1f%(creatordate:iso-strict)");
  return out
    .split("\n")
    .filter(Boolean)
    .map((l) => {
      const [tag, date] = l.split("\x1f");
      // Git date en heure locale, la forge en UTC : une seule forme pour comparer les dates comme du texte.
      return { tag, date: new Date(date).toISOString() };
    });
}

export function createReleases(reader: Reader, forge: ForgeReader) {
  /** Le journal des changements : à la racine, sinon celui du premier paquet qui en a un. */
  function changelog(): string {
    const direct = reader.text("CHANGELOG.md");
    if (direct) return direct;
    for (const p of reader.list("packages")) {
      const found = reader.text(`packages/${p}/CHANGELOG.md`);
      if (found) return found;
    }
    return "";
  }

  async function releases() {
    const [tg, list, published, use] = await Promise.all([tags(reader), forge.prs(), forge.releases(), reader.usage()]);
    const sections = new Map<string, string>();
    for (const part of changelog().split(/^(?=## )/m)) {
      const h = /^## \[?v?([^\s\]]+)/.exec(part);
      if (h) sections.set(h[1], part.replace(/^## .*\n/, "").trim());
    }
    const rows = [{ tag: "Unreleased", date: null as string | null }, ...tg].map((t, i, all) => {
      const prev = all[i + 1]?.date;
      const prs = list.prs
        .filter((p): p is Pr & { mergedAt: string } => !!p.mergedAt && (!t.date || p.mergedAt <= t.date) && (!prev || p.mergedAt > prev))
        .sort((a, b) => b.mergedAt.localeCompare(a.mergedAt))
        .map((p) => ({ number: p.number, title: p.title, nature: natureOf(p.paths), date: short(p.mergedAt) }));
      const workstreams = use.workstreams.filter((w) => w.version === (t.date ? t.tag : null));
      const release = published.find((r) => r.tag === t.tag);
      return {
        tag: t.tag,
        date: t.date && short(t.date),
        latest: release?.latest ?? false,
        prerelease: release?.prerelease ?? /-rc|-beta|-alpha/.test(t.tag),
        published: !!release,
        changelog: sections.get(t.tag.replace(/^v/, "")) ?? "",
        prs,
        workstreams: workstreams.map((w) => ({ name: w.workstream, tokens: w.tokens })),
        tokens: workstreams.reduce((sum, w) => sum + w.tokens, 0),
      };
    });
    return { forge: list.forge, cli: list.cli, missing: list.missing, releases: rows };
  }

  return releases;
}
