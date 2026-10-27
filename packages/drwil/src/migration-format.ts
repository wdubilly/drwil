// Summary of a migration of the old format, split from migration.ts (QUA-001).
import { fill, type MessageLang } from "./i18n.js";
import type { MigrationPlan } from "./migration.js";

const TEXTS = {
  fr: {
    moved: ["Serait déplacé vers son nom anglais", "Déplacé vers son nom anglais"],
    removed: ["Ancien fichier du kit, inchangé, serait retiré", "Ancien fichier du kit, inchangé, retiré"],
    rewritten: ["Serait réécrit aux noms anglais", "Réécrit aux noms anglais"],
    kept: "⚠ Ancien fichier du kit modifié à la main, gardé : à reprendre",
    conflicts: "⚠ Déplacement impossible, la cible existe et a été modifiée : rien touché",
    title: ["Migration de l'ancien format (simulation, rien d'écrit) :", "Migration de l'ancien format :"],
    count: "{0} ({1}) :",
  },
  en: {
    moved: ["Would be moved to its English name", "Moved to its English name"],
    removed: ["Old kit file, unchanged, would be removed", "Old kit file, unchanged, removed"],
    rewritten: ["Would be rewritten with the English names", "Rewritten with the English names"],
    kept: "⚠ Old kit file modified by hand, kept: to take over",
    conflicts: "⚠ Impossible move, the target exists and was modified: nothing touched",
    title: ["Migration of the old format (dry run, nothing written):", "Migration of the old format:"],
    count: "{0} ({1}):",
  },
};

/** Summary of a migration of the old format (empty if nothing to migrate), shared with the preview of `init`. */
export function formatMigration(p: MigrationPlan, dryRun = false, lang: MessageLang = "en"): string[] {
  const T = TEXTS[lang];
  const pick = (pair: string[]) => pair[dryRun ? 0 : 1];
  const l: string[] = [];
  const title = (t: string, n: number) => l.push(fill(T.count, t, n));
  if (p.moved.length) title(pick(T.moved), p.moved.length);
  for (const m of p.moved) l.push(`  ${m.from} → ${m.to}`);
  if (p.removed.length) title(pick(T.removed), p.removed.length);
  for (const r of p.removed) l.push(`  - ${r}`);
  if (p.rewritten.length) title(pick(T.rewritten), p.rewritten.length);
  for (const r of p.rewritten) l.push(`  ~ ${r}`);
  if (p.kept.length) title(T.kept, p.kept.length);
  for (const k of p.kept) l.push(`  ! ${k}`);
  if (p.conflicts.length) title(T.conflicts, p.conflicts.length);
  for (const c of p.conflicts) l.push(`  ! ${c.from} → ${c.to}`);
  if (l.length) l.unshift(pick(T.title));
  return l;
}
