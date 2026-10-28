# Intention : l'ordre du sondage `/drwil-start` doit fonctionner chez l'adoptant

**Statut** : proposée le 2026-10-28.

## Besoin

Le sondage de lancement suit l'ordre des lignes ouvertes de la section « Fiches cadrées » de l'index
des chantiers (QUA-160). Un adoptant doit en bénéficier sans avoir à connaître le titre exact de la
section ni le format de ligne attendu, et être prévenu quand son index n'est pas lu.

## Existant

Relevé le 2026-10-28 dans le gabarit (`packages/drwil/templates/common/base/`) :

- `docs/projects/pending.md` ne contient qu'une section `## Projects`, vide, avec un exemple de ligne
  sans chemin de fiche.
- `.githooks/briefs-order.mjs` (`SECTION_RE`) n'accepte que les titres « Fiches cadrées », « Scoped briefs »
  ou « Framed briefs », et ne retient une ligne que si elle est ouverte (`- [ ]`) et cite la fiche entre
  backticks (le chemin complet de la fiche, sous `docs/projects/`).
- Chez l'adoptant, l'ordre n'est donc pas lu : le sondage retombe sur l'ancien tri (prête, maturité,
  priorité, chemin), sans aucun message.
- La règle n'est dite que dans `.claude/skills/start-a-workstream/SKILL.md` et le CHANGELOG, pas dans
  le gabarit de l'index.

## Proposition (à valider)

1. Gabarit : une section `## Scoped briefs` dans le pending.md du gabarit, qui dit « l'ordre des lignes ouvertes =
   l'ordre du sondage » et montre le format exact de ligne.
2. `state.mjs briefs` signale, sans bloquer, qu'aucune section reconnue n'a été trouvée (ordre par
   priorité), pour les adoptants dont l'index est déjà installé (QUA-013 : ne pas laisser croire
   à un ordre qui n'est pas lu).
3. Ne pas accepter `## Projects` comme section d'ordre : elle regroupe des sujets par thème, pas un ordre
   de réalisation.

## Questions à trancher

- [décision] Retenir la proposition ci-dessus (gabarit + signal), ou seulement l'un des deux ?
- [décision] Le signal est-il un avertissement de `state.mjs briefs` seul, ou aussi d'un contrôle de
  `verify` ?
- [décision] Le titre du gabarit : `Scoped briefs` (gabarit en anglais) — d'accord ?
